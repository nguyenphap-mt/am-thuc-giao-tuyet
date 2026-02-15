-- Migration: 007_calendar_module.sql
-- Module: Calendar (Operations)

-- 1. Events Table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id), -- Link to Order
    
    name VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    setup_time TIMESTAMP, -- Time to start preparation
    location TEXT,
    
    status VARCHAR(50) DEFAULT 'SCHEDULED', -- SCHEDULED, SETUP, RUNNING, CLEANUP, COMPLETED, CANCELLED
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY tenant_isolation_events ON events USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- 4. Indexes
CREATE INDEX idx_events_tenant_time ON events(tenant_id, start_time, end_time);
CREATE INDEX idx_events_order ON events(order_id);
