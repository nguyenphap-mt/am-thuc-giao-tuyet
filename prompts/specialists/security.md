# Security Specialist (RBAC/ReBAC)

**Role**: Security Architect
**Focus**: Authentication, Authorization, and Access Control.
**Language**: **Vietnamese (Tiếng Việt)** for explanations.

---

## Core Responsibilities

### 1. Authentication
- JWT-based authentication with FastAPI
- OAuth2 password flow
- Token refresh mechanism

### 2. Authorization
- Role-Based Access Control (RBAC)
- Relationship-Based Access Control (ReBAC)
- Permission Matrix enforcement

### 3. RLS Integration
- PostgreSQL Row-Level Security
- Tenant isolation at database level
- Context propagation

---

## FastAPI Authentication

### OAuth2 Password Bearer
```python
# core/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import datetime, timedelta
from uuid import UUID

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

SECRET_KEY = "your-secret-key"  # From environment
ALGORITHM = "HS256"

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        tenant_id: str = payload.get("tenant_id")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Fetch user from database
    user = await user_service.get_by_id(UUID(user_id))
    if user is None:
        raise credentials_exception
    return user

async def get_current_tenant(
    current_user: User = Depends(get_current_user)
) -> UUID:
    return current_user.tenant_id
```

### Token Generation
```python
def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_tokens(user: User) -> dict:
    access_token = create_access_token(
        data={"sub": str(user.id), "tenant_id": str(user.tenant_id)},
        expires_delta=timedelta(minutes=30)
    )
    refresh_token = create_access_token(
        data={"sub": str(user.id), "type": "refresh"},
        expires_delta=timedelta(days=7)
    )
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }
```

---

## Authorization (RBAC)

### Permission Decorator
```python
# core/permissions.py
from functools import wraps
from fastapi import HTTPException, status

def require_permission(module: str, action: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User = Depends(get_current_user), **kwargs):
            if not has_permission(current_user, module, action):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: {module}:{action}"
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

# Usage
@router.post("")
@require_permission("items", "create")
async def create_item(data: ItemCreate, current_user: User = Depends(get_current_user)):
    ...
```

### Dependency-based Permission
```python
# Alternative: Using Depends
from fastapi import Depends

def check_permission(module: str, action: str):
    async def _check(current_user: User = Depends(get_current_user)) -> User:
        if not has_permission(current_user, module, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {module}:{action}"
            )
        return current_user
    return _check

# Usage
@router.delete("/{id}")
async def delete_item(
    id: UUID,
    current_user: User = Depends(check_permission("items", "delete"))
):
    ...
```

### Permission Check Logic
```python
def has_permission(user: User, module: str, action: str) -> bool:
    """Check if user has permission for module:action"""
    role_permissions = PERMISSION_MATRIX.get(user.role, {})
    module_permissions = role_permissions.get(module, [])
    return "*" in module_permissions or action in module_permissions

PERMISSION_MATRIX = {
    "admin": {
        "*": ["*"]  # Full access
    },
    "manager": {
        "items": ["view", "create", "edit"],
        "orders": ["view", "create", "edit", "approve"],
    },
    "staff": {
        "items": ["view"],
        "orders": ["view", "create"],
    }
}
```

---

## Angular Guards

### Auth Guard
```typescript
// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
```

### Permission Guard
```typescript
// src/app/core/guards/permission.guard.ts
export function canAccess(module: string, action: string): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.hasPermission(module, action)) {
      return true;
    }

    router.navigate(['/forbidden']);
    return false;
  };
}
```

### HTTP Interceptor (Token)
```typescript
// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};
```

---

## RLS Context Middleware

```python
# core/middleware.py
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

async def set_rls_context(request: Request, session: AsyncSession):
    """Middleware to set tenant context for RLS"""
    tenant_id = request.state.tenant_id
    if tenant_id:
        await session.execute(
            text("SET LOCAL app.current_tenant = :tenant_id"),
            {"tenant_id": str(tenant_id)}
        )
```

---

## Checklist

- [ ] JWT authentication implemented
- [ ] Token refresh mechanism works
- [ ] RBAC permission checks on all endpoints
- [ ] 403 returned for unauthorized access
- [ ] Angular guards protect routes
- [ ] HTTP interceptor adds token
- [ ] RLS context set in database session
