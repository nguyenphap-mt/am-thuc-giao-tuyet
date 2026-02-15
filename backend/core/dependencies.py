"""
Core Dependencies for FastAPI
Contains reusable dependencies for authentication, tenant resolution, etc.
"""

from typing import Annotated
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from jose import JWTError, jwt

from backend.core.database import get_db
from backend.core.auth.security import SECRET_KEY, ALGORITHM
from backend.core.auth.models import User
from backend.core.auth.schemas import User as UserSchema

# OAuth2 scheme for token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: AsyncSession = Depends(get_db)
) -> UserSchema:
    """
    Get current authenticated user from JWT token.
    Returns UserSchema with tenant_id.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    # Map to Schema
    user_schema = UserSchema(
        id=user.id,
        tenant_id=user.tenant_id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        role={"id": user.id, "code": user.role, "name": user.role.upper(), "permissions": []},
        created_at=user.created_at,
        updated_at=user.updated_at
    )
    return user_schema


async def get_current_tenant(
    current_user: Annotated[UserSchema, Depends(get_current_user)]
) -> UUID:
    """
    Extract tenant_id from current authenticated user.
    Use this dependency in all protected endpoints.
    
    Usage:
        @router.get("/items")
        async def list_items(
            tenant_id: UUID = Depends(get_current_tenant),
            db: AsyncSession = Depends(get_db)
        ):
            # tenant_id is now available
    """
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not associated with any tenant"
        )
    return current_user.tenant_id


async def set_tenant_context(
    db: AsyncSession,
    tenant_id: UUID
) -> None:
    """
    Set the current tenant in PostgreSQL session for RLS policies.
    Call this at the start of each request that uses RLS.
    
    Usage:
        await set_tenant_context(db, tenant_id)
        # Now RLS policies will filter by this tenant
    """
    await db.execute(
        text(f"SET app.current_tenant = '{str(tenant_id)}'")
    )


# Optional: Combined dependency that sets tenant context automatically
async def get_tenant_db(
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
) -> tuple[UUID, AsyncSession]:
    """
    Get tenant_id and db session with tenant context already set.
    Useful for endpoints that use RLS.
    
    Usage:
        @router.get("/items")
        async def list_items(tenant_db: tuple = Depends(get_tenant_db)):
            tenant_id, db = tenant_db
            # RLS context is already set
    """
    await set_tenant_context(db, tenant_id)
    return (tenant_id, db)


# Type aliases for cleaner code
CurrentUser = Annotated[UserSchema, Depends(get_current_user)]
CurrentTenant = Annotated[UUID, Depends(get_current_tenant)]


# =============================================================================
# RBAC Permission Checking (ISS-003 FIX)
# =============================================================================

# Define module permissions - BUGFIX: Added super_admin role
QUOTE_PERMISSIONS = {
    "quote:read": ["super_admin", "admin", "manager", "sales", "viewer"],
    "quote:create": ["super_admin", "admin", "manager", "sales"],
    "quote:update": ["super_admin", "admin", "manager", "sales"],
    "quote:delete": ["super_admin", "admin", "manager"],
    "quote:convert": ["super_admin", "admin", "manager", "sales"],
    "quote:clone": ["super_admin", "admin", "manager", "sales"],
    "quote:export": ["super_admin", "admin", "manager", "sales", "viewer"],
}


def require_permission(permission: str):
    """
    Factory function that creates a dependency to check user permissions.
    
    BUGFIX: ISS-003 - Missing Route-Level RBAC
    
    Usage:
        @router.post("/quote")
        async def create_quote(
            current_user: CurrentUser,
            _: None = Depends(require_permission("quote:create"))
        ):
            ...
    
    Args:
        permission: Permission string in format "module:action"
                   e.g., "quote:create", "quote:delete"
    
    Raises:
        HTTPException 403 if user doesn't have required permission
    """
    async def permission_checker(
        current_user: Annotated[UserSchema, Depends(get_current_user)]
    ) -> None:
        # Get user's role - role is a Role pydantic model, not a dict
        # BUGFIX: BUG-20260202-005 - Was using .get() on Role model
        user_role = ""
        if current_user.role:
            # Role is a Pydantic model with .code attribute
            user_role = getattr(current_user.role, 'code', '').lower()
        
        # Check if permission exists
        allowed_roles = QUOTE_PERMISSIONS.get(permission, [])
        
        if not allowed_roles:
            # Unknown permission - deny by default
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Unknown permission: {permission}"
            )
        
        # Check if user's role is allowed
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission} requires one of {allowed_roles}, but user has '{user_role}'"
            )
        
        return None
    
    return permission_checker


# Pre-built permission dependencies for common use
RequireQuoteRead = Depends(require_permission("quote:read"))
RequireQuoteCreate = Depends(require_permission("quote:create"))
RequireQuoteUpdate = Depends(require_permission("quote:update"))
RequireQuoteDelete = Depends(require_permission("quote:delete"))
RequireQuoteConvert = Depends(require_permission("quote:convert"))
RequireQuoteClone = Depends(require_permission("quote:clone"))
RequireQuoteExport = Depends(require_permission("quote:export"))
