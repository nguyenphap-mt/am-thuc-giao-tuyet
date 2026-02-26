"""
Employee Self-Service Leave Router
===================================
Endpoints accessible by ALL authenticated users (Chef, Staff, Sales, etc.)
Bypasses HR module-level guard (require_permission("hr")).

Endpoints:
- GET  /leave/self/types         — List leave types
- GET  /leave/self/my-balances   — Get current user's leave balances
- GET  /leave/self/my-requests   — Get current user's leave requests
- POST /leave/self/my-requests   — Create leave request for self only
- PUT  /leave/self/my-requests/{id}/cancel — Cancel own pending request
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional
from uuid import UUID
from datetime import date, timedelta
from pydantic import BaseModel
from decimal import Decimal

logger = logging.getLogger(__name__)

from backend.core.database import get_db, set_tenant_context
from backend.core.dependencies import get_current_tenant
from backend.core.auth.router import get_current_user
from backend.core.auth.schemas import User as CurrentUser
from backend.modules.hr.domain.models import (
    EmployeeModel, LeaveTypeModel, LeaveBalanceModel,
    LeaveRequestModel, LeaveApprovalHistoryModel, VietnamHolidayModel
)

router = APIRouter(tags=["Leave Self-Service"])


# --- Schemas (duplicated to keep router self-contained) ---

class LeaveTypeResponse(BaseModel):
    id: UUID
    code: str
    name: str
    days_per_year: float
    is_paid: bool
    requires_approval: bool
    is_active: bool
    class Config:
        from_attributes = True


class LeaveBalanceResponse(BaseModel):
    leave_type_code: str
    leave_type_name: str
    entitled_days: float
    used_days: float
    pending_days: float
    remaining_days: float


class LeaveRequestResponse(BaseModel):
    id: UUID
    employee_id: UUID
    employee_name: Optional[str] = None
    leave_type_name: str
    start_date: str
    end_date: str
    total_days: float
    reason: Optional[str] = None
    status: str
    approved_at: Optional[object] = None
    created_at: object
    is_half_day: bool = False
    half_day_period: Optional[str] = None
    rejection_reason: Optional[str] = None


class SelfLeaveRequestCreate(BaseModel):
    """Self-service leave request — no employee_id needed (uses current user)"""
    leave_type_code: str  # ANNUAL, SICK, PERSONAL...
    start_date: str       # YYYY-MM-DD
    end_date: str         # YYYY-MM-DD
    reason: Optional[str] = None
    is_half_day: bool = False
    half_day_period: Optional[str] = None  # 'MORNING' | 'AFTERNOON'


# --- Helper: Get employee from current user ---

async def _get_employee_from_user(
    current_user: CurrentUser,
    tenant_id: UUID,
    db: AsyncSession
) -> EmployeeModel:
    """Find the employee record linked to the current user."""
    # Try by user_id first (most reliable)
    if current_user.id:
        query = select(EmployeeModel).where(
            EmployeeModel.tenant_id == tenant_id,
            EmployeeModel.user_id == str(current_user.id)
        )
        result = await db.execute(query)
        employee = result.scalar_one_or_none()
        if employee:
            return employee

    # Fallback: match by email
    query = select(EmployeeModel).where(
        EmployeeModel.tenant_id == tenant_id,
        or_(
            EmployeeModel.email == current_user.email,
            EmployeeModel.phone == current_user.email
        )
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


# ============================================
# SELF-SERVICE ENDPOINTS
# ============================================

@router.get("/leave/self/types", response_model=List[LeaveTypeResponse])
async def self_list_leave_types(
    tenant_id: UUID = Depends(get_current_tenant),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """[SELF-SERVICE] Get all active leave types."""
    await set_tenant_context(db, str(tenant_id))

    result = await db.execute(
        select(LeaveTypeModel).where(
            LeaveTypeModel.tenant_id == tenant_id,
            LeaveTypeModel.is_active == True
        ).order_by(LeaveTypeModel.code)
    )
    types = result.scalars().all()

    return [
        LeaveTypeResponse(
            id=t.id, code=t.code, name=t.name,
            days_per_year=float(t.days_per_year or 0),
            is_paid=t.is_paid, requires_approval=t.requires_approval,
            is_active=t.is_active
        )
        for t in types
    ]


@router.get("/leave/self/my-balances", response_model=List[LeaveBalanceResponse])
async def self_get_my_leave_balances(
    year: int = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """[SELF-SERVICE] Get leave balances for the current logged-in user."""
    await set_tenant_context(db, str(tenant_id))

    if not year:
        year = date.today().year

    employee = await _get_employee_from_user(current_user, tenant_id, db)
    if not employee:
        return []

    # Get all active leave types
    types_result = await db.execute(
        select(LeaveTypeModel).where(
            LeaveTypeModel.tenant_id == tenant_id,
            LeaveTypeModel.is_active == True
        )
    )
    leave_types = {t.id: t for t in types_result.scalars().all()}

    # Get existing balances
    balances_result = await db.execute(
        select(LeaveBalanceModel).where(
            LeaveBalanceModel.tenant_id == tenant_id,
            LeaveBalanceModel.employee_id == employee.id,
            LeaveBalanceModel.year == year
        )
    )
    balances = {b.leave_type_id: b for b in balances_result.scalars().all()}

    result = []
    for lt_id, lt in leave_types.items():
        if lt_id in balances:
            b = balances[lt_id]
            result.append(LeaveBalanceResponse(
                leave_type_code=lt.code,
                leave_type_name=lt.name,
                entitled_days=float(b.entitled_days or 0),
                used_days=float(b.used_days or 0),
                pending_days=float(b.pending_days or 0),
                remaining_days=float(
                    (b.entitled_days or 0) + (b.carry_over_days or 0)
                    - (b.used_days or 0) - (b.pending_days or 0)
                )
            ))
        else:
            # Auto-init balance
            new_balance = LeaveBalanceModel(
                tenant_id=tenant_id,
                employee_id=employee.id,
                leave_type_id=lt_id,
                year=year,
                entitled_days=lt.days_per_year or 0,
                used_days=0, pending_days=0, carry_over_days=0
            )
            db.add(new_balance)
            result.append(LeaveBalanceResponse(
                leave_type_code=lt.code,
                leave_type_name=lt.name,
                entitled_days=float(lt.days_per_year or 0),
                used_days=0, pending_days=0,
                remaining_days=float(lt.days_per_year or 0)
            ))

    await db.commit()
    return result


@router.get("/leave/self/my-requests", response_model=List[LeaveRequestResponse])
async def self_get_my_leave_requests(
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """[SELF-SERVICE] Get leave requests for the current user only."""
    await set_tenant_context(db, str(tenant_id))

    employee = await _get_employee_from_user(current_user, tenant_id, db)
    if not employee:
        return []

    query = select(
        LeaveRequestModel,
        EmployeeModel.full_name,
        LeaveTypeModel.name
    ).join(
        EmployeeModel, LeaveRequestModel.employee_id == EmployeeModel.id
    ).join(
        LeaveTypeModel, LeaveRequestModel.leave_type_id == LeaveTypeModel.id
    ).where(
        LeaveRequestModel.tenant_id == tenant_id,
        LeaveRequestModel.employee_id == employee.id  # Only my requests
    )

    if status:
        query = query.where(LeaveRequestModel.status == status)

    query = query.order_by(LeaveRequestModel.start_date.desc()).limit(limit)

    result = await db.execute(query)
    rows = result.all()

    return [
        LeaveRequestResponse(
            id=row[0].id,
            employee_id=row[0].employee_id,
            employee_name=row[1],
            leave_type_name=row[2],
            start_date=row[0].start_date.isoformat(),
            end_date=row[0].end_date.isoformat(),
            total_days=float(row[0].total_days or 0),
            reason=row[0].reason,
            status=row[0].status,
            approved_at=row[0].approved_at,
            created_at=row[0].created_at,
            is_half_day=row[0].is_half_day or False,
            half_day_period=row[0].half_day_period,
            rejection_reason=row[0].rejection_reason
        )
        for row in rows
    ]


@router.post("/leave/self/my-requests", response_model=LeaveRequestResponse)
async def self_create_leave_request(
    data: SelfLeaveRequestCreate,
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    [SELF-SERVICE] Create a leave request for the current user.
    Unlike the HR endpoint, this does NOT accept employee_id — 
    it always uses the authenticated user's employee record.
    """
    await set_tenant_context(db, str(tenant_id))

    # Find employee record for current user
    employee = await _get_employee_from_user(current_user, tenant_id, db)
    if not employee:
        raise HTTPException(
            status_code=403,
            detail="Tài khoản của bạn chưa được liên kết với hồ sơ nhân viên"
        )

    # Get leave type
    type_result = await db.execute(
        select(LeaveTypeModel).where(
            LeaveTypeModel.tenant_id == tenant_id,
            LeaveTypeModel.code == data.leave_type_code
        )
    )
    leave_type = type_result.scalar_one_or_none()
    if not leave_type:
        raise HTTPException(status_code=400, detail=f"Loại nghỉ phép '{data.leave_type_code}' không tồn tại")

    # Parse dates
    try:
        start = date.fromisoformat(data.start_date)
        end = date.fromisoformat(data.end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Định dạng ngày không hợp lệ. Sử dụng YYYY-MM-DD")

    if end < start:
        raise HTTPException(status_code=400, detail="Ngày kết thúc phải sau ngày bắt đầu")

    # Calculate total days
    if data.is_half_day:
        if start != end:
            raise HTTPException(status_code=400, detail="Nghỉ nửa ngày chỉ áp dụng cho 1 ngày")
        if not data.half_day_period or data.half_day_period not in ('MORNING', 'AFTERNOON'):
            raise HTTPException(status_code=400, detail="Buổi nghỉ phải là MORNING hoặc AFTERNOON")
        total_days = 0.5
    else:
        # Full-day leave (excluding weekends + public holidays)
        holiday_result = await db.execute(
            select(VietnamHolidayModel.holiday_date).where(
                VietnamHolidayModel.tenant_id == tenant_id,
                VietnamHolidayModel.holiday_date >= start,
                VietnamHolidayModel.holiday_date <= end
            )
        )
        holiday_dates = set(row[0] for row in holiday_result.all())

        total_days = 0
        current = start
        while current <= end:
            if current.weekday() < 5 and current not in holiday_dates:
                total_days += 1
            current += timedelta(days=1)

    if total_days == 0:
        raise HTTPException(status_code=400, detail="Không có ngày làm việc trong khoảng thời gian đã chọn")

    # Check balance
    year = start.year
    balance_result = await db.execute(
        select(LeaveBalanceModel).where(
            LeaveBalanceModel.employee_id == employee.id,
            LeaveBalanceModel.leave_type_id == leave_type.id,
            LeaveBalanceModel.year == year
        )
    )
    balance = balance_result.scalar_one_or_none()

    if balance:
        remaining = float(
            (balance.entitled_days or 0) + (balance.carry_over_days or 0)
            - (balance.used_days or 0) - (balance.pending_days or 0)
        )
        if total_days > remaining:
            raise HTTPException(
                status_code=400,
                detail=f"Không đủ ngày nghỉ. Còn lại: {remaining}, Yêu cầu: {total_days}"
            )

    # Create request
    request = LeaveRequestModel(
        tenant_id=tenant_id,
        employee_id=employee.id,
        leave_type_id=leave_type.id,
        start_date=start,
        end_date=end,
        total_days=total_days,
        reason=data.reason,
        is_half_day=data.is_half_day,
        half_day_period=data.half_day_period if data.is_half_day else None,
        status='APPROVED' if not leave_type.requires_approval else 'PENDING'
    )

    db.add(request)

    # Update pending days in balance
    if balance:
        balance.pending_days = (balance.pending_days or 0) + Decimal(str(total_days))

    await db.commit()
    await db.refresh(request)

    return LeaveRequestResponse(
        id=request.id,
        employee_id=request.employee_id,
        employee_name=employee.full_name,
        leave_type_name=leave_type.name,
        start_date=request.start_date.isoformat(),
        end_date=request.end_date.isoformat(),
        total_days=float(request.total_days),
        reason=request.reason,
        status=request.status,
        approved_at=request.approved_at,
        created_at=request.created_at,
        is_half_day=request.is_half_day or False,
        half_day_period=request.half_day_period
    )


@router.put("/leave/self/my-requests/{request_id}/cancel")
async def self_cancel_leave_request(
    request_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    [SELF-SERVICE] Cancel own pending leave request.
    Only the requesting employee can cancel their own PENDING request.
    """
    await set_tenant_context(db, str(tenant_id))

    # Get the request
    result = await db.execute(
        select(LeaveRequestModel).where(
            LeaveRequestModel.id == request_id,
            LeaveRequestModel.tenant_id == tenant_id
        )
    )
    leave_request = result.scalar_one_or_none()

    if not leave_request:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn nghỉ phép")

    if leave_request.status != 'PENDING':
        raise HTTPException(status_code=400, detail="Chỉ có thể hủy đơn đang chờ duyệt")

    # Verify current user owns this request
    employee = await _get_employee_from_user(current_user, tenant_id, db)
    if not employee or employee.id != leave_request.employee_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền hủy đơn này")

    previous_status = leave_request.status
    leave_request.status = 'CANCELLED'

    # Restore pending days in balance
    balance_result = await db.execute(
        select(LeaveBalanceModel).where(
            LeaveBalanceModel.employee_id == leave_request.employee_id,
            LeaveBalanceModel.leave_type_id == leave_request.leave_type_id,
            LeaveBalanceModel.year == leave_request.start_date.year
        )
    )
    balance = balance_result.scalar_one_or_none()

    if balance:
        balance.pending_days = max(0, (balance.pending_days or 0) - leave_request.total_days)

    # Log to approval history
    history = LeaveApprovalHistoryModel(
        tenant_id=tenant_id,
        leave_request_id=request_id,
        action='CANCELLED',
        action_by=current_user.id,
        action_by_name=current_user.full_name or current_user.email,
        comment='Nhân viên tự hủy đơn',
        previous_status=previous_status,
        new_status='CANCELLED'
    )
    db.add(history)

    await db.commit()

    return {
        "message": "Đơn nghỉ phép đã được hủy",
        "id": str(request_id)
    }
