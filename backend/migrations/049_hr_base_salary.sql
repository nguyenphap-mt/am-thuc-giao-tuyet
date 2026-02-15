-- Migration: Add base_salary column to employees table
-- Description: Add monthly base salary field for fulltime employees
-- Date: 2026-02-04

-- Add base_salary column for fulltime employees
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS base_salary DECIMAL(15, 2) DEFAULT 0;

-- Add comment
COMMENT ON COLUMN employees.base_salary IS 'Monthly base salary for fulltime employees (VND)';

-- Update payroll calculation to use base_salary for fulltime employees
-- The calculate_payroll endpoint will be updated in Python code to:
-- If is_fulltime = true AND base_salary > 0: use base_salary / working_days_in_month
-- Else: use hourly_rate * hours_worked
