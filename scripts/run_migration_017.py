
import asyncio
import sys
import os

# Add the project root to the path so we can import backend modules
sys.path.append(os.path.join(os.getcwd()))

from sqlalchemy import text
from backend.core.database import async_engine

async def migrate():
    async with async_engine.begin() as conn:
        print("Reading migration file...")
        with open("backend/migrations/017_procurement_item_link.sql", "r", encoding="utf-8") as f:
            sql_content = f.read()
            
        print("Executing migration 017...")
        # Split by semicolon to handle multiple statements if any, 
        # but sqlalchemy execute might handle it or we can execute the whole block.
        # usually execute(text(sql)) works for multiple statements if the driver supports it.
        # simpler to just run it.
        await conn.execute(text(sql_content))
        
        print("Migration 017 applied successfully.")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(migrate())
