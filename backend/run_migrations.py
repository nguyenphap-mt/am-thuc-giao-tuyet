"""
Migration runner for Supabase PostgreSQL.
Executes all SQL migration files in order.
"""
import os
import sys
import glob
import asyncio
import asyncpg

# Supabase Direct Connection (for migrations — pooler format breaks asyncpg username parsing)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:ATGT_ERP_2025_Secure_DB@db.udgtiyflupuxpmrtvnet.supabase.co:5432/postgres"
)

MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), "migrations")

async def run_migrations():
    print(f"[*] Connecting to database...")
    try:
        conn = await asyncpg.connect(DATABASE_URL, ssl="require")
    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")
        sys.exit(1)
    
    print(f"[*] Connected successfully!")
    
    # Get all SQL files sorted
    sql_files = sorted(glob.glob(os.path.join(MIGRATIONS_DIR, "*.sql")))
    print(f"[*] Found {len(sql_files)} migration files")
    
    success = 0
    errors = 0
    
    for sql_file in sql_files:
        filename = os.path.basename(sql_file)
        try:
            with open(sql_file, "r", encoding="utf-8") as f:
                sql = f.read()
            
            if not sql.strip():
                print(f"  [SKIP] {filename} (empty)")
                continue
                
            await conn.execute(sql)
            success += 1
            print(f"  [OK] {filename}")
        except Exception as e:
            errors += 1
            error_msg = str(e)
            # Common non-critical errors (table/column already exists)
            if "already exists" in error_msg or "duplicate" in error_msg.lower():
                print(f"  [SKIP] {filename} (already applied)")
                success += 1
                errors -= 1
            else:
                print(f"  [ERR] {filename}: {error_msg[:120]}")
    
    await conn.close()
    print(f"\n[*] Migration complete: {success} OK, {errors} errors")

if __name__ == "__main__":
    asyncio.run(run_migrations())
