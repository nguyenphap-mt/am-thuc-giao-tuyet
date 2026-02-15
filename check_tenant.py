import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check():
    engine = create_async_engine("postgresql+asyncpg://postgres:postgres@localhost:5432/catering_db")
    async with engine.connect() as conn:
        # Check if tenant exists
        result = await conn.execute(text("SELECT id, name FROM tenants WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'"))
        row = result.fetchone()
        if row:
            print(f"Tenant exists: {row}")
        else:
            print("Tenant NOT found!")
            # List all tenants
            result = await conn.execute(text("SELECT id, name FROM tenants LIMIT 5"))
            print("Available tenants:", result.fetchall())

asyncio.run(check())
