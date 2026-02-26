-- Migration: Add employer contribution columns to payroll_items
-- Vietnam Labor Law 2025: Employer pays BHXH 17.5%, BHYT 3%, BHTN 1%, Công đoàn 2%

-- Add employer contribution columns
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS employer_social_ins DECIMAL(12,2) DEFAULT 0;
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS employer_health_ins DECIMAL(12,2) DEFAULT 0;
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS employer_unemployment DECIMAL(12,2) DEFAULT 0;
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS employer_union_fee DECIMAL(12,2) DEFAULT 0;
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS employer_total DECIMAL(12,2) DEFAULT 0;

-- Add employer rates to payroll_settings
ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS rate_employer_social DECIMAL(6,4) DEFAULT 0.175;
ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS rate_employer_health DECIMAL(6,4) DEFAULT 0.03;
ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS rate_employer_unemployment DECIMAL(6,4) DEFAULT 0.01;
ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS rate_union_fee DECIMAL(6,4) DEFAULT 0.02;

-- Add employer totals to payroll_periods
ALTER TABLE payroll_periods ADD COLUMN IF NOT EXISTS total_employer_cost DECIMAL(14,2) DEFAULT 0;

-- Comments
COMMENT ON COLUMN payroll_items.employer_social_ins IS 'BHXH phần NSDLĐ (17.5%)';
COMMENT ON COLUMN payroll_items.employer_health_ins IS 'BHYT phần NSDLĐ (3%)';
COMMENT ON COLUMN payroll_items.employer_unemployment IS 'BHTN phần NSDLĐ (1%)';
COMMENT ON COLUMN payroll_items.employer_union_fee IS 'Phí Công đoàn (2%)';
COMMENT ON COLUMN payroll_items.employer_total IS 'Tổng chi phí NSDLĐ';
