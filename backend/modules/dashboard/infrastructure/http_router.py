from fastapi import APIRouter
from typing import List
from uuid import UUID
from datetime import datetime, timedelta
from decimal import Decimal

from backend.modules.dashboard.domain.dtos import DashboardOverview, ActivityItem, UpcomingEvent, DashboardStats

router = APIRouter(tags=["Dashboard KPI"])

@router.get("/dashboard/overview", response_model=DashboardOverview)
async def get_overview():
    """Get KPI Overview for Homepage"""
    # Mock data - replace with actual DB queries
    return DashboardOverview(
        revenue_month=Decimal(157500000),
        revenue_trend=12.5,
        orders_pending=5,
        orders_trend=2,
        customers_total=48,
        customers_new=7,
        events_upcoming=8,
        events_today=2
    )

@router.get("/dashboard/activity", response_model=List[ActivityItem])
async def get_activity(limit: int = 10):
    """Get recent activity feed"""
    # Mock activity data
    return [
        ActivityItem(
            id=UUID("11111111-1111-1111-1111-111111111111"),
            type="ORDER_CONFIRMED",
            title="Đơn hàng #ORD-2401-005 đã xác nhận",
            description="Tiệc cưới Anh Nam - Chị Hà",
            timestamp=datetime.utcnow() - timedelta(minutes=5),
            icon="📦"
        ),
        ActivityItem(
            id=UUID("22222222-2222-2222-2222-222222222222"),
            type="QUOTE_SENT",
            title="Báo giá gửi khách hàng",
            description="Chị Lan - Sinh nhật 50 tuổi",
            timestamp=datetime.utcnow() - timedelta(minutes=15),
            icon="📋"
        ),
        ActivityItem(
            id=UUID("33333333-3333-3333-3333-333333333333"),
            type="STAFF_CHECKIN",
            title="Nhân viên check-in",
            description="Nguyễn Văn Bếp - Tiệc Quận 7",
            timestamp=datetime.utcnow() - timedelta(minutes=30),
            icon="👨‍🍳"
        ),
        ActivityItem(
            id=UUID("44444444-4444-4444-4444-444444444444"),
            type="EVENT_COMPLETED",
            title="Tiệc hoàn thành",
            description="Đám cưới Anh Tuấn - Quận 2",
            timestamp=datetime.utcnow() - timedelta(hours=2),
            icon="✅"
        )
    ][:limit]

@router.get("/dashboard/upcoming-events", response_model=List[UpcomingEvent])
async def get_upcoming_events(limit: int = 5):
    """Get upcoming events for dashboard"""
    return [
        UpcomingEvent(
            id=UUID("55555555-5555-5555-5555-555555555555"),
            name="Đám cưới Anh Nam",
            date=datetime.utcnow() + timedelta(days=1),
            customer_name="Anh Nam - Chị Hà",
            status="CONFIRMED"
        ),
        UpcomingEvent(
            id=UUID("66666666-6666-6666-6666-666666666666"),
            name="Sinh nhật 50 tuổi",
            date=datetime.utcnow() + timedelta(days=3),
            customer_name="Chị Lan",
            status="PENDING"
        ),
        UpcomingEvent(
            id=UUID("77777777-7777-7777-7777-777777777777"),
            name="Tiệc công ty ABC",
            date=datetime.utcnow() + timedelta(days=5),
            customer_name="Công ty ABC",
            status="CONFIRMED"
        )
    ][:limit]


@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics for frontend"""
    # TODO: Replace with actual DB queries
    return DashboardStats(
        total_orders=156,
        total_revenue=Decimal(2450000000),
        pending_orders=12,
        customers_count=89,
        orders_today=5,
        revenue_today=Decimal(125000000)
    )
