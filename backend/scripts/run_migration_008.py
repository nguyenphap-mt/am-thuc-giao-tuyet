import os
import sqlalchemy
from sqlalchemy import text

# Database URL
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/catering_db"

def run_migration():
    engine = sqlalchemy.create_engine(DATABASE_URL, isolation_level="AUTOCOMMIT")
    connection = engine.connect()
    
    try:
        with open(r"d:\PROJECT\AM THUC GIAO TUYET\backend\migrations\008_quote_step4_enhancements.sql", "r", encoding="utf-8") as f:
            sql_statements = f.read()
            
        print("Executing migration...")
        # Split by command if needed, but simple psql script might work as a whole block if no transaction issues.
        # However, SQL Alchemy text() might prefer single statements or BEGIN/COMMIT blocks.
        # The script is simple DDL and DML.
        
        connection.execute(text(sql_statements))
        print("Migration executed successfully.")
        
    except Exception as e:
        print(f"Error executing migration: {e}")
    finally:
        connection.close()

if __name__ == "__main__":
    run_migration()
