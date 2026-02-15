# Security Rules (Load for Auth/Permission Work)

> **Load when**: Working on authentication, authorization, permissions.
> Size: ~6KB

---

## 1. Authentication

### 1.1 JWT Configuration
```python
# core/config.py
from pydantic_settings import BaseSettings

class JWTConfig(BaseSettings):
    secret_key: str  # At least 256 bits
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    issuer: str = "erp-saas"
```

### 1.2 JWT Claims
```python
# core/auth.py
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class TokenPayload(BaseModel):
    sub: UUID  # user_id
    tid: UUID  # tenant_id
    roles: list[str]
    exp: datetime
    iat: datetime
```

### 1.3 Password Hashing
```python
# MUST use Argon2 (NOT bcrypt for new code)
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

---

## 2. Authorization: ReBAC

### 2.1 Relationship-Based Access Control
```python
# core/permissions.py
from uuid import UUID

class PermissionService:
    async def can(
        self,
        user_id: UUID,
        action: str,
        object_type: str,
        object_id: UUID
    ) -> bool:
        # 1. Check user roles (RBAC)
        if await self.has_role_permission(user_id, object_type, action):
            return True
        
        # 2. Check resource relationship (ReBAC)
        return await self.has_relation_permission(
            user_id, object_type, object_id, action
        )
```

### 2.2 Permission Tables
```sql
-- User Roles
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id),
    role TEXT NOT NULL,
    tenant_id UUID NOT NULL,
    PRIMARY KEY (user_id, role, tenant_id)
);

-- Resource Relations
CREATE TABLE resource_relations (
    user_id UUID NOT NULL,
    object_type TEXT NOT NULL,  -- 'project', 'order'
    object_id UUID NOT NULL,
    relation TEXT NOT NULL,     -- 'owner', 'member', 'viewer'
    tenant_id UUID NOT NULL,
    PRIMARY KEY (user_id, object_type, object_id)
);
```

### 2.3 Relation Permissions
```python
RELATION_PERMISSIONS: dict[str, list[str]] = {
    "owner":   ["view", "edit", "delete", "manage"],
    "manager": ["view", "edit", "manage"],
    "member":  ["view", "edit_own"],
    "viewer":  ["view"],
}
```

---

## 3. Role Hierarchy

```
super_admin
  └── admin
        └── manager
              ├── accountant
              ├── hr_staff
              ├── pm
              └── sales
                    └── staff
                          └── viewer
```

### 3.1 Role Inheritance
```python
ROLE_HIERARCHY: dict[str, list[str]] = {
    "super_admin": ["admin"],
    "admin":       ["manager"],
    "manager":     ["accountant", "hr_staff", "pm", "sales", "staff"],
    "staff":       ["viewer"],
}

def has_role(user_roles: list[str], target_role: str) -> bool:
    for role in user_roles:
        if role == target_role or inherits_role(role, target_role):
            return True
    return False

def inherits_role(role: str, target: str) -> bool:
    children = ROLE_HIERARCHY.get(role, [])
    if target in children:
        return True
    return any(inherits_role(child, target) for child in children)
```

---

## 4. API Security

### 4.1 Rate Limiting (P0)
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# Per-tenant limits
TENANT_LIMITS = {
    "free":       "100/minute",
    "starter":    "500/minute",
    "business":   "2000/minute",
    "enterprise": "10000/minute",
}

@app.get("/api/items")
@limiter.limit("100/minute")
async def list_items():
    ...
```

### 4.2 Input Validation (P0)
```python
# ❌ NEVER - Direct concatenation
query = f"SELECT * FROM orders WHERE id = '{user_input}'"

# ✅ ALWAYS - Parameterized queries (SQLAlchemy)
stmt = select(Order).where(Order.id == user_input)

# ✅ ALWAYS - Validate before use with Pydantic
from pydantic import BaseModel, UUID4, Field

class CreateOrderCommand(BaseModel):
    customer_id: UUID4
    amount: float = Field(..., gt=0)
    
    # Pydantic validates automatically
```

### 4.3 XSS Prevention
```python
# Escape user content before rendering
import html

safe_content = html.escape(user_generated_content)
```

---

## 5. Audit Logging (P0)

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action TEXT NOT NULL,      -- 'create', 'update', 'delete'
    entity_type TEXT NOT NULL, -- 'order', 'item'
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for querying
CREATE INDEX idx_audit_tenant_entity 
    ON audit_log(tenant_id, entity_type, entity_id);
```

```python
# Call after every mutation
class OrderService:
    async def update_order(self, order: Order) -> Order:
        old_order = await self.repo.get_by_id(order.id)
        updated = await self.repo.update(order)
        
        await self.audit.log(
            action="update",
            entity_type="order",
            entity_id=order.id,
            old_value=old_order.model_dump(),
            new_value=updated.model_dump()
        )
        return updated
```

---

## 6. Permission Matrix Reference

> For detailed permission definitions, see `.agent/permission-matrix.md`

### Quick Reference
| Module | Hidden From |
| :--- | :--- |
| Finance | technician, engineer, warehouse |
| HR | technician, engineer, pm, sales |
| Settings | All except admin |
| Dashboard | None (all can access) |

---

## 7. FastAPI Security Dependencies

```python
# core/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401)
    except JWTError:
        raise HTTPException(status_code=401)
    
    user = await user_service.get_by_id(UUID(user_id))
    if user is None:
        raise HTTPException(status_code=401)
    return user

async def get_current_tenant(user: User = Depends(get_current_user)) -> UUID:
    return user.tenant_id

def require_permission(module: str, action: str):
    async def check(user: User = Depends(get_current_user)) -> User:
        if not await permission_service.can(user.id, action, module, None):
            raise HTTPException(status_code=403)
        return user
    return check
```
