-- Migration: 044_procurement_indexes.sql
-- Purpose: Add indexes on frequently queried columns for procurement performance
-- Date: 2026-01-27
-- Issue: ISS-002 from PRD Audit

-- Purchase Orders indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant ON purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);

-- Purchase Requisitions indexes  
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_status ON purchase_requisitions(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_tenant ON purchase_requisitions(tenant_id);

-- Supplier indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);

-- Purchase Order Items indexes
CREATE INDEX IF NOT EXISTS idx_po_items_order ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_item ON purchase_order_items(item_id);

-- Comment: These indexes improve query performance for common filters (status, tenant_id)
-- and foreign key lookups (supplier_id, item_id)
