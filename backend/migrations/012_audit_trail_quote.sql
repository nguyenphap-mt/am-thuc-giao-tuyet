-- Migration: Add Audit Trail for Quote Conversion
-- Date: 2026-01-23
-- Description: Add converted_by and converted_at columns to track who/when converted quote to order

ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS converted_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE;

-- Index for faster queries on converted quotes
CREATE INDEX IF NOT EXISTS idx_quotes_converted_at ON quotes(converted_at) WHERE converted_at IS NOT NULL;

COMMENT ON COLUMN quotes.converted_by IS 'User ID who converted this quote to an order';
COMMENT ON COLUMN quotes.converted_at IS 'Timestamp when quote was converted to order';
