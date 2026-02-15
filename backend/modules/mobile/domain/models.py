"""
SQLAlchemy ORM Models for Mobile Platform
Database: PostgreSQL (catering_db)
Tables: device_registrations, event_checkins, mobile_sync_log
"""

from sqlalchemy import Column, String, Boolean, DateTime, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from backend.core.database import Base


class DeviceRegistrationModel(Base):
    """Push notification device registration per user"""
    __tablename__ = "device_registrations"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    device_token = Column(Text, nullable=False)
    platform = Column(String(10), nullable=False)  # 'ios' | 'android'
    device_name = Column(String(255))
    app_version = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class EventCheckinModel(Base):
    """GPS check-in/check-out log for events"""
    __tablename__ = "event_checkins"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    employee_id = Column(UUID(as_uuid=True), nullable=False)
    order_id = Column(UUID(as_uuid=True), nullable=False)
    check_type = Column(String(10), nullable=False)  # 'in' | 'out'
    latitude = Column(Numeric(10, 8))
    longitude = Column(Numeric(11, 8))
    recorded_at = Column(DateTime(timezone=True), nullable=False)
    synced_at = Column(DateTime(timezone=True))
    source = Column(String(20), default='mobile')  # 'mobile' | 'web' | 'auto'
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MobileSyncLogModel(Base):
    """Offline sync operation log with conflict resolution"""
    __tablename__ = "mobile_sync_log"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    action = Column(String(20), nullable=False)  # 'create' | 'update' | 'delete'
    payload = Column(JSONB, nullable=False)
    client_timestamp = Column(DateTime(timezone=True), nullable=False)
    server_timestamp = Column(DateTime(timezone=True), server_default=func.now())
    conflict_resolved = Column(Boolean, default=False)
    resolution_strategy = Column(String(20), default='last_write_wins')
