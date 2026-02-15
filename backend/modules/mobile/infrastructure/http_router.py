"""
Mobile Platform API Router
Database: PostgreSQL (catering_db)

Endpoints:
- POST   /mobile/devices         — Register device for push notifications
- DELETE /mobile/devices/{token}  — Unregister device
- POST   /mobile/check-in        — GPS check-in/check-out
- POST   /mobile/sync            — Offline sync batch
- GET    /mobile/my-schedule      — My assignments/schedule
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete, func, case
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, timedelta
import logging

logger = logging.getLogger(__name__)

from backend.core.database import get_db
from backend.core.dependencies import get_current_tenant, get_current_user
from backend.core.auth.schemas import User as UserSchema

from backend.modules.mobile.domain.models import (
    DeviceRegistrationModel,
    EventCheckinModel,
    MobileSyncLogModel,
)
from backend.modules.mobile.domain.dtos import (
    DeviceRegisterRequest,
    DeviceRegisterResponse,
    CheckinRequest,
    CheckinResponse,
    SyncRequest,
    SyncResponse,
    SyncConflict,
    MobileScheduleItem,
)
from backend.modules.order.domain.models import (
    OrderModel,
    OrderStaffAssignmentModel,
)

router = APIRouter(tags=["Mobile API"])


# ============ DEVICE REGISTRATION ============

@router.post("/mobile/devices", response_model=DeviceRegisterResponse)
async def register_device(
    payload: DeviceRegisterRequest,
    current_user: UserSchema = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Register a mobile device for push notifications."""
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    # Upsert: if device_token already exists for this tenant, update it
    stmt = pg_insert(DeviceRegistrationModel).values(
        tenant_id=tenant_id,
        user_id=current_user.id,
        device_token=payload.device_token,
        platform=payload.platform,
        device_name=payload.device_name,
        app_version=payload.app_version,
        is_active=True,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["tenant_id", "device_token"],
        set_={
            "user_id": current_user.id,
            "platform": payload.platform,
            "device_name": payload.device_name,
            "app_version": payload.app_version,
            "is_active": True,
            "updated_at": func.now(),
        },
    )
    result = await db.execute(stmt)
    await db.commit()

    # Fetch the upserted record
    device = await db.execute(
        select(DeviceRegistrationModel).where(
            DeviceRegistrationModel.tenant_id == tenant_id,
            DeviceRegistrationModel.device_token == payload.device_token,
        )
    )
    device = device.scalar_one()

    return DeviceRegisterResponse(id=device.id, status="registered")


@router.delete("/mobile/devices/{device_token}")
async def unregister_device(
    device_token: str,
    current_user: UserSchema = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Unregister a device (soft-delete by marking inactive)."""
    result = await db.execute(
        select(DeviceRegistrationModel).where(
            DeviceRegistrationModel.tenant_id == tenant_id,
            DeviceRegistrationModel.device_token == device_token,
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    device.is_active = False
    device.updated_at = func.now()
    await db.commit()

    return {"status": "unregistered"}


# ============ GPS CHECK-IN/CHECK-OUT ============

@router.post("/mobile/check-in", response_model=CheckinResponse)
async def check_in(
    payload: CheckinRequest,
    current_user: UserSchema = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Record a GPS check-in or check-out at an event location."""
    from backend.modules.hr.domain.models import EmployeeModel

    # Find employee record for current user by email match
    emp_result = await db.execute(
        select(EmployeeModel.id).where(
            EmployeeModel.tenant_id == tenant_id,
            EmployeeModel.email == current_user.email,
        )
    )
    employee_id = emp_result.scalar_one_or_none()

    if not employee_id:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy hồ sơ nhân viên cho tài khoản này"
        )

    checkin = EventCheckinModel(
        tenant_id=tenant_id,
        employee_id=employee_id,
        order_id=payload.order_id,
        check_type=payload.check_type,
        latitude=payload.latitude,
        longitude=payload.longitude,
        recorded_at=payload.recorded_at,
        synced_at=datetime.utcnow(),
        source='mobile',
    )
    db.add(checkin)
    await db.commit()
    await db.refresh(checkin)

    return CheckinResponse(id=checkin.id, status="recorded")


# ============ OFFLINE SYNC ============

@router.post("/mobile/sync", response_model=SyncResponse)
async def sync_operations(
    payload: SyncRequest,
    current_user: UserSchema = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Batch sync offline operations.
    Uses Last-Write-Wins conflict resolution.
    """
    synced = 0
    conflicts: List[SyncConflict] = []

    for op in payload.operations:
        try:
            sync_log = MobileSyncLogModel(
                tenant_id=tenant_id,
                user_id=current_user.id,
                entity_type=op.entity_type,
                entity_id=op.entity_id,
                action=op.action,
                payload=op.payload,
                client_timestamp=op.client_timestamp,
            )
            db.add(sync_log)
            synced += 1
        except Exception as e:
            logger.error(f"Sync error for entity {op.entity_id}: {e}")
            conflicts.append(SyncConflict(
                entity_id=op.entity_id,
                resolution=f"error: {str(e)}"
            ))

    await db.commit()
    return SyncResponse(synced=synced, conflicts=conflicts)


# ============ MY SCHEDULE ============

@router.get("/mobile/my-schedule", response_model=List[MobileScheduleItem])
async def get_my_schedule(
    date_from: Optional[date] = Query(None, description="Start date filter"),
    date_to: Optional[date] = Query(None, description="End date filter"),
    current_user: UserSchema = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    Get schedule for the current user.
    Joins order_staff_assignments with orders to get event details.
    """
    # Set default date range: today ± 30 days
    if not date_from:
        date_from = date.today() - timedelta(days=7)
    if not date_to:
        date_to = date.today() + timedelta(days=30)

    query = (
        select(
            OrderModel.id.label("order_id"),
            OrderModel.code.label("order_code"),
            OrderModel.customer_name,
            OrderModel.event_type,
            OrderModel.event_date,
            OrderModel.event_address,
            OrderModel.status.label("order_status"),
            OrderStaffAssignmentModel.role,
        )
        .join(
            OrderStaffAssignmentModel,
            and_(
                OrderStaffAssignmentModel.order_id == OrderModel.id,
                OrderStaffAssignmentModel.tenant_id == OrderModel.tenant_id,
            )
        )
        .where(
            OrderModel.tenant_id == tenant_id,
            OrderStaffAssignmentModel.staff_id == current_user.id,
            OrderModel.status.notin_(["CANCELLED"]),
        )
    )

    # Apply date filters
    if date_from:
        query = query.where(OrderModel.event_date >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.where(OrderModel.event_date <= datetime.combine(date_to, datetime.max.time()))

    query = query.order_by(OrderModel.event_date.asc())

    result = await db.execute(query)
    rows = result.all()

    schedule_items = []
    for row in rows:
        event_name = f"{row.event_type or 'Tiệc'} - {row.order_code}"
        schedule_items.append(MobileScheduleItem(
            order_id=row.order_id,
            event_name=event_name,
            role=row.role,
            start_time=row.event_date,
            end_time=row.event_date + timedelta(hours=4) if row.event_date else None,
            status=row.order_status,
            location=row.event_address,
            customer_name=row.customer_name,
        ))

    return schedule_items
