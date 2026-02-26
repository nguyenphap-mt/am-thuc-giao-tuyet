"""
SQLAlchemy ORM Model for User Sessions
Database: PostgreSQL (catering_db)
"""

from sqlalchemy import Column, String, Text, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.sql import func
import uuid

from backend.core.database import Base


class UserSessionModel(Base):
    """SQLAlchemy ORM Model for User Sessions (Phiên đăng nhập)"""
    __tablename__ = "user_sessions"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # BUGFIX: BUG-20260220-001
    # Removed tenant_id FK - column does not exist in actual DB schema.
    # The original definition caused NoReferencedTableError on login,
    # resulting in 500 error masked as CORS error in the browser.
    
    # User reference
    # NOTE: DB-level FK constraint still enforces integrity.
    # ORM-level ForeignKey removed to avoid NoReferencedTableError (import order issue).
    user_id = Column(UUID(as_uuid=True), nullable=False)
    
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
