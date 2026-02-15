
import asyncio
import sys
import os
from sqlalchemy import text

# Add the project root to the path
sys.path.append(os.getcwd())

from backend.core.database import async_engine

async def verify_column():
    async with async_engine.connect() as conn:
        print("Checking purchase_order_items columns...")
        result = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'purchase_order_items';"))
        columns = [row[0] for row in result.fetchall()]
        print(f"Columns: {columns}")
        
        if 'item_id' in columns:
            print("SUCCESS: item_id column exists.")
        else:
            print("FAILURE: item_id column does NOT exist.")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(verify_column())
