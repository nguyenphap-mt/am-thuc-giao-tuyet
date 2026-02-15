# 🗺️ ROADMAP - ẨM THỰC GIÁO TUYẾT

> **Hệ thống Quản lý Dịch vụ Catering cho Tiệc Tại Nhà**
> **Cập nhật**: 2026-01-27
> **Phiên bản**: 4.0
> **Master PRD**: `.agent/MASTER-PRD.md`

---

## 📊 PHÂN TÍCH HIỆN TRẠNG (18/01/2026)

### Tổng quan Components

| Layer | Số lượng | Status |
| :--- | :---: | :---: |
| **Backend Modules** | 13 | ✅ Có code |
| **Frontend Modules** | 13 | ✅ Có code |
| **DB Migrations** | 20 | ✅ Có files |
| **API Routes** | 14 | ✅ Registered |
| **User Documentation** | 1 | ❌ Thiếu nhiều |
| **Unit Tests** | 0 | ❌ Chưa có |

### Chi Tiết Modules

| Module | Backend | Frontend | DB | API | Docs | Tests | UI Polish |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Auth** | ✅ | ✅ | ✅ 003 | ✅ | ❌ | ❌ | ⚠️ |
| **Menu** | ✅ | ✅ | ✅ 004 | ✅ | ❌ | ❌ | ⚠️ |
| **Quote** | ✅ | ✅ | ✅ 005,006,008 | ✅ | ⚠️ mockup | ❌ | ✅ |
| **Order** | ✅ | ✅ | ✅ 006,015 | ✅ | ❌ | ❌ | ⚠️ |
| **Calendar** | ✅ | ✅ | ✅ 007 | ✅ | ❌ | ❌ | ⚠️ |
| **Procurement** | ✅ | ✅ | ✅ 008 | ✅ | ❌ | ❌ | ⚠️ |
| **HR** | ✅ | ✅ | ✅ 009 | ✅ | ❌ | ❌ | ⚠️ |
| **Finance** | ✅ | ✅ | ✅ 010 | ✅ | ❌ | ❌ | ⚠️ |
| **CRM** | ✅ | ✅ | ✅ 011,021,022 | ✅ | ✅ | ✅ | ✅ |
| **Mobile** | ✅ | ❌ | ✅ 012 | ✅ | ❌ | ❌ | N/A |
| **Notification** | ✅ | ❌ | - | ✅ | ❌ | ❌ | N/A |
| **Inventory** | ✅ | ✅ | ✅ 013,016 | ✅ | ❌ | ❌ | ⚠️ |
| **Dashboard** | ✅ | ✅ | - | ✅ | ❌ | ❌ | ✅ |
| **Analytics** | ✅ | ✅ | - | ✅ | ❌ | ❌ | ⚠️ |

**Legend**: ✅ Done | ⚠️ Cần cải thiện | ❌ Chưa có

---

## 🎯 PHÂN TÍCH NHU CẦU NGƯỜI DÙNG

### Nhân viên (Staff) cần:
1. **Xem lịch tiệc** - Calendar view đơn giản
2. **Xem thực đơn** - Menu items, công thức
3. **Nhận thông báo** - Assignments, reminders
4. **Chấm công** - Timesheet (❌ chưa có UI)

### Quản lý (Manager) cần:
1. **Tạo báo giá** - Quote Wizard ✅
2. **Quản lý đơn hàng** - Order management ✅
3. **Lên lịch nhân sự** - HR scheduling ⚠️
4. **Xem báo cáo tài chính** - Finance reports ⚠️
5. **Quản lý khách hàng** - CRM ✅ (Auto-Sync, RFM)
6. **Quản lý nguyên liệu** - Inventory ⚠️

### Chủ doanh nghiệp (Owner) cần:
1. **Dashboard tổng quan** - KPIs ✅
2. **Báo cáo doanh thu** - Revenue reports ⚠️
3. **Phân tích xu hướng** - Analytics ⚠️

---

## ✅ COMPLETED PHASES (1-6)

### Phase 1: Foundation & Sales ✅
- Auth, Menu, Quote, Order

### Phase 2: Operations ✅
- Calendar, Procurement, HR

### Phase 3: Finance & CRM ✅
- Finance, CRM, Analytics

### Phase 4: Mobile & Optimization ✅
- Mobile API, Notification, Inventory

### Phase 5: Dashboard ✅
- Dashboard KPI với Linear Design

### Phase 6: AI Workforce ✅
- Workflows, Specialists, Auto-build, Auto-doc

---

## 🔄 PHASE 7: USER EXPERIENCE POLISH ✅ COMPLETE

> **Status**: ✅ COMPLETED (19/01/2026)
> **Browser Test**: ✅ ALL PASSED - Quote, Order, Dashboard, Calendar, HR, Inventory, Finance

### 7.1 Quote Module ⭐ VERIFIED
| Task | Status | Notes |
| :--- | :---: | :--- |
| Quote Wizard 5-step | ✅ Done | Mượt mà |
| PDF Preview | ✅ Done | Modal đẹp |
| Real-time Calculation | ✅ Done | Working |
| Email Integration | ⬜ | Future |

### 7.2 Order Module ⭐ VERIFIED
| Task | Status | Notes |
| :--- | :---: | :--- |
| Order Dashboard | ✅ Done | Status cards OK |
| Status Filtering | ✅ Done | Working |
| Color Badges | ✅ Done | Đẹp |

### 7.3 Calendar Module ✅ FIXED
| Task | Status | Notes |
| :--- | :---: | :--- |
| Calendar Grid | ✅ Done | Renders OK |
| Events Display | ✅ Fixed | Events hiển thị đúng ngày |
| Weekday Headers | ✅ Done | CN, T2...T7 |
| Navigation | ✅ Done | ← → buttons |
| Staff Assignment | ⬜ | Pending |

### 7.4 HR Module ✅ VERIFIED
| Task | Status | Notes |
| :--- | :---: | :--- |
| Employee List | ✅ Done | 5 employees với roles |
| Timesheet UI | ⬜ | Future (Phase 9+) |
| Staff Schedule | ⬜ | Future (Phase 9+) |

### 7.5 Inventory Module ✅ VERIFIED
| Task | Status | Notes |
| :--- | :---: | :--- |
| Stock Dashboard | ✅ Done | 5 items với stock/price |
| Low Stock Alerts | ⬜ | Future |
| CRUD Operations | ✅ Done | API works |

### 7.6 Finance Module ✅ VERIFIED
| Task | Status | Notes |
| :--- | :---: | :--- |
| Chart of Accounts | ✅ Done | 7 accounts |
| Revenue Dashboard | ⬜ | Future (Phase 9+) |
| Expense Tracking | ⬜ | Future (Phase 9+) |

---

## 📋 PHASE 8: DOCUMENTATION (P1)

> **Mục tiêu**: Viết tài liệu hướng dẫn cho người dùng
> **Status**: ✅ COMPLETED (18/01/2026)

| Module | File | Status |
| :--- | :--- | :---: |
| **Dashboard** | `.doc/dashboard-guide.md` | ✅ Done |
| **Quote** | `.doc/quote-guide.md` | ✅ Done |
| **Order** | `.doc/order-guide.md` | ✅ Done |
| **Calendar** | `.doc/calendar-guide.md` | ✅ Done |
| **Menu** | `.doc/menu-guide.md` | ✅ Done |
| **HR** | `.doc/hr-guide.md` | ✅ Done |
| **Inventory** | `.doc/inventory-guide.md` | ✅ Done |
| **Finance** | `.doc/finance-guide.md` | ✅ Done |
| **CRM** | `.doc/crm-guide.md` | ✅ Done |

**Yêu cầu mỗi guide**:
- Viết bằng tiếng Việt
- Có screenshots
- Hướng dẫn từng bước
- FAQ section

---

## 📋 PHASE 9: TESTING & QUALITY (P1)

> **Mục tiêu**: Đảm bảo chất lượng code
> **Timeline**: 1 tuần

| Task | Type | Priority |
| :--- | :--- | :---: |
| Backend Unit Tests | Testing | P0 |
| RLS Security Tests | Security | P0 |
| Browser E2E Tests | Testing | P1 |
| Performance Testing | Optimization | P1 |

---

## 📋 PHASE 10: PRODUCTION DEPLOYMENT (P2)

> **Mục tiêu**: Deploy lên production
> **Timeline**: 1 tuần

| Task | Type | Status |
| :--- | :--- | :---: |
| Docker Compose | DevOps | ⬜ |
| Vercel Frontend | Deploy | ⬜ |
| Railway/Render Backend | Deploy | ⬜ |
| Supabase/Neon DB | Database | ⬜ |
| Domain + SSL | Security | ⬜ |

---

## 📋 PHASE 11: ADVANCED FEATURES (P3 - FUTURE)

| Feature | Mô tả | Priority |
| :--- | :--- | :---: |
| Command Palette (Cmd+K) | Linear-style global search | P2 |
| Real-time Updates | WebSocket live data | P2 |
| Mobile App | React Native cho staff | P3 |
| WhatsApp Integration | Gửi thông báo qua Zalo/WhatsApp | P2 |
| AI Menu Suggestions | AI đề xuất thực đơn | P3 |

---

## 📋 PHASE 12: ORDER-KITCHEN INTEGRATION (P0) ⭐ NEW

> **Mục tiêu**: Tích hợp Order với Kitchen và Inventory
> **Timeline**: 2 tuần
> **Reference**: `.agent/business-flows/04-integration-flows.md`

| Task | Module | Priority | Effort |
| :--- | :--- | :---: | :---: |
| **Kitchen Prep Sheet Generation** | Order | P0 | 3 days |
| └─ Generate prep sheet from confirmed order | | | |
| └─ Group items by category + prep time | | | |
| └─ Include special dietary requirements | | | |
| **Inventory Pull Sheet** | Order + Inventory | P0 | 4 days |
| └─ Calculate ingredients from menu items | | | |
| └─ FIFO lot selection | | | |
| └─ Shortfall detection + PO suggestion | | | |
| **Auto-Reorder from Low Stock** | Inventory + Procurement | P0 | 3 days |
| └─ Daily job to check min stock levels | | | |
| └─ Auto-create Purchase Requisition | | | |
| └─ Notify procurement team | | | |

---

## 📋 PHASE 13: CRM LOYALTY ENHANCEMENT (P0) ⭐ NEW

> **Mục tiêu**: Xây dựng chương trình khách hàng thân thiết
> **Timeline**: 2 tuần
> **Reference**: `.artifacts/research/CRM-Loyalty-Program-Catering.md`

| Task | Module | Priority | Effort |
| :--- | :--- | :---: | :---: |
| **Loyalty Points Module** | CRM | P0 | 7 days |
| └─ Points earning (1 point / 10,000 VND) | | | |
| └─ Points balance tracking | | | |
| └─ Points redemption | | | |
| **Loyalty Tiers** | CRM | P1 | 3 days |
| └─ Bronze → Silver → Gold → Platinum | | | |
| └─ Auto-upgrade based on points | | | |
| └─ Tier-based discounts | | | |
| **Payment Reminder System** | Finance | P0 | 2 days |
| └─ Overdue payment detection | | | |
| └─ Email/SMS reminder automation | | | |
| └─ Dashboard notification | | | |

---

## 📋 PHASE 14: PRODUCTIVITY TOOLS (P1) ⭐ NEW

> **Mục tiêu**: Tăng năng suất cho Sales và Operations
> **Timeline**: 1 tuần

| Task | Module | Priority | Effort |
| :--- | :--- | :---: | :---: |
| **Quote Templates** | Quote | P1 | 3 days |
| └─ Create templates for event types | | | |
| └─ Preset menu items + services | | | |
| └─ Quick apply to new quotes | | | |
| **Clone Quote** | Quote | P2 | 1 day |
| └─ Duplicate existing quote | | | |
| └─ Auto-clear customer info | | | |
| **Pre-event Confirmation** | Order | P1 | 2 days |
| └─ T-2 days reminder to customer | | | |
| └─ T-1 day reminder to staff | | | |
| └─ Confirmation tracking | | | |

---

## 📋 PHASE 15: RECIPE & ALERTS (P1) ⭐ NEW

> **Mục tiêu**: Quản lý công thức và cảnh báo
> **Timeline**: 1.5 tuần

| Task | Module | Priority | Effort |
| :--- | :--- | :---: | :---: |
| **Recipe Management** | Menu | P1 | 5 days |
| └─ Recipe model with ingredients | | | |
| └─ Link to inventory items | | | |
| └─ Auto-calculate food cost | | | |
| └─ Portion scaling by guest count | | | |
| **Expiry Alert System** | Inventory | P1 | 2 days |
| └─ Daily check for expiring lots | | | |
| └─ 7-day and 3-day alerts | | | |
| └─ Dashboard widget | | | |

---

## 🎯 ĐỀ XUẤT THỰC HIỆN NGAY

### Tuần 1: Core User Experience
1. **Quote Module Polish** - Verify wizard, PDF export
2. **Order Dashboard** - Kanban view
3. **Calendar Polish** - Linear Design

### Tuần 2: Operations
4. **HR Timesheet UI** - Chấm công
5. **Inventory Dashboard** - Tồn kho
6. **Finance Reports** - Doanh thu

### Tuần 3: Documentation
7. Viết User Guides (Vietnamese) cho top 5 modules

### Tuần 4: Testing & Deploy
8. Unit tests cho critical paths
9. Production deployment

---

## 📂 KEY FILES

| Document | Path |
| :--- | :--- |
| **Master PRD** | `.agent/MASTER-PRD.md` |
| **Roadmap** | `.agent/ROADMAP.md` |
| **Business Flows** | `.agent/business-flows/` |
| ├─ Module Inventory | `01-module-inventory.md` |
| ├─ Best Practices | `02-best-practices-summary.md` |
| ├─ Deep Dive | `03-per-module-deep-dive.md` |
| └─ Integration Flows | `04-integration-flows.md` |
| **Permission Matrix** | `.agent/permission-matrix.md` |
| **Core Rules** | `prompts/rules/core.md` |
| **Orchestrator** | `prompts/orchestrator.md` |
| **API Contracts** | `.agent/api-contracts.md` |

---

## 📝 CHANGELOG

| Date | Version | Changes |
| :--- | :--- | :--- |
| 2026-01-27 | 4.0 | Added MASTER-PRD, Business Flows, Phase 12-15 |
| 2026-01-18 | 3.0 | Full analysis, ROADMAP v3.0 |
| 2026-01-18 | 2.5 | Added Auto-Build, Auto-Doc, Auto-Load Orchestrator |
| 2026-01-17 | 2.0 | AI Workforce System complete |
