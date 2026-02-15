"""Run migration to add item_type to categories"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    e = create_async_engine('postgresql+asyncpg://postgres:postgres@localhost:5432/catering_db')
    async with e.begin() as c:
        await c.execute(text("ALTER TABLE categories ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) NOT NULL DEFAULT 'FOOD'"))
        await c.execute(text("UPDATE categories SET item_type = 'SERVICE' WHERE code IN ('BAN', 'NV')"))
        await c.execute(text("CREATE INDEX IF NOT EXISTS idx_categories_item_type ON categories(item_type)"))
        r = await c.execute(text("SELECT name, code, item_type FROM categories ORDER BY item_type, name"))
        print("Migration OK:")
        for row in r.fetchall():
            print(f"  {row}")
    await e.dispose()

asyncio.run(run())
