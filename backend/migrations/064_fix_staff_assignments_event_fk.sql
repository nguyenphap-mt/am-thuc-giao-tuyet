-- Migration: 064_fix_staff_assignments_event_fk.sql
-- Date: 2026-02-19
-- BUGFIX: BUG-20260219-002
-- Problem: staff_assignments.event_id has a FK constraint to events(id) from original migration 009.
--          The system now uses event_id as a soft reference to ORDERS (not calendar events).
--          When assigning staff from order detail page, event_id = order_id (UUID from orders table),
--          which violates the FK constraint to events table, causing 500 Internal Server Error.
-- Solution: Drop the stale FK constraint. event_id is now a flexible soft reference (UUID without FK).

-- Step 1: Find and drop the FK constraint on event_id
DO $$
DECLARE
    fk_name TEXT;
BEGIN
    -- Find the constraint name dynamically
    SELECT tc.constraint_name INTO fk_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.table_name = 'staff_assignments'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'event_id'
        AND tc.table_schema = 'public';
    
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE staff_assignments DROP CONSTRAINT %I', fk_name);
        RAISE NOTICE 'Dropped FK constraint: %', fk_name;
    ELSE
        RAISE NOTICE 'No FK constraint found on staff_assignments.event_id - already clean';
    END IF;
END $$;

-- Step 2: Add a comment documenting the soft reference pattern
COMMENT ON COLUMN staff_assignments.event_id IS 'Soft reference to orders.id or events.id — no FK constraint by design (see migration 026_hr_complete.sql)';
