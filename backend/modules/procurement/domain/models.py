from sqlalchemy import Column, String, ForeignKey, DECIMAL, DateTime, Text, Integer, Boolean, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from backend.core.database import Base
import uuid


# =========================
# Purchase Requisition (Yêu cầu mua - chờ duyệt)
# =========================

class PurchaseRequisitionModel(Base):
    """
    Purchase Requisition - Phiếu yêu cầu mua hàng
    Phải được duyệt (APPROVED) trước khi chuyển thành Purchase Order
    """
    __tablename__ = "purchase_requisitions"
    __table_args__ = (
        UniqueConstraint('tenant_id', 'code', name='uq_pr_tenant_code'),
        Index('idx_pr_tenant_status', 'tenant_id', 'status'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    
    code = Column(String(50), nullable=False, unique=True)
    title = Column(String(255), nullable=False)
    status = Column(String(50), default='PENDING')  # PENDING, APPROVED, REJECTED, CONVERTED
    priority = Column(String(20), default='NORMAL')  # LOW, NORMAL, HIGH, URGENT
    
    requested_by = Column(UUID(as_uuid=True), nullable=True)  # User ID who requested
    approved_by = Column(UUID(as_uuid=True), nullable=True)   # User ID who approved
    approved_at = Column(DateTime(timezone=True))
    
    notes = Column(Text)
    total_amount = Column(DECIMAL(15, 2), default=0)
    
    # Reference to PO if converted
    converted_to_po_id = Column(UUID(as_uuid=True), nullable=True)
    converted_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    lines = relationship("PurchaseRequisitionLineModel", back_populates="requisition", cascade="all, delete-orphan")


class PurchaseRequisitionLineModel(Base):
    """Purchase Requisition Line - Chi tiết từng item trong PR"""
    __tablename__ = "purchase_requisition_lines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    pr_id = Column(UUID(as_uuid=True), ForeignKey("purchase_requisitions.id", ondelete="CASCADE"), nullable=False)
    
    line_number = Column(Integer, default=1)
    item_id = Column(UUID(as_uuid=True), ForeignKey("inventory_items.id", ondelete="SET NULL"), nullable=True)
    item_name = Column(String(255), nullable=False)
    item_sku = Column(String(50))
    
    quantity = Column(DECIMAL(15, 2), default=1)
    uom = Column(String(50))
    estimated_unit_price = Column(DECIMAL(15, 2), default=0)
    estimated_total = Column(DECIMAL(15, 2), default=0)
    
    notes = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    requisition = relationship("PurchaseRequisitionModel", back_populates="lines")
    item = relationship("backend.modules.inventory.domain.models.InventoryItemModel")


# =========================
# Existing Models
# =========================

class SupplierModel(Base):
    __tablename__ = "suppliers"
    __table_args__ = (
        Index('idx_supplier_category', 'tenant_id', 'category'),
        Index('idx_supplier_active', 'tenant_id', 'is_active'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(255), nullable=False)
    contact_person = Column(String(100))
    phone = Column(String(50))
    email = Column(String(255))
    address = Column(Text)
    tax_id = Column(String(50))
    category = Column(String(50), default='OTHER')  # FOOD, BEVERAGE, EQUIPMENT, SERVICE, OTHER
    website = Column(String(255))
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    payment_terms = Column(String(20), default='NET30')  # IMMEDIATE, NET15, NET30, NET60, NET90
    bank_account = Column(String(50))
    bank_name = Column(String(100))
    balance = Column(DECIMAL(15, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    purchase_orders = relationship("PurchaseOrderModel", back_populates="supplier")

class PurchaseOrderModel(Base):
    __tablename__ = "purchase_orders"
    __table_args__ = (
        Index('idx_po_tenant_status', 'tenant_id', 'status'),
        Index('idx_po_supplier', 'tenant_id', 'supplier_id'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id"))
    event_id = Column(UUID(as_uuid=True)) # Optional
    
    code = Column(String(50), nullable=False)
    total_amount = Column(DECIMAL(15, 2), default=0)
    status = Column(String(50), default='DRAFT') # DRAFT, SENT, RECEIVED, PAID
    expected_delivery = Column(DateTime)
    note = Column(Text)
    
    # Payment terms (Phase 5B)
    payment_terms = Column(String(20), default='NET30')  # IMMEDIATE, NET15, NET30, NET60, NET90
    due_date = Column(DateTime)
    paid_amount = Column(DECIMAL(15, 2), default=0)
    payment_date = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    supplier = relationship("SupplierModel", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItemModel", back_populates="purchase_order", cascade="all, delete-orphan")


class PurchaseOrderItemModel(Base):
    __tablename__ = "purchase_order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    purchase_order_id = Column(UUID(as_uuid=True), ForeignKey("purchase_orders.id", ondelete="CASCADE"))
    item_id = Column(UUID(as_uuid=True), ForeignKey("inventory_items.id", ondelete="SET NULL"), nullable=True)
    
    item_name = Column(String(255), nullable=False)
    quantity = Column(DECIMAL(15, 2), default=1)
    uom = Column(String(50))
    unit_price = Column(DECIMAL(15, 2), default=0)
    total_price = Column(DECIMAL(15, 2), default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    purchase_order = relationship("PurchaseOrderModel", back_populates="items")
    item = relationship("backend.modules.inventory.domain.models.InventoryItemModel")
