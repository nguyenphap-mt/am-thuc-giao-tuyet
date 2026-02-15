# IMPROVEMENT PRD: Module User V3 - Full Audit

> **PRD ID:** `IMPROVEMENT-PRD-user-20260126-v3`  
> **Module:** User  
> **Workflow Version:** 3.2.2 (Full: 5D + Flow + Feature)  
> **Created:** 26/01/2026 11:12  
> **Status:** DRAFT - Processing Mode: **Deep Analysis**

---

## 1. Executive Summary

### 1.1 Score Evolution

| Audit Run | Overall | Grade | Issues | Reason |
|:----------|:-------:|:-----:|:------:|:-------|
| V1 (5D only) | 88 | B+ | 6 | Code quality tốt |
| V2 (+Feature) | 72 | C | 11 | +5 missing features |
| **V3 (+Flow)** | **58** | **D** | **17** | +6 flow issues |

### 1.2 Score Breakdown

| Category | Score | Grade |
|:---------|:-----:|:-----:|
| 5-Dimension Audit | 77/100 | B |
| Business Flow Validation | 56/100 | D |
| Feature Completeness | 47% | F |
| **Combined** | **58/100** | **D** |

---

## 2. Issues Summary (17 total)

### 🔴 CRITICAL (3)
| ID | Source | Issue |
|:---|:-------|:------|
| FEAT_CHANGE_PASSWORD | Feature | Không có chức năng đổi mật khẩu |
| FLOW_ACTIVITY_LOG | Flow | User→ActivityLog integration missing |
| BR052_MISSING | Flow | Super Admin không được bảo vệ khỏi tự xóa |

### 🟠 HIGH (6)
| ID | Source | Issue |
|:---|:-------|:------|
| FEAT_MY_PROFILE | Feature | Thiếu trang profile |
| FEAT_ACTIVITY_LOG | Feature | Thiếu nhật ký hoạt động |
| FEAT_PERMISSION_PERSISTENCE | Feature | Permission save là MOCK |
| FLOW_SESSION | Flow | Session management không rõ ràng |
| FLOW_PERMISSION_SYNC | Flow | Permission không sync to cache |
| H1 | 5D | Permission save MOCK only |

### 🟡 MEDIUM (6)
| ID | Source | Issue |
|:---|:-------|:------|
| FEAT_LOGIN_HISTORY | Feature | Thiếu lịch sử đăng nhập |
| FLOW_USER_STATES | Flow | User states không implement |
| M1 | 5D | Role as string, not FK |
| M2 | 5D | No role validation |
| M3 | 5D | Missing user.model.ts |
| FEAT_EXPORT | Feature | Không xuất được Excel/PDF |

### 🟢 LOW (2)
| ID | Source | Issue |
|:---|:-------|:------|
| L1 | 5D | Missing GET single user |
| L2 | 5D | Role create client-side only |

---

## 3. Business Flow Analysis (NEW!)

### 3.1 user_flow Validation

```
user_flow:
  ├── States: User (ACTIVE → INACTIVE → DELETED)
  │   └── Status: ❌ NOT IMPLEMENTED (chỉ có is_active boolean)
  │
  ├── Integrations:
  │   ├── User → ActivityLog: ❌ MISSING
  │   ├── User → Session: ❌ MISSING (JWT có nhưng không track)
  │   └── Role → Permission: ⚠️ PARTIAL (có require_permission)
  │
  └── Business Rules:
      ├── BR050: Role validation: ⚠️ PARTIAL
      ├── BR051: Permission check: ✅ PASS
      └── BR052: Super admin protection: ❌ FAIL
```

### 3.2 Dependencies Validation

| Dependency | Status |
|:-----------|:------:|
| User → HR | ⚠️ Partial (staff_id FK exists) |
| User → Quote/Order | ⚠️ Partial (created_by exists) |
| User → Finance | ⚠️ Partial (journal created_by) |

---

## 4. Implementation Plan

### Sprint 1: Security (CRITICAL) - 12h

#### 1.1 Change Password
```python
# backend/modules/user/infrastructure/http_router.py
@router.post("/me/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = UserService(db)
    
    # Verify current password
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(400, "Mật khẩu hiện tại không đúng")
    
    await service.change_password(current_user.id, data.new_password)
    return {"success": True}
```

#### 1.2 Super Admin Protection (BR052)
```python
# backend/modules/user/application/user_service.py
async def delete_user(self, user_id: UUID, current_user: User):
    # BR052: Super admin cannot delete themselves
    if current_user.id == user_id and current_user.role == "super_admin":
        raise HTTPException(400, "Super Admin không thể tự xóa mình")
    
    # Existing delete logic...
```

#### 1.3 Activity Log Integration
```python
# backend/core/auth/router.py - trong login endpoint
await activity_service.log(
    user_id=user.id,
    action="LOGIN",
    ip_address=request.client.host,
    user_agent=request.headers.get("user-agent")
)
```

---

### Sprint 2: Business Flow Compliance - 16h

#### 2.1 User States Implementation
```python
# backend/core/auth/models.py
class User(Base):
    # Existing fields...
    status = Column(String(20), default='ACTIVE')  # ACTIVE, INACTIVE, DELETED
    deleted_at = Column(DateTime, nullable=True)
```

#### 2.2 Activity Logs Table
```sql
-- migrations/040_activity_logs.sql
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2.3 Session Tracking
```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    token_hash VARCHAR(64),
    ip_address INET,
    device_info TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Sprint 3: Feature Completion - 16h

#### 3.1 My Profile Page
```
frontend/src/app/profile/
├── profile.component.ts
├── profile.component.html
├── profile.component.scss
└── profile.service.ts
```

#### 3.2 Activity Log Viewer
```
frontend/src/app/admin/activity-log/
├── activity-log.component.ts (AG Grid)
├── activity-log.component.html
└── activity-log.service.ts
```

#### 3.3 Permission Persistence
```python
# backend/modules/user/infrastructure/permission_router.py
@router.put("/roles/{role_code}/permissions")
async def save_role_permissions(role_code: str, permissions: List[str]):
    # Save to DB, invalidate cache
```

---

### Sprint 4: Data & Code Cleanup - 4h

- [ ] Create roles table with FK
- [ ] Create user.model.ts
- [ ] Add GET single user endpoint
- [ ] Role CRUD API

---

## 5. Effort Summary

| Sprint | Focus | Hours |
|:-------|:------|:-----:|
| Sprint 1 | Security (CRITICAL) | 12 |
| Sprint 2 | Business Flow Compliance | 16 |
| Sprint 3 | Feature Completion | 16 |
| Sprint 4 | Data & Cleanup | 4 |
| **Total** | | **48 hours** |

**Timeline:** 6 working days

---

## 6. Acceptance Criteria

### CRITICAL
- [ ] User có thể đổi mật khẩu
- [ ] Super Admin không thể tự xóa mình
- [ ] Mọi login được ghi vào activity_logs

### HIGH
- [ ] User có trang profile
- [ ] Admin xem được activity logs
- [ ] Permission changes persist to DB

### Business Flow Compliance
- [ ] User status có ACTIVE/INACTIVE/DELETED
- [ ] Session được track trong DB
- [ ] Login history hiển thị được

---

## 7. Verification Plan

```bash
# 1. Test change password
curl -X POST /api/users/me/change-password \
  -d '{"current_password": "old", "new_password": "new"}'

# 2. Test BR052
# Login as super_admin, try delete self - should fail

# 3. Check activity_logs after login
SELECT * FROM activity_logs WHERE action = 'LOGIN' ORDER BY created_at DESC;
```
