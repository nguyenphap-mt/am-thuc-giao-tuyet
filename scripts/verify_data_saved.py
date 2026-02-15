
import asyncio
import sys
import os
from sqlalchemy import text

# Add the project root to the path
sys.path.append(os.getcwd())

from backend.core.database import async_engine

async def verify_data():
    async with async_engine.connect() as conn:
        print("Checking latest purchase order items...")
        
        # Get the latest PO Item
        result = await conn.execute(text("""
            SELECT id, item_name, item_id, quantity 
            FROM purchase_order_items 
            ORDER BY created_at DESC 
            LIMIT 1;
        """))
        
        row = result.fetchone()
        
        if row:
            print(f"Latest Item: {row}")
            if row[2]: # item_id is at index 2
                print(f"SUCCESS: item_id is populated: {row[2]}")
            else:
                print("FAILURE: item_id is NULL.")
        else:
            print("No items found.")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(verify_data())
