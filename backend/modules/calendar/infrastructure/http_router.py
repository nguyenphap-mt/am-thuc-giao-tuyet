"""
Calendar Module - Unified Calendar API
Aggregates events from Orders and HR (leaves, shifts, timesheets)
into a single calendar view.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast, Date, and_

from backend.core.database import get_db
from backend.core.dependencies import get_current_tenant

router = APIRouter(tags=["Calendar Operations"])


@router.get("/events")
async def get_calendar_events(
    from_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    event_types: str = Query("all", description="Filter: all, orders, leaves, shifts"),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Unified calendar API - aggregates events from multiple sources:
    1. Orders (event_date) - Upcoming parties/events
    2. HR Leaves - Employee leave requests
    3. HR Staff Assignments - Staff shifts for orders
    """
    try:
        start_date = datetime.strptime(from_date, "%Y-%m-%d").date()
        end_date = datetime.strptime(to_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    events = []

    # 1. Orders with event_date in range
    if event_types in ["all", "orders"]:
        from backend.modules.order.domain.models import OrderModel

        order_query = (
            select(OrderModel)
            .where(
                OrderModel.tenant_id == tenant_id,
                OrderModel.status.notin_(['CANCELLED']),
                OrderModel.event_date.isnot(None),
                cast(OrderModel.event_date, Date) >= start_date,
                cast(OrderModel.event_date, Date) <= end_date
            )
            .order_by(OrderModel.event_date)
        )

        order_result = await db.execute(order_query)
        orders = order_result.scalars().all()

        # Map order status to colors
        ORDER_COLORS = {
            'PENDING': '#F59E0B',      # Amber
            'CONFIRMED': '#10B981',    # Green
            'IN_PROGRESS': '#3B82F6',  # Blue
            'ON_HOLD': '#F97316',      # Orange
            'COMPLETED': '#6B7280',    # Gray
            'PAID': '#8B5CF6',         # Purple
        }

        for order in orders:
            event_date_str = str(order.event_date.date()) if order.event_date else None
            events.append({
                "id": str(order.id),
                "type": "ORDER",
                "title": f"{order.code} - {order.customer_name or 'N/A'}",
                "start_date": event_date_str,
                "end_date": event_date_str,
                "start_time": order.event_time,
                "all_day": not bool(order.event_time),
                "color": ORDER_COLORS.get(order.status, '#6B7280'),
                "status": order.status,
                "details": {
                    "order_id": str(order.id),
                    "order_code": order.code,
                    "customer_name": order.customer_name,
                    "customer_phone": order.customer_phone,
                    "event_type": order.event_type,
                    "event_address": order.event_address,
                    "final_amount": float(order.final_amount or 0),
                    "paid_amount": float(order.paid_amount or 0),
                    "balance_amount": float(order.balance_amount or 0),
                    "guest_count": None,  # Will add if available
                }
            })

    # 2. HR Leave Requests
    if event_types in ["all", "leaves"]:
        try:
            from backend.modules.hr.domain.models import LeaveRequestModel, LeaveTypeModel
            from backend.modules.hr.domain.models import EmployeeModel

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
                    "color": "#EF4444" if leave.status == "APPROVED" else "#FCD34D",
                    "status": leave.status,
                    "details": {
                        "employee_id": str(emp.id),
                        "employee_name": emp.full_name,
                        "leave_type": leave_type.name,
                        "total_days": float(leave.total_days),
                        "reason": leave.reason
                    }
                })
        except Exception:
            pass  # HR module may not be available

    # 3. Staff Assignments (Shifts)
    if event_types in ["all", "shifts"]:
        try:
            from backend.modules.order.domain.models import OrderModel, OrderStaffAssignmentModel
            from backend.modules.hr.domain.models import EmployeeModel

            assignment_query = (
                select(OrderStaffAssignmentModel, OrderModel, EmployeeModel)
                .join(OrderModel, OrderStaffAssignmentModel.order_id == OrderModel.id)
                .outerjoin(EmployeeModel, OrderStaffAssignmentModel.staff_id == EmployeeModel.id)
                .where(
                    OrderStaffAssignmentModel.tenant_id == tenant_id,
                    OrderModel.status.in_(['PENDING', 'CONFIRMED', 'IN_PROGRESS']),
                    OrderModel.event_date.isnot(None),
                    cast(OrderModel.event_date, Date) >= start_date,
                    cast(OrderModel.event_date, Date) <= end_date
                )
            )

            assignment_result = await db.execute(assignment_query)
            for row in assignment_result.all():
                assignment, order, emp = row
                emp_name = emp.full_name if emp else "Chưa phân công"
                event_date_str = str(order.event_date.date()) if order.event_date else None
                events.append({
                    "id": str(assignment.id),
                    "type": "SHIFT",
                    "title": f"{emp_name} - {order.code}",
                    "start_date": event_date_str,
                    "end_date": event_date_str,
                    "start_time": order.event_time,
                    "all_day": False,
                    "color": "#3B82F6",
                    "status": "CONFIRMED" if assignment.confirmed else "PENDING",
                    "details": {
                        "order_id": str(order.id),
                        "order_code": order.code,
                        "role": assignment.role,
                        "event_address": order.event_address,
                        "customer_name": order.customer_name,
                        "employee_id": str(assignment.staff_id),
                        "employee_name": emp_name,
                    }
                })
        except Exception:
            pass  # Graceful fallback

    return {
        "events": events,
        "total": len(events),
        "from_date": from_date,
        "to_date": to_date
    }


@router.get("/stats")
async def get_calendar_stats(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2100),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Get calendar statistics for a given month."""
    from calendar import monthrange
    from backend.modules.order.domain.models import OrderModel

    _, days_in_month = monthrange(year, month)
    start_date = date(year, month, 1)
    end_date = date(year, month, days_in_month)

    # Count orders in this month
    order_query = (
        select(OrderModel)
        .where(
            OrderModel.tenant_id == tenant_id,
            OrderModel.status.notin_(['CANCELLED']),
            OrderModel.event_date.isnot(None),
            cast(OrderModel.event_date, Date) >= start_date,
            cast(OrderModel.event_date, Date) <= end_date
        )
    )

    result = await db.execute(order_query)
    orders = result.scalars().all()

    total_revenue = sum(float(o.final_amount or 0) for o in orders)
    pending_count = len([o for o in orders if o.status == 'PENDING'])
    confirmed_count = len([o for o in orders if o.status in ['CONFIRMED', 'IN_PROGRESS']])
    completed_count = len([o for o in orders if o.status in ['COMPLETED', 'PAID']])

    return {
        "month": month,
        "year": year,
        "total_orders": len(orders),
        "total_revenue": total_revenue,
        "pending_count": pending_count,
        "confirmed_count": confirmed_count,
        "completed_count": completed_count,
    }
