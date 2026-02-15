-- Migration: Add LOST and EXPIRED status for quotes
-- Description: Support for marking quotes as lost (customer declined) or expired

-- Note: PostgreSQL requires string type for status in quotes table
-- The status field is VARCHAR, so we just need to ensure the application accepts new values

-- Add lost_reason column to store why the quote was lost
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS lost_reason VARCHAR(500) NULL;

-- Add lost_at column to track when quote was marked as lost
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS lost_at TIMESTAMP WITH TIME ZONE NULL;

-- Add expired_at column to track when quote expired
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP WITH TIME ZONE NULL;

-- Create index for filtering by status (if not exists)
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);

-- Add comment for documentation
COMMENT ON COLUMN quotes.lost_reason IS 'Reason why the quote was lost/declined by customer';
COMMENT ON COLUMN quotes.lost_at IS 'Timestamp when quote was marked as lost';
COMMENT ON COLUMN quotes.expired_at IS 'Timestamp when quote expired (past valid_until date)';
