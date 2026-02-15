"""Test login directly"""
import asyncio
import sys
sys.path.insert(0, ".")

from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def test_login():
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    
    # Create async engine
    engine = create_async_engine(
        "postgresql+asyncpg://postgres:postgres@localhost:5432/catering_db",
        echo=True
    )
    
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Query user directly 
        from backend.core.auth.models import User
        
        result = await session.execute(
            select(User).where(User.email == "nguyenphap.mt@gmail.com")
        )
        user = result.scalar_one_or_none()
        
        if user:
            print(f"User found: {user.email}")
            print(f"  ID: {user.id}")
            print(f"  Tenant ID: {user.tenant_id}")
            print(f"  Role: {user.role}")
            print(f"  Active: {user.is_active}")
            print(f"  Hash: {user.hashed_password[:30]}...")
            
            # Test password
            is_valid = pwd_context.verify("password", user.hashed_password)
            print(f"  Password 'password' valid: {is_valid}")
        else:
            print("User not found!")
            
        # Check if tenant exists
        from sqlalchemy import text
        result = await session.execute(
            text("SELECT id, name FROM tenants WHERE id = :tid"),
            {"tid": str(user.tenant_id) if user else None}
        )
        tenant = result.fetchone()
        if tenant:
            print(f"  Tenant exists: {tenant[1]}")
        else:
            print("  ⚠️ TENANT NOT FOUND - This is the problem!")

if __name__ == "__main__":
    asyncio.run(test_login())
