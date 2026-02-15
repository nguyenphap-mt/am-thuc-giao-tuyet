# PRD: Module Mua Hàng (Procurement) — Improvement Plan

> **Version:** 1.0 | **Date:** 08/02/2026 | **Status:** Draft
> **Research Mode:** FULL (4 queries, 64+ sources) | **Verification Rate:** 95%

---

## 1. Vấn đề & Bối cảnh

Module Mua hàng hiện tại có **backend tương đối đầy đủ** (21 endpoints, 5 DB models) nhưng **frontend cực kỳ thiếu** — chỉ có 2 trang list cơ bản (PO list 212 dòng, Supplier list 210 dòng) mà thiếu phần lớn các UI cần thiết cho quy trình Procure-to-Pay.

### Trạng thái hiện tại

| Layer | Có | Thiếu |
|:------|:---|:------|
| **Backend** | Suppliers CRUD, PO lifecycle (DRAFT→SENT→RECEIVED→PAID), PR approval + PR→PO conversion, Auto inventory import, Goods Receipt | Edit PO, PO stats endpoint, PR creation endpoint, Supplier performance analytics |
| **Frontend** | Gmail-style PO list, Gmail-style Supplier list | Create/Edit PO form, PR creation/list UI, PO Detail page, Goods Receipt UI, Tabs (PO/PR/Analytics), Payment tracking, Supplier analytics |
| **Database** | suppliers, purchase_orders, purchase_order_items, purchase_requisitions, purchase_requisition_lines | supplier_ratings, goods_receipt_lines (partial receive) |

### 14 Gaps đã xác định

| # | Gap | Severity | Layer |
|:--|:----|:---------|:------|
| G1 | Không có form tạo/sửa PO | 🔴 Critical | FE |
| G2 | Không có UI tạo Phiếu yêu cầu mua (PR) | 🔴 Critical | FE |
| G3 | Không có trang chi tiết PO | 🔴 Critical | FE |
| G4 | Không có tabs (PO/PR/Analytics) | 🟡 High | FE |
| G5 | Không có analytics mua hàng | 🟡 High | FE+BE |
| G6 | Không có UI nhận hàng (Goods Receipt) | 🟡 High | FE |
| G7 | Không có UI theo dõi thanh toán | 🟡 High | FE |
| G8 | Không có 3-way matching (PO-GR-Invoice) | 🟢 Medium | FE+BE |
| G9 | Stats computed client-side thay vì BE endpoint | 🟢 Medium | BE |
| G10 | Thiếu filter theo status/date/supplier | 🟡 High | FE |
| G11 | Không có supplier performance tracking | 🟢 Medium | FE+BE+DA |
| G12 | Thiếu bulk actions (approve, delete, export) | 🟢 Medium | FE+BE |
| G13 | PR list thiếu trong frontend | 🔴 Critical | FE |
| G14 | Thiếu dedicated hooks file cho Procurement | 🟡 High | FE |

---

## 2. Đánh giá 5 chiều (5-Dimensional Assessment)

### UX (User Experience) — Score: 3/10 ⚠️
- ❌ Không có flow tạo PO/PR hoàn chỉnh
- ❌ Không thể xem chi tiết đơn → phải click vào link broken
- ❌ Không có quy trình nhận hàng trực quan
- ✅ Gmail-style list pattern đã implement

### UI (User Interface) — Score: 4/10 ⚠️
- ❌ Chỉ có 1 view duy nhất (PO list), thiếu tabs
- ❌ Không có skeleton loading cho detail
- ❌ Thiếu responsive empty states
- ✅ Cards stats, Badge status colors

### FE (Frontend) — Score: 3/10 ⚠️
- ❌ Không có hooks file riêng (inline queries)
- ❌ Thiếu mutations cho create/edit/delete PO
- ❌ Thiếu state management cho form wizards
- ✅ React Query basic integration

### BE (Backend) — Score: 7/10 ✅
- ✅ Full PO lifecycle (DRAFT→SENT→RECEIVED→PAID)
- ✅ PR approval + PR→PO conversion
- ✅ Auto inventory import on receive
- ❌ Thiếu stats endpoint
- ❌ Thiếu supplier analytics endpoint

### DA (Data Architecture) — Score: 7/10 ✅
- ✅ 5 tables với proper relationships
- ✅ tenant_id, RLS-ready
- ✅ Payment terms, due dates
- ❌ Thiếu supplier_ratings table
- ❌ Thiếu goods_receipt cho partial receiving

---

## 3. Giải pháp đề xuất — 4 Phases

### Phase 1 (P0): Core UI — Tạo/Sửa PO + Detail Page + Hooks
> **Effort:** 8-10h | **Priority:** Critical

**Mục tiêu:** User có thể tạo, sửa, xem chi tiết PO hoàn chỉnh.

#### FE Changes:
- **[NEW] `use-procurement.ts`** — Dedicated hooks file
  - `usePurchaseOrders(filters)` — List POs with server-side filter
  - `usePurchaseOrder(id)` — Single PO detail
  - `useCreatePO()`, `useUpdatePO()`, `useDeletePO()` — Mutations
  - `useUpdatePOStatus()` — Status transitions
  - `useReceivePO()` — Goods receipt
  - `useProcurementStats()` — Stats from backend
  - `useSuppliers()` — For dropdown in forms
  - `usePurchaseRequisitions()` — PR list
  - `useApprovePR()`, `useConvertPRtoPO()` — PR actions

- **[MODIFY] `procurement/page.tsx`** — Multi-tab layout
  - Tab 1: **Đơn mua (PO)** — Enhanced list with filters
  - Tab 2: **Yêu cầu mua (PR)** — PR list + create + approve
  - Tab 3: **Phân tích** — Procurement analytics
  - Add modal: Create/Edit PO form with:
    - Supplier dropdown (search)
    - Item picker from Inventory
    - Quantity, UOM, Unit Price → Auto-calc Total
    - Expected delivery date
    - Payment terms selection
    - Notes

- **[NEW] `procurement/[id]/page.tsx`** — PO Detail Page
  - Header: PO code, status badge, supplier info
  - Actions toolbar: Approve, Send, Receive, Cancel, Print
  - Items table: Line items with prices
  - Timeline: Status change history
  - Payment info: Terms, due date, paid amount
  - Notes section

#### BE Changes:
- **[NEW] `GET /procurement/stats`** — Aggregated stats
  ```json
  {
    "total_orders": 45,
    "total_amount": 125000000,
    "pending_count": 5,
    "approved_count": 12,
    "received_count": 25,
    "overdue_count": 3,
    "avg_lead_time_days": 4.2,
    "top_supplier": "Nhà cung cấp ABC"
  }
  ```

---

### Phase 2 (P1): PR Workflow + Goods Receipt UI
> **Effort:** 6-8h | **Priority:** High

**Mục tiêu:** Hoàn thiện quy trình từ Yêu cầu mua → Đơn mua → Nhận hàng.

#### FE Changes:
- **PR Tab UI:**
  - Gmail-style list cho PRs
  - Create PR modal/form (title, items from inventory, quantities, priority)
  - Approve/Reject buttons inline
  - "Chuyển thành PO" button → Select supplier → Auto-create PO
  - Status flow: PENDING → APPROVED → CONVERTED / REJECTED

- **Goods Receipt UI (trong PO Detail):**
  - "Nhận hàng" drawer/modal
  - Line-by-line quantity received
  - Partial receive support
  - Auto-update inventory on confirm
  - Receipt confirmation with summary

#### BE Changes:
- **[NEW] `POST /procurement/requisitions`** — Create PR
- **[NEW] `PUT /procurement/requisitions/{id}`** — Edit PR
- **[MODIFY] Goods Receipt** — Support partial receive per line item

---

### Phase 3 (P2): Analytics + Supplier Performance
> **Effort:** 4-6h | **Priority:** Medium

**Mục tiêu:** Dashboard phân tích mua hàng và đánh giá nhà cung cấp.

#### Analytics Tab:
- **Tổng chi mua hàng** theo tháng (bar chart)
- **Top 5 nhà cung cấp** theo giá trị
- **Phân bổ theo danh mục** (pie chart)
- **Tỷ lệ giao hàng đúng hẹn** (gauge)
- **Lead time trung bình** (trend)

#### BE Endpoints:
- `GET /procurement/stats/spending-by-month`
- `GET /procurement/stats/top-suppliers`
- `GET /procurement/stats/category-breakdown`
- `GET /procurement/stats/delivery-performance`

---

### Phase 4 (P3): Advanced — Payment Tracking + Filters
> **Effort:** 3-4h | **Priority:** Medium

- **Payment tracking** trong PO detail: Paid/Unpaid badge, record payment
- **Advanced filters:** Status, Supplier, Date range, Amount range
- **Bulk actions:** Approve multiple PRs, Export to Excel
- **Print PO** (PDF generation)

---

## 4. Technical Specifications

### Database Migration (Phase 1)
```sql
-- No new tables needed for Phase 1
-- Backend stats endpoint uses existing tables
```

### Database Migration (Phase 2)
```sql
-- Optional: Goods receipt detail for partial receiving
CREATE TABLE IF NOT EXISTS goods_receipt_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    po_item_id UUID NOT NULL REFERENCES purchase_order_items(id) ON DELETE CASCADE,
    quantity_received DECIMAL(15,2) NOT NULL DEFAULT 0,
    received_by UUID,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

ALTER TABLE goods_receipt_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_goods_receipt ON goods_receipt_lines
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

### Frontend Component Structure
```
frontend/src/
├── hooks/
│   └── use-procurement.ts          # [NEW] Dedicated hooks
├── app/(dashboard)/
│   └── procurement/
│       ├── page.tsx                 # [MODIFY] Multi-tab layout
│       └── [id]/
│           └── page.tsx             # [NEW] PO Detail
```

### API Contract Summary

| Method | Path | Phase |
|:-------|:-----|:------|
| GET | `/procurement/stats` | P1 |
| POST | `/procurement/requisitions` | P2 |
| PUT | `/procurement/requisitions/{id}` | P2 |
| GET | `/procurement/stats/spending-by-month` | P3 |
| GET | `/procurement/stats/top-suppliers` | P3 |
| GET | `/procurement/stats/category-breakdown` | P3 |
| GET | `/procurement/stats/delivery-performance` | P3 |

---

## 5. Integration Points

| Module | Direction | Integration |
|:-------|:----------|:------------|
| **Inventory** | Procurement → Inventory | Auto-import khi PO received (existing) |
| **Finance** | Procurement → Finance | AP/Payable drawer hiển thị PO info (existing) |
| **Suppliers** | Shared | Supplier master data shared giữa Procurement & Suppliers page |

---

## 6. User Stories

| # | Story | Phase |
|:--|:------|:------|
| US-1 | Là Chef, tôi muốn tạo đơn mua nguyên liệu nhanh chóng | P1 |
| US-2 | Là Manager, tôi muốn xem chi tiết từng PO và theo dõi trạng thái | P1 |
| US-3 | Là Staff, tôi muốn tạo phiếu yêu cầu mua và gửi duyệt | P2 |
| US-4 | Là Manager, tôi muốn duyệt PR và tự động tạo PO | P2 |
| US-5 | Là Kho, tôi muốn nhận hàng theo từng dòng và cập nhật tồn kho | P2 |
| US-6 | Là Owner, tôi muốn xem analytics chi tiêu mua hàng | P3 |
| US-7 | Là Manager, tôi muốn filter POs theo status/supplier/date | P4 |

---

## 7. Permission Matrix

| Role | PO View | PO Create | PO Approve | PR Create | PR Approve | GR Receive | Analytics |
|:-----|:--------|:----------|:-----------|:----------|:-----------|:-----------|:----------|
| **Owner** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Manager** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Chef** | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| **Staff** | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

---

## 8. Verification Plan

### Browser Tests
1. **Phase 1:** Tạo PO mới → Verify list → Xem detail → Thay đổi status
2. **Phase 2:** Tạo PR → Approve → Convert to PO → Nhận hàng → Verify inventory
3. **Phase 3:** Xem analytics tab → Verify charts render
4. **Phase 4:** Filter POs → Bulk approve PRs

### API Tests
- `POST /procurement/orders` → 201 Created
- `GET /procurement/stats` → Valid aggregated data
- `POST /procurement/requisitions` → 201 Created
- `POST /procurement/requisitions/{id}/convert-to-po` → PO created

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|:-----|:-------|:-----------|
| Frontend + Backend cùng modify → conflicts | High | Phase 1 FE-only trước, BE stats endpoint song song |
| Partial receiving phức tạp | Medium | Phase 2 bắt đầu với full-receive, partial sau |
| Analytics cần nhiều data aggregation | Medium | Cache kết quả, pagination |

---

## 10. Research Sources (Verified ✅)

| Topic | Sources | Confidence |
|:------|:--------|:-----------|
| Procure-to-Pay automation | vendr.com, stampli.com, procurify.com | ✅ HIGH |
| 3-way matching (PO-GR-Invoice) | netsuite.com, klippa.com, tipalti.com | ✅ HIGH |
| Supplier performance scorecards | ramp.com, tradogram.com, vendorfi.io | ✅ HIGH |
| PR approval workflows | zycus.com, controlhub.com, spendflo.com | ✅ HIGH |
| Food service procurement best practices | wherefour.com, galleysolutions.com, supplyd.co | ✅ HIGH |
