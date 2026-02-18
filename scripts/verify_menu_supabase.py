
import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def verify_menu_data():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not set.")
        return

    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")

    try:
        # Disable prepared statement cache for Supabase Transaction Mode
        engine = create_async_engine(
            database_url,
            connect_args={"server_settings": {"search_path": "public"}, "statement_cache_size": 0, "prepared_statement_cache_size": 0}
        )
        async with engine.begin() as conn:
            # Set Tenant
            await conn.execute(text("SET app.current_tenant = '00000000-0000-0000-0000-000000000000'"))
            
            res = await conn.execute(text("SELECT count(*) FROM menu_items"))
            count = res.scalar()
            print(f"Total Menu Items: {count}")
            
            res = await conn.execute(text("SELECT name FROM menu_items LIMIT 5"))
            items = res.fetchall()
            print("Sample Items:", [i[0] for i in items])

        await engine.dispose()
    except Exception as e:
        print(f"Verification Failed: {e}")

if __name__ == "__main__":
    asyncio.run(verify_menu_data())
