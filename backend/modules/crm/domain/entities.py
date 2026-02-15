from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID

class CustomerBase(BaseModel):
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    customer_type: Optional[str] = 'REGULAR'
    preferences: Optional[Dict[str, Any]] = {}
    birthday: Optional[date] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(CustomerBase):
    pass

class Customer(CustomerBase):
    id: UUID
    tenant_id: UUID
    
    # Stats
    total_spent: float = 0
    order_count: int = 0
    last_order_at: Optional[datetime] = None
    
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class InteractionLogBase(BaseModel):
    type: str
    content: Optional[str] = None
    sentiment: Optional[str] = None

class InteractionLogCreate(InteractionLogBase):
    customer_id: UUID

class InteractionLog(InteractionLogBase):
    id: UUID
    tenant_id: UUID
    customer_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
