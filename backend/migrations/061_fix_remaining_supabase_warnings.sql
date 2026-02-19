-- Migration: 061_fix_remaining_supabase_warnings.sql
-- Purpose: Fix ALL 5 remaining Supabase Security Advisor warnings
-- Date: 2026-02-19
-- Warnings fixed:
--   1. quote_note_presets - RLS Policy Always True (add tenant_id + proper policy)
--   2. user_sessions - RLS Policy Always True (add tenant_id + proper policy)
--   3-5. Extensions (unaccent, pg_trgm, vector) in public schema → move to extensions schema


-- =============================================
-- PART 1: Fix quote_note_presets (add tenant_id)
-- =============================================

-- 1a. Add tenant_id column (nullable first for backfill)
ALTER TABLE quote_note_presets ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- 1b. Backfill: set tenant_id for all existing rows using first tenant
DO $$ 
DECLARE
    first_tenant_id UUID;
BEGIN
    SELECT id INTO first_tenant_id FROM tenants LIMIT 1;
    IF first_tenant_id IS NOT NULL THEN
        UPDATE quote_note_presets SET tenant_id = first_tenant_id WHERE tenant_id IS NULL;
    END IF;
END $$;

-- 1c. Drop old UNIQUE constraint on content (will be replaced with tenant-scoped unique)
ALTER TABLE quote_note_presets DROP CONSTRAINT IF EXISTS quote_note_presets_content_key;

-- 1d. Add tenant-scoped unique constraint
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_quote_note_presets_tenant_content'
    ) THEN
        ALTER TABLE quote_note_presets 
            ADD CONSTRAINT uq_quote_note_presets_tenant_content UNIQUE (tenant_id, content);
    END IF;
END $$;

-- 1e. Drop old "always true" policies
DROP POLICY IF EXISTS allow_all_quote_note_presets ON public.quote_note_presets;
DROP POLICY IF EXISTS tenant_auto_policy ON public.quote_note_presets;
DROP POLICY IF EXISTS tenant_isolation_quote_note_presets ON public.quote_note_presets;
DROP POLICY IF EXISTS authenticated_access_quote_note_presets ON public.quote_note_presets;

-- 1f. Create proper tenant isolation policy
CREATE POLICY tenant_isolation_quote_note_presets ON public.quote_note_presets
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', TRUE)::UUID)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', TRUE)::UUID);


-- =============================================
-- PART 2: Fix user_sessions (add tenant_id)
-- =============================================

-- 2a. Add tenant_id column (nullable first for backfill)
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- 2b. Backfill: set tenant_id from users table via user_id
DO $$
BEGIN
    UPDATE user_sessions us 
    SET tenant_id = u.tenant_id 
    FROM users u 
    WHERE us.user_id = u.id AND us.tenant_id IS NULL;
END $$;

-- 2c. Drop old "always true" and "user isolation" policies
DROP POLICY IF EXISTS allow_all_user_sessions ON public.user_sessions;
DROP POLICY IF EXISTS tenant_auto_policy ON public.user_sessions;
DROP POLICY IF EXISTS tenant_isolation_user_sessions ON public.user_sessions;
DROP POLICY IF EXISTS user_isolation_user_sessions ON public.user_sessions;

-- 2d. Create proper tenant isolation policy
CREATE POLICY tenant_isolation_user_sessions ON public.user_sessions
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', TRUE)::UUID)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', TRUE)::UUID);


-- =============================================
-- PART 3: Move extensions to 'extensions' schema
-- =============================================

-- 3a. Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- 3b. Move unaccent (no user-defined dependencies)
ALTER EXTENSION unaccent SET SCHEMA extensions;

-- 3c. Move pg_trgm (no user-defined dependencies confirmed)
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- 3d. Move vector (no user-defined dependencies confirmed)
ALTER EXTENSION vector SET SCHEMA extensions;

-- 3e. Add extensions schema to default search_path so they remain accessible
ALTER DATABASE postgres SET search_path TO public, extensions;

-- 3f. Also set for current session
SET search_path TO public, extensions;


-- =============================================
-- VERIFICATION: Check all warnings resolved
-- =============================================
-- After running this migration, verify:
-- 1. quote_note_presets has tenant_id + proper RLS policy
-- 2. user_sessions has tenant_id + proper RLS policy  
-- 3. All 3 extensions moved to 'extensions' schema
-- Run: SELECT e.extname, n.nspname FROM pg_extension e JOIN pg_namespace n ON e.extnamespace = n.oid;
