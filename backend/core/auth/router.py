from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from typing import Annotated
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import select, text
from jose import JWTError, jwt
from datetime import datetime, timedelta
import hashlib

from backend.core.database import get_db
from backend.core.auth.schemas import Token, User as UserSchema, ChangePasswordRequest
from backend.core.auth.models import User
from backend.core.auth.security import verify_password, create_access_token, SECRET_KEY, ALGORITHM, get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
from backend.modules.user.domain.session_model import UserSessionModel

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

@router.post("/login", response_model=Token)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()], 
    request: Request,
    db: Session = Depends(get_db)
):
    # 0. Bypass RLS for Login Lookup (Since we don't know tenant yet)
    # Use CTE with set_config for PgBouncer/Supabase Session Pooler compatibility
    try:
        result = await db.execute(
            text("""
                WITH rls_bypass AS (
                    SELECT set_config('app.bypass_rls', 'on', false)
                )
                SELECT u.id, u.tenant_id, u.email, u.full_name, u.phone_number,
                       u.is_active, u.role, u.created_at, u.updated_at, u.hashed_password
                FROM rls_bypass, public.users u WHERE u.email = :email
            """),
            {"email": form_data.username}
        )
        user_row = result.fetchone()
        if user_row:
            # Map raw row to a simple object for uniform handling
            # Columns: id, tenant_id, email, full_name, phone_number, is_active, role, created_at, updated_at, hashed_password
            from types import SimpleNamespace
            user = SimpleNamespace(
                id=user_row[0], tenant_id=user_row[1], email=str(user_row[2]),
                full_name=str(user_row[3]) if user_row[3] else None,
                phone_number=str(user_row[4]) if user_row[4] else None,
                is_active=bool(user_row[5]), role=str(user_row[6]) if user_row[6] else "user",
                created_at=user_row[7], updated_at=user_row[8],
                hashed_password=str(user_row[9])
            )
        else:
            user = None
    except Exception:
        # Fallback for local dev
        await db.execute(text("SET app.bypass_rls = 'on'"))
        result = await db.execute(select(User).where(User.email == form_data.username))
        user = result.scalar_one_or_none()
    
    # 2. Validate
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    # 3. Create Token
    access_token = create_access_token(data={
        "sub": str(user.id),
        "role": user.role,
        "tenant_id": str(user.tenant_id)
    })
    
    # 4. Create session record for "Phiên đăng nhập" tab
    try:
        token_hash = hashlib.sha256(access_token.encode()).hexdigest()[:64]
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "")
        
        session_record = UserSessionModel(
            user_id=user.id,
            token_hash=token_hash,
            ip_address=ip_address,
            device_info=user_agent,
            is_active=True,
            expires_at=datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        db.add(session_record)
        await db.commit()
    except Exception as e:
        await db.rollback()
        print(f"[WARN] Failed to create login session record: {e}")
    
    print(f"User {user.email} logged in successfully")
    
    # 5. Return Response
    user_schema = UserSchema(
        id=user.id,
        tenant_id=user.tenant_id,
        email=user.email,
        full_name=user.full_name,
        phone_number=user.phone_number,
        is_active=user.is_active,
        role={"id": user.id, "code": user.role, "name": user.role.upper() if user.role else "", "permissions": []},
        created_at=user.created_at,
        updated_at=user.updated_at
    )

    return {
        "access_token": access_token,
        "refresh_token": "not_implemented_yet",
        "token_type": "bearer",
        "expires_in": 3600 * 24 * 30,  # 30 days
        "user": user_schema
    }


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # BUGFIX: BUG-20260226-003 — RLS bypass for user lookup
    # Supabase Session Pooler (PgBouncer) in transaction mode discards SET
    # between separate execute() calls. Use set_config() in CTE to combine
    # config setting + user lookup in a SINGLE atomic SQL statement.
    try:
        result = await db.execute(
            text("""
                WITH rls_bypass AS (
                    SELECT set_config('app.bypass_rls', 'on', false)
                )
                SELECT u.id, u.tenant_id, u.email, u.full_name, u.phone_number,
                       u.is_active, u.role, u.created_at, u.updated_at
                FROM rls_bypass, public.users u WHERE u.id = :user_id
            """),
            {"user_id": user_id}
        )
        user_row = result.fetchone()
    except Exception:
        # Fallback: try without set_config (for local dev without RLS)
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            raise credentials_exception
        user_schema = UserSchema(
            id=user.id, tenant_id=user.tenant_id, email=user.email,
            full_name=user.full_name, phone_number=user.phone_number,
            is_active=user.is_active,
            role={"id": user.id, "code": user.role, "name": user.role.upper(), "permissions": []},
            created_at=user.created_at, updated_at=user.updated_at
        )
        return user_schema
    
    if user_row is None:
        raise credentials_exception
        
    # Map raw row to Schema
    _role = str(user_row[6]) if user_row[6] else ""
    user_schema = UserSchema(
        id=user_row[0],
        tenant_id=user_row[1],
        email=str(user_row[2]),
        full_name=str(user_row[3]) if user_row[3] else None,
        phone_number=str(user_row[4]) if user_row[4] else None,
        is_active=bool(user_row[5]),
        role={"id": user_row[0], "code": _role, "name": _role.upper(), "permissions": []},
        created_at=user_row[7],
        updated_at=user_row[8]
    )
    return user_schema

@router.post("/change-password", response_model=UserSchema)
async def change_password(
    form_data: Annotated[ChangePasswordRequest, Body()],
    current_user: Annotated[UserSchema, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    # 1. Verify current password
    # We need to fetch the full user object with hashed_password
    result = await db.execute(select(User).where(User.id == current_user.id))
    db_user = result.scalar_one_or_none()
    
    if not db_user or not verify_password(form_data.current_password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không chính xác"
        )
    
    # 2. Update password
    db_user.hashed_password = get_password_hash(form_data.new_password)
    db_user.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(db_user)
    
    return db_user

@router.get("/me", response_model=UserSchema)
async def read_users_me(current_user: Annotated[UserSchema, Depends(get_current_user)]):
    return current_user
