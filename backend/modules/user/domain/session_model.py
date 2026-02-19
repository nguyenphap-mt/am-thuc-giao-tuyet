"""
SQLAlchemy ORM Model for User Sessions
Database: PostgreSQL (catering_db)
"""

from sqlalchemy import Column, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.sql import func
import uuid

from backend.core.database import Base


class UserSessionModel(Base):
    """SQLAlchemy ORM Model for User Sessions (Phiên đăng nhập)"""
    __tablename__ = "user_sessions"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS - MANDATORY)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True)
    
    # User reference
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Token info (store hash, not actual token)
    token_hash = Column(String(64), nullable=False)
    
    # Client info
    ip_address = Column(INET, nullable=True)
    device_info = Column(Text, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
