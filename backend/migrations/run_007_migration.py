"""
Migration script: Order Revision Tracking
Run: python backend/migrations/run_007_migration.py
"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def run_migration():
    engine = create_async_engine('postgresql+asyncpg://postgres:postgres@localhost:5432/catering_db')
    
    async with engine.begin() as conn:
        print("Running migration 007: Order Revision Tracking...")
        
        # Order revision tracking
        await conn.execute(text('ALTER TABLE orders ADD COLUMN IF NOT EXISTS replaced_by_order_id UUID'))
        await conn.execute(text('ALTER TABLE orders ADD COLUMN IF NOT EXISTS replaces_order_id UUID'))
        await conn.execute(text('ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT'))
        print("✓ Added revision tracking columns to orders")
        
        # Payment transfer tracking
        await conn.execute(text('ALTER TABLE order_payments ADD COLUMN IF NOT EXISTS transfer_from_order_id UUID'))
        await conn.execute(text('ALTER TABLE order_payments ADD COLUMN IF NOT EXISTS is_transferred BOOLEAN DEFAULT FALSE'))
        print("✓ Added transfer tracking columns to order_payments")
        
        # Quote revision link
        await conn.execute(text('ALTER TABLE quotes ADD COLUMN IF NOT EXISTS replaces_order_id UUID'))
        print("✓ Added replaces_order_id to quotes")
        
        # Create indexes
        await conn.execute(text('CREATE INDEX IF NOT EXISTS idx_orders_replaced_by ON orders(replaced_by_order_id) WHERE replaced_by_order_id IS NOT NULL'))
        await conn.execute(text('CREATE INDEX IF NOT EXISTS idx_orders_replaces ON orders(replaces_order_id) WHERE replaces_order_id IS NOT NULL'))
        await conn.execute(text('CREATE INDEX IF NOT EXISTS idx_quotes_replaces_order ON quotes(replaces_order_id) WHERE replaces_order_id IS NOT NULL'))
        print("✓ Created indexes")
        
        print("\n✅ Migration 007 completed successfully!")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_migration())
