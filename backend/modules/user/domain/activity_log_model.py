"""
SQLAlchemy ORM Model for Activity Logs
Database: PostgreSQL (catering_db)
"""

from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.sql import func
import uuid

from backend.core.database import Base


class ActivityLogModel(Base):
    """SQLAlchemy ORM Model for Activity Logs (Nhật ký hoạt động)"""
    __tablename__ = "activity_logs"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS - MANDATORY)
    # NOTE: FK constraint exists in PostgreSQL (migration 040). Removed from ORM to avoid
    # NoReferencedTableError when tenants model is not yet loaded in metadata.
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    
    # User who performed the action
    # NOTE: FK constraint exists in PostgreSQL (migration 040). Removed from ORM to avoid
    # import-order dependency issues.
    user_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Action Info
    action = Column(String(100), nullable=False)  # LOGIN, LOGOUT, CREATE_USER, UPDATE_ORDER, etc.
    entity_type = Column(String(50), nullable=True)  # User, Order, Quote, etc.
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Details
    # BUGFIX: BUG-20260212-001 - DB column is 'metadata' (migration 040), ORM attribute
    # renamed to 'extra_data' to avoid SQLAlchemy reserved word conflict
    extra_data = Column('metadata', JSONB, default={})
    ip_address = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
