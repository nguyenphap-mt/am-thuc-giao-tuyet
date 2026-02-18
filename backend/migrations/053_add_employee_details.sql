-- Migration 053: Add bank info and details to employees
-- Date: 2026-02-18

ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS notes TEXT;
