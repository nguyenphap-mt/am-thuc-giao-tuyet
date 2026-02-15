"""
Notification Preferences API Router
Endpoints for managing user notification preferences and settings.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime, time, timezone
import logging

logger = logging.getLogger(__name__)

from backend.core.database import get_db
from backend.core.dependencies import get_current_tenant, get_current_user, set_tenant_context
from backend.core.auth.schemas import User as UserSchema
from backend.modules.notification.domain.models import (
    NotificationPreferenceModel,
    NotificationSettingsModel,
)

router = APIRouter(prefix="/notifications/preferences", tags=["Notification Preferences"])


# ============ SCHEMAS ============

# Notification type registry with defaults
NOTIFICATION_TYPE_REGISTRY = {
    "orders": {
        "label": "Đơn hàng & Kinh doanh",
        "types": [
            {"code": "ORDER_CREATED", "label": "Đơn hàng mới", "desc": "Khi có đơn hàng được tạo", "default_inapp": True, "default_email": True},
            {"code": "ORDER_STATUS_CHANGED", "label": "Trạng thái đơn hàng", "desc": "Khi đơn hàng thay đổi trạng thái", "default_inapp": True, "default_email": False},
            {"code": "ORDER_ASSIGNED", "label": "Phân công đơn hàng", "desc": "Khi được phân công vào đơn hàng", "default_inapp": True, "default_email": True},
            {"code": "QUOTE_APPROVED", "label": "Báo giá được duyệt", "desc": "Khi báo giá được khách chấp nhận", "default_inapp": True, "default_email": True},
        ]
    },
    "inventory": {
        "label": "Kho hàng",
        "types": [
            {"code": "INVENTORY_LOW_STOCK", "label": "Sắp hết hàng", "desc": "Tồn kho dưới mức tối thiểu", "default_inapp": True, "default_email": True},
            {"code": "INVENTORY_OUT_OF_STOCK", "label": "Hết hàng", "desc": "Tồn kho = 0", "default_inapp": True, "default_email": True},
            {"code": "INVENTORY_EXPIRING", "label": "Sắp hết hạn", "desc": "Lô hàng hết hạn trong 30 ngày", "default_inapp": True, "default_email": False},
        ]
    },
    "hr": {
        "label": "Nhân sự",
        "types": [
            {"code": "LEAVE_APPROVED", "label": "Nghỉ phép duyệt", "desc": "Đơn nghỉ phép được duyệt", "default_inapp": True, "default_email": True},
            {"code": "LEAVE_REJECTED", "label": "Nghỉ phép từ chối", "desc": "Đơn nghỉ phép bị từ chối", "default_inapp": True, "default_email": True},
            {"code": "STAFF_ASSIGNMENT", "label": "Phân công nhân viên", "desc": "Khi được phân công công việc mới", "default_inapp": True, "default_email": False},
            {"code": "PAYROLL_READY", "label": "Bảng lương", "desc": "Bảng lương đã sẵn sàng", "default_inapp": True, "default_email": True},
        ]
    },
    "finance": {
        "label": "Tài chính",
        "types": [
            {"code": "PAYMENT_RECEIVED", "label": "Thanh toán nhận", "desc": "Khi nhận thanh toán từ khách", "default_inapp": True, "default_email": False},
            {"code": "PAYMENT_OVERDUE", "label": "Thanh toán quá hạn", "desc": "Khi có khoản thanh toán quá hạn", "default_inapp": True, "default_email": True},
        ]
    },
    "system": {
        "label": "Hệ thống",
        "types": [
            {"code": "SYSTEM_UPDATE", "label": "Cập nhật hệ thống", "desc": "Thông báo bảo trì, tính năng mới", "default_inapp": True, "default_email": False},
            {"code": "SECURITY_ALERT", "label": "Cảnh báo bảo mật", "desc": "Đăng nhập lạ, thay đổi mật khẩu", "default_inapp": True, "default_email": True},
        ]
    },
}

# Critical types that bypass quiet hours
CRITICAL_NOTIFICATION_TYPES = {"SECURITY_ALERT", "INVENTORY_OUT_OF_STOCK"}

# P2: Build valid notification types set from registry for input validation
VALID_NOTIFICATION_TYPES: set[str] = set()
VALID_CHANNELS = {"IN_APP", "EMAIL", "PUSH", "SMS"}
for _cat in NOTIFICATION_TYPE_REGISTRY.values():
    for _t in _cat["types"]:
        VALID_NOTIFICATION_TYPES.add(_t["code"])


class ChannelSettings(BaseModel):
    email: bool = True
    push: bool = False
    sms: bool = False
    inapp: bool = True


class PreferenceItem(BaseModel):
    type: str
    category: str
    label: str
    description: str
    channels: dict  # {"inapp": true, "email": false}


class NotificationSettingsPayload(BaseModel):
    email_frequency: str = "IMMEDIATE"
    quiet_hours_enabled: bool = False
    quiet_hours_start: str = "22:00"
    quiet_hours_end: str = "07:00"


class PreferencesResponse(BaseModel):
    channels: ChannelSettings
    preferences: list[PreferenceItem]
    settings: NotificationSettingsPayload
    categories: dict  # category_code -> label


class ToggleRequest(BaseModel):
    enabled: bool


class BulkUpdateRequest(BaseModel):
    channels: Optional[ChannelSettings] = None
    settings: Optional[NotificationSettingsPayload] = None
    preferences: Optional[list[dict]] = None  # [{"type": "X", "channel": "Y", "enabled": true}]


# ============ ENDPOINTS ============

@router.get("", response_model=PreferencesResponse)
async def get_notification_preferences(
    current_user: UserSchema = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all notification preferences for current user"""
    tenant_id = current_user.tenant_id
    user_id = current_user.id
    await set_tenant_context(db, tenant_id)
    
    # 1. Get or create global settings
    settings_result = await db.execute(
        select(NotificationSettingsModel).where(
            and_(
                NotificationSettingsModel.user_id == user_id,
                NotificationSettingsModel.tenant_id == tenant_id,
            )
        )
    )
    settings = settings_result.scalar_one_or_none()
    created_new = False
    
    if not settings:
        # Auto-create default settings for new user
        settings = NotificationSettingsModel(
            tenant_id=tenant_id,
            user_id=user_id,
        )
        db.add(settings)
        await db.flush()
        created_new = True
    
    # 2. Get all existing preferences
    prefs_result = await db.execute(
        select(NotificationPreferenceModel).where(
            and_(
                NotificationPreferenceModel.user_id == user_id,
                NotificationPreferenceModel.tenant_id == tenant_id,
            )
        )
    )
    existing_prefs = {
        (p.notification_type, p.channel): p.is_enabled
        for p in prefs_result.scalars().all()
    }
    
    # 3. Build preferences list from registry + existing overrides
    preferences = []
    categories = {}
    
    for cat_code, cat_data in NOTIFICATION_TYPE_REGISTRY.items():
        categories[cat_code] = cat_data["label"]
        for ntype in cat_data["types"]:
            channels = {}
            for channel_key, default_key in [("inapp", "default_inapp"), ("email", "default_email")]:
                channel_db_key = "IN_APP" if channel_key == "inapp" else channel_key.upper()
                if (ntype["code"], channel_db_key) in existing_prefs:
                    channels[channel_key] = existing_prefs[(ntype["code"], channel_db_key)]
                else:
                    channels[channel_key] = ntype[default_key]
            
            preferences.append(PreferenceItem(
                type=ntype["code"],
                category=cat_code,
                label=ntype["label"],
                description=ntype["desc"],
                channels=channels,
            ))
    
    # M5: Only commit if a new settings record was created (avoid unnecessary commit on read)
    if created_new:
        await db.commit()
    
    return PreferencesResponse(
        channels=ChannelSettings(
            email=settings.channel_email_enabled,
            push=settings.channel_push_enabled,
            sms=settings.channel_sms_enabled,
            inapp=settings.channel_inapp_enabled,
        ),
        preferences=preferences,
        settings=NotificationSettingsPayload(
            email_frequency=settings.email_frequency or "IMMEDIATE",
            quiet_hours_enabled=settings.quiet_hours_enabled or False,
            quiet_hours_start=str(settings.quiet_hours_start or "22:00")[:5],
            quiet_hours_end=str(settings.quiet_hours_end or "07:00")[:5],
        ),
        categories=categories,
    )


@router.put("/{notification_type}/{channel}")
async def toggle_preference(
    notification_type: str,
    channel: str,
    body: ToggleRequest,
    current_user: UserSchema = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle a specific notification preference"""
    tenant_id = current_user.tenant_id
    user_id = current_user.id
    await set_tenant_context(db, tenant_id)
    
    # P2: Validate notification_type and channel
    if notification_type not in VALID_NOTIFICATION_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid notification type: {notification_type}")
    
    # Normalize channel
    channel_upper = "IN_APP" if channel.lower() == "inapp" else channel.upper()
    if channel_upper not in VALID_CHANNELS:
        raise HTTPException(status_code=400, detail=f"Invalid channel: {channel}")
    
    # Upsert preference
    result = await db.execute(
        select(NotificationPreferenceModel).where(
            and_(
                NotificationPreferenceModel.user_id == user_id,
                NotificationPreferenceModel.tenant_id == tenant_id,
                NotificationPreferenceModel.notification_type == notification_type,
                NotificationPreferenceModel.channel == channel_upper,
            )
        )
    )
    pref = result.scalar_one_or_none()
    
    if pref:
        pref.is_enabled = body.enabled
        pref.updated_at = datetime.now(timezone.utc)
    else:
        pref = NotificationPreferenceModel(
            tenant_id=tenant_id,
            user_id=user_id,
            notification_type=notification_type,
            channel=channel_upper,
            is_enabled=body.enabled,
        )
        db.add(pref)
    
    await db.commit()
    
    return {
        "status": "ok",
        "type": notification_type,
        "channel": channel,
        "enabled": body.enabled,
    }


@router.put("/bulk")
async def bulk_update_preferences(
    body: BulkUpdateRequest,
    current_user: UserSchema = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Bulk update channels, settings, and/or individual preferences"""
    tenant_id = current_user.tenant_id
    user_id = current_user.id
    await set_tenant_context(db, tenant_id)
    
    # 1. Update global channel settings
    if body.channels or body.settings:
        result = await db.execute(
            select(NotificationSettingsModel).where(
                and_(
                    NotificationSettingsModel.user_id == user_id,
                    NotificationSettingsModel.tenant_id == tenant_id,
                )
            )
        )
        settings = result.scalar_one_or_none()
        
        if not settings:
            settings = NotificationSettingsModel(
                tenant_id=tenant_id,
                user_id=user_id,
            )
            db.add(settings)
        
        if body.channels:
            settings.channel_email_enabled = body.channels.email
            settings.channel_push_enabled = body.channels.push
            settings.channel_sms_enabled = body.channels.sms
            settings.channel_inapp_enabled = body.channels.inapp
        
        if body.settings:
            settings.email_frequency = body.settings.email_frequency
            settings.quiet_hours_enabled = body.settings.quiet_hours_enabled
            try:
                h, m = body.settings.quiet_hours_start.split(":")
                settings.quiet_hours_start = time(int(h), int(m))
            except Exception:
                pass
            try:
                h, m = body.settings.quiet_hours_end.split(":")
                settings.quiet_hours_end = time(int(h), int(m))
            except Exception:
                pass
        
        settings.updated_at = datetime.now(timezone.utc)
    
    # 2. Update individual preferences
    if body.preferences:
        for pref_data in body.preferences:
            ntype = pref_data.get("type")
            channel = pref_data.get("channel", "inapp")
            enabled = pref_data.get("enabled", True)
            
            channel_upper = "IN_APP" if channel.lower() == "inapp" else channel.upper()
            
            result = await db.execute(
                select(NotificationPreferenceModel).where(
                    and_(
                        NotificationPreferenceModel.user_id == user_id,
                        NotificationPreferenceModel.tenant_id == tenant_id,
                        NotificationPreferenceModel.notification_type == ntype,
                        NotificationPreferenceModel.channel == channel_upper,
                    )
                )
            )
            pref = result.scalar_one_or_none()
            
            if pref:
                pref.is_enabled = enabled
                pref.updated_at = datetime.now(timezone.utc)
            else:
                pref = NotificationPreferenceModel(
                    tenant_id=tenant_id,
                    user_id=user_id,
                    notification_type=ntype,
                    channel=channel_upper,
                    is_enabled=enabled,
                )
                db.add(pref)
    
    await db.commit()
    
    return {"status": "ok", "updated_at": datetime.now(timezone.utc).isoformat()}


@router.get("/settings")
async def get_notification_settings(
    current_user: UserSchema = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get global notification settings"""
    tenant_id = current_user.tenant_id
    user_id = current_user.id
    await set_tenant_context(db, tenant_id)
    
    result = await db.execute(
        select(NotificationSettingsModel).where(
            and_(
                NotificationSettingsModel.user_id == user_id,
                NotificationSettingsModel.tenant_id == tenant_id,
            )
        )
    )
    settings = result.scalar_one_or_none()
    
    if not settings:
        return {
            "channels": ChannelSettings().model_dump(),
            "settings": NotificationSettingsPayload().model_dump(),
        }
    
    return {
        "channels": {
            "email": settings.channel_email_enabled,
            "push": settings.channel_push_enabled,
            "sms": settings.channel_sms_enabled,
            "inapp": settings.channel_inapp_enabled,
        },
        "settings": {
            "email_frequency": settings.email_frequency or "IMMEDIATE",
            "quiet_hours_enabled": settings.quiet_hours_enabled or False,
            "quiet_hours_start": str(settings.quiet_hours_start or "22:00")[:5],
            "quiet_hours_end": str(settings.quiet_hours_end or "07:00")[:5],
        }
    }


@router.put("/settings")
async def update_notification_settings(
    body: BulkUpdateRequest,
    current_user: UserSchema = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update global notification settings (channels + schedule)"""
    # Reuse bulk update logic for channels + settings
    return await bulk_update_preferences(body, current_user, db)


# ============ P5: RESET TO DEFAULTS ============

@router.delete("/reset")
async def reset_preferences(
    current_user: UserSchema = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reset all notification preferences to defaults.
    Deletes all custom preferences and resets global settings."""
    tenant_id = current_user.tenant_id
    user_id = current_user.id
    await set_tenant_context(db, tenant_id)
    
    # Delete all custom preference overrides
    await db.execute(
        delete(NotificationPreferenceModel).where(
            and_(
                NotificationPreferenceModel.user_id == user_id,
                NotificationPreferenceModel.tenant_id == tenant_id,
            )
        )
    )
    
    # Reset global settings to defaults
    result = await db.execute(
        select(NotificationSettingsModel).where(
            and_(
                NotificationSettingsModel.user_id == user_id,
                NotificationSettingsModel.tenant_id == tenant_id,
            )
        )
    )
    settings = result.scalar_one_or_none()
    
    if settings:
        settings.channel_email_enabled = True
        settings.channel_push_enabled = False
        settings.channel_sms_enabled = False
        settings.channel_inapp_enabled = True
        settings.email_frequency = 'IMMEDIATE'
        settings.quiet_hours_enabled = False
        settings.quiet_hours_start = time(22, 0)
        settings.quiet_hours_end = time(7, 0)
        settings.updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    
    return {"status": "ok", "message": "Đã đặt lại thông báo về mặc định"}


# ============ UTILITY: Should Send Notification? ============

async def should_send_notification(
    db: AsyncSession,
    user_id: UUID,
    tenant_id: UUID,
    notification_type: str,
    channel: str = "IN_APP",
) -> bool:
    """
    Check if a notification should be sent to a user.
    Used by other modules before creating notifications.
    """
    from datetime import datetime as dt
    
    await set_tenant_context(db, tenant_id)
    
    # 1. Get global settings
    result = await db.execute(
        select(NotificationSettingsModel).where(
            and_(
                NotificationSettingsModel.user_id == user_id,
                NotificationSettingsModel.tenant_id == tenant_id,
            )
        )
    )
    settings = result.scalar_one_or_none()
    
    if settings:
        # Check global channel toggle
        channel_key = f"channel_{channel.lower().replace('in_app', 'inapp')}_enabled"
        if not getattr(settings, channel_key, True):
            return False
        
        # Check quiet hours (skip for critical notifications)
        if settings.quiet_hours_enabled and notification_type not in CRITICAL_NOTIFICATION_TYPES:
            now = dt.now().time()
            start = settings.quiet_hours_start
            end = settings.quiet_hours_end
            
            if start and end:
                if start > end:
                    # Overnight quiet hours (e.g., 22:00 - 07:00)
                    if now >= start or now <= end:
                        return False
                else:
                    # Same-day quiet hours
                    if start <= now <= end:
                        return False
    
    # 2. Check specific type preference
    result = await db.execute(
        select(NotificationPreferenceModel).where(
            and_(
                NotificationPreferenceModel.user_id == user_id,
                NotificationPreferenceModel.tenant_id == tenant_id,
                NotificationPreferenceModel.notification_type == notification_type,
                NotificationPreferenceModel.channel == channel,
            )
        )
    )
    pref = result.scalar_one_or_none()
    
    if pref is not None:
        return pref.is_enabled
    
    # 3. Default: use registry defaults
    for cat_data in NOTIFICATION_TYPE_REGISTRY.values():
        for ntype in cat_data["types"]:
            if ntype["code"] == notification_type:
                default_key = f"default_{channel.lower().replace('in_app', 'inapp')}"
                return ntype.get(default_key, True)
    
    # 4. Fall back to enabled
    return True
