"""
Run migration 011: Add composite indexes for inventory performance
"""
import asyncio
import asyncpg

async def run_migration():
    conn = await asyncpg.connect(
        host='localhost',
        port=5432,
        user='postgres',
        password='postgres',
        database='catering_db'
    )
    try:
        # Index for faster stock lookups by item + warehouse
        await conn.execute('''
            CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_warehouse 
            ON inventory_transactions(item_id, warehouse_id);
        ''')
        print("✅ Index 1: idx_inventory_transactions_item_warehouse created")
        
        # Index for faster lot FIFO queries
        await conn.execute('''
            CREATE INDEX IF NOT EXISTS idx_inventory_lots_item_warehouse_status 
            ON inventory_lots(item_id, warehouse_id, status) 
            WHERE status = 'ACTIVE';
        ''')
        print("✅ Index 2: idx_inventory_lots_item_warehouse_status created")
        
        # Index for faster stock aggregation
        await conn.execute('''
            CREATE INDEX IF NOT EXISTS idx_inventory_stock_item_warehouse 
            ON inventory_stock(item_id, warehouse_id);
        ''')
        print("✅ Index 3: idx_inventory_stock_item_warehouse created")
        
        print("\n✅ Migration 011 successful: All inventory indexes created")
        
    except Exception as e:
        print(f"❌ Migration error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migration())
