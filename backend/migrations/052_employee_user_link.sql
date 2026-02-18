-- Migration 052: Link employees to users
-- Purpose: Add user_id FK to employees table for User-Employee unification
-- Date: 2026-02-18

-- Step 1: Add user_id column with FK to users
ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Step 2: Create unique index (one employee per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id) WHERE user_id IS NOT NULL;

-- Step 3: Backfill - match existing employees to users by email within same tenant
UPDATE employees e 
SET user_id = u.id 
FROM users u 
WHERE LOWER(e.email) = LOWER(u.email) 
  AND e.tenant_id = u.tenant_id 
  AND e.user_id IS NULL
  AND e.email IS NOT NULL
  AND e.email != '';
