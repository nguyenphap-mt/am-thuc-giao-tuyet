-- Migration: Add staff_count to quotes table
-- Date: 2026-01-19

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS staff_count INTEGER DEFAULT 0;
