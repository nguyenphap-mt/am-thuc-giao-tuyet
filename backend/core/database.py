"""
Database Configuration and Session Management
Uses SQLAlchemy 2.0 Async with PostgreSQL
"""
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Load from environment variable or use default
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/catering_db"
)

# Convert to async URL for asyncpg (handle both formats)
if "postgresql+asyncpg://" in DATABASE_URL:
    ASYNC_DATABASE_URL = DATABASE_URL
elif "postgresql://" in DATABASE_URL:
    ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
else:
    ASYNC_DATABASE_URL = DATABASE_URL

# Async Engine for FastAPI routes
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,  # Set True for SQL debugging
    pool_size=5,
    max_overflow=10,
    # Disable prepared statement caching for PgBouncer/Supabase pooler compatibility
    connect_args={"statement_cache_size": 0, "prepared_statement_cache_size": 0}
)

# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Sync Engine for migrations/scripts
SYNC_DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
sync_engine = create_engine(SYNC_DATABASE_URL, echo=False)
SyncSessionLocal = sessionmaker(bind=sync_engine)

# Base class for ORM models
Base = declarative_base()

# Dependency for FastAPI routes
async def get_db() -> AsyncSession:
    """Dependency that provides async database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Tenant context setter
from sqlalchemy import text

async def set_tenant_context(session: AsyncSession, tenant_id: str):
    """Set RLS tenant context for the session"""
    # Use f-string as bind params are not supported for SET command values in some drivers
    await session.execute(text(f"SET app.current_tenant = '{str(tenant_id)}'"))
