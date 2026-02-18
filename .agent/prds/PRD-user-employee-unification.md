# PRD: Tích hợp User-Employee (Thống nhất Tài khoản & Nhân sự)

> **PRD ID:** `PRD-user-employee-unification`  
> **Module:** HR + User Management (Cross-Module)  
> **Created:** 18/02/2026  
> **Status:** DRAFT — Pending User Review  
> **Related PRDs:** `PRD-user-management-rbac`, `PRD-HR-FLOWS-001`

---

## 1. Bối cảnh & Vấn đề

### 1.1 Hiện trạng

Hệ thống hiện tách biệt **hoàn toàn** 2 khái niệm:

| Entity | Table | Module | Quản lý tại | Mục đích |
|:-------|:------|:-------|:------------|:---------|
| **User** | `users` | `core/auth` + `modules/user` | Admin (`/admin`) | Đăng nhập, phân quyền |
| **Employee** | `employees` | `modules/hr` | HR (`/hr`) | Lương, chấm công, nghỉ phép |

**Vấn đề cốt lõi:**
1. **Không có liên kết** (`employees` table thiếu `user_id` FK → `users`)
2. **Tạo 2 lần**: Admin phải vào HR tạo Employee, rồi vào Admin tạo User → dễ quên, dễ sai
3. **Cả 2 nút "Thêm" đều chưa hoạt động** (chỉ có UI, chưa có logic)
4. `UnifiedStaffAssignmentService.get_employee_by_user_id()` là **placeholder** (trả về employee ngẫu nhiên)

### 1.2 Kết luận từ phân tích

- ✅ **Cần giữ cả 2 entity** vì phục vụ khác nhau (Separation of Concerns)
- ✅ **Mọi người đều cần đăng nhập** (bảo mật) → User là bắt buộc
- ✅ **Không phải ai cũng là Employee** (viewer, kế toán ngoài) → Employee là tùy chọn
- 🔴 **Phải liên kết** User ↔ Employee qua `user_id` FK

---

## 2. Giải pháp

### 2.1 Mô hình quan hệ

```
┌──────────────┐         ┌──────────────────┐
│    users     │ 1 ← 0..1│    employees     │
│──────────────│         │──────────────────│
│ id (PK)      │◄────────│ user_id (FK, UQ) │
│ email        │         │ full_name        │
│ password     │         │ role_type        │
│ role         │         │ base_salary      │
│ tenant_id    │         │ hourly_rate      │
│ ...          │         │ ...              │
└──────────────┘         └──────────────────┘
```

- **1 User → 0 hoặc 1 Employee** (Viewer không cần Employee record)
- **1 Employee → bắt buộc 1 User** (ai cũng phải đăng nhập)

### 2.2 Use Cases

| Người | User | Employee | Giải thích |
|:------|:----:|:--------:|:-----------|
| Manager | ✅ | ✅ | Đăng nhập + nhận lương |
| Đầu bếp | ✅ (`staff`) | ✅ | Đăng nhập xem lịch + nhận lương |
| Phục vụ | ✅ (`staff`) | ✅ | Đăng nhập + chấm công |
| Kế toán ngoài | ✅ (`viewer`) | ❌ | Chỉ xem báo cáo |
| Owner | ✅ (`super_admin`) | ❌ | Quản lý hệ thống |

---

## 3. 5-Dimension Assessment

### 3.1 UX — 🔴 HIGH
- **Flow HR (Primary):** Thêm nhân viên → nhập info HR + tài khoản đăng nhập cùng 1 form
- **Flow Admin (Secondary):** Thêm user → tùy chọn "Liên kết Employee"
- **Pain Point giải quyết:** Không cần thao tác 2 lần ở 2 nơi

### 3.2 UI — 🟠 HIGH
- Form "Thêm nhân viên" mở rộng thêm section "Tài khoản đăng nhập"
- Tuân thủ Angular.dev Design System (Light Mode)

### 3.3 FE — 🟠 HIGH
- Sửa `hr/page.tsx`: Wire up nút "Thêm nhân viên" + tạo modal form
- Sửa `admin/page.tsx`: Wire up nút "Thêm người dùng" + optional Employee link

### 3.4 BE — 🔴 HIGH
- Sửa `POST /hr/employees`: Nhận thêm `email`, `password`, `role` → tự tạo User + link
- Thêm field `user_id` vào `EmployeeModel` + `EmployeeCreate` schema
- Đảm bảo transaction atomic (User + Employee tạo cùng 1 transaction)

### 3.5 DA — 🔴 HIGH
- Migration: `ALTER TABLE employees ADD COLUMN user_id UUID REFERENCES users(id) UNIQUE`
- Update RLS policies cho `employees` table

---

## 4. Proposed Changes

### Phase 1: Database Migration

#### [NEW] `backend/migrations/XXX_employee_user_link.sql`
```sql
-- Add user_id FK to employees table
ALTER TABLE employees ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX idx_employees_user_id ON employees(user_id) WHERE user_id IS NOT NULL;

-- Backfill: attempt to match existing employees to users by email
UPDATE employees e 
SET user_id = u.id 
FROM users u 
WHERE e.email = u.email 
  AND e.tenant_id = u.tenant_id 
  AND e.user_id IS NULL;
```

---

### Phase 2: Backend Changes

#### [MODIFY] `backend/modules/hr/domain/models.py`
- Thêm column `user_id = Column(UUID, ForeignKey('users.id'), unique=True, nullable=True)`
- Thêm relationship `user = relationship("User", back_populates="employee")`

#### [MODIFY] `backend/modules/hr/infrastructure/http_router.py`
- Cập nhật `EmployeeCreate` schema: thêm fields `login_email`, `login_password`, `login_role`
- Cập nhật `create_employee` endpoint:
  1. Nếu có `login_email` → tạo `User` trước (hash password, assign role)
  2. Tạo `Employee` với `user_id = new_user.id`
  3. Commit trong 1 transaction
- Cập nhật `EmployeeResponse`: thêm `user_id`, `has_login_account`
- Cập nhật `delete_employee`: deactivate User account kèm theo

#### [MODIFY] `backend/modules/hr/services/unified_staff_service.py`
- Fix `get_employee_by_user_id`: query bằng `EmployeeModel.user_id == user_id` (thay vì placeholder)

#### [MODIFY] `backend/core/auth/models.py`
- Thêm relationship `employee = relationship("EmployeeModel", back_populates="user", uselist=False)`

---

### Phase 3: Frontend — HR Module (Primary Flow)

#### [NEW] `frontend-next/src/app/(dashboard)/hr/components/employee-form-modal.tsx`
Form modal với 3 sections:
1. **Thông tin cá nhân**: Họ tên*, SĐT, CCCD, Ngày sinh, Địa chỉ
2. **Thông tin HR**: Chức vụ*, Full/Part-time, Lương cơ bản, Lương giờ
3. **Tài khoản đăng nhập**: Email*, Mật khẩu* (auto-generate option), Vai trò* (dropdown)

#### [MODIFY] `frontend-next/src/app/(dashboard)/hr/page.tsx`
- Wire up nút "Thêm nhân viên" → mở `EmployeeFormModal`
- Sau submit → `POST /hr/employees` (backend tự tạo User)
- Refetch employee list

---

### Phase 4: Frontend — Admin Module (Secondary Flow)

#### [MODIFY] `frontend-next/src/app/(dashboard)/admin/page.tsx`
- Wire up nút "Thêm người dùng" → mở User form modal
- Thêm optional dropdown: "Liên kết hồ sơ nhân viên" (list employees chưa có user_id)
- Wire up nút Edit, Delete

---

## 5. Business Rules

| ID | Rule | Mô tả |
|:---|:-----|:------|
| BR060 | Auto-create User | Khi tạo Employee với thông tin login → tự tạo User account |
| BR061 | Unique Email | Email login phải unique trong toàn hệ thống |
| BR062 | 1-to-1 Link | 1 Employee chỉ liên kết tối đa 1 User và ngược lại |
| BR063 | Cascade Deactivate | Khi deactivate Employee → deactivate User kèm theo |
| BR064 | Atomic Transaction | Tạo User + Employee phải trong cùng 1 DB transaction |
| BR065 | Password Default | Cho phép auto-generate password (VD: `GiaoTuyet@2026`) |
| BR066 | Role Mapping | HR `role_type` (CHEF, WAITER...) ≠ System `role` (staff, admin...) → 2 field riêng |

---

## 6. Permission Matrix

| Action | super_admin | admin | manager | staff |
|:-------|:-----------:|:-----:|:-------:|:-----:|
| Tạo Employee + User | ✅ | ✅ | ❌ | ❌ |
| Xem danh sách Employee | ✅ | ✅ | ✅ | ❌ |
| Sửa Employee | ✅ | ✅ | ❌ | ❌ |
| Xóa/Deactivate Employee | ✅ | ❌ | ❌ | ❌ |

---

## 7. Effort Estimation

| Phase | Scope | Hours |
|:------|:------|:-----:|
| Phase 1 | DB Migration (`user_id` FK + backfill) | 1h |
| Phase 2 | Backend (model + router + service fixes) | 4h |
| Phase 3 | Frontend HR (form modal + wire up) | 6h |
| Phase 4 | Frontend Admin (wire up + optional link) | 3h |
| **Total** | | **14h** |

---

## 8. Verification Plan

### API Tests
```bash
# 1. Create employee WITH login account
curl -X POST http://localhost:8000/api/v1/hr/employees \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"full_name":"Nguyễn Văn A","role_type":"CHEF","login_email":"nguyenvana@test.com","login_password":"Test@2026","login_role":"staff"}'
# Expected: Employee created + User created + user_id linked

# 2. Verify User was auto-created
curl http://localhost:8000/api/v1/admin/users?search=nguyenvana@test.com
# Expected: User found with role=staff

# 3. Create employee WITHOUT login (optional)
curl -X POST http://localhost:8000/api/v1/hr/employees \
  -d '{"full_name":"Nguyễn Văn B","role_type":"WAITER"}'
# Expected: Employee created, user_id=null
```

### Browser Tests
1. Login as Admin → vào HR → click "Thêm nhân viên"
2. Nhập thông tin cá nhân + HR + tài khoản đăng nhập → Submit
3. Verify nhân viên mới xuất hiện trong danh sách HR
4. Vào Admin → verify user mới xuất hiện trong danh sách Users
5. Logout → Login bằng tài khoản vừa tạo → verify đăng nhập thành công

---

## 9. Acceptance Criteria

- [ ] `employees` table có column `user_id` FK → `users`
- [ ] Tạo nhân viên ở HR tự động tạo User account
- [ ] Employee mới có thể login bằng email/password vừa tạo
- [ ] Form có auto-generate password option
- [ ] Transaction atomic (fail 1 → rollback cả 2)
- [ ] `get_employee_by_user_id()` hoạt động chính xác
- [ ] Admin page wire up đúng nút Thêm/Sửa/Xóa
- [ ] Light Mode + Angular.dev Design System compliance
