# Permission Matrix - Ẩm Thực Giáo Tuyết
> **Mục tiêu**: Đây là bảng phân quyền **BẮT BUỘC** tuân thủ khi phát triển bất kỳ Module/Feature nào.
> **Cập nhật**: 2026-02-10

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
| Action | admin | manager | chef | sales | viewer |
| :--- | :---: | :---: | :---: | :---: | :---: |
| View Menu | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Item | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| Edit Item | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| Delete Item | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Set Price | ✅ | ✅ | ⬜ | ⬜ | ⬜ |
| View Cost | ✅ | ✅ | ✅ | ⬜ | ⬜ |

### 3.3 Quote Module
| Action | admin | manager | sales | accountant |
| :--- | :---: | :---: | :---: | :---: |
| View All Quotes | ✅ | ✅ | ⬜ | ✅ |
| View Own Quotes | ✅ | ✅ | ✅ | ✅ |
| Create Quote | ✅ | ✅ | ✅ | ⬜ |
| Edit Draft | ✅ | ✅ | ✅ | ⬜ |
| Submit Quote | ✅ | ✅ | ✅ | ⬜ |
| Approve (≤10%) | ✅ | ✅ | ✅ | ⬜ |
| Approve (>10%) | ✅ | ✅ | ⬜ | ⬜ |
| Delete Quote | ✅ | ⬜ | ⬜ | ⬜ |

### 3.4 Order Module
| Action | admin | manager | chef | sales | staff | accountant |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| View All | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ |
| View Assigned | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Order | ✅ | ✅ | ⬜ | ✅ | ⬜ | ⬜ |
| Confirm Order | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Cancel Order | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Update Status | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ |

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
| Action | admin | manager | chef | accountant |
| :--- | :---: | :---: | :---: | :---: |
| View Suppliers | ✅ | ✅ | ✅ | ✅ |
| View Supplier Detail | ✅ | ✅ | ✅ | ✅ |
| View Supplier Stats | ✅ | ✅ | ✅ | ✅ |
| Create Supplier | ✅ | ✅ | ⬜ | ⬜ |
| Edit Supplier | ✅ | ✅ | ⬜ | ⬜ |
| Delete Supplier | ✅ | ⬜ | ⬜ | ⬜ |
| Bulk Delete Suppliers | ✅ | ⬜ | ⬜ | ⬜ |
| Create PO | ✅ | ✅ | ✅ | ⬜ |
| Approve PO | ✅ | ✅ | ⬜ | ⬜ |
| Record Payment | ✅ | ⬜ | ⬜ | ✅ |

### 3.7 HR Module
| Action | super_admin | admin | manager | accountant |
| :--- | :---: | :---: | :---: | :---: |
| **Nhân viên** | | | | |
| View Employees | ✅ | ✅ | ✅ | ✅ |
| Create Employee | ✅ | ✅ | ✅ | ⬜ |
| Edit Employee | ✅ | ✅ | ✅ | ⬜ |
| Delete Employee | ✅ | ✅ | ⬜ | ⬜ |
| View Salary Info | ✅ | ✅ | ⬜ | ✅ |
| **Chấm công** | | | | |
| View Timesheets | ✅ | ✅ | ✅ | ✅ |
| View Timesheet Detail | ✅ | ✅ | ✅ | ✅ |
| Create Timesheet | ✅ | ✅ | ✅ | ⬜ |
| Edit Timesheet | ✅ | ✅ | ✅ | ⬜ |
| Delete Timesheet | ✅ | ✅ | ⬜ | ⬜ |
| Check-in/Check-out | ✅ | ✅ | ✅ | ⬜ |
| Approve Timesheet | ✅ | ✅ | ✅ | ⬜ |
| Reject Timesheet | ✅ | ✅ | ✅ | ⬜ |
| **Nghỉ phép** | | | | |
| View Leave Requests | ✅ | ✅ | ✅ | ⬜ |
| Approve Leave | ✅ | ✅ | ✅ | ⬜ |
| **Lương** | | | | |
| View Payroll | ✅ | ✅ | ⬜ | ✅ |
| Process Payroll | ✅ | ✅ | ⬜ | ⬜ |
| Approve Payroll | ✅ | ✅ | ⬜ | ⬜ |

### 3.8 Finance Module
| Action | admin | manager | accountant |
| :--- | :---: | :---: | :---: |
| View COA | ✅ | ✅ | ✅ |
| Create Account | ✅ | ⬜ | ✅ |
| View Journals | ✅ | ✅ | ✅ |
| Create Journal | ✅ | ⬜ | ✅ |
| Post Journal | ✅ | ⬜ | ✅ |
| Reverse Journal | ✅ | ⬜ | ⬜ |
| View Reports | ✅ | ✅ | ✅ |
| Close Period | ✅ | ⬜ | ⬜ |

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
 | Action | super_admin | admin |
 | :--- | :---: | :---: |
 | View Users | ✅ | ✅ |
 | Create User | ✅ | ✅ |
 | Edit User | ✅ | ✅ |
 | Delete User | ✅ | ❌ |
 | Assign Role | ✅ | ✅ |

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
