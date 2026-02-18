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
| `missing-header` | Thiếu header HTTP (X-Tenant-ID, Authorization) | BUG-20260204-001 |
| `duplicate-code` | Code duplication gây inconsistency | BUG-20260202-004, BUG-20260217-004 |
| `missing-tests` | Module thiếu test coverage | BUG-20260202-001 |
| `route-redirect` | FastAPI trailing slash redirect (307) gây Mixed Content | Route path fix (2026-02-16) |
| `missing-api` | Frontend thiếu tích hợp endpoint backend đã tồn tại | BUG-20260217-002 |
| `missing-employee-link` | User account không liên kết Employee record → endpoint 404 | BUG-20260217-004 |
| `fastapi-route-conflict` | Duplicate route definitions gây schema validation 500 (last-handler-wins) | BUG-20260217-004 |

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

*Last updated: 2026-02-18 22:35 (BUG-20260218-002, BUG-20260218-003 added)*
