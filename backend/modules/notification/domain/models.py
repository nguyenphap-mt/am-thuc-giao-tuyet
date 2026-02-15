"""
SQLAlchemy ORM Models for Notification Preferences
Database: PostgreSQL (catering_db)
"""

from sqlalchemy import Column, String, Boolean, DateTime, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from datetime import time as dt_time
from backend.core.database import Base


class NotificationPreferenceModel(Base):
    """Per-user notification preference for each type and channel"""
    __tablename__ = "notification_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    
    # What & Where
    notification_type = Column(String(50), nullable=False)  # ORDER_CREATED, etc.
    channel = Column(String(20), nullable=False)            # IN_APP, EMAIL, PUSH, SMS
    is_enabled = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class NotificationSettingsModel(Base):
    """Per-user global notification settings"""
    __tablename__ = "notification_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Global channels on/off
    channel_email_enabled = Column(Boolean, default=True)
    channel_push_enabled = Column(Boolean, default=False)
    channel_sms_enabled = Column(Boolean, default=False)
    channel_inapp_enabled = Column(Boolean, default=True)
    
    # Email frequency
    email_frequency = Column(String(20), default='IMMEDIATE')  # IMMEDIATE, DAILY_DIGEST
    
    # Quiet hours
    quiet_hours_enabled = Column(Boolean, default=False)
    quiet_hours_start = Column(Time, default=dt_time(22, 0))
    quiet_hours_end = Column(Time, default=dt_time(7, 0))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
