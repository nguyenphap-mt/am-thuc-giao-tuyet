# PRD: Phân quyền Module Mua hàng (Procurement Permissions)

> **Version**: 1.0  
> **Created**: 2026-02-25  
> **Module**: `procurement`  
> **Research**: Hybrid Research-Reflexion (codebase scan + external best practices)

---

## 1. Vấn đề (Problem Statement)

Module Mua hàng hiện có **20 backend endpoints** nhưng **KHÔNG CÓ** `require_permission` guard nào. Frontend chỉ định nghĩa **6 actions** cơ bản, thiếu nhiều hành động quan trọng cho quy trình mua hàng.

### 1.1 Gap Analysis

| Section | Endpoints | Hiện có Guard? | Actions Frontend |
|:---|:---:|:---:|:---|
| **Suppliers** (CRUD + stats) | 6 | ❌ | `view, create, edit, delete` |
| **Purchase Orders** (CRUD + status + receive) | 6 | ❌ | `approve_po, record_payment` |
| **Purchase Requisitions** (CRUD + approve + reject + convert) | 8 | ❌ | _(không có)_ |
| **Tổng** | **20** | **0/20** | **6 actions** |

### 1.2 Endpoint Inventory

| # | Method | Path | Current Permission | Proposed Permission |
|:--|:---|:---|:---:|:---|
| 1 | GET | `/suppliers/stats` | ❌ | `procurement:view` |
| 2 | GET | `/suppliers` | ❌ | `procurement:view` |
| 3 | GET | `/suppliers/{id}` | ❌ | `procurement:view` |
| 4 | POST | `/suppliers` | ❌ | `procurement:create` |
| 5 | PUT | `/suppliers/{id}` | ❌ | `procurement:edit` |
| 6 | DELETE | `/suppliers/{id}` | ❌ | `procurement:delete` |
| 7 | GET | `/orders` | ❌ | `procurement:view` |
| 8 | GET | `/orders/{id}` | ❌ | `procurement:view` |
| 9 | POST | `/orders` | ❌ | `procurement:create` |
| 10 | PUT | `/orders/{id}/status` | ❌ | `procurement:approve_po` |
| 11 | POST | `/orders/{id}/receive` | ❌ | `procurement:receive_goods` |
| 12 | DELETE | `/orders/{id}` | ❌ | `procurement:delete` |
| 13 | GET | `/requisitions` | ❌ | `procurement:view` |
| 14 | POST | `/requisitions` | ❌ | `procurement:create` |
| 15 | PUT | `/requisitions/{id}` | ❌ | `procurement:edit` |
| 16 | PUT | `/requisitions/{id}/approve` | ❌ | `procurement:approve_pr` |
| 17 | PUT | `/requisitions/{id}/reject` | ❌ | `procurement:reject_pr` |
| 18 | POST | `/requisitions/{id}/convert-to-po` | ❌ | `procurement:convert_pr` |
| 19 | DELETE | `/requisitions/{id}` | ❌ | `procurement:delete` |
| 20 | GET | `/stats` | ❌ | `procurement:view_stats` |

---

## 2. Giải pháp (Solution)

### 2.1 Actions mới (5 actions)

Nâng từ **6 → 11 actions**:

| # | Action Code | Label (VI) | Tooltip | Mới? |
|:--|:---|:---|:---|:---:|
| 1 | `view` | Xem | Cho phép xem danh sách NCC, PO, PR | Có sẵn |
| 2 | `create` | Tạo | Cho phép tạo NCC, PO, PR mới | Có sẵn |
| 3 | `edit` | Sửa | Cho phép sửa NCC, PO, PR | Có sẵn |
| 4 | `delete` | Xóa | Cho phép xóa NCC, PO, PR | Có sẵn |
| 5 | `approve_po` | Duyệt PO | Cho phép duyệt/thay đổi trạng thái đơn mua hàng | Có sẵn |
| 6 | `record_payment` | Thanh toán | Cho phép ghi nhận thanh toán cho đơn mua hàng | Có sẵn |
| 7 | `receive_goods` | Nhận hàng | Cho phép xác nhận nhận hàng và tạo phiếu nhập kho tự động | **MỚI** |
| 8 | `approve_pr` | Duyệt YCMH | Cho phép duyệt yêu cầu mua hàng (PR: PENDING → APPROVED) | **MỚI** |
| 9 | `reject_pr` | Từ chối YCMH | Cho phép từ chối yêu cầu mua hàng (PR: PENDING → REJECTED) | **MỚI** |
| 10 | `convert_pr` | Chuyển PR→PO | Cho phép chuyển đổi yêu cầu mua hàng thành đơn mua hàng | **MỚI** |
| 11 | `view_stats` | Xem thống kê | Cho phép xem báo cáo thống kê mua hàng tổng hợp | **MỚI** |

### 2.2 Role-Based Permission Matrix

| Action | super_admin | admin | manager | chef | staff | accountant |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| `view` | ✅ | ✅ | ✅ | ✅ | ⬜ | ✅ |
| `create` | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ |
| `edit` | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ |
| `delete` | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `approve_po` | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ |
| `record_payment` | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ✅ |
| `receive_goods` | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| `approve_pr` | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ |
| `reject_pr` | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ |
| `convert_pr` | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ |
| `view_stats` | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ |

> **Rationale**: 
> - `chef` chỉ xem + nhận hàng (kiểm tra chất lượng nguyên liệu khi giao)
> - `accountant` chỉ xem + thanh toán + thống kê (kiểm soát tài chính)
> - `delete` chỉ admin — tránh mất dữ liệu

### 2.3 Segregation of Duties (SoD Rules) — 3 rules

| # | Action A | Action B | Lý do |
|:--|:---|:---|:---|
| 1 | `procurement:create` | `procurement:approve_po` | ⚠️ Người tạo PO tự duyệt → conflict of interest |
| 2 | `procurement:approve_po` | `procurement:record_payment` | ⚠️ Người duyệt PO tự thanh toán → thiếu kiểm soát tài chính |
| 3 | `procurement:approve_pr` | `procurement:convert_pr` | ⚠️ Người duyệt PR tự chuyển PO → cần kiểm soát chéo |

### 2.4 Permission Presets — 4 presets

| # | Icon | Label | Description | Actions |
|:--|:---:|:---|:---|:---|
| 1 | 🛒 | Quản lý mua hàng | Toàn quyền: CRUD NCC, PO, PR, duyệt, thanh toán, thống kê | tất cả 11 actions |
| 2 | 📋 | Nhân viên mua hàng | Tạo PO/PR, nhận hàng (không duyệt, không thanh toán) | `view, create, edit, receive_goods` |
| 3 | 💰 | Kế toán mua hàng | Xem, thanh toán, thống kê (không tạo/sửa/xóa) | `view, record_payment, view_stats` |
| 4 | 🍳 | Bếp nhận hàng | Xem và xác nhận nhận hàng | `view, receive_goods` |

---

## 3. Implementation

### 3.1 Frontend — permission-matrix-tab.tsx

1. **PERMISSION_MODULES** (line 95): Thêm 5 actions mới
2. **ACTION_LABELS**: Thêm 5 labels mới
3. **ACTION_TOOLTIPS**: Thêm 5 tooltips mới
4. **SOD_RULES**: Thêm 3 SoD rules
5. **PERMISSION_PRESETS**: Thêm 4 presets

### 3.2 Backend — http_router.py

1. **Import**: `from backend.core.auth.permissions import require_permission`
2. **20 endpoints**: `dependencies=[Depends(require_permission("procurement", "<action>"))]`

### 3.3 Docs — permission-matrix.md

Update Section 3.6 với đầy đủ action codes, SoD rules, và presets

---

## 4. Risk Assessment

| Risk | Severity | Mitigation |
|:---|:---:|:---|
| Cross-module: PO receive triggers inventory import | MEDIUM | `receive_goods` action là đủ — inventory service call nội bộ |
| Cross-module: PO paid triggers finance journal | MEDIUM | `record_payment` action bao gồm cả finance integration |
| Chef không tạo PR được | LOW | Chef có thể yêu cầu manager tạo PR |

## 5. Effort Estimation

| Hạng mục | Effort |
|:---|:---|
| Frontend (5 actions + labels + tooltips + SoD + presets) | ~30 phút |
| Backend (20 endpoint guards) | ~30 phút |
| Docs + Verify | ~15 phút |
| **Tổng** | **~1.5 giờ** |
