from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from backend.core.database import Base


class UserStatus:
    """User status constants"""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    DELETED = "DELETED"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    tenant_id = Column(UUID(as_uuid=True), nullable=False, server_default=text("'00000000-0000-0000-0000-000000000000'"))
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False)  # e.g., 'super_admin', 'admin', 'manager'
    is_active = Column(Boolean, default=True)
    phone_number = Column(String(20), nullable=True)
    
    # User lifecycle status (NEW - Sprint 2)
    status = Column(String(20), default='ACTIVE')  # ACTIVE, INACTIVE, DELETED
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

