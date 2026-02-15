"""
Notification Service - E4: Inventory Alert Integration
Database: PostgreSQL (catering_db)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

from backend.core.database import get_db
from backend.core.dependencies import get_current_tenant


# ============ MODELS ============

class NotificationPayload(BaseModel):
    recipient_id: UUID
    title: str
    body: str
    type: str = 'INFO'
    channels: list[str] = ['IN_APP']  # ZALO, EMAIL


class InventoryAlert(BaseModel):
    """E4: Inventory alert notification"""
    alert_type: str  # LOW_STOCK, EXPIRING_SOON, OUT_OF_STOCK
    severity: str  # CRITICAL, WARNING, INFO
    item_id: str
    item_name: str
    message: str
    current_value: float
    threshold_value: float
    created_at: str


class InventoryAlertsResponse(BaseModel):
    """E4: Combined inventory alerts"""
    total_alerts: int
    critical_count: int
    warning_count: int
    alerts: List[InventoryAlert]
    checked_at: str


router = APIRouter(tags=["Notification Service"])


@router.post("/internal/notify")
async def send_notification(payload: NotificationPayload):
    """Send an in-app notification"""
    logger.info(f"Notification sent to {payload.recipient_id}: {payload.title}")
    return {"status": "queued", "sent_at": datetime.now().isoformat()}


# ============ E4: INVENTORY ALERT NOTIFICATIONS ============

@router.get("/inventory-alerts", response_model=InventoryAlertsResponse)
async def get_inventory_alert_notifications(
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    E4: Get all inventory-related alert notifications.
    Combines low-stock, expiring-soon, and out-of-stock alerts.
    Reference: PRD-luong-nghiep-vu-kho-hang-v2.md (E4)
    """
    from backend.modules.inventory.domain.models import (
        InventoryItemModel, InventoryStockModel, InventoryLotModel
    )

    alerts = []
    critical_count = 0
    warning_count = 0

    try:
        # 1. Low-stock and out-of-stock alerts
        stock_result = await db.execute(
            select(
                InventoryItemModel,
                func.coalesce(func.sum(InventoryStockModel.quantity), 0).label('current_stock')
            )
            .outerjoin(InventoryStockModel, InventoryItemModel.id == InventoryStockModel.item_id)
            .where(
                InventoryItemModel.tenant_id == tenant_id,
                InventoryItemModel.is_active == True,
            )
            .group_by(InventoryItemModel.id)
        )

        for row in stock_result.all():
            item = row[0]
            stock = float(row.current_stock or 0)
            min_stock = float(item.min_stock or 0)

            if stock <= 0:
                alerts.append(InventoryAlert(
                    alert_type="OUT_OF_STOCK",
                    severity="CRITICAL",
                    item_id=str(item.id),
                    item_name=item.name,
                    message=f"{item.name} đã hết hàng! Cần nhập thêm ngay.",
                    current_value=stock,
                    threshold_value=min_stock,
                    created_at=datetime.now().isoformat(),
                ))
                critical_count += 1
            elif min_stock > 0 and stock <= min_stock:
                alerts.append(InventoryAlert(
                    alert_type="LOW_STOCK",
                    severity="WARNING",
                    item_id=str(item.id),
                    item_name=item.name,
                    message=f"{item.name} sắp hết ({stock:.1f} {item.uom or 'kg'} / tối thiểu {min_stock:.1f})",
                    current_value=stock,
                    threshold_value=min_stock,
                    created_at=datetime.now().isoformat(),
                ))
                warning_count += 1

        # 2. Expiring lots (within 30 days)
        expiry_threshold = datetime.now() + timedelta(days=30)
        lots_result = await db.execute(
            select(InventoryLotModel)
            .join(InventoryItemModel, InventoryLotModel.item_id == InventoryItemModel.id)
            .where(
                InventoryLotModel.tenant_id == tenant_id,
                InventoryLotModel.status == 'ACTIVE',
                InventoryLotModel.remaining_quantity > 0,
                InventoryLotModel.expiry_date.isnot(None),
                InventoryLotModel.expiry_date <= expiry_threshold,
            )
            .order_by(InventoryLotModel.expiry_date)
        )

        for lot in lots_result.scalars().all():
            days_until = (lot.expiry_date - datetime.now()).days
            severity = "CRITICAL" if days_until <= 7 else "WARNING"

            if severity == "CRITICAL":
                critical_count += 1
            else:
                warning_count += 1

            # Get item name
            item_result = await db.execute(
                select(InventoryItemModel.name).where(InventoryItemModel.id == lot.item_id)
            )
            item_name = item_result.scalar() or "N/A"

            alerts.append(InventoryAlert(
                alert_type="EXPIRING_SOON",
                severity=severity,
                item_id=str(lot.item_id),
                item_name=item_name,
                message=f"Lô {lot.lot_number} ({item_name}) hết hạn trong {days_until} ngày ({lot.remaining_quantity:.1f} còn lại)",
                current_value=days_until,
                threshold_value=30,
                created_at=datetime.now().isoformat(),
            ))

    except Exception as e:
        logger.error(f"Error fetching inventory alerts: {e}")

    # Sort: critical first, then warning
    severity_order = {"CRITICAL": 0, "WARNING": 1, "INFO": 2}
    alerts.sort(key=lambda a: severity_order.get(a.severity, 3))

    return InventoryAlertsResponse(
        total_alerts=len(alerts),
        critical_count=critical_count,
        warning_count=warning_count,
        alerts=alerts,
        checked_at=datetime.now().isoformat(),
    )
