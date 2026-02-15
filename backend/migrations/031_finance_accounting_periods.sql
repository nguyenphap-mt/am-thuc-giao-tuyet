-- Migration: 031_finance_accounting_periods.sql
-- Description: Create accounting_periods table for period closing functionality
-- Date: 2026-02-06

-- Accounting Periods Table
CREATE TABLE IF NOT EXISTS accounting_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Period Information
    name VARCHAR(100) NOT NULL,  -- e.g., "Tháng 01/2026", "Q1/2026"
    period_type VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',  -- MONTHLY, QUARTERLY, YEARLY
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',  -- OPEN, CLOSING, CLOSED
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by UUID,  -- User who closed the period
    
    -- Balances at close (snapshot)
    closing_total_debit DECIMAL(18,2),
    closing_total_credit DECIMAL(18,2),
    closing_retained_earnings DECIMAL(18,2),
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_period_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_period_status CHECK (status IN ('OPEN', 'CLOSING', 'CLOSED')),
    CONSTRAINT chk_period_type CHECK (period_type IN ('MONTHLY', 'QUARTERLY', 'YEARLY'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accounting_periods_tenant ON accounting_periods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_status ON accounting_periods(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_dates ON accounting_periods(tenant_id, start_date, end_date);

-- Row Level Security
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY accounting_periods_tenant_isolation ON accounting_periods
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);

-- Create initial open period for current month if none exists
-- This will be handled by the application logic

COMMENT ON TABLE accounting_periods IS 'Accounting periods for period closing functionality';
COMMENT ON COLUMN accounting_periods.status IS 'OPEN: Transactions allowed, CLOSING: In review, CLOSED: No changes allowed';
