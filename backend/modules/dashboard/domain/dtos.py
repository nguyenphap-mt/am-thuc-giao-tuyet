from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from decimal import Decimal

class DashboardOverview(BaseModel):
    """KPI Overview Stats for Homepage"""
    revenue_month: Decimal  # Total revenue this month
    revenue_trend: float    # % change vs last month
    orders_pending: int     # Pending orders count
    orders_trend: int       # +/- vs yesterday
    customers_total: int    # Total customers
    customers_new: int      # New this month
    events_upcoming: int    # Events in next 7 days
    events_today: int       # Events today

class ActivityItem(BaseModel):
    """Single activity log item"""
    id: UUID
    type: str               # ORDER_CREATED, QUOTE_SENT, EVENT_COMPLETED
    title: str
    description: str
    timestamp: datetime
    icon: str               # Emoji or icon name

class UpcomingEvent(BaseModel):
    """Mini event for dashboard"""
    id: UUID
    name: str
    date: datetime
    customer_name: str
    status: str


class DashboardStats(BaseModel):
    """Dashboard statistics for frontend"""
    total_orders: int
    total_revenue: Decimal
    pending_orders: int
    customers_count: int
    orders_today: int
    revenue_today: Decimal
