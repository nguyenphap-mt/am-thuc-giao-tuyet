-- Migration: 033_performance_indexes.sql
-- Date: 2026-01-24
-- Purpose: Add composite indexes for improved query performance

-- Sprint 4.4: Performance Indexes

-- 4.4.1 Composite index on quotes(tenant_id, status)
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_status 
ON quotes(tenant_id, status);

-- 4.4.2 Composite index on orders(tenant_id, status)
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status 
ON orders(tenant_id, status);

-- 4.4.3 Index on customers(phone) for fast lookup
CREATE INDEX IF NOT EXISTS idx_customers_phone 
ON customers(phone);

-- Additional performance indexes based on common query patterns

-- Quotes by customer for CRM lookups
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id 
ON quotes(customer_id);

-- Orders by event_date for scheduling
CREATE INDEX IF NOT EXISTS idx_orders_event_date 
ON orders(event_date);

-- Order staff assignments by event date for conflict checking
CREATE INDEX IF NOT EXISTS idx_order_staff_assignments_order_date 
ON order_staff_assignments(order_id);

-- Customer interactions for timeline queries
CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer_created 
ON customer_interactions(customer_id, created_at DESC);

-- Finance transactions by date range
CREATE INDEX IF NOT EXISTS idx_finance_transactions_date 
ON finance_transactions(tenant_id, transaction_date);

-- Inventory lots for FIFO queries
CREATE INDEX IF NOT EXISTS idx_inventory_lots_item_status 
ON inventory_lots(item_id, status, received_date);

-- HR leave requests by date
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates 
ON leave_requests(from_date, to_date);

COMMENT ON INDEX idx_quotes_tenant_status IS 'Sprint 4.4.1: Optimize quote listing by status';
COMMENT ON INDEX idx_orders_tenant_status IS 'Sprint 4.4.2: Optimize order listing by status';
COMMENT ON INDEX idx_customers_phone IS 'Sprint 4.4.3: Fast customer lookup by phone';
