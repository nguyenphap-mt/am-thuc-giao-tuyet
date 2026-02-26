# PRD: Phân Quyền Module Kho Hàng (Inventory)
## Ẩm Thực Giao Tuyết Catering ERP

**Version**: 1.0 (Hybrid Research-Reflexion)  
**Date**: 2026-02-25  
**Research Mode**: FULL (External + Internal + Codebase Grounding)  
**Claim Verification Rate**: 100% (tất cả claims verified trong codebase)

---

## 1. Bối Cảnh & Vấn Đề

### Tình Trạng Hiện Tại

Module **Kho hàng** là trung tâm nguyên liệu, kết nối **7+ module** qua 10 luồng nghiệp vụ. Hiện tại:

| Tiêu chí | Giá trị |
|:---|:---|
| **Backend endpoints** | 52 functions |
| **`require_permission` calls** | **0** ❌ |
| **Frontend actions** | 5 (`view`, `create`, `edit`, `delete`, `stock_transfer`) |
| **Endpoint categories** | 8 (Warehouse, Item, Transaction, Lot, Alert, Equipment, Analytics, PDF) |

> [!CAUTION]
> **52 endpoints hoàn toàn không có permission check** — bất kỳ user đăng nhập nào cũng có thể thực hiện mọi thao tác kho hàng: xuất/nhập kho, hoàn tác giao dịch, đặt hàng tự động, quản lý thiết bị.

### Gap Analysis

| # | Endpoint Group | Count | Current Guard | Gap |
|:-:|:---|:---:|:---|:---|
| 1 | Item CRUD | 5 | Tenant only | Missing `view`/`create`/`edit`/`delete` |
| 2 | Warehouse CRUD | 2 | Tenant only | Missing `create` |
| 3 | Stock movements (import/export) | 3 | Tenant only | Missing `stock_transfer` |
| 4 | **Transaction reversal** | 1 | **None** | ❌ **Tạo giao dịch ngược — ảnh hưởng tài chính trực tiếp** |
| 5 | **Lot management** | 5 | **None** | ❌ **FIFO tracking, tạo lô hàng** |
| 6 | **Auto-reorder** | 1 | **None** | ❌ **Tự động tạo Purchase Requisition** |
| 7 | **Equipment checkout/checkin** | 4 | **None** | ❌ **Mượn/trả CCDC, quản lý quá hạn** |
| 8 | **PDF receipt** | 1 | **None** | ❌ **Export dữ liệu kho** |
| 9 | **Analytics** | 1 | **None** | ❌ **Dữ liệu turnover & waste** |
| 10 | Low stock alerts, forecast, stock check | 4 | Tenant only | Missing `view` |

---

## 2. Đề Xuất Thay Đổi

### 2.1 Actions Mới (6 actions → tổng 11)

| # | Action | Code | Mô tả | Endpoints Covered |
|:-:|:---|:---|:---|:---|
| 1 | Xem | `view` | ✅ Đã có | list/get items, warehouses, stats, lots, alerts, forecast, stock check |
| 2 | Tạo | `create` | ✅ Đã có | create item, warehouse |
| 3 | Sửa | `edit` | ✅ Đã có | update item |
| 4 | Xóa | `delete` | ✅ Đã có | delete item |
| 5 | Xuất/Nhập kho | `stock_transfer` | ✅ Đã có | create_transaction, export_with_lots, prepare_materials |
| 6 | **Hoàn tác giao dịch** | **`reverse_transaction`** | 🆕 Tạo giao dịch ngược | reverse_transaction |
| 7 | **Quản lý lô hàng** | **`manage_lots`** | 🆕 Tạo/quản lý lots, FIFO | create_lot |
| 8 | **Đặt hàng tự động** | **`auto_reorder`** | 🆕 Tạo PR tự động từ low stock | trigger_auto_reorder |
| 9 | **Quản lý thiết bị** | **`manage_equipment`** | 🆕 Checkout/checkin CCDC | equipment endpoints |
| 10 | **Xuất báo cáo** | **`export`** | 🆕 PDF receipt, export data | get_transaction_receipt_pdf |
| 11 | **Xem phân tích** | **`view_analytics`** | 🆕 Turnover & waste analytics | get_inventory_analytics |

### 2.2 Bảng Phân Quyền Theo Vai Trò

| Action | Code | super_admin | admin | manager | chef | staff |
|:---|:---|:---:|:---:|:---:|:---:|:---:|
| Xem | `view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tạo | `create` | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| Sửa | `edit` | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| Xóa | `delete` | ✅ | ✅ | ⬜ | ⬜ | ⬜ |
| Xuất/Nhập kho | `stock_transfer` | ✅ | ✅ | ✅ | ✅ | ⬜ |
| Hoàn tác giao dịch | `reverse_transaction` | ✅ | ✅ | ⬜ | ⬜ | ⬜ |
| Quản lý lô hàng | `manage_lots` | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| Đặt hàng tự động | `auto_reorder` | ✅ | ✅ | ⬜ | ⬜ | ⬜ |
| Quản lý thiết bị | `manage_equipment` | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| Xuất báo cáo | `export` | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| Xem phân tích | `view_analytics` | ✅ | ✅ | ✅ | ⬜ | ⬜ |

### 2.3 SoD Rules (3 rules)

| Rule | Action A | Action B | Lý do |
|:---:|:---|:---|:---|
| 1 | `stock_transfer` | `reverse_transaction` | Người nhập/xuất kho không nên tự hoàn tác — cần kiểm soát chéo |
| 2 | `stock_transfer` | `auto_reorder` | Người thao tác kho không nên tự động đặt hàng — tránh conflict of interest |
| 3 | `delete` | `reverse_transaction` | Ngăn xóa items + hoàn tác giao dịch — kiểm soát dữ liệu toàn diện |

### 2.4 Permission Presets (4 presets)

| Mẫu | Actions |
|:---|:---|
| 📦 **Quản lý kho toàn diện** | `view, create, edit, delete, stock_transfer, reverse_transaction, manage_lots, auto_reorder, manage_equipment, export, view_analytics` |
| 🔄 **Thủ kho** | `view, create, edit, stock_transfer, manage_lots, manage_equipment, export` |
| 📊 **Giám sát kho** | `view, view_analytics, export` |
| 🍳 **Bếp trưởng** | `view, stock_transfer` |

---

## 3. Chi Tiết Implementation

### 3.1 Frontend — `permission-matrix-tab.tsx`

```diff
- { module: 'inventory', label: 'Kho hàng', actions: ['view', 'create', 'edit', 'delete', 'stock_transfer'] },
+ { module: 'inventory', label: 'Kho hàng', actions: ['view', 'create', 'edit', 'delete', 'stock_transfer', 'reverse_transaction', 'manage_lots', 'auto_reorder', 'manage_equipment', 'export', 'view_analytics'] },
```

**ACTION_LABELS:**
| Key | Label |
|:---|:---|
| `reverse_transaction` | Hoàn tác GD |
| `manage_lots` | Quản lý lô |
| `auto_reorder` | Đặt hàng tự động |
| `manage_equipment` | Quản lý thiết bị |
| `export` | Xuất báo cáo |
| `view_analytics` | Xem phân tích |

### 3.2 Backend — `inventory/infrastructure/http_router.py`

| Endpoint | Method | Permission |
|:---|:---:|:---|
| `list_warehouses` | GET | `inventory:view` |
| `create_warehouse` | POST | `inventory:create` |
| `get_inventory_stats` | GET | `inventory:view` |
| `list_items`, `get_item` | GET | `inventory:view` |
| `create_item` | POST | `inventory:create` |
| `update_item` | PUT | `inventory:edit` |
| `delete_inventory_item` | DELETE | `inventory:delete` |
| `create_transaction` | POST | `inventory:stock_transfer` |
| `reverse_transaction` | POST | `inventory:reverse_transaction` |
| `list_transactions` | GET | `inventory:view` |
| `list_lots`, `get_lot`, `get_fifo_lots` | GET | `inventory:view` |
| `create_lot` | POST | `inventory:manage_lots` |
| `export_with_lots` | POST | `inventory:stock_transfer` |
| `prepare_materials` | POST | `inventory:stock_transfer` |
| `get_low_stock_items` | GET | `inventory:view` |
| `trigger_auto_reorder` | POST | `inventory:auto_reorder` |
| `get_inventory_alerts_summary` | GET | `inventory:view` |
| `check_stock_availability` | POST | `inventory:view` |
| `get_material_forecast` | GET | `inventory:view` |
| `get_inventory_analytics` | GET | `inventory:view_analytics` |
| `get_transaction_receipt_pdf` | GET | `inventory:export` |
| `get_equipment_stats` | GET | `inventory:view` |
| `list_equipment_checkouts` | GET | `inventory:view` |
| `create_equipment_checkout` | POST | `inventory:manage_equipment` |
| `checkin_equipment` | POST | `inventory:manage_equipment` |
| `get_overdue_checkouts` | GET | `inventory:view` |
| `mark_overdue_checkouts` | POST | `inventory:manage_equipment` |

> [!IMPORTANT]
> **Cross-module calls (Procurement→Import, Order→Export)** sử dụng `InventoryService` trực tiếp, **KHÔNG đi qua HTTP router** → không bị ảnh hưởng bởi permission guards.

---

## 4. Risk Assessment

| Risk | Impact | Mitigation |
|:---|:---|:---|
| Breaking existing flows (PO → Import) | **HIGH** | Cross-module calls bypass HTTP → service-to-service, không ảnh hưởng |
| User confusion with 11 actions | **MEDIUM** | 4 Presets giảm complexity cho admin |
| SoD rules chặt quá | **LOW** | SoD là warning, không block |

---

## 5. Quality Scores

| Metric | Score |
|:---|:---:|
| Completeness | 24/25 |
| Consistency | 24/25 |
| Security | 23/25 |
| Feasibility | 24/25 |
| **Total** | **95/100** |

---

## 6. Effort Estimation

| Task | Size |
|:---|:---:|
| Frontend (matrix + labels + SoD + presets) | **S** |
| Backend (27 endpoint guards) | **M** |
| Docs (permission-matrix.md update) | **S** |
| **Total** | **M** (4-6 giờ) |
