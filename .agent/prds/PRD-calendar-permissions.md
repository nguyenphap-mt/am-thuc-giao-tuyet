# PRD: Phân quyền Module Lịch (Calendar Permissions)

> **Module**: Calendar | **Priority**: HIGH | **Complexity**: 4.5/10
> **Date**: 2026-02-25 | **Research Mode**: Hybrid (Web + Codebase)

---

## 1. Hiện trạng & Vấn đề

Calendar là module **read-only aggregation** — không có endpoint tạo/sửa/xóa riêng. Nó tổng hợp dữ liệu từ Order + HR vào 1 giao diện lịch.

### 1.1 Codebase hiện tại

| Layer | File | Tình trạng |
|:---|:---|:---|
| **Backend** | `http_router.py` (236 dòng, 2 endpoints) | ❌ **0/2** endpoint có `require_permission` |
| **Frontend** | `page.tsx` + 4 component files | ❌ **0** `PermissionGate` / `usePermission` |

### 1.2 Permission Matrix (đã khai báo nhưng chưa enforce)

| Action | Code | Mô tả | Enforce? |
|:---|:---|:---|:---:|
| Xem | `view` | Xem lịch tất cả sự kiện | ❌ |
| Tạo | `create` | Tạo đơn hàng nhanh từ lịch | ❌ |
| Sửa | `edit` | N/A (Calendar chỉ đọc) | — |    
| Phân công | `assign` | Phân công nhân viên | ❌ |
| Check-in | `checkin` | Check-in nhân viên | ❌ |

> [!IMPORTANT]
> Calendar **không có endpoint create/edit/delete** riêng. Các action Tạo/Sửa/Phân công/Check-in được **ủy quyền cho Order/HR modules**. Permission cần enforce ở mức **đọc dữ liệu nhạy cảm** và **UI gating cho cross-module actions**.

---

## 2. Phân tích GAP (6 gaps identified)

### GAP-C1: Backend RBAC (CRITICAL ⚠️)
**Vấn đề**: 0/2 backend endpoints có `require_permission`. Bất kỳ user authenticate nào cũng gọi được API.

| Endpoint | Hiện tại | Đề xuất |
|:---|:---|:---|
| `GET /events` | Không bảo vệ | `require_permission("calendar", "view")` |
| `GET /stats` | Không bảo vệ | `require_permission("calendar", "view")` |

---

### GAP-C2: Financial Data trong EventDetailDrawer (HIGH)
**Vấn đề**: `final_amount`, `paid_amount`, `balance_amount` hiển thị **cho tất cả roles** khi mở drawer chi tiết đơn hàng.

**Đề xuất**: Gate section "Tổng tiền / Đã thu / Còn nợ" bằng `PermissionGate module="order" action="view"`.

| Role | Hiện tại | Đề xuất |
|:---|:---|:---|
| admin, manager | ✅ Thấy | ✅ Thấy |
| accountant | ✅ Thấy | ✅ Thấy |
| chef | ✅ Thấy | ❌ Ẩn |
| sales | ✅ Thấy | ✅ Thấy |
| staff | ✅ Thấy | ❌ Ẩn |

> [!NOTE]
> Financial data thuộc Order module, nên dùng permission của Order để gate.

---

### GAP-C3: Revenue Stats Card (HIGH)
**Vấn đề**: StatCard "Doanh thu tháng" (`total_revenue`) hiển thị cho **tất cả roles**.

**Đề xuất**: Gate "Doanh thu tháng" bằng `usePermission`. Fallback: hiển thị "—" hoặc ẩn card.

---

### GAP-C4: Quick Create Button (MEDIUM)
**Vấn đề**: Nút "Tạo đơn hàng" (line 224-231) visible cho tất cả.

**Đề xuất**: Gate bằng `PermissionGate module="order" action="create"`.

---

### GAP-C5: Staff Availability Panel (MEDIUM)
**Vấn đề**: Panel "Nhân sự" hiển thị thông tin nhân viên (tên, trạng thái, số lượng phân công, nghỉ phép) cho **tất cả roles**.

**Đề xuất**: Gate nút toggle + panel bằng `PermissionGate module="calendar" action="assign"` — chỉ admin/manager cần thấy nhân sự sẵn sàng.

---

### GAP-C6: Leave Data Visibility (LOW)
**Vấn đề**: Trong drawer, chi tiết nghỉ phép (employee_name, leave_type, total_days, reason) visible cho tất cả.

**Đề xuất**: Ẩn `reason` field cho roles không phải admin/manager — lý do nghỉ phép là thông tin nhạy cảm.

---

## 3. Proposed Changes

### 3.1 Backend (1 file)

#### [MODIFY] http_router.py
- Import `require_permission` từ `backend.core.auth.permissions`
- Thêm `dependencies=[Depends(require_permission("calendar", "view"))]` cho cả 2 endpoints

---

### 3.2 Frontend (1 file)

#### [MODIFY] page.tsx
- Import `PermissionGate` và `usePermission`
- **GAP-C2**: Wrap financial summary grid (L701-716) bằng `PermissionGate module="order" action="view"`
- **GAP-C3**: Gate "Doanh thu tháng" StatCard bằng `usePermission` → show "—" nếu không có quyền
- **GAP-C4**: Wrap nút "Tạo đơn hàng" (L224-231) bằng `PermissionGate module="order" action="create"`
- **GAP-C5**: Wrap nút "Nhân sự" toggle + panel bằng `PermissionGate module="calendar" action="assign"`
- **GAP-C6**: Conditionally render `reason` field trong Leave detail section bằng `usePermission`

---

## 4. Verification Plan

### Automated
- `py_compile` backend
- `next build` frontend

### Manual
- Login as `staff` → verify không thấy doanh thu, nút tạo đơn, panel nhân sự
- Login as `admin` → verify thấy tất cả
- API test: gọi `/calendar/events` không có token → 401/403

---

## 5. Scoring

| Matrix | Score | Notes |
|:---|:---:|:---|
| Completeness | 22/25 | Edit/Assign/Check-in delegated to Order/HR |
| Consistency | 24/25 | Follows Menu permissions pattern |
| Security | 23/25 | Backend + frontend gates, sensitive data protected |
| Feasibility | 24/25 | Small scope, 2 files to modify |
| **Total** | **93/100** | |
