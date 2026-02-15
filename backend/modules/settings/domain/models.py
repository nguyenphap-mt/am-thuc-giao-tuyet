"""
SQLAlchemy ORM Models for Settings Module
Tenant-level configuration settings
"""

from sqlalchemy import Column, String, Text, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from backend.core.database import Base


class TenantSettingModel(Base):
    """SQLAlchemy ORM Model for Tenant Settings (Cài đặt theo tenant)"""
    __tablename__ = "tenant_settings"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Setting key-value
    setting_key = Column(String(100), nullable=False)
    setting_value = Column(Text)
    setting_type = Column(String(20), default='STRING')  # STRING, BOOLEAN, NUMBER, JSON
    
    # Metadata
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def get_typed_value(self):
        """Get value with proper type conversion"""
        if self.setting_type == 'BOOLEAN':
            return self.setting_value.lower() in ('true', '1', 'yes')
        elif self.setting_type == 'NUMBER':
            try:
                if '.' in (self.setting_value or ''):
                    return float(self.setting_value)
                return int(self.setting_value)
            except:
                return 0
        elif self.setting_type == 'JSON':
            import json
            try:
                return json.loads(self.setting_value)
            except:
                return {}
        return self.setting_value
