"""
Settings Service
Provides access to tenant-level configuration settings
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import Optional, Dict, Any, List
from decimal import Decimal

from backend.modules.settings.domain.models import TenantSettingModel


class SettingsService:
    """Service for managing tenant settings"""
    
    def __init__(self, db: AsyncSession, tenant_id: UUID):
        self.db = db
        self.tenant_id = tenant_id
        self._cache: Dict[str, Any] = {}
    
    async def get(self, key: str, default: Any = None) -> Any:
        """Get a setting value by key"""
        # Check cache first
        if key in self._cache:
            return self._cache[key]
        
        result = await self.db.execute(
            select(TenantSettingModel).where(
                TenantSettingModel.tenant_id == self.tenant_id,
                TenantSettingModel.setting_key == key,
                TenantSettingModel.is_active == True
            )
        )
        setting = result.scalar_one_or_none()
        
        if setting:
            value = setting.get_typed_value()
            self._cache[key] = value
            return value
        
        return default
    
    async def set(self, key: str, value: Any, setting_type: str = None, description: str = None) -> TenantSettingModel:
        """Set a setting value"""
        # Convert value to string
        if isinstance(value, bool):
            str_value = 'true' if value else 'false'
            setting_type = setting_type or 'BOOLEAN'
        elif isinstance(value, (int, float, Decimal)):
            str_value = str(value)
            setting_type = setting_type or 'NUMBER'
        elif isinstance(value, dict):
            import json
            str_value = json.dumps(value)
            setting_type = setting_type or 'JSON'
        else:
            str_value = str(value) if value is not None else ''
            setting_type = setting_type or 'STRING'
        
        # Check if exists
        result = await self.db.execute(
            select(TenantSettingModel).where(
                TenantSettingModel.tenant_id == self.tenant_id,
                TenantSettingModel.setting_key == key
            )
        )
        setting = result.scalar_one_or_none()
        
        if setting:
            setting.setting_value = str_value
            if description:
                setting.description = description
        else:
            setting = TenantSettingModel(
                tenant_id=self.tenant_id,
                setting_key=key,
                setting_value=str_value,
                setting_type=setting_type,
                description=description
            )
            self.db.add(setting)
        
        await self.db.commit()
        await self.db.refresh(setting)
        
        # Update cache
        self._cache[key] = setting.get_typed_value()
        
        return setting
    
    async def get_all(self) -> List[Dict[str, Any]]:
        """Get all settings for tenant"""
        result = await self.db.execute(
            select(TenantSettingModel).where(
                TenantSettingModel.tenant_id == self.tenant_id,
                TenantSettingModel.is_active == True
            ).order_by(TenantSettingModel.setting_key)
        )
        settings = result.scalars().all()
        
        return [
            {
                'key': s.setting_key,
                'value': s.get_typed_value(),
                'type': s.setting_type,
                'description': s.description
            }
            for s in settings
        ]
    
    async def get_bool(self, key: str, default: bool = False) -> bool:
        """Get a boolean setting"""
        value = await self.get(key, default)
        return bool(value)
    
    async def get_int(self, key: str, default: int = 0) -> int:
        """Get an integer setting"""
        value = await self.get(key, default)
        try:
            return int(value)
        except:
            return default
    
    # Convenience methods for common settings
    async def is_auto_import_po_enabled(self) -> bool:
        """Check if auto-import from PO is enabled"""
        return await self.get_bool('inventory.auto_import_from_po', False)
    
    async def is_hr_sync_enabled(self) -> bool:
        """Check if HR-Order sync is enabled"""
        return await self.get_bool('hr.sync_order_assignments', True)
    
    async def is_auto_invoice_code_enabled(self) -> bool:
        """Check if auto invoice code generation is enabled"""
        return await self.get_bool('invoice.auto_generate_code', True)
    
    # Order & Operations
    async def is_order_auto_deduct_inventory(self) -> bool:
        """Check if auto inventory deduction on order completion is enabled"""
        return await self.get_bool('order.auto_deduct_inventory', True)
    
    async def is_order_auto_create_timesheet(self) -> bool:
        """Check if auto timesheet creation on order completion is enabled"""
        return await self.get_bool('order.auto_create_timesheet', True)
    
    async def is_order_auto_earn_loyalty(self) -> bool:
        """Check if auto loyalty points earning on order completion is enabled"""
        return await self.get_bool('order.auto_earn_loyalty', True)
    
    # CRM & Loyalty
    async def is_loyalty_enabled(self) -> bool:
        """Check if loyalty program is enabled"""
        return await self.get_bool('crm.loyalty_enabled', True)
    
    async def get_loyalty_points_ratio(self) -> int:
        """Get VND per loyalty point ratio"""
        return await self.get_int('crm.loyalty_points_ratio', 10000)
    
    # Quote
    async def get_quote_default_validity_days(self) -> int:
        """Get default validity days for new quotes"""
        return await self.get_int('quote.default_validity_days', 30)
    
    async def get_quote_expiring_soon_days(self) -> int:
        """Get expiring-soon warning threshold in days"""
        return await self.get_int('quote.expiring_soon_days', 7)
    
    # Finance
    async def is_auto_journal_on_payment(self) -> bool:
        """Check if auto journal creation on payment is enabled"""
        return await self.get_bool('finance.auto_journal_on_payment', True)
    
    async def get_default_payment_terms(self) -> int:
        """Get default payment terms in days"""
        return await self.get_int('finance.default_payment_terms', 30)
    
    async def get_tax_rate(self) -> int:
        """Get default tax rate percentage"""
        return await self.get_int('finance.tax_rate', 10)


async def get_settings_service(db: AsyncSession, tenant_id: UUID) -> SettingsService:
    """Get a SettingsService instance"""
    return SettingsService(db, tenant_id)
