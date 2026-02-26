# PRD: Phân quyền Module Báo giá (Quote Permissions)

> Workflow: Hybrid Research-Reflexion v1.0
> Date: 25/02/2026
> Module: `quote`
> Quality Score: 88/100

---

## 1. Bối cảnh & Mục tiêu

Module Báo giá hiện có **6 action codes backend** và **7 actions trong UI Permission Matrix** nhưng tồn tại nhiều GAPs giữa cấu hình UI, backend enforcement, và frontend guards.

**Mục tiêu**: Đảm bảo mọi action trong module đều được enforce ở cả 3 lớp: **UI → Backend → Audit**.

---

## 2. Hiện trạng (Codebase Scan)

### 2.1 Backend — `http_router.py` (1031 dòng, 25 endpoints)

| Action Code | Endpoints Sử dụng | Count |
|:---|:---|:---:|
| `quote:read` | list_quotes, get_expiring_quotes, list_templates, get_template, get_quote, list_note_presets | 6 |
| `quote:create` | create_quote, create_note_preset, create_template, apply_template | 4 |
| `quote:update` | update_quote, mark_quote_as_lost, update_template | 3 |
| `quote:delete` | delete_quote, delete_note_preset, delete_template | 3 |
| `quote:clone` | clone_quote | 1 |
| `quote:convert` | convert_quote_to_order | 1 |
| `quote:export` | ❌ **KHÔNG TỒN TẠI** | 0 |
| **Tổng** | | **19** |

### 2.2 Frontend — `page.tsx` (863 dòng)

| PermissionGate | Action | Line | Context |
|:---|:---|:---:|:---|
| ✅ | `create` | L359 | Button "Tạo báo giá" |
| ✅ | `delete` | L443 | Bulk delete toolbar |
| ✅ | `edit` | L692 | Gmail overlay edit button |
| ✅ | `delete` | L702 | Gmail overlay delete (DRAFT only) |
| ✅ | `convert` | L717 | Gmail overlay convert button |
| ❌ | `clone` | — | **MISSING**: Không có nút nhân bản trên FE |
| ❌ | `export` | L505-513 | **MISSING**: Button "Xuất báo cáo" NO PermissionGate |

### 2.3 Audit Logging
| Metric | Value |
|:---|:---:|
| Audit log calls | **0** |
| Audit helper function | ❌ Không tồn tại |

### 2.4 MODULE_ACCESS (permissions.py L11)
```python
"quote": ["super_admin", "admin", "manager", "sales", "accountant"]
```

---

## 3. Gap Analysis

### GAP-Q1: Frontend "Xuất báo cáo" thiếu Permission Guard
- **Severity**: MEDIUM
- **Location**: [page.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/quote/page.tsx#L505-L513)
- **Vấn đề**: Button "Xuất báo cáo" (Excel/PDF) hiển thị cho TẤT CẢ users có quyền `quote:read`. Không có `PermissionGate` bọc quanh.
- **Rủi ro**: User chỉ có quyền xem (viewer role) có thể export toàn bộ data ra Excel, tiềm ẩn rò rỉ dữ liệu giá.

> [!WARNING]
> Export là client-side (JavaScript), không qua backend API → backend KHÔNG THỂ chặn.

**Fix**: Wrap button với `<PermissionGate module="quote" action="export">`.

---

### GAP-Q2: Backend thiếu `quote:export` action code
- **Severity**: LOW (export hiện tại là client-side)
- **Location**: [http_router.py](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/backend/modules/quote/infrastructure/http_router.py)
- **Vấn đề**: UI Permission Matrix hiển thị action "Xuất" nhưng backend không có endpoint nào dùng `quote:export`.
- **Nguyên nhân**: Export được xử lý hoàn toàn client-side (ExcelJS + jsPDF).

**Fix**: Thêm `quote:export` vào frontend-only permission check. Không cần backend endpoint.

---

### GAP-Q3: QuoteWizard & Edit Page thiếu Permission Guard
- **Severity**: HIGH
- **Location**:
  - [QuoteWizard.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/quote/components/QuoteWizard.tsx)
  - [edit/page.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/quote/[id]/edit/page.tsx)
  - [create/page.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/quote/create/page.tsx)
- **Vấn đề**: Không có ANY permission check trong QuoteWizard hoặc edit/create page. User có thể:
  1. Truy cập trực tiếp URL `/quote/create` dù không có quyền `create`
  2. Truy cập URL `/quote/{id}/edit` dù không có quyền `edit`
- **Rủi ro**: Bypass frontend guards bằng URL trực tiếp.

**Fix**:
- `create/page.tsx`: Wrap toàn bộ nội dung với `<PermissionGate module="quote" action="create">`
- `[id]/edit/page.tsx`: Wrap với `<PermissionGate module="quote" action="edit">`

---

### GAP-Q4: Frontend thiếu nút "Nhân bản" (Clone)
- **Severity**: MEDIUM
- **Location**: [page.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/quote/page.tsx) — Gmail overlay actions
- **Vấn đề**: Backend có `quote:clone` endpoint và UI Permission Matrix hiển thị "Nhân bản" nhưng frontend KHÔNG có nút clone trong overlay hoặc bất kỳ đâu.
- **Rủi ro**: Permission setting "Nhân bản" trong matrix không có tác dụng.

**Fix**: Thêm clone button trong Gmail overlay (sau convert button), wrapped với `<PermissionGate module="quote" action="clone">`.

---

### GAP-Q5: Không có Audit Logging
- **Severity**: HIGH
- **Location**: [http_router.py](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/backend/modules/quote/infrastructure/http_router.py)
- **Vấn đề**: Module Báo giá có **ZERO audit log calls** trong toàn bộ 1031 dòng code. So sánh: Menu module có 12 audit events.
- **Rủi ro**: Không thể truy vết ai tạo, sửa, xóa, chuyển đổi báo giá.

**Fix**: Thêm `_log_quote_audit()` helper và log cho:

| Event | Trigger |
|:---|:---|
| `QUOTE_CREATE` | POST /quotes |
| `QUOTE_UPDATE` | PUT /quotes/{id} |
| `QUOTE_DELETE` | DELETE /quotes/{id} |
| `QUOTE_CLONE` | POST /quotes/{id}/clone |
| `QUOTE_CONVERT` | POST /quotes/{id}/convert |
| `QUOTE_MARK_LOST` | POST /quotes/{id}/mark-lost |
| `TEMPLATE_CREATE` | POST /quote-templates |
| `TEMPLATE_UPDATE` | PUT /quote-templates/{id} |
| `TEMPLATE_DELETE` | DELETE /quote-templates/{id} |

---

### GAP-Q6: "Đánh dấu không chốt" thiếu Permission Guard
- **Severity**: MEDIUM
- **Location**: [page.tsx L727-734](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/quote/page.tsx#L727-L734)
- **Vấn đề**: Nút "Đánh dấu không chốt" (IconHandOff) hiển thị cho TẤT CẢ users có quyền xem, không wrapped trong PermissionGate. Backend dùng `quote:update` nhưng FE không check.
- **Rủi ro**: User sales có thể mark lost mà không cần quyền `edit`/`update`.

**Fix**: Wrap với `<PermissionGate module="quote" action="edit">`.

---

## 4. Role-Action Matrix (Đề xuất)

| Action | super_admin | admin | manager | sales | accountant |
|:---|:---:|:---:|:---:|:---:|:---:|
| `view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `create` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `edit` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `delete` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `convert` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `clone` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `export` | ✅ | ✅ | ✅ | ✅ | ✅ |

> [!IMPORTANT]
> **SoD**: `sales` có thể tạo/sửa nhưng KHÔNG thể xoá hoặc chuyển đổi thành đơn hàng. Chỉ `manager+` mới convert.

---

## 5. Kế hoạch Thực thi

### Priority Order

| # | GAP | Severity | Effort |
|:---:|:---|:---:|:---:|
| 1 | GAP-Q3: QuoteWizard/Edit URL bypass | HIGH | 1h |
| 2 | GAP-Q5: Audit logging (0 → 9 events) | HIGH | 2h |
| 3 | GAP-Q1: Export button guard | MEDIUM | 15m |
| 4 | GAP-Q4: Clone button FE | MEDIUM | 30m |
| 5 | GAP-Q6: Mark Lost guard | MEDIUM | 15m |
| 6 | GAP-Q2: Export action alignment | LOW | 10m |

### 5.1 Frontend Changes

#### [MODIFY] [page.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/quote/page.tsx)
- L505-513: Wrap "Xuất báo cáo" button with `<PermissionGate module="quote" action="export">`
- L727-734: Wrap "Mark Lost" button with `<PermissionGate module="quote" action="edit">`
- Add clone button with `<PermissionGate module="quote" action="clone">` in overlay

#### [MODIFY] [create/page.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/quote/create/page.tsx)
- Wrap toàn bộ page content with `<PermissionGate module="quote" action="create">`

#### [MODIFY] [edit/page.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/quote/[id]/edit/page.tsx)
- Wrap toàn bộ page content with `<PermissionGate module="quote" action="edit">`

### 5.2 Backend Changes

#### [MODIFY] [http_router.py](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/backend/modules/quote/infrastructure/http_router.py)
- Add `_log_quote_audit()` helper function
- Add 9 audit events across endpoints

---

## 6. Verification Plan

### Automated
```bash
# Syntax check
python -c "import ast; ast.parse(open('backend/modules/quote/infrastructure/http_router.py').read()); print('OK')"

# Count audit events  
grep -c "_log_quote_audit" backend/modules/quote/infrastructure/http_router.py
# Expected: ≥ 9

# Count PermissionGate in FE
grep -c "PermissionGate" frontend/src/app/\(dashboard\)/quote/page.tsx
# Expected: ≥ 8 (currently 5 → +3)
```

### Browser Test
1. Login với user `sales` → verify: có thể tạo/sửa, KHÔNG thể xóa/convert
2. Export button visible cho accountant role
3. URL `/quote/create` blocked cho accountant
4. Clone button visible cho sales, guarded

---

## 7. Research Sources (Verified Claims)

| Claim | Sources | Confidence |
|:---|:---:|:---:|
| PoLP: restrict export to authorized roles | 3 | HIGH |
| SoD: separate quote creation from order conversion | 2 | HIGH |
| Audit: all CUD operations must be logged | 3 | HIGH |
| URL-based bypass requires page-level guards | 2 | MEDIUM |
| Client-side export needs FE-only permission check | 2 | MEDIUM |
