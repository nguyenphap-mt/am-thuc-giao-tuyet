-- Migration 071: Payroll-Finance Integration Enhancement
-- GAP-4: Add payment_transaction_id link to payroll_periods
-- GAP-3: Add configurable default_labor_cost_ratio to payroll_settings

-- GAP-4: Reverse link from PayrollPeriod to FinanceTransaction
ALTER TABLE payroll_periods
ADD COLUMN IF NOT EXISTS payment_transaction_id UUID;

-- GAP-3: Configurable labor cost ratio (default 0.15 = 15%)
ALTER TABLE payroll_settings
ADD COLUMN IF NOT EXISTS default_labor_cost_ratio DECIMAL(5, 4) DEFAULT 0.15;

-- Comment for clarity
COMMENT ON COLUMN payroll_periods.payment_transaction_id IS 'FK to finance_transactions.id — set when payroll is paid via Finance';
COMMENT ON COLUMN payroll_settings.default_labor_cost_ratio IS 'Default labor cost ratio (0.15 = 15%) used as fallback when no timesheet data exists for P&L calculation';
