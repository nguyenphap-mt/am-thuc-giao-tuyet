"""Run migration 071: Payroll-Finance Integration"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    engine = create_async_engine("postgresql+asyncpg://postgres:postgres@localhost:5432/catering_db")
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE payroll_periods ADD COLUMN IF NOT EXISTS payment_transaction_id UUID"))
        await conn.execute(text("ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS default_labor_cost_ratio DECIMAL(5,4) DEFAULT 0.15"))
        print("Migration 071 applied successfully!")
    await engine.dispose()

asyncio.run(run())
