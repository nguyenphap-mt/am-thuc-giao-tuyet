"""
SQLAlchemy ORM Models for Order Module
Database: PostgreSQL (catering_db)
"""

from sqlalchemy import Column, String, Text, Boolean, Integer, Numeric, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from backend.core.database import Base


class OrderModel(Base):
    """SQLAlchemy ORM Model for Order (Đơn hàng)"""
    __tablename__ = "orders"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS - MANDATORY)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Order Code (auto-generated: DH-2026XXXX)
    code = Column(String(50), nullable=False)
    
    # Source Quote (optional)
    quote_id = Column(UUID(as_uuid=True), ForeignKey("quotes.id"), nullable=True)
    
    # Customer Info
    customer_id = Column(UUID(as_uuid=True), nullable=True)
    customer_name = Column(String(255))
    customer_phone = Column(String(50))
    
    # Event Info
    event_type = Column(String(100))
    event_date = Column(DateTime(timezone=True))
    event_time = Column(String(10))  # HH:mm format
    event_address = Column(Text)
    
    # Pricing
    total_amount = Column(Numeric(15, 2), default=0)
    discount_amount = Column(Numeric(15, 2), default=0)
    vat_rate = Column(Numeric(5, 2), default=10)
    vat_amount = Column(Numeric(15, 2), default=0)
    final_amount = Column(Numeric(15, 2), default=0)
    
    # Payment Tracking
    paid_amount = Column(Numeric(15, 2), default=0)
    balance_amount = Column(Numeric(15, 2), default=0)
    expenses_amount = Column(Numeric(15, 2), default=0)  # R1: Order Cost Tracking
    cost_amount = Column(Numeric(15, 2), default=0)  # Total cost from menu item cost_prices
    
    # Status: PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, PAID, CANCELLED
    status = Column(String(20), default='PENDING')
    
    # Notes
    note = Column(Text)
    
    # Status Timestamps
    confirmed_at = Column(DateTime(timezone=True))
    started_at = Column(DateTime(timezone=True))  # When status changed to IN_PROGRESS
    completed_at = Column(DateTime(timezone=True))
    
    # Revision Tracking (Order Amendment Feature)
    replaced_by_order_id = Column(UUID(as_uuid=True), nullable=True)  # New order that replaced this one
    replaces_order_id = Column(UUID(as_uuid=True), nullable=True)  # Old order this one replaced
    cancel_reason = Column(Text, nullable=True)  # Reason: "Thay thế bởi DH-XXXX"
    
    # Cancellation with Refund Tracking
    cancellation_type = Column(String(30), nullable=True)  # FULL_REFUND, PARTIAL_REFUND, NO_REFUND, FORCE_MAJEURE
    refund_amount = Column(Numeric(15, 2), default=0)
    cancelled_at = Column(DateTime(timezone=True))
    cancelled_by = Column(UUID(as_uuid=True), nullable=True)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    items = relationship("OrderItemModel", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("OrderPaymentModel", back_populates="order", cascade="all, delete-orphan")
    staff_assignments = relationship("OrderStaffAssignmentModel", back_populates="order", cascade="all, delete-orphan")


class OrderItemModel(Base):
    """SQLAlchemy ORM Model for Order Item (Chi tiết đơn hàng)"""
    __tablename__ = "order_items"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Order reference
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    
    # Menu Item Reference
    menu_item_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Item Info
    item_name = Column(String(255), nullable=False)
    category = Column(String(100))  # Khai vị, Món chính, Tráng miệng
    description = Column(Text)
    uom = Column(String(50), default='bàn')  # Unit of measure
    
    # Pricing
    quantity = Column(Integer, default=1)
    unit_price = Column(Numeric(15, 2), default=0)
    cost_price = Column(Numeric(15, 2), default=0)  # Unit cost for profit calculation
    total_price = Column(Numeric(15, 2), default=0)
    
    # Notes
    note = Column(Text)
    sort_order = Column(Integer, default=0)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    order = relationship("OrderModel", back_populates="items")


class OrderPaymentModel(Base):
    """SQLAlchemy ORM Model for Order Payment (Thanh toán đơn hàng)"""
    __tablename__ = "order_payments"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Order reference
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    
    # Payment Info
    amount = Column(Numeric(15, 2), nullable=False)
    payment_method = Column(String(50), default='CASH')  # CASH, TRANSFER, CARD
    payment_date = Column(DateTime(timezone=True), server_default=func.now())
    reference_no = Column(String(100))  # Bank transfer reference
    
    # Notes
    note = Column(Text)
    
    # Transfer Tracking (Deposit Transfer Feature)
    transfer_from_order_id = Column(UUID(as_uuid=True), nullable=True)  # Original order if transferred
    is_transferred = Column(Boolean, default=False)  # True if payment moved to another order
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    order = relationship("OrderModel", back_populates="payments")


class OrderStaffAssignmentModel(Base):
    """SQLAlchemy ORM Model for Order Staff Assignments (Phân công nhân viên)"""
    __tablename__ = "order_staff_assignments"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Order reference
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    
    # Staff reference
    staff_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Role: LEAD (Trưởng ca), SERVER (Phục vụ), KITCHEN (Bếp), DRIVER (Lái xe)
    role = Column(String(50), default='SERVER')
    
    # Confirmation status
    confirmed = Column(Boolean, default=False)
    
    # Notes
    note = Column(Text)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationship
    order = relationship("OrderModel", back_populates="staff_assignments")

