"""
Run migration 037_tenant_management.sql step-by-step
"""
import psycopg2

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/catering_db')
conn.autocommit = True
cur = conn.cursor()

steps = [
    # Add missing columns
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'basic'",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug VARCHAR(50)",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS domain VARCHAR(255)",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_details JSONB DEFAULT '{}'",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255)",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20)",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address TEXT",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'",
    
    # Indexes
    "CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug)",
    "CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status)",
    "CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan)",
    
    # Update existing tenants - set plan_details
    """UPDATE tenants SET plan_details = '{"max_users": 50, "max_orders_per_month": 1000, "storage_mb": 10240}'::jsonb WHERE plan_details = '{}' OR plan_details IS NULL""",
    
    # Update existing tenants - set slug
    "UPDATE tenants SET slug = LOWER(REPLACE(REPLACE(name, ' ', '-'), '''', '')) WHERE slug IS NULL",
    
    # Tenant Usage table
    """CREATE TABLE IF NOT EXISTS tenant_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        metric_key VARCHAR(100) NOT NULL,
        metric_value NUMERIC DEFAULT 0,
        period VARCHAR(20) DEFAULT 'total',
        period_start DATE,
        period_end DATE,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, metric_key, period, period_start)
    )""",
    
    "CREATE INDEX IF NOT EXISTS idx_tenant_usage_lookup ON tenant_usage(tenant_id, metric_key, period)",
]

for i, sql in enumerate(steps):
    try:
        cur.execute(sql)
        print(f"Step {i+1}: OK")
    except Exception as e:
        print(f"Step {i+1}: ERROR - {e}")

# Verify
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'tenants' ORDER BY ordinal_position")
print("\n=== Final tenants schema ===")
for r in cur.fetchall():
    print(f"  - {r[0]}")

cur.execute("SELECT id, name, plan, status, slug FROM tenants")
print("\n=== Tenant data ===")
for r in cur.fetchall():
    print(f"  {r}")

cur.close()
conn.close()
print("\n✅ Migration 037 complete!")
