import asyncio
import asyncpg
import sys

# DSN for asyncpg
DB_DSN = "postgresql://postgres:postgres@localhost:5432/catering_db"

async def main():
    print(f"Connecting to {DB_DSN}...")
    try:
        conn = await asyncpg.connect(DB_DSN)
        
        with open("backend/migrations/016_inventory_module_real.sql", "r", encoding="utf-8") as f:
            sql_content = f.read()
            
        print("Executing migration 016...")
        await conn.execute(sql_content)
        
        print("Migration executed successfully!")
        await conn.close()
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
