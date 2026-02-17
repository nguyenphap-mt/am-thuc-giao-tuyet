"""
Script to seed leave types for all tenants.
Run from project root: python backend/scripts/seed_leave_types.py
"""
import asyncio
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import text
from backend.core.database import engine


async def seed_leave_types():
    """Seed default leave types for all tenants"""
    
    sql = """
    DO $$
    DECLARE
        t_id UUID;
    BEGIN
        FOR t_id IN SELECT id FROM tenants LOOP
            INSERT INTO leave_types (tenant_id, code, name, days_per_year, is_paid, requires_approval)
            VALUES
                (t_id, 'ANNUAL', 'Nghỉ phép năm', 12, TRUE, TRUE),
                (t_id, 'SICK', 'Nghỉ ốm', 30, TRUE, TRUE),
                (t_id, 'PERSONAL', 'Việc riêng', 3, FALSE, TRUE),
                (t_id, 'MARRIAGE', 'Kết hôn', 3, TRUE, FALSE),
                (t_id, 'BEREAVEMENT', 'Tang chế', 3, TRUE, FALSE)
            ON CONFLICT (tenant_id, code) DO NOTHING;
        END LOOP;
    END $$;
    """
    
    async with engine.begin() as conn:
        await conn.execute(text(sql))
        print("✅ Leave types seeded for all tenants")
    
    # Verify
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT tenant_id, code, name FROM leave_types ORDER BY tenant_id, code"))
        rows = result.fetchall()
        print(f"\n📋 Total leave types in database: {len(rows)}")
        for row in rows:
            print(f"  - Tenant: {row[0]} | {row[1]}: {row[2]}")


if __name__ == "__main__":
    asyncio.run(seed_leave_types())
