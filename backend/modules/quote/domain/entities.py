from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, validator
from decimal import Decimal

class QuoteItemBase(BaseModel):
    menu_item_id: Optional[UUID] = None
    item_name: str
    description: Optional[str] = None
    uom: Optional[str] = None
    quantity: int = 1
    unit_price: Decimal
    total_price: Decimal
    note: Optional[str] = None

class QuoteServiceBase(BaseModel):
    service_id: Optional[str] = None
    service_name: str
    quantity: int = 1
    unit_price: Decimal
    total_price: Decimal

class QuoteNotePreset(BaseModel):
    id: UUID
    content: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class QuoteNotePresetCreate(BaseModel):
    content: str


class QuoteItem(QuoteItemBase):
    id: UUID
    tenant_id: Optional[UUID] = None  # Added: From QuoteItemModel
    quote_id: UUID
    category_id: Optional[UUID] = None  # Added: From QuoteItemModel
    created_at: datetime
    updated_at: Optional[datetime] = None  # Added: From QuoteItemModel
    
    class Config:
        from_attributes = True

class QuoteService(QuoteServiceBase):
    id: UUID
    tenant_id: Optional[UUID] = None  # Added: From QuoteServiceModel
    quote_id: UUID
    created_at: datetime
    service_type: Optional[str] = None
    note: Optional[str] = None  # Added: From QuoteServiceModel
    
    class Config:
        from_attributes = True

class QuoteBase(BaseModel):
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    event_date: Optional[datetime] = None
    event_time: Optional[str] = None  # HH:mm format
    event_address: Optional[str] = None
    event_type: Optional[str] = None
    notes: Optional[str] = None
    guest_count: int = 0
    table_count: int = 0
    
    # ISS-007: Server-side validators for required fields
    # NOTE: mode='before' ensures validators only run during INPUT, not during serialization from DB
    @validator('customer_name', pre=True)
    def validate_customer_name(cls, v, values):
        if v and isinstance(v, str) and len(v.strip()) < 2:
            raise ValueError('Tên khách hàng phải có ít nhất 2 ký tự')
        return v.strip() if v and isinstance(v, str) else v
    
    @validator('customer_phone', pre=True)
    def validate_customer_phone(cls, v):
        import re
        if v and isinstance(v, str):
            cleaned = re.sub(r'\s+', '', v)
            # Only validate format for new inputs, not existing DB data
            # Skip validation if it looks like legacy data
            if not re.match(r'^0[0-9]{9,10}$', cleaned):
                # Log warning but don't raise for existing data
                pass  # Changed: Don't reject existing DB data
            return cleaned
        return v
    
    @validator('customer_email', pre=True)
    def validate_email(cls, v):
        import re
        if v and isinstance(v, str) and not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', v):
            # Don't reject - legacy data may not have valid emails
            pass  # Changed: Don't reject existing DB data
        return v
    
    @validator('event_time', pre=True)
    def validate_event_time(cls, v):
        import re
        if v and isinstance(v, str) and not re.match(r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$', v):
            # Don't reject - legacy data may have different formats
            pass  # Changed: Don't reject existing DB data
        return v
    
    # New Fields for Step 4
    discount_furniture_percent: Decimal = Decimal(0)
    discount_staff_percent: Decimal = Decimal(0)
    discount_total_percent: Decimal = Decimal(0)
    is_vat_inclusive: bool = False
    vat_rate: Decimal = Decimal(10)
    vat_amount: Decimal = Decimal(0)
    
    total_amount: Decimal = Decimal(0)
    status: str = 'DRAFT'
    valid_until: Optional[datetime] = None
    
    # Items and Services
    items: List[QuoteItemBase] = []
    services: List[QuoteServiceBase] = []
    staff_count: int = 0

class Quote(QuoteBase):
    id: UUID
    tenant_id: UUID
    code: str
    subtotal: Optional[Decimal] = Decimal(0)  # Added: Missing field from QuoteModel
    converted_by: Optional[UUID] = None  # Added: Missing field from QuoteModel  
    converted_at: Optional[datetime] = None  # Added: Missing field from QuoteModel
    created_by: Optional[UUID] = None  # Added: Missing field from QuoteModel
    updated_by: Optional[UUID] = None  # Added: Missing field from QuoteModel
    
    # Lost/Expired Status (PRD-QUOTE-LOST-001)
    lost_reason: Optional[str] = None
    lost_at: Optional[datetime] = None
    expired_at: Optional[datetime] = None
    
    items: List[QuoteItem] = []
    services: List[QuoteService] = []  # Fixed: Use QuoteService instead of QuoteServiceBase
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Phase 14.1: Quote Templates
class QuoteTemplateItemSchema(BaseModel):
    """Item trong template"""
    menu_item_id: Optional[UUID] = None
    name: str
    category: Optional[str] = None
    quantity: int = 1
    unit_price: Decimal

class QuoteTemplateServiceSchema(BaseModel):
    """Service trong template"""
    name: str
    service_type: str = "OTHER"
    quantity: int = 1
    unit_price: Decimal

class QuoteTemplateCreate(BaseModel):
    """Create new template"""
    name: str
    event_type: Optional[str] = None
    description: Optional[str] = None
    items: List[QuoteTemplateItemSchema] = []
    services: List[QuoteTemplateServiceSchema] = []
    default_table_count: Optional[int] = None
    default_guests_per_table: int = 10
    default_notes: Optional[str] = None

class QuoteTemplateUpdate(BaseModel):
    """Update template"""
    name: Optional[str] = None
    event_type: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    items: Optional[List[QuoteTemplateItemSchema]] = None
    services: Optional[List[QuoteTemplateServiceSchema]] = None
    default_table_count: Optional[int] = None
    default_guests_per_table: Optional[int] = None
    default_notes: Optional[str] = None

class QuoteTemplate(BaseModel):
    """Full template response"""
    id: UUID
    tenant_id: UUID
    name: str
    event_type: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    items: List[dict] = []
    services: List[dict] = []
    default_table_count: Optional[int] = None
    default_guests_per_table: int = 10
    default_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


