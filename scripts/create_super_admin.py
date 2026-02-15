import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from backend.core.auth.security import get_password_hash

DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/catering_db"

async def create_user():
    email = "nguyenphap.mt@gmail.com"
    password = "123456Mylove"
    full_name = "Nguyen Phap"
    role = "super_admin"
    
    hashed_pw = get_password_hash(password)
    
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn: # Transactional
        # Check if exists
        result = await conn.execute(text("SELECT id FROM users WHERE email = :email"), {"email": email})
        existing = result.fetchone()
        
        if existing:
            # Update password if exists
            print(f"User {email} already exists. Updating password and role...")
            await conn.execute(
                text("UPDATE users SET hashed_password = :pw, role = :role, is_active = true WHERE email = :email"),
                {"pw": hashed_pw, "role": role, "email": email}
            )
            print("User updated successfully.")
        else:
            # Insert new
            print(f"Creating new user {email}...")
            await conn.execute(
                text("""
                    INSERT INTO users (email, hashed_password, full_name, role, is_active)
                    VALUES (:email, :pw, :name, :role, true)
                """),
                {"email": email, "pw": hashed_pw, "name": full_name, "role": role}
            )
            print("User created successfully.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_user())
