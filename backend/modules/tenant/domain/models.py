"""
Tenant Module - Domain Models (ORM)
SQLAlchemy models for tenants and tenant_usage tables
"""

from sqlalchemy import Column, String, Boolean, DateTime, Text, Numeric, Date, LargeBinary
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from backend.core.database import Base


class TenantStatus:
    """Tenant lifecycle status constants"""
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TRIAL = "trial"
    CANCELLED = "cancelled"


class TenantModel(Base):
    """ORM model for tenants table"""
    __tablename__ = "tenants"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    name = Column(String(255), nullable=False)
    code = Column(String(50))  # Existing column
    is_active = Column(Boolean, default=True)  # Existing column
    slug = Column(String(50), unique=True)
    plan = Column(String(50), default='basic')
    status = Column(String(20), default='active')
    domain = Column(String(255))
    logo_url = Column(Text)
    logo_data = Column(LargeBinary)  # BYTEA — store logo bytes in DB (Cloud Run filesystem is ephemeral)
    logo_content_type = Column(String(50))  # e.g. "image/png"
    plan_details = Column(JSONB, default={})
    contact_email = Column(String(255))
    contact_phone = Column(String(20))
    address = Column(Text)
    trial_ends_at = Column(DateTime(timezone=True))
    suspended_at = Column(DateTime(timezone=True))
    metadata_ = Column("metadata", JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class TenantUsageModel(Base):
    """ORM model for tenant_usage table - tracks resource consumption"""
    __tablename__ = "tenant_usage"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    metric_key = Column(String(100), nullable=False)
    metric_value = Column(Numeric, default=0)
    period = Column(String(20), default='total')
    period_start = Column(Date)
    period_end = Column(Date)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
