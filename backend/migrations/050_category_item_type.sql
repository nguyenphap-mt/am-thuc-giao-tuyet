-- Migration: Add item_type to categories for food/service separation
-- Date: 2026-02-14

-- Step 1: Add item_type column with default 'FOOD'
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) NOT NULL DEFAULT 'FOOD';

-- Step 2: Update existing service categories
UPDATE categories SET item_type = 'SERVICE' WHERE code IN ('BAN', 'NV');

-- Step 3: Add index for filtering
CREATE INDEX IF NOT EXISTS idx_categories_item_type ON categories(item_type);

-- Verify
SELECT id, name, code, item_type FROM categories ORDER BY item_type, name;
