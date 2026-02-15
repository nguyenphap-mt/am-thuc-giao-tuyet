"""Run migration 009: Add cancellation fields to orders table"""
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
        # Add cancellation_type column
        await conn.execute('''
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_type VARCHAR(30);
        ''')
        print("✅ Added cancellation_type column")
        
        # Add refund_amount column
        await conn.execute('''
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(15,2) DEFAULT 0;
        ''')
        print("✅ Added refund_amount column")
        
        # Add cancelled_at column
        await conn.execute('''
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
        ''')
        print("✅ Added cancelled_at column")
        
        # Add cancelled_by column
        await conn.execute('''
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_by UUID;
        ''')
        print("✅ Added cancelled_by column")
        
        print("\n🎉 Migration 009 completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migration())
