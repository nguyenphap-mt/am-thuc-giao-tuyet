-- Migration: Add logo_data BYTEA column to tenants table
-- BUGFIX: BUG-20260218-003 - Cloud Run ephemeral filesystem loses uploaded files
-- Solution: Store logo image data directly in PostgreSQL

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_data BYTEA;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_content_type VARCHAR(50);
