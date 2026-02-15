"""
Run migration 010: Add cost_amount to orders table
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
        # Add cost_amount column
        await conn.execute('''
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS cost_amount DECIMAL(15, 2) DEFAULT 0;
        ''')
        print("✅ Migration 010 successful: Added cost_amount column to orders table")
        
        # Verify column exists
        result = await conn.fetchrow('''
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'orders' AND column_name = 'cost_amount'
        ''')
        if result:
            print(f"   Column verified: {result['column_name']} ({result['data_type']})")
        
    except Exception as e:
        print(f"❌ Migration error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migration())
