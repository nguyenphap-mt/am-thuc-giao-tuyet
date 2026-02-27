# 🔍 Bug Fix Index

> **Mục đích**: Tra cứu nhanh tất cả bugs đã fix. AI Workforce tự động tìm bug tương tự tại đây trước khi phân tích bug mới.
>
> **Cách dùng**: Grep theo `module`, `keywords`, hoặc `root_cause_category` để tìm bug liên quan.
>
> **Cập nhật**: Tự động bởi workflow `/fix-bug` Step 5.6 sau khi fix xong.

---

## Root Cause Categories

| Category | Mô tả | Ví dụ |
| :--- | :--- | :--- |
| `api-mismatch` | Frontend gọi sai API endpoint hoặc response format | BUG-20260203-001 |
| `timezone` | Timezone mismatch (naive vs aware, UTC vs +07:00) | BUG-20260204-001, 002 |
| `auth-storage` | Token/session storage key sai hoặc conflict | BUG-20260201-001, 003, 004 |
| `schema-mismatch` | DB schema thiếu column hoặc type sai | BUG-20260216-001, Mixed Content fix (2026-02-16) |
| `stale-fk` | FK constraint cũ không còn phù hợp với business logic hiện tại | BUG-20260219-002 |
| `missing-header` | Thiếu header HTTP (X-Tenant-ID, Authorization) | BUG-20260204-001 |
| `duplicate-code` | Code duplication gây inconsistency | BUG-20260202-004, BUG-20260217-004 |
| `missing-tests` | Module thiếu test coverage | BUG-20260202-001 |
| `route-redirect` | FastAPI trailing slash redirect (307) gây Mixed Content | Route path fix (2026-02-16) |
| `missing-api` | Frontend thiếu tích hợp endpoint backend đã tồn tại | BUG-20260217-002 |
| `missing-employee-link` | User account không liên kết Employee record → endpoint 404 | BUG-20260217-004 |
| `fastapi-route-conflict` | Duplicate route definitions gây schema validation 500 (last-handler-wins) | BUG-20260217-004 |
| `missing-rls` | Table thiếu RLS policy hoặc tenant_id, extensions trong public schema | BUG-20260219-001 |
| `infra-config` | Infrastructure/env config sai (DATABASE_URL, Cloud Run env vars, DNS) | BUG-20260220-002 |
| `missing-import` | Module sử dụng biến/function nhưng chưa import | BUG-20260221-001 |

---

## Bug Index Table

| Bug ID | Module | Severity | Root Cause Category | Keywords | Files Changed | Status | Date |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: | :--- |
| BUG-20260201-001 | Auth/Login | Medium | `auth-storage` | remember-me, localStorage, sessionStorage | `auth-store.ts`, `login/page.tsx` | ✅ | 2026-02-01 |
| BUG-20260201-003 | Auth/Login | High | `auth-storage` | zustand-persist, remember-me, storage-adapter | `auth-store.ts` | ✅ | 2026-02-01 |
| BUG-20260201-004 | API Client | Critical | `auth-storage` | token, interceptor, 401, wrong-key | `api.ts` | ✅ | 2026-02-01 |
| BUG-20260202-001 | Quote | Critical | `missing-tests` | pytest, test-coverage, unit-test | `tests/quote/` (NEW) | ✅ | 2026-02-02 |
| BUG-20260202-004 | Quote/Order | Medium | `duplicate-code` | code-generator, refactor, BG-prefix, DH-prefix | `code_generator.py` (NEW), `http_router.py` | ✅ | 2026-02-02 |
| BUG-20260203-001 | Multi-Module | High | `api-mismatch` | 404, wrong-endpoint, response-format, procurement, inventory | `procurement/page.tsx`, `inventory/page.tsx` | ✅ | 2026-02-03 |
| BUG-20260204-001 | HR/Timesheet | High | `timezone` | 500, 405, datetime, timezone, naive-vs-aware, check-out | `hr/http_router.py` | ✅ | 2026-02-04 |
| BUG-20260204-002 | HR/Timesheet | Critical | `timezone` | hours-calculation, UTC+7, timezone-offset, 7h-drift | `hr/http_router.py` | ✅ | 2026-02-04 |
| BUG-20260216-001 | Menu Management | Critical | `schema-mismatch` | 500, sort_order, menu_items, categories, set_menus, column-does-not-exist | `fix_menu_schema_mismatches_20260216.sql` | ✅ | 2026-02-16 |
| BUG-20260216-002 | Finance | Critical | `schema-mismatch` | 500, finance_transactions, relation-does-not-exist, missing-table | `create_finance_transactions_20260216.sql` | ✅ | 2026-02-16 |
| BUG-20260216-003 | HR | High | `schema-mismatch` | 500, 404, staff_assignments, notes, leave_types, leave_balances, leave_requests, table-missing, column-missing | `fix_hr_schema_20260216.sql` | ✅ | 2026-02-16 |
| BUG-20260217-001 | Auth/RLS | High | `route-redirect` | 404, users-tab, redirect-slashes, 307, mixed-content | `main.py` | ✅ | 2026-02-17 |
| BUG-20260217-002 | HR/Leave | High | `api-mismatch` | 404, leave, not-found, missing-endpoint, hr | `hr/http_router.py` | ✅ | 2026-02-17 |
| BUG-20260217-003 | HR/Leave | High | `missing-seed-data` | leave, dropdown, empty, seed, tenant-id, leave_types | `033_seed_leave_types_all_tenants.sql` | ✅ | 2026-02-17 |
| BUG-20260217-004 | HR/Leave | High | `duplicate-code`, `missing-employee-link` | leave, 404, 500, my-balances, my-requests, duplicate-endpoints, schema-validation, fastapi-last-wins | `hr/http_router.py` | ✅ | 2026-02-17 |
| BUG-20260218-001 | Tenant/Settings | High | `api-mismatch` | logo, upload, 404, Cloud Run, Vercel, FileResponse, static-files | `http_router.py`, `page.tsx` | ✅ | 2026-02-18 |
| BUG-20260218-002 | Menu Management | Critical | `schema-mismatch` | 500, menu_item_name, recipes, column-does-not-exist, supabase | `fix_menu_schema_mismatches_20260216.sql` | ✅ | 2026-02-18 |
| BUG-20260218-003 | HR Management | Critical | `schema-mismatch` | 500, user_id, employees, column-does-not-exist, supabase, user-employee-unification | `052_employee_user_link.sql` | ✅ | 2026-02-18 |
| BUG-20260218-005 | Security/Database | High | `missing-rls` | supabase, RLS, security-advisor, tenant_id, extensions, row-level-security, mutable-search-path | `060_fix_supabase_security_warnings.sql`, `061_fix_remaining_supabase_warnings.sql` | ✅ | 2026-02-18 |
| BUG-20260219-001 | Security/Database | High | `missing-rls` | supabase, RLS, security-advisor, tenant_id, quote_note_presets, user_sessions, extensions-schema, pg_trgm, unaccent, vector | `061_fix_remaining_supabase_warnings.sql`, `models.py`, `session_model.py` | ✅ | 2026-02-19 |
| BUG-20260219-002 | HR/StaffAssignment | Critical | `stale-fk` | 500, staff_assignments, event_id, foreign-key, events, orders, supabase, phân-công | `064_fix_staff_assignments_event_fk.sql` | ✅ | 2026-02-19 |
| BUG-20260220-001 | Order/CRM/Loyalty | Critical | `schema-mismatch` | 500, loyalty_points_history, CHECK-constraint, REVERSAL, reopen | `070_add_reversal_type_loyalty.sql` | ✅ | 2026-02-20 |
| BUG-20260220-002 | Auth/Login | Critical | `infra-config` | 500, socket.gaierror, DNS, DATABASE_URL, Supabase, Cloud-Run, login | Cloud Run env var, `backend/.env` | ✅ | 2026-02-20 |
| BUG-20260220-003 | Auth/Login | Critical | `schema-mismatch` | 500, NoReferencedTableError, ForeignKey, UserSessionModel, CORS, login, tenant_id, PendingRollbackError | `session_model.py`, `router.py` | ✅ | 2026-02-20 |
| BUG-20260221-001 | HR/Assignment | High | `missing-import` | 500, NameError, logger, delete, cancel, assignment, phân-công, hủy | `hr/http_router.py` | ✅ | 2026-02-21 |
| BUG-20260221-002 | HR/Assignment | High | `api-mismatch` | orders.find, TypeError, OrderSearchCombobox, array, API response | `OrderSearchCombobox.tsx`, `AssignmentBatchModal.tsx` | ✅ | 2026-02-21 |
| BUG-20260221-003 | HR/Assignment | Medium | `stale-fk` | 500, CORS, batch-assignment, OrderStaffAssignmentModel, FK-violation, staff_id, users.id, employee_id | `hr/http_router.py` | ✅ | 2026-02-21 |
| BUG-20260221-004 | HR/Payroll | High | `missing-import` | 500, CORS, NameError, delete, sqlalchemy, reopen, PAID, payroll | `hr/http_router.py` | ✅ | 2026-02-21 |
| BUG-20260221-005 | Finance/Reports | High | `api-mismatch` | 500, pnl, supplier_name, PurchaseOrderModel, SupplierModel, CORS, missing-import | `finance/http_router.py` | ✅ | 2026-02-21 |
| BUG-20260222-001 | HR/Payroll→Finance | High | `api-mismatch` | payroll, salary-expense, idempotent, 400-error, from-payroll | `finance/http_router.py` | ✅ | 2026-02-22 |
| BUG-20260222-002 | HR/Payroll→Finance | High | `api-mismatch` | payroll, finance, amount-mismatch, stale-data, P&L, journal | `finance/http_router.py` | ✅ | 2026-02-22 |
| BUG-20260223-001 | Settings/Permissions | Medium | `api-mismatch` | trailing-slash, 404, roles, redirect_slashes, FastAPI | `permission-matrix-tab.tsx` | ✅ | 2026-02-23 |
| BUG-20260223-002 | Settings/Users | Medium | `api-mismatch` | trailing-slash, 404, users, roles, redirect_slashes, react-query | `use-users.ts`, `user-modal.tsx` | ✅ | 2026-02-23 |
| BUG-20260225-001 | Settings/Permissions | Medium | `api-mismatch` | trailing-slash, 404, roles, redirect_slashes, permissions-tab | `permission-matrix-tab.tsx` | ✅ | 2026-02-25 |
| BUG-20260225-002 | Settings/Overview | Medium | `api-mismatch` | logo, 503, relative-url, next-js-proxy, cloud-run, img-tag | `settings/page.tsx` | ✅ | 2026-02-25 |
| BUG-20260226-001 | Settings/System Tab | Medium | `api-mismatch` | tab-redirect, VALID_TABS, system-settings, useTabPersistence, fallback | `settings/page.tsx` | ✅ | 2026-02-26 |
| BUG-20260226-002 | Settings/Users | High | `api-mismatch` | trailing-slash, 404, create-user, POST, FastAPI | `user-modal.tsx` | ✅ | 2026-02-26 |
| BUG-20260226-003 | HR/Leave Tab | Medium | L2 | `api-mismatch` | 403, forbidden, chef, leave, isHrAdmin, query-guard | `LeaveTab.tsx`, `page.tsx` | ✅ | 2026-02-26 |
| BUG-20260226-004 | HR/Leave Modal | Medium | L1 | `api-mismatch` | 403, chef, create-leave, modal, self-service, employees, infinite-loop | `CreateLeaveRequestModal.tsx` | ✅ | 2026-02-26 |
| BUG-20260226-005 | HR/Leave Tab | Medium | L1 | `data-missing` | leave-balances, admin, only-one-employee, initialize, is_fulltime | `http_router.py` | ✅ | 2026-02-26 |
| BUG-20260227-001 | HR/Leave | High | L2 | `schema-mismatch` | leave_requests, is_half_day, half_day_period, UndefinedColumnError, Supabase | Supabase SQL migration | ✅ | 2026-02-27 |
| BUG-20260227-002 | Inventory/Equipment | High | L1 | `orphaned-component` | EquipmentTab, CCDC, dung-cu, missing-tab, INVENTORY_TABS | `page.tsx` | ✅ | 2026-02-27 |

---

## Folders Without Reports

> Các folder sau chưa có `fix-report.md`. Cần tạo report nếu bug đã được fix.

| Bug ID | Folder | Has Report? |
| :--- | :--- | :---: |
| BUG-20260202-002 | `.debug/BUG-20260202-002/` | ❌ Empty |
| BUG-20260202-003 | `.debug/BUG-20260202-003/` | ❌ Empty |
| BUG-20260202-005 | `.debug/BUG-20260202-005/` | ❌ Empty |
| BUG-20260203-002 | `.debug/BUG-20260203-002/` | ❌ Empty |
| BUG-20260203-006 | `.debug/BUG-20260203-006/` | ❌ Empty |

---

*Last updated: 2026-02-27 07:40 (BUG-20260227-001 added — leave_requests missing is_half_day, half_day_period columns in Supabase)*
