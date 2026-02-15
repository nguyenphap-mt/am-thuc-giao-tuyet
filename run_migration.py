"""Run SQL migration file against PostgreSQL database."""
import asyncio
import asyncpg
import sys

async def run_migration():
    conn = await asyncpg.connect('postgresql://postgres:postgres@localhost:5432/catering_db')
    try:
        # Read and execute the SQL file
        with open('backend/migrations/026_add_notifications_table.sql', 'r', encoding='utf-8') as f:
            sql = f.read()
        
        await conn.execute(sql)
        print("Migration completed successfully!")
    except Exception as e:
        print(f"Migration error: {e}")
        sys.exit(1)
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(run_migration())
