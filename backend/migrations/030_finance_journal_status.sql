-- Migration 030: Finance Journal Status Workflow (FIN-001)
-- Date: 2026-02-06
-- Description: Add status workflow to journals table

-- Add status field with default DRAFT
ALTER TABLE journals 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'DRAFT';

-- Add posted_at timestamp  
ALTER TABLE journals 
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP WITH TIME ZONE;

-- Add posted_by user reference
ALTER TABLE journals 
ADD COLUMN IF NOT EXISTS posted_by UUID;

-- Add reversed_journal_id for reversal tracking
ALTER TABLE journals 
ADD COLUMN IF NOT EXISTS reversed_journal_id UUID;

-- Update existing journals to POSTED status (they were auto-created)
UPDATE journals 
SET status = 'POSTED', posted_at = created_at 
WHERE status IS NULL OR status = 'DRAFT';

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_journals_status ON journals(status);
CREATE INDEX IF NOT EXISTS idx_journals_tenant_status ON journals(tenant_id, status);

-- Add check constraint for valid statuses
ALTER TABLE journals 
ADD CONSTRAINT chk_journal_status 
CHECK (status IN ('DRAFT', 'POSTED', 'REVERSED'));

COMMENT ON COLUMN journals.status IS 'Journal status: DRAFT (editable), POSTED (locked), REVERSED (cancelled)';
COMMENT ON COLUMN journals.posted_at IS 'Timestamp when journal was posted';
COMMENT ON COLUMN journals.posted_by IS 'User ID who posted the journal';
COMMENT ON COLUMN journals.reversed_journal_id IS 'Reference to reversal journal if this journal was reversed';
