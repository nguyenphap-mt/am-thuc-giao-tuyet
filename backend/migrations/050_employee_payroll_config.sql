-- Migration: Add per-employee payroll configuration columns
-- Description: Allow per-employee override for allowances, insurance salary base, and insurance rates
-- Date: 2026-02-04

-- Add per-employee allowance overrides (NULL = use tenant default)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS allowance_meal DECIMAL(12, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS allowance_transport DECIMAL(12, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS allowance_phone DECIMAL(12, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS allowance_other DECIMAL(12, 2) DEFAULT NULL;

-- Add insurance configuration columns
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS insurance_salary_base DECIMAL(15, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rate_social_override DECIMAL(5, 4) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rate_health_override DECIMAL(5, 4) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rate_unemployment_override DECIMAL(5, 4) DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN employees.allowance_meal IS 'Per-employee meal allowance override (NULL = use tenant default)';
COMMENT ON COLUMN employees.allowance_transport IS 'Per-employee transport allowance override (NULL = use tenant default)';
COMMENT ON COLUMN employees.allowance_phone IS 'Per-employee phone allowance override (NULL = use tenant default)';
COMMENT ON COLUMN employees.allowance_other IS 'Per-employee other allowance override (NULL = use tenant default)';
COMMENT ON COLUMN employees.insurance_salary_base IS 'Salary base for BHXH/BHYT/BHTN calculation (NULL = use gross salary)';
COMMENT ON COLUMN employees.rate_social_override IS 'Override BHXH rate for this employee (NULL = use tenant default, e.g. 0.08 = 8%)';
COMMENT ON COLUMN employees.rate_health_override IS 'Override BHYT rate for this employee (NULL = use tenant default, e.g. 0.015 = 1.5%)';
COMMENT ON COLUMN employees.rate_unemployment_override IS 'Override BHTN rate for this employee (NULL = use tenant default, e.g. 0.01 = 1%)';
