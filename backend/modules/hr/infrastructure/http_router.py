"""
HR Module HTTP Router
Database: PostgreSQL (catering_db)
Module: HR - Employee Management
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone, timedelta, date
from pydantic import BaseModel
from decimal import Decimal

# Vietnam timezone (UTC+7)
VN_TIMEZONE = timezone(timedelta(hours=7))


from backend.core.database import get_db, set_tenant_context
from backend.core.dependencies import get_current_tenant, CurrentTenant
from backend.core.auth.router import get_current_user
from backend.core.auth.schemas import User as CurrentUser
from backend.modules.hr.domain.models import EmployeeModel, StaffAssignmentModel, TimesheetModel, PayrollSettingsModel, PayrollItemModel, PayrollPeriodModel
from backend.modules.order.domain.models import OrderModel

router = APIRouter(tags=["HR Management"])



# --- Request/Response Schemas ---

class EmployeeCreate(BaseModel):
    full_name: str
    role_type: str = 'WAITER'
    phone: Optional[str] = None
    email: Optional[str] = None
    is_fulltime: bool = False
    hourly_rate: Decimal = Decimal(0)
    base_salary: Decimal = Decimal(0)  # Monthly salary for fulltime
    is_active: bool = True
    id_number: Optional[str] = None
    date_of_birth: Optional[str] = None  # Format: YYYY-MM-DD
    address: Optional[str] = None
    bank_account: Optional[str] = None
    bank_name: Optional[str] = None
    emergency_contact: Optional[str] = None
    notes: Optional[str] = None
    # Per-employee payroll config (NULL = use tenant default)
    allowance_meal: Optional[Decimal] = None
    allowance_transport: Optional[Decimal] = None
    allowance_phone: Optional[Decimal] = None
    allowance_other: Optional[Decimal] = None
    insurance_salary_base: Optional[Decimal] = None  # Base for BHXH calc
    rate_social_override: Optional[Decimal] = None   # Override BHXH rate
    rate_health_override: Optional[Decimal] = None   # Override BHYT rate
    rate_unemployment_override: Optional[Decimal] = None  # Override BHTN rate


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    role_type: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_fulltime: Optional[bool] = None
    hourly_rate: Optional[Decimal] = None
    base_salary: Optional[Decimal] = None  # Monthly salary for fulltime
    is_active: Optional[bool] = None
    id_number: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    bank_account: Optional[str] = None
    bank_name: Optional[str] = None
    emergency_contact: Optional[str] = None
    notes: Optional[str] = None
    # Per-employee payroll config
    allowance_meal: Optional[Decimal] = None
    allowance_transport: Optional[Decimal] = None
    allowance_phone: Optional[Decimal] = None
    allowance_other: Optional[Decimal] = None
    insurance_salary_base: Optional[Decimal] = None
    rate_social_override: Optional[Decimal] = None
    rate_health_override: Optional[Decimal] = None
    rate_unemployment_override: Optional[Decimal] = None


class EmployeeResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    full_name: str
    role_type: str
    phone: Optional[str] = None
    email: Optional[str] = None
    is_fulltime: bool
    hourly_rate: Decimal
    base_salary: Decimal = Decimal(0)  # Monthly salary for fulltime
    is_active: bool
    id_number: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    bank_account: Optional[str] = None
    bank_name: Optional[str] = None
    emergency_contact: Optional[str] = None
    joined_date: Optional[str] = None
    notes: Optional[str] = None
    # Per-employee payroll config
    allowance_meal: Optional[Decimal] = None
    allowance_transport: Optional[Decimal] = None
    allowance_phone: Optional[Decimal] = None
    allowance_other: Optional[Decimal] = None
    insurance_salary_base: Optional[Decimal] = None
    rate_social_override: Optional[Decimal] = None
    rate_health_override: Optional[Decimal] = None
    rate_unemployment_override: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- API Endpoints ---

@router.get("/employees", response_model=List[EmployeeResponse])
async def list_employees(
    tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db),
    search: Optional[str] = Query(None, description="Search by name or phone"),
    role_type: Optional[str] = Query(None, description="Filter by role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    is_fulltime: Optional[bool] = Query(None, description="Filter by fulltime status"),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0)
):
    """Get all employees with optional filters"""
    await set_tenant_context(db, str(tenant_id))
    
    query = select(EmployeeModel).where(EmployeeModel.tenant_id == tenant_id)
    
    # Apply filters
    if search:
        query = query.where(
            or_(
                EmployeeModel.full_name.ilike(f"%{search}%"),
                EmployeeModel.phone.ilike(f"%{search}%")
            )
        )
    if role_type:
        query = query.where(EmployeeModel.role_type == role_type)
    if is_active is not None:
        query = query.where(EmployeeModel.is_active == is_active)
    if is_fulltime is not None:
        query = query.where(EmployeeModel.is_fulltime == is_fulltime)
    
    query = query.order_by(EmployeeModel.full_name).limit(limit).offset(offset)
    
    result = await db.execute(query)
    employees = result.scalars().all()
    
    return [_employee_to_response(emp) for emp in employees]


@router.get("/employees/stats")
async def get_employee_stats(tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Get employee statistics for dashboard"""
    await set_tenant_context(db, str(tenant_id))
    
    # Count total employees
    total_query = select(func.count(EmployeeModel.id)).where(
        EmployeeModel.tenant_id == tenant_id
    )
    total_result = await db.execute(total_query)
    total = total_result.scalar() or 0
    
    # Count active employees
    active_query = select(func.count(EmployeeModel.id)).where(
        EmployeeModel.tenant_id == tenant_id,
        EmployeeModel.is_active == True
    )
    active_result = await db.execute(active_query)
    active = active_result.scalar() or 0
    
    # Count fulltime employees
    fulltime_query = select(func.count(EmployeeModel.id)).where(
        EmployeeModel.tenant_id == tenant_id,
        EmployeeModel.is_fulltime == True
    )
    fulltime_result = await db.execute(fulltime_query)
    fulltime = fulltime_result.scalar() or 0
    
    # Count by role
    role_query = select(
        EmployeeModel.role_type,
        func.count(EmployeeModel.id)
    ).where(
        EmployeeModel.tenant_id == tenant_id,
        EmployeeModel.is_active == True
    ).group_by(EmployeeModel.role_type)
    
    role_result = await db.execute(role_query)
    by_role = {row[0]: row[1] for row in role_result}
    
    return {
        "total": total,
        "active": active,
        "inactive": total - active,
        "fulltime": fulltime,
        "parttime": active - fulltime,
        "by_role": by_role
    }


@router.get("/employees/{employee_id}", response_model=EmployeeResponse)
async def get_employee(employee_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Get employee by ID"""
    await set_tenant_context(db, str(tenant_id))
    
    query = select(EmployeeModel).where(
        EmployeeModel.id == employee_id,
        EmployeeModel.tenant_id == tenant_id
    )
    result = await db.execute(query)
    employee = result.scalar_one_or_none()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return _employee_to_response(employee)


@router.get("/employees/{employee_id}/performance")
async def get_employee_performance(
    employee_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
    period_days: int = Query(30, ge=7, le=365, description="Period in days for metrics calculation")
):
    """Get employee performance metrics for dashboard (GAP-M2)"""
    await set_tenant_context(db, str(tenant_id))
    
    # Verify employee exists
    emp_query = select(EmployeeModel).where(
        EmployeeModel.id == employee_id,
        EmployeeModel.tenant_id == tenant_id
    )
    emp_result = await db.execute(emp_query)
    employee = emp_result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    from datetime import timedelta
    period_start = datetime.now() - timedelta(days=period_days)
    
    # Count total timesheets in period
    ts_count_query = select(func.count(TimesheetModel.id)).where(
        TimesheetModel.employee_id == employee_id,
        TimesheetModel.tenant_id == tenant_id,
        TimesheetModel.work_date >= period_start.date()
    )
    ts_count_result = await db.execute(ts_count_query)
    total_timesheets = ts_count_result.scalar() or 0
    
    # Sum total hours worked
    hours_query = select(func.sum(TimesheetModel.total_hours)).where(
        TimesheetModel.employee_id == employee_id,
        TimesheetModel.tenant_id == tenant_id,
        TimesheetModel.work_date >= period_start.date(),
        TimesheetModel.status == 'APPROVED'
    )
    hours_result = await db.execute(hours_query)
    total_hours = float(hours_result.scalar() or 0)
    
    # Sum overtime hours
    ot_query = select(func.sum(TimesheetModel.overtime_hours)).where(
        TimesheetModel.employee_id == employee_id,
        TimesheetModel.tenant_id == tenant_id,
        TimesheetModel.work_date >= period_start.date(),
        TimesheetModel.status == 'APPROVED'
    )
    ot_result = await db.execute(ot_query)
    total_overtime = float(ot_result.scalar() or 0)
    
    # Count orders assigned
    from backend.modules.hr.domain.models import StaffAssignmentModel
    assignments_query = select(func.count(StaffAssignmentModel.id)).where(
        StaffAssignmentModel.employee_id == employee_id,
        StaffAssignmentModel.tenant_id == tenant_id,
        StaffAssignmentModel.created_at >= period_start
    )
    assignments_result = await db.execute(assignments_query)
    total_assignments = assignments_result.scalar() or 0
    
    # Count completed assignments (checked out)
    completed_query = select(func.count(StaffAssignmentModel.id)).where(
        StaffAssignmentModel.employee_id == employee_id,
        StaffAssignmentModel.tenant_id == tenant_id,
        StaffAssignmentModel.created_at >= period_start,
        StaffAssignmentModel.status == 'COMPLETED'
    )
    completed_result = await db.execute(completed_query)
    completed_assignments = completed_result.scalar() or 0
    
    # Calculate on-time rate (approximation based on approved timesheets)
    approved_query = select(func.count(TimesheetModel.id)).where(
        TimesheetModel.employee_id == employee_id,
        TimesheetModel.tenant_id == tenant_id,
        TimesheetModel.work_date >= period_start.date(),
        TimesheetModel.status == 'APPROVED'
    )
    approved_result = await db.execute(approved_query)
    approved_count = approved_result.scalar() or 0
    
    on_time_rate = (approved_count / total_timesheets * 100) if total_timesheets > 0 else 0
    completion_rate = (completed_assignments / total_assignments * 100) if total_assignments > 0 else 0
    
    return {
        "employee_id": str(employee_id),
        "employee_name": employee.full_name,
        "period_days": period_days,
        "metrics": {
            "total_hours": round(total_hours, 1),
            "total_overtime": round(total_overtime, 1),
            "total_timesheets": total_timesheets,
            "total_assignments": total_assignments,
            "completed_assignments": completed_assignments,
            "on_time_rate": round(on_time_rate, 1),
            "completion_rate": round(completion_rate, 1)
        }
    }

@router.post("/employees", response_model=EmployeeResponse)
async def create_employee(data: EmployeeCreate, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Create new employee"""
    await set_tenant_context(db, str(tenant_id))
    
    # Parse date if provided
    dob = None
    if data.date_of_birth:
        try:
            dob = datetime.strptime(data.date_of_birth, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    new_employee = EmployeeModel(
        tenant_id=tenant_id,
        full_name=data.full_name,
        role_type=data.role_type,
        phone=data.phone,
        email=data.email,
        is_fulltime=data.is_fulltime,
        hourly_rate=data.hourly_rate,
        is_active=data.is_active,
        id_number=data.id_number,
        date_of_birth=dob,
        address=data.address,
        bank_account=data.bank_account,
        bank_name=data.bank_name,
        emergency_contact=data.emergency_contact,
        notes=data.notes
    )
    
    db.add(new_employee)
    await db.commit()
    await db.refresh(new_employee)
    
    return _employee_to_response(new_employee)


@router.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: UUID,
    data: EmployeeUpdate,
    tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)
):
    """Update employee"""
    await set_tenant_context(db, str(tenant_id))
    
    query = select(EmployeeModel).where(
        EmployeeModel.id == employee_id,
        EmployeeModel.tenant_id == tenant_id
    )
    result = await db.execute(query)
    employee = result.scalar_one_or_none()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    
    # Handle date parsing - BUG-20260204-002
    # Skip parsing for empty strings, None, or placeholder text like 'mm/dd/yyyy'
    if 'date_of_birth' in update_data:
        dob_value = update_data['date_of_birth']
        # Check if it's a valid date string (not empty, not placeholder)
        if dob_value and isinstance(dob_value, str) and len(dob_value) == 10 and dob_value[0].isdigit():
            try:
                update_data['date_of_birth'] = datetime.strptime(dob_value, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        else:
            # Empty, None, or placeholder text - set to None
            update_data['date_of_birth'] = None
    
    for field, value in update_data.items():
        setattr(employee, field, value)
    
    await db.commit()
    await db.refresh(employee)
    
    return _employee_to_response(employee)


@router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Soft delete employee (set is_active = False)"""
    await set_tenant_context(db, str(tenant_id))
    
    query = select(EmployeeModel).where(
        EmployeeModel.id == employee_id,
        EmployeeModel.tenant_id == tenant_id
    )
    result = await db.execute(query)
    employee = result.scalar_one_or_none()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee.is_active = False
    await db.commit()
    
    return {"message": "Employee deactivated successfully", "id": str(employee_id)}


# --- Staff Assignments (Phase 2: Enhanced) ---

class AssignmentCreate(BaseModel):
    event_id: UUID
    employee_id: UUID
    role: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    notes: Optional[str] = None


class AssignmentUpdate(BaseModel):
    role: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class AssignmentDetailResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    event_id: Optional[UUID] = None
    employee_id: Optional[UUID] = None
    employee_name: Optional[str] = None
    employee_phone: Optional[str] = None
    employee_role_type: Optional[str] = None
    role: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: str
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    notes: Optional[str] = None
    order_code: Optional[str] = None          # Order code (e.g., DH-202602-001)
    order_customer_name: Optional[str] = None  # Customer name from order
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ConflictCheckResponse(BaseModel):
    has_conflict: bool
    conflicts: List[dict] = []


@router.get("/assignments", response_model=List[AssignmentDetailResponse])
async def list_assignments(
    tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db),
    event_id: Optional[UUID] = Query(None),
    employee_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None)
):
    """Get staff assignments with employee details"""
    await set_tenant_context(db, str(tenant_id))
    
    query = select(
        StaffAssignmentModel,
        EmployeeModel.full_name,
        EmployeeModel.phone,
        EmployeeModel.role_type,
        OrderModel.code,          # Order code
        OrderModel.customer_name   # Customer name
    ).outerjoin(
        EmployeeModel, StaffAssignmentModel.employee_id == EmployeeModel.id
    ).outerjoin(
        OrderModel, StaffAssignmentModel.event_id == OrderModel.id  # JOIN with orders
    ).where(
        StaffAssignmentModel.tenant_id == tenant_id
    )
    
    if event_id:
        query = query.where(StaffAssignmentModel.event_id == event_id)
    if employee_id:
        query = query.where(StaffAssignmentModel.employee_id == employee_id)
    if status:
        query = query.where(StaffAssignmentModel.status == status)
    
    query = query.order_by(StaffAssignmentModel.start_time.desc())
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        AssignmentDetailResponse(
            id=row[0].id,
            tenant_id=row[0].tenant_id,
            event_id=row[0].event_id,
            employee_id=row[0].employee_id,
            employee_name=row[1],
            employee_phone=row[2],
            employee_role_type=row[3],
            role=row[0].role,
            start_time=row[0].start_time,
            end_time=row[0].end_time,
            status=row[0].status or 'ASSIGNED',
            check_in_time=row[0].check_in_time,
            check_out_time=row[0].check_out_time,
            notes=row[0].notes,
            order_code=row[4],           # NEW: Order code
            order_customer_name=row[5],  # NEW: Customer name
            created_at=row[0].created_at,
            updated_at=row[0].updated_at
        )
        for row in rows
    ]


@router.get("/assignments/by-event/{event_id}", response_model=List[AssignmentDetailResponse])
async def get_assignments_by_event(event_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Get all staff assigned to a specific event/order"""
    await set_tenant_context(db, str(tenant_id))
    
    query = select(
        StaffAssignmentModel,
        EmployeeModel.full_name,
        EmployeeModel.phone,
        EmployeeModel.role_type
    ).outerjoin(
        EmployeeModel, StaffAssignmentModel.employee_id == EmployeeModel.id
    ).where(
        StaffAssignmentModel.tenant_id == tenant_id,
        StaffAssignmentModel.event_id == event_id
    ).order_by(EmployeeModel.role_type)
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        AssignmentDetailResponse(
            id=row[0].id,
            tenant_id=row[0].tenant_id,
            event_id=row[0].event_id,
            employee_id=row[0].employee_id,
            employee_name=row[1],
            employee_phone=row[2],
            employee_role_type=row[3],
            role=row[0].role,
            start_time=row[0].start_time,
            end_time=row[0].end_time,
            status=row[0].status or 'ASSIGNED',
            check_in_time=row[0].check_in_time,
            check_out_time=row[0].check_out_time,
            notes=row[0].notes,
            created_at=row[0].created_at,
            updated_at=row[0].updated_at
        )
        for row in rows
    ]


@router.post("/assignments/check-conflict", response_model=ConflictCheckResponse)
async def check_assignment_conflict(
    employee_id: UUID,
    start_time: datetime,
    end_time: datetime,
    exclude_assignment_id: Optional[UUID] = None,
    tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)
):
    """Check if employee has conflicting assignments during the time range"""
    await set_tenant_context(db, str(tenant_id))
    
    # Find overlapping assignments
    query = select(StaffAssignmentModel).where(
        StaffAssignmentModel.tenant_id == tenant_id,
        StaffAssignmentModel.employee_id == employee_id,
        StaffAssignmentModel.status.in_(['ASSIGNED', 'CONFIRMED']),
        # Overlap condition: existing.start < end AND existing.end > start
        StaffAssignmentModel.start_time < end_time,
        StaffAssignmentModel.end_time > start_time
    )
    
    if exclude_assignment_id:
        query = query.where(StaffAssignmentModel.id != exclude_assignment_id)
    
    result = await db.execute(query)
    conflicts = result.scalars().all()
    
    return ConflictCheckResponse(
        has_conflict=len(conflicts) > 0,
        conflicts=[
            {
                "assignment_id": str(c.id),
                "event_id": str(c.event_id) if c.event_id else None,
                "start_time": c.start_time.isoformat() if c.start_time else None,
                "end_time": c.end_time.isoformat() if c.end_time else None,
                "status": c.status
            }
            for c in conflicts
        ]
    )


@router.post("/assignments", response_model=AssignmentDetailResponse)
async def create_assignment(data: AssignmentCreate, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Create new staff assignment with conflict detection"""
    await set_tenant_context(db, str(tenant_id))
    
    # Check for conflicts if time range is provided
    if data.start_time and data.end_time:
        conflict_query = select(StaffAssignmentModel).where(
            StaffAssignmentModel.tenant_id == tenant_id,
            StaffAssignmentModel.employee_id == data.employee_id,
            StaffAssignmentModel.status.in_(['ASSIGNED', 'CONFIRMED']),
            StaffAssignmentModel.start_time < data.end_time,
            StaffAssignmentModel.end_time > data.start_time
        )
        conflict_result = await db.execute(conflict_query)
        if conflict_result.scalars().first():
            raise HTTPException(
                status_code=409, 
                detail="Employee has conflicting assignment during this time"
            )
    
    # Verify employee exists
    emp_query = select(EmployeeModel).where(
        EmployeeModel.id == data.employee_id,
        EmployeeModel.tenant_id == tenant_id,
        EmployeeModel.is_active == True
    )
    emp_result = await db.execute(emp_query)
    employee = emp_result.scalar_one_or_none()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found or inactive")
    
    assignment = StaffAssignmentModel(
        tenant_id=tenant_id,
        event_id=data.event_id,
        employee_id=data.employee_id,
        role=data.role or employee.role_type,
        start_time=data.start_time,
        end_time=data.end_time,
        notes=data.notes
    )
    
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    
    return AssignmentDetailResponse(
        id=assignment.id,
        tenant_id=assignment.tenant_id,
        event_id=assignment.event_id,
        employee_id=assignment.employee_id,
        employee_name=employee.full_name,
        employee_phone=employee.phone,
        employee_role_type=employee.role_type,
        role=assignment.role,
        start_time=assignment.start_time,
        end_time=assignment.end_time,
        status=assignment.status or 'ASSIGNED',
        check_in_time=assignment.check_in_time,
        check_out_time=assignment.check_out_time,
        notes=assignment.notes,
        created_at=assignment.created_at,
        updated_at=assignment.updated_at
    )


@router.put("/assignments/{assignment_id}", response_model=AssignmentDetailResponse)
async def update_assignment(
    assignment_id: UUID,
    data: AssignmentUpdate,
    tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)
):
    """Update assignment details or status"""
    await set_tenant_context(db, str(tenant_id))
    
    query = select(StaffAssignmentModel).where(
        StaffAssignmentModel.id == assignment_id,
        StaffAssignmentModel.tenant_id == tenant_id
    )
    result = await db.execute(query)
    assignment = result.scalar_one_or_none()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Update fields
    if data.role is not None:
        assignment.role = data.role
    if data.start_time is not None:
        assignment.start_time = data.start_time
    if data.end_time is not None:
        assignment.end_time = data.end_time
    if data.status is not None:
        assignment.status = data.status
    if data.notes is not None:
        assignment.notes = data.notes
    
    await db.commit()
    await db.refresh(assignment)
    
    # Get employee details
    emp_query = select(EmployeeModel).where(EmployeeModel.id == assignment.employee_id)
    emp_result = await db.execute(emp_query)
    employee = emp_result.scalar_one_or_none()
    
    return AssignmentDetailResponse(
        id=assignment.id,
        tenant_id=assignment.tenant_id,
        event_id=assignment.event_id,
        employee_id=assignment.employee_id,
        employee_name=employee.full_name if employee else None,
        employee_phone=employee.phone if employee else None,
        employee_role_type=employee.role_type if employee else None,
        role=assignment.role,
        start_time=assignment.start_time,
        end_time=assignment.end_time,
        status=assignment.status or 'ASSIGNED',
        check_in_time=assignment.check_in_time,
        check_out_time=assignment.check_out_time,
        notes=assignment.notes,
        created_at=assignment.created_at,
        updated_at=assignment.updated_at
    )


@router.put("/assignments/{assignment_id}/status")
async def update_assignment_status(
    assignment_id: UUID,
    status: str,
    tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)
):
    """Quick status update for assignment workflow"""
    await set_tenant_context(db, str(tenant_id))
    
    valid_statuses = ['ASSIGNED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED']
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    query = select(StaffAssignmentModel).where(
        StaffAssignmentModel.id == assignment_id,
        StaffAssignmentModel.tenant_id == tenant_id
    )
    result = await db.execute(query)
    assignment = result.scalar_one_or_none()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    assignment.status = status
    
    # Auto-set check-in/out times
    if status == 'CHECKED_IN' and not assignment.check_in_time:
        assignment.check_in_time = datetime.now()
    elif status == 'COMPLETED' and not assignment.check_out_time:
        assignment.check_out_time = datetime.now()
    
    await db.commit()
    
    return {"message": f"Status updated to {status}", "id": str(assignment_id)}


@router.delete("/assignments/{assignment_id}")
async def delete_assignment(assignment_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Delete/cancel an assignment"""
    await set_tenant_context(db, str(tenant_id))
    
    query = select(StaffAssignmentModel).where(
        StaffAssignmentModel.id == assignment_id,
        StaffAssignmentModel.tenant_id == tenant_id
    )
    result = await db.execute(query)
    assignment = result.scalar_one_or_none()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Soft delete by setting status to CANCELLED
    assignment.status = 'CANCELLED'
    await db.commit()
    
    return {"message": "Assignment cancelled", "id": str(assignment_id)}


@router.get("/assignments/available-employees")
async def get_available_employees(
    start_time: datetime,
    end_time: datetime,
    role_type: Optional[str] = None,
    tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)
):
    """Get employees available during a specific time range"""
    await set_tenant_context(db, str(tenant_id))
    
    # Find employees with conflicting assignments
    busy_employees_query = select(StaffAssignmentModel.employee_id).where(
        StaffAssignmentModel.tenant_id == tenant_id,
        StaffAssignmentModel.status.in_(['ASSIGNED', 'CONFIRMED']),
        StaffAssignmentModel.start_time < end_time,
        StaffAssignmentModel.end_time > start_time
    ).distinct()
    
    busy_result = await db.execute(busy_employees_query)
    busy_ids = [row[0] for row in busy_result.all()]
    
    # Get all active employees not busy
    emp_query = select(EmployeeModel).where(
        EmployeeModel.tenant_id == tenant_id,
        EmployeeModel.is_active == True,
        ~EmployeeModel.id.in_(busy_ids) if busy_ids else True
    )
    
    if role_type:
        emp_query = emp_query.where(EmployeeModel.role_type == role_type)
    
    emp_query = emp_query.order_by(EmployeeModel.role_type, EmployeeModel.full_name)
    
    result = await db.execute(emp_query)
    employees = result.scalars().all()
    
    return [
        {
            "id": str(emp.id),
            "full_name": emp.full_name,
            "role_type": emp.role_type,
            "phone": emp.phone,
            "is_fulltime": emp.is_fulltime
        }
        for emp in employees
    ]


# --- Helper Functions ---

def _employee_to_response(emp: EmployeeModel) -> EmployeeResponse:
    """Convert ORM model to response schema"""
    return EmployeeResponse(
        id=emp.id,
        tenant_id=emp.tenant_id,
        full_name=emp.full_name,
        role_type=emp.role_type or 'WAITER',
        phone=emp.phone,
        email=emp.email,
        is_fulltime=emp.is_fulltime or False,
        hourly_rate=emp.hourly_rate or Decimal(0),
        is_active=emp.is_active if emp.is_active is not None else True,
        id_number=emp.id_number,
        date_of_birth=emp.date_of_birth.isoformat() if emp.date_of_birth else None,
        address=emp.address,
        bank_account=emp.bank_account,
        bank_name=emp.bank_name,
        emergency_contact=emp.emergency_contact,
        joined_date=emp.joined_date.isoformat() if emp.joined_date else None,
        notes=emp.notes,
        created_at=emp.created_at,
        updated_at=emp.updated_at
    )


# ============================================
# PHASE 3: TIMESHEETS & ATTENDANCE
# ============================================

from datetime import date, timedelta

class TimesheetCreate(BaseModel):
    employee_id: UUID
    assignment_id: Optional[UUID] = None
    work_date: str  # Format: YYYY-MM-DD
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    notes: Optional[str] = None


class TimesheetResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    employee_id: UUID
    employee_name: Optional[str] = None
    employee_role: Optional[str] = None
    assignment_id: Optional[UUID] = None
    work_date: str
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    total_hours: float
    overtime_hours: float
    status: str
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    source: Optional[str] = None  # MANUAL, AUTO_ORDER, IMPORT
    order_id: Optional[UUID] = None  # Link to order if auto-created
    order_code: Optional[str] = None  # Order code for display
    customer_name: Optional[str] = None  # Customer name from order
    event_location: Optional[str] = None  # Event location from order
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    # Time editing audit fields
    original_start: Optional[datetime] = None
    original_end: Optional[datetime] = None
    time_edited_by: Optional[UUID] = None
    time_edited_at: Optional[datetime] = None
    edit_reason: Optional[str] = None

    class Config:
        from_attributes = True


class TimesheetTimeEditRequest(BaseModel):
    """Request schema for editing timesheet check-in/check-out times"""
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    edit_reason: Optional[str] = None


class TimesheetSummary(BaseModel):
    employee_id: UUID
    employee_name: str
    total_days: int
    total_hours: float
    overtime_hours: float
    pending_count: int
    approved_count: int


# --- Timesheet Endpoints ---

@router.get("/timesheets")
async def list_timesheets(
    tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db),
    employee_id: Optional[UUID] = Query(None),
    start_date: Optional[str] = Query(None),  # YYYY-MM-DD
    end_date: Optional[str] = Query(None),    # YYYY-MM-DD
    status: Optional[str] = Query(None)
):
    """Get timesheets with filters, including order context"""
    await set_tenant_context(db, str(tenant_id))
    
    query = select(
        TimesheetModel,
        EmployeeModel.full_name,
        EmployeeModel.role_type,
        OrderModel.code,
        OrderModel.customer_name,
        OrderModel.event_address
    ).outerjoin(
        EmployeeModel, TimesheetModel.employee_id == EmployeeModel.id
    ).outerjoin(
        OrderModel, TimesheetModel.order_id == OrderModel.id
    ).where(
        TimesheetModel.tenant_id == tenant_id
    )
    
    if employee_id:
        query = query.where(TimesheetModel.employee_id == employee_id)
    if start_date:
        query = query.where(TimesheetModel.work_date >= date.fromisoformat(start_date))
    if end_date:
        query = query.where(TimesheetModel.work_date <= date.fromisoformat(end_date))
    if status:
        query = query.where(TimesheetModel.status == status)
    
    query = query.order_by(TimesheetModel.work_date.desc(), EmployeeModel.full_name)
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        TimesheetResponse(
            id=row[0].id,
            tenant_id=row[0].tenant_id,
            employee_id=row[0].employee_id,
            employee_name=row[1],
            employee_role=row[2],
            assignment_id=row[0].assignment_id,
            work_date=row[0].work_date.isoformat(),
            scheduled_start=row[0].scheduled_start,
            scheduled_end=row[0].scheduled_end,
            actual_start=row[0].actual_start,
            actual_end=row[0].actual_end,
            total_hours=float(row[0].total_hours or 0),
            overtime_hours=float(row[0].overtime_hours or 0),
            status=row[0].status or 'PENDING',
            approved_by=row[0].approved_by,
            approved_at=row[0].approved_at,
            source=row[0].source or 'MANUAL',
            order_id=row[0].order_id,
            order_code=row[3],
            customer_name=row[4],
            event_location=row[5],
            notes=row[0].notes,
            created_at=row[0].created_at,
            updated_at=row[0].updated_at
        )
        for row in rows
    ]


@router.get("/timesheets/today")
async def get_today_timesheets(tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Get all timesheets for today"""
    await set_tenant_context(db, str(tenant_id))
    today = date.today()
    
    query = select(
        TimesheetModel,
        EmployeeModel.full_name,
        EmployeeModel.role_type
    ).outerjoin(
        EmployeeModel, TimesheetModel.employee_id == EmployeeModel.id
    ).where(
        TimesheetModel.tenant_id == tenant_id,
        TimesheetModel.work_date == today
    ).order_by(EmployeeModel.full_name)
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        TimesheetResponse(
            id=row[0].id,
            tenant_id=row[0].tenant_id,
            employee_id=row[0].employee_id,
            employee_name=row[1],
            employee_role=row[2],
            assignment_id=row[0].assignment_id,
            work_date=row[0].work_date.isoformat(),
            scheduled_start=row[0].scheduled_start,
            scheduled_end=row[0].scheduled_end,
            actual_start=row[0].actual_start,
            actual_end=row[0].actual_end,
            total_hours=float(row[0].total_hours or 0),
            overtime_hours=float(row[0].overtime_hours or 0),
            status=row[0].status or 'PENDING',
            approved_by=row[0].approved_by,
            approved_at=row[0].approved_at,
            source=row[0].source or 'MANUAL',
            order_id=row[0].order_id,
            notes=row[0].notes,
            created_at=row[0].created_at,
            updated_at=row[0].updated_at
        )
        for row in rows
    ]


@router.post("/timesheets", response_model=TimesheetResponse)
async def create_timesheet(data: TimesheetCreate, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Create a new timesheet entry"""
    await set_tenant_context(db, str(tenant_id))
    
    # Verify employee exists
    emp_query = select(EmployeeModel).where(
        EmployeeModel.id == data.employee_id,
        EmployeeModel.tenant_id == tenant_id
    )
    emp_result = await db.execute(emp_query)
    employee = emp_result.scalar_one_or_none()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check if timesheet already exists for this date
    existing_query = select(TimesheetModel).where(
        TimesheetModel.tenant_id == tenant_id,
        TimesheetModel.employee_id == data.employee_id,
        TimesheetModel.work_date == date.fromisoformat(data.work_date)
    )
    existing_result = await db.execute(existing_query)
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Timesheet already exists for this date")
    
    timesheet = TimesheetModel(
        tenant_id=tenant_id,
        employee_id=data.employee_id,
        assignment_id=data.assignment_id,
        work_date=date.fromisoformat(data.work_date),
        scheduled_start=data.scheduled_start,
        scheduled_end=data.scheduled_end,
        notes=data.notes
    )
    
    db.add(timesheet)
    await db.commit()
    await db.refresh(timesheet)
    
    return TimesheetResponse(
        id=timesheet.id,
        tenant_id=timesheet.tenant_id,
        employee_id=timesheet.employee_id,
        employee_name=employee.full_name,
        employee_role=employee.role_type,
        assignment_id=timesheet.assignment_id,
        work_date=timesheet.work_date.isoformat(),
        scheduled_start=timesheet.scheduled_start,
        scheduled_end=timesheet.scheduled_end,
        actual_start=timesheet.actual_start,
        actual_end=timesheet.actual_end,
        total_hours=float(timesheet.total_hours or 0),
        overtime_hours=float(timesheet.overtime_hours or 0),
        status=timesheet.status or 'PENDING',
        approved_by=timesheet.approved_by,
        approved_at=timesheet.approved_at,
        source=timesheet.source or 'MANUAL',
        order_id=timesheet.order_id,
        notes=timesheet.notes,
        created_at=timesheet.created_at,
        updated_at=timesheet.updated_at,
        original_start=timesheet.original_start,
        original_end=timesheet.original_end,
        time_edited_by=timesheet.time_edited_by,
        time_edited_at=timesheet.time_edited_at,
        edit_reason=timesheet.edit_reason
    )


@router.patch("/timesheets/{timesheet_id}/time", response_model=TimesheetResponse)
async def edit_timesheet_time(
    timesheet_id: UUID,
    data: TimesheetTimeEditRequest,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Edit check-in/check-out times for a timesheet (HR Manager only)"""
    await set_tenant_context(db, str(tenant_id))
    
    # Fetch timesheet
    result = await db.execute(
        select(TimesheetModel).where(
            TimesheetModel.id == timesheet_id,
            TimesheetModel.tenant_id == tenant_id
        )
    )
    timesheet = result.scalar_one_or_none()
    
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    
    # Cannot edit approved entries
    if timesheet.status == 'APPROVED':
        raise HTTPException(status_code=400, detail="Cannot edit approved timesheet. Please unlock first.")
    
    # Save original times on first edit only
    if timesheet.original_start is None and timesheet.actual_start is not None:
        timesheet.original_start = timesheet.actual_start
    if timesheet.original_end is None and timesheet.actual_end is not None:
        timesheet.original_end = timesheet.actual_end
    
    # Update times
    if data.actual_start is not None:
        timesheet.actual_start = data.actual_start
    if data.actual_end is not None:
        timesheet.actual_end = data.actual_end
    
    # Validate: checkout must be after checkin
    if timesheet.actual_start and timesheet.actual_end:
        if timesheet.actual_end <= timesheet.actual_start:
            raise HTTPException(status_code=400, detail="Check-out time must be after check-in time")
        
        # Recalculate hours
        diff = timesheet.actual_end - timesheet.actual_start
        timesheet.total_hours = round(diff.total_seconds() / 3600, 2)
        # Simple overtime: hours over 8
        timesheet.overtime_hours = max(0, round(float(timesheet.total_hours) - 8, 2))
    
    # Set audit fields
    timesheet.time_edited_by = current_user.get("id") if isinstance(current_user, dict) else getattr(current_user, "id", None)
    timesheet.time_edited_at = datetime.now(timezone.utc)
    timesheet.edit_reason = data.edit_reason
    
    await db.commit()
    await db.refresh(timesheet)
    
    # Get employee info for response
    emp_result = await db.execute(
        select(EmployeeModel.full_name, EmployeeModel.role_type).where(
            EmployeeModel.id == timesheet.employee_id
        )
    )
    emp_row = emp_result.first()
    
    return TimesheetResponse(
        id=timesheet.id,
        tenant_id=timesheet.tenant_id,
        employee_id=timesheet.employee_id,
        employee_name=emp_row[0] if emp_row else None,
        employee_role=emp_row[1] if emp_row else None,
        assignment_id=timesheet.assignment_id,
        work_date=str(timesheet.work_date),
        scheduled_start=timesheet.scheduled_start,
        scheduled_end=timesheet.scheduled_end,
        actual_start=timesheet.actual_start,
        actual_end=timesheet.actual_end,
        total_hours=float(timesheet.total_hours or 0),
        overtime_hours=float(timesheet.overtime_hours or 0),
        status=timesheet.status or 'PENDING',
        approved_by=timesheet.approved_by,
        approved_at=timesheet.approved_at,
        source=timesheet.source or 'MANUAL',
        order_id=timesheet.order_id,
        notes=timesheet.notes,
        created_at=timesheet.created_at,
        updated_at=timesheet.updated_at,
        original_start=timesheet.original_start,
        original_end=timesheet.original_end,
        time_edited_by=timesheet.time_edited_by,
        time_edited_at=timesheet.time_edited_at,
        edit_reason=timesheet.edit_reason
    )


@router.post("/timesheets/{timesheet_id}/check-in")
async def check_in(timesheet_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Record check-in time for a timesheet"""
    await set_tenant_context(db, str(tenant_id))
    
    query = select(TimesheetModel).where(
        TimesheetModel.id == timesheet_id,
        TimesheetModel.tenant_id == tenant_id
    )
    result = await db.execute(query)
    timesheet = result.scalar_one_or_none()
    
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    
    if timesheet.actual_start:
        raise HTTPException(status_code=400, detail="Already checked in")
    
    # BUGFIX: BUG-20260204-002 - Use Vietnam timezone (UTC+7)
    timesheet.actual_start = datetime.now(VN_TIMEZONE)
    await db.commit()
    
    return {
        "message": "Checked in successfully",
        "check_in_time": timesheet.actual_start.isoformat()
    }


@router.post("/timesheets/{timesheet_id}/check-out")
async def check_out(timesheet_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Record check-out time and calculate hours
    
    BUGFIX: BUG-20260204-001
    Added try-catch for better error handling and debugging.
    """
    try:
        await set_tenant_context(db, str(tenant_id))
        
        query = select(TimesheetModel).where(
            TimesheetModel.id == timesheet_id,
            TimesheetModel.tenant_id == tenant_id
        )
        result = await db.execute(query)
        timesheet = result.scalar_one_or_none()
        
        if not timesheet:
            raise HTTPException(status_code=404, detail="Timesheet not found")
        
        if not timesheet.actual_start:
            raise HTTPException(status_code=400, detail="Must check in first")
        
        if timesheet.actual_end:
            raise HTTPException(status_code=400, detail="Already checked out")
        
        # BUGFIX: BUG-20260204-002 - Use Vietnam timezone (UTC+7) consistently
        timesheet.actual_end = datetime.now(VN_TIMEZONE)
        
        # Calculate hours worked - both datetimes are now timezone-aware
        # Ensure start_time is timezone-aware (convert if naive)
        start_time = timesheet.actual_start
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=VN_TIMEZONE)
        
        end_time = timesheet.actual_end
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=VN_TIMEZONE)
        
        time_diff = end_time - start_time
        hours_worked = time_diff.total_seconds() / 3600
        
        # Ensure Decimal is created properly
        timesheet.total_hours = Decimal(str(round(hours_worked, 2)))
        
        # Calculate overtime (if > 8 hours)
        if hours_worked > 8:
            timesheet.overtime_hours = Decimal(str(round(hours_worked - 8, 2)))
        else:
            timesheet.overtime_hours = Decimal("0.00")
        
        await db.commit()
        
        return {
            "message": "Checked out successfully",
            "check_out_time": timesheet.actual_end.isoformat(),
            "total_hours": float(timesheet.total_hours),
            "overtime_hours": float(timesheet.overtime_hours or 0)
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Check-out error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Check-out failed: {str(e)}")



@router.put("/timesheets/{timesheet_id}/approve")
async def approve_timesheet(
    timesheet_id: UUID,
    approved: bool = True,
    tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)
):
    """Approve or reject a timesheet"""
    await set_tenant_context(db, str(tenant_id))
    
    query = select(TimesheetModel).where(
        TimesheetModel.id == timesheet_id,
        TimesheetModel.tenant_id == tenant_id
    )
    result = await db.execute(query)
    timesheet = result.scalar_one_or_none()
    
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    
    timesheet.status = 'APPROVED' if approved else 'REJECTED'
    # BUGFIX: BUG-20260204-002 - Use Vietnam timezone (UTC+7)
    timesheet.approved_at = datetime.now(VN_TIMEZONE)
    # TODO: Set approved_by from auth context
    
    await db.commit()
    
    return {"message": f"Timesheet {'approved' if approved else 'rejected'}", "status": timesheet.status}


@router.get("/timesheets/report/monthly")
async def get_monthly_report(
    year: int,
    month: int,
    tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)
):
    """Get monthly timesheet summary by employee"""
    await set_tenant_context(db, str(tenant_id))
    
    # Calculate date range
    start_of_month = date(year, month, 1)
    if month == 12:
        end_of_month = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_of_month = date(year, month + 1, 1) - timedelta(days=1)
    
    # Aggregate query
    query = select(
        TimesheetModel.employee_id,
        EmployeeModel.full_name,
        func.count(TimesheetModel.id).label('total_days'),
        func.sum(TimesheetModel.total_hours).label('total_hours'),
        func.sum(TimesheetModel.overtime_hours).label('overtime_hours'),
        func.sum(func.case((TimesheetModel.status == 'PENDING', 1), else_=0)).label('pending_count'),
        func.sum(func.case((TimesheetModel.status == 'APPROVED', 1), else_=0)).label('approved_count')
    ).outerjoin(
        EmployeeModel, TimesheetModel.employee_id == EmployeeModel.id
    ).where(
        TimesheetModel.tenant_id == tenant_id,
        TimesheetModel.work_date >= start_of_month,
        TimesheetModel.work_date <= end_of_month
    ).group_by(
        TimesheetModel.employee_id, EmployeeModel.full_name
    ).order_by(EmployeeModel.full_name)
    
    result = await db.execute(query)
    rows = result.all()
    
    summary = [
        TimesheetSummary(
            employee_id=row[0],
            employee_name=row[1] or 'Unknown',
            total_days=row[2] or 0,
            total_hours=float(row[3] or 0),
            overtime_hours=float(row[4] or 0),
            pending_count=row[5] or 0,
            approved_count=row[6] or 0
        )
        for row in rows
    ]
    
    # Calculate totals
    total_hours = sum(s.total_hours for s in summary)
    total_overtime = sum(s.overtime_hours for s in summary)
    
    return {
        "year": year,
        "month": month,
        "period": f"{year}-{month:02d}",
        "employees": summary,
        "totals": {
            "total_employees": len(summary),
            "total_hours": round(total_hours, 2),
            "total_overtime": round(total_overtime, 2)
        }
    }


@router.get("/timesheets/report/daily")
async def get_daily_report(
    report_date: Optional[str] = None,  # YYYY-MM-DD, defaults to today
    tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)
):
    """Get daily attendance report"""
    await set_tenant_context(db, str(tenant_id))
    
    target_date = date.fromisoformat(report_date) if report_date else date.today()
    
    # Get all active employees
    emp_query = select(EmployeeModel).where(
        EmployeeModel.tenant_id == tenant_id,
        EmployeeModel.is_active == True
    ).order_by(EmployeeModel.full_name)
    
    emp_result = await db.execute(emp_query)
    all_employees = emp_result.scalars().all()
    
    # Get timesheets for the date
    ts_query = select(TimesheetModel).where(
        TimesheetModel.tenant_id == tenant_id,
        TimesheetModel.work_date == target_date
    )
    
    ts_result = await db.execute(ts_query)
    timesheets = {ts.employee_id: ts for ts in ts_result.scalars().all()}
    
    # Build report
    attendance = []
    for emp in all_employees:
        ts = timesheets.get(emp.id)
        attendance.append({
            "employee_id": str(emp.id),
            "employee_name": emp.full_name,
            "role_type": emp.role_type,
            "has_timesheet": ts is not None,
            "checked_in": ts.actual_start.isoformat() if ts and ts.actual_start else None,
            "checked_out": ts.actual_end.isoformat() if ts and ts.actual_end else None,
            "total_hours": float(ts.total_hours) if ts and ts.total_hours else 0,
            "status": ts.status if ts else 'NOT_SCHEDULED'
        })
    
    present = sum(1 for a in attendance if a['checked_in'])
    scheduled = sum(1 for a in attendance if a['has_timesheet'])
    
    return {
        "date": target_date.isoformat(),
        "attendance": attendance,
        "summary": {
            "total_employees": len(all_employees),
            "scheduled": scheduled,
            "present": present,
            "absent": scheduled - present
        }
    }


# ============================================
# PHASE 4: PAYROLL MANAGEMENT
# ============================================

from backend.modules.hr.domain.models import (
    PayrollPeriodModel, PayrollItemModel, 
    SalaryAdvanceModel, VietnamHolidayModel
)

# --- Payroll Schemas ---

class PayrollPeriodCreate(BaseModel):
    period_name: str  # "01/2026"
    start_date: str   # YYYY-MM-DD
    end_date: str     # YYYY-MM-DD
    notes: Optional[str] = None


class PayrollPeriodResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    period_name: str
    start_date: str
    end_date: str
    status: str
    total_employees: int
    total_gross: float
    total_deductions: float
    total_net: float
    calculated_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class PayrollItemResponse(BaseModel):
    id: UUID
    employee_id: UUID
    employee_name: str
    employee_role: str
    is_fulltime: bool
    regular_hours: float
    overtime_hours: float
    weekend_hours: float
    holiday_hours: float
    night_hours: float
    base_salary: float
    hourly_rate: float
    regular_pay: float
    overtime_pay: float
    weekend_pay: float
    holiday_pay: float
    night_pay: float
    allowance_meal: float
    allowance_transport: float
    bonus: float
    gross_salary: float
    deduction_social_ins: float
    deduction_advance: float
    total_deductions: float
    net_salary: float
    status: str


class SalaryAdvanceCreate(BaseModel):
    employee_id: UUID
    amount: float
    reason: Optional[str] = None


class SalaryAdvanceResponse(BaseModel):
    id: UUID
    employee_id: UUID
    employee_name: Optional[str] = None
    amount: float
    request_date: str
    reason: Optional[str] = None
    status: str
    approved_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# --- Payroll Period Endpoints ---

@router.post("/payroll/periods", response_model=PayrollPeriodResponse)
async def create_payroll_period(
    data: PayrollPeriodCreate,
    tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)
):
    """Create a new payroll period (monthly)"""
    await set_tenant_context(db, str(tenant_id))
    
    # Parse dates
    start = date.fromisoformat(data.start_date)
    end = date.fromisoformat(data.end_date)
    
    # Check for existing period
    existing_query = select(PayrollPeriodModel).where(
        PayrollPeriodModel.tenant_id == tenant_id,
        PayrollPeriodModel.period_name == data.period_name
    )
    existing = await db.execute(existing_query)
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Period {data.period_name} already exists")
    
    period = PayrollPeriodModel(
        tenant_id=tenant_id,
        period_name=data.period_name,
        start_date=start,
        end_date=end,
        notes=data.notes
    )
    
    db.add(period)
    await db.commit()
    await db.refresh(period)
    
    return _period_to_response(period)


@router.get("/payroll/periods", response_model=List[PayrollPeriodResponse])
async def list_payroll_periods(
    tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db),
    status: Optional[str] = Query(None),
    limit: int = Query(12, le=100)
):
    """List all payroll periods"""
    await set_tenant_context(db, str(tenant_id))
    
    query = select(PayrollPeriodModel).where(
        PayrollPeriodModel.tenant_id == tenant_id
    )
    
    if status:
        query = query.where(PayrollPeriodModel.status == status)
    
    query = query.order_by(PayrollPeriodModel.start_date.desc()).limit(limit)
    
    result = await db.execute(query)
    periods = result.scalars().all()
    
    return [_period_to_response(p) for p in periods]


@router.get("/payroll/periods/{period_id}", response_model=PayrollPeriodResponse)
async def get_payroll_period(period_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Get payroll period by ID"""
    await set_tenant_context(db, str(tenant_id))
    
    query = select(PayrollPeriodModel).where(
        PayrollPeriodModel.id == period_id,
        PayrollPeriodModel.tenant_id == tenant_id
    )
    result = await db.execute(query)
    period = result.scalar_one_or_none()
    
    if not period:
        raise HTTPException(status_code=404, detail="Payroll period not found")
    
    return _period_to_response(period)


@router.post("/payroll/periods/{period_id}/calculate")
async def calculate_payroll(period_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """
    Calculate payroll for all employees in the period.
    Uses Vietnam Labor Law rates:
    - Regular: 100%
    - Overtime (weekday): 150%
    - Weekend: 200%
    - Holiday: 300%
    - Night shift (22h-6h): +30%
    """
    import traceback
    try:
        await set_tenant_context(db, str(tenant_id))
        
        # Get payroll settings for this tenant
        settings_query = select(PayrollSettingsModel).where(PayrollSettingsModel.tenant_id == tenant_id)
        settings_result = await db.execute(settings_query)
        settings = settings_result.scalar_one_or_none()
        if not settings:
            # Create default settings
            settings = PayrollSettingsModel(tenant_id=tenant_id)
            db.add(settings)
            await db.flush()
        
        # Get period
        period_query = select(PayrollPeriodModel).where(
            PayrollPeriodModel.id == period_id,
            PayrollPeriodModel.tenant_id == tenant_id
        )
        period_result = await db.execute(period_query)
        period = period_result.scalar_one_or_none()
        
        if not period:
            raise HTTPException(status_code=404, detail="Payroll period not found")
        
        if period.status not in ['DRAFT', 'CALCULATED']:
            raise HTTPException(status_code=400, detail="Cannot recalculate approved/paid period")
        
        # Get all active employees
        emp_query = select(EmployeeModel).where(
            EmployeeModel.tenant_id == tenant_id,
            EmployeeModel.is_active == True
        )
        emp_result = await db.execute(emp_query)
        employees = emp_result.scalars().all()
        
        # Get holidays in this period
        holiday_query = select(VietnamHolidayModel.holiday_date).where(
            VietnamHolidayModel.tenant_id == tenant_id,
            VietnamHolidayModel.holiday_date >= period.start_date,
            VietnamHolidayModel.holiday_date <= period.end_date
        )
        holiday_result = await db.execute(holiday_query)
        holidays = set(row[0] for row in holiday_result.all())
        
        # Get pending salary advances
        advance_query = select(SalaryAdvanceModel).where(
            SalaryAdvanceModel.tenant_id == tenant_id,
            SalaryAdvanceModel.status == 'PAID',
            SalaryAdvanceModel.deducted_in_period == None
        )
        advance_result = await db.execute(advance_query)
        advances = {a.employee_id: a for a in advance_result.scalars().all()}
        
        # Delete existing items for recalculation
        from sqlalchemy import delete
        await db.execute(
            delete(PayrollItemModel).where(PayrollItemModel.period_id == period_id)
        )
        
        total_gross = Decimal(0)
        total_deductions = Decimal(0)
        total_net = Decimal(0)
        items_created = 0
        
        for emp in employees:
            # Get timesheets for this employee in the period
            ts_query = select(TimesheetModel).where(
                TimesheetModel.tenant_id == tenant_id,
                TimesheetModel.employee_id == emp.id,
                TimesheetModel.work_date >= period.start_date,
                TimesheetModel.work_date <= period.end_date,
                TimesheetModel.status == 'APPROVED'
            )
            ts_result = await db.execute(ts_query)
            timesheets = ts_result.scalars().all()
            
            # Calculate hours by type
            regular_hours = Decimal(0)
            overtime_hours = Decimal(0)
            weekend_hours = Decimal(0)
            holiday_hours = Decimal(0)
            night_hours = Decimal(0)
            
            for ts in timesheets:
                hours = Decimal(str(ts.total_hours or 0))
                work_date = ts.work_date
                
                if work_date in holidays:
                    holiday_hours += hours
                elif work_date.weekday() >= 5:  # Saturday=5, Sunday=6
                    weekend_hours += hours
                else:
                    if hours <= 8:
                        regular_hours += hours
                    else:
                        regular_hours += 8
                        overtime_hours += hours - 8
                
                # Night hours (simplified - assume from total_hours)
                night_hours += Decimal(str(ts.overtime_hours or 0)) * Decimal('0.1')
            
            # Get hourly rate - use employee's custom or calculate from salary
            hourly_rate = emp.hourly_rate or Decimal(0)
            if emp.is_fulltime and not hourly_rate:
                # Use employee's base_salary or tenant default from settings
                base = emp.base_salary if emp.base_salary else Decimal(str(settings.default_base_salary or 8000000))
                days_per_month = settings.standard_working_days_per_month or 26
                hours_per_day = settings.standard_hours_per_day or 8
                hourly_rate = base / days_per_month / hours_per_day
            
            # Calculate pay using configurable multipliers from settings
            regular_pay = regular_hours * hourly_rate
            overtime_pay = overtime_hours * hourly_rate * Decimal(str(settings.multiplier_overtime or 1.5))
            weekend_pay = weekend_hours * hourly_rate * Decimal(str(settings.multiplier_weekend or 2.0))
            holiday_pay = holiday_hours * hourly_rate * Decimal(str(settings.multiplier_holiday or 3.0))
            night_pay = night_hours * hourly_rate * Decimal(str(settings.multiplier_night or 0.3))
            
            # Allowances: Use employee-level if set, else tenant default (for fulltime employees)
            if emp.is_fulltime:
                allowance_meal = emp.allowance_meal if emp.allowance_meal is not None else Decimal(str(settings.default_allowance_meal or 0))
                allowance_transport = emp.allowance_transport if emp.allowance_transport is not None else Decimal(str(settings.default_allowance_transport or 0))
                allowance_phone = emp.allowance_phone if emp.allowance_phone is not None else Decimal(str(settings.default_allowance_phone or 0))
                allowance_other = emp.allowance_other if emp.allowance_other is not None else Decimal(0)
            else:
                allowance_meal = Decimal(0)
                allowance_transport = Decimal(0)
                allowance_phone = Decimal(0)
                allowance_other = Decimal(0)
            
            # Gross (including allowance_other)
            gross = (regular_pay + overtime_pay + weekend_pay + 
                     holiday_pay + night_pay + allowance_meal + allowance_transport + allowance_phone + allowance_other)
            
            # Insurance base: Use employee's insurance_salary_base if set, else use gross
            insurance_base = emp.insurance_salary_base if emp.insurance_salary_base is not None else gross
            
            # Deductions: Use employee rate override if set, else tenant default
            if emp.is_fulltime:
                social_rate = emp.rate_social_override if emp.rate_social_override is not None else Decimal(str(settings.rate_social_insurance or 0.08))
                health_rate = emp.rate_health_override if emp.rate_health_override is not None else Decimal(str(settings.rate_health_insurance or 0.015))
                unemployment_rate = emp.rate_unemployment_override if emp.rate_unemployment_override is not None else Decimal(str(settings.rate_unemployment or 0.01))
                
                social_ins = insurance_base * social_rate
                health_ins = insurance_base * health_rate
                unemployment = insurance_base * unemployment_rate
            else:
                social_ins = Decimal(0)
                health_ins = Decimal(0)
                unemployment = Decimal(0)
            
            # Check for advance to deduct
            advance_deduction = Decimal(0)
            if emp.id in advances:
                adv = advances[emp.id]
                advance_deduction = Decimal(str(adv.amount))
                adv.deducted_in_period = period_id
                adv.deducted_at = datetime.now()
                adv.status = 'DEDUCTED'
            
            total_ded = social_ins + health_ins + unemployment + advance_deduction
            net = gross - total_ded
            
            # Create payroll item
            # NOTE: gross_salary and total_deductions are GENERATED columns in DB,
            # so we don't set them here - Postgres calculates them automatically
            item = PayrollItemModel(
                tenant_id=tenant_id,
                period_id=period_id,
                employee_id=emp.id,
                regular_hours=regular_hours,
                overtime_hours=overtime_hours,
                weekend_hours=weekend_hours,
                holiday_hours=holiday_hours,
                night_hours=night_hours,
                base_salary=emp.base_salary if emp.base_salary else Decimal(str(settings.default_base_salary or 8000000)) if emp.is_fulltime else Decimal(0),
                hourly_rate=hourly_rate,
                regular_pay=regular_pay,
                overtime_pay=overtime_pay,
                weekend_pay=weekend_pay,
                holiday_pay=holiday_pay,
                night_pay=night_pay,
                allowance_meal=allowance_meal,
                allowance_transport=allowance_transport,
                # gross_salary - GENERATED column, calculated by DB
                deduction_social_ins=social_ins,
                deduction_advance=advance_deduction,
                # total_deductions - GENERATED column, calculated by DB
                net_salary=net
            )
            
            db.add(item)
            items_created += 1
            
            total_gross += gross
            total_deductions += total_ded
            total_net += net
        
        # Update period
        period.status = 'CALCULATED'
        period.calculated_at = datetime.now()
        period.total_employees = items_created
        period.total_gross = total_gross
        period.total_deductions = total_deductions
        period.total_net = total_net
        
        await db.commit()
        
        return {
            "message": f"Payroll calculated for {items_created} employees",
            "period_id": str(period_id),
            "total_gross": float(total_gross),
            "total_deductions": float(total_deductions),
            "total_net": float(total_net)
        }
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        # Log the actual error for debugging
        print(f"\n=== PAYROLL CALCULATE ERROR ===")
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Message: {e}")
        print(f"Traceback:")
        traceback.print_exc()
        print(f"=== END ERROR ===\n")
        raise HTTPException(
            status_code=500,
            detail=f"Payroll calculation failed: {type(e).__name__}: {str(e)}"
        )


@router.get("/payroll/periods/{period_id}/items", response_model=List[PayrollItemResponse])
async def get_payroll_items(period_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Get all payroll items for a period"""
    await set_tenant_context(db, str(tenant_id))
    
    query = select(
        PayrollItemModel,
        EmployeeModel.full_name,
        EmployeeModel.role_type,
        EmployeeModel.is_fulltime
    ).join(
        EmployeeModel, PayrollItemModel.employee_id == EmployeeModel.id
    ).where(
        PayrollItemModel.period_id == period_id,
        PayrollItemModel.tenant_id == tenant_id
    ).order_by(EmployeeModel.full_name)
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        PayrollItemResponse(
            id=row[0].id,
            employee_id=row[0].employee_id,
            employee_name=row[1],
            employee_role=row[2],
            is_fulltime=row[3],
            regular_hours=float(row[0].regular_hours or 0),
            overtime_hours=float(row[0].overtime_hours or 0),
            weekend_hours=float(row[0].weekend_hours or 0),
            holiday_hours=float(row[0].holiday_hours or 0),
            night_hours=float(row[0].night_hours or 0),
            base_salary=float(row[0].base_salary or 0),
            hourly_rate=float(row[0].hourly_rate or 0),
            regular_pay=float(row[0].regular_pay or 0),
            overtime_pay=float(row[0].overtime_pay or 0),
            weekend_pay=float(row[0].weekend_pay or 0),
            holiday_pay=float(row[0].holiday_pay or 0),
            night_pay=float(row[0].night_pay or 0),
            allowance_meal=float(row[0].allowance_meal or 0),
            allowance_transport=float(row[0].allowance_transport or 0),
            bonus=float(row[0].bonus or 0),
            gross_salary=float(row[0].gross_salary or 0),
            deduction_social_ins=float(row[0].deduction_social_ins or 0),
            deduction_advance=float(row[0].deduction_advance or 0),
            total_deductions=float(row[0].total_deductions or 0),
            net_salary=float(row[0].net_salary or 0),
            status=row[0].status or 'PENDING'
        )
        for row in rows
    ]


@router.post("/payroll/periods/{period_id}/approve")
async def approve_payroll(period_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Approve calculated payroll"""
    await set_tenant_context(db, str(tenant_id))
    
    query = select(PayrollPeriodModel).where(
        PayrollPeriodModel.id == period_id,
        PayrollPeriodModel.tenant_id == tenant_id
    )
    result = await db.execute(query)
    period = result.scalar_one_or_none()
    
    if not period:
        raise HTTPException(status_code=404, detail="Payroll period not found")
    
    if period.status != 'CALCULATED':
        raise HTTPException(status_code=400, detail="Can only approve calculated payroll")
    
    period.status = 'APPROVED'
    period.approved_at = datetime.now()
    
    await db.commit()
    
    # Sprint 17.2: Auto-create Journal Entry for payroll
    try:
        from backend.modules.finance.services.journal_service import JournalService
        journal_service = JournalService(db)
        await journal_service.create_journal_from_payroll(
            payroll_period_id=period_id,
            total_amount=period.total_net or Decimal(0),
            payment_method="TRANSFER",
            description=f"Chi lương kỳ {period.period_name}"
        )
    except Exception as e:
        # Log error but don't fail the approval
        print(f"Warning: Failed to create payroll journal entry: {e}")
    
    return {"message": "Payroll approved", "period_id": str(period_id)}


@router.post("/payroll/periods/{period_id}/pay")
async def pay_payroll(period_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Mark payroll as paid"""
    await set_tenant_context(db, str(tenant_id))
    
    query = select(PayrollPeriodModel).where(
        PayrollPeriodModel.id == period_id,
        PayrollPeriodModel.tenant_id == tenant_id
    )
    result = await db.execute(query)
    period = result.scalar_one_or_none()
    
    if not period:
        raise HTTPException(status_code=404, detail="Payroll period not found")
    
    if period.status != 'APPROVED':
        raise HTTPException(status_code=400, detail="Can only pay approved payroll")
    
    period.status = 'PAID'
    # Note: paid_at column may not exist yet, but we log the time
    
    await db.commit()
    
    return {"message": "Payroll paid successfully", "period_id": str(period_id), "total_net": float(period.total_net or 0)}


# --- Salary Advance Endpoints ---

@router.post("/payroll/advances", response_model=SalaryAdvanceResponse)
async def create_salary_advance(
    data: SalaryAdvanceCreate,
    tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)
):
    """Create salary advance request"""
    await set_tenant_context(db, str(tenant_id))
    
    # Verify employee
    emp_query = select(EmployeeModel).where(
        EmployeeModel.id == data.employee_id,
        EmployeeModel.tenant_id == tenant_id
    )
    emp_result = await db.execute(emp_query)
    employee = emp_result.scalar_one_or_none()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    advance = SalaryAdvanceModel(
        tenant_id=tenant_id,
        employee_id=data.employee_id,
        amount=Decimal(str(data.amount)),
        reason=data.reason
    )
    
    db.add(advance)
    await db.commit()
    await db.refresh(advance)
    
    return SalaryAdvanceResponse(
        id=advance.id,
        employee_id=advance.employee_id,
        employee_name=employee.full_name,
        amount=float(advance.amount),
        request_date=advance.request_date.isoformat(),
        reason=advance.reason,
        status=advance.status,
        approved_at=advance.approved_at,
        created_at=advance.created_at
    )


@router.get("/payroll/advances", response_model=List[SalaryAdvanceResponse])
async def list_salary_advances(
    tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db),
    employee_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None)
):
    """List salary advances"""
    await set_tenant_context(db, str(tenant_id))
    
    query = select(
        SalaryAdvanceModel,
        EmployeeModel.full_name
    ).join(
        EmployeeModel, SalaryAdvanceModel.employee_id == EmployeeModel.id
    ).where(
        SalaryAdvanceModel.tenant_id == tenant_id
    )
    
    if employee_id:
        query = query.where(SalaryAdvanceModel.employee_id == employee_id)
    if status:
        query = query.where(SalaryAdvanceModel.status == status)
    
    query = query.order_by(SalaryAdvanceModel.request_date.desc())
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        SalaryAdvanceResponse(
            id=row[0].id,
            employee_id=row[0].employee_id,
            employee_name=row[1],
            amount=float(row[0].amount),
            request_date=row[0].request_date.isoformat(),
            reason=row[0].reason,
            status=row[0].status,
            approved_at=row[0].approved_at,
            created_at=row[0].created_at
        )
        for row in rows
    ]


@router.put("/payroll/advances/{advance_id}/approve")
async def approve_salary_advance(advance_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Approve salary advance request"""
    await set_tenant_context(db, str(tenant_id))
    
    query = select(SalaryAdvanceModel).where(
        SalaryAdvanceModel.id == advance_id,
        SalaryAdvanceModel.tenant_id == tenant_id
    )
    result = await db.execute(query)
    advance = result.scalar_one_or_none()
    
    if not advance:
        raise HTTPException(status_code=404, detail="Advance request not found")
    
    if advance.status != 'PENDING':
        raise HTTPException(status_code=400, detail="Can only approve pending advances")
    
    advance.status = 'APPROVED'
    advance.approved_at = datetime.now()
    
    await db.commit()
    
    return {"message": "Advance approved", "id": str(advance_id)}


@router.put("/payroll/advances/{advance_id}/pay")
async def mark_advance_paid(advance_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Mark salary advance as paid"""
    await set_tenant_context(db, str(tenant_id))
    
    query = select(SalaryAdvanceModel).where(
        SalaryAdvanceModel.id == advance_id,
        SalaryAdvanceModel.tenant_id == tenant_id
    )
    result = await db.execute(query)
    advance = result.scalar_one_or_none()
    
    if not advance:
        raise HTTPException(status_code=404, detail="Advance request not found")
    
    if advance.status != 'APPROVED':
        raise HTTPException(status_code=400, detail="Can only pay approved advances")
    
    advance.status = 'PAID'
    advance.paid_at = datetime.now()
    
    await db.commit()
    
    return {"message": "Advance marked as paid", "id": str(advance_id)}


# --- Payroll Stats ---

@router.get("/payroll/stats")
async def get_payroll_stats(tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Get payroll statistics"""
    await set_tenant_context(db, str(tenant_id))
    
    # Get recent periods
    periods_query = select(PayrollPeriodModel).where(
        PayrollPeriodModel.tenant_id == tenant_id
    ).order_by(PayrollPeriodModel.start_date.desc()).limit(6)
    
    periods_result = await db.execute(periods_query)
    periods = periods_result.scalars().all()
    
    # Get pending advances
    advances_query = select(func.count(SalaryAdvanceModel.id)).where(
        SalaryAdvanceModel.tenant_id == tenant_id,
        SalaryAdvanceModel.status == 'PENDING'
    )
    advances_result = await db.execute(advances_query)
    pending_advances = advances_result.scalar() or 0
    
    return {
        "recent_periods": [
            {
                "id": str(p.id),
                "period_name": p.period_name,
                "status": p.status,
                "total_net": float(p.total_net or 0),
                "total_employees": int(p.total_employees or 0)
            }
            for p in periods
        ],
        "pending_advances": pending_advances
    }


# --- Helper Functions ---

def _period_to_response(p: PayrollPeriodModel) -> PayrollPeriodResponse:
    return PayrollPeriodResponse(
        id=p.id,
        tenant_id=p.tenant_id,
        period_name=p.period_name,
        start_date=p.start_date.isoformat(),
        end_date=p.end_date.isoformat(),
        status=p.status,
        total_employees=int(p.total_employees or 0),
        total_gross=float(p.total_gross or 0),
        total_deductions=float(p.total_deductions or 0),
        total_net=float(p.total_net or 0),
        calculated_at=p.calculated_at,
        approved_at=p.approved_at,
        notes=p.notes,
        created_at=p.created_at
    )


# ============================================
# PHASE 5: LEAVE MANAGEMENT
# ============================================

from backend.modules.hr.domain.models import (
    LeaveTypeModel, LeaveBalanceModel, LeaveRequestModel, LeaveApprovalHistoryModel, NotificationModel
)

# --- Leave Schemas ---

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


class LeaveRequestCreate(BaseModel):
    employee_id: UUID
    leave_type_code: str  # ANNUAL, SICK, PERSONAL...
    start_date: str       # YYYY-MM-DD
    end_date: str         # YYYY-MM-DD
    reason: Optional[str] = None


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
    approved_at: Optional[datetime] = None
    created_at: datetime


class LeaveBalanceResponse(BaseModel):
    leave_type_code: str
    leave_type_name: str
    entitled_days: float
    used_days: float
    pending_days: float
    remaining_days: float


# --- Leave Type Endpoints ---

@router.get("/leave/types", response_model=List[LeaveTypeResponse])
async def list_leave_types(tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Get all leave types"""
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
            id=t.id,
            code=t.code,
            name=t.name,
            days_per_year=float(t.days_per_year or 0),
            is_paid=t.is_paid,
            requires_approval=t.requires_approval,
            is_active=t.is_active
        )
        for t in types
    ]



# --- Leave Balance Endpoints ---

# ============================================
# EMPLOYEE SELF-SERVICE ENDPOINTS
# ============================================

@router.get("/leave/my-balances", response_model=List["LeaveBalanceResponse"])
async def get_my_leave_balances(
    year: int = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    [EMPLOYEE SELF-SERVICE]
    Get leave balances for the current logged-in user.
    No need to specify employee_id - uses the authenticated user's employee record.
    """
    await set_tenant_context(db, str(tenant_id))
    
    if not year:
        year = date.today().year
    
    # Get employee_id from current user
    user_query = select(EmployeeModel).where(
        EmployeeModel.tenant_id == tenant_id,
        or_(
            EmployeeModel.email == current_user.email,
            EmployeeModel.phone == current_user.email  # Fallback check
        )
    )
    user_result = await db.execute(user_query)
    employee = user_result.scalar_one_or_none()
    
    if not employee:
        raise HTTPException(
            status_code=404, 
            detail="Không tìm thấy hồ sơ nhân viên liên kết với tài khoản này"
        )
    
    # Reuse existing balance logic
    types_result = await db.execute(
        select(LeaveTypeModel).where(
            LeaveTypeModel.tenant_id == tenant_id,
            LeaveTypeModel.is_active == True
        )
    )
    leave_types = {t.id: t for t in types_result.scalars().all()}
    
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
                remaining_days=float((b.entitled_days or 0) + (b.carry_over_days or 0) - (b.used_days or 0) - (b.pending_days or 0))
            ))
        else:
            # Default balance from leave type
            result.append(LeaveBalanceResponse(
                leave_type_code=lt.code,
                leave_type_name=lt.name,
                entitled_days=float(lt.days_per_year or 0),
                used_days=0,
                pending_days=0,
                remaining_days=float(lt.days_per_year or 0)
            ))
    
    return result


@router.get("/leave/my-requests", response_model=List["LeaveRequestResponse"])
async def get_my_leave_requests(
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    [EMPLOYEE SELF-SERVICE]
    Get leave requests for the current logged-in user only.
    """
    await set_tenant_context(db, str(tenant_id))
    
    # Get employee_id from current user
    user_query = select(EmployeeModel).where(
        EmployeeModel.tenant_id == tenant_id,
        or_(
            EmployeeModel.email == current_user.email,
            EmployeeModel.phone == current_user.email
        )
    )
    user_result = await db.execute(user_query)
    employee = user_result.scalar_one_or_none()
    
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy hồ sơ nhân viên liên kết với tài khoản này"
        )
    
    # Query requests for this employee only
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
        LeaveRequestModel.employee_id == employee.id  # KEY: Only my requests
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
            created_at=row[0].created_at
        )
        for row in rows
    ]


# ============================================
# HR MANAGER ENDPOINTS (All Employees)
# ============================================

# Response schema for all-employee balances
class AllEmployeeLeaveBalanceResponse(BaseModel):
    id: UUID
    employee_id: UUID
    employee_name: str
    leave_type_code: str
    leave_type_name: str
    year: int
    total_days: float
    used_days: float
    pending_days: float
    remaining_days: float


@router.get("/leave/balances", response_model=List[AllEmployeeLeaveBalanceResponse])
async def list_all_leave_balances(
    year: int = Query(None),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Get leave balances for all employees"""
    await set_tenant_context(db, str(tenant_id))
    
    if not year:
        year = date.today().year
    
    # Query balances with joins
    query = select(
        LeaveBalanceModel,
        EmployeeModel.full_name,
        LeaveTypeModel.code,
        LeaveTypeModel.name
    ).join(
        EmployeeModel, LeaveBalanceModel.employee_id == EmployeeModel.id
    ).join(
        LeaveTypeModel, LeaveBalanceModel.leave_type_id == LeaveTypeModel.id
    ).where(
        LeaveBalanceModel.tenant_id == tenant_id,
        LeaveBalanceModel.year == year
    ).order_by(EmployeeModel.full_name, LeaveTypeModel.code)
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        AllEmployeeLeaveBalanceResponse(
            id=row[0].id,
            employee_id=row[0].employee_id,
            employee_name=row[1],
            leave_type_code=row[2],
            leave_type_name=row[3],
            year=row[0].year,
            total_days=float(row[0].entitled_days or 0),
            used_days=float(row[0].used_days or 0),
            pending_days=float(row[0].pending_days or 0),
            remaining_days=float(
                (row[0].entitled_days or 0) + 
                (row[0].carry_over_days or 0) - 
                (row[0].used_days or 0) - 
                (row[0].pending_days or 0)
            )
        )
        for row in rows
    ]


@router.get("/leave/balances/{employee_id}", response_model=List[LeaveBalanceResponse])
async def get_employee_leave_balance(
    employee_id: UUID,
    year: int = Query(None),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Get leave balances for an employee"""
    await set_tenant_context(db, str(tenant_id))
    
    if not year:
        year = date.today().year
    
    # Get all leave types
    types_result = await db.execute(
        select(LeaveTypeModel).where(
            LeaveTypeModel.tenant_id == tenant_id,
            LeaveTypeModel.is_active == True
        )
    )
    leave_types = {t.id: t for t in types_result.scalars().all()}
    
    # Get balances
    balances_result = await db.execute(
        select(LeaveBalanceModel).where(
            LeaveBalanceModel.tenant_id == tenant_id,
            LeaveBalanceModel.employee_id == employee_id,
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
                remaining_days=float((b.entitled_days or 0) + (b.carry_over_days or 0) - (b.used_days or 0) - (b.pending_days or 0))
            ))
        else:
            # Create default balance
            result.append(LeaveBalanceResponse(
                leave_type_code=lt.code,
                leave_type_name=lt.name,
                entitled_days=float(lt.days_per_year or 0),
                used_days=0,
                pending_days=0,
                remaining_days=float(lt.days_per_year or 0)
            ))
    
    return result


@router.post("/leave/balances/initialize/{year}")
async def initialize_leave_balances(
    year: int,
    tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)
):
    """Initialize leave balances for all fulltime employees for a year"""
    await set_tenant_context(db, str(tenant_id))
    
    # Get all fulltime employees
    emp_result = await db.execute(
        select(EmployeeModel).where(
            EmployeeModel.tenant_id == tenant_id,
            EmployeeModel.is_active == True,
            EmployeeModel.is_fulltime == True
        )
    )
    employees = emp_result.scalars().all()
    
    # Get all leave types
    types_result = await db.execute(
        select(LeaveTypeModel).where(
            LeaveTypeModel.tenant_id == tenant_id,
            LeaveTypeModel.is_active == True
        )
    )
    leave_types = types_result.scalars().all()
    
    created = 0
    for emp in employees:
        for lt in leave_types:
            # Check if already exists
            existing = await db.execute(
                select(LeaveBalanceModel).where(
                    LeaveBalanceModel.employee_id == emp.id,
                    LeaveBalanceModel.leave_type_id == lt.id,
                    LeaveBalanceModel.year == year
                )
            )
            if not existing.scalar_one_or_none():
                balance = LeaveBalanceModel(
                    tenant_id=tenant_id,
                    employee_id=emp.id,
                    leave_type_id=lt.id,
                    year=year,
                    entitled_days=lt.days_per_year,
                    used_days=0,
                    pending_days=0,
                    carry_over_days=0
                )
                db.add(balance)
                created += 1
    
    await db.commit()
    return {"message": f"Initialized {created} leave balances for {len(employees)} employees"}


# --- Leave Request Endpoints ---

@router.get("/leave/requests", response_model=List[LeaveRequestResponse])
async def list_leave_requests(
    tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db),
    employee_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200)
):
    """List leave requests"""
    await set_tenant_context(db, str(tenant_id))
    
    query = select(
        LeaveRequestModel,
        EmployeeModel.full_name,
        LeaveTypeModel.name
    ).join(
        EmployeeModel, LeaveRequestModel.employee_id == EmployeeModel.id
    ).join(
        LeaveTypeModel, LeaveRequestModel.leave_type_id == LeaveTypeModel.id
    ).where(
        LeaveRequestModel.tenant_id == tenant_id
    )
    
    if employee_id:
        query = query.where(LeaveRequestModel.employee_id == employee_id)
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
            created_at=row[0].created_at
        )
        for row in rows
    ]


@router.post("/leave/requests", response_model=LeaveRequestResponse)
async def create_leave_request(
    data: LeaveRequestCreate,
    tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)
):
    """Create a new leave request"""
    await set_tenant_context(db, str(tenant_id))
    
    # Get leave type
    type_result = await db.execute(
        select(LeaveTypeModel).where(
            LeaveTypeModel.tenant_id == tenant_id,
            LeaveTypeModel.code == data.leave_type_code
        )
    )
    leave_type = type_result.scalar_one_or_none()
    if not leave_type:
        raise HTTPException(status_code=400, detail=f"Leave type {data.leave_type_code} not found")
    
    # Get employee
    emp_result = await db.execute(
        select(EmployeeModel).where(
            EmployeeModel.id == data.employee_id,
            EmployeeModel.tenant_id == tenant_id
        )
    )
    employee = emp_result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Parse dates
    start = date.fromisoformat(data.start_date)
    end = date.fromisoformat(data.end_date)
    
    if end < start:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    
    # Calculate total days (excluding weekends)
    total_days = 0
    current = start
    while current <= end:
        if current.weekday() < 5:  # Mon-Fri
            total_days += 1
        current += timedelta(days=1)
    
    # Check balance
    year = start.year
    balance_result = await db.execute(
        select(LeaveBalanceModel).where(
            LeaveBalanceModel.employee_id == data.employee_id,
            LeaveBalanceModel.leave_type_id == leave_type.id,
            LeaveBalanceModel.year == year
        )
    )
    balance = balance_result.scalar_one_or_none()
    
    if balance:
        remaining = float((balance.entitled_days or 0) + (balance.carry_over_days or 0) - 
                         (balance.used_days or 0) - (balance.pending_days or 0))
        if total_days > remaining:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient balance. Remaining: {remaining}, Requested: {total_days}"
            )
    
    # Create request
    request = LeaveRequestModel(
        tenant_id=tenant_id,
        employee_id=data.employee_id,
        leave_type_id=leave_type.id,
        start_date=start,
        end_date=end,
        total_days=total_days,
        reason=data.reason,
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
        created_at=request.created_at
    )


@router.put("/leave/requests/{request_id}/approve")
async def approve_leave_request(
    request_id: UUID,
    comment: Optional[str] = Query(None, description="Approval comment"),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant), 
    db: AsyncSession = Depends(get_db)
):
    """
    Approve a pending leave request.
    Logs approval to history and updates balance.
    """
    await set_tenant_context(db, str(tenant_id))
    
    result = await db.execute(
        select(LeaveRequestModel).where(
            LeaveRequestModel.id == request_id,
            LeaveRequestModel.tenant_id == tenant_id
        )
    )
    request = result.scalar_one_or_none()
    
    if not request:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    if request.status != 'PENDING':
        raise HTTPException(status_code=400, detail="Can only approve pending requests")
    
    previous_status = request.status
    
    # Update request
    request.status = 'APPROVED'
    request.approved_at = datetime.now()
    request.approved_by = current_user.id
    
    # Update balance: move from pending to used
    balance_result = await db.execute(
        select(LeaveBalanceModel).where(
            LeaveBalanceModel.employee_id == request.employee_id,
            LeaveBalanceModel.leave_type_id == request.leave_type_id,
            LeaveBalanceModel.year == request.start_date.year
        )
    )
    balance = balance_result.scalar_one_or_none()
    
    if balance:
        balance.pending_days = max(0, (balance.pending_days or 0) - request.total_days)
        balance.used_days = (balance.used_days or 0) + request.total_days
    
    # Log to approval history
    history = LeaveApprovalHistoryModel(
        tenant_id=tenant_id,
        leave_request_id=request_id,
        action='APPROVED',
        action_by=current_user.id,
        action_by_name=current_user.full_name or current_user.email,
        comment=comment,
        previous_status=previous_status,
        new_status='APPROVED'
    )
    db.add(history)
    
    # Get employee info for notification
    emp_result = await db.execute(
        select(EmployeeModel).where(EmployeeModel.id == request.employee_id)
    )
    employee = emp_result.scalar_one_or_none()
    
    # Create notification for employee (P0: Preferences-aware)
    if employee and employee.email:
        from backend.core.auth.models import UserModel
        from backend.modules.notification.services.notification_service import create_notification_if_allowed
        user_result = await db.execute(
            select(UserModel).where(
                UserModel.email == employee.email,
                UserModel.tenant_id == tenant_id
            )
        )
        user = user_result.scalar_one_or_none()
        
        if user:
            await create_notification_if_allowed(
                db=db,
                tenant_id=tenant_id,
                user_id=user.id,
                notification_type='LEAVE_APPROVED',
                title="Đơn nghỉ phép được duyệt",
                message=f"Đơn nghỉ phép của bạn từ {request.start_date.strftime('%d/%m/%Y')} đến {request.end_date.strftime('%d/%m/%Y')} đã được duyệt bởi {current_user.full_name or current_user.email}",
                reference_type='leave_request',
                reference_id=request_id,
            )
    
    await db.commit()
    
    return {
        "message": "Leave request approved", 
        "id": str(request_id),
        "approved_by": current_user.full_name or current_user.email
    }


@router.put("/leave/requests/{request_id}/reject")
async def reject_leave_request(
    request_id: UUID,
    reason: str = Query(..., description="Rejection reason"),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Reject a pending leave request.
    Logs rejection to history and restores pending balance.
    """
    await set_tenant_context(db, str(tenant_id))
    
    result = await db.execute(
        select(LeaveRequestModel).where(
            LeaveRequestModel.id == request_id,
            LeaveRequestModel.tenant_id == tenant_id
        )
    )
    request = result.scalar_one_or_none()
    
    if not request:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    if request.status != 'PENDING':
        raise HTTPException(status_code=400, detail="Can only reject pending requests")
    
    previous_status = request.status
    
    request.status = 'REJECTED'
    request.rejection_reason = reason
    
    # Restore pending days in balance
    balance_result = await db.execute(
        select(LeaveBalanceModel).where(
            LeaveBalanceModel.employee_id == request.employee_id,
            LeaveBalanceModel.leave_type_id == request.leave_type_id,
            LeaveBalanceModel.year == request.start_date.year
        )
    )
    balance = balance_result.scalar_one_or_none()
    
    if balance:
        balance.pending_days = max(0, (balance.pending_days or 0) - request.total_days)
    
    # Log to approval history
    history = LeaveApprovalHistoryModel(
        tenant_id=tenant_id,
        leave_request_id=request_id,
        action='REJECTED',
        action_by=current_user.id,
        action_by_name=current_user.full_name or current_user.email,
        comment=reason,
        previous_status=previous_status,
        new_status='REJECTED'
    )
    db.add(history)
    
    # Get employee info for notification
    emp_result = await db.execute(
        select(EmployeeModel).where(EmployeeModel.id == request.employee_id)
    )
    employee = emp_result.scalar_one_or_none()
    
    # Create notification for employee (P0: Preferences-aware)
    if employee and employee.email:
        from backend.core.auth.models import UserModel
        from backend.modules.notification.services.notification_service import create_notification_if_allowed
        user_result = await db.execute(
            select(UserModel).where(
                UserModel.email == employee.email,
                UserModel.tenant_id == tenant_id
            )
        )
        user = user_result.scalar_one_or_none()
        
        if user:
            await create_notification_if_allowed(
                db=db,
                tenant_id=tenant_id,
                user_id=user.id,
                notification_type='LEAVE_REJECTED',
                title="Đơn nghỉ phép bị từ chối",
                message=f"Đơn nghỉ phép của bạn từ {request.start_date.strftime('%d/%m/%Y')} đến {request.end_date.strftime('%d/%m/%Y')} đã bị từ chối. Lý do: {reason}",
                reference_type='leave_request',
                reference_id=request_id,
            )
    
    await db.commit()
    
    return {
        "message": "Leave request rejected", 
        "id": str(request_id),
        "rejected_by": current_user.full_name or current_user.email
    }



# --- Approval History Endpoint ---

class ApprovalHistoryResponse(BaseModel):
    id: UUID
    action: str
    action_by_name: Optional[str]
    action_at: datetime
    comment: Optional[str]
    previous_status: Optional[str]
    new_status: str


@router.get("/leave/requests/{request_id}/history", response_model=List[ApprovalHistoryResponse])
async def get_leave_request_history(
    request_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Get approval history for a leave request"""
    await set_tenant_context(db, str(tenant_id))
    
    result = await db.execute(
        select(LeaveApprovalHistoryModel).where(
            LeaveApprovalHistoryModel.leave_request_id == request_id,
            LeaveApprovalHistoryModel.tenant_id == tenant_id
        ).order_by(LeaveApprovalHistoryModel.action_at.desc())
    )
    history = result.scalars().all()
    
    return [
        ApprovalHistoryResponse(
            id=h.id,
            action=h.action,
            action_by_name=h.action_by_name,
            action_at=h.action_at,
            comment=h.comment,
            previous_status=h.previous_status,
            new_status=h.new_status
        )
        for h in history
    ]


# --- Leave Stats ---

@router.get("/leave/stats")
async def get_leave_stats(tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Get leave statistics for dashboard"""
    await set_tenant_context(db, str(tenant_id))
    
    now = date.today()
    
    # Pending requests count
    pending_result = await db.execute(
        select(func.count(LeaveRequestModel.id)).where(
            LeaveRequestModel.tenant_id == tenant_id,
            LeaveRequestModel.status == 'PENDING'
        )
    )
    pending_count = pending_result.scalar() or 0
    
    # On leave today
    on_leave_result = await db.execute(
        select(func.count(LeaveRequestModel.id)).where(
            LeaveRequestModel.tenant_id == tenant_id,
            LeaveRequestModel.status == 'APPROVED',
            LeaveRequestModel.start_date <= now,
            LeaveRequestModel.end_date >= now
        )
    )
    on_leave_today = on_leave_result.scalar() or 0
    
    # Upcoming leaves (next 7 days)
    next_week = now + timedelta(days=7)
    upcoming_result = await db.execute(
        select(func.count(LeaveRequestModel.id)).where(
            LeaveRequestModel.tenant_id == tenant_id,
            LeaveRequestModel.status == 'APPROVED',
            LeaveRequestModel.start_date > now,
            LeaveRequestModel.start_date <= next_week
        )
    )
    upcoming_count = upcoming_result.scalar() or 0
    
    return {
        "pending_requests": pending_count,
        "on_leave_today": on_leave_today,
        "upcoming_leaves": upcoming_count
    }


# ============ CALENDAR INTEGRATION ============

@router.get("/calendar/events")
async def get_calendar_events(
    from_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    employee_id: Optional[UUID] = Query(None, description="Filter by employee"),
    event_types: Optional[str] = Query("all", description="Filter: all, leaves, shifts, timesheets"),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all HR calendar events within a date range.
    Combines: Leave requests, Staff assignments, Timesheets
    Useful for calendar view displaying employee availability.
    """
    from datetime import datetime as dt
    from sqlalchemy import cast, Date
    
    try:
        start_date = dt.strptime(from_date, "%Y-%m-%d").date()
        end_date = dt.strptime(to_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    events = []
    
    # 1. Leave Requests
    if event_types in ["all", "leaves"]:
        leave_query = (
            select(LeaveRequestModel, EmployeeModel, LeaveTypeModel)
            .join(EmployeeModel, LeaveRequestModel.employee_id == EmployeeModel.id)
            .join(LeaveTypeModel, LeaveRequestModel.leave_type_id == LeaveTypeModel.id)
            .where(
                LeaveRequestModel.tenant_id == tenant_id,
                LeaveRequestModel.status.in_(['PENDING', 'APPROVED']),
                LeaveRequestModel.start_date <= end_date,
                LeaveRequestModel.end_date >= start_date
            )
        )
        
        if employee_id:
            leave_query = leave_query.where(LeaveRequestModel.employee_id == employee_id)
        
        leave_result = await db.execute(leave_query)
        
        for row in leave_result.all():
            leave, emp, leave_type = row
            events.append({
                "id": str(leave.id),
                "type": "LEAVE",
                "title": f"{emp.full_name} - {leave_type.name}",
                "start_date": str(leave.start_date),
                "end_date": str(leave.end_date),
                "all_day": True,
                "employee_id": str(emp.id),
                "employee_name": emp.full_name,
                "status": leave.status,
                "color": "#EF4444" if leave.status == "APPROVED" else "#FCD34D",  # Red for approved, Yellow for pending
                "details": {
                    "leave_type": leave_type.name,
                    "total_days": float(leave.total_days),
                    "reason": leave.reason
                }
            })
    
    # 2. Staff Assignments (from Orders)
    if event_types in ["all", "shifts"]:
        from backend.modules.order.domain.models import OrderModel, OrderStaffAssignmentModel
        
        assignment_query = (
            select(OrderStaffAssignmentModel, OrderModel, EmployeeModel)
            .join(OrderModel, OrderStaffAssignmentModel.order_id == OrderModel.id)
            .outerjoin(EmployeeModel, OrderStaffAssignmentModel.staff_id == EmployeeModel.id)
            .where(
                OrderStaffAssignmentModel.tenant_id == tenant_id,
                OrderModel.status.in_(['PENDING', 'CONFIRMED', 'IN_PROGRESS']),
                cast(OrderModel.event_date, Date) >= start_date,
                cast(OrderModel.event_date, Date) <= end_date
            )
        )
        
        if employee_id:
            assignment_query = assignment_query.where(OrderStaffAssignmentModel.staff_id == employee_id)
        
        assignment_result = await db.execute(assignment_query)
        
        for row in assignment_result.all():
            assignment, order, emp = row
            emp_name = emp.full_name if emp else "Unknown"
            events.append({
                "id": str(assignment.id),
                "type": "SHIFT",
                "title": f"{emp_name} - {order.code}",
                "start_date": str(order.event_date.date()) if order.event_date else None,
                "end_date": str(order.event_date.date()) if order.event_date else None,
                "all_day": False,
                "start_time": order.event_time,
                "employee_id": str(assignment.staff_id),
                "employee_name": emp_name,
                "status": "CONFIRMED" if assignment.confirmed else "PENDING",
                "color": "#10B981",  # Green for shifts
                "details": {
                    "order_code": order.code,
                    "role": assignment.role,
                    "event_address": order.event_address,
                    "customer_name": order.customer_name
                }
            })
    
    # 3. Timesheets
    if event_types in ["all", "timesheets"]:
        timesheet_query = (
            select(TimesheetModel, EmployeeModel)
            .join(EmployeeModel, TimesheetModel.employee_id == EmployeeModel.id)
            .where(
                TimesheetModel.tenant_id == tenant_id,
                TimesheetModel.work_date >= start_date,
                TimesheetModel.work_date <= end_date
            )
        )
        
        if employee_id:
            timesheet_query = timesheet_query.where(TimesheetModel.employee_id == employee_id)
        
        timesheet_result = await db.execute(timesheet_query)
        
        for row in timesheet_result.all():
            ts, emp = row
            events.append({
                "id": str(ts.id),
                "type": "TIMESHEET",
                "title": f"{emp.full_name} - {float(ts.total_hours)}h",
                "start_date": str(ts.work_date),
                "end_date": str(ts.work_date),
                "all_day": True,
                "employee_id": str(emp.id),
                "employee_name": emp.full_name,
                "status": ts.status,
                "color": "#3B82F6",  # Blue for timesheets
                "details": {
                    "total_hours": float(ts.total_hours),
                    "overtime_hours": float(ts.overtime_hours or 0),
                    "actual_start": str(ts.actual_start) if ts.actual_start else None,
                    "actual_end": str(ts.actual_end) if ts.actual_end else None
                }
            })
    
    # Sort by start_date
    events.sort(key=lambda x: x["start_date"] or "")
    
    return {
        "from_date": from_date,
        "to_date": to_date,
        "total_events": len(events),
        "events": events,
        "summary": {
            "leaves": len([e for e in events if e["type"] == "LEAVE"]),
            "shifts": len([e for e in events if e["type"] == "SHIFT"]),
            "timesheets": len([e for e in events if e["type"] == "TIMESHEET"])
        }
    }


@router.get("/calendar/employee-availability")
async def get_employee_availability(
    date: str = Query(..., description="Date to check (YYYY-MM-DD)"),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Get availability status for all employees on a specific date.
    Useful for assignment planning.
    """
    from datetime import datetime as dt
    from sqlalchemy import cast, Date
    from backend.modules.order.domain.models import OrderModel, OrderStaffAssignmentModel
    
    try:
        check_date = dt.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Get all active employees
    emp_result = await db.execute(
        select(EmployeeModel).where(
            EmployeeModel.tenant_id == tenant_id,
            EmployeeModel.is_active == True
        )
    )
    employees = emp_result.scalars().all()
    
    availability = []
    
    for emp in employees:
        status = "AVAILABLE"
        conflicts = []
        
        # Check leaves
        leave_result = await db.execute(
            select(LeaveRequestModel, LeaveTypeModel)
            .join(LeaveTypeModel, LeaveRequestModel.leave_type_id == LeaveTypeModel.id)
            .where(
                LeaveRequestModel.employee_id == emp.id,
                LeaveRequestModel.status == 'APPROVED',
                LeaveRequestModel.start_date <= check_date,
                LeaveRequestModel.end_date >= check_date
            )
        )
        leave_row = leave_result.first()
        if leave_row:
            status = "ON_LEAVE"
            conflicts.append({
                "type": "LEAVE",
                "description": leave_row[1].name
            })
        
        # Check assignments
        assignment_result = await db.execute(
            select(OrderStaffAssignmentModel, OrderModel)
            .join(OrderModel, OrderStaffAssignmentModel.order_id == OrderModel.id)
            .where(
                OrderStaffAssignmentModel.staff_id == emp.id,
                OrderStaffAssignmentModel.tenant_id == tenant_id,
                OrderModel.status.in_(['PENDING', 'CONFIRMED', 'IN_PROGRESS']),
                cast(OrderModel.event_date, Date) == check_date
            )
        )
        assignments = assignment_result.all()
        
        if assignments and status != "ON_LEAVE":
            status = "ASSIGNED"
        
        for row in assignments:
            assignment, order = row
            conflicts.append({
                "type": "SHIFT",
                "description": f"{order.code} - {order.event_time or 'TBD'}"
            })
        
        availability.append({
            "employee_id": str(emp.id),
            "employee_name": emp.full_name,
            "role_type": emp.role_type,
            "status": status,
            "assignment_count": len([c for c in conflicts if c["type"] == "SHIFT"]),
            "conflicts": conflicts
        })
    
    # Sort by status priority
    status_order = {"AVAILABLE": 0, "ASSIGNED": 1, "ON_LEAVE": 2}
    availability.sort(key=lambda x: status_order.get(x["status"], 3))
    
    return {
        "date": date,
        "total_employees": len(availability),
        "available": len([e for e in availability if e["status"] == "AVAILABLE"]),
        "assigned": len([e for e in availability if e["status"] == "ASSIGNED"]),
        "on_leave": len([e for e in availability if e["status"] == "ON_LEAVE"]),
        "employees": availability
    }


# ============================================
# SPRINT 18.1: UNIFIED STAFF ASSIGNMENTS
# ============================================

@router.get("/unified-assignments")
async def get_unified_staff_assignments(
    staff_id: Optional[UUID] = Query(None, description="Filter by staff_id (users table)"),
    employee_id: Optional[UUID] = Query(None, description="Filter by employee_id (employees table)"),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Get unified view of staff assignments across Order and HR modules.
    Sprint 18.1: Single view of all assignments.
    """
    from backend.modules.hr.services.unified_staff_service import UnifiedStaffAssignmentService
    from datetime import date as date_type
    
    # Parse dates
    parsed_from = None
    parsed_to = None
    
    if date_from:
        try:
            parsed_from = date_type.fromisoformat(date_from)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format. Use YYYY-MM-DD")
    
    if date_to:
        try:
            parsed_to = date_type.fromisoformat(date_to)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_to format. Use YYYY-MM-DD")
    
    service = UnifiedStaffAssignmentService(db, tenant_id)
    assignments = await service.get_unified_assignments(
        staff_id=staff_id,
        employee_id=employee_id,
        date_from=parsed_from,
        date_to=parsed_to
    )
    
    return {
        "total": len(assignments),
        "assignments": assignments
    }


@router.get("/unified-conflicts/{staff_id}")
async def check_unified_conflicts(
    staff_id: UUID,
    check_date: str = Query(..., description="Date to check (YYYY-MM-DD)"),
    employee_id: Optional[UUID] = Query(None, description="Employee ID for HR conflicts"),
    exclude_order_id: Optional[UUID] = Query(None, description="Exclude this order from check"),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Check for assignment conflicts across Order and HR systems.
    Sprint 18.1: Unified conflict detection.
    """
    from backend.modules.hr.services.unified_staff_service import UnifiedStaffAssignmentService
    from datetime import date as date_type
    
    try:
        parsed_date = date_type.fromisoformat(check_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid check_date format. Use YYYY-MM-DD")
    
    service = UnifiedStaffAssignmentService(db, tenant_id)
    conflicts = await service.check_conflicts(
        staff_id=staff_id,
        employee_id=employee_id,
        check_date=parsed_date,
        exclude_order_id=exclude_order_id
    )
    
    return {
        "staff_id": str(staff_id),
        "check_date": check_date,
        "has_conflicts": len(conflicts) > 0,
        "conflict_count": len(conflicts),
        "conflicts": conflicts
    }


# ============ PAYROLL SETTINGS API ============

class PayrollSettingsResponse(BaseModel):
    """Response schema for payroll settings"""
    id: UUID
    tenant_id: UUID
    # Allowances
    default_allowance_meal: float
    default_allowance_transport: float
    default_allowance_phone: float
    default_allowance_other: float
    default_base_salary: float
    # Insurance rates
    rate_social_insurance: float
    rate_health_insurance: float
    rate_unemployment: float
    # Multipliers
    multiplier_overtime: float
    multiplier_weekend: float
    multiplier_holiday: float
    multiplier_night: float
    # Hours config
    standard_working_days_per_month: int
    standard_hours_per_day: int
    
    class Config:
        from_attributes = True


class PayrollSettingsUpdate(BaseModel):
    """Update schema for payroll settings"""
    # Allowances
    default_allowance_meal: Optional[float] = None
    default_allowance_transport: Optional[float] = None
    default_allowance_phone: Optional[float] = None
    default_allowance_other: Optional[float] = None
    default_base_salary: Optional[float] = None
    # Insurance rates (as decimal, e.g., 0.08 for 8%)
    rate_social_insurance: Optional[float] = None
    rate_health_insurance: Optional[float] = None
    rate_unemployment: Optional[float] = None
    # Multipliers
    multiplier_overtime: Optional[float] = None
    multiplier_weekend: Optional[float] = None
    multiplier_holiday: Optional[float] = None
    multiplier_night: Optional[float] = None
    # Hours config
    standard_working_days_per_month: Optional[int] = None
    standard_hours_per_day: Optional[int] = None


@router.get("/payroll/settings", response_model=PayrollSettingsResponse)
async def get_payroll_settings(
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Get tenant-level payroll configuration.
    Returns allowances, insurance rates, overtime multipliers.
    """
    await set_tenant_context(db, str(tenant_id))
    
    query = select(PayrollSettingsModel).where(PayrollSettingsModel.tenant_id == tenant_id)
    result = await db.execute(query)
    settings = result.scalar_one_or_none()
    
    if not settings:
        # Create default settings if not exist
        settings = PayrollSettingsModel(tenant_id=tenant_id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    
    return PayrollSettingsResponse(
        id=settings.id,
        tenant_id=settings.tenant_id,
        default_allowance_meal=float(settings.default_allowance_meal or 0),
        default_allowance_transport=float(settings.default_allowance_transport or 0),
        default_allowance_phone=float(settings.default_allowance_phone or 0),
        default_allowance_other=float(settings.default_allowance_other or 0),
        default_base_salary=float(settings.default_base_salary or 0),
        rate_social_insurance=float(settings.rate_social_insurance or 0),
        rate_health_insurance=float(settings.rate_health_insurance or 0),
        rate_unemployment=float(settings.rate_unemployment or 0),
        multiplier_overtime=float(settings.multiplier_overtime or 0),
        multiplier_weekend=float(settings.multiplier_weekend or 0),
        multiplier_holiday=float(settings.multiplier_holiday or 0),
        multiplier_night=float(settings.multiplier_night or 0),
        standard_working_days_per_month=int(settings.standard_working_days_per_month or 26),
        standard_hours_per_day=int(settings.standard_hours_per_day or 8)
    )


@router.put("/payroll/settings", response_model=PayrollSettingsResponse)
async def update_payroll_settings(
    payload: PayrollSettingsUpdate,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Update tenant-level payroll configuration.
    Allows customization of allowances, insurance rates, overtime multipliers.
    """
    await set_tenant_context(db, str(tenant_id))
    
    query = select(PayrollSettingsModel).where(PayrollSettingsModel.tenant_id == tenant_id)
    result = await db.execute(query)
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = PayrollSettingsModel(tenant_id=tenant_id)
        db.add(settings)
    
    # Update only provided fields
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(settings, field, Decimal(str(value)) if isinstance(value, float) else value)
    
    await db.commit()
    await db.refresh(settings)
    
    return PayrollSettingsResponse(
        id=settings.id,
        tenant_id=settings.tenant_id,
        default_allowance_meal=float(settings.default_allowance_meal or 0),
        default_allowance_transport=float(settings.default_allowance_transport or 0),
        default_allowance_phone=float(settings.default_allowance_phone or 0),
        default_allowance_other=float(settings.default_allowance_other or 0),
        default_base_salary=float(settings.default_base_salary or 0),
        rate_social_insurance=float(settings.rate_social_insurance or 0),
        rate_health_insurance=float(settings.rate_health_insurance or 0),
        rate_unemployment=float(settings.rate_unemployment or 0),
        multiplier_overtime=float(settings.multiplier_overtime or 0),
        multiplier_weekend=float(settings.multiplier_weekend or 0),
        multiplier_holiday=float(settings.multiplier_holiday or 0),
        multiplier_night=float(settings.multiplier_night or 0),
        standard_working_days_per_month=int(settings.standard_working_days_per_month or 26),
        standard_hours_per_day=int(settings.standard_hours_per_day or 8)
    )


# ============================================
# PAYROLL ITEM UPDATE (Bonus/Notes Editing)
# ============================================

class PayrollItemUpdate(BaseModel):
    """For updating bonus and notes on payroll items"""
    bonus: Optional[float] = None
    notes: Optional[str] = None


class PayrollItemUpdateResponse(BaseModel):
    """Response for payroll item update (simplified, just confirmation fields)"""
    id: UUID
    employee_id: UUID
    employee_name: str
    bonus: float
    notes: Optional[str]
    gross_salary: float
    net_salary: float


@router.patch("/payroll-item/{item_id}", response_model=PayrollItemUpdateResponse)
async def update_payroll_item(
    item_id: UUID,
    payload: PayrollItemUpdate,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Update bonus and notes for a payroll item.
    This allows managers to adjust bonuses before approval.
    """
    await set_tenant_context(db, str(tenant_id))
    
    # Get the payroll item (PayrollItemModel imported at top of file)
    query = select(PayrollItemModel).where(
        PayrollItemModel.id == item_id,
        PayrollItemModel.tenant_id == tenant_id
    )
    result = await db.execute(query)
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Payroll item not found")
    
    # Check period status - only allow edits on DRAFT or CALCULATED
    period_query = select(PayrollPeriodModel).where(PayrollPeriodModel.id == item.period_id)
    period_result = await db.execute(period_query)
    period = period_result.scalar_one_or_none()
    
    if period and period.status not in ('DRAFT', 'CALCULATED'):
        raise HTTPException(status_code=400, detail="Cannot edit payroll items in approved/paid periods")
    
    # Update fields
    if payload.bonus is not None:
        item.bonus = Decimal(str(payload.bonus))
    if payload.notes is not None:
        item.notes = payload.notes
    
    # Recalculate net_salary (gross_salary is GENERATED column, will auto-update)
    # For now, we calculate it manually since we update bonus
    await db.commit()
    await db.refresh(item)
    
    # Get employee name
    emp_query = select(EmployeeModel).where(EmployeeModel.id == item.employee_id)
    emp_result = await db.execute(emp_query)
    emp = emp_result.scalar_one_or_none()
    
    return PayrollItemUpdateResponse(
        id=item.id,
        employee_id=item.employee_id,
        employee_name=emp.full_name if emp else "Unknown",
        bonus=float(item.bonus or 0),
        notes=item.notes,
        gross_salary=float(item.gross_salary or 0),
        net_salary=float(item.net_salary or 0)
    )


# ============================================
# PHASE 6: IN-APP NOTIFICATIONS
# ============================================

# --- Notification Schemas ---

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


@router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Get notifications for the current user"""
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


@router.get("/notifications/count")
async def get_unread_count(
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Get unread notification count for the current user"""
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


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Mark a notification as read"""
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


@router.put("/notifications/read-all")
async def mark_all_notifications_read(
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Mark all notifications as read for the current user"""
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
