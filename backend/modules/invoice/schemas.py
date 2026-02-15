"""
Pydantic Schemas for Invoice Module
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal


# ============================================================
# INVOICE ITEM SCHEMAS
# ============================================================

class InvoiceItemBase(BaseModel):
    item_name: str
    description: Optional[str] = None
    uom: str = "Món"
    quantity: int = 1
    unit_price: Decimal = Decimal("0")
    discount_percent: Decimal = Decimal("0")
    vat_rate: Decimal = Decimal("10")
    sort_order: int = 0


class InvoiceItemCreate(InvoiceItemBase):
    pass


class InvoiceItemResponse(InvoiceItemBase):
    id: UUID
    invoice_id: UUID
    total_price: Decimal
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# INVOICE SCHEMAS
# ============================================================

class InvoiceBase(BaseModel):
    customer_name: str
    customer_address: Optional[str] = None
    customer_tax_code: Optional[str] = None
    customer_phone: Optional[str] = None
    invoice_date: date = Field(default_factory=date.today)
    due_date: Optional[date] = None
    vat_rate: Decimal = Decimal("10")
    notes: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    order_id: Optional[UUID] = None
    items: List[InvoiceItemCreate] = []


class InvoiceFromOrder(BaseModel):
    """Schema for creating invoice from an existing order"""
    order_id: UUID
    customer_tax_code: Optional[str] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None


class InvoiceUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_address: Optional[str] = None
    customer_tax_code: Optional[str] = None
    customer_phone: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    vat_rate: Optional[Decimal] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class InvoiceResponse(InvoiceBase):
    id: UUID
    tenant_id: UUID
    code: str
    order_id: Optional[UUID] = None
    subtotal: Decimal
    discount_amount: Decimal
    vat_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    payment_status: str
    status: str
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    items: List[InvoiceItemResponse] = []

    class Config:
        from_attributes = True


class InvoiceListResponse(BaseModel):
    id: UUID
    code: str
    order_id: Optional[UUID] = None
    customer_name: str
    customer_tax_code: Optional[str] = None
    invoice_date: date
    total_amount: Decimal
    payment_status: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceStatsResponse(BaseModel):
    total_invoices: int
    draft_count: int
    issued_count: int
    paid_count: int
    total_revenue: Decimal
    total_outstanding: Decimal
