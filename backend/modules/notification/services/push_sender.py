"""
Expo Push Notification Sender — sends push notifications to mobile devices.

Uses Expo Push API (https://docs.expo.dev/push-notifications/sending-notifications/)
No Firebase setup needed — Expo handles FCM/APNs routing automatically.

Usage:
    from backend.modules.notification.services.push_sender import send_push_to_user
    await send_push_to_user(db, tenant_id, user_id, title, body, data)
"""

import httpx
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from uuid import UUID
from typing import Optional

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def get_active_push_tokens(
    db: AsyncSession,
    tenant_id: UUID,
    user_id: UUID,
) -> list[str]:
    """Get all active push tokens for a user from device_registrations."""
    result = await db.execute(
        text("""
            SELECT device_token FROM device_registrations
            WHERE user_id = :user_id
              AND tenant_id = :tenant_id
              AND is_active = true
        """),
        {"user_id": str(user_id), "tenant_id": str(tenant_id)},
    )
    return [row[0] for row in result.fetchall()]


async def send_push_to_user(
    db: AsyncSession,
    tenant_id: UUID,
    user_id: UUID,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> int:
    """
    Send push notification to all active devices of a user.
    Returns number of notifications sent successfully.
    """
    tokens = await get_active_push_tokens(db, tenant_id, user_id)

    if not tokens:
        logger.debug(f"No active push tokens for user {user_id}")
        return 0

    # Build Expo push messages
    messages = []
    for token in tokens:
        if not token.startswith("ExponentPushToken["):
            logger.warning(f"Invalid push token format: {token[:20]}...")
            continue

        message = {
            "to": token,
            "title": title,
            "body": body,
            "sound": "default",
            "priority": "high",
        }
        if data:
            message["data"] = data
        messages.append(message)

    if not messages:
        return 0

    # Send via Expo Push API (batched)
    sent_count = 0
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
            )

            if response.status_code == 200:
                result = response.json()
                tickets = result.get("data", [])
                for ticket in tickets:
                    if ticket.get("status") == "ok":
                        sent_count += 1
                    elif ticket.get("status") == "error":
                        error_msg = ticket.get("message", "Unknown")
                        detail = ticket.get("details", {})
                        # Handle invalid token — deactivate it
                        if detail.get("error") == "DeviceNotRegistered":
                            await _deactivate_token(db, ticket.get("__token", ""))
                        logger.warning(f"Push ticket error: {error_msg}")
                logger.info(
                    f"Push sent to user {user_id}: {sent_count}/{len(messages)} delivered"
                )
            else:
                logger.error(
                    f"Expo Push API error: {response.status_code} {response.text[:200]}"
                )
    except httpx.TimeoutException:
        logger.warning(f"Push send timeout for user {user_id}")
    except Exception as e:
        # Never let push logic break the main business flow
        logger.warning(f"Push send failed for user {user_id}: {e}")

    return sent_count


async def send_push_to_users(
    db: AsyncSession,
    tenant_id: UUID,
    user_ids: list[UUID],
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> int:
    """Send push notification to multiple users."""
    total = 0
    for uid in user_ids:
        total += await send_push_to_user(db, tenant_id, uid, title, body, data)
    return total


async def _deactivate_token(db: AsyncSession, token: str):
    """Deactivate a push token that is no longer registered."""
    if not token:
        return
    try:
        await db.execute(
            text("UPDATE device_registrations SET is_active = false WHERE device_token = :token"),
            {"token": token},
        )
        logger.info(f"Deactivated unregistered push token: {token[:30]}...")
    except Exception as e:
        logger.warning(f"Failed to deactivate token: {e}")
