"""
SQLAlchemy ORM Models for Quote Module
Database: PostgreSQL (catering_db)
"""

from sqlalchemy import Column, String, Text, Boolean, Integer, Numeric, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from backend.core.database import Base


class QuoteModel(Base):
    """SQLAlchemy ORM Model for Quote (Báo giá)"""
    __tablename__ = "quotes"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS - MANDATORY)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Quote Code (auto-generated: BG-2026XXXX)
    code = Column(String(50), nullable=False, unique=True)
    
    # Customer Info
    customer_id = Column(UUID(as_uuid=True), nullable=True)
    customer_name = Column(String(255))
    customer_phone = Column(String(50))
    customer_email = Column(String(255))
    
    # Event Info
    event_type = Column(String(100))
    event_date = Column(DateTime(timezone=True))
    event_time = Column(String(20))
    event_address = Column(Text)
    guest_count = Column(Integer, default=0)
    table_count = Column(Integer, default=0)
    staff_count = Column(Integer, default=0)
    
    # Pricing
    subtotal = Column(Numeric(15, 2), default=0)
    
    # Discounts (Percent)
    discount_furniture_percent = Column(Numeric(5, 2), default=0)
    discount_staff_percent = Column(Numeric(5, 2), default=0)
    discount_total_percent = Column(Numeric(5, 2), default=0)
    
    # VAT
    is_vat_inclusive = Column(Boolean, default=False) # True = VAT Applied
    vat_rate = Column(Numeric(5, 2), default=10)
    vat_amount = Column(Numeric(15, 2), default=0)
    
    total_amount = Column(Numeric(15, 2), default=0)
    
    # Status: DRAFT, PENDING, APPROVED, REJECTED, CONVERTED
    status = Column(String(20), default='DRAFT')
    valid_until = Column(DateTime(timezone=True))
    
    # Notes
    notes = Column(Text)
    
    # Audit
    created_by = Column(UUID(as_uuid=True))
    updated_by = Column(UUID(as_uuid=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Convert Audit Trail
    converted_by = Column(UUID(as_uuid=True), nullable=True)  # User ID who converted to Order
    converted_at = Column(DateTime(timezone=True), nullable=True)  # Timestamp when converted
    
    # Lost/Expired Status (PRD-QUOTE-LOST-001)
    lost_reason = Column(String(500), nullable=True)  # Reason why quote was lost
    lost_at = Column(DateTime(timezone=True), nullable=True)  # Timestamp when marked as lost
    expired_at = Column(DateTime(timezone=True), nullable=True)  # Timestamp when quote expired
    
    # Revision Tracking (Order Amendment Feature)
    replaces_order_id = Column(UUID(as_uuid=True), nullable=True)  # Order ID this quote will replace when converted
    
    # Relationships
    items = relationship("QuoteItemModel", back_populates="quote", cascade="all, delete-orphan")
    services = relationship("QuoteServiceModel", back_populates="quote", cascade="all, delete-orphan")


class QuoteItemModel(Base):
    """SQLAlchemy ORM Model for Quote Item (Chi tiết món ăn)"""
    __tablename__ = "quote_items"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Quote reference
    quote_id = Column(UUID(as_uuid=True), ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False)
    
    # Menu Item Reference
    menu_item_id = Column(UUID(as_uuid=True), ForeignKey("menu_items.id"), nullable=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    
    # Item Info
    item_name = Column(String(255), nullable=False)
    description = Column(Text)
    uom = Column(String(50))
    
    # Pricing
    quantity = Column(Integer, default=1)
    unit_price = Column(Numeric(15, 2), default=0)
    total_price = Column(Numeric(15, 2), default=0)
    
    # Notes
    note = Column(Text)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationship
    quote = relationship("QuoteModel", back_populates="items")


class QuoteServiceModel(Base):
    """SQLAlchemy ORM Model for Quote Service (Dịch vụ: bàn ghế, nhân viên)"""
    __tablename__ = "quote_services"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Quote reference
    quote_id = Column(UUID(as_uuid=True), ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False)
    
    # Service Info
    service_type = Column(String(50), nullable=False)  # FURNITURE, STAFF, DECORATION
    service_name = Column(String(255), nullable=False)
    
    # Pricing
    quantity = Column(Integer, default=1)
    unit_price = Column(Numeric(15, 2), default=0)
    total_price = Column(Numeric(15, 2), default=0)
    
    # Notes
    note = Column(Text)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    quote = relationship("QuoteModel", back_populates="services")


class QuoteNotePresetModel(Base):
    """SQLAlchemy ORM Model for Quote Note Presets (Ghi chú mẫu)"""
    __tablename__ = "quote_note_presets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# Phase 14.1: Quote Templates
from sqlalchemy.dialects.postgresql import JSONB

class QuoteTemplateModel(Base):
    """SQLAlchemy ORM Model for Quote Template (Mẫu báo giá)"""
    __tablename__ = "quote_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Template Info
    name = Column(String(255), nullable=False)
    event_type = Column(String(100))
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    
    # Template Data (JSONB)
    items = Column(JSONB, default=[])      # [{menu_item_id, name, category, quantity, unit_price}]
    services = Column(JSONB, default=[])   # [{name, type, quantity, unit_price}]
    
    # Defaults
    default_table_count = Column(Integer)
    default_guests_per_table = Column(Integer, default=10)
    default_notes = Column(Text)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True))


