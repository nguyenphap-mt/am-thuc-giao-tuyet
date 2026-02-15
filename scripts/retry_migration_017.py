
import asyncio
import sys
import os
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

# Add the project root to the path
sys.path.append(os.getcwd())

from backend.core.database import async_engine

async def migrate():
    print("Starting migration retry...")
    try:
        async with async_engine.begin() as conn:
            print("Reading migration file...")
            with open("backend/migrations/017_procurement_item_link.sql", "r", encoding="utf-8") as f:
                sql_content = f.read()

            # Split statements by semicolon to avoid single-statement limitations
            statements = [s.strip() for s in sql_content.split(';') if s.strip()]
            
            for i, stmt in enumerate(statements):
                print(f"Executing statement {i+1}...")
                print(f"SQL: {stmt[:50]}...")
                await conn.execute(text(stmt))
            
            print("Migration 017 applied successfully.")
            
    except Exception as e:
        print("ERROR executing migration:")
        print(str(e))
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(migrate())
