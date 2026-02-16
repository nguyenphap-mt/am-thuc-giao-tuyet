-- Migration: Fix Schema Mismatches (Supabase Production DB)
-- Date: 2026-02-16
-- Bug: Dashboard 500 errors on /tenants/me and /hr/notifications/count
-- Root Cause: ORM models expected columns that didn't exist in Supabase DB

-- ============================================================
-- FIX 1: notifications table - user_id does not exist
-- ORM expects: user_id, message, reference_type, reference_id, read_at
-- DB had: recipient_id, body, action_link (no reference_type/id/read_at)
-- ============================================================

-- Step 1a: Rename recipient_id to user_id
ALTER TABLE public.notifications RENAME COLUMN recipient_id TO user_id;

-- Step 1b: Rename body to message
ALTER TABLE public.notifications RENAME COLUMN body TO message;

-- Step 1c: Add missing columns
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS reference_id UUID,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- ============================================================
-- FIX 2: tenants table - code does not exist
-- ORM expects: code, is_active, address, trial_ends_at, suspended_at, metadata
-- DB was missing these columns
-- ============================================================

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
