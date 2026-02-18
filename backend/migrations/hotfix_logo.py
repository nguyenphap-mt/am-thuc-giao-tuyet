
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import os

logger = logging.getLogger(__name__)

async def apply_logo_column_hotfix():
    """
    HOTFIX: Add logo_data column to tenants table if missing.
    Executed on app startup.
    """
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.warning("DATABASE_URL not set, skipping hotfix")
        return

    # Ensure asyncpg driver
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")

    try:
        engine = create_async_engine(database_url)
        async with engine.begin() as conn:
            logger.info("Running hotfix: Add logo_data column...")
            await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_data BYTEA"))
            await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_content_type VARCHAR(50)"))
            logger.info("Hotfix applied successfully.")
        await engine.dispose()
    except Exception as e:
        logger.error(f"Failed to apply hotfix: {e}")
