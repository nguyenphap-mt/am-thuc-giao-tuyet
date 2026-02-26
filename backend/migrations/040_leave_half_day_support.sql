-- Migration: 040_leave_half_day_support.sql
-- Leave Management Enhancement: Half-day leave support
-- Date: 22/02/2026

-- Add half-day support columns to leave_requests
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS
    is_half_day BOOLEAN DEFAULT FALSE;

ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS
    half_day_period VARCHAR(10);  -- 'MORNING' | 'AFTERNOON'

COMMENT ON COLUMN leave_requests.is_half_day IS 'Whether this is a half-day leave request';
COMMENT ON COLUMN leave_requests.half_day_period IS 'MORNING or AFTERNOON for half-day requests';
