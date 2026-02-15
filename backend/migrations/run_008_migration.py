"""Run migration 008: Add started_at column to orders table (standalone version)"""
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
        await conn.execute('''
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
        ''')
        print("✅ Migration successful: Added started_at column to orders table")
    except Exception as e:
        print(f"Migration error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migration())
