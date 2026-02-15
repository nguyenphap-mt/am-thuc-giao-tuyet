-- Migration 020: Menu Module Enhancements
-- Date: 2026-02-07
-- Description: Add sort_order columns, performance indexes, and set_menus tables

-- 1. Add sort_order to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 2. Add sort_order to menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 3. Add performance index for filtering
CREATE INDEX IF NOT EXISTS idx_menu_items_active_price 
ON menu_items(tenant_id, is_active, selling_price);

-- 4. Add index for category lookup
CREATE INDEX IF NOT EXISTS idx_menu_items_category
ON menu_items(tenant_id, category_id);

-- 5. Add sort_order index for categories
CREATE INDEX IF NOT EXISTS idx_categories_sort
ON categories(tenant_id, sort_order);

-- 6. Create set_menus table
CREATE TABLE IF NOT EXISTS set_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    image_url TEXT,
    selling_price NUMERIC(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create set_menu_items table
CREATE TABLE IF NOT EXISTS set_menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    set_menu_id UUID NOT NULL REFERENCES set_menus(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. RLS for set_menus
ALTER TABLE set_menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_set_menus ON set_menus;
CREATE POLICY tenant_isolation_set_menus ON set_menus
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- 9. RLS for set_menu_items
ALTER TABLE set_menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_set_menu_items ON set_menu_items;
CREATE POLICY tenant_isolation_set_menu_items ON set_menu_items
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- 10. Indexes for set_menus
CREATE INDEX IF NOT EXISTS idx_set_menus_tenant ON set_menus(tenant_id);
CREATE INDEX IF NOT EXISTS idx_set_menu_items_set_menu ON set_menu_items(set_menu_id);
