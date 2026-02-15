import sys
import os
import asyncio
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))
from backend.core.database import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as session:
        # Check Tenants
        try:
            result = await session.execute(text("SELECT id, name FROM tenants LIMIT 1"))
            tenant = result.fetchone()
            print(f"Tenant: {tenant}")
        except Exception as e:
            print(f"Error fetching tenant: {e}")

        # Check Categories
        try:
            result = await session.execute(text("SELECT count(*) FROM categories"))
            cat_count = result.scalar()
            print(f"Categories Count: {cat_count}")
            
            result = await session.execute(text("SELECT name FROM categories LIMIT 5"))
            cats = result.fetchall()
            print("Sample Categories:", [c[0] for c in cats])
        except Exception as e:
            print(f"Error fetching categories: {e}")

        # Check Menu Items
        try:
            result = await session.execute(text("SELECT count(*) FROM menu_items"))
            item_count = result.scalar()
            print(f"Menu Items Count: {item_count}")
        except Exception as e:
            print(f"Error fetching items: {e}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
