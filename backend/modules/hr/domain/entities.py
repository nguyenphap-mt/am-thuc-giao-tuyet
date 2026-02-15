from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from decimal import Decimal

class EmployeeBase(BaseModel):
    full_name: str
    role_type: str = 'WAITER' # CHEF, WAITER, DRIVER
    phone: Optional[str] = None
    is_fulltime: bool = False
    hourly_rate: Decimal = Decimal(0)
    is_active: bool = True

class Employee(EmployeeBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class StaffAssignmentBase(BaseModel):
    event_id: UUID
    employee_id: UUID
    role: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: str = 'ASSIGNED'

class StaffAssignment(StaffAssignmentBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
