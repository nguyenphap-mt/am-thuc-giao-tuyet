"""Check user tenant assignment"""
import psycopg2

conn = psycopg2.connect("postgresql://postgres:postgres@localhost:5432/catering_db")
cur = conn.cursor()

print("=" * 60)
print("TENANTS:")
print("=" * 60)
cur.execute("SELECT id, name, is_active FROM tenants")
tenants = cur.fetchall()
for t in tenants:
    print(f"  ID: {t[0]}")
    print(f"  Name: {t[1]}")
    print(f"  Active: {t[2]}")
    print()

print("=" * 60)
print("USERS:")
print("=" * 60)
cur.execute("SELECT id, email, tenant_id, is_active, role FROM users")
users = cur.fetchall()
for u in users:
    print(f"  ID: {u[0]}")
    print(f"  Email: {u[1]}")
    print(f"  Tenant ID: {u[2]}")
    print(f"  Active: {u[3]}")
    print(f"  Role: {u[4]}")
    # Check if tenant exists
    if u[2]:
        cur.execute("SELECT name FROM tenants WHERE id = %s", (u[2],))
        tenant = cur.fetchone()
        if tenant:
            print(f"  Tenant Name: {tenant[0]}")
        else:
            print(f"  ⚠️ TENANT NOT FOUND!")
    else:
        print(f"  ⚠️ NO TENANT ASSIGNED!")
    print()

cur.close()
conn.close()
