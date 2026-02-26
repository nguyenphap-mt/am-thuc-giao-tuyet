# Permission Matrix - Ẩm Thực Giáo Tuyết
> **Mục tiêu**: Đây là bảng phân quyền **BẮT BUỘC** tuân thủ khi phát triển bất kỳ Module/Feature nào.
> **Cập nhật**: 2026-02-24

---

## 🚨 QUY TẮC BẮT BUỘC

> [!CAUTION]
> **Mọi module/feature MỚI phải được thêm vào file này TRƯỚC khi bắt đầu phát triển.**
> Không tuân thủ sẽ dẫn đến lỗi bảo mật nghiêm trọng!

---

## 1. System Roles (Hệ thống Catering)

| Role ID | Tên Việt | Mô tả chức năng |
| :--- | :--- | :--- |
| `super_admin` | Quản trị viên cấp cao | Toàn quyền, quản lý tenants |
| `admin` | Quản trị viên | Toàn quyền trong tenant |
| `manager` | Quản lý | Quản lý tiệc, nhân sự, nhà cung cấp |
| `chef` | Bếp trưởng | Quản lý menu, công thức, nguyên liệu |
| `sales` | Nhân viên kinh doanh | Báo giá, đơn hàng, khách hàng |
| `staff` | Nhân viên | Xem lịch tham gia, check-in tiệc |
| `accountant` | Kế toán | Tài chính, COA, Journal |
| `viewer` | Người xem | Chỉ xem, không chỉnh sửa |

---

## 2. Module Access Matrix (Ai thấy Module nào?)

| Module | super_admin | admin | manager | chef | sales | staff | accountant | viewer |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Menu** | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ |
| **Quote** | ✅ | ✅ | ✅ | ⬜ | ✅ | ⬜ | ✅ | ⬜ |
| **Order** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ |
| **Calendar** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| **Procurement** | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ⬜ |
| **HR** | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ✅ | ⬜ |
| **Finance** | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ✅ | ⬜ |
| **CRM** | ✅ | ✅ | ✅ | ⬜ | ✅ | ⬜ | ⬜ | ⬜ |
| **Analytics** | ✅ | ✅ | ✅ | ⬜ | ✅ | ⬜ | ✅ | ⬜ |
| **Inventory/BOM** | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **Invoice** | ✅ | ✅ | ✅ | ⬜ | ✅ | ⬜ | ✅ | ⬜ |
| **Settings** | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| **Notification Preferences** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **User Management** | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

> 📝 **Legend**: ✅ = Được truy cập | ⬜ = Không thấy module

---

## 3. Action Permissions (Chi tiết hành động)

### 3.1 Dashboard Module
| Action | admin | manager | chef | sales | staff | accountant | viewer |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| View KPIs | ✅ | ✅ | ✅ | ✅ | ⬜ | ✅ | ✅ |
| View Activity | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Revenue | ✅ | ✅ | ⬜ | ✅ | ⬜ | ✅ | ⬜ |
| Refresh Data | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### 3.2 Menu Module
**Backend Enforcement**: `require_permission("menu", "<action_code>")` via `PermissionChecker`

| Action | Code | admin | manager | chef | sales | viewer |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| Xem thực đơn / Stats / Recipes | `view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tạo món / Danh mục / Set Menu | `create` | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| Sửa món / Công thức / Toggle | `edit` | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| Xóa món / Danh mục / Bulk | `delete` | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Đặt giá bán | `set_price` | ✅ | ✅ | ⬜ | ⬜ | ⬜ |
| Xem giá vốn / Menu Engineering | `view_cost` | ✅ | ✅ | ✅ | ⬜ | ⬜ |

### 3.3 Quote Module (`quote`)
| Action | Code | admin | manager | sales | accountant | viewer |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| View/List Quotes | `quote:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Quote | `quote:create` | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| Edit/Update Quote | `quote:update` | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| Delete Quote | `quote:delete` | ✅ | ✅ | ⬜ | ⬜ | ⬜ |
| Convert to Order | `quote:convert` | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| Clone Quote | `quote:clone` | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| Export Quote | `quote:export` | ✅ | ✅ | ✅ | ✅ | ✅ |


### 3.4 Order Module
**Backend Enforcement**: `require_permission("order", "<action_code>")` via `PermissionChecker`

| Action | Code | admin | manager | chef | sales | staff | accountant |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Xem đơn hàng | `view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tạo đơn hàng / TT / Chi phí | `create` | ✅ | ✅ | ⬜ | ✅ | ⬜ | ⬜ |
| Sửa đơn hàng / Items / Staff | `edit` | ✅ | ✅ | ⬜ | ✅ | ⬜ | ⬜ |
| Xóa thanh toán / Ghi chú | `delete` | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Xác nhận / Mark Paid / Staff | `confirm` | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Hủy đơn hàng | `cancel` | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Đổi trạng thái (Start/Complete/Reopen/Hold/Resume) | `update_status` | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |

### 3.5 Calendar Module
| Action | admin | manager | chef | sales | staff |
| :--- | :---: | :---: | :---: | :---: | :---: |
| View All Events | ✅ | ✅ | ✅ | ✅ | ⬜ |
| View Assigned | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Event | ✅ | ✅ | ⬜ | ⬜ | ⬜ |
| Edit Event | ✅ | ✅ | ⬜ | ⬜ | ⬜ |
| Assign Staff | ✅ | ✅ | ⬜ | ⬜ | ⬜ |
| Check-in | ✅ | ✅ | ✅ | ⬜ | ✅ |

### 3.6 Procurement Module
| Action | Code | admin | manager | chef | accountant | Backend Guard |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| Xem | `view` | ✅ | ✅ | ✅ | ✅ | `require_permission("procurement", "view")` |
| Tạo | `create` | ✅ | ✅ | ⬜ | ⬜ | `require_permission("procurement", "create")` |
| Sửa | `edit` | ✅ | ✅ | ⬜ | ⬜ | `require_permission("procurement", "edit")` |
| Xóa | `delete` | ✅ | ⬜ | ⬜ | ⬜ | `require_permission("procurement", "delete")` |
| Duyệt PO | `approve_po` | ✅ | ✅ | ⬜ | ⬜ | `require_permission("procurement", "approve_po")` |
| Thanh toán | `record_payment` | ✅ | ⬜ | ⬜ | ✅ | `require_permission("procurement", "record_payment")` |
| Nhận hàng | `receive_goods` | ✅ | ✅ | ✅ | ⬜ | `require_permission("procurement", "receive_goods")` |
| Duyệt YCMH | `approve_pr` | ✅ | ✅ | ⬜ | ⬜ | `require_permission("procurement", "approve_pr")` |
| Từ chối YCMH | `reject_pr` | ✅ | ✅ | ⬜ | ⬜ | `require_permission("procurement", "reject_pr")` |
| Chuyển PR→PO | `convert_pr` | ✅ | ✅ | ⬜ | ⬜ | `require_permission("procurement", "convert_pr")` |
| Xem thống kê | `view_stats` | ✅ | ✅ | ⬜ | ✅ | `require_permission("procurement", "view_stats")` |

**SoD Rules:**
- `create` ↔ `approve_po`: Người tạo PO không nên tự duyệt
- `approve_po` ↔ `record_payment`: Người duyệt PO không nên tự thanh toán
- `approve_pr` ↔ `convert_pr`: Người duyệt PR không nên tự chuyển PO

**Presets:** Quản lý mua hàng (11 actions), Nhân viên mua hàng (4), Kế toán mua hàng (3), Bếp nhận hàng (2)

### 3.7 HR Module
| Action | super_admin | admin | manager | accountant |
| :--- | :---: | :---: | :---: | :---: |
| **Nhân viên** | | | | |
| View Employees (`view`) | ✅ | ✅ | ✅ | ✅ |
| Create Employee (`create`) | ✅ | ✅ | ✅ | ⬜ |
| Edit Employee (`edit`) | ✅ | ✅ | ✅ | ⬜ |
| Delete Employee (`delete`) | ✅ | ✅ | ⬜ | ⬜ |
| View Salary Info (`view_salary`) | ✅ | ✅ | ⬜ | ✅ |
| View Detail (`view_detail`) | ✅ | ✅ | ✅ | ✅ |
| **Phân công** | | | | |
| View Assignments (`view`) | ✅ | ✅ | ✅ | ✅ |
| Create Assignment (`create`) | ✅ | ✅ | ✅ | ⬜ |
| Edit Assignment (`edit`) | ✅ | ✅ | ✅ | ⬜ |
| Delete Assignment (`delete`) | ✅ | ✅ | ⬜ | ⬜ |
| **Chấm công** | | | | |
| View Timesheets (`view`) | ✅ | ✅ | ✅ | ✅ |
| Create Timesheet (`create`) | ✅ | ✅ | ✅ | ⬜ |
| Edit Timesheet (`edit`) | ✅ | ✅ | ✅ | ⬜ |
| Delete Timesheet (`delete`) | ✅ | ✅ | ⬜ | ⬜ |
| Check-in/Check-out (`check_in_out`) | ✅ | ✅ | ✅ | ⬜ |
| Approve/Reject/Unlock (`approve`) | ✅ | ✅ | ✅ | ⬜ |
| **Nghỉ phép** | | | | |
| View Leave (`view_leave`) | ✅ | ✅ | ✅ | ⬜ |
| Approve/Reject Leave (`approve_leave`) | ✅ | ✅ | ✅ | ⬜ |
| **Lương** | | | | |
| View Payroll (`view_payroll`) | ✅ | ✅ | ⬜ | ✅ |
| Process Payroll (`process_payroll`) | ✅ | ✅ | ⬜ | ⬜ |
| Approve Payroll (`approve_payroll`) | ✅ | ✅ | ⬜ | ⬜ |
| Reopen Payroll (`reopen_payroll`) | ✅ | ✅ | ⬜ | ⬜ |
| **Lịch & Tiện ích** | | | | |
| Calendar/Availability (`view`) | ✅ | ✅ | ✅ | ✅ |
| Holidays (`view`) | ✅ | ✅ | ✅ | ✅ |
| Unified Assignments (`view`) | ✅ | ✅ | ✅ | ✅ |

> 📝 **Self-Service Endpoints (GAP-4)**: Các endpoint sau **không cần action check**, chỉ cần đăng nhập:
> - `GET /payroll/my-payslips` — Xem phiếu lương cá nhân
> - `GET /leave/my/balances` — Xem số ngày nghỉ còn lại
> - `GET /leave/my/requests` — Xem đơn nghỉ phép cá nhân
> - `POST /leave/requests/{id}/cancel` — Hủy đơn nghỉ phép (chỉ PENDING)
> - `GET /notifications` — Xem thông báo cá nhân
> - `PUT /notifications/{id}/read` — Đánh dấu đã đọc
>
> Được bảo vệ bởi module-level `require_permission("hr")` + RLS.

### 3.8 Finance Module
| Action | admin | manager | accountant |
| :--- | :---: | :---: | :---: |
| View COA | ✅ | ✅ | ✅ |
| Create Account | ✅ | ⬜ | ✅ |
| Edit (Payment Terms) | ✅ | ⬜ | ✅ |
| Delete Period | ✅ | ⬜ | ⬜ |
| View Journals | ✅ | ✅ | ✅ |
| Create Journal | ✅ | ⬜ | ✅ |
| Post Journal (`post_journal`) | ✅ | ⬜ | ✅ |
| Reverse Journal (`reverse_journal`) | ✅ | ⬜ | ⬜ |
| Record Payment (`record_payment`) | ✅ | ⬜ | ✅ |
| View Reports | ✅ | ✅ | ✅ |
| Export Reports (`export`) | ✅ | ✅ | ✅ |
| Close Period (`close_period`) | ✅ | ⬜ | ⬜ |
| Reopen Period (`reopen_period`) | ✅ | ⬜ | ⬜ |

### 3.9 CRM Module
| Action | admin | manager | sales |
| :--- | :---: | :---: | :---: |
| View All Customers | ✅ | ✅ | ⬜ |
| View Own Customers | ✅ | ✅ | ✅ |
| Create Customer | ✅ | ✅ | ✅ |
| Edit Any | ✅ | ✅ | ⬜ |
| Edit Own | ✅ | ✅ | ✅ |
| Delete Customer | ✅ | ⬜ | ⬜ |
| View History | ✅ | ✅ | ✅ |

### 3.10 Inventory/BOM Module
| Action | admin | manager | chef |
| :--- | :---: | :---: | :---: |
| View Recipes | ✅ | ✅ | ✅ |
| Create Recipe | ✅ | ✅ | ✅ |
| Edit Recipe | ✅ | ✅ | ✅ |
| Delete Recipe | ✅ | ⬜ | ⬜ |
| Calculate Cost | ✅ | ✅ | ✅ |
 
 ### 3.11 User Management Module
 **Backend Enforcement**: `require_permission("user", "<action_code>")` via `PermissionChecker`

 | Action | Code | super_admin | admin |
 | :--- | :--- | :---: | :---: |
 | Xem user | `view` | ✅ | ✅ |
 | Tạo user | `create` | ✅ | ✅ |
 | Sửa user | `edit` | ✅ | ✅ |
 | Xóa user | `delete` | ✅ | ✅ |
 | Vô hiệu hóa | `deactivate` | ✅ | ✅ |
 | Reset mật khẩu | `reset_password` | ✅ | ✅ |
 | Xem hoạt động (audit trail) | `view_activity` | ✅ | ✅ |
 | Quản lý vai trò | `manage_roles` | ✅ | ✅ |

 > 📝 **SoD Rules**: Hệ thống cảnh báo khi bật đồng thời: `create`+`manage_roles`, `delete`+`create`, `reset_password`+`view_activity`
 > 
 > 📝 **Presets**: 3 mẫu có sẵn — Quản trị User (full), Helpdesk (hỗ trợ), Giám sát (chỉ xem)

### 3.12 Invoice Module
| Action | admin | manager | sales | accountant |
| :--- | :---: | :---: | :---: | :---: |
| View Invoices | ✅ | ✅ | ✅ | ✅ |
| Create Invoice | ✅ | ✅ | ⬜ | ✅ |
| Edit Invoice | ✅ | ✅ | ⬜ | ✅ |
| Delete Invoice | ✅ | ⬜ | ⬜ | ⬜ |

### 3.13 Notification Preferences Module
| Action | admin | manager | chef | sales | staff | accountant | viewer |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| View Own Preferences | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit Own Preferences | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reset Own to Defaults | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> 📝 Notification Preferences là cài đặt cá nhân — mỗi user chỉ xem/sửa preferences của chính mình.

### 3.14 Settings Module
| Action | Code | super_admin | admin | manager |
| :--- | :--- | :---: | :---: | :---: |
| Xem cài đặt | `view` | ✅ | ✅ | ✅ |
| Sửa (chung) | `edit` | ✅ | ✅ | ⬜ |
| Sửa thông tin công ty | `edit_company` | ✅ | ✅ | ⬜ |
| Sửa cấu hình hệ thống | `edit_system` | ✅ | ✅ | ⬜ |
| Quản lý logo | `upload_logo` | ✅ | ✅ | ⬜ |
| Quản lý gói dịch vụ | `manage_subscription` | ✅ | ⬜ | ⬜ |

> 📝 `manage_subscription` chỉ super_admin vì ảnh hưởng billing. `edit_system` ảnh hưởng cấu hình nghiệp vụ toàn tenant.

**SoD Rules:**
- `settings:edit_system` + `settings:upload_logo` → ⚠️ Kiểm soát quá rộng
- `settings:edit_system` + `settings:manage_subscription` → ⚠️ Có thể thay đổi giới hạn hệ thống

**Presets:**
| Mẫu | Actions |
| :--- | :--- |
| ⚙️ Admin Cài đặt | `view, edit, edit_company, edit_system, upload_logo, manage_subscription` |
| 🏢 Quản lý công ty | `view, edit, edit_company, upload_logo` |
| 👁️ Xem cài đặt | `view` |

### 3.15 Inventory Module
**Backend Enforcement**: `require_permission("inventory", "<action_code>")` via `dependencies=[Depends()]` on 32 endpoint decorators

| Action | Code | super_admin | admin | manager | chef | staff |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| Xem kho | `view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tạo item/warehouse | `create` | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| Sửa item | `edit` | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| Xóa item | `delete` | ✅ | ✅ | ⬜ | ⬜ | ⬜ |
| Xuất/Nhập kho | `stock_transfer` | ✅ | ✅ | ✅ | ✅ | ⬜ |
| Hoàn tác giao dịch | `reverse_transaction` | ✅ | ✅ | ⬜ | ⬜ | ⬜ |
| Quản lý lô hàng | `manage_lots` | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| Đặt hàng tự động | `auto_reorder` | ✅ | ✅ | ⬜ | ⬜ | ⬜ |
| Quản lý thiết bị | `manage_equipment` | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| Xuất báo cáo | `export` | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| Xem phân tích | `view_analytics` | ✅ | ✅ | ✅ | ⬜ | ⬜ |

> 📝 `reverse_transaction` và `auto_reorder` chỉ admin trở lên vì ảnh hưởng tài chính trực tiếp.

**SoD Rules:**
- `inventory:stock_transfer` + `inventory:reverse_transaction` → ⚠️ Cần kiểm soát chéo
- `inventory:stock_transfer` + `inventory:auto_reorder` → ⚠️ Tránh conflict of interest
- `inventory:delete` + `inventory:reverse_transaction` → ⚠️ Kiểm soát dữ liệu toàn diện

**Presets:**
| Mẫu | Actions |
| :--- | :--- |
| 📦 Quản lý kho toàn diện | `view, create, edit, delete, stock_transfer, reverse_transaction, manage_lots, auto_reorder, manage_equipment, export, view_analytics` |
| 🔄 Thủ kho | `view, create, edit, stock_transfer, manage_lots, manage_equipment, export` |
| 📊 Giám sát kho | `view, view_analytics, export` |
| 🍳 Bếp trưởng | `view, stock_transfer` |

---

## 4. Implementation Guide

### 4.1 Backend Middleware (FastAPI)

```python
# core/auth/permissions.py
from functools import wraps
from fastapi import HTTPException, Depends

# Module Access Config
MODULE_ACCESS = {
    "dashboard": ["*"],
    "menu": ["super_admin", "admin", "manager", "chef", "sales", "viewer"],
    "quote": ["super_admin", "admin", "manager", "sales", "accountant"],
    "order": ["super_admin", "admin", "manager", "chef", "sales", "staff", "accountant"],
    "calendar": ["super_admin", "admin", "manager", "chef", "sales", "staff"],
    "procurement": ["super_admin", "admin", "manager", "chef", "accountant"],
    "hr": ["super_admin", "admin", "manager", "accountant"],
    "finance": ["super_admin", "admin", "manager", "accountant"],
    "crm": ["super_admin", "admin", "manager", "sales"],
    "analytics": ["super_admin", "admin", "manager", "sales", "accountant"],
    "inventory": ["super_admin", "admin", "manager", "chef"],
    "user": ["super_admin", "admin"],
    "invoice": ["super_admin", "admin", "manager", "sales", "accountant"],
    "settings": ["super_admin", "admin"],
    "notification": ["*"],
}

def require_module(module: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user=Depends(get_current_user), **kwargs):
            allowed_roles = MODULE_ACCESS.get(module, [])
            if "*" not in allowed_roles and current_user.role not in allowed_roles:
                raise HTTPException(status_code=403, detail="Access denied")
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

def require_permission(module: str, action: str):
    # Implement action-level checks based on Section 3
    pass
```

### 4.2 Frontend Guard (Angular)

```typescript
// core/guards/permission.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

const MODULE_ACCESS: Record<string, string[]> = {
  'dashboard': ['*'],
  'menu': ['super_admin', 'admin', 'manager', 'chef', 'sales', 'viewer'],
  // ... giống backend
};

export const moduleGuard = (module: string): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const userRole = auth.currentUser?.role;
    
    const allowed = MODULE_ACCESS[module] || [];
    if (allowed.includes('*') || allowed.includes(userRole)) {
      return true;
    }
    
    router.navigate(['/dashboard'], { queryParams: { error: 'unauthorized' } });
    return false;
  };
};
```

---

## 5. Checklist Khi Tạo Module Mới

> [!IMPORTANT]
> Trước khi bắt đầu code, PHẢI hoàn thành các bước sau:

- [ ] **Bước 1**: Thêm module vào **Section 2** (Module Access Matrix)
- [ ] **Bước 2**: Tạo bảng Action Permissions trong **Section 3**
- [ ] **Bước 3**: Cập nhật `MODULE_ACCESS` trong Backend (Section 4.1)
- [ ] **Bước 4**: Cập nhật `MODULE_ACCESS` trong Frontend (Section 4.2)
- [ ] **Bước 5**: Thêm route guards trong `app.routes.ts`
- [ ] **Bước 6**: Test với ít nhất 2 roles khác nhau

---

## 6. Quick Reference

| Khi cần... | Xem Section |
| :--- | :--- |
| Biết role nào thấy module nào | Section 2 |
| Biết role nào có action nào | Section 3 |
| Implement Backend permission | Section 4.1 |
| Implement Frontend guard | Section 4.2 |
| Checklist tạo module mới | Section 5 |
