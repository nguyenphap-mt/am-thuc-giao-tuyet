from sqlalchemy import Column, String, Boolean, DateTime, DECIMAL, ForeignKey, Text, Integer, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from backend.core.database import Base

class WarehouseModel(Base):
    __tablename__ = "warehouses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class InventoryItemModel(Base):
    __tablename__ = "inventory_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    
    sku = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    uom = Column(String(50), nullable=False)
    
    min_stock = Column(DECIMAL(15, 2), default=0)
    cost_price = Column(DECIMAL(15, 2), default=0)
    latest_purchase_price = Column(DECIMAL(15, 2), default=0)
    
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    stock = relationship("InventoryStockModel", back_populates="item", cascade="all, delete-orphan")

class InventoryStockModel(Base):
    __tablename__ = "inventory_stock"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    
    item_id = Column(UUID(as_uuid=True), ForeignKey("inventory_items.id"), nullable=False)
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id"), nullable=False)
    
    quantity = Column(DECIMAL(15, 2), default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    item = relationship("InventoryItemModel", back_populates="stock")

class InventoryTransactionModel(Base):
    __tablename__ = "inventory_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    
    item_id = Column(UUID(as_uuid=True), ForeignKey("inventory_items.id"), nullable=False)
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id"), nullable=False)
    lot_id = Column(UUID(as_uuid=True), ForeignKey("inventory_lots.id"), nullable=True)  # Lot reference
    
    transaction_type = Column(String(50), nullable=False) # IMPORT, EXPORT, ADJUST, REVERSAL
    quantity = Column(DECIMAL(15, 2), nullable=False)
    unit_price = Column(DECIMAL(15, 2), nullable=True)  # For cost tracking
    
    reference_doc = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    performed_by = Column(UUID(as_uuid=True), nullable=True)
    
    # Reversal tracking
    is_reversed = Column(Boolean, default=False)
    reversed_by_txn_id = Column(UUID(as_uuid=True), nullable=True)
    reverses_txn_id = Column(UUID(as_uuid=True), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class InventoryLotModel(Base):
    """Lot/Batch tracking for inventory items"""
    __tablename__ = "inventory_lots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    item_id = Column(UUID(as_uuid=True), ForeignKey("inventory_items.id"), nullable=False)
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id"), nullable=False)
    
    # Lot identification
    lot_number = Column(String(50), nullable=False)
    batch_code = Column(String(50), nullable=True)
    
    # Dates
    manufacture_date = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    received_date = Column(DateTime, default=datetime.utcnow)
    
    # Quantity
    initial_quantity = Column(DECIMAL(15, 2), nullable=False)
    remaining_quantity = Column(DECIMAL(15, 2), nullable=False)
    
    # Cost
    unit_cost = Column(DECIMAL(15, 2), default=0)
    
    # Status
    status = Column(String(20), default='ACTIVE')  # ACTIVE, DEPLETED, EXPIRED, DAMAGED
    
    # Reference
    reference_doc = Column(String(100), nullable=True)
    supplier_id = Column(UUID(as_uuid=True), nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Note: RecipeModel has been moved to menu/domain/models.py
# to avoid cross-module SQLAlchemy table conflicts




