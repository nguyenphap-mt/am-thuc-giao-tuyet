# 📋 IMPLEMENTATION CHECKLIST - ẨM THỰC GIÁO TUYẾT

> **Generated:** 2026-01-27
> **Version:** 1.0
> **Status Legend:** `[ ]` Todo | `[/]` In Progress | `[x]` Done | `[-]` Skipped

---

## 🎯 PHASE 12: ORDER-KITCHEN INTEGRATION
**Timeline:** 2 tuần | **Priority:** P0 | **Start Date:** ___________

### 12.1 Kitchen Prep Sheet Generation (3 days) ✅ VERIFIED
- [x] **Backend**
  - [x] Tạo endpoint `GET /api/v1/orders/{id}/prep-sheet`
  - [x] Service tính toán portions từ guest count
  - [x] Group items theo category
  - [x] Include special dietary notes from order
- [x] **Frontend**
  - [x] Button "Prep Sheet" trên Order Detail
  - [x] Modal hiển thị prep sheet
  - [x] Print/PDF export function
- [x] **Testing** ✅ 2026-01-27
  - [x] Unit test cho prep sheet calculation
  - [x] Browser test cho UI flow

### 12.2 Inventory Pull Sheet (4 days) ✅ VERIFIED
- [x] **Backend**
  - [x] Tạo endpoint `GET /api/v1/orders/{id}/pull-sheet`
  - [x] Service lookup recipe → ingredients
  - [x] FIFO lot selection logic
  - [x] Shortfall detection
  - [x] Auto-create Purchase Requisition nếu thiếu (via 12.3)
- [x] **Frontend**
  - [x] Button "Pull Sheet" trên Order Detail
  - [x] Display pull sheet với lot numbers
  - [x] Highlight insufficient items
  - [x] Link to create PO (via Dashboard widget auto-reorder)
- [x] **Testing** ✅ 2026-01-27
  - [x] Unit test cho FIFO logic
  - [x] Integration test Order → Inventory

### 12.3 Auto-Reorder from Low Stock (3 days) ✅ VERIFIED
- [x] **Backend**
  - [x] Endpoint `GET /inventory/low-stock` - check stock vs min_stock
  - [x] Endpoint `POST /inventory/low-stock/auto-reorder` - create PR
  - [x] Endpoint `GET /inventory/alerts/summary` - dashboard summary
  - [-] Daily scheduled job (8:00 AM) - optional cron
- [x] **Frontend**
  - [x] Dashboard widget "Low Stock Alerts"
  - [x] Notification badge trên Inventory menu
- [x] **Testing** ✅ 2026-01-27
  - [x] Unit test cho reorder logic (18 tests passed)
  - [x] Integration test với Procurement

---

## 🎯 PHASE 13: CRM LOYALTY ENHANCEMENT ✅ COMPLETE
**Timeline:** 2 tuần | **Priority:** P0 | **Start Date:** 2026-01-27

### 13.1 Loyalty Points Module (7 days) ✅
- [x] **Database**
  - [x] Tạo table `loyalty_points_history` + `loyalty_tiers`
  - [x] Thêm columns vào `customers`: loyalty_points, loyalty_tier
  - [x] Migration script `013_loyalty_points.sql`
- [x] **Backend**
  - [x] LoyaltyService (earn/redeem/history/tiers)
  - [x] Endpoint `GET /api/v1/customers/{id}/loyalty`
  - [x] Endpoint `POST /api/v1/customers/{id}/loyalty/redeem`
  - [ ] Auto-add points khi Order = PAID (deferred)
  - [x] Points history tracking
- [x] **Frontend**
  - [x] LoyaltyCardComponent với tier badge, progress bar
  - [x] Points balance display
  - [x] Points history panel
  - [x] Redemption interface (modals)
- [x] **Testing**
  - [x] Browser test PASSED

### 13.2 Loyalty Tiers (3 days) ✅
- [x] **Database**
  - [x] Tạo table `loyalty_tiers` (trong 013 migration)
  - [x] Seed data: Bronze, Silver, Gold, Platinum
- [x] **Backend**
  - [x] Tier evaluation service (trong LoyaltyService)
  - [ ] Apply tier discount to quotes (deferred)
- [x] **Frontend**
  - [x] Tier badge on customer cards
  - [x] Tier progress bar in profile
- [x] **Testing**
  - [x] Browser test PASSED

### 13.3 Payment Reminder System (2 days) ✅
- [x] **Backend**
  - [x] Endpoint `GET /api/v1/orders/overdue`
  - [x] Priority calculation (LOW/MEDIUM/HIGH)
- [x] **Frontend**
  - [x] Dashboard widget "Công Nợ Quá Hạn"
  - [x] Days overdue badges
  - [x] Total overdue amount display
- [x] **Testing**
  - [x] Browser test PASSED (24 orders, 169M VND shown)

---

## 🎯 PHASE 14: PRODUCTIVITY TOOLS
**Timeline:** 1 tuần | **Priority:** P1 | **Start Date:** ___________

### 14.1 Quote Templates (3 days) ✅ COMPLETE
- [x] **Database**
  - [x] Tạo table `quote_templates` (name, event_type, items[], services[])
  - [x] Migration script `045_quote_templates.sql`
- [x] **Backend**
  - [x] CRUD endpoints cho templates (list/get/create/update/delete)
  - [x] Apply template to new quote (`/templates/{id}/apply`)
- [x] **Frontend**
  - [x] QuoteTemplateListComponent (card grid + CRUD modal)
  - [x] Route `/quote/templates`
  - [ ] Template selector trong Quote Wizard Step 1 (future)
- [x] **Testing**
  - [x] API endpoints verified

### 14.2 Clone Quote (1 day) ✅ COMPLETE
- [x] **Backend**
  - [x] Endpoint `POST /api/v1/quotes/{id}/clone`
  - [x] Copy items, services, pricing
  - [x] Clear customer info, reset status to DRAFT
- [x] **Frontend**
  - [x] Button "Clone" trên Quote List
  - [x] Confirmation modal with summary
  - [x] Success notification, list refresh
- [x] **Testing**
  - [x] Browser test PASSED (modal, clone success, quote count +1)

### 14.3 Pre-event Confirmation (2 days) ⏸️ SKIPPED
- [ ] **Backend**
  - [ ] Scheduled job T-2 days before event (requires celery/background worker)
  - [ ] Email template cho customer (requires email service)
  - [ ] Push notification cho staff
  - [ ] Track confirmation status
- [ ] **Frontend**
  - [ ] Order detail - Confirmation status
  - [ ] Manual resend reminder button
- [ ] **Testing**
  - [ ] Unit test cho reminder scheduling

> Note: Requires background job infrastructure (Celery) - deferred to future sprint

---

## 🎯 PHASE 15: RECIPE & ALERTS
**Timeline:** 1.5 tuần | **Priority:** P1 | **Start Date:** ___________

### 15.1 Recipe Management (5 days) ✅ COMPLETE
- [x] **Database**
  - [x] Table `recipes` exists (012_recipes_table.sql)
  - [x] Links menu_items to inventory_items
- [x] **Backend**
  - [x] CRUD endpoints: `/menu/items/{id}/recipes`
  - [x] Calculate food cost endpoint: `/menu/items/{id}/cost`
  - [x] Scale recipe by portions
- [x] **Frontend**
  - [x] RecipeService with CRUD + cost calculation
  - [ ] Recipe tab trong Menu Item detail (future UI)
- [x] **Testing**
  - [x] API endpoints verified

### 15.2 Expiry Alert Widget (2 days) ✅ PARTIAL
- [x] **Backend**
  - [x] Endpoint `GET /api/v1/inventory/lots-expiring` (existed, route fixed)
  - [ ] Daily job check expiry dates (future)
  - [ ] 7-day và 3-day alerts
  - [ ] Notification service integration
- [x] **Frontend**
  - [x] Dashboard widget "Hàng Sắp Hết Hạn" 
  - [x] 3-column alerts grid layout
  - [x] Urgency badges (CRITICAL/WARNING)
  - [ ] Inventory list - Expiry warning badges (future)
  - [ ] Quick action: Use / Transfer / Write-off (future)
- [x] **Testing**
  - [x] Browser test PASSED (widget displays, 0 lô empty state works)

---

## 📊 PROGRESS SUMMARY

| Phase | Total Tasks | Done | In Progress | Remaining |
|:------|:-----------:|:----:|:-----------:|:---------:|
| Phase 12 | 27 | 27 | 0 | 0 |
| Phase 13 | 24 | 0 | 0 | 24 |
| Phase 14 | 15 | 0 | 0 | 15 |
| Phase 15 | 13 | 0 | 0 | 13 |
| **TOTAL** | **79** | **27** | **0** | **52** |

---

## 📅 TIMELINE OVERVIEW

```
Week 1-2:  Phase 12 - Order-Kitchen Integration
Week 3-4:  Phase 13 - CRM Loyalty Enhancement
Week 5:    Phase 14 - Productivity Tools
Week 6:    Phase 15 - Recipe & Alerts
```

---

## 🏷️ PRIORITY LEGEND

| Priority | Meaning | Action |
|:--------:|:--------|:-------|
| **P0** | Critical | Must complete this sprint |
| **P1** | High | Should complete this sprint |
| **P2** | Medium | Can defer to next sprint |
| **P3** | Low | Nice to have |

---

## 📝 NOTES & BLOCKERS

### Current Blockers
- [ ] _None identified yet_

### Decisions Needed
- [ ] Email/SMS provider selection for notifications
- [ ] Points ratio confirmation (1 point / 10,000 VND?)
- [ ] Tier thresholds confirmation

### Dependencies
- Phase 12.2 (Pull Sheet) depends on Recipe data (Phase 15.1)
- Consider doing Recipe Management first if Pull Sheet is priority

---

*Last Updated: 2026-01-27*
