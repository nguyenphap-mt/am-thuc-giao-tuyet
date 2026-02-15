-- =====================================================
-- Phase 12: Recipe/Ingredient Mapping Table
-- Links Menu Items khớp Inventory Items (nguyên liệu)
-- =====================================================

-- Table: recipes (công thức nấu ăn)
CREATE TABLE IF NOT EXISTS recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    
    -- Liên kết với Menu Item
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    menu_item_name VARCHAR(255) NOT NULL, -- Denormalized for query performance
    
    -- Liên kết với Inventory Item (nguyên liệu)
    ingredient_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    ingredient_name VARCHAR(255) NOT NULL, -- Denormalized
    
    -- Số lượng nguyên liệu cần cho 1 đơn vị món ăn
    quantity_per_unit DECIMAL(15, 4) NOT NULL DEFAULT 1,
    uom VARCHAR(50) NOT NULL DEFAULT 'kg', -- Unit of measure
    
    -- Ghi chú
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- RLS tenant isolation
    CONSTRAINT fk_recipe_tenant FOREIGN KEY (tenant_id) 
        REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index for fast lookups
CREATE INDEX idx_recipes_tenant ON recipes(tenant_id);
CREATE INDEX idx_recipes_menu_item ON recipes(menu_item_id);
CREATE INDEX idx_recipes_ingredient ON recipes(ingredient_id);

-- Unique constraint: một menu item chỉ có 1 entry cho mỗi ingredient
CREATE UNIQUE INDEX idx_recipes_unique ON recipes(tenant_id, menu_item_id, ingredient_id);

-- RLS Policy
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY recipes_tenant_isolation ON recipes
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- =====================================================
-- Sample Data (Optional - for testing)
-- =====================================================

-- Bạn có thể thêm sample data sau khi có menu_items và inventory_items
-- INSERT INTO recipes (tenant_id, menu_item_id, menu_item_name, ingredient_id, ingredient_name, quantity_per_unit, uom)
-- VALUES (
--     'your-tenant-id',
--     'menu-item-uuid',
--     'Gỏi bò bắp ngũ sắc',
--     'ingredient-uuid',
--     'Thịt bò',
--     0.5,
--     'kg'
-- );

-- =====================================================
-- Updated timestamp trigger
-- =====================================================
CREATE OR REPLACE FUNCTION update_recipes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recipes_timestamp
    BEFORE UPDATE ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_recipes_timestamp();

-- =====================================================
-- Comment
-- =====================================================
COMMENT ON TABLE recipes IS 'Mapping table: Menu Items → Inventory Ingredients. Used by Pull Sheet to calculate required ingredients.';
