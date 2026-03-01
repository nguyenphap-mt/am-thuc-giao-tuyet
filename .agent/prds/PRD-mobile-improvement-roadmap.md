# PRD: Hoàn Thiện App Mobile — Gap Analysis & Improvement Roadmap

> **Version**: 1.0  
> **Date**: 27/02/2026  
> **Research Mode**: KB Fallback (Web search unavailable)  
> **Source**: PRD-mobile-platform.md + Codebase scan + Industry knowledge

---

## 1. Phân Tích Hiện Trạng (Current State)

### 1.1 Tính năng đã có ✅

| Tab/Module | Screen | Trạng thái | Ghi chú |
|:-----------|:-------|:----------:|:--------|
| 📅 **Lịch làm việc** | `schedule.tsx` | ✅ Có | Xem lịch phân công |
| 🔔 **Thông báo** | `notifications.tsx` | ✅ Có | In-app notifications |
| 🛒 **Mua hàng** | `purchase.tsx` | ✅ Có | Phiếu mua hàng |
| 👨‍🍳 **Bếp** | `prep.tsx` | ✅ Có | Phiếu chuẩn bị |
| 👤 **Tài khoản** | `profile.tsx` | ✅ Có | Profile, settings |
| 📋 **Báo giá** | `quotes/` | ✅ Mới tạo | List + Detail + Create wizard |
| 📦 **Đơn hàng** | `orders/` | ✅ Có | List + Detail |
| 📊 **Dashboard** | `dashboard/` | ✅ Có | Tổng quan |
| 💰 **Tài chính** | `finance/` | ✅ Có | Overview |
| 👥 **CRM** | `crm/` | ✅ Có | Customers |
| 🗓 **Lịch** | `calendar/` | ✅ Có | Calendar view |
| 📦 **Kho** | `inventory/` | ✅ Có | List + Detail |
| 👔 **HR** | `hr/` | ✅ Có | HR screens |
| 📈 **Báo cáo** | `reports/` | ✅ Có | Reports |
| 📅 **Sự kiện** | `event/[id]` | ✅ Có | Event detail |

### 1.2 Tính năng THIẾU so với best practices ❌

| # | Feature | Mức độ | Lý do quan trọng |
|:-:|:--------|:------:|:-----------------|
| G1 | **GPS Check-in/Check-out** | 🔴 Critical | Theo dõi thời gian thực nhân viên tại hiện trường |
| G2 | **Push Notification (FCM)** | 🔴 Critical | Chỉ có in-app, thiếu native push khi app đóng |
| G3 | **Offline-First Engine** | 🟡 High | Mất mạng tại địa điểm → app không dùng được |
| G4 | **Quick Approve** | 🟡 High | Manager phê duyệt (báo giá, nghỉ phép) trên mobile |
| G5 | **Camera + Receipt OCR** | 🟡 High | Chụp hóa đơn chi phí → tự nhập expense |
| G6 | **Real-time WebSocket** | 🟢 Medium | Live updates trạng thái đơn hàng |
| G7 | **Biometric Login** | 🟢 Medium | Đã có `expo-local-authentication` nhưng chưa implement |
| G8 | **Onboarding / Tutorial** | 🟢 Medium | Hướng dẫn nhân viên mới sử dụng |
| G9 | **Dark Mode** | 🟢 Low | Tiết kiệm pin, sử dụng ban đêm |
| G10 | **Multi-language** | 🟢 Low | Mở rộng cho nhân viên nước ngoài |

---

## 2. Best Practices từ App Catering Tương Tự

> **Sources**: Domain knowledge từ CaterTrax, Total Party Planner, Curate, Better Cater, Now Valet, FoodStorm

### 2.1 Core Features mà top-tier catering apps đều có

| Feature | CaterTrax | TPP | Curate | App hiện tại |
|:--------|:---------:|:---:|:------:|:------------:|
| Order Management | ✅ | ✅ | ✅ | ✅ |
| Quote/Proposal Builder | ✅ | ✅ | ✅ | ✅ (mới) |
| Staff Scheduling | ✅ | ✅ | ❌ | ✅ |
| Kitchen Prep Sheet | ✅ | ✅ | ❌ | ✅ |
| GPS Check-in | ✅ | ❌ | ❌ | ❌ GAP |
| Push Notifications | ✅ | ✅ | ✅ | ❌ GAP |
| Offline Mode | ✅ | ❌ | ❌ | ❌ GAP |
| Photo Documentation | ✅ | ✅ | ✅ | ❌ GAP |
| Quick Expense Entry | ✅ | ❌ | ❌ | ❌ GAP |
| Customer Portal | ✅ | ✅ | ✅ | ❌ Future |
| BEO (Banquet Event Order) | ✅ | ✅ | ✅ | Partial |

### 2.2 UX Patterns tiêu chuẩn ngành

| Pattern | Best Practice | App hiện tại | Đánh giá |
|:--------|:-------------|:-------------|:--------:|
| **Bottom Navigation** | Max 5 tabs, icon + label | ✅ 5 tabs | ✅ OK |
| **Role-based Home** | Hiển thị khác nhau theo role | ❌ Giống nhau | GAP |
| **Today's Events** | Widget tóm tắt ngày hôm nay | ❌ Không có | GAP |
| **One-tap Actions** | Approve, Complete, Check-in | ❌ Phải vào detail | GAP |
| **Photo Attachments** | Chụp ảnh đính kèm vào order/event | ❌ Không có | GAP |
| **Voice Notes** | Ghi âm ghi chú nhanh | ❌ Không có | Optional |
| **Signature Capture** | Chữ ký xác nhận giao nhận | ❌ Không có | Optional |
| **QR Code Scan** | Scan QR cho check-in, inventory | ❌ Không có | GAP |

---

## 3. Đề Xuất Cải Thiện (Prioritized)

### 🔴 Priority 1: Critical (Nên làm ngay)

#### F1: Role-Based Home Screen
**Vấn đề**: Tất cả users thấy cùng 5 tabs, kể cả Admin thấy tab "Bếp", Chef thấy tab "Mua hàng"
**Giải pháp**: Dynamic tabs dựa trên role

| Role | Tabs hiển thị |
|:-----|:-------------|
| **Admin/Manager** | Dashboard, Đơn hàng, Báo giá, Thông báo, Thêm |
| **Chef** | Bếp, Lịch, Kho, Thông báo, Tài khoản |
| **Staff** | Lịch, Thông báo, Bếp, Tài khoản |
| **Purchasing** | Mua hàng, Kho, Thông báo, Tài khoản |

**Effort**: 1-2 ngày

#### F2: Today Widget (Tổng quan ngày)
**Vấn đề**: Mở app → không biết hôm nay có gì
**Giải pháp**: Card "Hôm nay" trên Dashboard

```
┌─────────────────────────────┐
│ 📅 Hôm nay — Thứ 4, 27/02  │
│                             │
│ 🎉 2 tiệc    👥 35 khách   │
│ 📋 5 prep    🛒 1 đơn mua  │
│                             │
│ ⏰ Tiệc kế: 17:00 — Nguyễn │
│    📍 123 Nguyễn Văn Linh   │
└─────────────────────────────┘
```

**Effort**: 1 ngày

#### F3: Quick Actions Card
**Vấn đề**: Phải tap nhiều lần mới đến được action cần làm
**Giải pháp**: Card quick actions trên home screen

```
┌────────────────────────────────┐
│ ⚡ Cần xử lý                   │
│                                │
│ 📋 3 báo giá chờ duyệt  [→]  │
│ 🏖 1 đơn nghỉ phép chờ  [→]  │
│ 🛒 2 đơn mua chờ nhận   [→]  │
└────────────────────────────────┘
```

**Effort**: 1-2 ngày

#### F4: GPS Check-in/Check-out
**Vấn đề**: Không track được nhân viên đến/đi hiện trường
**Giải pháp**: Nút Check-in trên Event Detail

```
┌────────────────────────────────┐
│ 📍 Check-in: Tiệc cưới Nguyễn │
│                                │
│ [📍 CHECK IN]  (location: ✅)  │
│                                │
│ Thời gian: 16:45               │
│ Vị trí: 123 NVL, Q7           │
│                                │
│ ⏱️ Đang làm: 2h 15m           │
│                                │
│ [📍 CHECK OUT]                 │
└────────────────────────────────┘
```

**Backend API**: `POST /api/v1/mobile/check-in` (cần tạo mới)  
**Effort**: 3-4 ngày (FE + BE)

---

### 🟡 Priority 2: High (Nên làm trong 2 tuần)

#### F5: Push Notification (Native FCM/APNs)
**Vấn đề**: Chỉ có in-app notification, user phải mở app để biết
**Giải pháp**: Integrate `expo-notifications` + FCM
**Hạ tầng**: Đã có `expo-notifications` installed, cần backend push service
**Effort**: 3-4 ngày

#### F6: Photo Documentation
**Vấn đề**: Không lưu ảnh setup tiệc, receipt, inspection
**Giải pháp**: Camera module + attach ảnh vào Order/Event
**Effort**: 2-3 ngày

#### F7: Quick Approve Panel
**Vấn đề**: Manager phải mở web để phê duyệt
**Giải pháp**: Aggregate pending items → one-tap approve/reject

```
┌────────────────────────────────┐
│ 📋 Chờ duyệt (5)              │
│                                │
│ BG-2024-045  Tiệc ABC  20M    │
│      [❌ Từ chối]  [✅ Duyệt]  │
│                                │
│ ĐN-015  Nguyễn Văn A  3 ngày  │
│      [❌ Từ chối]  [✅ Duyệt]  │
└────────────────────────────────┘
```

**Effort**: 2-3 ngày

#### F8: Biometric Login
**Vấn đề**: Đã có `expo-local-authentication` nhưng chưa implement
**Giải pháp**: Enable Face ID / Fingerprint cho subsequent logins
**Effort**: 1 ngày (package đã installed)

---

### 🟢 Priority 3: Nice-to-have (Backlog)

| # | Feature | Effort | Benefit |
|:-:|:--------|:------:|:--------|
| F9 | Offline-First Engine (SQLite sync) | 5 ngày | Dùng được khi mất mạng |
| F10 | QR Code Scanner (inventory/check-in) | 2 ngày | Quét nhanh mã hàng |
| F11 | Signature Capture (delivery confirm) | 2 ngày | Xác nhận giao hàng |
| F12 | Voice Notes | 1 ngày | Ghi chú nhanh bằng giọng nói |
| F13 | Dark Mode | 1 ngày | Tiết kiệm pin ban đêm |
| F14 | Onboarding Tutorial | 2 ngày | Hướng dẫn nhân viên mới |
| F15 | Real-time WebSocket | 3 ngày | Live updates đơn hàng |

---

## 4. Roadmap Đề Xuất

```
Sprint 1 (Tuần 1-2):
├── F1: Role-Based Tabs ────── 2 ngày
├── F2: Today Widget ──────── 1 ngày
├── F3: Quick Actions Card ── 2 ngày
└── F8: Biometric Login ───── 1 ngày
                              = 6 ngày

Sprint 2 (Tuần 3-4):
├── F4: GPS Check-in ──────── 4 ngày
├── F7: Quick Approve ─────── 3 ngày
└── F6: Photo Documentation ─ 3 ngày
                              = 10 ngày

Sprint 3 (Tuần 5-6):
├── F5: Push Notification ─── 4 ngày
├── F9: Offline Engine ────── 5 ngày
└── F10: QR Scanner ──────── 2 ngày
                              = 11 ngày
```

**Tổng**: ~27 ngày cho 10 features quan trọng nhất

---

## 5. So Sánh Trước/Sau

| Tiêu chí | Trước | Sau Sprint 1-2 |
|:---------|:-----:|:---------:|
| Tabs phù hợp role | ❌ | ✅ |
| Tổng quan ngày | ❌ | ✅ |
| Quick actions | ❌ | ✅ |
| GPS check-in | ❌ | ✅ |
| Photo attach | ❌ | ✅ |
| Quick approve | ❌ | ✅ |
| Biometric login | ❌ | ✅ |
| **Feature Coverage** | **60%** | **85%** |

---

## Sources
- Internal: `PRD-mobile-platform.md`, codebase scan (`mobile/app/`)
- Industry knowledge: CaterTrax, Total Party Planner, Curate, FoodStorm
- Research mode: KB Fallback (web search unavailable)
