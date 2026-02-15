from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from decimal import Decimal

class AccountBase(BaseModel):
    code: str
    name: str
    type: str # ASSET, LIABILITY...
    is_active: bool = True

class Account(AccountBase):
    id: UUID
    tenant_id: UUID
    type: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class JournalLineBase(BaseModel):
    account_id: UUID
    debit: Decimal = Decimal(0)
    credit: Decimal = Decimal(0)
    description: Optional[str] = None

class JournalBase(BaseModel):
    date: datetime = datetime.utcnow()
    description: Optional[str] = None
    lines: List[JournalLineBase]

class Journal(JournalBase):
    id: UUID
    tenant_id: UUID
    code: str
    total_amount: Decimal
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
