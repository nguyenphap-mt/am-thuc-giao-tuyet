-- Migration: 013_inventory_module.sql
-- Module: Advanced Inventory (BOM)

-- 1. Recipes Table (Header)
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE, -- Link to Menu
    
    name VARCHAR(255) NOT NULL,
    yield_amount DECIMAL(15, 2) DEFAULT 1, -- Số lượng phần làm ra
    total_cost DECIMAL(15, 2) DEFAULT 0, -- Tổng giá vốn của công thức
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Recipe Items (Ingredients)
CREATE TABLE recipe_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    
    ingredient_name VARCHAR(255) NOT NULL, -- Free text or Link to Material
    quantity DECIMAL(15, 2) NOT NULL,
    uom VARCHAR(50),
    unit_cost DECIMAL(15, 2) DEFAULT 0,
    total_cost DECIMAL(15, 2) DEFAULT 0, -- qty * unit_cost
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Enable RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY tenant_isolation_recipes ON recipes USING (tenant_id = current_setting('app.current_tenant')::UUID);
CREATE POLICY tenant_isolation_recipe_items ON recipe_items USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- 5. Indexes
CREATE INDEX idx_recipes_menu_item ON recipes(menu_item_id);
CREATE INDEX idx_recipe_items_recipe ON recipe_items(recipe_id);
