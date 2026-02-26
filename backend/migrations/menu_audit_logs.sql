-- Menu Audit Logs Table
-- Tracks critical menu actions: price changes, recipe modifications, deletions
-- GAP-M4 from PRD-menu-permissions.md

CREATE TABLE IF NOT EXISTS menu_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    
    -- What happened
    action VARCHAR(30) NOT NULL,        -- PRICE_CHANGE, RECIPE_ADD, RECIPE_DELETE, RECIPE_UPDATE, ITEM_DELETE, CATEGORY_DELETE, SET_MENU_DELETE
    entity_type VARCHAR(30) NOT NULL,   -- MENU_ITEM, RECIPE, CATEGORY, SET_MENU
    entity_id UUID,
    entity_name VARCHAR(255),
    
    -- Who did it
    action_by UUID,
    action_by_name VARCHAR(255),
    
    -- Change details
    old_value TEXT,                      -- JSON string of previous state
    new_value TEXT,                      -- JSON string of new state
    details TEXT,                        -- Human-readable description
    
    action_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_menu_audit_tenant ON menu_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_menu_audit_action ON menu_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_menu_audit_entity ON menu_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_menu_audit_at ON menu_audit_logs(action_at);

-- RLS
ALTER TABLE menu_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS menu_audit_logs_tenant_isolation ON menu_audit_logs;
CREATE POLICY menu_audit_logs_tenant_isolation ON menu_audit_logs
    USING (tenant_id = (SELECT current_setting('app.current_tenant')::UUID));
