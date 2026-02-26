# PRD: Nâng cấp Tab Hệ thống (System Settings)

> **Module**: Settings / Hệ thống  
> **Priority**: High  
> **Complexity**: L2 (Trung bình)  
> **Research Mode**: Hybrid (3 web searches + codebase scan)  
> **Claim Verification Rate**: 90%+  

---

## 1. Bối cảnh & Vấn đề

### 1.1 Hiện trạng

Tab "Hệ thống" trong trang Cài đặt hiện có **5 nhóm / 13 settings** được hardcode inline trong `page.tsx`:

| Nhóm | Settings | Kiểu |
|:---|:---|:---|
| **Đơn hàng & Vận hành** | auto_deduct_inventory, auto_create_timesheet, auto_earn_loyalty, require_deposit | BOOLEAN (4) |
| **Khách hàng & Loyalty** | loyalty_enabled, loyalty_points_ratio | BOOLEAN (1) + NUMBER (1) |
| **Báo giá** | default_validity_days, expiring_soon_days | NUMBER (2) |
| **Tài chính** | auto_journal_on_payment, default_payment_terms, tax_rate | BOOLEAN (1) + NUMBER (2) |
| **Hệ thống chung** | hr.sync_order_assignments, inventory.auto_import_from_po | BOOLEAN (2) |

### 1.2 Vấn đề phát hiện

| # | Vấn đề | Nghiêm trọng |
|:---:|:---|:---:|
| **P1** | **Database không seed đủ settings** — chỉ có ~7/13 rows trong `tenant_settings`. Settings chưa có hàng → hiển thị giá trị rỗng, toggle ở trạng thái OFF dù ý muốn mặc định là ON | 🔴 High |
| **P2** | **Settings hardcode trong JSX** — 100+ dòng config inline, không tách component, khó maintain khi thêm settings mới | 🟡 Medium |
| **P3** | **Không có validation** — số ngày có thể nhập âm, tax_rate có thể > 100%, loyalty_points_ratio có thể = 0 | 🟡 Medium |
| **P4** | **Không có feedback khi lưu lỗi** — chỉ có toast success, không xử lý error case | 🟡 Medium |
| **P5** | **Không có audit trail** — thay đổi settings quan trọng (tax, deposit) không có log ai đổi lúc nào | 🟠 Medium-High |
| **P6** | **Thiếu settings thiết yếu cho catering** — phí dịch vụ mặc định, số lượng tối thiểu cho đơn hàng, giờ vận hành, lead time chuẩn bị | 🟡 Medium |
| **P7** | **Không có dependent settings (progressive disclosure)** — ví dụ: khi tắt `loyalty_enabled` thì `loyalty_points_ratio` vẫn hiện và editable | 🟢 Low |
| **P8** | **Không có "Reset to default"** — nếu user đổi sai thì không biết giá trị mặc định là gì | 🟢 Low |

---

## 2. Mục tiêu

1. **Seed đầy đủ settings** với giá trị mặc định hợp lý cho tất cả 13+ keys khi tenant được tạo
2. **Tách component** — extract `SystemSettingsTab` thành component riêng, settings config thành file riêng
3. **Validation frontend** — min/max cho NUMBER, validation rules per setting
4. **Progressive disclosure** — ẩn settings con khi setting cha bị tắt
5. **Thêm settings mới** cho nghiệp vụ catering
6. **Audit trail** — log setting changes vào bảng activity

---

## 3. Đề xuất thay đổi

### 3.1 Backend: Seed Settings Migration

#### [NEW] `backend/migrations/XXX_seed_system_settings.sql`

Tạo migration seed đầy đủ settings cho tenant hiện tại với giá trị mặc định:

```sql
-- Seed default settings nếu chưa tồn tại
INSERT INTO tenant_settings (id, tenant_id, setting_key, setting_value, setting_type, description)
SELECT gen_random_uuid(), t.id, s.key, s.default_value, s.type, s.description
FROM tenants t
CROSS JOIN (VALUES
  -- Order & Operations
  ('order.auto_deduct_inventory', 'true', 'BOOLEAN', 'Tự động trừ kho khi hoàn thành đơn'),
  ('order.auto_create_timesheet', 'true', 'BOOLEAN', 'Tự động tạo bảng chấm công'),
  ('order.auto_earn_loyalty', 'true', 'BOOLEAN', 'Tự động cộng điểm tích lũy'),
  ('order.require_deposit', 'false', 'BOOLEAN', 'Yêu cầu đặt cọc trước xác nhận'),
  ('order.min_order_amount', '0', 'NUMBER', 'Giá trị đơn hàng tối thiểu (VND)'),
  ('order.default_lead_time_days', '3', 'NUMBER', 'Thời gian chuẩn bị mặc định (ngày)'),
  -- CRM & Loyalty
  ('crm.loyalty_enabled', 'true', 'BOOLEAN', 'Bật/tắt chương trình loyalty'),
  ('crm.loyalty_points_ratio', '10000', 'NUMBER', 'Số VND cho 1 điểm'),
  -- Quote
  ('quote.default_validity_days', '30', 'NUMBER', 'Thời hạn hiệu lực mặc định'),
  ('quote.expiring_soon_days', '7', 'NUMBER', 'Ngưỡng cảnh báo sắp hết hạn'),
  -- Finance
  ('finance.auto_journal_on_payment', 'true', 'BOOLEAN', 'Tự động tạo bút toán khi thanh toán'),
  ('finance.default_payment_terms', '30', 'NUMBER', 'Hạn thanh toán mặc định (ngày)'),
  ('finance.tax_rate', '10', 'NUMBER', 'Thuế GTGT mặc định (%)'),
  ('finance.default_service_charge', '0', 'NUMBER', 'Phí dịch vụ mặc định (%)'),
  -- System
  ('hr.sync_order_assignments', 'true', 'BOOLEAN', 'Đồng bộ phân công nhân viên'),
  ('inventory.auto_import_from_po', 'true', 'BOOLEAN', 'Tự động nhập kho từ PO')
) AS s(key, default_value, type, description)
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_settings ts
  WHERE ts.tenant_id = t.id AND ts.setting_key = s.key
);
```

### 3.2 Frontend: Extract Component + Settings Config

#### [NEW] `frontend/src/app/(dashboard)/settings/components/system-settings-tab.tsx`

Tách toàn bộ system settings logic từ `page.tsx` thành component riêng:

- Setting groups config tách thành constant `SETTING_GROUPS`
- Mỗi setting có thêm: `min`, `max`, `defaultValue`, `dependsOn` (cho progressive disclosure)
- Validation: hiển thị error inline nếu giá trị ngoài phạm vi
- Undo: lưu `previousValue` trước khi save, hiện nút "Hoàn tác" trong toast

#### [MODIFY] `frontend/src/app/(dashboard)/settings/page.tsx`

- Remove inline system settings code (lines 833-994)
- Replace với `<SystemSettingsTab />`
- Giảm ~160 dòng code

### 3.3 Settings Config mới

| Key | Nhóm | Kiểu | Min | Max | Default | Depends On |
|:---|:---|:---|:---:|:---:|:---:|:---|
| `order.min_order_amount` | Đơn hàng | NUMBER | 0 | 999999999 | 0 | — |
| `order.default_lead_time_days` | Đơn hàng | NUMBER | 1 | 30 | 3 | — |
| `finance.default_service_charge` | Tài chính | NUMBER | 0 | 50 | 0 | — |
| `crm.loyalty_points_ratio` | CRM | NUMBER | 1000 | 1000000 | 10000 | `crm.loyalty_enabled` |

### 3.4 Progressive Disclosure Rules

```typescript
// Ví dụ: khi crm.loyalty_enabled = false → ẩn crm.loyalty_points_ratio
const DEPENDENCY_MAP = {
  'crm.loyalty_points_ratio': { dependsOn: 'crm.loyalty_enabled', showWhen: 'true' },
  'order.auto_earn_loyalty': { dependsOn: 'crm.loyalty_enabled', showWhen: 'true' },
};
```

Khi setting cha bị tắt → setting con mờ (opacity 50%, non-interactive) với tooltip "Bật {parent label} trước".

### 3.5 Validation Rules

```typescript
const VALIDATION_RULES: Record<string, { min?: number; max?: number; error?: string }> = {
  'finance.tax_rate': { min: 0, max: 100, error: 'Thuế phải từ 0-100%' },
  'finance.default_payment_terms': { min: 0, max: 365, error: 'Hạn thanh toán tối đa 365 ngày' },
  'finance.default_service_charge': { min: 0, max: 50, error: 'Phí dịch vụ tối đa 50%' },
  'quote.default_validity_days': { min: 1, max: 365, error: 'Thời hạn hiệu lực 1-365 ngày' },
  'quote.expiring_soon_days': { min: 1, max: 30, error: 'Ngưỡng cảnh báo 1-30 ngày' },
  'crm.loyalty_points_ratio': { min: 1000, max: 1000000, error: 'Tỉ lệ quy đổi 1,000-1,000,000 VND' },
  'order.min_order_amount': { min: 0, max: 999999999, error: 'Giá trị tối thiểu không hợp lệ' },
  'order.default_lead_time_days': { min: 1, max: 30, error: 'Lead time 1-30 ngày' },
};
```

---

## 4. UX Improvements

### 4.1 Toast with Undo

Khi thay đổi setting → toast hiện nút **"Hoàn tác"** trong 5 giây:

```
✅ Đã cập nhật "Thuế GTGT mặc định" → 8%     [Hoàn tác]
```

### 4.2 Inline Validation Error

Khi nhập giá trị ngoài phạm vi → hiện error text đỏ dưới input:

```
[  -5  ] ngày
⚠ Hạn thanh toán tối đa 365 ngày
```

### 4.3 Settings Description Tooltip

Mỗi setting có icon `IconInfoCircle` nhỏ bên cạnh label → hover hiện tooltip mô tả chi tiết.

### 4.4 Collapse Groups (tùy chọn, Phase 2)

Cho phép collapse/expand các nhóm settings. Nhớ trạng thái collapse qua `localStorage`.

---

## 5. Verification Plan

### 5.1 Automated

```powershell
# Build check
cd frontend && npx next build

# Verify migration
psql postgresql://postgres:postgres@localhost:5432/catering_db -c "SELECT COUNT(*) FROM tenant_settings;"
```

### 5.2 Browser Test

1. Mở `http://localhost:3000/settings?tab=system-settings`
2. Xác nhận tất cả settings hiển thị đúng giá trị từ database
3. Toggle một setting boolean → verify toast + giá trị cập nhật
4. Nhập giá trị ngoài phạm vi cho NUMBER field → verify error inline
5. Tắt `crm.loyalty_enabled` → verify `loyalty_points_ratio` bị mờ
6. Verify "Hoàn tác" trong toast hoạt động

### 5.3 Manual Verification

User kiểm tra:
- Tab Hệ thống load đúng (không redirect)
- Settings lưu và reload đúng giá trị
- Settings mới (min_order_amount, lead_time, service_charge) hiển thị

---

## 6. Research Sources

| # | Source | Key Finding | Confidence |
|:---:|:---|:---|:---:|
| 1 | aorborc.com | Progressive disclosure reduces cognitive load in ERP settings | HIGH |
| 2 | medium.com (SaaS settings UX) | Grouped toggles with contextual tooltips and conditional inputs | HIGH |
| 3 | cieden.com | Toggle groups: group by purpose, action-first labels, immediate feedback | HIGH |
| 4 | cloudkitchens.com | Catering systems need: menu config, inventory thresholds, delivery zones | MEDIUM |
| 5 | swipesum.com | Catering workflow automation settings: auto-deduct, lead time, service charge | MEDIUM |

---

## 7. Scope & Phases

### Phase 1 (MVP — This PRD)
- [x] Seed migration cho tất cả settings
- [x] Extract `SystemSettingsTab` component
- [x] Input validation (min/max)
- [x] Progressive disclosure (dependsOn)
- [x] Thêm 4 settings mới (min_order, lead_time, service_charge, + loyalty validation)

### Phase 2 (Future)
- [ ] Audit trail (log setting changes)
- [ ] Collapse/expand groups
- [ ] Search/filter settings
- [ ] Reset to default button per setting
- [ ] Settings import/export

---

## 8. 5-Dimensional Assessment

| Dimension | Impact | Notes |
|:---|:---:|:---|
| **UX** | 🟡 Medium | Progressive disclosure, undo toast, validation feedback |
| **UI** | 🟢 Low | Chỉ thêm error states + dependency opacity, không redesign |
| **FE** | 🟡 Medium | Extract component, validation logic, dependency map |
| **BE** | 🟢 Low | Chỉ seed migration, không đổi API |
| **DA** | 🟢 Low | INSERT thêm rows, không đổi schema |

**Complexity Score**: 3.5/10 → Processing Mode: **Standard**
