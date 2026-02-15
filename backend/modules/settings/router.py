"""
FastAPI Router for Settings Module
Endpoints for tenant-level configuration management
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

from backend.core.database import get_db
from backend.core.dependencies import get_current_tenant
from backend.modules.settings.domain.models import TenantSettingModel
from backend.modules.settings.services.settings_service import SettingsService

router = APIRouter(prefix="/settings", tags=["Settings"])


# Schemas
class SettingResponse(BaseModel):
    key: str
    value: str
    type: str
    description: Optional[str] = None


class SettingUpdate(BaseModel):
    value: str
    description: Optional[str] = None


class SettingCreate(BaseModel):
    key: str
    value: str
    type: str = 'STRING'
    description: Optional[str] = None


@router.get("", response_model=List[SettingResponse])
async def list_settings(
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """List all settings for tenant"""
    result = await db.execute(
        select(TenantSettingModel).where(
            TenantSettingModel.tenant_id == tenant_id,
            TenantSettingModel.is_active == True
        ).order_by(TenantSettingModel.setting_key)
    )
    settings = result.scalars().all()
    
    return [
        SettingResponse(
            key=s.setting_key,
            value=s.setting_value or '',
            type=s.setting_type,
            description=s.description
        )
        for s in settings
    ]


@router.get("/{key}", response_model=SettingResponse)
async def get_setting(
    key: str,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific setting by key"""
    result = await db.execute(
        select(TenantSettingModel).where(
            TenantSettingModel.tenant_id == tenant_id,
            TenantSettingModel.setting_key == key
        )
    )
    setting = result.scalar_one_or_none()
    
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    
    return SettingResponse(
        key=setting.setting_key,
        value=setting.setting_value or '',
        type=setting.setting_type,
        description=setting.description
    )


@router.put("/{key}", response_model=SettingResponse)
async def update_setting(
    key: str,
    data: SettingUpdate,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Update a setting value"""
    result = await db.execute(
        select(TenantSettingModel).where(
            TenantSettingModel.tenant_id == tenant_id,
            TenantSettingModel.setting_key == key
        )
    )
    setting = result.scalar_one_or_none()
    
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    
    setting.setting_value = data.value
    if data.description:
        setting.description = data.description
    
    await db.commit()
    await db.refresh(setting)
    
    return SettingResponse(
        key=setting.setting_key,
        value=setting.setting_value or '',
        type=setting.setting_type,
        description=setting.description
    )


@router.post("", response_model=SettingResponse)
async def create_setting(
    data: SettingCreate,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Create a new setting"""
    # Check if exists
    result = await db.execute(
        select(TenantSettingModel).where(
            TenantSettingModel.tenant_id == tenant_id,
            TenantSettingModel.setting_key == data.key
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Setting '{data.key}' already exists")
    
    setting = TenantSettingModel(
        tenant_id=tenant_id,
        setting_key=data.key,
        setting_value=data.value,
        setting_type=data.type,
        description=data.description
    )
    db.add(setting)
    await db.commit()
    await db.refresh(setting)
    
    return SettingResponse(
        key=setting.setting_key,
        value=setting.setting_value or '',
        type=setting.setting_type,
        description=setting.description
    )


# Convenience endpoints for specific settings
@router.get("/inventory/auto-import")
async def get_auto_import_setting(
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Get auto-import from PO setting (Sprint 19.1)"""
    service = SettingsService(db, tenant_id)
    enabled = await service.is_auto_import_po_enabled()
    return {"enabled": enabled, "key": "inventory.auto_import_from_po"}


@router.put("/inventory/auto-import")
async def set_auto_import_setting(
    enabled: bool,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Toggle auto-import from PO (Sprint 19.1)"""
    service = SettingsService(db, tenant_id)
    await service.set(
        'inventory.auto_import_from_po', 
        enabled, 
        description='Tự động nhập kho khi PO được duyệt'
    )
    return {"enabled": enabled, "message": "Cài đặt đã được cập nhật"}


@router.get("/hr/sync-assignments")
async def get_hr_sync_setting(
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Get HR-Order sync setting (Sprint 18.1)"""
    service = SettingsService(db, tenant_id)
    enabled = await service.is_hr_sync_enabled()
    return {"enabled": enabled, "key": "hr.sync_order_assignments"}


@router.put("/hr/sync-assignments")
async def set_hr_sync_setting(
    enabled: bool,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Toggle HR-Order assignment sync (Sprint 18.1)"""
    service = SettingsService(db, tenant_id)
    await service.set(
        'hr.sync_order_assignments', 
        enabled, 
        description='Đồng bộ phân công nhân viên giữa Order và HR'
    )
    return {"enabled": enabled, "message": "Cài đặt đã được cập nhật"}
