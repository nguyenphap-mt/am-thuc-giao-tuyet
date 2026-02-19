"""
HTTP Router for Order Module
Database: PostgreSQL (catering_db)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, Integer
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


from backend.core.database import get_db
from backend.core.dependencies import get_current_tenant, CurrentTenant
from backend.modules.order.domain.models import OrderModel, OrderItemModel, OrderPaymentModel, OrderStaffAssignmentModel
from backend.modules.order.domain.entities import (
    Order, OrderBase, OrderItem, OrderItemBase,
    OrderPayment, OrderPaymentBase, OrderStats, PaginatedOrderResponse
)
from backend.modules.crm.application.services import CrmIntegrationService
from backend.modules.crm.application.loyalty_service import LoyaltyService

router = APIRouter(tags=["Order Management"])


# ============ MY ACTIVE ORDERS (Field Expense Feature) ============

@router.get("/my-active")
async def get_my_active_orders(
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Get today's active orders for expense linking.
    Returns orders with status CONFIRMED/IN_PROGRESS that have event_date = today.
    Used by Quick Expense modal to suggest Order for field expenses.
    """
    from datetime import date
    
    today = date.today()
    
    # Query orders: today's events with active status
    query = (
        select(OrderModel)
        .where(
            OrderModel.tenant_id == tenant_id,
            OrderModel.status.in_(['CONFIRMED', 'IN_PROGRESS']),
            func.date(OrderModel.event_date) == today
        )
        .order_by(OrderModel.event_date.asc())
        .limit(10)
    )
    
    result = await db.execute(query)
    orders = result.scalars().all()
    
    return [
        {
            "id": str(o.id),
            "code": o.code,
            "customer_name": o.customer_name,
            "event_date": o.event_date.isoformat() if o.event_date else None,
            "event_location": o.event_address
        }
        for o in orders
    ]


# ============ ORDER DIRECT EXPENSES (PRD-quick-expense-research 4.3) ============

from pydantic import BaseModel

class OrderExpenseCreate(BaseModel):
    """Schema for creating order expense"""
    category: str  # NGUYENLIEU, NHANCONG, THUEMUON, VANHANH, KHAC
    amount: Decimal
    description: Optional[str] = None


class OrderExpenseResponse(BaseModel):
    """Schema for order expense response"""
    id: str
    order_id: str
    category: str
    amount: Decimal
    description: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


EXPENSE_CATEGORY_LABELS = {
    "NGUYENLIEU": "🥩 Nguyên liệu",
    "NHANCONG": "👷 Nhân công", 
    "THUEMUON": "🪑 Thuê mướn",
    "VANHANH": "🚗 Vận hành",
    "KHAC": "📦 Khác"
}


@router.get("/{order_id}/expenses", response_model=List[OrderExpenseResponse])
async def get_order_expenses(
    order_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all direct expenses linked to an order.
    PRD-quick-expense-research Section 4.3
    """
    from backend.modules.finance.domain.models import FinanceTransactionModel
    
    # Verify order belongs to tenant
    order_result = await db.execute(
        select(OrderModel).where(
            OrderModel.id == order_id,
            OrderModel.tenant_id == tenant_id
        )
    )
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get expenses linked to this order
    result = await db.execute(
        select(FinanceTransactionModel)
        .where(
            FinanceTransactionModel.tenant_id == tenant_id,
            FinanceTransactionModel.reference_id == order_id,
            FinanceTransactionModel.reference_type == "ORDER",
            FinanceTransactionModel.type == "PAYMENT"  # Expenses are payments
        )
        .order_by(FinanceTransactionModel.created_at.desc())
    )
    expenses = result.scalars().all()
    
    return [
        OrderExpenseResponse(
            id=str(e.id),
            order_id=str(order_id),
            category=e.category,
            amount=e.amount,
            description=e.description,
            created_at=e.created_at
        )
        for e in expenses
    ]


@router.post("/{order_id}/expenses", response_model=OrderExpenseResponse)
async def add_order_expense(
    order_id: UUID,
    data: OrderExpenseCreate,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Add a direct expense to an order.
    PRD-quick-expense-research Section 4.3
    Auto-updates order.expenses_amount (R1 from Order-Finance integration)
    """
    from backend.modules.finance.domain.models import FinanceTransactionModel
    import random
    
    # Verify order belongs to tenant
    order_result = await db.execute(
        select(OrderModel).where(
            OrderModel.id == order_id,
            OrderModel.tenant_id == tenant_id
        )
    )
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Generate transaction code
    now = datetime.now()
    random_suffix = random.randint(1000, 9999)
    code = f"CHI-ORD-{now.strftime('%Y%m')}-{random_suffix}"
    
    # Create finance transaction linked to order
    new_expense = FinanceTransactionModel(
        tenant_id=tenant_id,
        code=code,
        type="PAYMENT",  # Expense = Payment out
        category=data.category,
        amount=data.amount,
        payment_method="TRANSFER",  # Default
        description=data.description or f"Chi phí trực tiếp cho {order.code}",
        transaction_date=now,
        reference_id=order_id,
        reference_type="ORDER"
    )
    
    db.add(new_expense)
    
    # Auto-update order.expenses_amount (R1)
    current_expenses = order.expenses_amount or Decimal(0)
    order.expenses_amount = current_expenses + data.amount
    logger.info(f"Updated order {order.code} expenses_amount to {order.expenses_amount}")
    
    await db.commit()
    await db.refresh(new_expense)
    
    return OrderExpenseResponse(
        id=str(new_expense.id),
        order_id=str(order_id),
        category=new_expense.category,
        amount=new_expense.amount,
        description=new_expense.description,
        created_at=new_expense.created_at
    )


# ============ ORDER STAFF COST TRACKING (P3) ============

class StaffCostItem(BaseModel):
    """Schema for individual staff cost"""
    employee_id: str
    employee_name: str
    role: str
    is_fulltime: bool
    hourly_rate: float
    planned_hours: float
    actual_hours: float
    cost: float
    status: str


class OrderStaffCostsResponse(BaseModel):
    """Schema for order staff costs response"""
    order_id: str
    order_code: str
    total_staff_cost: float
    total_planned_hours: float
    total_actual_hours: float
    staff_count: int
    assignments: List[StaffCostItem]


@router.get("/{order_id}/staff-costs", response_model=OrderStaffCostsResponse)
async def get_order_staff_costs(
    order_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Get staff costs breakdown for an order.
    Calculates cost from StaffAssignments linked via event_id with employee hourly_rate.
    
    Cost calculation:
    - If actual_hours available (from timesheet or check_in/out): hourly_rate × actual_hours
    - Otherwise: hourly_rate × planned_hours (from start_time/end_time)
    
    BUGFIX: BUG-20260205-002 - Now also checks timesheets for actual hours when available
    """
    from backend.modules.hr.domain.models import StaffAssignmentModel, EmployeeModel, TimesheetModel
    
    # Verify order belongs to tenant
    order_result = await db.execute(
        select(OrderModel).where(
            OrderModel.id == order_id,
            OrderModel.tenant_id == tenant_id
        )
    )
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get staff assignments for this order
    # Strategy: Try StaffAssignmentModel (HR) first, fallback to OrderStaffAssignmentModel
    query = (
        select(StaffAssignmentModel, EmployeeModel)
        .join(EmployeeModel, StaffAssignmentModel.employee_id == EmployeeModel.id)
        .where(
            StaffAssignmentModel.event_id == order_id,
            StaffAssignmentModel.tenant_id == tenant_id,
            StaffAssignmentModel.status != 'CANCELLED'
        )
    )
    result = await db.execute(query)
    rows = result.all()
    
    # BUGFIX: If no HR assignments found, check OrderStaffAssignmentModel (direct order assignment)
    if not rows:
        order_staff_query = (
            select(OrderStaffAssignmentModel, EmployeeModel)
            .outerjoin(EmployeeModel, OrderStaffAssignmentModel.staff_id == EmployeeModel.id)
            .where(
                OrderStaffAssignmentModel.order_id == order_id,
                OrderStaffAssignmentModel.tenant_id == tenant_id
            )
        )
        order_result = await db.execute(order_staff_query)
        order_rows = order_result.all()
        
        # Convert to compatible format for processing
        rows = []
        for order_assign, employee in order_rows:
            # Create a mock assignment object with compatible attributes
            class MockAssignment:
                def __init__(self, oa):
                    self.start_time = None
                    self.end_time = None
                    self.check_in_time = None
                    self.check_out_time = None
                    self.role = oa.role
                    self.status = 'CONFIRMED' if oa.confirmed else 'ASSIGNED'
            rows.append((MockAssignment(order_assign), employee))
    
    # Fetch timesheets for this order to get actual hours from auto-created entries
    timesheet_query = select(TimesheetModel).where(
        TimesheetModel.order_id == order_id,
        TimesheetModel.tenant_id == tenant_id
    )
    timesheet_result = await db.execute(timesheet_query)
    timesheets = {ts.employee_id: ts for ts in timesheet_result.scalars().all()}
    
    assignments = []
    total_cost = 0.0
    total_planned_hours = 0.0
    total_actual_hours = 0.0
    
    for assignment, employee in rows:
        if employee is None:
            continue  # Skip if employee not found
            
        # Calculate planned hours from start_time/end_time
        planned_hours = 0.0
        if hasattr(assignment, 'start_time') and assignment.start_time and assignment.end_time:
            diff = assignment.end_time - assignment.start_time
            planned_hours = diff.total_seconds() / 3600  # Convert to hours
        
        # If no planned hours from assignment, check timesheet for default 8h
        if planned_hours == 0 and employee.id in timesheets:
            planned_hours = 8.0  # Default from auto-timesheet
        
        # Calculate actual hours: Priority order
        # 1. From check_in/check_out (employee actually checked in/out)
        # 2. From timesheet (auto-created when order completed)
        # 3. Default to 0 (not worked yet)
        actual_hours = 0.0
        if hasattr(assignment, 'check_in_time') and assignment.check_in_time and assignment.check_out_time:
            diff = assignment.check_out_time - assignment.check_in_time
            actual_hours = diff.total_seconds() / 3600
        elif employee.id in timesheets:
            # BUGFIX: Use timesheet hours if auto-created from order completion
            ts = timesheets[employee.id]
            actual_hours = float(ts.total_hours or 0)
        
        # Use actual hours if available, otherwise planned
        billable_hours = actual_hours if actual_hours > 0 else planned_hours
        
        # Fulltime employees use base_salary prorated, part-time use hourly_rate
        hourly_rate = float(employee.hourly_rate or 0)
        if employee.is_fulltime and employee.base_salary:
            # Convert monthly to hourly (assuming 22 working days, 8 hours/day)
            hourly_rate = float(employee.base_salary) / (22 * 8)
        
        cost = hourly_rate * billable_hours
        
        assignments.append(StaffCostItem(
            employee_id=str(employee.id),
            employee_name=employee.full_name,
            role=getattr(assignment, 'role', None) or employee.role_type or "STAFF",
            is_fulltime=employee.is_fulltime,
            hourly_rate=hourly_rate,
            planned_hours=round(planned_hours, 2),
            actual_hours=round(actual_hours, 2),
            cost=round(cost, 0),
            status=getattr(assignment, 'status', 'ASSIGNED')
        ))
        
        total_cost += cost
        total_planned_hours += planned_hours
        total_actual_hours += actual_hours
    
    return OrderStaffCostsResponse(
        order_id=str(order_id),
        order_code=order.code,
        total_staff_cost=round(total_cost, 0),
        total_planned_hours=round(total_planned_hours, 2),
        total_actual_hours=round(total_actual_hours, 2),
        staff_count=len(assignments),
        assignments=assignments
    )


# ============ ORDER STAFF AUTO-ASSIGN (GAP-M3) ============

class StaffSuggestion(BaseModel):
    """Schema for staff suggestion item"""
    employee_id: str
    employee_name: str
    role_type: str
    phone: Optional[str]
    is_fulltime: bool
    hourly_rate: float
    current_workload: int  # Count of assignments this week
    is_available: bool  # No conflict for this order's date
    score: int  # Ranking score (higher = better match)
    conflict_reason: Optional[str] = None


class SuggestStaffResponse(BaseModel):
    """Response schema for suggest staff endpoint"""
    order_id: str
    order_code: str
    event_date: Optional[str]
    required_roles: List[str]
    suggestions: List[StaffSuggestion]
    total_available: int


@router.get("/{order_id}/suggest-staff", response_model=SuggestStaffResponse)
async def suggest_staff_for_order(
    order_id: UUID,
    role_filter: Optional[str] = Query(None, description="Filter by role: CHEF, WAITER, CAPTAIN, etc."),
    limit: int = Query(10, ge=1, le=50, description="Max suggestions to return"),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Suggest available staff for an order based on:
    1. Role match (if specified)
    2. Availability (no conflict with order date)
    3. Workload balance (prefer less busy employees)
    4. Performance (prioritize fulltime, active)
    
    GAP-M3: Order Staff Auto-Assign feature
    """
    from backend.modules.hr.domain.models import EmployeeModel, StaffAssignmentModel
    from datetime import timedelta
    
    # Verify order exists
    order_result = await db.execute(
        select(OrderModel).where(
            OrderModel.id == order_id,
            OrderModel.tenant_id == tenant_id
        )
    )
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get order event date for conflict checking
    event_date = order.event_date
    
    # Query all active employees
    emp_query = select(EmployeeModel).where(
        EmployeeModel.tenant_id == tenant_id,
        EmployeeModel.is_active == True
    )
    
    if role_filter:
        emp_query = emp_query.where(EmployeeModel.role_type == role_filter)
    
    emp_result = await db.execute(emp_query)
    employees = emp_result.scalars().all()
    
    # Get already assigned staff for this order
    assigned_query = select(StaffAssignmentModel.employee_id).where(
        StaffAssignmentModel.event_id == order_id,
        StaffAssignmentModel.tenant_id == tenant_id,
        StaffAssignmentModel.status != 'CANCELLED'
    )
    assigned_result = await db.execute(assigned_query)
    already_assigned = {row[0] for row in assigned_result.all()}
    
    # Calculate workload for each employee (assignments this week)
    week_start = datetime.now() - timedelta(days=7)
    workload_query = (
        select(
            StaffAssignmentModel.employee_id,
            func.count(StaffAssignmentModel.id).label('count')
        )
        .where(
            StaffAssignmentModel.tenant_id == tenant_id,
            StaffAssignmentModel.created_at >= week_start,
            StaffAssignmentModel.status != 'CANCELLED'
        )
        .group_by(StaffAssignmentModel.employee_id)
    )
    workload_result = await db.execute(workload_query)
    workload_map = {row[0]: row[1] for row in workload_result.all()}
    
    # Check conflicts (same date assignments)
    conflict_query = (
        select(
            StaffAssignmentModel.employee_id,
            StaffAssignmentModel.event_id
        )
        .join(OrderModel, StaffAssignmentModel.event_id == OrderModel.id)
        .where(
            StaffAssignmentModel.tenant_id == tenant_id,
            StaffAssignmentModel.status != 'CANCELLED',
            func.date(OrderModel.event_date) == func.date(event_date) if event_date else False
        )
    )
    conflict_result = await db.execute(conflict_query)
    conflicts = {row[0] for row in conflict_result.all()}
    
    suggestions = []
    required_roles = set()
    
    for emp in employees:
        # Skip already assigned to this order
        if emp.id in already_assigned:
            continue
        
        required_roles.add(emp.role_type)
        workload = workload_map.get(emp.id, 0)
        has_conflict = emp.id in conflicts
        
        # Calculate score (0-100)
        score = 50  # Base score
        
        # Bonus for fulltime (more reliable)
        if emp.is_fulltime:
            score += 15
        
        # Bonus for lower workload
        if workload == 0:
            score += 20
        elif workload <= 2:
            score += 10
        elif workload >= 5:
            score -= 10
        
        # Penalty for conflict
        if has_conflict:
            score -= 30
        
        # Role match bonus (if filter specified)
        if role_filter and emp.role_type == role_filter:
            score += 10
        
        suggestions.append(StaffSuggestion(
            employee_id=str(emp.id),
            employee_name=emp.full_name,
            role_type=emp.role_type or 'STAFF',
            phone=emp.phone,
            is_fulltime=emp.is_fulltime,
            hourly_rate=float(emp.hourly_rate or 0),
            current_workload=workload,
            is_available=not has_conflict,
            score=max(0, min(100, score)),  # Clamp 0-100
            conflict_reason="Đã có lịch cùng ngày" if has_conflict else None
        ))
    
    # Sort by score descending, then by availability
    suggestions.sort(key=lambda x: (-x.is_available, -x.score))
    
    return SuggestStaffResponse(
        order_id=str(order_id),
        order_code=order.code,
        event_date=str(order.event_date) if order.event_date else None,
        required_roles=list(required_roles),
        suggestions=suggestions[:limit],
        total_available=len([s for s in suggestions if s.is_available])
    )


# ============ ORDER REVISION (Tạo Báo Giá Mới Từ Đơn Hàng) ============

class CreateRevisionQuoteResponse(BaseModel):
    """Response schema for create revision quote"""
    quote_id: str
    quote_code: str
    message: str
    deposit_amount: Decimal = Decimal(0)
    
    class Config:
        from_attributes = True


@router.post("/{order_id}/create-revision-quote", response_model=CreateRevisionQuoteResponse)
async def create_revision_quote(
    order_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new Quote from existing Order for revision.
    - Copies all order data to new quote (customer, items, event info)
    - Sets quote.replaces_order_id = order_id
    - When quote converts, old order will be cancelled + deposits transferred
    
    Only allowed for CONFIRMED orders.
    """
    from backend.modules.quote.domain.models import QuoteModel, QuoteItemModel
    import random
    
    # Verify order exists and belongs to tenant
    order_result = await db.execute(
        select(OrderModel).where(
            OrderModel.id == order_id,
            OrderModel.tenant_id == tenant_id
        ).options(
            selectinload(OrderModel.items),
            selectinload(OrderModel.payments)
        )
    )
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    
    # Only allow revision for CONFIRMED orders
    if order.status not in ['CONFIRMED', 'IN_PROGRESS']:
        raise HTTPException(
            status_code=400, 
            detail=f"Chỉ có thể tạo báo giá mới từ đơn hàng ĐÃ XÁC NHẬN. Trạng thái hiện tại: {order.status}"
        )
    
    # Generate quote code
    now = datetime.now()
    random_suffix = random.randint(1000, 9999)
    quote_code = f"BG-REV-{now.strftime('%Y%m')}-{random_suffix}"
    
    # Calculate deposit amount
    deposit_amount = order.paid_amount or Decimal(0)
    
    # Create new quote from order data
    new_quote = QuoteModel(
        tenant_id=tenant_id,
        code=quote_code,
        
        # Customer info
        customer_id=order.customer_id,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        
        # Event info
        event_type=order.event_type,
        event_date=order.event_date,
        event_time=order.event_time,
        event_address=order.event_address,
        
        # Pricing (will be recalculated)
        subtotal=order.total_amount,
        total_amount=order.final_amount,
        vat_rate=order.vat_rate,
        vat_amount=order.vat_amount,
        
        # Status
        status='DRAFT',
        
        # Notes - include reference to original order
        notes=f"Báo giá chỉnh sửa từ đơn hàng {order.code}.\n{order.note or ''}",
        
        # IMPORTANT: Link to order being replaced
        replaces_order_id=order_id
    )
    
    db.add(new_quote)
    await db.flush()  # Get quote ID
    
    # Copy order items to quote items
    for order_item in order.items:
        quote_item = QuoteItemModel(
            tenant_id=tenant_id,
            quote_id=new_quote.id,
            menu_item_id=order_item.menu_item_id,
            item_name=order_item.item_name,
            description=order_item.description,
            uom=order_item.uom,
            quantity=order_item.quantity,
            unit_price=order_item.unit_price,
            total_price=order_item.total_price,
            note=order_item.note
        )
        db.add(quote_item)
    
    await db.commit()
    await db.refresh(new_quote)
    
    logger.info(f"Created revision quote {quote_code} from order {order.code} (deposit: {deposit_amount})")
    
    return CreateRevisionQuoteResponse(
        quote_id=str(new_quote.id),
        quote_code=quote_code,
        message=f"Đã tạo báo giá mới từ đơn hàng {order.code}",
        deposit_amount=deposit_amount
    )

@router.get("", response_model=PaginatedOrderResponse)
async def list_orders(
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by code or customer name"),
    unpaid: Optional[bool] = Query(None, description="Filter only orders with balance > 0"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """List all orders with optional filters and pagination - ISS-001 Fix"""
    # Base query with tenant filter
    base_query = select(OrderModel).where(OrderModel.tenant_id == tenant_id)
    
    if status:
        base_query = base_query.where(OrderModel.status == status)
    
    if search:
        base_query = base_query.where(
            (OrderModel.code.ilike(f"%{search}%")) |
            (OrderModel.customer_name.ilike(f"%{search}%"))
        )
    
    # Filter only unpaid orders (balance > 0)
    if unpaid:
        base_query = base_query.where(OrderModel.balance_amount > 0)
    
    # Count total
    count_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = count_result.scalar() or 0
    
    # Calculate pagination
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    offset = (page - 1) * page_size
    
    # Apply pagination and ordering
    query = base_query.options(
        selectinload(OrderModel.items),
        selectinload(OrderModel.payments)
    ).order_by(OrderModel.created_at.desc()).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    orders = result.scalars().all()
    
    return PaginatedOrderResponse(
        items=orders,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/stats", response_model=OrderStats)
async def get_order_stats(tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Get order statistics summary"""
    # Total orders by status
    result = await db.execute(
        select(
            func.count(OrderModel.id).label('total'),
            func.sum(func.cast(OrderModel.status == 'PENDING', Integer)).label('pending'),
            func.sum(func.cast(OrderModel.status == 'CONFIRMED', Integer)).label('confirmed'),
            func.sum(func.cast(OrderModel.status == 'COMPLETED', Integer)).label('completed'),
            func.sum(func.cast(OrderModel.status == 'CANCELLED', Integer)).label('cancelled'),
            func.coalesce(func.sum(OrderModel.final_amount), 0).label('revenue'),
            func.coalesce(func.sum(OrderModel.paid_amount), 0).label('paid'),
            func.coalesce(func.sum(OrderModel.balance_amount), 0).label('balance')
        ).where(OrderModel.tenant_id == tenant_id)
    )
    row = result.one()
    
    return OrderStats(
        total_orders=row.total or 0,
        pending_orders=row.pending or 0,
        confirmed_orders=row.confirmed or 0,
        completed_orders=row.completed or 0,
        cancelled_orders=row.cancelled or 0,
        total_revenue=Decimal(str(row.revenue or 0)),
        total_paid=Decimal(str(row.paid or 0)),
        total_balance=Decimal(str(row.balance or 0))
    )


# ============ OVERDUE PAYMENTS (Phase 13.3) ============

@router.get("/overdue")
async def get_overdue_orders(
    days_threshold: int = Query(3, description="SềEngày quá hạn đềEcoi là overdue"),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Get orders with outstanding balance past their event date.
    Returns orders COMPLETED/CONFIRMED but not fully paid, where event_date was 
    more than `days_threshold` days ago.
    """
    from datetime import date, timedelta
    from sqlalchemy import cast, Date, text
    
    today = date.today()
    threshold_date = today - timedelta(days=days_threshold)
    
    # Find orders with balance > 0 and event_date in the past
    query = (
        select(OrderModel)
        .where(
            OrderModel.tenant_id == tenant_id,
            OrderModel.status.in_(['COMPLETED', 'CONFIRMED']),  # Not PAID, not CANCELLED
            OrderModel.balance_amount > 0,
            OrderModel.event_date.isnot(None),
            cast(OrderModel.event_date, Date) <= threshold_date
        )
        .order_by(OrderModel.event_date.asc())  # Oldest first (most urgent)
    )
    
    result = await db.execute(query)
    orders = result.scalars().all()
    
    # Calculate days overdue for each order
    overdue_list = []
    total_overdue_amount = Decimal(0)
    
    for order in orders:
        if order.event_date:
            event_dt = order.event_date
            if hasattr(event_dt, 'date'):
                event_dt = event_dt.date()
            days_overdue = (today - event_dt).days if event_dt else 0
        else:
            days_overdue = 0
        
        overdue_list.append({
            "id": str(order.id),
            "code": order.code,
            "customer_name": order.customer_name,
            "customer_phone": order.customer_phone,
            "event_date": str(order.event_date) if order.event_date else None,
            "final_amount": float(order.final_amount or 0),
            "paid_amount": float(order.paid_amount or 0),
            "balance_amount": float(order.balance_amount or 0),
            "days_overdue": days_overdue,
            "status": order.status,
            "priority": "HIGH" if days_overdue > 14 else ("MEDIUM" if days_overdue > 7 else "LOW")
        })
        total_overdue_amount += (order.balance_amount or Decimal(0))
    
    return {
        "count": len(overdue_list),
        "total_overdue_amount": float(total_overdue_amount),
        "threshold_days": days_threshold,
        "orders": overdue_list
    }


@router.get("/{order_id}", response_model=Order)
async def get_order(order_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Get order by ID with items and payments"""
    result = await db.execute(
        select(OrderModel)
        .options(
            selectinload(OrderModel.items),
            selectinload(OrderModel.payments)
        )
        .where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return order


@router.post("", response_model=Order)
async def create_order(data: OrderBase, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Create a new order"""
    
    # CRM Integration: Auto-Sync Customer
    resolved_customer_id = await CrmIntegrationService.sync_customer(
        db, tenant_id,
        data.customer_name,
        data.customer_phone,
        source="ORDER"
    )
    
    # Create order (code will be auto-generated by trigger)
    new_order = OrderModel(
        tenant_id=tenant_id,
        code="",  # Trigger will generate
        quote_id=data.quote_id,
        customer_id=resolved_customer_id or data.customer_id,
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        event_type=data.event_type,
        event_date=data.event_date,
        event_time=data.event_time,
        event_address=data.event_address,
        total_amount=data.total_amount,
        discount_amount=data.discount_amount,
        vat_rate=data.vat_rate,
        vat_amount=data.vat_amount,
        final_amount=data.final_amount,
        balance_amount=data.final_amount,  # Initially, balance = final
        status=data.status,
        note=data.note
    )
    
    db.add(new_order)
    await db.commit()
    await db.refresh(new_order)
    
    # Log Interaction
    if resolved_customer_id:
        await CrmIntegrationService.log_interaction(
            db, tenant_id, resolved_customer_id,
            "ORDER_CREATED",
            f"Tạo đơn hàng mới (Trực tiếp)"
        )
    
    # Reload with relationships
    result = await db.execute(
        select(OrderModel)
        .options(
            selectinload(OrderModel.items),
            selectinload(OrderModel.payments)
        )
        .where(OrderModel.id == new_order.id)
    )
    return result.scalar_one()


@router.put("/{order_id}", response_model=Order)
async def update_order(order_id: UUID, data: OrderBase, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Update an existing order"""
    result = await db.execute(
        select(OrderModel).where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Update fields - ISS-007 Fix: Use model_dump instead of deprecated dict()
    for field, value in data.model_dump(exclude_unset=True).items():
        if hasattr(order, field):
            setattr(order, field, value)
    
    order.updated_at = datetime.now(timezone.utc)  # ISS-008 Fix
    await db.commit()
    
    # Reload with relationships
    result = await db.execute(
        select(OrderModel)
        .options(
            selectinload(OrderModel.items),
            selectinload(OrderModel.payments)
        )
        .where(OrderModel.id == order_id)
    )
    return result.scalar_one()


# ============ ORDER STATUS ACTIONS ============

@router.post("/{order_id}/confirm", response_model=Order)
async def confirm_order(order_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Confirm an order (change status to CONFIRMED)"""
    result = await db.execute(
        select(OrderModel).where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status != 'PENDING':
        raise HTTPException(status_code=400, detail="Only PENDING orders can be confirmed")
    
    order.status = 'CONFIRMED'
    order.confirmed_at = datetime.now(timezone.utc)
    order.updated_at = datetime.now(timezone.utc)
    await db.commit()
    
    # CRM Hook: Recalculate Stats (e.g. Order Count increases)
    if order.customer_id:
        await CrmIntegrationService.recalculate_stats(db, tenant_id, order.customer_id)
    
    # Reload with relationships
    result = await db.execute(
        select(OrderModel)
        .options(
            selectinload(OrderModel.items),
            selectinload(OrderModel.payments)
        )
        .where(OrderModel.id == order_id)
    )
    return result.scalar_one()


@router.post("/{order_id}/start", response_model=Order)
async def start_order(order_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """
    Start order execution (CONFIRMED → IN_PROGRESS)
    Manual trigger to begin order preparation.
    """
    result = await db.execute(
        select(OrderModel).where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status != 'CONFIRMED':
        raise HTTPException(status_code=400, detail="Chỉ có thể bắt đầu đơn hàng đã xác nhận (CONFIRMED)")
    
    order.status = 'IN_PROGRESS'
    order.started_at = datetime.now(timezone.utc)
    order.updated_at = datetime.now(timezone.utc)
    await db.commit()
    
    # Reload with relationships
    result = await db.execute(
        select(OrderModel)
        .options(
            selectinload(OrderModel.items),
            selectinload(OrderModel.payments)
        )
        .where(OrderModel.id == order_id)
    )
    return result.scalar_one()


@router.post("/{order_id}/complete", response_model=Order)
async def complete_order(order_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Mark order as completed and auto-deduct inventory (GAP-6.1 Fix)"""
    result = await db.execute(
        select(OrderModel)
        .options(selectinload(OrderModel.items))
        .where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.status = 'COMPLETED'
    order.completed_at = datetime.now(timezone.utc)
    order.updated_at = datetime.now(timezone.utc)
    
    # ============ GAP-6.1 FIX: Auto-Deduct Inventory ============
    # Deduct inventory based on recipe mapping when order is completed
    try:
        from backend.modules.menu.domain.models import RecipeModel
        from backend.modules.inventory.domain.services import InventoryService
        from backend.modules.inventory.domain.entities import InventoryTransactionBase
        from backend.modules.inventory.domain.models import WarehouseModel
        
        # Get default warehouse
        wh_result = await db.execute(
            select(WarehouseModel).where(WarehouseModel.tenant_id == tenant_id).limit(1)
        )
        default_warehouse = wh_result.scalar_one_or_none()
        
        if default_warehouse and order.items:
            deducted_count = 0
            for order_item in order.items:
                if not order_item.menu_item_id:
                    continue
                
                # Find recipes for this menu item
                recipe_result = await db.execute(
                    select(RecipeModel).where(
                        RecipeModel.menu_item_id == order_item.menu_item_id,
                        RecipeModel.tenant_id == tenant_id
                    )
                )
                recipes = recipe_result.scalars().all()
                
                for recipe in recipes:
                    # Calculate quantity needed
                    qty_needed = float(order_item.quantity) * float(recipe.quantity_per_unit)
                    
                    if qty_needed > 0:
                        try:
                            # Create EXPORT transaction
                            await InventoryService.create_transaction(
                                db=db,
                                data=InventoryTransactionBase(
                                    item_id=recipe.ingredient_id,
                                    warehouse_id=default_warehouse.id,
                                    transaction_type="EXPORT",
                                    quantity=Decimal(str(qty_needed)),
                                    reference_doc=f"ORDER-{order.code}",
                                    notes=f"Auto-deduct: {order_item.item_name} x {order_item.quantity}"
                                ),
                                tenant_id=tenant_id,
                                auto_deduct_lots=True  # FIFO lot deduction
                            )
                            deducted_count += 1
                        except HTTPException as e:
                            # Log but don't fail order completion if insufficient stock
                            logger.warning(f"Inventory deduct failed for {recipe.ingredient_name}: {e.detail}")
            
            if deducted_count > 0:
                logger.info(f"Order {order.code}: Auto-deducted {deducted_count} inventory items")
                
    except ImportError as e:
        logger.warning(f"Inventory deduct skipped (module not available): {e}")
    except Exception as e:
        # Don't fail order completion if inventory deduct fails
        logger.warning(f"Inventory auto-deduct failed for order {order.code}: {e}")
    # ============ END GAP-6.1 FIX ============
    
    await db.commit()
    
    # CRM Hook: Recalculate Stats (e.g. Total Spent updates)
    if order.customer_id:
        await CrmIntegrationService.recalculate_stats(db, tenant_id, order.customer_id)
        
        # CRM Loyalty: Earn points based on final_amount
        try:
            loyalty_service = LoyaltyService(db, tenant_id)
            points_earned = await loyalty_service.earn_points(
                customer_id=order.customer_id,
                amount=order.final_amount or Decimal(0),
                reference_type="ORDER",
                reference_id=order.id,
                description=f"Tích điểm từ đơn hàng {order.code}"
            )
            if points_earned > 0:
                logger.info(f"Earned {points_earned} points for customer {order.customer_id} from order {order.code}")
        except Exception as e:
            # Don't fail the order completion if loyalty fails
            logger.warning(f"Failed to earn loyalty points for order {order.code}: {e}")
    
    # ============ HR INTEGRATION: Auto-Create Timesheets (SOL-1) ============
    # Create timesheets for all staff assigned to this order
    try:
        from backend.modules.hr.domain.models import TimesheetModel, StaffAssignmentModel as HrStaffAssignment
        from decimal import Decimal
        
        # Get all staff assignments for this order
        staff_result = await db.execute(
            select(OrderStaffAssignmentModel).where(
                OrderStaffAssignmentModel.order_id == order_id,
                OrderStaffAssignmentModel.tenant_id == tenant_id
            )
        )
        staff_assignments = staff_result.scalars().all()
        
        # BUGFIX: BUG-20260205-003 - If no OrderStaffAssignments, check HR's StaffAssignmentModel via event_id
        hr_staff_assignments = []
        if not staff_assignments:
            hr_result = await db.execute(
                select(HrStaffAssignment).where(
                    HrStaffAssignment.event_id == order_id,
                    HrStaffAssignment.tenant_id == tenant_id,
                    HrStaffAssignment.status != 'CANCELLED'
                )
            )
            hr_staff_assignments = hr_result.scalars().all()
            if hr_staff_assignments:
                logger.info(f"Order {order.code}: Found {len(hr_staff_assignments)} HR staff assignments via event_id")
        
        timesheets_created = 0
        
        # Process OrderStaffAssignmentModel records
        for assignment in staff_assignments:
            # Check if timesheet already exists for this order+staff
            existing = await db.execute(
                select(TimesheetModel).where(
                    TimesheetModel.tenant_id == tenant_id,
                    TimesheetModel.employee_id == assignment.staff_id,
                    TimesheetModel.order_id == order_id
                )
            )
            if existing.scalar_one_or_none():
                continue  # Skip if already exists
            
            # Determine work date from order
            event_date = order.event_date
            if hasattr(event_date, 'date'):
                event_date = event_date.date()
            
            # Create timesheet
            timesheet = TimesheetModel(
                tenant_id=tenant_id,
                employee_id=assignment.staff_id,
                order_id=order_id,
                work_date=event_date,
                total_hours=Decimal("8.0"),  # Default 8 hours, HR can adjust
                status='PENDING',  # HR will review and approve
                source='AUTO_ORDER',
                notes=f"Tự động tạo từ đơn hàng {order.code}"
            )
            db.add(timesheet)
            timesheets_created += 1
        
        # BUGFIX: BUG-20260205-003 - Process HR StaffAssignmentModel records
        for hr_assignment in hr_staff_assignments:
            # Check if timesheet already exists for this order+staff
            existing = await db.execute(
                select(TimesheetModel).where(
                    TimesheetModel.tenant_id == tenant_id,
                    TimesheetModel.employee_id == hr_assignment.employee_id,
                    TimesheetModel.order_id == order_id
                )
            )
            if existing.scalar_one_or_none():
                continue  # Skip if already exists
            
            # Determine work date from order
            event_date = order.event_date
            if hasattr(event_date, 'date'):
                event_date = event_date.date()
            
            # Calculate planned hours from assignment if available
            planned_hours = Decimal("8.0")  # Default
            if hr_assignment.start_time and hr_assignment.end_time:
                diff = hr_assignment.end_time - hr_assignment.start_time
                planned_hours = Decimal(str(round(diff.total_seconds() / 3600, 2)))
            
            # Create timesheet with assignment link
            timesheet = TimesheetModel(
                tenant_id=tenant_id,
                employee_id=hr_assignment.employee_id,
                assignment_id=hr_assignment.id,  # Link to HR assignment
                order_id=order_id,
                work_date=event_date,
                total_hours=planned_hours,  # Use planned hours from assignment
                status='PENDING',  # HR will review and approve
                source='AUTO_ORDER',
                notes=f"Tự động tạo từ đơn hàng {order.code}"
            )
            db.add(timesheet)
            timesheets_created += 1  # BUGFIX: BUG-20260205-003 - Count HR timesheets too
        
        if timesheets_created > 0:
            await db.commit()  # BUGFIX: BUG-20260205-002 - Persist timesheets to database
            logger.info(f"Order {order.code}: Auto-created {timesheets_created} timesheets for staff")
            
    except ImportError as e:
        logger.warning(f"HR timesheet auto-create skipped (module not available): {e}")
    except Exception as e:
        # Don't fail order completion if timesheet creation fails
        logger.warning(f"HR timesheet auto-create failed for order {order.code}: {e}")
    # ============ END HR INTEGRATION ============
    
    # Reload with relationships
    result = await db.execute(
        select(OrderModel)
        .options(
            selectinload(OrderModel.items),
            selectinload(OrderModel.payments)
        )
        .where(OrderModel.id == order_id)
    )
    return result.scalar_one()


@router.post("/{order_id}/cancel", response_model=Order)
async def cancel_order(order_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Cancel an order"""
    result = await db.execute(
        select(OrderModel).where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status in ['COMPLETED', 'CANCELLED']:
        raise HTTPException(status_code=400, detail=f"Cannot cancel order with status {order.status}")
    
    order.status = 'CANCELLED'
    order.updated_at = datetime.now(timezone.utc)
    await db.commit()
    
    # Reload with relationships
    result = await db.execute(
        select(OrderModel)
        .options(
            selectinload(OrderModel.items),
            selectinload(OrderModel.payments)
        )
        .where(OrderModel.id == order_id)
    )
    return result.scalar_one()


class CancelWithRefundRequest(BaseModel):
    """Request body for cancel order with refund calculation"""
    cancel_reason: str
    force_majeure: bool = False
    refund_amount_override: Optional[Decimal] = None  # Admin override


class CancelWithRefundResponse(BaseModel):
    """Response for cancel order with refund"""
    order_id: UUID
    order_code: str
    previous_status: str
    new_status: str
    paid_amount: Decimal
    refund_amount: Decimal
    retained_amount: Decimal
    cancellation_type: str
    days_before_event: int
    policy_description: str


def calculate_refund_policy(days_before: int, paid_amount: Decimal, force_majeure: bool = False) -> dict:
    """
    Calculate refund based on cancellation policy.
    
    Policy:
    - >= 15 days: 100% refund
    - 8-14 days: 50% refund
    - 3-7 days: 25% refund
    - 1-2 days: 10% refund
    - 0 days (event day): 0% refund
    """
    if force_majeure:
        return {
            "refund_percentage": 100,
            "refund_amount": paid_amount,
            "retained_amount": Decimal(0),
            "cancellation_type": "FORCE_MAJEURE",
            "policy_description": "Bất khả kháng - Hoàn 100% tiền cọc"
        }
    
    if days_before >= 15:
        refund_pct = 100
        cancel_type = "FULL_REFUND"
        description = "Hủy trước 15 ngày trở lên - Hoàn 100% tiền cọc"
    elif days_before >= 8:
        refund_pct = 50
        cancel_type = "PARTIAL_REFUND"
        description = f"Hủy trong vòng 8-14 ngày (còn {days_before} ngày) - Hoàn 50% tiền cọc"
    elif days_before >= 3:
        refund_pct = 25
        cancel_type = "PARTIAL_REFUND"
        description = f"Hủy trong vòng 3-7 ngày (còn {days_before} ngày) - Hoàn 25% tiền cọc"
    elif days_before >= 1:
        refund_pct = 10
        cancel_type = "PARTIAL_REFUND"
        description = f"Hủy trước 1-2 ngày (còn {days_before} ngày) - Hoàn 10% tiền cọc (thiện chí)"
    else:
        refund_pct = 0
        cancel_type = "NO_REFUND"
        description = "Hủy trong ngày tiệc - Không hoàn tiền cọc"
    
    refund_amount = paid_amount * Decimal(refund_pct) / Decimal(100)
    retained_amount = paid_amount - refund_amount
    
    return {
        "refund_percentage": refund_pct,
        "refund_amount": refund_amount,
        "retained_amount": retained_amount,
        "cancellation_type": cancel_type,
        "policy_description": description
    }


@router.post("/{order_id}/cancel-with-refund", response_model=CancelWithRefundResponse)
async def cancel_order_with_refund(
    order_id: UUID,
    request: CancelWithRefundRequest,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel an order with automatic refund calculation.
    
    - Calculates refund based on days remaining until event_date
    - Supports force_majeure flag for 100% refund
    - Admin can override refund amount if needed
    """
    result = await db.execute(
        select(OrderModel).where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status in ['COMPLETED', 'CANCELLED', 'PAID']:
        raise HTTPException(status_code=400, detail=f"Không thể hủy đơn hàng với trạng thái {order.status}")
    
    # Calculate days before event
    today = datetime.now(timezone.utc).date()
    event_date = order.event_date
    if isinstance(event_date, datetime):
        event_date = event_date.date()
    
    days_before = (event_date - today).days
    
    # Check if event has passed
    if days_before < 0:
        raise HTTPException(status_code=400, detail="Không thể hủy đơn hàng đã qua ngày tiệc")
    
    # Get paid amount
    paid_amount = Decimal(order.paid_amount or 0)
    previous_status = order.status
    
    # Calculate refund
    policy = calculate_refund_policy(days_before, paid_amount, request.force_majeure)
    
    # Allow admin override
    if request.refund_amount_override is not None:
        refund_amount = request.refund_amount_override
        retained_amount = paid_amount - refund_amount
        policy["refund_amount"] = refund_amount
        policy["retained_amount"] = retained_amount
        policy["policy_description"] = f"Số tiền hoàn được điều chỉnh thủ công: {refund_amount:,.0f}đ"
    
    # Update order
    order.status = 'CANCELLED'
    order.cancel_reason = request.cancel_reason
    order.cancellation_type = policy["cancellation_type"]
    order.refund_amount = policy["refund_amount"]
    order.cancelled_at = datetime.now(timezone.utc)
    order.updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    
    return CancelWithRefundResponse(
        order_id=order.id,
        order_code=order.code,
        previous_status=previous_status,
        new_status='CANCELLED',
        paid_amount=paid_amount,
        refund_amount=policy["refund_amount"],
        retained_amount=policy["retained_amount"],
        cancellation_type=policy["cancellation_type"],
        days_before_event=days_before,
        policy_description=policy["policy_description"]
    )


@router.get("/{order_id}/refund-preview")
async def preview_refund(
    order_id: UUID,
    force_majeure: bool = False,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Preview refund calculation without actually cancelling.
    Used by frontend to show refund info in cancel modal.
    """
    result = await db.execute(
        select(OrderModel).where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Calculate days before event
    today = datetime.now(timezone.utc).date()
    event_date = order.event_date
    if isinstance(event_date, datetime):
        event_date = event_date.date()
    
    days_before = (event_date - today).days
    paid_amount = Decimal(order.paid_amount or 0)
    
    policy = calculate_refund_policy(days_before, paid_amount, force_majeure)
    
    return {
        "order_id": str(order.id),
        "order_code": order.code,
        "event_date": order.event_date.isoformat() if order.event_date else None,
        "days_before_event": days_before,
        "paid_amount": float(paid_amount),
        "refund_amount": float(policy["refund_amount"]),
        "retained_amount": float(policy["retained_amount"]),
        "refund_percentage": policy["refund_percentage"],
        "cancellation_type": policy["cancellation_type"],
        "policy_description": policy["policy_description"],
        "can_cancel": days_before >= 0 and order.status not in ['COMPLETED', 'CANCELLED', 'PAID']
    }


@router.post("/{order_id}/hold", response_model=Order)
async def hold_order(order_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Put order on hold (CONFIRMED ↁEON_HOLD)"""
    result = await db.execute(
        select(OrderModel).where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status != 'CONFIRMED':
        raise HTTPException(status_code=400, detail="ChềEđơn hàng đã xác nhận mới có thềEtạm hoãn")
    
    order.status = 'ON_HOLD'
    order.updated_at = datetime.now(timezone.utc)
    await db.commit()
    
    # Reload with relationships
    result = await db.execute(
        select(OrderModel)
        .options(
            selectinload(OrderModel.items),
            selectinload(OrderModel.payments)
        )
        .where(OrderModel.id == order_id)
    )
    return result.scalar_one()


@router.post("/{order_id}/resume", response_model=Order)
async def resume_order(order_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Resume order from hold (ON_HOLD ↁECONFIRMED)"""
    result = await db.execute(
        select(OrderModel).where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status != 'ON_HOLD':
        raise HTTPException(status_code=400, detail="ChềEđơn hàng đang tạm hoãn mới có thềEtiếp tục")
    
    order.status = 'CONFIRMED'
    order.updated_at = datetime.now(timezone.utc)
    await db.commit()
    
    # Reload with relationships
    result = await db.execute(
        select(OrderModel)
        .options(
            selectinload(OrderModel.items),
            selectinload(OrderModel.payments)
        )
        .where(OrderModel.id == order_id)
    )
    return result.scalar_one()


@router.post("/{order_id}/mark-paid", response_model=Order)
async def mark_paid(order_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Mark order as fully paid (COMPLETED ↁEPAID)"""
    result = await db.execute(
        select(OrderModel).where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status != 'COMPLETED':
        raise HTTPException(status_code=400, detail="ChềEđơn hàng hoàn thành mới có thềEđánh dấu đã thanh toán")
    
    order.status = 'PAID'
    order.updated_at = datetime.now(timezone.utc)
    await db.commit()
    
    # CRM Hook: Recalculate Stats
    if order.customer_id:
        await CrmIntegrationService.recalculate_stats(db, tenant_id, order.customer_id)
    
    # Reload with relationships
    result = await db.execute(
        select(OrderModel)
        .options(
            selectinload(OrderModel.items),
            selectinload(OrderModel.payments)
        )
        .where(OrderModel.id == order_id)
    )
    return result.scalar_one()


# ============ ORDER PAYMENTS ============

@router.get("/{order_id}/payments", response_model=List[OrderPayment])
async def list_order_payments(order_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """List all payments for an order - ISS-006 Fix: Added tenant_id check"""
    # First verify order belongs to tenant (RLS check)
    order_check = await db.execute(
        select(OrderModel.id).where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    if not order_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Order not found")
    
    result = await db.execute(
        select(OrderPaymentModel)
        .where(
            (OrderPaymentModel.order_id == order_id) &
            (OrderPaymentModel.tenant_id == tenant_id)  # ISS-006: Added tenant check
        )
        .order_by(OrderPaymentModel.payment_date.desc())
    )
    return result.scalars().all()


@router.post("/{order_id}/payments", response_model=OrderPayment)
async def add_payment(order_id: UUID, data: OrderPaymentBase, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Add a payment to an order"""
    # Verify order exists
    order_result = await db.execute(
        select(OrderModel).where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    order = order_result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Create payment
    new_payment = OrderPaymentModel(
        tenant_id=tenant_id,
        order_id=order_id,
        amount=data.amount,
        payment_method=data.payment_method,
        reference_no=data.reference_no,
        note=data.note,
        payment_date=datetime.now(timezone.utc)
    )
    
    db.add(new_payment)
    await db.flush()  # Flush to get payment ID
    
    # Update order payment totals (trigger handles this, but we also update here for safety)
    order.paid_amount = (order.paid_amount or Decimal(0)) + data.amount
    order.balance_amount = (order.final_amount or Decimal(0)) - order.paid_amount
    
    # Auto-transition to PAID if fully paid
    if order.balance_amount <= 0:
        order.status = 'PAID'
    
    order.updated_at = datetime.now(timezone.utc)
    
    # Sprint 17.1: Auto-create Journal Entry for payment (BEFORE commit, same transaction)
    # BUGFIX: Previously journal was created AFTER commit, causing double-commit issue
    # and silent failures. Now both payment + journal are in the same transaction.
    try:
        from backend.modules.finance.services.journal_service import JournalService
        journal_service = JournalService(db, tenant_id=tenant_id)
        await journal_service.create_journal_from_payment(
            payment_id=new_payment.id,
            order_id=order_id,
            amount=data.amount,
            payment_method=data.payment_method,
            description=f"Thu tiền đơn hàng {order.code}"
        )
    except Exception as e:
        # Log error but don't fail the payment
        logger.warning(f" Failed to create journal entry: {e}")
    
    await db.commit()
    await db.refresh(new_payment)
    
    return new_payment


class UpdatePaymentRequest(BaseModel):
    """Request body for updating a payment"""
    amount: Optional[Decimal] = None
    payment_method: Optional[str] = None
    reference_no: Optional[str] = None
    note: Optional[str] = None


@router.put("/{order_id}/payments/{payment_id}", response_model=OrderPayment)
async def update_payment(order_id: UUID, payment_id: UUID, data: UpdatePaymentRequest, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Update an existing payment"""
    # Get payment
    result = await db.execute(
        select(OrderPaymentModel).where(
            (OrderPaymentModel.id == payment_id) &
            (OrderPaymentModel.order_id == order_id)
        )
    )
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Get order to recalculate totals
    order_result = await db.execute(
        select(OrderModel).where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    old_amount = payment.amount or Decimal(0)
    
    # Update fields
    if data.amount is not None:
        payment.amount = data.amount
    if data.payment_method is not None:
        payment.payment_method = data.payment_method
    if data.reference_no is not None:
        payment.reference_no = data.reference_no
    if data.note is not None:
        payment.note = data.note
    
    # Recalculate order totals if amount changed
    new_amount = payment.amount or Decimal(0)
    if new_amount != old_amount:
        diff = new_amount - old_amount
        order.paid_amount = (order.paid_amount or Decimal(0)) + diff
        order.balance_amount = (order.final_amount or Decimal(0)) - order.paid_amount
        order.updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(payment)
    
    return payment


@router.delete("/{order_id}/payments/{payment_id}")
async def delete_payment(order_id: UUID, payment_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Delete a payment from an order"""
    result = await db.execute(
        select(OrderPaymentModel).where(
            (OrderPaymentModel.id == payment_id) &
            (OrderPaymentModel.order_id == order_id)
        )
    )
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # BUGFIX: Recalculate order totals before deleting
    order_result = await db.execute(
        select(OrderModel).where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    order = order_result.scalar_one_or_none()
    if order:
        order.paid_amount = (order.paid_amount or Decimal(0)) - (payment.amount or Decimal(0))
        if order.paid_amount < 0:
            order.paid_amount = Decimal(0)
        order.balance_amount = (order.final_amount or Decimal(0)) - order.paid_amount
        order.updated_at = datetime.now(timezone.utc)
        
        # If was PAID but now has balance, revert status
        if order.status == 'PAID' and order.balance_amount > 0:
            order.status = 'CONFIRMED'
    
    # Delete related finance transaction if exists
    try:
        from backend.modules.finance.domain.models import FinanceTransactionModel
        tx_result = await db.execute(
            select(FinanceTransactionModel).where(
                (FinanceTransactionModel.reference_id == order_id) &
                (FinanceTransactionModel.reference_type == "ORDER") &
                (FinanceTransactionModel.amount == payment.amount)
            )
        )
        finance_tx = tx_result.scalar_one_or_none()
        if finance_tx:
            await db.delete(finance_tx)
    except Exception as e:
        logger.warning(f"Failed to delete finance transaction: {e}")
    
    await db.delete(payment)
    await db.commit()
    
    return {"message": "Payment deleted successfully"}


# ============ ORDER ITEMS ============

@router.post("/{order_id}/items", response_model=OrderItem)
async def add_order_item(order_id: UUID, data: OrderItemBase, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Add an item to an order"""
    # Verify order exists
    order_result = await db.execute(
        select(OrderModel).where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    order = order_result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Create item
    new_item = OrderItemModel(
        tenant_id=tenant_id,
        order_id=order_id,
        menu_item_id=data.menu_item_id,
        item_name=data.item_name,
        category=data.category,
        description=data.description,
        uom=data.uom,
        quantity=data.quantity,
        unit_price=data.unit_price,
        total_price=data.total_price,
        note=data.note
    )
    
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    
    return new_item


# ============ ORDER STAFF ASSIGNMENTS ============

from pydantic import BaseModel

class StaffAssignmentCreate(BaseModel):
    staff_id: UUID
    role: str = 'SERVER'  # LEAD, SERVER, KITCHEN, DRIVER
    note: Optional[str] = None

class StaffAssignmentResponse(BaseModel):
    id: UUID
    order_id: UUID
    staff_id: UUID
    role: str
    confirmed: bool
    note: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.get("/{order_id}/staff", response_model=List[StaffAssignmentResponse])
async def list_order_staff(order_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """List all staff assigned to an order"""
    # Verify order exists
    order_result = await db.execute(
        select(OrderModel).where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    if not order_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Order not found")
    
    result = await db.execute(
        select(OrderStaffAssignmentModel)
        .where(OrderStaffAssignmentModel.order_id == order_id)
        .order_by(OrderStaffAssignmentModel.created_at)
    )
    return result.scalars().all()


@router.post("/{order_id}/staff", response_model=StaffAssignmentResponse)
async def assign_staff(order_id: UUID, data: StaffAssignmentCreate, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Assign a staff member to an order"""
    # Verify order exists and get event info
    order_result = await db.execute(
        select(OrderModel).where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    current_order = order_result.scalar_one_or_none()
    if not current_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if staff already assigned to this order
    existing = await db.execute(
        select(OrderStaffAssignmentModel).where(
            (OrderStaffAssignmentModel.order_id == order_id) &
            (OrderStaffAssignmentModel.staff_id == data.staff_id)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Nhân viên này đã được phân công cho đơn hàng")
    
    # ======= CONFLICT CHECKING =======
    # Check if staff is assigned to other orders on the same date
    conflicts = []
    if current_order.event_date:
        from sqlalchemy import cast, Date
        
        # Find other orders on same date with this staff
        conflict_query = (
            select(OrderModel, OrderStaffAssignmentModel)
            .join(OrderStaffAssignmentModel, OrderModel.id == OrderStaffAssignmentModel.order_id)
            .where(
                OrderStaffAssignmentModel.staff_id == data.staff_id,
                OrderStaffAssignmentModel.tenant_id == tenant_id,
                OrderModel.id != order_id,  # Exclude current order
                OrderModel.status.in_(['PENDING', 'CONFIRMED', 'IN_PROGRESS']),  # Active orders only
                cast(OrderModel.event_date, Date) == cast(current_order.event_date, Date)  # Same day
            )
        )
        
        conflict_result = await db.execute(conflict_query)
        conflict_rows = conflict_result.all()
        
        for row in conflict_rows:
            conflict_order = row[0]
            conflicts.append({
                "order_id": str(conflict_order.id),
                "order_code": conflict_order.code,
                "event_date": str(conflict_order.event_date),
                "event_time": conflict_order.event_time,
                "event_address": conflict_order.event_address,
                "customer_name": conflict_order.customer_name
            })
    
    # Create assignment (proceed even with conflicts, but include warning)
    new_assignment = OrderStaffAssignmentModel(
        tenant_id=tenant_id,
        order_id=order_id,
        staff_id=data.staff_id,
        role=data.role,
        note=data.note
    )
    
    db.add(new_assignment)
    await db.commit()
    await db.refresh(new_assignment)
    
    # ============ SOL-3: Staff Assignment Notification (P0: Preferences-aware) ============
    try:
        from backend.modules.hr.domain.models import EmployeeModel
        from backend.modules.notification.services.notification_service import create_notification_if_allowed
        
        # Get employee info to find their user_id
        emp_result = await db.execute(
            select(EmployeeModel).where(EmployeeModel.id == data.staff_id)
        )
        employee = emp_result.scalar_one_or_none()
        
        if employee and employee.user_id:
            event_date_str = current_order.event_date.strftime("%d/%m/%Y") if current_order.event_date else "Chưa xác định"
            
            await create_notification_if_allowed(
                db=db,
                tenant_id=tenant_id,
                user_id=employee.user_id,
                notification_type="STAFF_ASSIGNMENT",
                title="Phân công công việc mới",
                message=f"Bạn được phân công vào đơn hàng {current_order.code} - {current_order.customer_name}. Ngày: {event_date_str}. Vai trò: {data.role or 'Nhân viên'}",
                reference_type="order_staff_assignment",
                reference_id=new_assignment.id,
            )
            await db.commit()
            logger.info(f"Sent assignment notification to staff {employee.full_name}")
    except Exception as e:
        logger.warning(f"Failed to send staff assignment notification: {e}")
    # ============ END SOL-3 ============
    
    # Return with conflict warning if applicable
    response = StaffAssignmentResponse.model_validate(new_assignment)
    
    # Add conflict info to response headers or return extended response
    if conflicts:
        # For now, just log - in a real app, return in response
        logger.warning(f" Staff conflict detected for {data.staff_id}")
        logger.debug(f"Conflicts: {conflicts}")
    
    return response


@router.delete("/{order_id}/staff/{assignment_id}")
async def remove_staff(order_id: UUID, assignment_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Remove a staff assignment from an order"""
    result = await db.execute(
        select(OrderStaffAssignmentModel).where(
            (OrderStaffAssignmentModel.id == assignment_id) &
            (OrderStaffAssignmentModel.order_id == order_id)
        )
    )
    assignment = result.scalar_one_or_none()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Staff assignment not found")
    
    await db.delete(assignment)
    await db.commit()
    
    return {"message": "Đã xóa phân công nhân viên"}


@router.patch("/{order_id}/staff/{assignment_id}/confirm")
async def confirm_staff_assignment(order_id: UUID, assignment_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Confirm a staff assignment (staff acknowledges the assignment)"""
    result = await db.execute(
        select(OrderStaffAssignmentModel).where(
            (OrderStaffAssignmentModel.id == assignment_id) &
            (OrderStaffAssignmentModel.order_id == order_id)
        )
    )
    assignment = result.scalar_one_or_none()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Staff assignment not found")
    
    assignment.confirmed = True
    assignment.updated_at = datetime.now(timezone.utc)
    await db.commit()
    
    return {"message": "Đã xác nhận phân công", "confirmed": True}


# ============ STAFF CONFLICT CHECKING ============

@router.get("/staff/{staff_id}/conflicts")
async def check_staff_conflicts(
    staff_id: UUID,
    event_date: str = Query(..., description="Date to check (YYYY-MM-DD format)"),
    exclude_order_id: Optional[UUID] = Query(None, description="Order ID to exclude from check"),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Check if a staff member has conflicts on a specific date.
    Returns list of orders where staff is already assigned.
    """
    from sqlalchemy import cast, Date
    from datetime import datetime as dt
    
    try:
        check_date = dt.strptime(event_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Find all orders on this date where staff is assigned
    query = (
        select(OrderModel, OrderStaffAssignmentModel)
        .join(OrderStaffAssignmentModel, OrderModel.id == OrderStaffAssignmentModel.order_id)
        .where(
            OrderStaffAssignmentModel.staff_id == staff_id,
            OrderStaffAssignmentModel.tenant_id == tenant_id,
            OrderModel.status.in_(['PENDING', 'CONFIRMED', 'IN_PROGRESS']),
            cast(OrderModel.event_date, Date) == check_date
        )
    )
    
    if exclude_order_id:
        query = query.where(OrderModel.id != exclude_order_id)
    
    result = await db.execute(query)
    rows = result.all()
    
    conflicts = []
    for row in rows:
        order = row[0]
        assignment = row[1]
        conflicts.append({
            "order_id": str(order.id),
            "order_code": order.code,
            "event_date": str(order.event_date) if order.event_date else None,
            "event_time": order.event_time,
            "event_address": order.event_address,
            "customer_name": order.customer_name,
            "status": order.status,
            "role": assignment.role,
            "confirmed": assignment.confirmed
        })
    
    return {
        "staff_id": str(staff_id),
        "check_date": event_date,
        "has_conflicts": len(conflicts) > 0,
        "conflict_count": len(conflicts),
        "conflicts": conflicts
    }


@router.get("/staff/{staff_id}/schedule")
async def get_staff_schedule(
    staff_id: UUID,
    from_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a staff member's schedule (all assignments) within a date range.
    Useful for calendar view of staff availability.
    """
    from sqlalchemy import cast, Date
    from datetime import datetime as dt
    
    try:
        start_date = dt.strptime(from_date, "%Y-%m-%d").date()
        end_date = dt.strptime(to_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="end_date must be >= from_date")
    
    # Find all assignments in date range
    query = (
        select(OrderModel, OrderStaffAssignmentModel)
        .join(OrderStaffAssignmentModel, OrderModel.id == OrderStaffAssignmentModel.order_id)
        .where(
            OrderStaffAssignmentModel.staff_id == staff_id,
            OrderStaffAssignmentModel.tenant_id == tenant_id,
            OrderModel.status.in_(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED']),
            cast(OrderModel.event_date, Date) >= start_date,
            cast(OrderModel.event_date, Date) <= end_date
        )
        .order_by(OrderModel.event_date)
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    schedule = []
    for row in rows:
        order = row[0]
        assignment = row[1]
        schedule.append({
            "order_id": str(order.id),
            "order_code": order.code,
            "event_date": str(order.event_date.date()) if order.event_date else None,
            "event_time": order.event_time,
            "event_address": order.event_address,
            "customer_name": order.customer_name,
            "status": order.status,
            "role": assignment.role,
            "confirmed": assignment.confirmed
        })
    
    return {
        "staff_id": str(staff_id),
        "from_date": from_date,
        "to_date": to_date,
        "total_assignments": len(schedule),
        "schedule": schedule
    }


# ============ PHASE 12: KITCHEN PREP SHEET ============

class PrepSheetItem(BaseModel):
    """Single item in prep sheet"""
    item_name: str
    category: Optional[str]
    quantity: int
    uom: str
    unit_price: Optional[float]
    note: Optional[str]
    prep_time: str  # T-3h, T-2h, T-1h, etc.

class PrepSheetCategory(BaseModel):
    """Category grouping for prep sheet"""
    category_name: str
    items: List[PrepSheetItem]
    total_items: int

class PrepSheet(BaseModel):
    """Kitchen Prep Sheet response"""
    order_id: str
    order_code: str
    event_date: Optional[str]
    event_time: Optional[str]
    event_address: Optional[str]
    customer_name: Optional[str]
    guest_count: Optional[int]
    table_count: Optional[int]
    special_notes: Optional[str]
    categories: List[PrepSheetCategory]
    total_items: int
    generated_at: str


@router.get("/{order_id}/prep-sheet", response_model=PrepSheet)
async def generate_prep_sheet(
    order_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate Kitchen Prep Sheet for an order.
    Groups items by category with prep time suggestions.
    """
    # Get order with items
    result = await db.execute(
        select(OrderModel)
        .options(selectinload(OrderModel.items))
        .where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status not in ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED']:
        raise HTTPException(
            status_code=400, 
            detail=f"Prep sheet chềEtạo được cho đơn hàng đã xác nhận. Status hiện tại: {order.status}"
        )
    
    # Group items by category
    category_map = {}
    for item in order.items:
        cat_name = item.category or "Khác"
        if cat_name not in category_map:
            category_map[cat_name] = []
        
        # Determine prep time based on category
        prep_time = "T-1h"  # Default
        if cat_name.lower() in ["khai vị", "appetizer", "salad"]:
            prep_time = "T-2h"
        elif cat_name.lower() in ["món chính", "main course", "main"]:
            prep_time = "T-1h"
        elif cat_name.lower() in ["tráng miệng", "dessert", "bánh"]:
            prep_time = "T-30m"
        elif cat_name.lower() in ["đồ uống", "beverage", "nước"]:
            prep_time = "T-15m"
        elif cat_name.lower() in ["sơ chế", "prep"]:
            prep_time = "T-3h"
        
        category_map[cat_name].append(PrepSheetItem(
            item_name=item.item_name,
            category=item.category,
            quantity=item.quantity or 1,
            uom=item.uom or "bàn",
            unit_price=float(item.unit_price) if item.unit_price else None,
            note=item.note,
            prep_time=prep_time
        ))
    
    # Sort categories in logical prep order
    category_order = ["Sơ chế", "Khai vị", "Món chính", "Tráng miệng", "Đồ uống", "Khác"]
    sorted_categories = []
    
    for cat_name in category_order:
        if cat_name in category_map:
            sorted_categories.append(PrepSheetCategory(
                category_name=cat_name,
                items=category_map[cat_name],
                total_items=len(category_map[cat_name])
            ))
            del category_map[cat_name]
    
    # Add remaining categories
    for cat_name, items in category_map.items():
        sorted_categories.append(PrepSheetCategory(
            category_name=cat_name,
            items=items,
            total_items=len(items)
        ))
    
    # Calculate totals
    total_items = sum(len(items) for items in [cat.items for cat in sorted_categories])
    
    return PrepSheet(
        order_id=str(order.id),
        order_code=order.code,
        event_date=order.event_date.strftime("%d/%m/%Y") if order.event_date else None,
        event_time=order.event_time,
        event_address=order.event_address,
        customer_name=order.customer_name,
        guest_count=None,  # TODO: Add to order model
        table_count=None,  # TODO: Calculate from items
        special_notes=order.note,
        categories=sorted_categories,
        total_items=total_items,
        generated_at=datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")
    )


# ============ PHASE 12: INVENTORY PULL SHEET ============

class PullSheetLot(BaseModel):
    """Lot information for pull sheet"""
    lot_number: str
    expiry_date: Optional[str]
    available_qty: float
    to_pick_qty: float

class PullSheetItem(BaseModel):
    """Single item in pull sheet"""
    inventory_item_id: Optional[str]
    item_name: str
    quantity_needed: float
    uom: str
    warehouse: Optional[str]
    lots: List[PullSheetLot]
    status: str  # SUFFICIENT, INSUFFICIENT, NOT_LINKED
    shortfall: Optional[float]

class PullSheet(BaseModel):
    """Inventory Pull Sheet response"""
    order_id: str
    order_code: str
    event_date: Optional[str]
    pickup_deadline: Optional[str]
    items: List[PullSheetItem]
    total_items: int
    sufficient_count: int
    insufficient_count: int
    not_linked_count: int
    generated_at: str


@router.get("/{order_id}/pull-sheet", response_model=PullSheet)
async def generate_pull_sheet(
    order_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate Inventory Pull Sheet for an order.
    Links order items to inventory with FIFO lot selection.
    Shows stock availability and suggests purchases for shortfalls.
    """
    # Get order with items
    result = await db.execute(
        select(OrderModel)
        .options(selectinload(OrderModel.items))
        .where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status not in ['CONFIRMED', 'IN_PROGRESS']:
        raise HTTPException(
            status_code=400,
            detail=f"Pull sheet chềEtạo được cho đơn hàng đã xác nhận. Status hiện tại: {order.status}"
        )
    
    # Import inventory models
    from backend.modules.inventory.domain.models import (
        InventoryItemModel, InventoryStockModel, InventoryLotModel, RecipeModel, WarehouseModel
    )
    
    pull_items = []
    sufficient_count = 0
    insufficient_count = 0
    not_linked_count = 0
    
    for item in order.items:
        # First, try to find recipe mapping for this menu item
        recipe_ingredients = []
        
        if item.menu_item_id:
            # Query recipe table for ingredients
            recipe_result = await db.execute(
                select(RecipeModel)
                .where(
                    RecipeModel.tenant_id == tenant_id,
                    RecipeModel.menu_item_id == item.menu_item_id
                )
            )
            recipe_ingredients = recipe_result.scalars().all()
        
        # If no recipe found, try to search by name (fallback)
        if not recipe_ingredients:
            # Search inventory items by similar name
            inv_result = await db.execute(
                select(InventoryItemModel)
                .where(
                    InventoryItemModel.tenant_id == tenant_id,
                    InventoryItemModel.is_active == True
                )
                .limit(5)  # Get first 5 inventory items for demo
            )
            inventory_items = inv_result.scalars().all()
            
            if not inventory_items:
                # No inventory items at all
                pull_items.append(PullSheetItem(
                    inventory_item_id=None,
                    item_name=item.item_name,
                    quantity_needed=float(item.quantity or 1),
                    uom=item.uom or "bàn",
                    warehouse=None,
                    lots=[],
                    status="NOT_LINKED",
                    shortfall=None
                ))
                not_linked_count += 1
                continue
            
            # Show first inventory item as "potential match" with NOT_LINKED status
            # This helps user see what inventory exists
            pull_items.append(PullSheetItem(
                inventory_item_id=str(item.menu_item_id) if item.menu_item_id else None,
                item_name=f"{item.item_name} (chưa có công thức)",
                quantity_needed=float(item.quantity or 1),
                uom=item.uom or "bàn",
                warehouse="Cần thiết lập Recipe",
                lots=[],
                status="NOT_LINKED",
                shortfall=None
            ))
            not_linked_count += 1
            continue
        
        # Process each ingredient from recipe
        for recipe in recipe_ingredients:
            quantity_needed_for_item = float(recipe.quantity_per_unit) * float(item.quantity or 1)
            
            # Get lots for this specific ingredient using FIFO selection
            lots_result = await db.execute(
                select(InventoryLotModel)
                .where(
                    InventoryLotModel.tenant_id == tenant_id,
                    InventoryLotModel.item_id == recipe.ingredient_id,
                    InventoryLotModel.status == 'ACTIVE',
                    InventoryLotModel.remaining_quantity > 0
                )
                .order_by(InventoryLotModel.expiry_date.asc())  # FIFO by expiry
            )
            available_lots = lots_result.scalars().all()
            
            remaining_need = quantity_needed_for_item
            selected_lots = []
            total_available = 0
            
            for lot in available_lots:
                if remaining_need <= 0:
                    break
                
                pick_qty = min(float(lot.remaining_quantity), remaining_need)
                selected_lots.append(PullSheetLot(
                    lot_number=lot.lot_number,
                    expiry_date=lot.expiry_date.strftime("%d/%m/%Y") if lot.expiry_date else None,
                    available_qty=float(lot.remaining_quantity),
                    to_pick_qty=pick_qty
                ))
                remaining_need -= pick_qty
                total_available += float(lot.remaining_quantity)
            
            status = "SUFFICIENT" if remaining_need <= 0 else "INSUFFICIENT"
            shortfall = remaining_need if remaining_need > 0 else None
            
            if status == "SUFFICIENT":
                sufficient_count += 1
            else:
                insufficient_count += 1
            
            # Get warehouse name
            warehouse_name = "Kho chính"
            if available_lots:
                wh_result = await db.execute(
                    select(WarehouseModel.name)
                    .where(WarehouseModel.id == available_lots[0].warehouse_id)
                )
                wh_name = wh_result.scalar_one_or_none()
                if wh_name:
                    warehouse_name = wh_name
            
            pull_items.append(PullSheetItem(
                inventory_item_id=str(recipe.ingredient_id),
                item_name=f"{recipe.ingredient_name} (cho {item.item_name})",
                quantity_needed=quantity_needed_for_item,
                uom=recipe.uom,
                warehouse=warehouse_name,
                lots=selected_lots,
                status=status,
                shortfall=shortfall
            ))
    
    # Calculate pickup deadline (T-1 day before event)
    pickup_deadline = None
    if order.event_date:
        from datetime import timedelta
        deadline = order.event_date - timedelta(days=1)
        pickup_deadline = deadline.strftime("%d/%m/%Y 16:00")
    
    return PullSheet(
        order_id=str(order.id),
        order_code=order.code,
        event_date=order.event_date.strftime("%d/%m/%Y") if order.event_date else None,
        pickup_deadline=pickup_deadline,
        items=pull_items,
        total_items=len(pull_items),
        sufficient_count=sufficient_count,
        insufficient_count=insufficient_count,
        not_linked_count=not_linked_count,
        generated_at=datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")
    )


# ============ MENU DOCX GENERATION ============

from fastapi.responses import StreamingResponse

@router.get("/{order_id}/menu-docx")
async def generate_menu_docx(
    order_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a .docx menu card for the order.
    Uses the Word template ('menu mẫu.docx') and replaces dish names.
    Returns a downloadable .docx file.
    """
    # Get order with items
    result = await db.execute(
        select(OrderModel)
        .options(selectinload(OrderModel.items))
        .where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if not order.items:
        raise HTTPException(status_code=400, detail="Đơn hàng chưa có món ăn")

    # Extract dish names, excluding SERVICE items (e.g., bàn ghế, nhân viên)
    # BUGFIX: BUG-20260219-003 — Service items should not appear on menu card
    # order_items.category = 'SERVICE' for non-food items (bàn ghế, nhân viên, etc.)
    dish_names = [
        item.item_name for item in order.items
        if item.category != 'SERVICE'
    ]

    # Generate the menu .docx
    try:
        from backend.modules.order.application.menu_generator import generate_menu_docx as gen_menu
        docx_buffer = gen_menu(dish_names)
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=f"Template không tìm thấy: {str(e)}")
    except Exception as e:
        logger.error(f"Menu generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi tạo thực đơn: {str(e)}")

    # Return as downloadable file
    safe_code = order.code.replace("/", "-") if order.code else "menu"
    filename = f"ThucDon-{safe_code}.docx"

    return StreamingResponse(
        docx_buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


# ============ CONTRACT DOCX GENERATION ============

@router.get("/{order_id}/contract-docx")
async def generate_contract_docx_endpoint(
    order_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a .docx contract for the order.
    Uses the Word template ('HDDV Giao Tuyet Template.docx') and fills in order data.
    Returns a downloadable .docx file.
    """
    # Get order with items and payments
    result = await db.execute(
        select(OrderModel)
        .options(
            selectinload(OrderModel.items),
            selectinload(OrderModel.payments)
        )
        .where(
            (OrderModel.id == order_id) &
            (OrderModel.tenant_id == tenant_id)
        )
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Calculate contract data
    # Table count = quantity of first food item (all food items share same qty = number of tables)
    food_items = [item for item in order.items if item.category != 'SERVICE']
    table_count = food_items[0].quantity if food_items else 0

    # Dish names (food only)
    dish_names = [item.item_name for item in order.items if item.category != 'SERVICE']

    # Financial calculations
    total_amount = int(order.final_amount or order.total_amount or 0)
    deposit_amount = int(order.paid_amount or 0)
    remaining_amount = total_amount - deposit_amount
    unit_price_per_table = total_amount // table_count if table_count > 0 else 0

    # Customer address: use event_address as fallback
    customer_address = order.event_address or ''

    # Build contract data
    from backend.modules.order.application.contract_generator import ContractData, generate_contract_docx

    contract_data = ContractData(
        order_code=order.code or '',
        customer_name=order.customer_name or '',
        customer_phone=order.customer_phone or '',
        customer_address=customer_address,
        event_date=order.event_date,
        event_time=order.event_time,
        event_address=order.event_address or '',
        table_count=table_count,
        dish_names=dish_names,
        unit_price_per_table=unit_price_per_table,
        total_amount=total_amount,
        deposit_amount=deposit_amount,
        remaining_amount=remaining_amount,
    )

    try:
        docx_buffer = generate_contract_docx(contract_data)
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=f"Template không tìm thấy: {str(e)}")
    except Exception as e:
        logger.error(f"Contract generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi tạo hợp đồng: {str(e)}")

    # Return as downloadable file
    safe_code = order.code.replace("/", "-") if order.code else "contract"
    filename = f"HopDong-{safe_code}.docx"

    return StreamingResponse(
        docx_buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
