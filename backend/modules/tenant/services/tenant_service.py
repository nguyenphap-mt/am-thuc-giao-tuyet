"""
Tenant Service - Business Logic
Handles CRUD operations, onboarding, and usage stats for tenants
"""

from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func, update, delete
from sqlalchemy.dialects.postgresql import insert

from backend.modules.tenant.domain.models import TenantModel, TenantUsageModel, TenantStatus
from backend.core.auth.models import User


class TenantService:
    """Service for tenant management operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # =============================================
    # CRUD Operations
    # =============================================
    
    async def list_tenants(
        self, 
        search: Optional[str] = None,
        status: Optional[str] = None,
        plan: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[List[TenantModel], int]:
        """List all tenants with filtering"""
        stmt = select(TenantModel)
        count_stmt = select(sa_func.count()).select_from(TenantModel)
        
        if search:
            search_filter = TenantModel.name.ilike(f"%{search}%")
            stmt = stmt.where(search_filter)
            count_stmt = count_stmt.where(search_filter)
        
        if status:
            stmt = stmt.where(TenantModel.status == status)
            count_stmt = count_stmt.where(TenantModel.status == status)
        
        if plan:
            stmt = stmt.where(TenantModel.plan == plan)
            count_stmt = count_stmt.where(TenantModel.plan == plan)
        
        # Count
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar() or 0
        
        # Data
        stmt = stmt.order_by(TenantModel.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        tenants = result.scalars().all()
        
        return tenants, total
    
    async def get_tenant(self, tenant_id: UUID) -> Optional[TenantModel]:
        """Get a single tenant by ID"""
        result = await self.db.execute(
            select(TenantModel).where(TenantModel.id == tenant_id)
        )
        return result.scalar_one_or_none()
    
    async def create_tenant(self, data: Dict[str, Any]) -> TenantModel:
        """Create a new tenant with onboarding"""
        # Generate slug from name
        slug = data.get("slug") or self._generate_slug(data["name"])
        
        tenant = TenantModel(
            name=data["name"],
            slug=slug,
            plan=data.get("plan", "basic"),
            status=data.get("status", TenantStatus.ACTIVE),
            domain=data.get("domain"),
            logo_url=data.get("logo_url"),
            plan_details=data.get("plan_details", {
                "max_users": 50,
                "max_orders_per_month": 1000,
                "storage_mb": 10240
            }),
            contact_email=data.get("contact_email"),
            contact_phone=data.get("contact_phone"),
            address=data.get("address"),
            trial_ends_at=data.get("trial_ends_at"),
            metadata=data.get("metadata", {})
        )
        
        self.db.add(tenant)
        await self.db.flush()  # Get the ID
        
        # Seed default settings for this tenant
        await self._seed_default_settings(tenant.id)
        
        await self.db.commit()
        await self.db.refresh(tenant)
        return tenant
    
    async def update_tenant(self, tenant_id: UUID, data: Dict[str, Any]) -> Optional[TenantModel]:
        """Update tenant properties"""
        tenant = await self.get_tenant(tenant_id)
        if not tenant:
            return None
        
        # Update only provided fields
        updatable_fields = [
            "name", "slug", "plan", "domain", "logo_url", 
            "logo_data", "logo_content_type",
            "plan_details", "contact_email", "contact_phone",
            "address", "metadata"
        ]
        
        for field in updatable_fields:
            if field in data and data[field] is not None:
                setattr(tenant, field, data[field])
        
        tenant.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(tenant)
        return tenant
    
    async def update_tenant_status(self, tenant_id: UUID, new_status: str) -> Optional[TenantModel]:
        """Change tenant status (active, suspended, trial, cancelled)"""
        tenant = await self.get_tenant(tenant_id)
        if not tenant:
            return None
        
        tenant.status = new_status
        if new_status == TenantStatus.SUSPENDED:
            tenant.suspended_at = datetime.utcnow()
        elif new_status == TenantStatus.ACTIVE:
            tenant.suspended_at = None
        
        tenant.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(tenant)
        return tenant
    
    async def delete_tenant(self, tenant_id: UUID) -> bool:
        """Soft-delete tenant by setting status to cancelled"""
        tenant = await self.get_tenant(tenant_id)
        if not tenant:
            return False
        
        tenant.status = TenantStatus.CANCELLED
        tenant.updated_at = datetime.utcnow()
        await self.db.commit()
        return True
    
    # =============================================
    # Usage & Stats
    # =============================================
    
    async def get_tenant_stats(self) -> Dict[str, Any]:
        """Get aggregate tenant statistics"""
        total = await self.db.execute(
            select(sa_func.count()).select_from(TenantModel)
        )
        active = await self.db.execute(
            select(sa_func.count()).select_from(TenantModel)
            .where(TenantModel.status == TenantStatus.ACTIVE)
        )
        trial = await self.db.execute(
            select(sa_func.count()).select_from(TenantModel)
            .where(TenantModel.status == TenantStatus.TRIAL)
        )
        suspended = await self.db.execute(
            select(sa_func.count()).select_from(TenantModel)
            .where(TenantModel.status == TenantStatus.SUSPENDED)
        )
        
        # Plan distribution
        plan_dist = await self.db.execute(
            select(TenantModel.plan, sa_func.count())
            .group_by(TenantModel.plan)
        )
        
        return {
            "total": total.scalar() or 0,
            "active": active.scalar() or 0,
            "trial": trial.scalar() or 0,
            "suspended": suspended.scalar() or 0,
            "plans": {row[0]: row[1] for row in plan_dist.all()}
        }
    
    async def get_tenant_usage(self, tenant_id: UUID) -> Dict[str, Any]:
        """Get usage metrics for a specific tenant"""
        # User count
        user_count = await self.db.execute(
            select(sa_func.count()).select_from(User)
            .where(User.tenant_id == tenant_id, User.is_active == True)
        )
        
        # Get plan limits from tenant
        tenant = await self.get_tenant(tenant_id)
        plan_limits = tenant.plan_details if tenant else {}
        
        users = user_count.scalar() or 0
        
        return {
            "users": {
                "current": users,
                "limit": plan_limits.get("max_users", 0),
                "percentage": round((users / max(plan_limits.get("max_users", 1), 1)) * 100, 1)
            },
            "plan": tenant.plan if tenant else "basic",
            "status": tenant.status if tenant else "unknown"
        }
    
    # =============================================
    # Onboarding Helpers
    # =============================================
    
    async def _seed_default_settings(self, tenant_id: UUID):
        """Seed default tenant settings when creating a new tenant"""
        from backend.modules.settings.domain.models import TenantSettingModel
        
        default_settings = [
            # Order & Operations
            ("order.auto_deduct_inventory", "true", "BOOLEAN", "Tự động trừ kho khi đơn hàng hoàn thành"),
            ("order.auto_create_timesheet", "true", "BOOLEAN", "Tự động tạo timesheet khi đơn hàng hoàn thành"),
            ("order.auto_earn_loyalty", "true", "BOOLEAN", "Tự động cộng điểm loyalty khi đơn hàng hoàn thành"),
            ("order.require_deposit", "false", "BOOLEAN", "Yêu cầu đặt cọc trước khi xác nhận đơn hàng"),
            # CRM & Loyalty
            ("crm.loyalty_enabled", "true", "BOOLEAN", "Bật/tắt chương trình tích điểm khách hàng"),
            ("crm.loyalty_points_ratio", "10000", "NUMBER", "Số VND tương ứng 1 điểm loyalty"),
            # Quote
            ("quote.default_validity_days", "30", "NUMBER", "Số ngày hiệu lực mặc định cho báo giá mới"),
            ("quote.expiring_soon_days", "7", "NUMBER", "Ngưỡng cảnh báo báo giá sắp hết hạn (ngày)"),
            # Finance
            ("finance.auto_journal_on_payment", "true", "BOOLEAN", "Tự động tạo bút toán khi ghi nhận thanh toán"),
            ("finance.default_payment_terms", "30", "NUMBER", "Số ngày thanh toán mặc định"),
            ("finance.tax_rate", "10", "NUMBER", "Thuế GTGT mặc định (%)"),
            # System (existing)
            ("hr.sync_order_assignments", "true", "BOOLEAN", "Đồng bộ phân công nhân viên giữa Order và HR"),
            ("inventory.auto_import_from_po", "false", "BOOLEAN", "Tự động nhập kho khi PO được duyệt"),
            # P6: Appearance defaults for new tenants
            ("appearance.theme", "light", "STRING", "Chế độ hiển thị (light/dark/system)"),
            ("appearance.accent_color", "#7c3aed", "STRING", "Màu chủ đạo giao diện"),
            ("appearance.font_size", "default", "STRING", "Cỡ chữ hiển thị (small/default/large)"),
            ("appearance.density", "default", "STRING", "Mật độ giao diện (compact/default/comfortable)"),
        ]
        
        for key, value, stype, desc in default_settings:
            setting = TenantSettingModel(
                tenant_id=tenant_id,
                setting_key=key,
                setting_value=value,
                setting_type=stype,
                description=desc
            )
            self.db.add(setting)
    
    async def get_usage_summary(self, tenant_id: UUID) -> Dict[str, Any]:
        """Get comprehensive usage summary including users, orders, storage"""
        from backend.core.middleware.quota_check import get_usage_summary
        return await get_usage_summary(self.db, tenant_id)
    
    async def get_tenant_settings(self, tenant_id: UUID) -> List[Dict[str, Any]]:
        """Get all settings for a tenant"""
        from backend.modules.settings.domain.models import TenantSettingModel
        result = await self.db.execute(
            select(TenantSettingModel)
            .where(TenantSettingModel.tenant_id == tenant_id)
            .order_by(TenantSettingModel.setting_key)
        )
        settings = result.scalars().all()
        return [
            {
                "key": s.setting_key,
                "value": s.setting_value,
                "type": s.setting_type,
                "description": s.description,
            }
            for s in settings
        ]
    
    # P5: Appearance settings validation rules
    VALID_APPEARANCE_VALUES = {
        'appearance.theme': ['light', 'dark', 'system'],
        'appearance.font_size': ['small', 'default', 'large'],
        'appearance.density': ['compact', 'default', 'comfortable'],
    }

    @staticmethod
    def _validate_appearance_value(key: str, value: str) -> bool:
        """Validate appearance setting values. Returns True if valid."""
        import re
        if key in TenantService.VALID_APPEARANCE_VALUES:
            return value in TenantService.VALID_APPEARANCE_VALUES[key]
        if key == 'appearance.accent_color':
            return bool(re.match(r'^#[0-9a-fA-F]{6}$', value))
        return True  # Non-appearance keys pass through

    async def update_tenant_settings(self, tenant_id: UUID, settings: Dict[str, str]) -> bool:
        """Update tenant settings (key-value pairs) with validation"""
        from backend.modules.settings.domain.models import TenantSettingModel

        # P5: Validate appearance values before saving
        for key, value in settings.items():
            if key.startswith('appearance.'):
                if not self._validate_appearance_value(key, str(value)):
                    raise ValueError(f"Invalid value '{value}' for setting '{key}'")

        for key, value in settings.items():
            result = await self.db.execute(
                select(TenantSettingModel)
                .where(
                    TenantSettingModel.tenant_id == tenant_id,
                    TenantSettingModel.setting_key == key
                )
            )
            setting = result.scalar_one_or_none()
            if setting:
                setting.setting_value = str(value)
            else:
                new_setting = TenantSettingModel(
                    tenant_id=tenant_id,
                    setting_key=key,
                    setting_value=str(value),
                    setting_type="STRING",
                    description=""
                )
                self.db.add(new_setting)
        await self.db.commit()
        return True
    
    async def switch_tenant_context(self, super_admin_user_id: UUID, target_tenant_id: UUID) -> Optional[TenantModel]:
        """Allow super_admin to view context of another tenant"""
        target = await self.get_tenant(target_tenant_id)
        if not target:
            return None
        return target
    
    def _generate_slug(self, name: str) -> str:
        """Generate a URL-friendly slug from tenant name"""
        import re
        slug = name.lower().strip()
        slug = re.sub(r'[^a-z0-9\s-]', '', slug)
        slug = re.sub(r'[\s]+', '-', slug)
        slug = re.sub(r'-+', '-', slug)
        return slug[:50]
