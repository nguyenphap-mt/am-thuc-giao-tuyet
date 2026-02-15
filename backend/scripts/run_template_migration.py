"""Run Quote Templates Migration"""
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    database="catering_db", 
    user="postgres",
    password="postgres"
)
cur = conn.cursor()

sql = """
CREATE TABLE IF NOT EXISTS quote_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    event_type VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    items JSONB DEFAULT '[]'::jsonb,
    services JSONB DEFAULT '[]'::jsonb,
    default_table_count INTEGER,
    default_guests_per_table INTEGER DEFAULT 10,
    default_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_quote_templates_tenant ON quote_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quote_templates_event_type ON quote_templates(event_type);
"""

try:
    cur.execute(sql)
    conn.commit()
    print("✅ quote_templates table created successfully!")
except Exception as e:
    print(f"❌ Error: {e}")
finally:
    cur.close()
    conn.close()
