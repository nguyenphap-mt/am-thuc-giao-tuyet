# PRD: Tạo Báo Giá trên Mobile

> **Version**: 1.0  
> **Date**: 27/02/2026  
> **Module**: Mobile / Sales  
> **Complexity**: Enhanced (Score: 5.35/10)  
> **Research Mode**: Standard (Web + Codebase)

---

## 1. Vấn Đề

Hiện tại app mobile chỉ hỗ trợ **xem** danh sách và chi tiết báo giá. Manager/Admin muốn tạo báo giá nhanh khi đang ở ngoài gặp khách hàng — không cần mở laptop.

### Đối tượng sử dụng
- **Admin** và **Manager** (role `super_admin`, `admin`, `manager`)
- Kịch bản: gặp khách → tạo báo giá nhanh → gửi qua Zalo/SMS

---

## 2. Giải Pháp: Mobile Quote Wizard (3 Bước)

> **Nguyên tắc thiết kế**: Web wizard 5 bước quá phức tạp cho mobile. Gộp thành **3 bước** tối ưu cho màn hình nhỏ.

### So sánh Web vs Mobile

| Web (5 bước) | Mobile (3 bước) | Lý do |
|:-------------|:----------------|:------|
| Step 1: Chọn khách | **Bước 1**: Thông tin khách | Gộp khách + sự kiện |
| Step 2: Chọn menu | **Bước 2**: Chọn món | Giữ nguyên — core feature |
| Step 3: Dịch vụ & Pricing | (Gộp vào Bước 2) | Dịch vụ thêm = optional |
| Step 4: Review | **Bước 3**: Xem lại & Gửi | Gộp review + submit |
| Step 5: Submit | (Gộp vào Bước 3) | Không cần bước riêng |

---

## 3. Chi Tiết Từng Bước

### Bước 1: Thông Tin Khách Hàng & Sự Kiện
**Layout**: Single-column form, keyboard-aware

| Field | Type | Required | Input Type |
|:------|:-----|:--------:|:-----------|
| Tên khách hàng | Text + Search | ✅ | Gõ hoặc chọn từ CRM |
| Số điện thoại | Phone | ✅ | `tel` keyboard |
| Email | Email | ❌ | `email` keyboard |
| Loại tiệc | Picker | ✅ | Bottom Sheet picker |
| Ngày tiệc | DatePicker | ✅ | Native date picker |
| Giờ phục vụ | TimePicker | ❌ | Native time picker |
| Địa chỉ | Text | ❌ | Text + paste |
| Số bàn | Number | ✅ | `numeric` keyboard |
| Số khách/bàn | Number | ✅ | Default: 10 |
| Ghi chú | Multiline | ❌ | Text area |

**UX Features**:
- 🔍 Tìm kiếm khách từ CRM: gõ tên → autocomplete → auto-fill SĐT, email
- 📋 Template: Chọn template có sẵn → auto-fill items ở Bước 2
- 💾 Auto-save draft mỗi 5 giây vào AsyncStorage

### Bước 2: Chọn Món & Dịch Vụ
**Layout**: Search bar + category tabs + item list

| Component | Mô tả |
|:----------|:------|
| **Search bar** | Tìm kiếm món theo tên |
| **Category tabs** | Horizontal scroll: Tất cả, Khai vị, Chính, Tráng miệng, Nước |
| **Menu item card** | Tên + Giá + Ảnh nhỏ + nút [+] / [-] |
| **Selected items** | Bottom sheet kéo lên: danh sách món đã chọn |
| **Item detail** | Tap vào item → edit số lượng, đơn giá, ghi chú |
| **Tổng tiền** | Fixed footer: hiển thị tổng real-time |

**UX Features**:
- ➕ Thêm món tùy chỉnh (không có trong menu) — `item_name` + `unit_price`
- 📊 Real-time calculation: `quantity × unit_price = total_price`
- 🔢 Stepper control: [-] 1 [+] cho số lượng
- 📱 Swipe-to-delete item

### Bước 3: Xem Lại & Gửi
**Layout**: Summary card + action buttons

| Section | Nội dung |
|:--------|:---------|
| **Khách hàng** | Tên, SĐT, email — tap để sửa (quay lại Bước 1) |
| **Sự kiện** | Loại tiệc, ngày, giờ, địa chỉ, số bàn × khách |
| **Danh sách món** | Tên + SL + Đơn giá + Thành tiền — tap sửa SL |
| **Chiết khấu** | Input: % chiết khấu tổng (default 0%) |
| **VAT** | Toggle: Bao gồm VAT? + VAT rate (default 10%) |
| **Tổng cộng** | Subtotal − Chiết khấu + VAT = **Final Amount** |
| **Hiệu lực** | Date picker: Báo giá có hiệu lực đến ngày |
| **Ghi chú** | Text area + Note presets (chọn ghi chú mẫu) |

**Actions**:
- 💾 **Lưu nháp** → POST /quotes với status=DRAFT
- ✅ **Gửi báo giá** → POST /quotes với status=NEW → Share via Zalo/SMS

---

## 4. Kiến Trúc Kỹ Thuật

### 4.1 Files mới

```
mobile/app/quotes/create.tsx          # Wizard container + step navigation
mobile/app/quotes/steps/
  ├── CustomerStep.tsx               # Bước 1: Thông tin khách
  ├── MenuStep.tsx                   # Bước 2: Chọn món
  └── ReviewStep.tsx                 # Bước 3: Xem lại & Gửi
mobile/lib/hooks/useQuotes.ts        # [MODIFY] Thêm mutation hooks
mobile/lib/stores/quote-draft.ts     # [NEW] Zustand store cho draft state
```

### 4.2 State Management (Zustand)

```typescript
interface QuoteDraftState {
  // Step 1
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_id?: string;
  event_type: string;
  event_date: string;
  event_time: string;
  event_address: string;
  table_count: number;
  guests_per_table: number;
  notes: string;
  
  // Step 2
  items: QuoteItemDraft[];
  
  // Step 3
  discount_total_percent: number;
  is_vat_inclusive: boolean;
  vat_rate: number;
  valid_until: string;
  
  // Actions
  setCustomerInfo: (info: Partial<QuoteDraftState>) => void;
  addItem: (item: QuoteItemDraft) => void;
  removeItem: (index: number) => void;
  updateItemQuantity: (index: number, qty: number) => void;
  reset: () => void;
}
```

### 4.3 API Integration

Backend API đã sẵn sàng — **KHÔNG cần thay đổi backend**:

| Action | Endpoint | Status |
|:-------|:---------|:------:|
| Tạo báo giá | `POST /api/v1/quotes` | ✅ Có sẵn |
| Danh sách khách hàng | `GET /api/v1/crm/customers` | ✅ Có sẵn |
| Danh sách menu | `GET /api/v1/menu/items` | ✅ Có sẵn |
| Templates | `GET /api/v1/quotes/quote-templates` | ✅ Có sẵn |
| Note presets | `GET /api/v1/quotes/note-presets` | ✅ Có sẵn |

### 4.4 Permission

`quote:create` — chỉ Admin và Manager (đã có trong permission matrix).

---

## 5. UX Best Practices Applied

| Practice | Áp dụng |
|:---------|:--------|
| Single-column layout | ✅ Tất cả form fields |
| Progress indicator | ✅ Step bar 1-2-3 trên cùng |
| Per-step validation | ✅ Validate trước khi Next |
| Touch-friendly (48dp) | ✅ Buttons, steppers, items |
| Keyboard-aware | ✅ KeyboardAvoidingView |
| Auto-save draft | ✅ AsyncStorage mỗi 5s |
| Real-time calculations | ✅ Footer tổng tiền |
| Pre-fill from CRM | ✅ Search → auto-fill |

---

## 6. Acceptance Criteria

- [ ] AC1: User (Admin/Manager) có thể mở "Tạo báo giá" từ quotes list
- [ ] AC2: Bước 1 — nhập/chọn khách hàng từ CRM, chọn loại tiệc, ngày
- [ ] AC3: Bước 2 — tìm kiếm và thêm món từ menu, sửa số lượng
- [ ] AC4: Bước 2 — thêm món tùy chỉnh (không có trong menu)
- [ ] AC5: Bước 3 — xem tổng hợp, áp chiết khấu, VAT
- [ ] AC6: Lưu nháp (DRAFT) thành công
- [ ] AC7: Gửi báo giá (NEW) thành công → hiện trong danh sách
- [ ] AC8: Draft auto-save vào AsyncStorage → khôi phục khi mở lại
- [ ] AC9: Navigation back/forward giữa các bước giữ state
- [ ] AC10: Real-time tính tổng tiền khi thêm/bớt món

---

## 7. Verification Plan

### Automated
- TypeScript build: `npx tsc --noEmit` — 0 errors
- API test: POST /quotes từ mobile → verify trong web admin

### Manual
- Test trên Expo Go Android: tạo báo giá end-to-end
- Test auto-save: tạo nửa chừng → kill app → mở lại → draft còn
- Test responsive: xoay ngang → layout không vỡ

---

## 8. Effort Estimation

| Phase | Files | Effort |
|:------|:------|:------:|
| Zustand store + hooks | 2 files | 1h |
| Bước 1: Customer form | 1 file | 1.5h |
| Bước 2: Menu picker | 1 file | 2h |
| Bước 3: Review + Submit | 1 file | 1.5h |
| Wizard container + nav | 1 file | 1h |
| **Tổng** | **6 files** | **~7h** |

> **Backend**: 0 changes — API 100% sẵn sàng.

---

## Sources
- Mobile form UX: smashingmagazine.com, uxmatters.com, formsonfire.com
- React Native wizard: medium.com (multi-step forms), logrocket.com (form libraries)
- Internal: `backend/modules/quote/domain/entities.py`, `mobile/lib/hooks/useQuotes.ts`
