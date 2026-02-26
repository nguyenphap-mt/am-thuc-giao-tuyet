# PRD: Link Existing User to Employee

**Version:** 1.0  
**Module:** HR + User Management  
**Priority:** HIGH  
**Created:** 2026-02-26

---

## 1. Problem Statement

### Current Behavior
Khi tạo nhân viên mới ở module HR (`/hr`), hệ thống chỉ hỗ trợ 2 luồng:

| # | Kịch bản | Kết quả |
|:--|:---------|:--------|
| 1 | Tạo NV **không có** tài khoản | ✅ Employee created, `user_id = NULL` |
| 2 | Tạo NV + **tạo mới** tài khoản | ✅ Employee + User created, linked |
| 3 | Tạo NV + **gán** user account **đã có** | ❌ **HTTP 409** "Email đã được sử dụng" |

### Gap
- Admin tạo user ở Settings → Quản lý người dùng (`/settings?tab=users`)
- Khi muốn tạo Employee cho user đó ở HR → **bị reject vì email trùng**
- Không có cách nào link user đã tồn tại vào employee mới
- Lỗi hiện tại trên FE hiển thị message chung, không rõ ràng

### Business Impact
- Admin phải **xóa user account** trước, rồi tạo lại từ HR → mất dữ liệu session, audit log
- Hoặc **không tạo được employee** cho user đã có → nhân viên không thể chấm công, lĩnh lương

---

## 2. Proposed Solution

### 2.1. Backend: Smart Account Linking

Khi tạo employee mà `login_email` trùng với user đã tồn tại:

```
IF user_exists(email):
    IF user.already_linked_to_employee:
        → 409: "Email đã được gán cho nhân viên khác"
    ELSE:
        → AUTO-LINK: employee.user_id = existing_user.id
        → (Optionally) Update user.role if login_role provided
ELSE:
    → CREATE new user (hiện tại)
```

#### New Backend Endpoint

```
GET /api/v1/users/unlinked
```
Trả về danh sách users **chưa được gán** cho bất kỳ employee nào (`user.id NOT IN employees.user_id`).

### 2.2. Frontend: 3-Mode Account Section

Khi tạo/chỉnh sửa nhân viên, section "Tài khoản đăng nhập" sẽ có 3 mode:

```
┌─────────────────────────────────────────────┐
│ 🔒 Tài khoản đăng nhập                     │
│                                             │
│  ○ Không tạo tài khoản                      │
│  ○ Tạo tài khoản mới                        │
│  ○ Liên kết tài khoản có sẵn   ← NEW       │
│                                             │
│  [Dropdown: Chọn tài khoản chưa sử dụng]   │
│  ↳ user@email.com - Nguyễn Văn A (Admin)   │
│  ↳ test@email.com - Trần Văn B (Staff)     │
└─────────────────────────────────────────────┘
```

### 2.3. Fix Error Message Display

Sửa `onError` handler để hiển thị message cụ thể từ backend:

```typescript
// ❌ Hiện tại
toast.error(error?.message || 'Không thể thêm nhân viên');

// ✅ Sau fix
const msg = error?.response?.data?.detail || error?.message || 'Không thể thêm nhân viên';
toast.error(msg);
```

---

## 3. User Stories

### US-01: Admin liên kết user có sẵn khi tạo nhân viên
**As** Admin,  
**I want** to link an existing user account when creating a new employee,  
**So that** the employee can use their existing login credentials.

**Acceptance Criteria:**
- [ ] AC-01: Option "Liên kết tài khoản có sẵn" hiển thị trong form tạo NV
- [ ] AC-02: Dropdown chỉ hiện users chưa gán cho employee nào
- [ ] AC-03: Khi chọn user → employee.user_id = selected_user.id
- [ ] AC-04: User đã chọn không còn hiện trong dropdown cho NV khác

### US-02: Admin liên kết user khi chỉnh sửa NV chưa có tài khoản
**As** Admin,  
**I want** to link an existing user to an employee who doesn't have an account yet,  
**So that** no duplicate accounts are created.

**Acceptance Criteria:**
- [ ] AC-05: Khi chỉnh sửa NV chưa có tài khoản → hiện 3 options (không tạo / tạo mới / liên kết)
- [ ] AC-06: Sau khi liên kết → UI chuyển sang "Đã liên kết tài khoản" (edit mode)

### US-03: Fix hiển thị lỗi
**As** Admin,  
**I want** clear error messages when creating employees with duplicate emails,  
**So that** I understand what went wrong.

**Acceptance Criteria:**
- [ ] AC-07: Lỗi `409` hiển thị message tiếng Việt từ backend: "Email xxx đã được sử dụng"

---

## 4. Technical Specifications

### 4.1. Backend Changes

#### [MODIFY] [http_router.py](file:///d:/PROJECT/AM THUC GIAO TUYET/backend/modules/hr/infrastructure/http_router.py)

**Create Employee** (POST `/hr/employees`):
```python
# BEFORE: reject if email exists
if existing_user.scalar_one_or_none():
    raise HTTPException(409, "Email đã được sử dụng")

# AFTER: smart linking
existing_user = existing_user.scalar_one_or_none()
if existing_user:
    # Check if user already linked to another employee
    linked_emp = await db.execute(
        select(EmployeeModel).where(EmployeeModel.user_id == existing_user.id)
    )
    if linked_emp.scalar_one_or_none():
        raise HTTPException(409, f"Email {data.login_email} đã được gán cho nhân viên khác")
    # Auto-link existing user
    user_id = existing_user.id
    # Optionally update role
    if data.login_role:
        existing_user.role = data.login_role
```

**Update Employee** (PUT `/hr/employees/{id}`): Same logic as above.

#### [NEW] New Endpoint: GET `/users/unlinked`

```python
@router.get("/users/unlinked", response_model=List[UserResponse])
async def list_unlinked_users(
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Get users not linked to any employee"""
    # Subquery: all user_ids already used in employees table
    linked_ids = select(EmployeeModel.user_id).where(
        EmployeeModel.user_id.isnot(None),
        EmployeeModel.tenant_id == tenant_id
    )
    
    query = select(UserModel).where(
        UserModel.tenant_id == tenant_id,
        UserModel.is_active == True,
        UserModel.id.notin_(linked_ids)
    ).order_by(UserModel.full_name)
    
    result = await db.execute(query)
    return result.scalars().all()
```

### 4.2. Frontend Changes

#### [MODIFY] [EmployeeFormModal.tsx](file:///d:/PROJECT/AM THUC GIAO TUYET/frontend/src/app/(dashboard)/hr/components/EmployeeFormModal.tsx)

1. Add `link_user_id` field to form state
2. Replace binary toggle with 3-way RadioGroup: `none` | `create` | `link`
3. Add dropdown to select unlinked users (fetched from `/users/unlinked`)
4. Fix error message display in `onError` handlers

#### [MODIFY] [index.ts](file:///d:/PROJECT/AM THUC GIAO TUYET/frontend/src/types/index.ts)

Add `link_user_id?: string` to `EmployeePayload` interface.

#### [MODIFY] [use-users.ts](file:///d:/PROJECT/AM THUC GIAO TUYET/frontend/src/hooks/use-users.ts)

Add `useUnlinkedUsers()` hook:
```typescript
export function useUnlinkedUsers() {
  return useQuery({
    queryKey: [...userKeys.all, 'unlinked'],
    queryFn: () => api.get<UserItem[]>('/users/unlinked'),
  });
}
```

---

## 5. Data Model

### Existing Schema (No Changes Needed)

```
users (1) ←──── (0..1) employees
  id (PK)              user_id (FK, UNIQUE, NULLABLE)
  email                tenant_id
  full_name            full_name
  role                 role_type
  tenant_id            ...
```

- `UNIQUE` constraint trên `employees.user_id` đã đảm bảo **1 user = max 1 employee**
- `NULLABLE` cho phép employee tồn tại mà không cần user account

---

## 6. Security & Business Rules

| Rule | Description |
|:-----|:-----------|
| **BR-01** | 1 user chỉ link được 1 employee (UNIQUE constraint) |
| **BR-02** | Chỉ link user cùng tenant_id |
| **BR-03** | Không cho link super_admin/admin accounts từ HR (optional) |
| **BR-04** | Chỉ Admin/HR Manager mới được phép link accounts |
| **BR-05** | Audit log khi link/unlink user-employee |

---

## 7. Verification Plan

### Automated Tests
1. Backend: Test create employee with existing user email → auto-link (not reject)
2. Backend: Test create employee with email already linked → 409 error
3. Backend: Test GET `/users/unlinked` returns correct list

### Manual Verification
1. Settings: Tạo user mới "test-link@giaotuyet.com"
2. HR: Tạo employee → chọn "Liên kết tài khoản có sẵn" → chọn user vừa tạo
3. Verify: Employee hiển thị "Đã liên kết tài khoản" với email đúng
4. Verify: User đó không còn hiện trong dropdown unlinked cho NV khác
5. Settings: Kiểm tra user list vẫn hiện user đó bình thường

---

## 8. Effort Estimation

| Component | Effort | Priority |
|:----------|:------:|:--------:|
| Backend: Smart linking logic | 1h | P0 |
| Backend: `/users/unlinked` endpoint | 0.5h | P0 |
| Frontend: 3-mode RadioGroup UI | 1.5h | P0 |
| Frontend: Fix error messages | 0.5h | P0 |
| Testing & verification | 1h | P0 |
| **Total** | **4.5h** | - |
