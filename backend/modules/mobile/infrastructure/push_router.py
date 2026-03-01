# Push Token Router — mobile push notification token management
# POST /api/v1/mobile/push-token — register token
# DELETE /api/v1/mobile/push-token — deactivate token

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

from core.database import get_db
from core.auth import get_current_user

router = APIRouter(prefix="/api/v1/mobile", tags=["Mobile Push"])


class PushTokenRequest(BaseModel):
    token: str
    platform: str  # 'ios' | 'android'


@router.post("/push-token")
async def register_push_token(
    req: PushTokenRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Register a push notification token for the current user."""
    user_id = str(current_user.id)
    tenant_id = str(current_user.tenant_id)

    if req.platform not in ("ios", "android"):
        raise HTTPException(status_code=400, detail="Platform must be 'ios' or 'android'")

    # Upsert: insert or update if token already exists
    await db.execute(
        text("""
            INSERT INTO push_tokens (user_id, tenant_id, token, platform, is_active)
            VALUES (:user_id, :tenant_id, :token, :platform, true)
            ON CONFLICT (user_id, token) 
            DO UPDATE SET 
                is_active = true,
                platform = :platform,
                updated_at = now()
        """),
        {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "token": req.token,
            "platform": req.platform,
        },
    )
    await db.commit()

    return {"status": "ok", "message": "Push token registered"}


@router.delete("/push-token")
async def unregister_push_token(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Deactivate all push tokens for the current user (logout)."""
    user_id = str(current_user.id)

    await db.execute(
        text("""
            UPDATE push_tokens 
            SET is_active = false, updated_at = now()
            WHERE user_id = :user_id
        """),
        {"user_id": user_id},
    )
    await db.commit()

    return {"status": "ok", "message": "Push tokens deactivated"}
