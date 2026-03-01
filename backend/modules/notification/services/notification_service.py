"""
Notification Service - P0 Fix
Wrapper that checks user preferences before creating notifications.
Integrates should_send_notification() with actual dispatch.
Now also sends push notifications to mobile devices via Expo Push API.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Optional
import asyncio
import logging

logger = logging.getLogger(__name__)


async def create_notification_if_allowed(
    db: AsyncSession,
    tenant_id: UUID,
    user_id: UUID,
    notification_type: str,
    title: str,
    message: str,
    channel: str = "IN_APP",
    reference_type: Optional[str] = None,
    reference_id: Optional[UUID] = None,
) -> Optional[object]:
    """
    Create a notification ONLY if user preferences allow it.
    
    This is the central dispatch point. All modules should call this
    instead of directly creating NotificationModel instances.
    
    Also sends push notification to mobile devices (non-blocking).
    
    Returns the created NotificationModel or None if suppressed.
    """
    from backend.modules.notification.infrastructure.preferences_router import (
        should_send_notification,
    )
    from backend.modules.hr.domain.models import NotificationModel

    try:
        allowed = await should_send_notification(
            db=db,
            user_id=user_id,
            tenant_id=tenant_id,
            notification_type=notification_type,
            channel=channel,
        )

        if not allowed:
            logger.debug(
                f"Notification {notification_type} suppressed for user {user_id} "
                f"(channel={channel})"
            )
            return None

        notification = NotificationModel(
            tenant_id=tenant_id,
            user_id=user_id,
            title=title,
            message=message,
            type=notification_type,
            reference_type=reference_type,
            reference_id=reference_id,
        )
        db.add(notification)
        # Don't commit here — let the caller manage the transaction
        logger.info(
            f"Notification {notification_type} created for user {user_id}"
        )

        # --- Push notification to mobile devices (non-blocking) ---
        push_data = {"type": notification_type}
        if reference_type:
            push_data["reference_type"] = reference_type
        if reference_id:
            push_data["reference_id"] = str(reference_id)

        try:
            from backend.modules.notification.services.push_sender import (
                send_push_to_user,
            )
            asyncio.create_task(
                _safe_send_push(db, tenant_id, user_id, title, message, push_data)
            )
        except Exception as e:
            logger.debug(f"Push dispatch setup failed (non-critical): {e}")

        return notification

    except Exception as e:
        # Never let notification logic break the main business flow
        logger.warning(
            f"Failed to create notification {notification_type} for user {user_id}: {e}"
        )
        return None


async def _safe_send_push(
    db: AsyncSession,
    tenant_id: UUID,
    user_id: UUID,
    title: str,
    body: str,
    data: Optional[dict] = None,
):
    """Fire-and-forget push sender with error isolation."""
    try:
        from backend.modules.notification.services.push_sender import (
            send_push_to_user,
        )
        await send_push_to_user(db, tenant_id, user_id, title, body, data)
    except Exception as e:
        logger.warning(f"Push send failed (non-critical): {e}")

