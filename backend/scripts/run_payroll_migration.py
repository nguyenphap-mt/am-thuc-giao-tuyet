"""
Run Payroll Migration
"""
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    database="catering_db",
    user="postgres",
    password="postgres"
)

with open("backend/migrations/028_hr_payroll.sql", "r", encoding="utf-8") as f:
    sql = f.read()

try:
    cur = conn.cursor()
    cur.execute(sql)
    conn.commit()
    print("✅ Migration 028_hr_payroll.sql completed successfully!")
    
    # Verify tables created
    cur.execute("""
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name LIKE 'payroll%'
    """)
    tables = [row[0] for row in cur.fetchall()]
    print(f"✅ Created tables: {tables}")
    
    cur.close()
except Exception as e:
    print(f"❌ Error: {e}")
    conn.rollback()
finally:
    conn.close()
