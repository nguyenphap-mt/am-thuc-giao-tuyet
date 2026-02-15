"""
Role CRUD Router - Manage roles and permissions
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from pydantic import BaseModel

from backend.core.database import get_db
from backend.core.auth.router import get_current_user
from backend.core.auth.schemas import User as UserSchema
from backend.core.auth.permissions import require_permission
from backend.modules.user.application.role_service import RoleService
from backend.modules.user.application.activity_service import ActivityService, ActivityAction


# --- Schemas ---

class RoleResponse(BaseModel):
    id: UUID
    code: str
    name: str
    description: Optional[str] = None
    permissions: List[str] = []
    is_system: bool = False

    class Config:
        from_attributes = True


class RoleCreateRequest(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    permissions: List[str] = []


class RoleUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None


class RolePermissionsUpdateRequest(BaseModel):
    permissions: List[str]


# --- Router ---

router = APIRouter(prefix="/roles", tags=["Role Management"])


@router.get(
    "/",
    response_model=List[RoleResponse],
    dependencies=[Depends(require_permission("user", "view"))]
)
async def list_roles(
    current_user: UserSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all roles for current tenant"""
    service = RoleService(db, current_user.tenant_id)
    roles = await service.get_roles()
    return roles


@router.post(
    "/",
    response_model=RoleResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("user", "manage_roles"))]
)
async def create_role(
    data: RoleCreateRequest,
    current_user: UserSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new custom role"""
    service = RoleService(db, current_user.tenant_id)
    role = await service.create_role(
        code=data.code.lower().replace(" ", "_"),
        name=data.name,
        description=data.description,
        permissions=data.permissions
    )

    # Audit log (BE-01)
    activity = ActivityService(db, current_user.tenant_id)
    await activity.log(
        user_id=current_user.id,
        action=ActivityAction.CREATE_ROLE,
        entity_type="Role",
        entity_id=role.id,
        metadata={"role_code": role.code, "role_name": role.name}
    )

    return role


@router.put(
    "/{role_id}",
    response_model=RoleResponse,
    dependencies=[Depends(require_permission("user", "manage_roles"))]
)
async def update_role(
    role_id: UUID,
    data: RoleUpdateRequest,
    current_user: UserSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update role details and/or permissions"""
    service = RoleService(db, current_user.tenant_id)
    role = await service.update_role(
        role_id=role_id,
        name=data.name,
        description=data.description,
        permissions=data.permissions
    )

    # Audit log (BE-01)
    activity = ActivityService(db, current_user.tenant_id)
    await activity.log(
        user_id=current_user.id,
        action=ActivityAction.UPDATE_ROLE,
        entity_type="Role",
        entity_id=role.id,
        metadata={"role_code": role.code, "changes": {"name": data.name, "description": data.description}}
    )

    return role


@router.put(
    "/{role_id}/permissions",
    response_model=RoleResponse,
    dependencies=[Depends(require_permission("user", "manage_roles"))]
)
async def update_role_permissions(
    role_id: UUID,
    data: RolePermissionsUpdateRequest,
    current_user: UserSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update only the permissions array of a role"""
    service = RoleService(db, current_user.tenant_id)
    role = await service.update_role_permissions(
        role_id=role_id,
        permissions=data.permissions
    )

    # Audit log (BE-01)
    activity = ActivityService(db, current_user.tenant_id)
    await activity.log(
        user_id=current_user.id,
        action=ActivityAction.UPDATE_PERMISSIONS,
        entity_type="Role",
        entity_id=role.id,
        metadata={"role_code": role.code, "permissions_count": len(data.permissions)}
    )

    return role


@router.delete(
    "/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("user", "manage_roles"))]
)
async def delete_role(
    role_id: UUID,
    current_user: UserSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a custom role (BR053: cannot delete system roles)"""
    service = RoleService(db, current_user.tenant_id)

    # Get role info before deletion for audit log
    role = await service.get_role_by_id(role_id)
    role_code = role.code if role else "unknown"
    role_name = role.name if role else "unknown"

    await service.delete_role(role_id)

    # Audit log (BE-01)
    activity = ActivityService(db, current_user.tenant_id)
    await activity.log(
        user_id=current_user.id,
        action=ActivityAction.DELETE_ROLE,
        entity_type="Role",
        entity_id=role_id,
        metadata={"role_code": role_code, "role_name": role_name}
    )
