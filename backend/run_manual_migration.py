
import asyncio
import sys
import os
sys.path.append(os.getcwd())
from sqlalchemy import text
from backend.core.database import async_engine

async def migrate():
    async with async_engine.begin() as conn:
        print("Creating purchase_orders table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS purchase_orders (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                tenant_id UUID NOT NULL, -- Removed REFERENCES tenants(id) to avoid dependency check failure if tenants table is missing (though it should be there), wait, assuming tenants exists.
                supplier_id UUID REFERENCES suppliers(id),
                event_id UUID, -- Removed REFERENCES events(id) as per models.py
                
                code VARCHAR(50) NOT NULL,
                total_amount DECIMAL(15, 2) DEFAULT 0,
                status VARCHAR(50) DEFAULT 'DRAFT',
                expected_delivery TIMESTAMP,
                note TEXT,
                
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        print("Creating purchase_order_items table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS purchase_order_items (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                tenant_id UUID NOT NULL,
                purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
                
                item_name VARCHAR(255) NOT NULL,
                quantity DECIMAL(15, 2) DEFAULT 1,
                uom VARCHAR(50),
                unit_price DECIMAL(15, 2) DEFAULT 0,
                total_price DECIMAL(15, 2) DEFAULT 0,
                
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        print("Enabling RLS...")
        await conn.execute(text("ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;"))
        await conn.execute(text("ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;"))
        
        print("Creating Policies...")
        await conn.execute(text("DROP POLICY IF EXISTS tenant_isolation_purchase_orders ON purchase_orders;"))
        await conn.execute(text("CREATE POLICY tenant_isolation_purchase_orders ON purchase_orders USING (tenant_id = current_setting('app.current_tenant')::UUID);"))
        
        await conn.execute(text("DROP POLICY IF EXISTS tenant_isolation_purchase_order_items ON purchase_order_items;"))
        await conn.execute(text("CREATE POLICY tenant_isolation_purchase_order_items ON purchase_order_items USING (tenant_id = current_setting('app.current_tenant')::UUID);"))

        print("Done.")

if __name__ == "__main__":
    asyncio.run(migrate())
