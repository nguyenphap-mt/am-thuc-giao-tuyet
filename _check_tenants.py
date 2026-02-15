import psycopg2

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/catering_db')
cur = conn.cursor()

# Check existing columns
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tenants' ORDER BY ordinal_position")
print("=== Existing tenants columns ===")
for r in cur.fetchall():
    print(r)

# Check existing tenants data
cur.execute("SELECT id, name FROM tenants LIMIT 5")
print("\n=== Existing tenants ===")
for r in cur.fetchall():
    print(r)

cur.close()
conn.close()
