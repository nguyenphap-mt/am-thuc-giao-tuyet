from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
import re

# --- Supplier ---
class SupplierBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    contact_person: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = None
    tax_id: Optional[str] = Field(None, max_length=50)
    category: str = 'OTHER'  # FOOD, BEVERAGE, EQUIPMENT, SERVICE, OTHER
    website: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None
    is_active: bool = True
    payment_terms: str = 'NET30'  # IMMEDIATE, NET15, NET30, NET60, NET90
    bank_account: Optional[str] = Field(None, max_length=50)
    bank_name: Optional[str] = Field(None, max_length=100)
    balance: float = 0

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(pattern, v.strip()):
                raise ValueError('Email không hợp lệ')
            return v.strip().lower()
        return v

    @field_validator('category')
    @classmethod
    def validate_category(cls, v: str) -> str:
        valid = ['FOOD', 'BEVERAGE', 'EQUIPMENT', 'SERVICE', 'OTHER']
        if v not in valid:
            raise ValueError(f'Phân loại phải là một trong: {valid}')
        return v

    @field_validator('payment_terms')
    @classmethod
    def validate_payment_terms(cls, v: str) -> str:
        valid = ['IMMEDIATE', 'NET15', 'NET30', 'NET60', 'NET90']
        if v not in valid:
            raise ValueError(f'Điều khoản thanh toán phải là một trong: {valid}')
        return v

class Supplier(SupplierBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# --- Order Item ---
class PurchaseOrderItemBase(BaseModel):
    item_id: Optional[UUID] = None
    item_name: str
    quantity: float = 1
    uom: Optional[str] = None
    unit_price: float = 0
    total_price: float = 0

class PurchaseOrderItem(PurchaseOrderItemBase):
    id: UUID
    purchase_order_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass

# --- Purchase Order ---
class PurchaseOrderBase(BaseModel):
    supplier_id: Optional[UUID] = None
    event_id: Optional[UUID] = None
    code: Optional[str] = None  # Can be auto-generated or passed
    total_amount: float = 0
    status: str = 'DRAFT'
    expected_delivery: Optional[datetime] = None
    note: Optional[str] = None

class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[PurchaseOrderItemCreate] = []

class PurchaseOrder(PurchaseOrderBase):
    id: UUID
    tenant_id: UUID
    code: str
    created_at: datetime
    updated_at: datetime
    
    supplier: Optional[Supplier] = None
    items: List[PurchaseOrderItem] = []

    class Config:
        from_attributes = True

# --- Receive Order Request ---
class ReceiveItemDto(BaseModel):
    item_id: UUID
    quantity: float
    unit_price: float

class ReceiveOrderRequest(BaseModel):
    items: List[ReceiveItemDto]
    note: Optional[str] = None
