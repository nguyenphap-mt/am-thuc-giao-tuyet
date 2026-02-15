from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from typing import Annotated
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import select
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
    # 1. Fetch User
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    
    # 2. Validate
    if not user or not verify_password(form_data.password, user.hashed_password):
        # Activity logging temporarily disabled - causing PendingRollbackError
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    # 3. Create Token
    # Minimal payload: sub (id), role, tenant_id
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
        # Session record creation is non-critical — don't block login
        print(f"[WARN] Failed to create login session record: {e}")
    
    print(f"User {user.email} logged in successfully")
    
    # 5. Return Response
    # Map SQLAlchemy model to Pydantic schema
    user_schema = UserSchema(
        id=user.id,
        tenant_id=user.tenant_id,
        email=user.email,
        full_name=user.full_name,
        phone_number=user.phone_number,
        is_active=user.is_active,
        role={"id": user.id, "code": user.role, "name": user.role.upper(), "permissions": []}, # Mock Role structure compatibility
        created_at=user.created_at,
        updated_at=user.updated_at
    )

    return {
        "access_token": access_token,
        "refresh_token": "not_implemented_yet",
        "token_type": "bearer",
        "expires_in": 3600 * 24 * 30, # 30 days
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
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
        
    # Map to Schema
    user_schema = UserSchema(
        id=user.id,
        tenant_id=user.tenant_id,
        email=user.email,
        full_name=user.full_name,
        phone_number=user.phone_number,
        is_active=user.is_active,
        role={"id": user.id, "code": user.role, "name": user.role.upper(), "permissions": []},
        created_at=user.created_at,
        updated_at=user.updated_at
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
