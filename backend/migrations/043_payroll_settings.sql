-- Migration: Payroll Settings Configuration
-- Purpose: Allow tenant-level customization of allowances, insurance rates, and overtime multipliers
-- Date: 2026-02-04

-- Payroll configuration per tenant
CREATE TABLE IF NOT EXISTS payroll_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL UNIQUE,
    
    -- Default allowances (monthly, for fulltime employees)
    default_allowance_meal DECIMAL(12,2) DEFAULT 500000,
    default_allowance_transport DECIMAL(12,2) DEFAULT 300000,
    default_allowance_phone DECIMAL(12,2) DEFAULT 200000,
    default_allowance_other DECIMAL(12,2) DEFAULT 0,
    
    -- Default base salary (for fulltime without explicit base_salary)
    default_base_salary DECIMAL(15,2) DEFAULT 8000000,
    
    -- Insurance rates (as decimal, e.g., 0.08 = 8%)
    rate_social_insurance DECIMAL(5,4) DEFAULT 0.08,    -- BHXH: 8%
    rate_health_insurance DECIMAL(5,4) DEFAULT 0.015,   -- BHYT: 1.5%
    rate_unemployment DECIMAL(5,4) DEFAULT 0.01,        -- BHTN: 1%
    
    -- Overtime multipliers (Vietnam Labor Law compliant)
    multiplier_overtime DECIMAL(4,2) DEFAULT 1.50,      -- Ngày thường: 150%
    multiplier_weekend DECIMAL(4,2) DEFAULT 2.00,       -- Cuối tuần: 200%
    multiplier_holiday DECIMAL(4,2) DEFAULT 3.00,       -- Lễ: 300%
    multiplier_night DECIMAL(4,2) DEFAULT 0.30,         -- Đêm: +30%
    
    -- Working hours configuration
    standard_working_days_per_month INT DEFAULT 26,
    standard_hours_per_day INT DEFAULT 8,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE payroll_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy for tenant isolation  
DROP POLICY IF EXISTS payroll_settings_tenant_policy ON payroll_settings;
CREATE POLICY payroll_settings_tenant_policy ON payroll_settings
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- Create default settings for existing tenants
INSERT INTO payroll_settings (tenant_id)
SELECT DISTINCT tenant_id FROM employees
WHERE tenant_id NOT IN (SELECT tenant_id FROM payroll_settings)
ON CONFLICT (tenant_id) DO NOTHING;

-- Comment for documentation
COMMENT ON TABLE payroll_settings IS 'Tenant-level payroll configuration for allowances, insurance rates, and overtime multipliers';
