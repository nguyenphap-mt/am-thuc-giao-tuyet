"""
Dashboard Module HTTP Router - Real PostgreSQL Queries
BUGFIX: BUG-20260218-004 — Dashboard KPIs showing mock data instead of real Supabase data
"""
from fastapi import APIRouter, Depends
from typing import List
from uuid import UUID
from datetime import datetime, timedelta, date
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from backend.core.database import get_db
from backend.modules.dashboard.domain.dtos import (
    DashboardOverview, ActivityItem, UpcomingEvent, DashboardStats,
    RevenueChartItem, OrdersChartItem
)

router = APIRouter(tags=["Dashboard KPI"])

# Default tenant for development
DEFAULT_TENANT_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"


@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """Get dashboard statistics from real database"""
    tid = DEFAULT_TENANT_ID

    # Total orders (exclude CANCELLED)
    total_orders_result = await db.execute(
        text("SELECT COUNT(*) FROM orders WHERE tenant_id = :tid AND status != 'CANCELLED'"),
        {"tid": tid}
    )
    total_orders = total_orders_result.scalar() or 0

    # Total revenue (final_amount from non-cancelled orders)
    total_revenue_result = await db.execute(
        text("SELECT COALESCE(SUM(final_amount), 0) FROM orders WHERE tenant_id = :tid AND status != 'CANCELLED'"),
        {"tid": tid}
    )
    total_revenue = total_revenue_result.scalar() or Decimal(0)

    # Pending orders (status = PENDING)
    pending_result = await db.execute(
        text("SELECT COUNT(*) FROM orders WHERE tenant_id = :tid AND status = 'PENDING'"),
        {"tid": tid}
    )
    pending_orders = pending_result.scalar() or 0

    # Total customers
    customers_result = await db.execute(
        text("SELECT COUNT(*) FROM customers WHERE tenant_id = :tid"),
        {"tid": tid}
    )
    customers_count = customers_result.scalar() or 0

    # Orders today (based on created_at, using Vietnam timezone UTC+7)
    today_result = await db.execute(
        text("""
            SELECT COUNT(*), COALESCE(SUM(final_amount), 0)
            FROM orders 
            WHERE tenant_id = :tid 
            AND status != 'CANCELLED'
            AND created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' >= CURRENT_DATE AT TIME ZONE 'Asia/Ho_Chi_Minh'
        """),
        {"tid": tid}
    )
    today_row = today_result.fetchone()
    orders_today = today_row[0] if today_row else 0
    revenue_today = today_row[1] if today_row else Decimal(0)

    return DashboardStats(
        total_orders=total_orders,
        total_revenue=total_revenue,
        pending_orders=pending_orders,
        customers_count=customers_count,
        orders_today=orders_today,
        revenue_today=revenue_today
    )


@router.get("/dashboard/overview", response_model=DashboardOverview)
async def get_overview(db: AsyncSession = Depends(get_db)):
    """Get KPI Overview for Homepage — real data"""
    tid = DEFAULT_TENANT_ID

    # Revenue this month
    revenue_month_result = await db.execute(
        text("""
            SELECT COALESCE(SUM(final_amount), 0) 
            FROM orders 
            WHERE tenant_id = :tid 
            AND status NOT IN ('CANCELLED')
            AND created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' >= date_trunc('month', CURRENT_DATE AT TIME ZONE 'Asia/Ho_Chi_Minh')
        """),
        {"tid": tid}
    )
    revenue_month = revenue_month_result.scalar() or Decimal(0)

    # Revenue last month (for trend calculation)
    revenue_last_month_result = await db.execute(
        text("""
            SELECT COALESCE(SUM(final_amount), 0) 
            FROM orders 
            WHERE tenant_id = :tid 
            AND status NOT IN ('CANCELLED')
            AND created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' >= date_trunc('month', CURRENT_DATE AT TIME ZONE 'Asia/Ho_Chi_Minh') - INTERVAL '1 month'
            AND created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' < date_trunc('month', CURRENT_DATE AT TIME ZONE 'Asia/Ho_Chi_Minh')
        """),
        {"tid": tid}
    )
    revenue_last_month = revenue_last_month_result.scalar() or Decimal(0)
    revenue_trend = 0.0
    if revenue_last_month > 0:
        revenue_trend = round(float((revenue_month - revenue_last_month) / revenue_last_month * 100), 1)

    # Pending orders
    pending_result = await db.execute(
        text("SELECT COUNT(*) FROM orders WHERE tenant_id = :tid AND status = 'PENDING'"),
        {"tid": tid}
    )
    orders_pending = pending_result.scalar() or 0

    # Orders trend: today's new orders vs yesterday's
    orders_trend_result = await db.execute(
        text("""
            SELECT 
                (SELECT COUNT(*) FROM orders WHERE tenant_id = :tid AND created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' >= CURRENT_DATE AT TIME ZONE 'Asia/Ho_Chi_Minh') -
                (SELECT COUNT(*) FROM orders WHERE tenant_id = :tid 
                    AND created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' >= (CURRENT_DATE - 1) AT TIME ZONE 'Asia/Ho_Chi_Minh'
                    AND created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' < CURRENT_DATE AT TIME ZONE 'Asia/Ho_Chi_Minh')
        """),
        {"tid": tid}
    )
    orders_trend = orders_trend_result.scalar() or 0

    # Total customers
    customers_result = await db.execute(
        text("SELECT COUNT(*) FROM customers WHERE tenant_id = :tid"),
        {"tid": tid}
    )
    customers_total = customers_result.scalar() or 0

    # New customers this month
    new_customers_result = await db.execute(
        text("""
            SELECT COUNT(*) FROM customers 
            WHERE tenant_id = :tid
            AND created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' >= date_trunc('month', CURRENT_DATE AT TIME ZONE 'Asia/Ho_Chi_Minh')
        """),
        {"tid": tid}
    )
    customers_new = new_customers_result.scalar() or 0

    # Upcoming events in next 7 days
    events_upcoming_result = await db.execute(
        text("""
            SELECT COUNT(*) FROM orders 
            WHERE tenant_id = :tid 
            AND status NOT IN ('CANCELLED', 'COMPLETED', 'PAID')
            AND event_date >= NOW()
            AND event_date <= NOW() + INTERVAL '7 days'
        """),
        {"tid": tid}
    )
    events_upcoming = events_upcoming_result.scalar() or 0

    # Events today
    events_today_result = await db.execute(
        text("""
            SELECT COUNT(*) FROM orders 
            WHERE tenant_id = :tid 
            AND status NOT IN ('CANCELLED')
            AND event_date::date = CURRENT_DATE
        """),
        {"tid": tid}
    )
    events_today = events_today_result.scalar() or 0

    return DashboardOverview(
        revenue_month=revenue_month,
        revenue_trend=revenue_trend,
        orders_pending=orders_pending,
        orders_trend=orders_trend,
        customers_total=customers_total,
        customers_new=customers_new,
        events_upcoming=events_upcoming,
        events_today=events_today
    )


@router.get("/dashboard/revenue-chart", response_model=List[RevenueChartItem])
async def get_revenue_chart(days: int = 7, db: AsyncSession = Depends(get_db)):
    """Get revenue data for the last N days for chart visualization"""
    tid = DEFAULT_TENANT_ID

    result = await db.execute(
        text("""
            SELECT 
                (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS order_date,
                COALESCE(SUM(final_amount), 0) AS daily_revenue
            FROM orders
            WHERE tenant_id = :tid
            AND status NOT IN ('CANCELLED')
            AND created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' >= (CURRENT_DATE - :days) AT TIME ZONE 'Asia/Ho_Chi_Minh'
            GROUP BY order_date
            ORDER BY order_date
        """),
        {"tid": tid, "days": days}
    )
    rows = result.fetchall()

    # Build complete date range (fill gaps with 0)
    chart_data = []
    today = date.today()
    date_map = {row[0]: float(row[1]) for row in rows}

    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        chart_data.append(RevenueChartItem(
            date=d.strftime("%d/%m"),
            revenue=date_map.get(d, 0)
        ))

    return chart_data


@router.get("/dashboard/orders-chart", response_model=List[OrdersChartItem])
async def get_orders_chart(db: AsyncSession = Depends(get_db)):
    """Get order counts grouped by status for chart visualization"""
    tid = DEFAULT_TENANT_ID

    # Status config with Vietnamese labels and colors
    status_config = [
        ("PENDING", "Chờ xử lý", "#3b82f6"),
        ("CONFIRMED", "Xác nhận", "#8b5cf6"),
        ("IN_PROGRESS", "Đang thực hiện", "#f59e0b"),
        ("COMPLETED", "Hoàn thành", "#22c55e"),
        ("PAID", "Đã thanh toán", "#10b981"),
        ("CANCELLED", "Hủy", "#ef4444"),
    ]

    result = await db.execute(
        text("""
            SELECT status, COUNT(*) as cnt
            FROM orders
            WHERE tenant_id = :tid
            GROUP BY status
        """),
        {"tid": tid}
    )
    rows = result.fetchall()
    status_counts = {row[0]: row[1] for row in rows}

    chart_data = []
    for status_key, label, color in status_config:
        count = status_counts.get(status_key, 0)
        chart_data.append(OrdersChartItem(
            status=label,
            count=count,
            color=color
        ))

    return chart_data


@router.get("/dashboard/activity", response_model=List[ActivityItem])
async def get_activity(limit: int = 10, db: AsyncSession = Depends(get_db)):
    """Get recent activity from orders"""
    tid = DEFAULT_TENANT_ID

    # Get recent orders as activity items
    result = await db.execute(
        text("""
            SELECT id, code, customer_name, status, event_type, created_at, updated_at
            FROM orders
            WHERE tenant_id = :tid
            ORDER BY updated_at DESC NULLS LAST
            LIMIT :limit
        """),
        {"tid": tid, "limit": limit}
    )
    rows = result.fetchall()

    status_icons = {
        "PENDING": "🕐",
        "CONFIRMED": "✅",
        "IN_PROGRESS": "🔄",
        "COMPLETED": "🎉",
        "PAID": "💰",
        "CANCELLED": "❌",
    }
    status_labels = {
        "PENDING": "Đơn hàng mới",
        "CONFIRMED": "Đơn đã xác nhận",
        "IN_PROGRESS": "Đang thực hiện",
        "COMPLETED": "Đã hoàn thành",
        "PAID": "Đã thanh toán",
        "CANCELLED": "Đã hủy",
    }

    activities = []
    for row in rows:
        order_id, code, customer_name, status, event_type, created_at, updated_at = row
        activities.append(ActivityItem(
            id=order_id,
            type=f"ORDER_{status}",
            title=f"{status_labels.get(status, status)} — {code}",
            description=f"{customer_name or 'N/A'}{f' · {event_type}' if event_type else ''}",
            timestamp=updated_at or created_at,
            icon=status_icons.get(status, "📋")
        ))

    return activities


@router.get("/dashboard/upcoming-events", response_model=List[UpcomingEvent])
async def get_upcoming_events(limit: int = 5, db: AsyncSession = Depends(get_db)):
    """Get upcoming events from orders with future event_date"""
    tid = DEFAULT_TENANT_ID

    result = await db.execute(
        text("""
            SELECT id, code, event_date, customer_name, status
            FROM orders
            WHERE tenant_id = :tid
            AND status NOT IN ('CANCELLED', 'COMPLETED', 'PAID')
            AND event_date >= NOW()
            ORDER BY event_date ASC
            LIMIT :limit
        """),
        {"tid": tid, "limit": limit}
    )
    rows = result.fetchall()

    events = []
    for row in rows:
        order_id, code, event_date, customer_name, status = row
        events.append(UpcomingEvent(
            id=order_id,
            name=code,
            date=event_date,
            customer_name=customer_name or "N/A",
            status=status
        ))

    return events
