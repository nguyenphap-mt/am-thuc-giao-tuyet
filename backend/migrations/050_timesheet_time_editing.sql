-- Migration: Add timesheet time editing audit columns
-- Date: 2026-02-06
-- Purpose: Allow HR managers to edit check-in/check-out times with full audit trail

-- Add audit columns for time editing
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS original_start TIMESTAMP WITH TIME ZONE;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS original_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS time_edited_by UUID REFERENCES users(id);
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS time_edited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS edit_reason TEXT;

-- Add comments for documentation
COMMENT ON COLUMN timesheets.original_start IS 'Original check-in time before any edits';
COMMENT ON COLUMN timesheets.original_end IS 'Original check-out time before any edits';
COMMENT ON COLUMN timesheets.time_edited_by IS 'User ID who edited the times';
COMMENT ON COLUMN timesheets.time_edited_at IS 'Timestamp when times were edited';
COMMENT ON COLUMN timesheets.edit_reason IS 'Reason for editing the times';

-- Create index for audit queries
CREATE INDEX IF NOT EXISTS idx_timesheets_time_edited_at ON timesheets(time_edited_at) WHERE time_edited_at IS NOT NULL;
