"""
Employee Self-Service Timesheet & Payroll Router
==================================================
Endpoints accessible by ALL authenticated users (Chef, Staff, Sales, etc.)
Bypasses HR module-level guard (require_permission("hr")).

Endpoints:
- GET  /my/timesheets       — Get current user's timesheet entries
- GET  /my/payroll/periods   — List payroll periods (all users can see)
- GET  /my/payroll/current   — Get current user's latest payroll item
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime
from pydantic import BaseModel

logger = logging.getLogger(__name__)

from backend.core.database import get_db, set_tenant_context
from backend.core.dependencies import get_current_tenant
from backend.core.auth.router import get_current_user
from backend.core.auth.schemas import User as CurrentUser
from backend.modules.hr.domain.models import (
    EmployeeModel, TimesheetModel, PayrollPeriodModel, PayrollItemModel
)
from backend.modules.order.domain.models import OrderModel

router = APIRouter(tags=["Self-Service HR"])


# --- Helper: Get employee from current user ---

async def _get_employee_from_user(
    current_user: CurrentUser,
    tenant_id: UUID,
    db: AsyncSession
) -> EmployeeModel:
    """Find the employee record linked to the current user."""
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


# --- Response Schemas ---

class MyTimesheetResponse(BaseModel):
    id: UUID
    employee_id: UUID
    work_date: str
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    total_hours: float
    overtime_hours: float
    status: str
    source: Optional[str] = None
    order_id: Optional[UUID] = None
    order_code: Optional[str] = None
    customer_name: Optional[str] = None
    event_location: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime


class MyPayrollPeriodResponse(BaseModel):
    id: UUID
    period_name: str
    start_date: str
    end_date: str
    status: str
    created_at: datetime


class MyPayrollItemResponse(BaseModel):
    period_id: UUID
    period_name: str
    period_status: str
    # Hours
    regular_hours: float
    overtime_hours: float
    working_days: int
    # Income
    base_salary: float
    regular_pay: float
    overtime_pay: float
    allowance_meal: float
    allowance_transport: float
    bonus: float
    gross_salary: float
    # Deductions
    deduction_social_ins: float
    deduction_health_ins: float
    deduction_unemployment: float
    deduction_advance: float
    deduction_other: float
    total_deductions: float
    # Net
    net_salary: float


# ============================================
# SELF-SERVICE ENDPOINTS
# ============================================

@router.get("/my/timesheets", response_model=List[MyTimesheetResponse])
async def self_get_my_timesheets(
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """[SELF-SERVICE] Get timesheet entries for the current logged-in user."""
    await set_tenant_context(db, str(tenant_id))

    employee = await _get_employee_from_user(current_user, tenant_id, db)
    if not employee:
        return []

    query = select(
        TimesheetModel,
        OrderModel.code,
        OrderModel.customer_name,
        OrderModel.event_address
    ).outerjoin(
        OrderModel, TimesheetModel.order_id == OrderModel.id
    ).where(
        TimesheetModel.tenant_id == tenant_id,
        TimesheetModel.employee_id == employee.id  # Only my timesheets
    )

    if start_date:
        query = query.where(TimesheetModel.work_date >= date.fromisoformat(start_date))
    if end_date:
        query = query.where(TimesheetModel.work_date <= date.fromisoformat(end_date))

    query = query.order_by(TimesheetModel.work_date.desc())

    result = await db.execute(query)
    rows = result.all()

    return [
        MyTimesheetResponse(
            id=row[0].id,
            employee_id=row[0].employee_id,
            work_date=row[0].work_date.isoformat(),
            actual_start=row[0].actual_start,
            actual_end=row[0].actual_end,
            total_hours=float(row[0].total_hours or 0),
            overtime_hours=float(row[0].overtime_hours or 0),
            status=row[0].status or 'PENDING',
            source=row[0].source or 'MANUAL',
            order_id=row[0].order_id,
            order_code=row[1],
            customer_name=row[2],
            event_location=row[3],
            notes=row[0].notes,
            created_at=row[0].created_at,
        )
        for row in rows
    ]


@router.get("/my/payroll/periods", response_model=List[MyPayrollPeriodResponse])
async def self_get_payroll_periods(
    limit: int = Query(12, le=50),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """[SELF-SERVICE] List payroll periods (visible to all authenticated users)."""
    await set_tenant_context(db, str(tenant_id))

    query = select(PayrollPeriodModel).where(
        PayrollPeriodModel.tenant_id == tenant_id,
        # Only show CALCULATED, APPROVED, or PAID periods to employees
        PayrollPeriodModel.status.in_(['CALCULATED', 'APPROVED', 'PAID'])
    ).order_by(PayrollPeriodModel.start_date.desc()).limit(limit)

    result = await db.execute(query)
    periods = result.scalars().all()

    return [
        MyPayrollPeriodResponse(
            id=p.id,
            period_name=p.period_name,
            start_date=p.start_date.isoformat(),
            end_date=p.end_date.isoformat(),
            status=p.status,
            created_at=p.created_at,
        )
        for p in periods
    ]


@router.get("/my/payroll/items/{period_id}", response_model=Optional[MyPayrollItemResponse])
async def self_get_my_payroll_item(
    period_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """[SELF-SERVICE] Get current user's payroll item for a specific period."""
    await set_tenant_context(db, str(tenant_id))

    employee = await _get_employee_from_user(current_user, tenant_id, db)
    if not employee:
        return None

    # Verify period exists and is visible
    period_result = await db.execute(
        select(PayrollPeriodModel).where(
            PayrollPeriodModel.id == period_id,
            PayrollPeriodModel.tenant_id == tenant_id,
            PayrollPeriodModel.status.in_(['CALCULATED', 'APPROVED', 'PAID'])
        )
    )
    period = period_result.scalar_one_or_none()
    if not period:
        raise HTTPException(status_code=404, detail="Kỳ lương không tồn tại hoặc chưa được tính")

    # Get my payroll item
    item_result = await db.execute(
        select(PayrollItemModel).where(
            PayrollItemModel.period_id == period_id,
            PayrollItemModel.employee_id == employee.id,
            PayrollItemModel.tenant_id == tenant_id
        )
    )
    item = item_result.scalar_one_or_none()
    if not item:
        return None

    # Count working days from approved timesheets
    from sqlalchemy import distinct
    wd_result = await db.execute(
        select(func.count(distinct(TimesheetModel.work_date))).where(
            TimesheetModel.tenant_id == tenant_id,
            TimesheetModel.employee_id == employee.id,
            TimesheetModel.work_date >= period.start_date,
            TimesheetModel.work_date <= period.end_date,
            TimesheetModel.status == 'APPROVED'
        )
    )
    working_days = wd_result.scalar() or 0

    return MyPayrollItemResponse(
        period_id=period.id,
        period_name=period.period_name,
        period_status=period.status,
        regular_hours=float(item.regular_hours or 0),
        overtime_hours=float(item.overtime_hours or 0),
        working_days=working_days,
        base_salary=float(item.base_salary or 0),
        regular_pay=float(item.regular_pay or 0),
        overtime_pay=float(item.overtime_pay or 0),
        allowance_meal=float(item.allowance_meal or 0),
        allowance_transport=float(item.allowance_transport or 0),
        bonus=float(item.bonus or 0),
        gross_salary=float(item.gross_salary or 0),
        deduction_social_ins=float(item.deduction_social_ins or 0),
        deduction_health_ins=float(item.deduction_health_ins or 0),
        deduction_unemployment=float(item.deduction_unemployment or 0),
        deduction_advance=float(item.deduction_advance or 0),
        deduction_other=float(item.deduction_other or 0),
        total_deductions=float(item.total_deductions or 0),
        net_salary=float(item.net_salary or 0),
    )
