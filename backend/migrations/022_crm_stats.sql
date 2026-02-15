-- Add statistics columns to customers table
ALTER TABLE customers 
ADD COLUMN total_spent NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN order_count INTEGER DEFAULT 0,
ADD COLUMN last_order_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster sorting/filtering
CREATE INDEX idx_customers_total_spent ON customers(total_spent DESC);
CREATE INDEX idx_customers_last_order ON customers(last_order_at DESC);
