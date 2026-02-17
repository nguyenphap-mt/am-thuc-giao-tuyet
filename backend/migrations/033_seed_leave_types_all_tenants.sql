-- Migration: 033_seed_leave_types_all_tenants.sql
-- Fix: BUG-20260217-003 - Leave types dropdown empty on production
-- Root Cause: leave_types seeded only for local tenant, not production tenant
-- Date: 17/02/2026

-- Seed leave types for ALL existing tenants that don't have them yet
DO $$
DECLARE
    t_id UUID;
BEGIN
    FOR t_id IN SELECT id FROM tenants LOOP
        -- Insert leave types if they don't exist for this tenant
        INSERT INTO leave_types (tenant_id, code, name, days_per_year, is_paid, requires_approval)
        VALUES
            (t_id, 'ANNUAL', 'Nghỉ phép năm', 12, TRUE, TRUE),
            (t_id, 'SICK', 'Nghỉ ốm', 30, TRUE, TRUE),
            (t_id, 'PERSONAL', 'Việc riêng', 3, FALSE, TRUE),
            (t_id, 'MARRIAGE', 'Kết hôn', 3, TRUE, FALSE),
            (t_id, 'BEREAVEMENT', 'Tang chế', 3, TRUE, FALSE)
        ON CONFLICT (tenant_id, code) DO NOTHING;
    END LOOP;
END $$;
