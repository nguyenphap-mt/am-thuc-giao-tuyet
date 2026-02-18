"""
Fix: Update tenant_id on migrated menu data from 00000000-... to a0eebc99-...
Root Cause: Backend menu module uses DEFAULT_TENANT_ID = a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
but data was seeded with tenant_id = 00000000-0000-0000-0000-000000000000
"""
import asyncio
import os
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

OLD_TENANT = "00000000-0000-0000-0000-000000000000"
NEW_TENANT = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"

async def fix_tenant_id():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL not set.")
        return

    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")

    try:
        engine = create_async_engine(
            database_url,
            connect_args={"server_settings": {"search_path": "public"}, "statement_cache_size": 0, "prepared_statement_cache_size": 0}
        )
        async with engine.begin() as conn:
            # First ensure the target tenant exists
            res = await conn.execute(text("SELECT id FROM tenants WHERE id = :tid"), {"tid": NEW_TENANT})
            tenant = res.fetchone()
            if not tenant:
                logger.info(f"Target tenant {NEW_TENANT} not found. Creating it...")
                await conn.execute(text("""
                    INSERT INTO tenants (id, name, slug) 
                    VALUES (:id, 'Ẩm Thực Giao Tuyết', 'am-thuc-giao-tuyet')
                    ON CONFLICT (id) DO NOTHING
                """), {"id": NEW_TENANT})
                logger.info("Created target tenant.")
            else:
                logger.info(f"Target tenant exists: {tenant[0]}")

            # Update categories
            res = await conn.execute(text("""
                UPDATE categories SET tenant_id = :new_tid 
                WHERE tenant_id = :old_tid
                RETURNING id, name
            """), {"new_tid": NEW_TENANT, "old_tid": OLD_TENANT})
            cats = res.fetchall()
            logger.info(f"Updated {len(cats)} categories: {[c[1] for c in cats]}")

            # Update menu_items
            res = await conn.execute(text("""
                UPDATE menu_items SET tenant_id = :new_tid 
                WHERE tenant_id = :old_tid
                RETURNING id, name
            """), {"new_tid": NEW_TENANT, "old_tid": OLD_TENANT})
            items = res.fetchall()
            logger.info(f"Updated {len(items)} menu items")

            # Quick count check
            res = await conn.execute(text("""
                SELECT count(*) FROM menu_items WHERE tenant_id = :tid
            """), {"tid": NEW_TENANT})
            count = res.scalar()
            logger.info(f"Total menu items with correct tenant_id: {count}")

            res = await conn.execute(text("""
                SELECT count(*) FROM categories WHERE tenant_id = :tid
            """), {"tid": NEW_TENANT})
            cat_count = res.scalar()
            logger.info(f"Total categories with correct tenant_id: {cat_count}")

        await engine.dispose()
        logger.info("✅ Fix complete!")
    except Exception as e:
        logger.error(f"Fix failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(fix_tenant_id())
