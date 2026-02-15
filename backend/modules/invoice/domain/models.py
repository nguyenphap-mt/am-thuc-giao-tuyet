"""
SQLAlchemy ORM Models for Invoice Module
Database: PostgreSQL (catering_db)
"""

from sqlalchemy import Column, String, Text, Integer, Numeric, ForeignKey, DateTime, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from backend.core.database import Base


class InvoiceModel(Base):
    """SQLAlchemy ORM Model for Invoice (Hóa đơn VAT)"""
    __tablename__ = "invoices"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS - MANDATORY)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Invoice Code (auto-generated: HD-2026XXXX)
    code = Column(String(50), nullable=False)
    
    # Source Order
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    
    # Customer Info (denormalized)
    customer_name = Column(String(255), nullable=False)
    customer_address = Column(Text)
    customer_tax_code = Column(String(50))
    customer_phone = Column(String(50))
    
    # Invoice Details
    invoice_date = Column(Date, nullable=False, server_default=func.current_date())
    due_date = Column(Date)
    
    # Amounts
    subtotal = Column(Numeric(15, 2), default=0)
    discount_amount = Column(Numeric(15, 2), default=0)
    vat_rate = Column(Numeric(5, 2), default=10)
    vat_amount = Column(Numeric(15, 2), default=0)
    total_amount = Column(Numeric(15, 2), default=0)
    
    # Payment Info
    paid_amount = Column(Numeric(15, 2), default=0)
    payment_status = Column(String(20), default='UNPAID')  # UNPAID, PARTIAL, PAID
    
    # Status: DRAFT, ISSUED, CANCELLED
    status = Column(String(20), default='DRAFT')
    
    # Notes
    notes = Column(Text)
    
    # Audit
    created_by = Column(UUID(as_uuid=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    items = relationship("InvoiceItemModel", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceItemModel(Base):
    """SQLAlchemy ORM Model for Invoice Item (Chi tiết hóa đơn)"""
    __tablename__ = "invoice_items"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Invoice reference
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    
    # Item Info
    item_name = Column(String(255), nullable=False)
    description = Column(Text)
    uom = Column(String(50), default="Món")
    
    # Pricing
    quantity = Column(Integer, default=1)
    unit_price = Column(Numeric(15, 2), default=0)
    discount_percent = Column(Numeric(5, 2), default=0)
    vat_rate = Column(Numeric(5, 2), default=10)
    total_price = Column(Numeric(15, 2), default=0)
    
    # Sort
    sort_order = Column(Integer, default=0)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    invoice = relationship("InvoiceModel", back_populates="items")
