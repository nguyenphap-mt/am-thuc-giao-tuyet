-- Migration: 004_menu_module.sql
-- Module: Menu Management (Inventory)

-- 1. Categories Table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Menu Items Table
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    uom VARCHAR(50) DEFAULT 'dĩa', -- Unit of Measure
    cost_price DECIMAL(15, 2) DEFAULT 0,
    selling_price DECIMAL(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Set Menus Table (Combos)
CREATE TABLE set_menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    code VARCHAR(50),
    price DECIMAL(15, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Set Menu Items (Link Table)
CREATE TABLE set_menu_items (
    set_menu_id UUID REFERENCES set_menus(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    quantity INT DEFAULT 1,
    PRIMARY KEY (set_menu_id, menu_item_id)
);

-- 5. Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_menus ENABLE ROW LEVEL SECURITY;
-- set_menu_items is a link table, check if RLS needed (usually inherits from parent join, but safe to enable if direct access)

-- 6. RLS Policies
CREATE POLICY tenant_isolation_categories ON categories USING (tenant_id = current_setting('app.current_tenant')::UUID);
CREATE POLICY tenant_isolation_menu_items ON menu_items USING (tenant_id = current_setting('app.current_tenant')::UUID);
CREATE POLICY tenant_isolation_set_menus ON set_menus USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- 7. Indexes
CREATE INDEX idx_menu_items_tenant_category ON menu_items(tenant_id, category_id);
CREATE INDEX idx_categories_tenant ON categories(tenant_id);
