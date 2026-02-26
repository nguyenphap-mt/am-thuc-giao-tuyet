"""
Database Configuration and Session Management
Uses SQLAlchemy 2.0 Async with PostgreSQL
"""
import os
import ssl as _ssl
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Load from environment variable or use default
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/catering_db"
)

# Detect if running remotely (Render, etc.) — needs SSL for Supabase
IS_REMOTE = os.getenv("RENDER", "") != "" or "supabase.co" in DATABASE_URL or "pooler.supabase.com" in DATABASE_URL


def _strip_sslmode_from_url(url: str) -> str:
    """Strip sslmode query param from URL — asyncpg doesn't support it as URL param."""
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    params.pop("sslmode", None)
    new_query = urlencode(params, doseq=True)
    return urlunparse(parsed._replace(query=new_query))


def _ensure_sslmode_in_url(url: str) -> str:
    """Ensure sslmode=require is in the URL for psycopg2 sync connections."""
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    if "sslmode" not in params:
        params["sslmode"] = ["require"]
    new_query = urlencode(params, doseq=True)
    return urlunparse(parsed._replace(query=new_query))


# --- Async Engine (asyncpg) ---
# asyncpg does NOT support sslmode as URL param or connect_arg
# It requires ssl=SSLContext in connect_args
_async_url = DATABASE_URL
if "postgresql+asyncpg://" in _async_url:
    pass
elif "postgresql://" in _async_url:
    _async_url = _async_url.replace("postgresql://", "postgresql+asyncpg://")

# Strip sslmode from URL for asyncpg
ASYNC_DATABASE_URL = _strip_sslmode_from_url(_async_url)

# Build connect_args for asyncpg
_connect_args = {
    "statement_cache_size": 0,
    "prepared_statement_cache_size": 0,
    "server_settings": {"search_path": "public"}
}

if IS_REMOTE:
    _ssl_ctx = _ssl.create_default_context()
    _ssl_ctx.check_hostname = False
    _ssl_ctx.verify_mode = _ssl.CERT_NONE
    _connect_args["ssl"] = _ssl_ctx

# Async Engine for FastAPI routes
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args=_connect_args
)

# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# --- Sync Engine (psycopg2) ---
# psycopg2 supports sslmode as URL query param
SYNC_DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
if IS_REMOTE:
    SYNC_DATABASE_URL = _ensure_sslmode_in_url(SYNC_DATABASE_URL)
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
