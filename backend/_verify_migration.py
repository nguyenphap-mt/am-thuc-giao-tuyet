import psycopg2

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/catering_db')
conn.autocommit = True
cur = conn.cursor()

# Check if set_menus table exists
cur.execute("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='set_menus')")
print(f"set_menus exists: {cur.fetchone()[0]}")

cur.execute("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='set_menu_items')")
print(f"set_menu_items exists: {cur.fetchone()[0]}")

# Check sort_order columns
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='categories' AND column_name='sort_order'")
print(f"categories.sort_order: {cur.fetchone()}")

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='menu_items' AND column_name='sort_order'")
print(f"menu_items.sort_order: {cur.fetchone()}")

# Create set_menu_items indexes if missing
try:
    cur.execute("CREATE INDEX IF NOT EXISTS idx_set_menu_items_set_menu ON set_menu_items(set_menu_id)")
    print("index created")
except Exception as e:
    print(f"index: {e}")

# RLS for set_menu_items
try:
    cur.execute("ALTER TABLE set_menu_items ENABLE ROW LEVEL SECURITY")
    cur.execute("DROP POLICY IF EXISTS tenant_isolation_set_menu_items ON set_menu_items")
    cur.execute("""CREATE POLICY tenant_isolation_set_menu_items ON set_menu_items
        USING (tenant_id = current_setting('app.current_tenant')::uuid)""")
    print("RLS for set_menu_items OK")
except Exception as e:
    print(f"RLS: {e}")

conn.close()
print("Done!")
