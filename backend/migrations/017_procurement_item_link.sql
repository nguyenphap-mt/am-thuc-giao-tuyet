-- Add item_id to purchase_order_items table
ALTER TABLE purchase_order_items 
ADD COLUMN item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_purchase_order_items_item_id ON purchase_order_items(item_id);
