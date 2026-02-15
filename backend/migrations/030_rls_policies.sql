-- ============================================
-- RLS POLICIES FOR MULTI-TENANT ISOLATION
-- Run with: psql -d catering_db -f 030_rls_policies.sql
-- ============================================

-- Enable RLS on all tenant tables
-- ============================================

-- Quote tables
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_note_presets ENABLE ROW LEVEL SECURITY;

-- Order tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_staff_assignments ENABLE ROW LEVEL SECURITY;

-- Inventory tables
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- CRM tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_logs ENABLE ROW LEVEL SECURITY;

-- Finance tables
ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

-- HR tables
ALTER TABLE hr_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_timesheets ENABLE ROW LEVEL SECURITY;

-- Procurement tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Menu tables
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;


-- ============================================
-- CREATE RLS POLICIES
-- Uses app.current_tenant session variable
-- ============================================

-- Policy function to check tenant
CREATE OR REPLACE FUNCTION current_tenant_id() 
RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_tenant', TRUE)::UUID;
EXCEPTION 
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Quote policies
CREATE POLICY tenant_isolation_quotes ON quotes
    USING (tenant_id = current_tenant_id());
    
CREATE POLICY tenant_isolation_quote_items ON quote_items
    USING (tenant_id = current_tenant_id());
    
CREATE POLICY tenant_isolation_quote_services ON quote_services
    USING (tenant_id = current_tenant_id());


-- Order policies
CREATE POLICY tenant_isolation_orders ON orders
    USING (tenant_id = current_tenant_id());
    
CREATE POLICY tenant_isolation_order_items ON order_items
    USING (tenant_id = current_tenant_id());
    
CREATE POLICY tenant_isolation_order_payments ON order_payments
    USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_order_staff ON order_staff_assignments
    USING (tenant_id = current_tenant_id());


-- Inventory policies
CREATE POLICY tenant_isolation_inventory_items ON inventory_items
    USING (tenant_id = current_tenant_id());
    
CREATE POLICY tenant_isolation_inventory_stocks ON inventory_stocks
    USING (tenant_id = current_tenant_id());
    
CREATE POLICY tenant_isolation_inventory_txn ON inventory_transactions
    USING (tenant_id = current_tenant_id());
    
CREATE POLICY tenant_isolation_warehouses ON warehouses
    USING (tenant_id = current_tenant_id());


-- CRM policies
CREATE POLICY tenant_isolation_customers ON customers
    USING (tenant_id = current_tenant_id());
    
CREATE POLICY tenant_isolation_interaction_logs ON interaction_logs
    USING (tenant_id = current_tenant_id());


-- Finance policies
CREATE POLICY tenant_isolation_accounts ON finance_accounts
    USING (tenant_id = current_tenant_id());
    
CREATE POLICY tenant_isolation_journals ON finance_journals
    USING (tenant_id = current_tenant_id());
    
CREATE POLICY tenant_isolation_journal_lines ON finance_journal_lines
    USING (tenant_id = current_tenant_id());
    
CREATE POLICY tenant_isolation_finance_txn ON finance_transactions
    USING (tenant_id = current_tenant_id());


-- HR policies
CREATE POLICY tenant_isolation_employees ON hr_employees
    USING (tenant_id = current_tenant_id());
    
CREATE POLICY tenant_isolation_hr_assignments ON hr_staff_assignments
    USING (tenant_id = current_tenant_id());
    
CREATE POLICY tenant_isolation_timesheets ON hr_timesheets
    USING (tenant_id = current_tenant_id());


-- Procurement policies
CREATE POLICY tenant_isolation_suppliers ON suppliers
    USING (tenant_id = current_tenant_id());
    
CREATE POLICY tenant_isolation_purchase_orders ON purchase_orders
    USING (tenant_id = current_tenant_id());
    
CREATE POLICY tenant_isolation_po_items ON purchase_order_items
    USING (tenant_id = current_tenant_id());


-- Menu policies
CREATE POLICY tenant_isolation_menu_items ON menu_items
    USING (tenant_id = current_tenant_id());
    
CREATE POLICY tenant_isolation_menu_categories ON menu_categories
    USING (tenant_id = current_tenant_id());


-- ============================================
-- SUPER-ADMIN BYPASS POLICIES
-- For admin operations that need to bypass RLS
-- ============================================

-- Create bypass role for migrations/admin
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'tenant_admin') THEN
        CREATE ROLE tenant_admin;
    END IF;
END $$;

-- Grant bypass to super-admin operations
ALTER TABLE quotes FORCE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

-- Create bypass policies for tenant_admin
CREATE POLICY admin_bypass_quotes ON quotes
    TO tenant_admin
    USING (true);

CREATE POLICY admin_bypass_orders ON orders
    TO tenant_admin
    USING (true);


-- ============================================
-- VERIFICATION
-- ============================================

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;

-- Test: This should return nothing without setting tenant context
-- SELECT * FROM quotes;

-- Test: This should return filtered data
-- SET app.current_tenant = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
-- SELECT * FROM quotes;
