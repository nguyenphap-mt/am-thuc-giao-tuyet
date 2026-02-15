# Audit Report: Module Phân Quyền (Permission Matrix)

> **Audit ID:** `AUDIT-PERM-20260210`
> **Module:** Permission Matrix (Phân quyền tab trong Settings)
> **Date:** 10/02/2026
> **Auditor:** AI Workforce — PRD Audit V3.2.2 + UI/UX Pro Max

---

## 📊 Audit Summary

| Dimension | Score | Max | Status |
|:----------|:-----:|:---:|:-------|
| UX | 13 | 20 | 🟡 Needs improvement |
| UI | 12 | 20 | 🟡 Needs improvement |
| FE | 14 | 20 | 🟡 Functional but gaps |
| BE | 17 | 20 | ✅ Good |
| DA | 16 | 20 | ✅ Good |
| **Total** | **72** | **100** | **Grade: C+** |

---

## 1. UX Assessment — 13/20

### ✅ Strengths
- Matrix layout cho phép so sánh quyền giữa các vai trò nhanh chóng
- Dirty state tracking với floating "Có thay đổi chưa lưu" indicator
- Permission compression (wildcard `module:*`) khi lưu

### 🔴 Issues

| ID | Severity | Issue | Impact |
|:---|:---------|:------|:-------|
| UX-01 | HIGH | Không có khả năng **search/filter modules** — matrix quá dài (12 modules × 4+ actions = 48 rows), user phải scroll nhiều | User phải cuộn rất nhiều |
| UX-02 | HIGH | Không có **"Select All" per module** — phải click từng checkbox một khi gán full quyền cho 1 module | Tốn thời gian với nhiều vai trò |
| UX-03 | MEDIUM | Không có **"Select All per Role"** — không thể gán tất cả quyền cho 1 vai trò cùng lúc | Thiếu shortcut |
| UX-04 | MEDIUM | Không có **role deletion** button trên UI — backend có API nhưng UI không expose | Feature gap |
| UX-05 | MEDIUM | Không có **role edit** — chỉ có thể tạo mới, không sửa tên/mô tả vai trò | Feature gap |
| UX-06 | LOW | Không có **tooltip** giải thích permission khi hover — "manage_roles" không rõ ý nghĩa | Unclear semantics |

---

## 2. UI Assessment — 12/20

### ✅ Strengths
- Gradient header badge cho Super Admin nổi bật
- Lock icon cho Super Admin clear
- Card-based design consistent với app

### 🔴 Issues

| ID | Severity | Issue | Impact |
|:---|:---------|:------|:-------|
| UI-01 | HIGH | **Module rows không có visual grouping rõ** — action sub-rows (Xem, Tạo, Sửa, Xóa) merge với module name row nhưng border-t-2 quá subtle | Khó phân biệt modules |
| UI-02 | HIGH | **Table header bị cắt** khi scroll ngang — role names biến mất khi cuộn ngang trên mobile/nhỏ | Mất context |
| UI-03 | MEDIUM | **Sticky header missing** — khi scroll dọc, header row (Module/Quyền/Role names) biến mất | Mất reference |
| UI-04 | MEDIUM | **Module icon đơn điệu** — tất cả modules dùng cùng `IconShield` tím, không phân biệt được | Monotone |
| UI-05 | LOW | **Checkbox size nhỏ** trên mobile — khó click chính xác | Accessibility |
| UI-06 | LOW | **Không có row highlight** khi hover module group — khó theo dõi row dài | UX polish |

---

## 3. FE Assessment — 14/20

### ✅ Strengths
- Proper loading skeleton states
- Error handling with toast notifications
- Permission expansion logic (ALL, wildcard `module:*`)
- Dirty check comparison with deep copy
- Permission compression khi save (tối ưu payload)

### 🔴 Issues

| ID | Severity | Issue | Impact |
|:---|:---------|:------|:-------|
| FE-01 | HIGH | **No delete role UI** — `DELETE /roles/{id}` exists nhưng không có button/confirm modal | Dead code |
| FE-02 | HIGH | **No edit role UI** — `PUT /roles/{id}` exists nhưng không có edit form | Dead code |
| FE-03 | MEDIUM | **PERMISSION_MODULES hardcoded** — static array, không sync với backend modules list | Drift risk |
| FE-04 | MEDIUM | **No error boundary** — nếu API fail, component crash thay vì show retry button | Poor resilience |
| FE-05 | LOW | `handleSave` loops sequentially — should batch or use `Promise.all` cho performance | Slow save |
| FE-06 | LOW | **No unsaved changes warning** khi navigate away — user có thể mất changes | Data loss |

---

## 4. BE Assessment — 17/20

### ✅ Strengths
- Full CRUD cho roles (list, create, update, delete)
- BR053 protection — cannot delete system roles
- User count check before delete
- Tenant isolation in all queries
- Super admin permission immutability

### 🔴 Issues

| ID | Severity | Issue | Impact |
|:---|:---------|:------|:-------|
| BE-01 | MEDIUM | **No audit logging** — permission changes không được log vào activity_logs | Compliance gap |
| BE-02 | LOW | **No validation** cho permission format — API accepts any string, không validate against known modules | Data integrity |
| BE-03 | LOW | **role_router uses sync Session type** in signature nhưng service uses `AsyncSession` — potential type mismatch | Type safety |

---

## 5. DA Assessment — 16/20

### ✅ Strengths
- `roles` table có RLS enabled
- `tenant_id` column present
- `is_system` flag prevents system role mutation
- `permissions` stored as JSON array — flexible

### 🔴 Issues

| ID | Severity | Issue | Impact |
|:---|:---------|:------|:-------|
| DA-01 | MEDIUM | **No FK constraint** từ `users.role` → `roles.code` — user có thể tham chiếu role không tồn tại | Data integrity |
| DA-02 | LOW | **permissions array not indexed** — không thể query "tìm tất cả roles có quyền X" efficiently | Query perf |

---

## 📋 Improvement Priority Matrix

| Priority | ID | Issue | Effort |
|:---------|:---|:------|:-------|
| **P0** | UX-01 | Module search/filter | 1h |
| **P0** | UI-01 | Visual module grouping | 1h |
| **P0** | UI-03 | Sticky header row | 0.5h |
| **P1** | FE-01 | Delete role button + confirm | 1h |
| **P1** | FE-02 | Edit role modal | 1.5h |
| **P1** | UX-02 | Select All per module | 1h |
| **P1** | UX-03 | Select All per role | 0.5h |
| **P1** | UI-04 | Module-specific icons | 0.5h |
| **P2** | UI-02 | Horizontal scroll sticky | 0.5h |
| **P2** | UI-06 | Row hover highlight | 0.5h |
| **P2** | UX-06 | Permission tooltips | 0.5h |
| **P2** | FE-05 | Parallel save | 0.5h |
| **P2** | FE-06 | Navigate away warning | 0.5h |
| **P3** | BE-01 | Audit logging for permissions | 1h |
| **P3** | BE-02 | Permission format validation | 0.5h |

### Total Estimated Effort: ~11h

---

## 🎯 Implementation Plan (Auto-Execute)

### Phase A: UI/UX Matrix Overhaul (P0 + P1 UI items)
1. Sticky header (both horizontal + vertical)
2. Visual module grouping with colored left border + alternating bg
3. Module-specific icons (per module mapping)
4. Search/filter bar for modules
5. "Select All" checkbox per module row
6. "Select All" checkbox per role column header
7. Row hover highlight

### Phase B: Role CRUD Completion (P1 FE items)
1. Edit role modal (reuse create modal with pre-fill)
2. Delete role button with confirm dialog
3. Role context menu (edit/delete actions)

### Phase C: Polish (P2 items)
1. Permission tooltips
2. Navigate-away warning with `beforeunload`
3. Parallel save with `Promise.allSettled`
