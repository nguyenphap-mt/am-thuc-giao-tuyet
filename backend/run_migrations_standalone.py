"""
Standalone migration script - no backend imports needed
Execute from project root: python backend/run_migrations_standalone.py
"""
import asyncio
import asyncpg

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/catering_db"

MIGRATIONS = [
    "backend/migrations/040_activity_logs.sql",
    "backend/migrations/041_user_sessions.sql", 
    "backend/migrations/042_user_status.sql",
    "backend/migrations/043_roles_table.sql"
]

async def run_migrations():
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        for migration_file in MIGRATIONS:
            print(f"\n📦 Running: {migration_file}")
            try:
                with open(migration_file, 'r', encoding='utf-8') as f:
                    sql = f.read()
                
                # Execute entire SQL file
                await conn.execute(sql)
                print(f"✅ Completed: {migration_file}")
                
            except FileNotFoundError:
                print(f"❌ File not found: {migration_file}")
            except Exception as e:
                error_msg = str(e).lower()
                if "already exists" in error_msg or "duplicate" in error_msg:
                    print(f"⚠️ Already exists (skipped): {migration_file}")
                else:
                    print(f"❌ Error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    print("=" * 50)
    print("  User Module Migrations (Standalone)")
    print("=" * 50)
    asyncio.run(run_migrations())
    print("\n✅ All migrations completed!")
