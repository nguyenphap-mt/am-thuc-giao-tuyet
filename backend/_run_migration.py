import psycopg2

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/catering_db')
conn.autocommit = True
cur = conn.cursor()

statements = [
    "ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0",
    "ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0",
    "CREATE INDEX IF NOT EXISTS idx_menu_items_active_price ON menu_items(tenant_id, is_active, selling_price)",
    "CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(tenant_id, category_id)",
    "CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(tenant_id, sort_order)",
    """CREATE TABLE IF NOT EXISTS set_menus (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50),
        description TEXT,
        image_url TEXT,
        selling_price NUMERIC(15, 2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )""",
    """CREATE TABLE IF NOT EXISTS set_menu_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        set_menu_id UUID NOT NULL REFERENCES set_menus(id) ON DELETE CASCADE,
        menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 1,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )""",
    "ALTER TABLE set_menus ENABLE ROW LEVEL SECURITY",
    "DROP POLICY IF EXISTS tenant_isolation_set_menus ON set_menus",
    "CREATE POLICY tenant_isolation_set_menus ON set_menus USING (tenant_id = current_setting('app.current_tenant')::uuid)",
    "ALTER TABLE set_menu_items ENABLE ROW LEVEL SECURITY",
    "DROP POLICY IF EXISTS tenant_isolation_set_menu_items ON set_menu_items",
    "CREATE POLICY tenant_isolation_set_menu_items ON set_menu_items USING (tenant_id = current_setting('app.current_tenant')::uuid)",
    "CREATE INDEX IF NOT EXISTS idx_set_menus_tenant ON set_menus(tenant_id)",
    "CREATE INDEX IF NOT EXISTS idx_set_menu_items_set_menu ON set_menu_items(set_menu_id)",
]

for i, stmt in enumerate(statements):
    try:
        cur.execute(stmt)
        print(f"[{i+1}] OK: {stmt[:60]}...")
    except Exception as e:
        print(f"[{i+1}] ERROR: {str(e)[:80]}")

conn.close()
print("\nMigration 020 complete!")
