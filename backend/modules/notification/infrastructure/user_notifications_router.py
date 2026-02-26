"""
BUGFIX: BUG-20260226-001
User Notification Router - Accessible by ALL authenticated users.

These endpoints were previously embedded in the HR module router, which restricts
access to ["super_admin", "admin", "manager", "accountant"]. This prevented
roles like "chef" and "staff" from receiving notifications.

Extracted to a standalone router mounted without module-level permission checks.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
import logging
import pytz

logger = logging.getLogger(__name__)

from backend.core.database import get_db
from backend.core.dependencies import get_current_tenant
from backend.core.auth.router import get_current_user
from backend.core.auth.schemas import User as UserSchema

VN_TIMEZONE = pytz.timezone('Asia/Ho_Chi_Minh')

router = APIRouter(prefix="/notifications", tags=["User Notifications"])


# --- Schemas ---

class NotificationResponse(BaseModel):
    id: UUID
    title: str
    message: Optional[str]
    type: str
    reference_type: Optional[str]
    reference_id: Optional[UUID]
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# --- Endpoints ---

@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: UserSchema = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Get notifications for the current user"""
    from backend.modules.hr.domain.models import NotificationModel
    from backend.core.database import set_tenant_context
    await set_tenant_context(db, str(tenant_id))
    
    query = select(NotificationModel).where(
        NotificationModel.tenant_id == tenant_id,
        NotificationModel.user_id == current_user.id
    )
    
    if unread_only:
        query = query.where(NotificationModel.is_read == False)
    
    query = query.order_by(NotificationModel.created_at.desc()).limit(limit)
    
    result = await db.execute(query)
    notifications = result.scalars().all()
    
    return [
        NotificationResponse(
            id=n.id,
            title=n.title,
            message=n.message,
            type=n.type,
            reference_type=n.reference_type,
            reference_id=n.reference_id,
            is_read=n.is_read,
            created_at=n.created_at
        )
        for n in notifications
    ]


@router.get("/count")
async def get_unread_count(
    current_user: UserSchema = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Get unread notification count for the current user"""
    from backend.modules.hr.domain.models import NotificationModel
    from backend.core.database import set_tenant_context
    await set_tenant_context(db, str(tenant_id))
    
    result = await db.execute(
        select(func.count(NotificationModel.id)).where(
            NotificationModel.tenant_id == tenant_id,
            NotificationModel.user_id == current_user.id,
            NotificationModel.is_read == False
        )
    )
    count = result.scalar() or 0
    
    return {"unread_count": count}


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: UUID,
    current_user: UserSchema = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Mark a notification as read"""
    from backend.modules.hr.domain.models import NotificationModel
    from backend.core.database import set_tenant_context
    await set_tenant_context(db, str(tenant_id))
    
    result = await db.execute(
        select(NotificationModel).where(
            NotificationModel.id == notification_id,
            NotificationModel.tenant_id == tenant_id,
            NotificationModel.user_id == current_user.id
        )
    )
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    notification.read_at = datetime.now(VN_TIMEZONE)
    
    await db.commit()
    
    return {"message": "Notification marked as read", "id": str(notification_id)}


@router.put("/read-all")
async def mark_all_notifications_read(
    current_user: UserSchema = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Mark all notifications as read for the current user"""
    from backend.modules.hr.domain.models import NotificationModel
    from backend.core.database import set_tenant_context
    await set_tenant_context(db, str(tenant_id))
    
    # Get all unread notifications
    result = await db.execute(
        select(NotificationModel).where(
            NotificationModel.tenant_id == tenant_id,
            NotificationModel.user_id == current_user.id,
            NotificationModel.is_read == False
        )
    )
    notifications = result.scalars().all()
    
    now = datetime.now(VN_TIMEZONE)
    for n in notifications:
        n.is_read = True
        n.read_at = now
    
    await db.commit()
    
    return {"message": f"Marked {len(notifications)} notifications as read"}
