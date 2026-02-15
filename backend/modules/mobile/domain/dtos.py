"""
Pydantic DTOs for Mobile Platform API
"""

from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


# ============ Device Registration ============

class DeviceRegisterRequest(BaseModel):
    device_token: str
    platform: str = Field(..., pattern="^(ios|android)$")
    device_name: Optional[str] = None
    app_version: Optional[str] = None


class DeviceRegisterResponse(BaseModel):
    id: UUID
    status: str = "registered"


# ============ GPS Check-in ============

class CheckinRequest(BaseModel):
    order_id: UUID
    check_type: str = Field(..., pattern="^(in|out)$")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    recorded_at: datetime


class CheckinResponse(BaseModel):
    id: UUID
    status: str = "recorded"


# ============ Offline Sync ============

class SyncOperation(BaseModel):
    entity_type: str
    entity_id: UUID
    action: str = Field(..., pattern="^(create|update|delete)$")
    payload: dict
    client_timestamp: datetime


class SyncRequest(BaseModel):
    operations: List[SyncOperation]


class SyncConflict(BaseModel):
    entity_id: UUID
    resolution: str


class SyncResponse(BaseModel):
    synced: int
    conflicts: List[SyncConflict] = []


# ============ Schedule ============

class MobileScheduleItem(BaseModel):
    order_id: UUID
    event_name: str
    role: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: str
    location: Optional[str] = None
    customer_name: Optional[str] = None


class MobileNotification(BaseModel):
    id: UUID
    title: str
    body: str
    type: str
    is_read: bool
    created_at: Optional[datetime] = None
