from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from decimal import Decimal

class EventBase(BaseModel):
    order_id: Optional[UUID] = None
    name: str
    start_time: datetime
    end_time: datetime
    setup_time: Optional[datetime] = None
    location: Optional[str] = None
    status: str = 'SCHEDULED'
    notes: Optional[str] = None

class Event(EventBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
