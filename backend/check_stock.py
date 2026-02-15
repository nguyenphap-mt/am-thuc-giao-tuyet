import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    engine = create_async_engine('postgresql+asyncpg://postgres:postgres@localhost:5432/catering_db')
    async with engine.connect() as conn:
        q = text("""
            SELECT i.name, i.min_stock,
                   COALESCE(SUM(s.quantity), 0) as cur
            FROM inventory_items i
            LEFT JOIN inventory_stock s ON i.id = s.item_id
            WHERE i.is_active = true
            GROUP BY i.id, i.name, i.min_stock
        """)
        rows = await conn.execute(q)
        for r in rows:
            n, ms, cs = r
            ms = float(ms or 0)
            cs = float(cs or 0)
            t = ms * 1.2
            st = "CRIT" if cs <= 0 else "WARN" if cs < ms else "LOW" if cs <= t else "OK"
            print(f"{n}: cur={cs} min={ms} t120={t} => {st}")
    await engine.dispose()

asyncio.run(main())
