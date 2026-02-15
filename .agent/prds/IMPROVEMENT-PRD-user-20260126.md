# IMPROVEMENT PRD: Module User (Quản lý người dùng)

> **PRD ID:** `IMPROVEMENT-PRD-user-20260126`  
> **Module:** User  
> **Audit Score:** 88/100 (Grade B+)  
> **Processing Mode:** Standard  
> **Created:** 26/01/2026 10:29  
> **Status:** DRAFT

---

## 1. Problem Statement

### 1.1 Audit Summary
Module User đạt **88/100 điểm** - quality cao nhưng có một số gaps quan trọng:
- 1 issue HIGH: Permission save không persist
- 3 issues MEDIUM: Role management issues
- 2 issues LOW: Minor improvements

### 1.2 Current Strengths ✅
- Clean service layer architecture
- Permission-based access control
- Tenant isolation enforced
- Test files exist
- Small focused components (< 300 lines)

---

## 2. Issues to Fix

### 🟠 HIGH (1)
| ID | Issue | Impact |
|:---|:------|:-------|
| H1 | Permission Matrix save is **MOCK only** | User changes NOT persisted |

### 🟡 MEDIUM (3)
| ID | Issue | Impact |
|:---|:------|:-------|
| M1 | Role stored as string, not FK to roles table | No referential integrity |
| M2 | No role validation in backend | Any role string accepted |
| M3 | Missing `user.model.ts` - interfaces inline | Code organization |

### 🟢 LOW (2)
| ID | Issue | Impact |
|:---|:------|:-------|
| L1 | Missing GET single user endpoint | Minor inconvenience |
| L2 | Role create is client-side only | New roles not saved |

---

## 3. Proposed Solution

### Sprint 1: Critical Fix (H1)

#### [H1] Implement Permission Persistence

**Backend - New file:** `backend/modules/user/infrastructure/permission_router.py`
```python
@router.put("/roles/{role_code}/permissions")
async def update_role_permissions(
    role_code: str,
    permissions: List[str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save role permissions to database"""
    service = RolePermissionService(db)
    return await service.update_permissions(role_code, permissions)
```

**Frontend:** `permission-matrix.component.ts`
```typescript
save() {
  // Replace mock with real API call
  this.userService.saveRolePermissions(this.permissions()).subscribe({
    next: () => this.hasChanges.set(false),
    error: (err) => alert('Lỗi: ' + err.message)
  });
}
```

---

### Sprint 2: Role Management (M1, M2, L2)

#### Database Migration
```sql
-- Create roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    permissions TEXT[] DEFAULT '{}',
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK to users table
ALTER TABLE users ADD COLUMN role_id UUID REFERENCES roles(id);
```

#### Backend Role Validation
```python
async def create_user(self, user: UserCreate, tenant_id: UUID):
    # Validate role exists
    role = await self.role_service.get_by_code(user.role_code)
    if not role:
        raise HTTPException(400, f"Role '{user.role_code}' không tồn tại")
    
    new_user = User(role_id=role.id, ...)
```

---

### Sprint 3: Code Organization (M3, L1)

#### [M3] Create `user.model.ts`
```typescript
// frontend/src/app/admin/user-management/models/user.model.ts

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  tenant_id: string;
  created_at: Date;
  updated_at: Date;
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  SALES = 'sales',
  STAFF = 'staff'
}

export interface RoleDefinition {
  id: string;
  code: string;
  name: string;
  permissions: string[];
  isSystem: boolean;
}
```

#### [L1] Add GET single user endpoint
```python
@router.get("/{user_id}", response_model=UserSchema)
async def get_user(user_id: UUID, ...):
    service = UserService(db)
    return await service.get_user_by_id(user_id)
```

---

## 4. Effort Estimation

| Task | Complexity | Hours |
|:-----|:-----------|:-----:|
| [H1] Permission persistence | Medium | 4 |
| [M1] Roles table migration | Medium | 2 |
| [M2] Role validation | Low | 1 |
| [M3] user.model.ts | Low | 1 |
| [L1] GET user endpoint | Low | 0.5 |
| [L2] Role create API | Medium | 2 |
| Testing | Medium | 1.5 |
| **Total** | | **12 hours** |

**Timeline:** 1.5-2 days

---

## 5. Acceptance Criteria

- [ ] Permission changes persist to database
- [ ] Roles stored in dedicated table with FK
- [ ] Role validation in backend
- [ ] `user.model.ts` created with all interfaces
- [ ] All tests pass
- [ ] No regression in existing functionality

---

## 6. Next Steps

1. `/implement H1` - Start with permission persistence
2. `/implement M1` - Roles table migration
3. `/test user` - Verify all fixes
