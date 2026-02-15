from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select, func as sa_func, desc
from uuid import UUID

from backend.core.database import get_db
from backend.core.auth.router import get_current_user
from backend.core.auth.schemas import User as UserSchema, UserCreate, UserUpdate, ChangePasswordRequest
from backend.core.auth.models import User
from backend.core.auth.permissions import require_permission
from backend.modules.user.application.user_service import UserService
from backend.modules.user.application.activity_service import ActivityService, ActivityAction
from backend.modules.user.domain.session_model import UserSessionModel

router = APIRouter(prefix="/users", tags=["User Management"])


@router.get("/", response_model=List[UserSchema], dependencies=[Depends(require_permission("user", "view"))])
async def read_users(
    skip: int = 0, 
    limit: int = 100,
    search: Optional[str] = Query(None, description="Search by name or email"),
    role: Optional[str] = Query(None, description="Filter by role code"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    current_user: UserSchema = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """List users with optional search and filters"""
    stmt = select(User).where(User.tenant_id == current_user.tenant_id)
    
    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where(
            (User.full_name.ilike(search_pattern)) | (User.email.ilike(search_pattern))
        )
    if role:
        stmt = stmt.where(User.role == role)
    if status_filter:
        stmt = stmt.where(User.status == status_filter.upper())
    
    stmt = stmt.order_by(User.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/me", response_model=UserSchema)
async def get_current_user_info(
    current_user: UserSchema = Depends(get_current_user)
):
    """Get current logged-in user info"""
    return current_user


class ProfileUpdateRequest(BaseModel):
    """Request schema for updating own profile"""
    full_name: Optional[str] = None
    phone_number: Optional[str] = None


@router.put("/me/profile", response_model=UserSchema)
async def update_own_profile(
    data: ProfileUpdateRequest,
    request: Request,
    current_user: UserSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's own profile (no admin permission needed)"""
    stmt = select(User).where(User.id == current_user.id)
    result = await db.execute(stmt)
    db_user = result.scalar_one_or_none()
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Capture old values before updating for activity log
    old_values = {}
    if data.full_name is not None:
        old_values["full_name"] = db_user.full_name
    if data.phone_number is not None:
        old_values["phone_number"] = db_user.phone_number
    
    if data.full_name is not None:
        db_user.full_name = data.full_name
    if data.phone_number is not None:
        db_user.phone_number = data.phone_number
    
    await db.commit()
    await db.refresh(db_user)
    
    # Build detailed change metadata
    changes = {}
    for field, old_val in old_values.items():
        new_val = getattr(db_user, field, None)
        if old_val != new_val:
            changes[field] = {"from": old_val or "", "to": new_val or ""}
    
    # Log activity with change details
    activity_service = ActivityService(db, current_user.tenant_id)
    await activity_service.log(
        user_id=current_user.id,
        action=ActivityAction.UPDATE_USER,
        entity_type="User",
        entity_id=current_user.id,
        metadata={"changes": changes} if changes else {"updated_fields": [k for k, v in data.model_dump().items() if v is not None]},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    return db_user


@router.get("/me/activity")
async def get_own_activity(
    skip: int = 0,
    limit: int = 50,
    current_user: UserSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's own activity history (no admin permission needed)"""
    activity_service = ActivityService(db, current_user.tenant_id)
    activities = await activity_service.get_user_activities(
        user_id=current_user.id, limit=limit, offset=skip
    )
    return activities


@router.get("/me/sessions")
async def get_own_sessions(
    limit: int = 20,
    current_user: UserSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's login session history (no admin permission needed)"""
    stmt = (
        select(UserSessionModel)
        .where(UserSessionModel.user_id == current_user.id)
        .order_by(desc(UserSessionModel.created_at))
        .limit(limit)
    )
    result = await db.execute(stmt)
    sessions = result.scalars().all()

    return [
        {
            "id": str(s.id),
            "ip_address": str(s.ip_address) if s.ip_address else None,
            "device_info": s.device_info,
            "is_active": s.is_active,
            "last_activity": s.last_activity.isoformat() if s.last_activity else None,
            "expires_at": s.expires_at.isoformat() if s.expires_at else None,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in sessions
    ]


@router.get("/stats", dependencies=[Depends(require_permission("user", "view"))])
async def get_user_stats(
    current_user: UserSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user statistics: total, by role, by status"""
    tenant_id = current_user.tenant_id
    
    # Total count
    total_stmt = select(sa_func.count()).select_from(User).where(User.tenant_id == tenant_id)
    total = (await db.execute(total_stmt)).scalar() or 0
    
    # Count by status
    status_stmt = (
        select(User.status, sa_func.count())
        .where(User.tenant_id == tenant_id)
        .group_by(User.status)
    )
    status_result = await db.execute(status_stmt)
    by_status = {row[0] or "ACTIVE": row[1] for row in status_result}
    
    # Count by role
    role_stmt = (
        select(User.role, sa_func.count())
        .where(User.tenant_id == tenant_id)
        .group_by(User.role)
    )
    role_result = await db.execute(role_stmt)
    by_role = {row[0]: row[1] for row in role_result}
    
    return {
        "total": total,
        "active": by_status.get("ACTIVE", 0),
        "inactive": by_status.get("INACTIVE", 0),
        "by_status": by_status,
        "by_role": by_role
    }


@router.get("/{user_id}/activity", dependencies=[Depends(require_permission("user", "view"))])
async def get_user_activity(
    user_id: UUID,
    skip: int = 0,
    limit: int = 50,
    current_user: UserSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get activity history for a specific user"""
    activity_service = ActivityService(db, current_user.tenant_id)
    activities = await activity_service.get_user_activities(
        user_id=user_id, skip=skip, limit=limit
    )
    return activities


@router.get("/{user_id}", response_model=UserSchema, dependencies=[Depends(require_permission("user", "view"))])
async def get_user(
    user_id: UUID,
    current_user: UserSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get single user by ID"""
    service = UserService(db)
    user = await service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return user


@router.post("/", response_model=UserSchema, dependencies=[Depends(require_permission("user", "create"))])
async def create_user(
    user: UserCreate, 
    request: Request,
    current_user: UserSchema = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    service = UserService(db)
    new_user = await service.create_user(user, current_user_tenant_id=current_user.tenant_id)
    
    # Log activity
    activity_service = ActivityService(db, current_user.tenant_id)
    await activity_service.log(
        user_id=current_user.id,
        action=ActivityAction.CREATE_USER,
        entity_type="User",
        entity_id=new_user.id,
        metadata={"email": new_user.email, "role": user.role_code},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    return new_user


@router.post("/me/change-password")
async def change_password(
    data: ChangePasswordRequest,
    request: Request,
    current_user: UserSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change current user's password"""
    service = UserService(db)
    await service.change_password(
        user_id=current_user.id,
        current_password=data.current_password,
        new_password=data.new_password
    )
    
    # Log activity - wrapped in try/except to prevent activity logging 
    # from crashing the response after successful password change
    # BUGFIX: BUG-20260212-001 - PendingRollbackError from shared DB session
    try:
        activity_service = ActivityService(db, current_user.tenant_id)
        await activity_service.log(
            user_id=current_user.id,
            action=ActivityAction.PASSWORD_CHANGED,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
    except Exception as e:
        # Activity logging is non-critical - password was already changed
        print(f"[WARN] Failed to log password change activity: {e}")
    
    return {"success": True, "message": "Đổi mật khẩu thành công"}


@router.put("/{user_id}", response_model=UserSchema, dependencies=[Depends(require_permission("user", "edit"))])
async def update_user(
    user_id: UUID,
    user: UserUpdate,
    current_user: UserSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = UserService(db)
    return await service.update_user(user_id, user, current_user_tenant_id=current_user.tenant_id)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("user", "delete"))])
async def delete_user(
    user_id: UUID,
    request: Request,
    current_user: UserSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete user with BR052 protection (Super Admin cannot delete themselves)"""
    service = UserService(db)
    await service.delete_user(
        user_id, 
        current_user_tenant_id=current_user.tenant_id,
        current_user=current_user  # Pass for BR052 check
    )
    
    # Log activity
    activity_service = ActivityService(db, current_user.tenant_id)
    await activity_service.log(
        user_id=current_user.id,
        action=ActivityAction.DELETE_USER,
        entity_type="User",
        entity_id=user_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
