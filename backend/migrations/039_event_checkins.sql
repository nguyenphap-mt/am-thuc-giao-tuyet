-- ============================================================================
-- Migration 039: GPS Event Check-in/Check-out Log
-- Mobile Platform Phase 1 (Sprint S1.4)
-- ============================================================================

-- GPS Check-in/Check-out Log
CREATE TABLE IF NOT EXISTS event_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    check_type VARCHAR(10) NOT NULL CHECK (check_type IN ('in', 'out')),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    recorded_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ,
    source VARCHAR(20) DEFAULT 'mobile' CHECK (source IN ('mobile', 'web', 'auto')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_checkin_tenant ON event_checkins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_checkin_employee ON event_checkins(employee_id);
CREATE INDEX IF NOT EXISTS idx_event_checkin_order ON event_checkins(order_id);
CREATE INDEX IF NOT EXISTS idx_event_checkin_recorded ON event_checkins(tenant_id, recorded_at);

-- Enable RLS
ALTER TABLE event_checkins ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY tenant_isolation_event_checkins ON event_checkins
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
