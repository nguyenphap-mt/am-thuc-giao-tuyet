-- Migration 063: Fix users_read_own policy — wrap auth.uid() in (SELECT ...)
-- Problem: users_read_own uses bare auth.uid() which prevents InitPlan optimization
-- Solution: Wrap auth.uid() in (SELECT auth.uid()) subquery
-- Reference: BUG-20260219-002
-- Date: 2026-02-19

BEGIN;

DROP POLICY IF EXISTS users_read_own ON users;
CREATE POLICY users_read_own ON users
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid())::text = id::text);

COMMIT;
