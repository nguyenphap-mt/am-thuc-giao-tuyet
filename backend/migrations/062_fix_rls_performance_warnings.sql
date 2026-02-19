-- Migration 062: Fix Supabase Performance Advisor "Auth RLS Initialization Plan" warnings
-- Problem: 131 warnings because bare current_setting() in RLS policies is treated as volatile
-- Solution: Wrap all current_setting() calls in (SELECT ...) subquery so PostgreSQL 
--           evaluates once per query instead of per-row
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- Date: 2026-02-19
-- Bug ID: BUG-20260219-002

-- ============================================================================
-- STRATEGY:
-- For each policy: DROP old → CREATE new with (SELECT current_setting(...))::uuid
-- Also consolidate duplicate policies on: notifications, leave_approval_history, users
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Standard tenant_id policies (majority — simple pattern)
-- Pattern: tenant_id = (SELECT current_setting('app.current_tenant')::uuid)
-- ============================================================================

-- 1. accounting_periods (has WITH CHECK)
DROP POLICY IF EXISTS accounting_periods_tenant_isolation ON accounting_periods;
CREATE POLICY accounting_periods_tenant_isolation ON accounting_periods
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid))
  WITH CHECK (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 2. accounts
DROP POLICY IF EXISTS tenant_isolation_accounts ON accounts;
CREATE POLICY tenant_isolation_accounts ON accounts
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 3. activity_logs
DROP POLICY IF EXISTS activity_logs_tenant_isolation ON activity_logs;
CREATE POLICY activity_logs_tenant_isolation ON activity_logs
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid));

-- 4. agent_memory
DROP POLICY IF EXISTS tenant_isolation ON agent_memory;
CREATE POLICY tenant_isolation ON agent_memory
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 5. audit_log
DROP POLICY IF EXISTS audit_log_tenant_policy ON audit_log;
CREATE POLICY audit_log_tenant_policy ON audit_log
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid));

-- 6. budget_lines (has WITH CHECK)
DROP POLICY IF EXISTS budget_lines_tenant_isolation ON budget_lines;
CREATE POLICY budget_lines_tenant_isolation ON budget_lines
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid))
  WITH CHECK (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 7. budgets (has WITH CHECK)
DROP POLICY IF EXISTS budgets_tenant_isolation ON budgets;
CREATE POLICY budgets_tenant_isolation ON budgets
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid))
  WITH CHECK (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 8. categories
DROP POLICY IF EXISTS tenant_isolation_categories ON categories;
CREATE POLICY tenant_isolation_categories ON categories
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 9. customers
DROP POLICY IF EXISTS tenant_isolation_customers ON customers;
CREATE POLICY tenant_isolation_customers ON customers
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 10. device_registrations
DROP POLICY IF EXISTS tenant_isolation_device_registrations ON device_registrations;
CREATE POLICY tenant_isolation_device_registrations ON device_registrations
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 11. employees
DROP POLICY IF EXISTS tenant_isolation_employees ON employees;
CREATE POLICY tenant_isolation_employees ON employees
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 12. event_checkins
DROP POLICY IF EXISTS tenant_isolation_event_checkins ON event_checkins;
CREATE POLICY tenant_isolation_event_checkins ON event_checkins
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 13. events
DROP POLICY IF EXISTS tenant_isolation_events ON events;
CREATE POLICY tenant_isolation_events ON events
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 14. finance_transactions
DROP POLICY IF EXISTS finance_transactions_tenant_isolation ON finance_transactions;
CREATE POLICY finance_transactions_tenant_isolation ON finance_transactions
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 15. interaction_logs
DROP POLICY IF EXISTS tenant_isolation_interaction_logs ON interaction_logs;
CREATE POLICY tenant_isolation_interaction_logs ON interaction_logs
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 16. inventory_items
DROP POLICY IF EXISTS tenant_isolation_items ON inventory_items;
CREATE POLICY tenant_isolation_items ON inventory_items
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 17. inventory_lots
DROP POLICY IF EXISTS tenant_isolation_inventory_lots ON inventory_lots;
CREATE POLICY tenant_isolation_inventory_lots ON inventory_lots
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid));

-- 18. inventory_stock
DROP POLICY IF EXISTS tenant_isolation_stock ON inventory_stock;
CREATE POLICY tenant_isolation_stock ON inventory_stock
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 19. inventory_transactions
DROP POLICY IF EXISTS tenant_isolation_transactions ON inventory_transactions;
CREATE POLICY tenant_isolation_transactions ON inventory_transactions
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 20. invoice_items
DROP POLICY IF EXISTS invoice_items_tenant_isolation ON invoice_items;
CREATE POLICY invoice_items_tenant_isolation ON invoice_items
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid));

-- 21. invoices
DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices;
CREATE POLICY invoices_tenant_isolation ON invoices
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid));

-- 22. journal_lines
DROP POLICY IF EXISTS tenant_isolation_journal_lines ON journal_lines;
CREATE POLICY tenant_isolation_journal_lines ON journal_lines
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 23. journals
DROP POLICY IF EXISTS tenant_isolation_journals ON journals;
CREATE POLICY tenant_isolation_journals ON journals
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 24. knowledge_embeddings
DROP POLICY IF EXISTS tenant_isolation ON knowledge_embeddings;
CREATE POLICY tenant_isolation ON knowledge_embeddings
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 25. leave_approval_history (CONSOLIDATE: 2 duplicate policies → 1)
DROP POLICY IF EXISTS leave_approval_history_tenant ON leave_approval_history;
DROP POLICY IF EXISTS tenant_isolation ON leave_approval_history;
CREATE POLICY tenant_isolation_leave_approval_history ON leave_approval_history
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid));

-- 26. leave_balances
DROP POLICY IF EXISTS leave_balances_tenant ON leave_balances;
CREATE POLICY leave_balances_tenant ON leave_balances
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 27. leave_requests
DROP POLICY IF EXISTS leave_requests_tenant ON leave_requests;
CREATE POLICY leave_requests_tenant ON leave_requests
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 28. leave_types
DROP POLICY IF EXISTS leave_types_tenant ON leave_types;
CREATE POLICY leave_types_tenant ON leave_types
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 29. loyalty_points_history
DROP POLICY IF EXISTS loyalty_history_tenant_isolation ON loyalty_points_history;
CREATE POLICY loyalty_history_tenant_isolation ON loyalty_points_history
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid));

-- 30. loyalty_tiers
DROP POLICY IF EXISTS loyalty_tiers_tenant_isolation ON loyalty_tiers;
CREATE POLICY loyalty_tiers_tenant_isolation ON loyalty_tiers
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid));

-- 31. menu_items
DROP POLICY IF EXISTS tenant_isolation_menu_items ON menu_items;
CREATE POLICY tenant_isolation_menu_items ON menu_items
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 32. mobile_sync_log
DROP POLICY IF EXISTS tenant_isolation_mobile_sync_log ON mobile_sync_log;
CREATE POLICY tenant_isolation_mobile_sync_log ON mobile_sync_log
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 33. notification_preferences
DROP POLICY IF EXISTS notification_preferences_tenant_isolation ON notification_preferences;
CREATE POLICY notification_preferences_tenant_isolation ON notification_preferences
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 34. notification_settings
DROP POLICY IF EXISTS notification_settings_tenant_isolation ON notification_settings;
CREATE POLICY notification_settings_tenant_isolation ON notification_settings
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 35. notifications (CONSOLIDATE: 2 duplicate policies → 1)
DROP POLICY IF EXISTS notifications_tenant_isolation ON notifications;
DROP POLICY IF EXISTS tenant_isolation_notifications ON notifications;
CREATE POLICY tenant_isolation_notifications ON notifications
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 36. order_items
DROP POLICY IF EXISTS tenant_isolation_order_items ON order_items;
CREATE POLICY tenant_isolation_order_items ON order_items
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 37. order_notes
DROP POLICY IF EXISTS tenant_isolation_order_notes ON order_notes;
CREATE POLICY tenant_isolation_order_notes ON order_notes
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 38. order_payments
DROP POLICY IF EXISTS tenant_isolation_order_payments ON order_payments;
CREATE POLICY tenant_isolation_order_payments ON order_payments
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 39. order_staff_assignments
DROP POLICY IF EXISTS tenant_isolation_order_staff_assignments ON order_staff_assignments;
CREATE POLICY tenant_isolation_order_staff_assignments ON order_staff_assignments
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid));

-- 40. orders
DROP POLICY IF EXISTS tenant_isolation_orders ON orders;
CREATE POLICY tenant_isolation_orders ON orders
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 41. payroll_items
DROP POLICY IF EXISTS payroll_items_tenant_isolation ON payroll_items;
CREATE POLICY payroll_items_tenant_isolation ON payroll_items
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 42. payroll_periods
DROP POLICY IF EXISTS payroll_periods_tenant_isolation ON payroll_periods;
CREATE POLICY payroll_periods_tenant_isolation ON payroll_periods
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 43. payroll_settings
DROP POLICY IF EXISTS payroll_settings_tenant_policy ON payroll_settings;
CREATE POLICY payroll_settings_tenant_policy ON payroll_settings
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid));

-- 44. period_audit_log
DROP POLICY IF EXISTS tenant_isolation ON period_audit_log;
CREATE POLICY tenant_isolation ON period_audit_log
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid));

-- 45. period_close_checklist
DROP POLICY IF EXISTS tenant_isolation ON period_close_checklist;
CREATE POLICY tenant_isolation ON period_close_checklist
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid));

-- 46. purchase_order_items
DROP POLICY IF EXISTS tenant_isolation_purchase_order_items ON purchase_order_items;
CREATE POLICY tenant_isolation_purchase_order_items ON purchase_order_items
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 47. purchase_orders
DROP POLICY IF EXISTS tenant_isolation_purchase_orders ON purchase_orders;
CREATE POLICY tenant_isolation_purchase_orders ON purchase_orders
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 48. purchase_requisition_lines
DROP POLICY IF EXISTS purchase_requisition_lines_tenant_isolation ON purchase_requisition_lines;
CREATE POLICY purchase_requisition_lines_tenant_isolation ON purchase_requisition_lines
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 49. purchase_requisitions
DROP POLICY IF EXISTS purchase_requisitions_tenant_isolation ON purchase_requisitions;
CREATE POLICY purchase_requisitions_tenant_isolation ON purchase_requisitions
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 50. quote_items
DROP POLICY IF EXISTS tenant_isolation_quote_items ON quote_items;
CREATE POLICY tenant_isolation_quote_items ON quote_items
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 51. quote_note_presets (has WITH CHECK)
DROP POLICY IF EXISTS tenant_isolation_quote_note_presets ON quote_note_presets;
CREATE POLICY tenant_isolation_quote_note_presets ON quote_note_presets
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid))
  WITH CHECK (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid));

-- 52. quote_services (special: was using ::text cast)
DROP POLICY IF EXISTS quote_services_tenant_policy ON quote_services;
CREATE POLICY quote_services_tenant_policy ON quote_services
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid));

-- 53. quote_templates (special: was using ::text cast)
DROP POLICY IF EXISTS quote_templates_tenant_policy ON quote_templates;
CREATE POLICY quote_templates_tenant_policy ON quote_templates
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid));

-- 54. quotes
DROP POLICY IF EXISTS tenant_isolation_quotes ON quotes;
CREATE POLICY tenant_isolation_quotes ON quotes
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 55. recipe_items
DROP POLICY IF EXISTS tenant_isolation_recipe_items ON recipe_items;
CREATE POLICY tenant_isolation_recipe_items ON recipe_items
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 56. recipes
DROP POLICY IF EXISTS tenant_isolation_recipes ON recipes;
CREATE POLICY tenant_isolation_recipes ON recipes
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 57. roles
DROP POLICY IF EXISTS tenant_isolation_roles ON roles;
CREATE POLICY tenant_isolation_roles ON roles
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 58. salary_advances
DROP POLICY IF EXISTS salary_advances_tenant_isolation ON salary_advances;
CREATE POLICY salary_advances_tenant_isolation ON salary_advances
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 59. set_menu_items
DROP POLICY IF EXISTS tenant_isolation_set_menu_items ON set_menu_items;
CREATE POLICY tenant_isolation_set_menu_items ON set_menu_items
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 60. set_menus
DROP POLICY IF EXISTS tenant_isolation_set_menus ON set_menus;
CREATE POLICY tenant_isolation_set_menus ON set_menus
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 61. staff_assignments
DROP POLICY IF EXISTS tenant_isolation_staff_assignments ON staff_assignments;
CREATE POLICY tenant_isolation_staff_assignments ON staff_assignments
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 62. suppliers
DROP POLICY IF EXISTS tenant_isolation_suppliers ON suppliers;
CREATE POLICY tenant_isolation_suppliers ON suppliers
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 63. tenant_settings
DROP POLICY IF EXISTS tenant_settings_isolation ON tenant_settings;
CREATE POLICY tenant_settings_isolation ON tenant_settings
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid));

-- 64. tenant_usage
DROP POLICY IF EXISTS tenant_isolation_tenant_usage ON tenant_usage;
CREATE POLICY tenant_isolation_tenant_usage ON tenant_usage
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid));

-- 65. tenants (special: uses id instead of tenant_id)
DROP POLICY IF EXISTS tenant_isolation_tenants ON tenants;
CREATE POLICY tenant_isolation_tenants ON tenants
  FOR ALL USING (id = (SELECT current_setting('app.current_tenant', true)::uuid));

-- 66. timesheets
DROP POLICY IF EXISTS tenant_isolation_timesheets ON timesheets;
CREATE POLICY tenant_isolation_timesheets ON timesheets
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid));

-- 67. user_sessions (has WITH CHECK)
DROP POLICY IF EXISTS tenant_isolation_user_sessions ON user_sessions;
CREATE POLICY tenant_isolation_user_sessions ON user_sessions
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid))
  WITH CHECK (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid));

-- 68. users (CONSOLIDATE: 3 policies → 2)
-- Drop all existing user policies
DROP POLICY IF EXISTS tenant_isolation ON users;
DROP POLICY IF EXISTS tenant_isolation_users ON users;
DROP POLICY IF EXISTS users_read_own ON users;
-- Recreate: tenant isolation with bypass option
CREATE POLICY tenant_isolation_users ON users
  FOR ALL USING (
    tenant_id = (SELECT current_setting('app.current_tenant')::uuid) 
    OR (SELECT current_setting('app.bypass_rls', true)) = 'on'
  );
-- Recreate: users can read own record (auth.uid)
CREATE POLICY users_read_own ON users
  FOR SELECT TO authenticated
  USING (auth.uid()::text = id::text);

-- 69. vietnam_holidays
DROP POLICY IF EXISTS vietnam_holidays_tenant_isolation ON vietnam_holidays;
CREATE POLICY vietnam_holidays_tenant_isolation ON vietnam_holidays
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 70. warehouses
DROP POLICY IF EXISTS tenant_isolation_warehouses ON warehouses;
CREATE POLICY tenant_isolation_warehouses ON warehouses
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 71. workflow_executions
DROP POLICY IF EXISTS tenant_isolation ON workflow_executions;
CREATE POLICY tenant_isolation ON workflow_executions
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 72. workflow_logs
DROP POLICY IF EXISTS tenant_isolation ON workflow_logs;
CREATE POLICY tenant_isolation ON workflow_logs
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

COMMIT;

-- ============================================================================
-- VERIFICATION: Check no bare current_setting remains
-- Run after migration:
-- SELECT tablename, policyname, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
--   AND (qual LIKE '%current_setting%' AND qual NOT LIKE '%(select current_setting%' AND qual NOT LIKE '%(SELECT current_setting%');
-- Expected: 0 rows
-- ============================================================================
