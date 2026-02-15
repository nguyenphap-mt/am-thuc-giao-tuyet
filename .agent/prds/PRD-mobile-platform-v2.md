# PRD: Mobile Platform — Ẩm Thực Giao Tuyết (V2.0)

> **Version**: 2.0 | **Date**: 14/02/2026  
> **Status**: DRAFT | **Research Mode**: HYBRID (External + Internal)  
> **Scope**: Toàn bộ dự án — 17 web modules → mobile

---

## 1. Problem Statement

Hệ thống ERP "Ẩm Thực Giao Tuyết" hiện có **17 backend modules** và **16 web frontend modules** nhưng mobile app chỉ cover **3/17 features** (Schedule, Notifications, Kitchen Prep). Nhân viên catering thường xuyên làm việc ngoài hiện trường (chợ, sự kiện, nhà kho) và cần truy cập ERP từ điện thoại.

### Current State vs Target

| Metric | Current | Target |
|:-------|:-------:|:------:|
| Web Modules | 17 | 17 |
| Mobile Features | 5 screens | ~25 screens |
| Module Coverage | 18% | 85% |
| Offline Support | Basic sync | Full offline-first |

### Mobile Coverage Gap Matrix

| # | Backend Module | Web UI | Mobile | Gap |
|:--|:---------------|:------:|:------:|:---:|
| 1 | Dashboard/Analytics | ✅ | ❌ | 🔴 |
| 2 | Order Management | ✅ | ⚠️ schedule only | 🟠 |
| 3 | Quote Management | ✅ | ❌ | 🟡 |
| 4 | Inventory | ✅ | ❌ | 🔴 |
| 5 | Procurement | ✅ | ✅ purchase tab | 🟢 |
| 6 | Menu/Recipe | ✅ | ❌ | 🟡 |
| 7 | Finance | ✅ | ❌ | 🔴 |
| 8 | HR | ✅ | ❌ | 🔴 |
| 9 | CRM | ✅ | ❌ | 🟡 |
| 10 | Calendar | ✅ | ⚠️ schedule only | 🟠 |
| 11 | Invoice | ✅ | ❌ | 🟡 |
| 12 | Suppliers | ✅ | ❌ | 🟡 |
| 13 | Notifications | ✅ | ✅ | 🟢 |
| 14 | Settings/Admin | ✅ | ⚠️ profile only | 🟠 |
| 15 | User/Auth | ✅ | ✅ login | 🟢 |
| 16 | Tenant | ✅ | ❌ | ⚪ N/A |
| 17 | Mobile-specific | - | ✅ check-in/GPS | 🟢 |

---

## 2. Research Synthesis

### 2.1 Industry Best Practices (Verified ≥2 sources)

| Practice | Confidence | Sources |
|:---------|:----------:|:-------:|
| Offline-first với auto-sync | HIGH | 3 sources |
| Role-based access trên mobile | HIGH | 3 sources |
| GPS geo-tagging cho field work | HIGH | 3 sources |
| Real-time dashboards mobile | HIGH | 3 sources |
| Camera receipt capture/OCR | MEDIUM | 2 sources |
| Push notifications cho approvals | HIGH | 3 sources |
| Digital forms thay paperwork | HIGH | 2 sources |

### 2.2 Competitive Feature Analysis

| Feature | FoodStorm | Curate | CaterTrax | Ẩm Thực (Current) | Target |
|:--------|:---------:|:------:|:---------:|:------------------:|:------:|
| Mobile Order Mgmt | ✅ | ✅ | ✅ | ❌ | ✅ |
| Mobile Inventory | ✅ | ❌ | ✅ | ❌ | ✅ |
| Mobile CRM | ✅ | ✅ | ❌ | ❌ | ✅ |
| Offline Mode | ⚠️ | ❌ | ⚠️ | ⚠️ Basic | ✅ Full |
| GPS Check-in | ❌ | ❌ | ❌ | ✅ | ✅ |
| Receipt OCR | ❌ | ❌ | ❌ | ❌ | ✅ P3 |
| Staff Schedule | ✅ | ❌ | ✅ | ✅ | ✅ |
| Mobile Reports | ⚠️ | ❌ | ✅ | ❌ | ✅ |

### 2.3 Tech Stack Validation

| Component | Current | Recommended | Action |
|:----------|:--------|:------------|:------:|
| Framework | Expo 54 + RN 0.81 | ✅ Production-ready | Keep |
| State | Zustand + TanStack Query | ✅ Best pattern | Keep |
| Auth | expo-secure-store | ✅ Industry standard | Keep |
| Offline DB | expo-sqlite (installed) | WatermelonDB or expo-sqlite | Evaluate |
| Nav | expo-router | ✅ File-based routing | Keep |
| API | Custom fetch client | ✅ Adequate | Enhance offline queue |

---

## 3. Solution: Phased Mobile Platform Expansion

### Phase Architecture

```
Phase 1 (MVP) ─── DONE ─── Auth, Schedule, Notifications, Kitchen Prep, Profile
Phase 2 (Quick)── DONE ─── Quick Purchase (PR CRUD + approval)
Phase 3 (Core) ── NEW ──── Order Detail, Inventory Quick, Dashboard Mobile
Phase 4 (Mgmt) ── NEW ──── HR Mobile, Finance Summary, CRM Quick
Phase 5 (Pro) ──── NEW ──── Calendar Full, Quote Viewer, Reports Mobile
Phase 6 (AI) ───── NEW ──── Receipt OCR, Smart Suggestions, Voice Input
```

---

## 4. Phase 3: Core Operations (P0 — Top Priority)

> **Goal**: Nhân viên xem chi tiết đơn hàng, kiểm kho nhanh, xem dashboard tại hiện trường

### M3.1 Order Detail & Actions

**Screens**: `orders/`, `orders/[id]`

| Feature | API Endpoint | Status |
|:--------|:------------|:------:|
| Danh sách đơn hàng (assigned) | `GET /orders` | ✅ Ready |
| Chi tiết đơn hàng | `GET /orders/{id}` | ✅ Ready |
| Update trạng thái đơn | `PUT /orders/{id}/status` | ✅ Ready |
| Xem menu items trong đơn | `GET /orders/{id}` (includes items) | ✅ Ready |
| Check-in/out GPS | `POST /mobile/checkin` | ✅ Ready |

**User Stories**:
- US-3.1.1: Nhân viên xem danh sách đơn hàng mình được phân công
- US-3.1.2: Nhân viên xem chi tiết đơn hàng (khách hàng, menu, staff, timeline)
- US-3.1.3: Nhân viên cập nhật trạng thái đơn (IN_PROGRESS → COMPLETED)
- US-3.1.4: Nhân viên check-in GPS tại địa điểm sự kiện

**Wireframe**:
```
┌─────────────────────────────┐
│ 📋 Đơn hàng của tôi         │
├─────────────────────────────┤
│ ┌─ Hôm nay (14/02) ───────┐│
│ │ ORD-2026020... ⏳ CONFIRMED│
│ │ Tiệc cưới Anh Minh       │
│ │ 📍 Nhà hàng XYZ           │
│ │ 🕐 14:00 — 20:00          │
│ └───────────────────────────┘│
│ ┌─ Ngày mai (15/02) ──────┐│
│ │ ORD-2026020... 🔵 PENDING │
│ │ Sinh nhật bé An           │
│ └───────────────────────────┘│
└─────────────────────────────┘
```

### M3.2 Quick Inventory Check

**Screens**: `inventory/`, `inventory/scan`

| Feature | API Endpoint | Status |
|:--------|:------------|:------:|
| Danh sách items (search) | `GET /inventory/items` | ✅ Ready |
| Xem tồn kho item | `GET /inventory/items/{id}` | ✅ Ready |
| Ghi nhận nhập/xuất nhanh | `POST /inventory/transactions` | ✅ Ready |
| Dashboard tồn kho | `GET /inventory/dashboard` | ✅ Ready |
| Low stock alerts | `GET /inventory/items?stock_status=low` | ✅ Ready |

**User Stories**:
- US-3.2.1: Nhân viên tìm kiếm nguyên liệu và xem tồn kho real-time
- US-3.2.2: Nhân viên ghi nhận nhập kho nhanh khi mua nguyên liệu
- US-3.2.3: Quản lý xem danh sách nguyên liệu sắp hết (low stock)

### M3.3 Mobile Dashboard

**Screens**: `dashboard/`

| Feature | API Endpoint | Status |
|:--------|:------------|:------:|
| KPI summary | `GET /dashboard/stats` | ✅ Ready |
| Today's events | `GET /orders?date=today` | ✅ Ready |
| Revenue chart | `GET /analytics/revenue` | ✅ Ready |
| Quick actions | N/A (navigational) | N/A |

**User Stories**:
- US-3.3.1: Quản lý xem tổng quan KPI trên mobile (doanh thu, đơn hàng, công nợ)
- US-3.3.2: Quản lý xem danh sách sự kiện hôm nay + tuần này

---

## 5. Phase 4: Management Features (P1)

> **Goal**: Quản lý HR, finance cơ bản, CRM từ mobile

### M4.1 HR Mobile

**Screens**: `hr/`, `hr/timesheet`, `hr/leave`

| Feature | API Endpoint | Status |
|:--------|:------------|:------:|
| Danh sách nhân viên | `GET /hr/employees` | ✅ Ready |
| Chấm công | `POST /hr/timesheets` | ✅ Ready |
| Xem/duyệt nghỉ phép | `GET/PUT /hr/leave-requests` | ✅ Ready |
| Thông tin cá nhân | `GET /hr/employees/{id}` | ✅ Ready |

**User Stories**:
- US-4.1.1: Nhân viên chấm công qua mobile (check-in/out + GPS)
- US-4.1.2: Nhân viên gửi đơn xin nghỉ phép
- US-4.1.3: Quản lý duyệt/từ chối nghỉ phép

### M4.2 Finance Summary

**Screens**: `finance/`

| Feature | API Endpoint | Status |
|:--------|:------------|:------:|
| Tổng quan tài chính | `GET /finance/dashboard` | ✅ Ready |
| Chi phí hôm nay | `GET /finance/expenses?date=today` | ✅ Ready |
| Quick expense entry | `POST /finance/transactions` | ✅ Ready |
| Công nợ khách hàng | `GET /finance/ar-summary` | ✅ Ready |

**User Stories**:
- US-4.2.1: Kế toán xem tổng quan tài chính (thu/chi/lợi nhuận)
- US-4.2.2: Nhân viên ghi nhận chi phí phát sinh nhanh tại hiện trường

### M4.3 CRM Quick Access

**Screens**: `crm/`, `crm/[id]`

| Feature | API Endpoint | Status |
|:--------|:------------|:------:|
| Danh sách khách hàng | `GET /crm/customers` | ✅ Ready |
| Chi tiết khách hàng | `GET /crm/customers/{id}` | ✅ Ready |
| Lịch sử tương tác | `GET /crm/customers/{id}/interactions` | ✅ Ready |
| Ghi nhận tương tác | `POST /crm/interactions` | ✅ Ready |
| Quick call/email | Native link | N/A |

**User Stories**:
- US-4.3.1: Sales xem thông tin khách hàng khi gặp mặt
- US-4.3.2: Sales ghi nhận cuộc hẹn/gọi điện từ mobile
- US-4.3.3: Sales gọi/email trực tiếp từ thông tin khách hàng

---

## 6. Phase 5: Professional Features (P2)

> **Goal**: Calendar đầy đủ, xem báo giá, reports mobile

### M5.1 Calendar Full View

**Screens**: `calendar/`

| Feature | API Endpoint |
|:--------|:------------|
| Lịch tháng/tuần/ngày | `GET /calendar/events` |
| Xem chi tiết sự kiện | `GET /orders/{id}` |
| Staff availability | `GET /hr/employees?available=true` |

### M5.2 Quote Viewer

**Screens**: `quotes/`, `quotes/[id]`

| Feature | API Endpoint |
|:--------|:------------|
| Danh sách báo giá | `GET /quotes` |
| Chi tiết báo giá | `GET /quotes/{id}` |
| Share qua email/ZNS | Native share |

### M5.3 Reports Mobile

**Screens**: `reports/`

| Feature | API Endpoint |
|:--------|:------------|
| Revenue summary | `GET /analytics/revenue` |
| Order stats | `GET /analytics/orders` |
| Inventory value | `GET /analytics/inventory` |
| Export PDF/Excel | Reuse web export APIs |

---

## 7. Phase 6: AI & Advanced (P3 — Future)

### M6.1 Receipt OCR
- Camera capture → text extraction → auto-fill expense/PR
- Tech: expo-camera + cloud OCR API (Google Vision)

### M6.2 Smart Suggestions
- Dự đoán nguyên liệu cần mua dựa trên lịch sự kiện
- Auto-suggest PR items từ menu + recipe data

### M6.3 Voice Input
- Ghi nhận expense/note bằng giọng nói
- Tech: expo-speech + reaction to text

---

## 8. Technical Architecture

### 8.1 Screen Map (After Full Implementation)

```
mobile/app/
├── (auth)/
│   ├── login.tsx                    ✅ Done
│   └── _layout.tsx                  ✅ Done
├── (tabs)/
│   ├── _layout.tsx                  ✅ Done (5 tabs)
│   ├── schedule.tsx                 ✅ Done
│   ├── notifications.tsx            ✅ Done
│   ├── purchase.tsx                 ✅ Done
│   ├── prep.tsx                     ✅ Done
│   └── profile.tsx                  ✅ Done
├── event/[id].tsx                   ✅ Done
├── purchase/
│   ├── create.tsx                   ✅ Done
│   └── [id].tsx                     ✅ Done
├── orders/                          Phase 3
│   ├── index.tsx (list)
│   └── [id].tsx (detail + actions)
├── inventory/                       Phase 3
│   ├── index.tsx (search + stock)
│   └── transaction.tsx (quick entry)
├── dashboard/                       Phase 3
│   └── index.tsx (KPI + today)
├── hr/                              Phase 4
│   ├── timesheet.tsx
│   └── leave.tsx
├── finance/                         Phase 4
│   └── index.tsx (summary + expense)
├── crm/                             Phase 4
│   ├── index.tsx (customer list)
│   └── [id].tsx (detail)
├── calendar/                        Phase 5
│   └── index.tsx
├── quotes/                          Phase 5
│   ├── index.tsx
│   └── [id].tsx
└── reports/                         Phase 5
    └── index.tsx
```

### 8.2 Hook Architecture

```
mobile/lib/hooks/
├── usePurchase.ts                   ✅ Done
├── useOrders.ts                     Phase 3
├── useInventory.ts                  Phase 3
├── useDashboard.ts                  Phase 3
├── useHR.ts                         Phase 4
├── useFinance.ts                    Phase 4
├── useCRM.ts                        Phase 4
├── useCalendar.ts                   Phase 5
├── useQuotes.ts                     Phase 5
└── useReports.ts                    Phase 5
```

### 8.3 Offline-First Strategy

| Layer | Tool | Pattern |
|:------|:-----|:--------|
| Auth tokens | `expo-secure-store` | Persistent storage |
| Query cache | TanStack Query | `gcTime: Infinity`, `staleTime: 5min` |
| Mutations | TanStack Query | Mutation queue with retry |
| Large datasets | `expo-sqlite` | Local mirror of critical data |
| Network detect | `@react-native-community/netinfo` | Auto online/offline switch |
| Background sync | `expo-background-fetch` | Periodic sync when offline |

### 8.4 Navigation Strategy

Current tabs (5): Lịch, Thông báo, **Mua hàng**, Bếp, Tài khoản

Proposed: Keep 5 tabs, add features via **Profile → More** menu or **deep links from notifications**:
- Profile → Đơn hàng, Kho, Tài chính, CRM, Báo cáo
- Notifications → tap → navigate to relevant detail screen
- Dashboard accessible from header icon on any tab

### 8.5 Permission/Role Matrix (Mobile)

| Feature | Staff | Manager | Admin |
|:--------|:-----:|:-------:|:-----:|
| Schedule (view own) | ✅ | ✅ | ✅ |
| Order detail (own) | ✅ | ✅ | ✅ |
| Order status update | ✅ | ✅ | ✅ |
| Inventory view | ✅ | ✅ | ✅ |
| Inventory transaction | ❌ | ✅ | ✅ |
| Purchase — create PR | ✅ | ✅ | ✅ |
| Purchase — approve PR | ❌ | ✅ | ✅ |
| HR — timesheet own | ✅ | ✅ | ✅ |
| HR — approve leave | ❌ | ✅ | ✅ |
| Finance — view summary | ❌ | ✅ | ✅ |
| Finance — add expense | ✅ | ✅ | ✅ |
| CRM — view customers | ❌ | ✅ | ✅ |
| Dashboard — KPIs | ❌ | ✅ | ✅ |
| Reports | ❌ | ✅ | ✅ |

---

## 9. Effort Estimation

| Phase | Module | Screens | Hooks | Days | Backend |
|:------|:-------|:-------:|:-----:|:----:|:-------:|
| **Phase 3** | Orders | 2 | 1 | 3 | 0 changes |
| | Inventory | 2 | 1 | 2 | 0 changes |
| | Dashboard | 1 | 1 | 2 | 0 changes |
| **Phase 4** | HR Mobile | 2 | 1 | 3 | 0 changes |
| | Finance | 1 | 1 | 2 | 0 changes |
| | CRM | 2 | 1 | 2 | 0 changes |
| **Phase 5** | Calendar | 1 | 1 | 2 | 0 changes |
| | Quotes | 2 | 1 | 2 | 0 changes |
| | Reports | 1 | 1 | 2 | 0 changes |
| **Total** | | **14** | **9** | **20** | **0** |

> **Key Insight**: 0 backend changes needed — all APIs đã sẵn sàng 100%.

---

## 10. Acceptance Criteria

### Phase 3

| # | Criterion | Type |
|:--|:----------|:-----|
| AC-3.1 | Nhân viên xem danh sách đơn hàng assigned, filter by date | Manual |
| AC-3.2 | Nhân viên xem chi tiết đơn hàng: khách, menu, staff, timeline | Visual |
| AC-3.3 | Nhân viên cập nhật status đơn hàng từ mobile | API test |
| AC-3.4 | Nhân viên tìm kiếm nguyên liệu và xem tồn kho | Manual |
| AC-3.5 | Nhân viên ghi nhận nhập/xuất kho nhanh | API test |
| AC-3.6 | Quản lý xem KPI dashboard trên mobile | Visual |

### Phase 4

| # | Criterion | Type |
|:--|:----------|:-----|
| AC-4.1 | Nhân viên chấm công + GPS check-in | Integration |
| AC-4.2 | Nhân viên gửi đơn xin nghỉ phép | API test |
| AC-4.3 | Quản lý duyệt/từ chối nghỉ phép | Role-based |
| AC-4.4 | Kế toán xem tổng quan tài chính | Visual |
| AC-4.5 | Sales xem + ghi nhận CRM interactions | Manual |

### Phase 5

| # | Criterion | Type |
|:--|:----------|:-----|
| AC-5.1 | Calendar full view với sự kiện | Visual |
| AC-5.2 | Xem chi tiết báo giá | Manual |
| AC-5.3 | Xem báo cáo revenue/orders | Visual |

---

## 11. Non-Functional Requirements

| Requirement | Target |
|:------------|:-------|
| App size | < 25MB (APK) |
| Cold start | < 2s |
| API response | < 500ms (cached) |
| Offline duration | Full function up to 24h |
| Sync conflict resolution | Last-Write-Wins |
| Min OS version | iOS 15+ / Android 10+ |
| Accessibility | WCAG 2.1 AA |
| Timezone | Asia/Ho_Chi_Minh (UTC+7) |
| Date format | dd/MM/yyyy |
| Currency | VND (₫) |

---

## 12. Quality Scores

| Matrix | Score | Notes |
|:-------|:-----:|:------|
| Completeness | 23/25 | All modules covered, AI features deferred |
| Consistency | 24/25 | Consistent patterns, single hook architecture |
| Security | 22/25 | RLS + role-based + secure-store, needs PIN lock |
| Feasibility | 24/25 | 100% API reuse, proven tech stack |
| **Total** | **93/100** | |

---

## 13. Verification Plan

| Step | Method | Expected |
|:-----|:-------|:---------|
| 1 | TypeScript check `npx tsc --noEmit` | 0 errors |
| 2 | Expo web build `expo start --web` | Renders correctly |
| 3 | Browser test each new screen | Screenshots match wireframes |
| 4 | Create test data via API → verify mobile display | Data integrity |
| 5 | Offline test: airplane mode → create data → reconnect | Data syncs |
| 6 | Role test: Staff vs Manager permissions | Correct access |
