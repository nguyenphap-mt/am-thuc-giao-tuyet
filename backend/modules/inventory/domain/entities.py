from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal

# --- Warehouse ---
class WarehouseBase(BaseModel):
    name: str
    location: Optional[str] = None
    is_active: bool = True

class Warehouse(WarehouseBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Inventory Item ---
class InventoryItemBase(BaseModel):
    sku: str
    name: str
    category: Optional[str] = None
    uom: str
    min_stock: float = 0
    cost_price: float = 0
    notes: Optional[str] = None
    is_active: bool = True

class InventoryItem(InventoryItemBase):
    id: UUID
    tenant_id: UUID
    latest_purchase_price: float = 0
    created_at: datetime
    updated_at: datetime
    
    # Optional stock summary for list view
    current_stock: Optional[float] = 0

    class Config:
        from_attributes = True

# --- Stock ---
class InventoryStockBase(BaseModel):
    item_id: UUID
    warehouse_id: UUID
    quantity: Decimal

class InventoryStock(InventoryStockBase):
    id: UUID
    updated_at: datetime
    class Config:
        from_attributes = True

# --- Transaction ---
class InventoryTransactionBase(BaseModel):
    item_id: UUID
    warehouse_id: UUID
    transaction_type: str # IMPORT, EXPORT, ADJUST
    quantity: Decimal
    unit_price: Optional[Decimal] = None # Input only, updates item cost
    reference_doc: Optional[str] = None
    notes: Optional[str] = None

class InventoryTransaction(InventoryTransactionBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    
    # Reversal tracking
    is_reversed: bool = False
    reversed_by_txn_id: Optional[UUID] = None
    reverses_txn_id: Optional[UUID] = None
    lot_id: Optional[UUID] = None
    
    class Config:
        from_attributes = True


# --- Lot Tracking ---
class InventoryLotBase(BaseModel):
    item_id: UUID
    warehouse_id: UUID
    lot_number: str
    batch_code: Optional[str] = None
    manufacture_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    initial_quantity: Decimal
    unit_cost: Decimal = Decimal(0)
    reference_doc: Optional[str] = None
    notes: Optional[str] = None


class InventoryLotCreate(InventoryLotBase):
    pass


class InventoryLot(InventoryLotBase):
    id: UUID
    tenant_id: UUID
    remaining_quantity: Decimal
    received_date: datetime
    status: str = "ACTIVE"
    created_at: datetime
    
    class Config:
        from_attributes = True


# --- Export with Lot Allocation ---
class LotAllocation(BaseModel):
    """Manual lot allocation for export"""
    lot_id: UUID
    quantity: Decimal

class ExportWithLotsRequest(BaseModel):
    """Request to export stock with optional manual lot selection"""
    item_id: UUID
    warehouse_id: UUID
    quantity: Decimal
    reason: Optional[str] = None  # Sản xuất, Hao hụt, Chuyển kho, Khác
    notes: Optional[str] = None
    lot_allocations: Optional[List[LotAllocation]] = None  # None = auto FIFO


# --- Material Preparation (GAP-4.1: Order → Inventory deduction) ---
class MaterialLineItem(BaseModel):
    """Single material item to prepare"""
    item_id: UUID
    quantity: Decimal

class MaterialPreparationRequest(BaseModel):
    """Request from Order module to deduct materials"""
    order_id: Optional[str] = None
    warehouse_id: UUID
    items: List[MaterialLineItem]

class MaterialItemResult(BaseModel):
    """Result for a single item preparation"""
    item_id: str
    item_name: str
    requested_qty: float
    deducted_qty: float
    shortfall: float
    lots_used: List[dict]
    actual_cogs: float  # Weighted average cost from lots

class MaterialPreparationResult(BaseModel):
    """Result of material preparation"""
    success: bool
    order_id: Optional[str] = None
    total_items: int
    items_fulfilled: int
    items_with_shortfall: int
    results: List[MaterialItemResult]
    total_cogs: float
    message: str

