from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from decimal import Decimal


class OrderItemBase(BaseModel):
    """Base schema for Order Item"""
    menu_item_id: Optional[UUID] = None
    item_name: str
    category: Optional[str] = None
    description: Optional[str] = None
    uom: str = 'bàn'
    quantity: int = 1
    unit_price: Decimal
    cost_price: Decimal = Decimal(0)  # Unit cost for profit calculation
    total_price: Decimal
    note: Optional[str] = None


class OrderItem(OrderItemBase):
    """Full schema for Order Item"""
    id: UUID
    order_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


class OrderPaymentBase(BaseModel):
    """Base schema for Order Payment"""
    amount: Decimal
    payment_method: str = 'CASH'  # CASH, TRANSFER, CARD
    reference_no: Optional[str] = None
    note: Optional[str] = None


class OrderPayment(OrderPaymentBase):
    """Full schema for Order Payment"""
    id: UUID
    order_id: UUID
    payment_date: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class OrderBase(BaseModel):
    """Base schema for Order creation/update"""
    quote_id: Optional[UUID] = None
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    event_type: Optional[str] = None
    event_date: Optional[datetime] = None
    event_time: Optional[str] = None
    event_address: Optional[str] = None
    total_amount: Decimal = Decimal(0)
    discount_amount: Decimal = Decimal(0)
    vat_rate: Decimal = Decimal(10)
    vat_amount: Decimal = Decimal(0)
    final_amount: Decimal = Decimal(0)
    status: str = 'PENDING'
    note: Optional[str] = None


class Order(OrderBase):
    """Full schema for Order"""
    id: UUID
    tenant_id: UUID
    code: str
    paid_amount: Decimal = Decimal(0)
    balance_amount: Decimal = Decimal(0)
    expenses_amount: Decimal = Decimal(0)  # R1: Order Cost Tracking
    cost_amount: Decimal = Decimal(0)  # BUG-20260203-002: Total cost for profit calculation
    confirmed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Nested items and payments
    items: List[OrderItem] = []
    payments: List[OrderPayment] = []
    
    class Config:
        from_attributes = True


class OrderStats(BaseModel):
    """Order statistics summary"""
    total_orders: int
    pending_orders: int
    confirmed_orders: int
    completed_orders: int
    cancelled_orders: int
    total_revenue: Decimal
    total_paid: Decimal
    total_balance: Decimal


class PaginatedOrderResponse(BaseModel):
    """Paginated response for orders list - ISS-001 fix"""
    items: List[Order]
    total: int
    page: int
    page_size: int
    total_pages: int


class OrderPnL(BaseModel):
    """R3: Order Profit & Loss summary"""
    order_id: UUID
    order_code: str
    customer_name: Optional[str] = None
    revenue: Decimal  # paid_amount
    expenses: Decimal  # expenses_amount
    profit: Decimal  # revenue - expenses
    margin_percent: Decimal  # (profit / revenue) * 100

