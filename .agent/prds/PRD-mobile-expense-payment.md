# PRD: Ghi Nhận Chi Tiêu & Thanh Toán Nhanh — Mobile App
> **Version**: 1.0 | **Date**: 01/03/2026 | **Research Mode**: Hybrid (11+ sources verified)

---

## 1. Bối Cảnh & Vấn Đề

### Hiện trạng Backend (✅ Đã có)
| API | Method | Endpoint | Mô tả |
|-----|--------|----------|-------|
| Order Expenses | GET/POST | `/orders/{id}/expenses` | Chi phí trực tiếp liên kết đơn hàng |
| Active Orders | GET | `/orders/my-active` | Đơn hàng hôm nay (cho linking) |
| Finance Transactions | GET/POST | `/finance/transactions` | Giao dịch tài chính general |
| Finance Dashboard | GET | `/finance/dashboard` | Tổng quan (revenue, expenses, profit) |
| Order Payments | POST | `/orders/{id}/payments` | Thanh toán đơn hàng |

### Hiện trạng Mobile (⚠️ Thiếu)
- `useFinance.ts` có hooks nhưng **chưa có screen ghi nhận chi tiêu**
- **Chưa có screen thanh toán nhanh** — chỉ xem dashboard
- Staff đi hiện trường phải gọi điện báo admin nhập trên web

### Vấn đề nghiệp vụ
Nhân viên catering đi hiện trường **không thể ghi nhận chi phí phát sinh** (mua nguyên liệu, thuê xe, thuê bàn ghế...) ngay trên điện thoại → dữ liệu bị thất lạc, tài chính không chính xác.

---

## 2. Giải Pháp: 2 Screens Mới

### 2.1 Screen 1: Ghi Nhận Chi Tiêu (Quick Expense)

**Route**: `/finance/create-expense`  
**Access**: Từ Profile menu + FAB trên Finance screen

#### Flow UX
```
1. User bấm "Ghi nhận chi tiêu" (hoặc FAB "+")
2. Auto-load danh sách đơn hàng hôm nay (GET /orders/my-active)
3. Chọn danh mục chi phí (5 loại có emoji icon)
4. Nhập số tiền (VND, format tự động)
5. Ghi chú (tùy chọn)
6. Liên kết đơn hàng (tùy chọn, auto-suggest)
7. Bấm "Lưu" → POST tạo expense
8. Snackbar xác nhận thành công
```

#### Danh mục chi phí (từ backend)
| Code | Label | Icon |
|------|-------|------|
| `NGUYENLIEU` | Nguyên liệu | 🥩 |
| `NHANCONG` | Nhân công | 👷 |
| `THUEMUON` | Thuê mướn | 🪑 |
| `VANHANH` | Vận hành | 🚗 |
| `KHAC` | Khác | 📦 |

#### UI Layout (MD3)
```
┌─────────────────────────────┐
│ ← Ghi nhận chi tiêu        │  ← TopAppBar
├─────────────────────────────┤
│                             │
│  ┌─ Danh mục ─────────────┐│
│  │ 🥩  👷  🪑  🚗  📦    ││  ← MD3 Chips (horizontal)
│  └────────────────────────┘│
│                             │
│  ┌─ Số tiền ──────────────┐│
│  │ đ  500,000             ││  ← Large input, VND format
│  └────────────────────────┘│
│                             │
│  ┌─ Ghi chú ──────────────┐│
│  │ Mua thêm rau...        ││  ← TextInput multi-line
│  └────────────────────────┘│
│                             │
│  ┌─ Liên kết đơn hàng ────┐│
│  │ ≡ DH-2603-0001 (Anh X) ││  ← Dropdown (my-active)
│  │   DH-2603-0002 (Chị Y) ││
│  │   Không liên kết        ││
│  └────────────────────────┘│
│                             │
│  ┌────────────────────────┐│
│  │     💾 Lưu chi tiêu    ││  ← MD3 Filled Button
│  └────────────────────────┘│
└─────────────────────────────┘
```

---

### 2.2 Screen 2: Ghi Nhận Thanh Toán Nhanh (Quick Payment)

**Route**: `/finance/record-payment`  
**Access**: Từ Profile menu + Order Detail

#### Flow UX
```
1. User bấm "Ghi nhận thanh toán"
2. Chọn đơn hàng (nếu chưa từ order detail)
3. Hiện thông tin: Tổng tiền / Đã thu / Còn nợ
4. Nhập số tiền thanh toán
5. Chọn phương thức: Tiền mặt / Chuyển khoản / Momo/ZaloPay
6. Mã tham chiếu (tùy chọn)
7. Bấm "Xác nhận" → POST payment
8. Snackbar + badge update
```

#### UI Layout (MD3)
```
┌─────────────────────────────┐
│ ← Ghi nhận thanh toán       │  ← TopAppBar
├─────────────────────────────┤
│                             │
│  ┌─ Đơn hàng ─────────────┐│
│  │ DH-2603-0001            ││
│  │ Anh Nguyễn — 50 khách  ││  ← MD3 Card (outlined)
│  │ Ngày: 26/03/2026        ││
│  └────────────────────────┘│
│                             │
│  ┌─ Tổng quan ────────────┐│
│  │ Tổng tiền:  15,000,000 ││
│  │ Đã thu:      5,000,000 ││  ← green
│  │ Còn nợ:     10,000,000 ││  ← red/warning
│  └────────────────────────┘│
│                             │
│  ┌─ Số tiền thanh toán ───┐│
│  │ đ  10,000,000          ││  ← Auto-fill còn nợ
│  └────────────────────────┘│
│                             │
│  ┌─ Phương thức ──────────┐│
│  │ 💵 Tiền mặt            ││
│  │ 🏦 Chuyển khoản ✓      ││  ← Selected (MD3 Chip)
│  │ 📱 Ví điện tử           ││
│  └────────────────────────┘│
│                             │
│  ┌─ Mã tham chiếu ────────┐│
│  │ VCB123456...            ││
│  └────────────────────────┘│
│                             │
│  ┌────────────────────────┐│
│  │   ✓ Xác nhận thanh toán ││  ← MD3 Filled Button
│  └────────────────────────┘│
└─────────────────────────────┘
```

---

## 3. Technical Specs

### 3.1 Files Mới

| File | Mô tả |
|------|-------|
| `mobile/app/finance/create-expense.tsx` | Screen ghi nhận chi tiêu |
| `mobile/app/finance/record-payment.tsx` | Screen ghi nhận thanh toán |
| `mobile/lib/hooks/useExpense.ts` | Hooks: `useMyActiveOrders()`, `useCreateOrderExpense()` |

### 3.2 Files Sửa

| File | Thay đổi |
|------|----------|
| `mobile/app/(tabs)/profile.tsx` | Thêm 2 menu items mới |
| `mobile/lib/hooks/useFinance.ts` | Thêm `useCreatePayment()` hook |

### 3.3 API Integration

```typescript
// useExpense.ts
export function useMyActiveOrders() {
    return useQuery({
        queryKey: ['my-active-orders'],
        queryFn: () => api.get('/orders/my-active'),
    });
}

export function useCreateOrderExpense() {
    return useMutation({
        mutationFn: ({ orderId, data }) => 
            api.post(`/orders/${orderId}/expenses`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['finance-dashboard'] });
        },
    });
}

// Payment — sử dụng existing order payment API
export function useCreatePayment() {
    return useMutation({
        mutationFn: ({ orderId, data }) =>
            api.post(`/orders/${orderId}/payments`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['finance-dashboard'] });
            qc.invalidateQueries({ queryKey: ['orders'] });
        },
    });
}
```

### 3.4 Permission

| Feature | Roles | Từ matrix |
|---------|-------|-----------|
| Ghi chi tiêu | SA, Admin, Manager, Accountant | finance.create |
| Ghi thanh toán | SA, Admin, Manager, Accountant, Sales | order.create |

### 3.5 Offline Support
- Queue expense/payment khi offline (SQLite + `offline-queue.ts`)
- Auto-sync khi online
- Visual indicator: "Đang chờ đồng bộ" badge

---

## 4. Ưu Tiên

| Phase | Feature | Effort |
|-------|---------|--------|
| **Phase 1** | Screen Ghi nhận chi tiêu + hook | 3h |
| **Phase 1** | Screen Ghi nhận thanh toán + hook | 3h |
| **Phase 1** | Menu items + navigation | 0.5h |
| **Phase 2** | Offline queue + sync | 2h |

**Tổng**: ~8.5h

---

## 5. Verification Plan

- TypeScript: `npx tsc --noEmit` — 0 errors
- Test flow: Tạo chi tiêu → verify trong Finance dashboard
- Test flow: Ghi thanh toán → verify order balance updated
- Test offline: Airplane mode → tạo chi tiêu → bật wifi → verify sync
