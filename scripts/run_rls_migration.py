import asyncio
import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from backend.core.database import async_engine

async def migrate_rls():
    migration_file = os.path.join(os.path.dirname(__file__), "../backend/migrations/019_auth_rls.sql")
    
    if not os.path.exists(migration_file):
        print(f"Error: Migration file not found at {migration_file}")
        return

    with open(migration_file, "r", encoding="utf-8") as f:
        sql_script = f.read()

    async with async_engine.begin() as conn:
        print("Executing 019_auth_rls.sql...")
        
        # Split by semicolon to execute distinct statements
        statements = sql_script.split(';')
        
        for statement in statements:
            if statement.strip():
                try:
                    # Use text() for raw SQL
                    await conn.execute(text(statement))
                except Exception as e:
                    print(f"Error executing statement: {statement[:50]}...")
                    print(f"Details: {e}")
                    raise e
        
        print("Migration completed.")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(migrate_rls())
