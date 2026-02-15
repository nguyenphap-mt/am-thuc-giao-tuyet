-- Finance Module: Budget Management Tables
-- Migration: 032_finance_budgets.sql
-- Purpose: Create budget and budget lines tables for financial planning

-- ============================================================================
-- TABLE: budgets
-- Master budget records for annual/quarterly/monthly financial planning
-- ============================================================================
CREATE TABLE IF NOT EXISTS budgets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    code            VARCHAR(50) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    
    -- Budget Period
    period_type     VARCHAR(20) NOT NULL DEFAULT 'ANNUAL',  -- ANNUAL, QUARTERLY, MONTHLY
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    fiscal_year     INTEGER NOT NULL,
    
    -- Status
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',  -- DRAFT, ACTIVE, CLOSED, ARCHIVED
    
    -- Totals (calculated from lines)
    total_amount    DECIMAL(15,2) DEFAULT 0,
    
    -- Audit
    created_by      UUID,
    approved_by     UUID,
    approved_at     TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, code)
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_budgets_tenant_year ON budgets(tenant_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(tenant_id, status);


-- ============================================================================
-- TABLE: budget_lines
-- Individual budget line items linked to accounts
-- ============================================================================
CREATE TABLE IF NOT EXISTS budget_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    budget_id       UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    account_id      UUID REFERENCES accounts(id),
    
    -- Category (for non-account-based budgeting)
    category        VARCHAR(100),
    line_name       VARCHAR(255) NOT NULL,
    
    -- Budgeted Amounts (by month if needed)
    budgeted_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Monthly breakdown (optional)
    jan_amount      DECIMAL(15,2) DEFAULT 0,
    feb_amount      DECIMAL(15,2) DEFAULT 0,
    mar_amount      DECIMAL(15,2) DEFAULT 0,
    apr_amount      DECIMAL(15,2) DEFAULT 0,
    may_amount      DECIMAL(15,2) DEFAULT 0,
    jun_amount      DECIMAL(15,2) DEFAULT 0,
    jul_amount      DECIMAL(15,2) DEFAULT 0,
    aug_amount      DECIMAL(15,2) DEFAULT 0,
    sep_amount      DECIMAL(15,2) DEFAULT 0,
    oct_amount      DECIMAL(15,2) DEFAULT 0,
    nov_amount      DECIMAL(15,2) DEFAULT 0,
    dec_amount      DECIMAL(15,2) DEFAULT 0,
    
    -- Notes
    note            TEXT,
    
    -- Audit
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for budget lines lookup
CREATE INDEX IF NOT EXISTS idx_budget_lines_budget ON budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_account ON budget_lines(account_id);


-- ============================================================================
-- ROW-LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY;

-- Budgets policies
DROP POLICY IF EXISTS budgets_tenant_isolation ON budgets;
CREATE POLICY budgets_tenant_isolation ON budgets
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID)
    WITH CHECK (tenant_id = current_setting('app.current_tenant')::UUID);

-- Budget lines policies
DROP POLICY IF EXISTS budget_lines_tenant_isolation ON budget_lines;
CREATE POLICY budget_lines_tenant_isolation ON budget_lines
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID)
    WITH CHECK (tenant_id = current_setting('app.current_tenant')::UUID);


-- ============================================================================
-- HELPER FUNCTION: Get Budget vs Actual for a fiscal year
-- ============================================================================
CREATE OR REPLACE FUNCTION get_budget_vs_actual(
    p_tenant_id UUID,
    p_fiscal_year INTEGER
)
RETURNS TABLE (
    category VARCHAR,
    line_name VARCHAR,
    budgeted_amount DECIMAL,
    actual_amount DECIMAL,
    variance DECIMAL,
    variance_pct DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bl.category,
        bl.line_name,
        bl.budgeted_amount,
        COALESCE(SUM(ft.amount), 0) as actual_amount,
        bl.budgeted_amount - COALESCE(SUM(ft.amount), 0) as variance,
        CASE 
            WHEN bl.budgeted_amount > 0 
            THEN ROUND(((bl.budgeted_amount - COALESCE(SUM(ft.amount), 0)) / bl.budgeted_amount * 100), 2)
            ELSE 0 
        END as variance_pct
    FROM budget_lines bl
    JOIN budgets b ON bl.budget_id = b.id
    LEFT JOIN finance_transactions ft ON (
        ft.tenant_id = p_tenant_id
        AND ft.category = bl.category
        AND EXTRACT(YEAR FROM ft.transaction_date) = p_fiscal_year
        AND ft.type = 'PAYMENT'  -- Only expenses
    )
    WHERE b.tenant_id = p_tenant_id
      AND b.fiscal_year = p_fiscal_year
      AND b.status = 'ACTIVE'
    GROUP BY bl.category, bl.line_name, bl.budgeted_amount
    ORDER BY bl.category, bl.line_name;
END;
$$;

-- ============================================================================
-- SEED: Insert default expense categories for budgeting
-- ============================================================================
-- (Categories will be loaded from finance_transactions.category values)

COMMENT ON TABLE budgets IS 'Financial budgets for expense planning and tracking';
COMMENT ON TABLE budget_lines IS 'Individual budget line items linked to expense categories or accounts';
