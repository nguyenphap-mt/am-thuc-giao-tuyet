# PRD: Cải Tiến Module Kho Hàng (Inventory Enhancement)
## Ẩm Thực Giao Tuyết Catering ERP

**Version**: 2.0  
**Date**: 2026-02-08  
**Author**: AI Workforce (Hybrid Research-Reflexion v1.0)  
**Status**: Auto-Approved  
**Previous Audit Grade**: B (78/100)  
**Target Grade**: A (90+/100)

---

## 1. Tổng Quan

Module Kho hàng hiện tại có backend robust (30+ endpoints, FIFO, Auto-Reorder), nhưng frontend chỉ có 1 file monolithic 567 dòng, thiếu nhiều chức năng quan trọng. PRD này tập trung vào **cải tiến UX/UI và bổ sung features thiếu** để nâng grade từ B lên A.

### Research Sources
- 3 web searches: inventory management best practices 2024-2025, catering food service UI/UX, dashboard analytics design
- Existing KI: `overview.md`, `business_flows.md`, `audit_report_20260204.md`
- Codebase: 840-line backend router, 567-line frontend page

---

## 2. Gap Analysis (Từ Audit + Research)

| Gap ID | Mô tả | Severity | Category |
|:------:|:-------|:--------:|:--------:|
| **FE-01** | `page.tsx` monolithic (567 dòng) → cần tách component | HIGH | FE |
| **FE-02** | Nút "Thêm mới" không hoạt động (không có modal/form) | CRITICAL | UX |
| **FE-03** | Không có form Edit item | CRITICAL | UX |
| **FE-04** | Không có Analytics tab (KPI dashboard) | HIGH | UX |
| **FE-05** | Không có Pagination cho Items/Transactions | HIGH | UX |
| **FE-06** | Không có Export data (CSV/Excel) | MEDIUM | UX |
| **FE-07** | Không có inline Stock Adjustment (quick import/export) | HIGH | UX |
| **FE-08** | Item detail page chưa có | MEDIUM | UX |
| **FE-09** | Alerts tab thiếu auto-reorder action thực sự | MEDIUM | UX |
| **BE-01** | Stats endpoint hardcode `stock < 10` thay vì dùng `min_stock` | LOW | BE |
| **DA-01** | Thiếu unique constraint trên `inventory_stock(item_id, warehouse_id)` | MEDIUM | DA |

---

## 3. Implementation Phases

### Phase 1: Core CRUD & Forms (CRITICAL)
**Mục tiêu**: Users có thể thực sự CRUD items

1. **Create Item Modal**: Form với fields: name, SKU, category, unit, min_stock, cost_price
2. **Edit Item Modal**: Pre-filled form, update via PUT `/inventory/items/{id}`
3. **Quick Stock Adjustment Modal**: IMPORT/EXPORT nhanh từ item row
4. **Tách `use-inventory.ts` hooks**: React Query hooks cho tất cả endpoints

### Phase 2: Analytics Dashboard & KPI Cards
**Mục tiêu**: Visual analytics cho operational insights

1. **Enhanced Stats Cards**: Dùng backend `/stats` endpoint + enriched data
2. **Analytics Tab**: Stock distribution chart, Category breakdown, Movement timeline
3. **Expiry Timeline**: Visual calendar cho lots sắp hết hạn
4. **Stock Value Trends**: Line chart theo category

### Phase 3: UX Polish & Advanced Features
**Mục tiêu**: Professional-grade UX

1. **Pagination**: Server-side cho Items và Transactions (limit/offset)
2. **Category Filter Chips**: Filter bar cho Items tab
3. **Export CSV**: Download items list, transactions
4. **Auto-Reorder Action**: Nút thực sự gọi POST `/low-stock/auto-reorder`
5. **Transaction Filters**: Filter by type (IMPORT/EXPORT), date range

---

## 4. Technical Specifications

### 4.1 Frontend Architecture (Refactored)

```
frontend/src/
├── hooks/
│   └── use-inventory.ts           # [NEW] React Query hooks
├── app/(dashboard)/inventory/
│   ├── page.tsx                   # [REWRITE] Main page, tabs only
│   └── components/               # [NEW] Directory
│       (inline in page.tsx)       # Components defined within page
```

### 4.2 Hooks (`use-inventory.ts`)

```typescript
// 13 hooks
useInventoryItems(search, category)
useInventoryStats()
useInventoryTransactions(itemId?, limit?)
useInventoryLots(itemId?, status?)
useLowStockAlerts()
useExpiringLots(days?)
useCreateItem()
useUpdateItem()
useDeleteItem()
useCreateTransaction()      // IMPORT/EXPORT
useReverseTransaction()
useAutoReorder()
useInventoryAlertsSummary()
```

### 4.3 Backend Enhancements

```python
# Fix BE-01: Stats endpoint should use actual min_stock
# Current: stock < 10 (hardcoded)
# Fix: stock < min_stock (dynamic)

# No new endpoints needed - all exist already
```

### 4.4 UI Components in Page

| Component | Mô tả |
|:----------|:-------|
| **Stats Cards Row** | 5 KPIs: Total, In-Stock, Low, Out, Value |
| **Items Tab** | Gmail-style list + search + category filter + pagination |
| **Transactions Tab** | Filtered list (type, date) + reverse action |
| **Lots Tab** | FIFO list + expiry badges |
| **Alerts Tab** | Low stock items + auto-reorder button |
| **Analytics Tab** | Charts: stock distribution, category, movements |
| **Create/Edit Modal** | Shared form component for item CRUD |
| **Stock Adjust Modal** | Quick IMPORT/EXPORT with quantity + notes |

---

## 5. UI/UX Design Specifications

### Design System Compliance
- Light mode default (`#ffffff` bg, `#fafafa` cards)
- Gradient primary buttons (`#c2185b → #7b1fa2 → #512da8`)
- Material Icons Filled
- Skeleton loading (not spinners)
- `dd/MM/yyyy` date format, VND currency

### Stats Cards Design
```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐
│ 📦 124  │ │ ✅ 92   │ │ ⚠️ 18   │ │ ❌ 14   │ │ 💰 2.5B  │
│ Tổng SP │ │ Đủ hàng │ │ Sắp hết │ │ Hết hàng│ │ Giá trị  │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └──────────┘
```

### Tab Layout
```
[ 🏷️ Sản phẩm ] [ 📊 Phân tích ] [ 📋 Giao dịch ] [ 📦 Lots ] [ 🔔 Cảnh báo ]
```

### Create Item Modal Fields
| Field | Type | Required | Validation |
|:------|:-----|:--------:|:-----------|
| Tên sản phẩm | text | ✅ | max 255 chars |
| Mã SKU | text | ✅ | unique, max 50 |
| Danh mục | select | ❌ | from existing categories |
| Đơn vị tính | text | ✅ | kg, lít, cái, hộp... |
| Tồn kho tối thiểu | number | ❌ | ≥ 0 |
| Giá vốn | number | ❌ | ≥ 0 |

---

## 6. Acceptance Criteria

### Phase 1
- [ ] "Thêm mới" button opens modal, form saves to DB
- [ ] Edit item from hover action, pre-filled form works
- [ ] Quick stock adjust: user can IMPORT/EXPORT with notes
- [ ] All hooks in `use-inventory.ts` functional

### Phase 2
- [ ] Analytics tab shows at least 2 chart visualizations
- [ ] Stats cards show real-time data from backend
- [ ] Expiry lots displayed with color-coded badges

### Phase 3
- [ ] Pagination loads items in pages of 50
- [ ] Category filter chips work with backend query params
- [ ] CSV export downloads for items list
- [ ] Auto-reorder button triggers PR creation with toast feedback
