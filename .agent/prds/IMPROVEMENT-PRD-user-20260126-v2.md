# IMPROVEMENT PRD: Module User V2 (với Feature Completeness)

> **PRD ID:** `IMPROVEMENT-PRD-user-20260126-v2`  
> **Module:** User  
> **Workflow Version:** 3.2.2  
> **Audit Score:** 72/100 (Grade C)  
> **Feature Completeness:** 47% (Grade F) - 4/10 features  
> **Created:** 26/01/2026 10:52  
> **Status:** DRAFT

---

## 1. Executive Summary

### 1.1 Score Breakdown

| Category | Score | Grade |
|:---------|:-----:|:-----:|
| **5-Dimension Audit** | 88/100 | B+ |
| **Business Flow** | 92/100 | A |
| **Feature Completeness** | 47% | F |
| **Combined** | **72/100** | **C** |

### 1.2 Missing Features (NEW in V3.2.2)

| Priority | Feature | Status |
|:---------|:--------|:------:|
| 🔴 **CRITICAL** | Đổi mật khẩu | ❌ MISSING |
| 🟠 **HIGH** | Trang của tôi (My Profile) | ❌ MISSING |
| 🟠 **HIGH** | Nhật ký hoạt động | ❌ MISSING |
| 🟠 **HIGH** | Lưu phân quyền vào DB | ❌ MISSING |
| 🟡 **MEDIUM** | Lịch sử đăng nhập | ❌ MISSING |
| 🟢 **LOW** | Xuất dữ liệu (Excel/PDF) | ❌ MISSING |

---

## 2. All Issues (11 total)

### 🔴 CRITICAL (1)
| ID | Category | Issue |
|:---|:---------|:------|
| FEAT_CHANGE_PASSWORD | FEATURE_GAP | Missing: Đổi mật khẩu |

### 🟠 HIGH (4)
| ID | Category | Issue |
|:---|:---------|:------|
| FEAT_MY_PROFILE | FEATURE_GAP | Missing: Trang của tôi |
| FEAT_ACTIVITY_LOG | FEATURE_GAP | Missing: Nhật ký hoạt động |
| FEAT_PERMISSION_PERSISTENCE | FEATURE_GAP | Missing: Lưu phân quyền vào DB |
| H1 | FE | Permission save is MOCK only |

### 🟡 MEDIUM (4)
| ID | Category | Issue |
|:---|:---------|:------|
| FEAT_LOGIN_HISTORY | FEATURE_GAP | Missing: Lịch sử đăng nhập |
| M1 | DA | Role stored as string |
| M2 | BE | No role validation |
| M3 | FE | Missing user.model.ts |

### 🟢 LOW (2)
| ID | Category | Issue |
|:---|:---------|:------|
| L1 | BE | Missing GET single user |
| L2 | FE | Role create client-side only |

---

## 3. Implementation Plan

### Sprint 1: Security - Change Password (CRITICAL)

#### BE: `backend/modules/user/infrastructure/http_router.py`
```python
@router.post("/me/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: UserSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Đổi mật khẩu cho user hiện tại"""
    service = UserService(db)
    
    # Verify current password
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(400, "Mật khẩu hiện tại không đúng")
    
    # Validate new password
    if len(data.new_password) < 8:
        raise HTTPException(400, "Mật khẩu mới phải >= 8 ký tự")
    
    # Update
    await service.update_password(current_user.id, data.new_password)
    return {"success": True, "message": "Đổi mật khẩu thành công"}
```

#### FE: `frontend/src/app/admin/user-management/change-password/`
```typescript
@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './change-password.component.html'
})
export class ChangePasswordComponent {
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  
  changePassword() {
    if (this.newPassword !== this.confirmPassword) {
      alert('Mật khẩu không khớp');
      return;
    }
    this.userService.changePassword(this.currentPassword, this.newPassword)
      .subscribe({
        next: () => alert('Đổi mật khẩu thành công!'),
        error: (err) => alert(err.error.detail)
      });
  }
}
```

---

### Sprint 2: My Profile Page (HIGH)

#### FE: `frontend/src/app/profile/`
```
profile/
├── profile.component.ts      # Main profile page
├── profile.component.html
├── profile.component.scss
└── profile.service.ts        # Load/update current user
```

**Features:**
- Xem thông tin cá nhân
- Sửa họ tên, email
- Đổi mật khẩu (link to change-password)
- Avatar upload (optional)

---

### Sprint 3: Activity Log (HIGH)

#### BE: Database Migration
```sql
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,  -- LOGIN, CREATE_USER, UPDATE_ORDER, etc.
    entity_type VARCHAR(50),       -- User, Order, Quote, etc.
    entity_id UUID,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);
```

#### BE: Service
```python
class ActivityLogService:
    async def log(self, user_id: UUID, action: str, entity_type: str = None, 
                  entity_id: UUID = None, metadata: dict = None):
        """Log một hành động"""
        log = ActivityLog(
            tenant_id=self.tenant_id,
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata=metadata,
            ip_address=self.request.client.host,
            user_agent=self.request.headers.get("user-agent")
        )
        self.db.add(log)
        await self.db.commit()
```

#### FE: `frontend/src/app/admin/activity-log/`
- Bảng AG Grid với các cột: Thời gian, Người dùng, Hành động, Chi tiết
- Filter theo user, action type, date range

---

### Sprint 4: Permission Persistence (HIGH)

Xem Improvement PRD V1 - đã có spec

---

### Sprint 5: Login History (MEDIUM)

#### BE: Track login events
```python
# In auth/router.py login endpoint
await activity_log_service.log(
    user_id=user.id,
    action="LOGIN",
    metadata={
        "method": "password",
        "success": True
    }
)
```

#### FE: View in Profile page
- Tab "Lịch sử đăng nhập"
- Hiển thị: Thời gian, IP, Device, Location (from IP)

---

## 4. Effort Estimation

| Feature | Priority | Effort (h) |
|:--------|:--------:|:----------:|
| Change Password | CRITICAL | 4 |
| My Profile | HIGH | 6 |
| Activity Log (BE+FE) | HIGH | 8 |
| Permission Persistence | HIGH | 4 |
| Login History | MEDIUM | 4 |
| Previous issues (M1-M3, L1-L2) | MEDIUM/LOW | 6 |
| **Total** | | **32 hours** |

**Timeline:** 4-5 days

---

## 5. Acceptance Criteria

### Change Password
- [ ] User có thể đổi mật khẩu từ profile
- [ ] Validate mật khẩu cũ trước khi đổi
- [ ] Mật khẩu mới >= 8 ký tự
- [ ] Thông báo lỗi rõ ràng

### My Profile
- [ ] Xem được thông tin cá nhân
- [ ] Sửa được họ tên, email
- [ ] Link đến đổi mật khẩu

### Activity Log
- [ ] Log tất cả actions quan trọng
- [ ] Admin có thể xem toàn bộ logs
- [ ] Filter theo user, action, date

### Permission Persistence  
- [ ] Role permissions lưu vào DB
- [ ] Reload page vẫn giữ permissions

---

## 6. Next Steps

```
/implement FEAT_CHANGE_PASSWORD  # Start với CRITICAL
/implement FEAT_MY_PROFILE
/implement FEAT_ACTIVITY_LOG
```
