# PRD: Phân tích Tích hợp Module Nhà cung cấp vào Module Mua hàng

## 1. Tóm tắt Vấn đề

Hiện tại hệ thống Ẩm Thực Giao Tuyết ERP có **2 điểm truy cập nhà cung cấp** cùng tồn tại:

| # | Điểm truy cập | Route | File | Kích thước |
|---|---|---|---|---|
| 1 | **Standalone Supplier page** | `/suppliers` | `suppliers/page.tsx` | 1104 lines (61KB) |
| 2 | **Procurement Suppliers tab** | `/procurement` → Tab NCC | `procurement/page.tsx` | 1103 lines (73KB, shared) |

Cả hai đều gọi cùng API backend (`/procurement/suppliers/*`) và sử dụng cùng `SupplierModel` trong `procurement/domain/models.py`.

> [!WARNING]
> **Vấn đề hiện tại**: Có sự **trùng lặp chức năng** giữa 2 trang, gây nhầm lẫn cho người dùng khi sidebar có 2 entry riêng biệt ("Mua hàng" và "Nhà cung cấp") nhưng data giống nhau.

---

## 2. Nghiên cứu Best Practices (18+ nguồn)

### 2.1 Kết luận từ nghiên cứu

| Nguồn | Quan điểm |
|---|---|
| **SAP S/4HANA** | Supplier Master = sub-module của Procurement |
| **Oracle ERP Cloud** | Vendor Management nằm trong Procurement Suite |
| **NetSuite ERP** | Supplier Records tích hợp trực tiếp vào Purchase Module |
| **Odoo ERP** | Contacts (Supplier) là master data, Procurement module reference |
| **Tipalti, Precoro** | Vendor Management = phần của Procure-to-Pay flow |

**Kết luận nghiên cứu (HIGH CONFIDENCE - ≥3 sources)**:

> ✅ **Supplier Management nên là SUB-MODULE của Procurement**, không phải module độc lập. Lý do:
> - Centralized data → Single source of truth
> - Streamlined workflows → PR → PO → Receive → Pay
> - Better vendor performance tracking
> - Reduced UX confusion

### 2.2 Khi nào KHÔNG nên gộp?

Chỉ khi doanh nghiệp có:
- Supplier Relationship Management (SRM) phức tạp (scoring, bidding, contracts)
- Dedicated Procurement team riêng biệt với Vendor Management team
- >500 suppliers cần quản lý

> **Đánh giá cho Giao Tuyết**: Doanh nghiệp catering với ~3-50 NCC → **KHÔNG đủ phức tạp** để tách riêng.

---

## 3. Phân tích 5-Dimension (5D Assessment)

### 3.1 UX (User Experience) — Impact: ⬆️ HIGH

| Tiêu chí | Hiện tại | Đề xuất |
|---|---|---|
| **Navigation** | 2 sidebar entries → confusing | 1 entry "Mua hàng" → clear |
| **Mental Model** | "Tôi vào đâu để quản lý NCC?" | "Vào Mua hàng → Tab NCC" |
| **Task Flow** | PR → chọn NCC → phải mở trang khác | PR → chọn NCC ngay trong Procurement |
| **Learning Curve** | 2 pages cùng chức năng | 1 page, consistent |

**Kết luận UX**: Gộp giúp giảm cognitive load, user không phải nhớ 2 nơi quản lý NCC.

### 3.2 UI (User Interface) — Impact: ⬆️ HIGH

| So sánh | Standalone `/suppliers` | Procurement Tab NCC |
|---|---|---|
| **Stats Cards** | 4 cards (Tổng, HĐ, Ngừng, Công nợ) | Hiển thị trong header chung |
| **List View** | Full list + filter + search | Lightweight list |
| **Detail View** | Chi tiết NCC + PO history | Không có |
| **CRUD** | Full (Create/Edit/Delete/Bulk) | Có (Create/Edit/Delete) |
| **Supplier Detail** | Click → `/suppliers/[id]` | Không có detail page |

**Gap Analysis**: Procurement tab thiếu Supplier Detail view (PO history, balance, stats). Standalone page có feature giàu hơn.

### 3.3 FE (Frontend) — Impact: ⬆️ HIGH

```
Frontend Structure hiện tại:
├── suppliers/
│   └── page.tsx (1104 lines) ← FULL-FEATURED, standalone
├── procurement/
│   ├── page.tsx (1103 lines) ← Has embedded Suppliers tab  
│   └── [id]/page.tsx           ← PO detail only
└── hooks/
    └── use-procurement.ts      ← useSuppliers() shared hook
```

**Code Overlap Analysis**:

| Feature | `suppliers/page.tsx` | `procurement/page.tsx` |
|---|---|---|
| `useQuery(['suppliers'])` | ✅ Trực tiếp | ✅ Via `useSuppliers()` |
| Create Supplier | ✅ Modal | ✅ Modal |
| Edit Supplier | ✅ Modal | ✅ Modal |
| Delete Supplier | ✅ Dialog | ✅ Dialog |
| Bulk Delete | ✅ | ❌ |
| Search/Filter | ✅ Server-side | ✅ Client-side |
| Supplier Detail | ✅ (PO history, stats, balance) | ❌ |
| Date format `dd/MM/yyyy` | ✅ | ✅ |

> **~60% code overlap** giữa 2 trang cho phần Supplier CRUD.

### 3.4 BE (Backend) — Impact: ⬇️ LOW

Backend **đã được gộp sẵn**:

```
backend/modules/procurement/
├── domain/
│   ├── models.py      ← SupplierModel + PurchaseOrderModel + PRModel
│   └── entities.py    ← Supplier + PO + PR Pydantic schemas
└── infrastructure/
    └── http_router.py ← ALL endpoints: /suppliers/*, /orders/*, /requisitions/*
```

- `SupplierModel` lives in `procurement/domain/models.py` (line 77-100)
- `PurchaseOrderModel` has FK to `suppliers.id` (line 107)
- All supplier APIs: `/procurement/suppliers/*` (7 endpoints)

> **Không cần thay đổi backend** — đã tích hợp sẵn.

### 3.5 DA (Data Architecture) — Impact: ⬇️ LOW

```sql
-- Đã tồn tại trong cùng schema
suppliers (id, tenant_id, name, ..., balance)
    ↑ FK
purchase_orders (id, supplier_id, ...)
    ↑ FK  
purchase_order_items (id, purchase_order_id, item_id → inventory_items)
```

> **Không cần migration** — data model đã tích hợp.

---

## 4. Kết luận & Khuyến nghị

### ✅ **KHUYẾN NGHỊ: TÍCH HỢP (MERGE) Module Nhà cung cấp vào Module Mua hàng**

| Dimension | Decision | Effort |
|---|---|---|
| **UX** | ✅ Merge → giảm confusion | Low |
| **UI** | ✅ Nâng cấp Procurement Suppliers tab | Medium |
| **FE** | ✅ Xóa standalone page, nâng cấp tab | Medium |
| **BE** | ⚪ Không thay đổi (đã merged) | None |
| **DA** | ⚪ Không thay đổi (đã merged) | None |

**Justification Matrix:**

```
Pro Merge (7 points):
  ✅ Industry standard (SAP, NetSuite, Oracle, Odoo)
  ✅ Backend đã tích hợp sẵn
  ✅ Data model đã liên kết (FK)
  ✅ Reduce code duplication (~60%)
  ✅ Reduce sidebar clutter (14 items → 13)
  ✅ Single source of truth cho user
  ✅ Consistent UX flow (PR → PO → NCC cùng 1 nơi)

Con Merge (2 points):
  ⚠️ Procurement page sẽ lớn hơn (cần refactor)
  ⚠️ Supplier Detail view cần migrate vào Procurement
```

**Score: 7-2 → MERGE.**

---

## 5. Kế hoạch Triển khai (Phased)

### Phase 1: Nâng cấp Procurement Suppliers Tab

**Mục tiêu**: Suppliers tab trong Procurement phải có đầy đủ tính năng như standalone page.

#### [MODIFY] [page.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/procurement/page.tsx)
- Nâng cấp Suppliers tab: thêm Supplier Detail Drawer (PO history, financial stats, balance)
- Thêm Bulk Delete cho suppliers
- Thêm server-side search/filter (sử dụng backend params đã hỗ trợ)
- Thêm Stats Cards riêng cho suppliers tab

#### [NEW] [supplier-detail-drawer.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/procurement/components/supplier-detail-drawer.tsx)
- Drawer component hiển thị chi tiết NCC
- PO history table
- Financial stats (tổng mua, đã thanh toán, công nợ)

---

### Phase 2: Xóa Standalone Supplier Module

#### [DELETE] [suppliers/page.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/suppliers/page.tsx)
- Xóa toàn bộ standalone supplier page

#### [MODIFY] [sidebar.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/components/layout/sidebar.tsx)
- Xóa sidebar entry `{ name: 'Nhà cung cấp', href: '/suppliers', icon: IconBuilding }` (line 31)

#### [NEW] [suppliers/page.tsx - redirect](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/suppliers/page.tsx)
- Tạo redirect từ `/suppliers` → `/procurement?tab=suppliers` (backward compatibility)

---

## 6. Verification Plan

### Browser Test
1. Truy cập `http://localhost:4500/procurement` → Click tab "Nhà cung cấp"
2. Verify: Hiển thị đầy đủ list NCC với search, filter, stats cards
3. Click một NCC → Verify: Detail drawer mở với PO history
4. Tạo/Sửa/Xóa NCC → Verify: CRUD hoạt động
5. Truy cập `http://localhost:4500/suppliers` → Verify: Redirect về procurement
6. Sidebar chỉ có 1 entry "Mua hàng", không có "Nhà cung cấp"

### Cross-module Test  
1. Finance → Accounts Payable → Verify: Vẫn hiển thị NCC từ procurement API
2. Inventory → Low Stock → Auto-PR → Verify: Chọn NCC vẫn hoạt động

---

## 7. Rủi ro & Mitigation

| Rủi ro | Xác suất | Mitigation |
|---|---|---|
| User đã bookmark `/suppliers` | Medium | Phase 2: redirect |
| Procurement page quá lớn | Medium | Refactor thành component files |
| Mất features khi merge | Low | Checklist parity check |
