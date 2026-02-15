"""
Run all migrations for User Module Improvements
Execute this from PROJECT ROOT: python backend/run_user_migrations.py
"""
import asyncio
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from backend.core.database import engine

MIGRATIONS = [
    "backend/migrations/040_activity_logs.sql",
    "backend/migrations/041_user_sessions.sql", 
    "backend/migrations/042_user_status.sql",
    "backend/migrations/043_roles_table.sql"
]

async def run_migrations():
    async with engine.begin() as conn:
        for migration_file in MIGRATIONS:
            print(f"\n📦 Running: {migration_file}")
            try:
                with open(migration_file, 'r', encoding='utf-8') as f:
                    sql = f.read()
                
                # Split by semicolons and execute each statement
                statements = [s.strip() for s in sql.split(';') if s.strip() and not s.strip().startswith('--')]
                
                for stmt in statements:
                    if stmt:
                        try:
                            await conn.execute(text(stmt))
                            print(f"  ✅ Executed statement")
                        except Exception as e:
                            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                                print(f"  ⚠️ Already exists (skipped)")
                            else:
                                print(f"  ❌ Error: {e}")
                
                print(f"✅ Completed: {migration_file}")
            except FileNotFoundError:
                print(f"❌ File not found: {migration_file}")
            except Exception as e:
                print(f"❌ Error in {migration_file}: {e}")

if __name__ == "__main__":
    print("=" * 50)
    print("  User Module Migrations")
    print("=" * 50)
    asyncio.run(run_migrations())
    print("\n✅ All migrations completed!")
