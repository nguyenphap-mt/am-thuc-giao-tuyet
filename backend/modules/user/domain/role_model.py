"""
Role ORM Model - Maps to roles table (migration 043)
"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, text, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from backend.core.database import Base


class RoleModel(Base):
    __tablename__ = "roles"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)

    # Role info
    code = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String, nullable=True)

    # Permissions stored as text array
    permissions = Column(ARRAY(String), default=[])

    # System flag (cannot delete system roles)
    is_system = Column(Boolean, default=False)

    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
