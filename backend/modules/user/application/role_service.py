"""
Role Service - CRUD operations for roles and permission management
"""

from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func
from fastapi import HTTPException

from backend.modules.user.domain.role_model import RoleModel


# Valid permission modules and their actions (BE-02: Format validation)
VALID_PERMISSION_MODULES = {
    'dashboard': ['view'],
    'menu': ['view', 'create', 'edit', 'delete', 'set_price', 'view_cost'],
    'quote': ['view', 'create', 'edit', 'delete', 'convert', 'clone', 'export'],
    'order': ['view', 'create', 'edit', 'delete', 'confirm', 'cancel', 'update_status'],
    'calendar': ['view', 'create', 'edit', 'assign_staff', 'check_in'],
    'procurement': ['view', 'create', 'edit', 'delete', 'approve_po', 'record_payment'],
    'inventory': ['view', 'create', 'edit', 'delete', 'stock_transfer'],
    'hr': ['view', 'create', 'edit', 'delete', 'view_salary', 'process_payroll'],
    'finance': ['view', 'create', 'edit', 'delete', 'post_journal', 'close_period'],
    'crm': ['view', 'create', 'edit', 'delete'],
    'analytics': ['view', 'export'],
    'user': ['view', 'create', 'edit', 'delete', 'manage_roles'],
    'settings': ['view', 'edit'],
}


def _validate_permissions(permissions: list[str]) -> list[str]:
    """Validate and filter permissions against known modules/actions.
    Returns only valid permissions. Silently drops unknown ones."""
    valid = []
    for p in permissions:
        if p == 'ALL':
            valid.append(p)
            continue
        if ':' not in p:
            continue
        module, action = p.split(':', 1)
        if module not in VALID_PERMISSION_MODULES:
            continue
        if action == '*' or action in VALID_PERMISSION_MODULES[module]:
            valid.append(p)
    return valid


class RoleService:
    """Service for managing roles and permissions"""

    def __init__(self, db: AsyncSession, tenant_id: UUID):
        self.db = db
        self.tenant_id = tenant_id

    async def get_roles(self) -> List[RoleModel]:
        """Get all roles for current tenant"""
        stmt = (
            select(RoleModel)
            .where(RoleModel.tenant_id == self.tenant_id)
            .order_by(RoleModel.is_system.desc(), RoleModel.name)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_role_by_id(self, role_id: UUID) -> Optional[RoleModel]:
        """Get role by ID"""
        stmt = (
            select(RoleModel)
            .where(RoleModel.id == role_id)
            .where(RoleModel.tenant_id == self.tenant_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_role_by_code(self, code: str) -> Optional[RoleModel]:
        """Get role by code"""
        stmt = (
            select(RoleModel)
            .where(RoleModel.code == code)
            .where(RoleModel.tenant_id == self.tenant_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_role(
        self,
        code: str,
        name: str,
        description: Optional[str] = None,
        permissions: Optional[List[str]] = None
    ) -> RoleModel:
        """Create a new custom role"""
        # Check for duplicate code
        existing = await self.get_role_by_code(code)
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Vai trò với mã '{code}' đã tồn tại"
            )

        role = RoleModel(
            tenant_id=self.tenant_id,
            code=code,
            name=name,
            description=description,
            permissions=_validate_permissions(permissions or []),
            is_system=False
        )

        self.db.add(role)
        await self.db.commit()
        await self.db.refresh(role)
        return role

    async def update_role(
        self,
        role_id: UUID,
        name: Optional[str] = None,
        description: Optional[str] = None,
        permissions: Optional[List[str]] = None
    ) -> RoleModel:
        """Update role details and/or permissions"""
        role = await self.get_role_by_id(role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Vai trò không tồn tại")

        if name is not None:
            role.name = name
        if description is not None:
            role.description = description
        if permissions is not None:
            role.permissions = _validate_permissions(permissions)

        await self.db.commit()
        await self.db.refresh(role)
        return role

    async def update_role_permissions(
        self,
        role_id: UUID,
        permissions: List[str]
    ) -> RoleModel:
        """Update only the permissions of a role"""
        role = await self.get_role_by_id(role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Vai trò không tồn tại")

        # Super admin always has ALL permissions
        if role.code == "super_admin":
            raise HTTPException(
                status_code=400,
                detail="Không thể thay đổi quyền của Super Admin"
            )

        role.permissions = _validate_permissions(permissions)
        await self.db.commit()
        await self.db.refresh(role)
        return role

    async def delete_role(self, role_id: UUID) -> None:
        """Delete a custom role (BR053: cannot delete system roles)"""
        role = await self.get_role_by_id(role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Vai trò không tồn tại")

        if role.is_system:
            raise HTTPException(
                status_code=400,
                detail=f"Không thể xóa vai trò hệ thống '{role.name}'"
            )

        # Check if any users have this role
        from backend.core.auth.models import User
        user_count_stmt = (
            select(sa_func.count())
            .select_from(User)
            .where(User.role == role.code)
            .where(User.tenant_id == self.tenant_id)
        )
        result = await self.db.execute(user_count_stmt)
        count = result.scalar()

        if count and count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Không thể xóa vai trò '{role.name}' vì còn {count} người dùng đang sử dụng"
            )

        await self.db.delete(role)
        await self.db.commit()
