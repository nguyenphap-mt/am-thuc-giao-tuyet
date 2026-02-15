-- Migration: Order Revision Tracking
-- Feature: Tạo Báo Giá Mới Từ Đơn Hàng với Chuyển Cọc
-- Date: 2026-02-03

-- =============================================
-- 1. Order Revision Tracking Fields
-- =============================================

-- Add revision tracking to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS replaced_by_order_id UUID REFERENCES orders(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS replaces_order_id UUID REFERENCES orders(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Index for revision queries
CREATE INDEX IF NOT EXISTS idx_orders_replaced_by ON orders(replaced_by_order_id) WHERE replaced_by_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_replaces ON orders(replaces_order_id) WHERE replaces_order_id IS NOT NULL;

-- =============================================
-- 2. Payment Transfer Tracking
-- =============================================

-- Add transfer tracking to order_payments table
ALTER TABLE order_payments ADD COLUMN IF NOT EXISTS transfer_from_order_id UUID REFERENCES orders(id);
ALTER TABLE order_payments ADD COLUMN IF NOT EXISTS is_transferred BOOLEAN DEFAULT FALSE;

-- Index for transfer queries
CREATE INDEX IF NOT EXISTS idx_order_payments_transfer_from ON order_payments(transfer_from_order_id) WHERE transfer_from_order_id IS NOT NULL;

-- =============================================
-- 3. Quote Revision Link
-- =============================================

-- Add link from Quote to Order it will replace
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS replaces_order_id UUID REFERENCES orders(id);

-- Index for revision quote queries
CREATE INDEX IF NOT EXISTS idx_quotes_replaces_order ON quotes(replaces_order_id) WHERE replaces_order_id IS NOT NULL;

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON COLUMN orders.replaced_by_order_id IS 'ID of the new order that replaced this cancelled order';
COMMENT ON COLUMN orders.replaces_order_id IS 'ID of the old order that this order replaced';
COMMENT ON COLUMN orders.cancel_reason IS 'Reason for cancellation, e.g., "Replaced by DH-2026XXXX"';
COMMENT ON COLUMN order_payments.transfer_from_order_id IS 'Original order ID if this payment was transferred';
COMMENT ON COLUMN order_payments.is_transferred IS 'True if this payment has been transferred to another order';
COMMENT ON COLUMN quotes.replaces_order_id IS 'Order ID that this quote will replace when converted';
