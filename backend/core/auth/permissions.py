from functools import wraps
from fastapi import HTTPException, Depends
from backend.core.auth.router import get_current_user
from backend.core.auth.schemas import User as UserSchema

# Module Access Config (Matches .agent/permission-matrix.md)
# Defines which roles can ACCESS each module at all
MODULE_ACCESS = {
    "dashboard": ["*"],
    "menu": ["super_admin", "admin", "manager", "chef", "sales", "viewer"],
    "quote": ["super_admin", "admin", "manager", "sales", "accountant"],
    "order": ["super_admin", "admin", "manager", "chef", "sales", "staff", "accountant"],
    "calendar": ["super_admin", "admin", "manager", "chef", "sales", "staff"],
    "procurement": ["super_admin", "admin", "manager", "chef", "accountant"],
    "hr": ["super_admin", "admin", "manager"],
    "finance": ["super_admin", "admin", "manager", "accountant"],
    "crm": ["super_admin", "admin", "manager", "sales"],
    "analytics": ["super_admin", "admin", "manager", "sales", "accountant"],
    "inventory": ["super_admin", "admin", "manager", "chef"],
    "user": ["super_admin", "admin"],
    "invoice": ["super_admin", "admin", "manager", "sales", "accountant"],
    "settings": ["super_admin", "admin"],
    "tenant": ["super_admin"],
    "mobile": ["*"],
    "notification": ["*"],
}


def require_module(module: str):
    """Dependency that checks module-level access only."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: UserSchema = Depends(get_current_user), **kwargs):
            allowed_roles = MODULE_ACCESS.get(module, [])
            user_role = current_user.role.code

            if "*" not in allowed_roles and user_role not in allowed_roles:
                raise HTTPException(status_code=403, detail=f"Access denied to module {module}")

            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator


# Factory for dependency injection
class PermissionChecker:
    """
    Unified permission checker.
    
    Usage:
        dependencies=[Depends(require_permission("order", "create"))]
    
    Logic:
        1. super_admin always has full access
        2. Check module-level access (MODULE_ACCESS)
        3. If action specified, check user's role permissions array
           for "module:action" or "module:*" or "ALL"
    """
    def __init__(self, module: str, action: str = None):
        self.module = module
        self.action = action

    def __call__(self, current_user: UserSchema = Depends(get_current_user)):
        user_role = current_user.role.code.lower() if current_user.role else ""

        # Super Admin bypass — always has access
        if user_role == "super_admin":
            return True

        # 1. Module Level Check
        allowed_roles = MODULE_ACCESS.get(self.module, [])
        if "*" not in allowed_roles and user_role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Truy cập bị từ chối: vai trò '{user_role}' không có quyền truy cập module '{self.module}'"
            )

        # 2. Action Level Check (via role permissions from DB)
        if self.action:
            # Get permissions from role (stored as list: ["menu:view", "menu:create", ...])
            role_perms = []
            if current_user.role and hasattr(current_user.role, 'permissions'):
                role_perms = current_user.role.permissions or []

            # If role has "ALL" or "module:*", allow any action
            perm_key = f"{self.module}:{self.action}"
            wildcard_key = f"{self.module}:*"

            if "ALL" in role_perms or wildcard_key in role_perms or perm_key in role_perms:
                return True

            # If no permissions stored in DB, fall back to module-level (allow if role can access module)
            # This maintains backward compatibility with roles that don't have granular permissions yet
            if not role_perms:
                return True

            raise HTTPException(
                status_code=403,
                detail=f"Quyền bị từ chối: vai trò '{user_role}' không có quyền '{self.action}' trong module '{self.module}'"
            )

        return True


def require_permission(module: str, action: str = None):
    """Factory function to create a PermissionChecker dependency.
    
    Usage:
        @router.get("/", dependencies=[Depends(require_permission("order", "view"))])
        @router.post("/", dependencies=[Depends(require_permission("order", "create"))])
    """
    return PermissionChecker(module, action)
