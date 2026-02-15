"""
Tenant Module - HTTP Router
FastAPI endpoints for tenant management (Super Admin + Tenant Admin self-service)
"""

import os
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

from backend.core.database import get_db
from backend.core.dependencies import get_current_tenant
from backend.core.auth.router import get_current_user
from backend.core.auth.schemas import User as UserSchema
from backend.core.auth.permissions import require_permission
from backend.modules.tenant.services.tenant_service import TenantService

# Upload configuration
ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp", "image/svg+xml"}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
# Resolve path relative to project root
PROJECT_ROOT = Path(__file__).resolve().parents[4]  # backend/modules/tenant/infrastructure -> project root
UPLOAD_DIR = PROJECT_ROOT / "frontend" / "public" / "uploads" / "logos"


router = APIRouter(prefix="/tenants", tags=["Tenant Management"])


# =============================================
# Pydantic Schemas
# =============================================

class TenantResponse(BaseModel):
    id: str
    name: str
    slug: Optional[str] = None
    code: Optional[str] = None
    plan: str = "basic"
    status: str = "active"
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    plan_details: Dict[str, Any] = {}
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    trial_ends_at: Optional[str] = None
    suspended_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class TenantCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: Optional[str] = None
    plan: str = "basic"
    domain: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    plan_details: Optional[Dict[str, Any]] = None


class TenantUpdateRequest(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    plan: Optional[str] = None
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    plan_details: Optional[Dict[str, Any]] = None


class TenantStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|suspended|trial|cancelled)$")


class TenantListResponse(BaseModel):
    tenants: List[TenantResponse]
    total: int
    page: int
    limit: int


class TenantStatsResponse(BaseModel):
    total: int
    active: int
    trial: int
    suspended: int
    plans: Dict[str, int]


def _serialize_tenant(tenant) -> TenantResponse:
    """Convert ORM model to response schema"""
    return TenantResponse(
        id=str(tenant.id),
        name=tenant.name,
        slug=tenant.slug,
        code=tenant.code,
        plan=tenant.plan or "basic",
        status=tenant.status or "active",
        domain=tenant.domain,
        logo_url=tenant.logo_url,
        plan_details=tenant.plan_details or {},
        contact_email=tenant.contact_email,
        contact_phone=tenant.contact_phone,
        address=tenant.address,
        trial_ends_at=tenant.trial_ends_at.isoformat() if tenant.trial_ends_at else None,
        suspended_at=tenant.suspended_at.isoformat() if tenant.suspended_at else None,
        created_at=tenant.created_at.isoformat() if tenant.created_at else None,
        updated_at=tenant.updated_at.isoformat() if tenant.updated_at else None,
    )


# =============================================
# Super Admin Endpoints
# =============================================

@router.get("", response_model=TenantListResponse,
            dependencies=[Depends(require_permission("tenant", "view"))])
async def list_tenants(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    plan: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all tenants (Super Admin only)"""
    service = TenantService(db)
    skip = (page - 1) * limit
    tenants, total = await service.list_tenants(
        search=search, status=status, plan=plan,
        skip=skip, limit=limit
    )
    return TenantListResponse(
        tenants=[_serialize_tenant(t) for t in tenants],
        total=total,
        page=page,
        limit=limit
    )


@router.get("/stats", response_model=TenantStatsResponse,
            dependencies=[Depends(require_permission("tenant", "view"))])
async def get_tenant_stats(
    db: AsyncSession = Depends(get_db),
):
    """Get aggregate tenant statistics (Super Admin only)"""
    service = TenantService(db)
    return await service.get_tenant_stats()


@router.get("/me")
async def get_my_tenant(
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Get current tenant info (any authenticated user)"""
    service = TenantService(db)
    tenant = await service.get_tenant(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant không tồn tại")
    return _serialize_tenant(tenant)


@router.put("/me")
async def update_my_tenant(
    data: TenantUpdateRequest,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user),
):
    """Tenant admin updates own tenant info (branding, contact)"""
    # Only admin/super_admin can update tenant info
    role_code = current_user.role.code.lower() if current_user.role else ""
    if role_code not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có thể cập nhật thông tin tenant")
    
    service = TenantService(db)
    tenant = await service.update_tenant(tenant_id, data.model_dump(exclude_unset=True))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant không tồn tại")
    return _serialize_tenant(tenant)


@router.post("/me/logo")
async def upload_tenant_logo(
    file: UploadFile = File(...),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user),
):
    """Upload logo for current tenant (Admin only)"""
    # Permission check
    role_code = current_user.role.code.lower() if current_user.role else ""
    if role_code not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có thể cập nhật logo")

    # Validate content type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Loại file không hỗ trợ: {file.content_type}. Chỉ chấp nhận PNG, JPG, WEBP, SVG."
        )

    # Read file and validate size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File quá lớn ({len(contents) / 1024 / 1024:.1f}MB). Tối đa 2MB."
        )

    # Determine file extension
    ext_map = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp",
        "image/svg+xml": "svg",
    }
    ext = ext_map.get(file.content_type, "png")

    # Ensure upload directory exists
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # Remove old logo files for this tenant (any extension)
    for old_file in UPLOAD_DIR.glob(f"{tenant_id}.*"):
        old_file.unlink(missing_ok=True)

    # Save new file
    filename = f"{tenant_id}.{ext}"
    filepath = UPLOAD_DIR / filename
    with open(filepath, "wb") as f:
        f.write(contents)

    # Update tenant logo_url in DB
    logo_url = f"/uploads/logos/{filename}"
    service = TenantService(db)
    tenant = await service.update_tenant(tenant_id, {"logo_url": logo_url})

    return {"logo_url": logo_url, "message": "Upload logo thành công"}


@router.delete("/me/logo")
async def delete_tenant_logo(
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user),
):
    """Delete logo for current tenant (Admin only)"""
    # Permission check
    role_code = current_user.role.code.lower() if current_user.role else ""
    if role_code not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có thể xóa logo")

    # Remove logo files
    for old_file in UPLOAD_DIR.glob(f"{tenant_id}.*"):
        old_file.unlink(missing_ok=True)

    # Clear logo_url in DB
    service = TenantService(db)
    await service.update_tenant(tenant_id, {"logo_url": None})

    return {"message": "Đã xóa logo"}


@router.get("/me/usage")
async def get_my_usage(
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Get comprehensive usage stats for current tenant"""
    service = TenantService(db)
    return await service.get_usage_summary(tenant_id)


@router.get("/me/settings")
async def get_my_settings(
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Get all settings for current tenant"""
    service = TenantService(db)
    return await service.get_tenant_settings(tenant_id)


class TenantSettingsUpdateRequest(BaseModel):
    settings: Dict[str, str]


@router.put("/me/settings")
async def update_my_settings(
    data: TenantSettingsUpdateRequest,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user),
):
    """Update settings for current tenant (Admin only)"""
    role_code = current_user.role.code.lower() if current_user.role else ""
    if role_code not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có thể cập nhật cài đặt")
    
    service = TenantService(db)
    try:
        await service.update_tenant_settings(tenant_id, data.settings)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return {"message": "Cập nhật cài đặt thành công"}


@router.get("/{tenant_id}", response_model=TenantResponse,
            dependencies=[Depends(require_permission("tenant", "view"))])
async def get_tenant(
    tenant_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific tenant by ID (Super Admin only)"""
    service = TenantService(db)
    tenant = await service.get_tenant(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant không tồn tại")
    return _serialize_tenant(tenant)


@router.post("", response_model=TenantResponse,
             dependencies=[Depends(require_permission("tenant", "create"))])
async def create_tenant(
    data: TenantCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a new tenant with auto-onboarding (Super Admin only)"""
    service = TenantService(db)
    try:
        tenant = await service.create_tenant(data.model_dump())
        return _serialize_tenant(tenant)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Không thể tạo tenant: {str(e)}")


@router.put("/{tenant_id}", response_model=TenantResponse,
            dependencies=[Depends(require_permission("tenant", "edit"))])
async def update_tenant(
    tenant_id: UUID,
    data: TenantUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update tenant properties (Super Admin only)"""
    service = TenantService(db)
    tenant = await service.update_tenant(tenant_id, data.model_dump(exclude_unset=True))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant không tồn tại")
    return _serialize_tenant(tenant)


@router.patch("/{tenant_id}/status", response_model=TenantResponse,
              dependencies=[Depends(require_permission("tenant", "edit"))])
async def change_tenant_status(
    tenant_id: UUID,
    data: TenantStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Suspend/activate/cancel a tenant (Super Admin only)"""
    service = TenantService(db)
    tenant = await service.update_tenant_status(tenant_id, data.status)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant không tồn tại")
    return _serialize_tenant(tenant)


@router.delete("/{tenant_id}",
               dependencies=[Depends(require_permission("tenant", "delete"))])
async def delete_tenant(
    tenant_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a tenant (sets status to cancelled) (Super Admin only)"""
    service = TenantService(db)
    success = await service.delete_tenant(tenant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tenant không tồn tại")
    return {"message": "Tenant đã được hủy", "tenant_id": str(tenant_id)}


@router.get("/{tenant_id}/usage",
            dependencies=[Depends(require_permission("tenant", "view"))])
async def get_tenant_usage(
    tenant_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get comprehensive usage metrics for a specific tenant (Super Admin only)"""
    service = TenantService(db)
    return await service.get_usage_summary(tenant_id)


@router.post("/switch/{tenant_id}",
             dependencies=[Depends(require_permission("tenant", "view"))])
async def switch_tenant(
    tenant_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user),
):
    """Switch tenant context for super_admin — returns target tenant info"""
    role_code = current_user.role.code.lower() if current_user.role else ""
    if role_code != "super_admin":
        raise HTTPException(status_code=403, detail="Chỉ Super Admin mới có thể chuyển đổi tenant")
    
    service = TenantService(db)
    tenant = await service.switch_tenant_context(current_user.id, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant không tồn tại")
    return _serialize_tenant(tenant)

