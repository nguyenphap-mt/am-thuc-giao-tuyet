import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    engine = create_async_engine('postgresql+asyncpg://postgres:postgres@localhost:5432/catering_db')
    async with engine.connect() as conn:
        statements = [
            """CREATE TABLE IF NOT EXISTS payroll_audit_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                tenant_id UUID NOT NULL,
                period_id UUID REFERENCES payroll_periods(id) ON DELETE SET NULL,
                item_id UUID REFERENCES payroll_items(id) ON DELETE SET NULL,
                action VARCHAR(30) NOT NULL,
                action_by UUID,
                action_by_name VARCHAR(255),
                action_at TIMESTAMPTZ DEFAULT NOW(),
                period_name VARCHAR(50),
                employee_name VARCHAR(100),
                details TEXT,
                previous_status VARCHAR(20),
                new_status VARCHAR(20),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )""",
            "CREATE INDEX IF NOT EXISTS idx_payroll_audit_tenant ON payroll_audit_logs(tenant_id)",
            "CREATE INDEX IF NOT EXISTS idx_payroll_audit_period ON payroll_audit_logs(period_id)",
            "CREATE INDEX IF NOT EXISTS idx_payroll_audit_action ON payroll_audit_logs(action)",
            "CREATE INDEX IF NOT EXISTS idx_payroll_audit_at ON payroll_audit_logs(action_at)",
            "ALTER TABLE payroll_audit_logs ENABLE ROW LEVEL SECURITY",
            "DROP POLICY IF EXISTS payroll_audit_logs_tenant_isolation ON payroll_audit_logs",
            """CREATE POLICY payroll_audit_logs_tenant_isolation ON payroll_audit_logs
                USING (tenant_id = (SELECT current_setting('app.current_tenant')::UUID))""",
        ]
        for stmt in statements:
            await conn.execute(text(stmt))
            print(f"OK: {stmt[:60]}...")
        await conn.commit()
        print("Migration 066 complete!")
    await engine.dispose()

asyncio.run(run())
