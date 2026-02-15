-- HR Module Performance Indexes
-- Migration: 048_hr_indexes.sql
-- Date: 2026-02-04
-- Purpose: Add indexes for staff_assignments and leave_balances as per PRD audit

-- =============================================
-- P3-DA001: Index on staff_assignments.event_id
-- =============================================
-- This improves lookup performance when querying assignments by order/event

CREATE INDEX IF NOT EXISTS idx_staff_assignments_event_id 
ON staff_assignments(event_id);

CREATE INDEX IF NOT EXISTS idx_staff_assignments_employee_id 
ON staff_assignments(employee_id);

CREATE INDEX IF NOT EXISTS idx_staff_assignments_status 
ON staff_assignments(status);

-- Composite index for common query pattern (find assignments by event + status)
CREATE INDEX IF NOT EXISTS idx_staff_assignments_event_status 
ON staff_assignments(event_id, status);


-- =============================================
-- P3-DA002: Unique constraint on leave_balances
-- =============================================
-- Prevents duplicate balance records for same employee/year/leave_type

-- First, check for and remove duplicates (if any)
-- Keep the most recent record
DELETE FROM leave_balances 
WHERE id NOT IN (
    SELECT DISTINCT ON (employee_id, leave_type_id, year) id
    FROM leave_balances
    ORDER BY employee_id, leave_type_id, year, created_at DESC
);

-- Add unique constraint
ALTER TABLE leave_balances 
ADD CONSTRAINT uq_leave_balances_employee_type_year 
UNIQUE (employee_id, leave_type_id, year);


-- =============================================
-- Additional indexes for timesheets
-- =============================================
CREATE INDEX IF NOT EXISTS idx_timesheets_employee_date 
ON timesheets(employee_id, work_date);

CREATE INDEX IF NOT EXISTS idx_timesheets_work_date 
ON timesheets(work_date);

CREATE INDEX IF NOT EXISTS idx_timesheets_status 
ON timesheets(status);


-- =============================================
-- Payroll indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_payroll_items_period_id 
ON payroll_items(period_id);

CREATE INDEX IF NOT EXISTS idx_payroll_periods_status 
ON payroll_periods(status);

CREATE INDEX IF NOT EXISTS idx_payroll_periods_dates 
ON payroll_periods(start_date, end_date);
