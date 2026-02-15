"""
Migration script to create period_audit_log and period_close_checklist tables.
"""
import psycopg2

conn = psycopg2.connect(
    host='localhost',
    database='catering_db',
    user='postgres',
    password='postgres'
)
cursor = conn.cursor()

# Migration 1: period_audit_log
sql1 = """
CREATE TABLE IF NOT EXISTS period_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES accounting_periods(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    performed_by UUID,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT,
    extra_data TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
"""
cursor.execute(sql1)

# Create indexes
cursor.execute("CREATE INDEX IF NOT EXISTS idx_period_audit_log_tenant ON period_audit_log(tenant_id);")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_period_audit_log_period ON period_audit_log(period_id);")

# Enable RLS
cursor.execute("ALTER TABLE period_audit_log ENABLE ROW LEVEL SECURITY;")
cursor.execute("DROP POLICY IF EXISTS tenant_isolation ON period_audit_log;")
cursor.execute("""
CREATE POLICY tenant_isolation ON period_audit_log
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
""")

# Migration 2: period_close_checklist
sql2 = """
CREATE TABLE IF NOT EXISTS period_close_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES accounting_periods(id) ON DELETE CASCADE,
    check_name VARCHAR(100) NOT NULL,
    check_key VARCHAR(50) NOT NULL,
    check_order INT NOT NULL DEFAULT 0,
    is_automated BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_by UUID,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, period_id, check_key)
);
"""
cursor.execute(sql2)

# Create indexes
cursor.execute("CREATE INDEX IF NOT EXISTS idx_period_close_checklist_tenant ON period_close_checklist(tenant_id);")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_period_close_checklist_period ON period_close_checklist(period_id);")

# Enable RLS
cursor.execute("ALTER TABLE period_close_checklist ENABLE ROW LEVEL SECURITY;")
cursor.execute("DROP POLICY IF EXISTS tenant_isolation ON period_close_checklist;")
cursor.execute("""
CREATE POLICY tenant_isolation ON period_close_checklist
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
""")

conn.commit()
print('Migrations executed successfully!')

# Verify tables exist
cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'period_%'")
tables = cursor.fetchall()
print(f'Tables found: {[t[0] for t in tables]}')

cursor.close()
conn.close()
