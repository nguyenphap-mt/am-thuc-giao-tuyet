-- =================================================================
-- Migration: Create Purchase Requisition Tables
-- Date: 2026-01-27
-- Description: Add purchase_requisitions and purchase_requisition_lines tables
-- =================================================================

-- Purchase Requisitions (Phiếu yêu cầu mua hàng)
CREATE TABLE IF NOT EXISTS purchase_requisitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED, CONVERTED
    priority VARCHAR(20) DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, URGENT
    
    requested_by UUID,  -- User ID who requested
    approved_by UUID,   -- User ID who approved
    approved_at TIMESTAMP WITH TIME ZONE,
    
    notes TEXT,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    
    -- Reference to PO if converted
    converted_to_po_id UUID,
    converted_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase Requisition Lines (Chi tiết item trong PR)
CREATE TABLE IF NOT EXISTS purchase_requisition_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    pr_id UUID NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
    
    line_number INTEGER DEFAULT 1,
    item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    item_sku VARCHAR(50),
    
    quantity DECIMAL(15, 2) DEFAULT 1,
    uom VARCHAR(50),
    estimated_unit_price DECIMAL(15, 2) DEFAULT 0,
    estimated_total DECIMAL(15, 2) DEFAULT 0,
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pr_tenant_status ON purchase_requisitions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_pr_lines_pr_id ON purchase_requisition_lines(pr_id);
CREATE INDEX IF NOT EXISTS idx_pr_lines_item_id ON purchase_requisition_lines(item_id);

-- RLS Policies
ALTER TABLE purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requisition_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchase_requisitions_tenant_isolation" ON purchase_requisitions
    FOR ALL USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY "purchase_requisition_lines_tenant_isolation" ON purchase_requisition_lines
    FOR ALL USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Grant basic permissions
GRANT ALL ON purchase_requisitions TO postgres;
GRANT ALL ON purchase_requisition_lines TO postgres;

-- Done
SELECT 'Purchase Requisition tables created successfully!' AS result;
