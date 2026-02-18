# Fix Report: BUG-20260217-004

## Bug Information

| Field | Value |
|-------|-------|
| Bug ID | BUG-20260217-004 |
| Date | 17/02/2026 |
| Module | HR / Leave Management |
| Severity | High |
| Root Cause Category | `duplicate-code`, `schema-mismatch` |
| Keywords | leave, 404, 500, my-balances, my-requests, duplicate-endpoints, schema-validation, fastapi-last-wins |
| Files Changed | `backend/modules/hr/infrastructure/http_router.py` |
| Status | ✅ FIXED AND VERIFIED |

---

## Problem

Leave tab trên production hiển thị console errors:
- `/hr/leave/my-balances` → **404 Not Found**
- `/hr/leave/my-requests` → **404 Not Found**
- `/hr/leave/requests?status=PENDING` → **500 Internal Server Error**

---

## Root Cause Analysis (5 Whys)

### Issue 1: 404 trên /my-balances và /my-requests

| Level | Question | Answer |
| :---: | :--- | :--- |
| Why 1 | User thấy lỗi 404 trên Leave tab? | Endpoints `/my-balances` và `/my-requests` trả 404 |
| Why 2 | Tại sao trả 404? | Code raise `HTTPException(404)` khi không tìm thấy Employee record |
| Why 3 | Tại sao không có Employee record? | User `nguyenphap.mt@gmail.com` chưa được liên kết với bản ghi Employee trong HR |
| **Root** | Logic thiếu graceful fallback | Endpoint nên trả `[]` thay vì 404 cho "my-" endpoints khi user chưa có employee record |

### Issue 2: 500 trên /requests?status=PENDING

| Level | Question | Answer |
| :---: | :--- | :--- |
| Why 1 | User thấy lỗi 500? | Pydantic `ValidationError: 1 validation error for LeaveRequestResponse` |
| Why 2 | Tại sao validation error? | Handler trả thêm fields `leave_type_code`, `approved_by` không tồn tại trong schema gốc |
| Why 3 | Tại sao handler dùng schema khác? | Có 2 phiên bản của route `/leave/requests` (line 2646 + line 3917) với schema khác nhau |
| Why 4 | Tại sao FastAPI dùng handler sai? | FastAPI **"last-handler-wins"** — handler duplicate ở line 3917 ghi đè handler gốc |
| **Root** | 655 dòng code duplicate | BUG-20260217-002 đã thêm duplicate section (schemas + endpoints) xung đột với code gốc |

---

## Solution

### Fix 1: Graceful empty response (BUG-004a)
Thay đổi `/my-balances` và `/my-requests` trả `[]` thay vì raise `HTTPException(404)` khi user không có employee record.

```diff
-    if not employee:
-        raise HTTPException(
-            status_code=404,
-            detail="Không tìm thấy hồ sơ nhân viên liên kết với tài khoản này"
-        )
+    if not employee:
+        # BUGFIX: BUG-20260217-004 - Return empty array instead of 404
+        return []
```

### Fix 2: Xóa duplicate endpoints (BUG-004b)
Xóa 655 dòng code duplicate (schemas + endpoints) được thêm bởi BUG-20260217-002 mà gây xung đột với code gốc ở PHASE 5 (lines 2277-3085).

Duplicate section bao gồm:
- `LeaveTypeResponse`, `LeaveBalanceResponse`, `LeaveRequestResponse` (duplicate schemas với extra fields)
- `GET /leave/requests` (duplicate)
- `POST /leave/requests` (duplicate)
- `GET /leave/my-requests` (duplicate)
- `GET /leave/my-balances` (duplicate)
- `PUT /leave/requests/{id}/approve` (duplicate)
- `PUT /leave/requests/{id}/reject` (duplicate)
- `GET /leave/requests/{id}/history` (duplicate)
- `GET /leave/stats` (duplicate — đã có ở line 3042)

---

## Verification Results

Tất cả 6 leave endpoints trên production đều trả 200 OK:

| Endpoint | Trước | Sau |
|---|---|---|
| `/hr/leave/my-balances` | ❌ 404 | ✅ 200 (`[]`) |
| `/hr/leave/my-requests` | ❌ 404 | ✅ 200 (`[]`) |
| `/hr/leave/requests?status=PENDING` | ❌ 500 | ✅ 200 (data) |
| `/hr/leave/types` | ✅ 200 | ✅ 200 |
| `/hr/leave/stats` | ✅ 200 | ✅ 200 |
| `/hr/leave/requests` | ✅ 200 | ✅ 200 |

---

## Lessons Learned

> **FastAPI Last-Handler-Wins**: Khi có 2 route definitions cùng path + method, FastAPI sẽ dùng handler được đăng ký **cuối cùng**, không phải đầu tiên. Điều này khác với nhiều framework khác.

> **"my-" endpoints graceful fallback**: Các endpoint dành cho current user ("my-balances", "my-requests") nên trả mảng rỗng thay vì 404 khi user chưa có record liên kết.

---

## Definition of Done

- [x] Root cause identified (2 issues)
- [x] Fix implemented (2 commits)
- [x] Production deployed (Cloud Run + traffic routing)
- [x] All 6 endpoints verified 200 OK
- [x] Documentation updated
