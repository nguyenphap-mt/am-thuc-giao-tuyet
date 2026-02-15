import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/catering_db"

async def check_user():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT id, email, role, is_active FROM users WHERE email = 'admin@catering.com'"))
        row = result.fetchone()
        if row:
            print(f"User Found: ID={row.id}, Email={row.email}, Role={row.role}, Active={row.is_active}")
        else:
            print("User NOT Found")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_user())
