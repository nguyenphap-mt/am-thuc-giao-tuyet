
import asyncio
import sys
import os
sys.path.append(os.getcwd())
from sqlalchemy import text
from backend.core.database import async_engine

async def check_tables():
    async with async_engine.connect() as conn:
        result = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public';"))
        tables = result.scalars().all()
        print("Tables in public schema:", tables)

if __name__ == "__main__":
    asyncio.run(check_tables())
