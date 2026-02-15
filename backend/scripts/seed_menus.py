"""
Seed Menu Data into PostgreSQL
Run: python backend/scripts/seed_menus.py
"""
import asyncio
import csv
import os
import sys
from pathlib import Path
from decimal import Decimal
from uuid import uuid4
from datetime import datetime

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Database connection - UPDATE THIS!
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:postgres@localhost:5432/catering_db"
)

def parse_price(price_str: str) -> int:
    """Parse price string like '  250.000 ' to integer 250000"""
    if not price_str:
        return 0
    cleaned = price_str.strip().replace('.', '').replace(' ', '').replace(',', '')
    try:
        return int(cleaned)
    except ValueError:
        return 0

def seed_menus():
    """Seed menu data from CSV into PostgreSQL"""
    
    # Connect to database
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Set tenant context
        tenant_id = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
        
        # Check if tenant exists, create if not
        result = session.execute(text("SELECT id FROM tenants WHERE id = :id"), {"id": tenant_id})
        if not result.fetchone():
            session.execute(text("""
                INSERT INTO tenants (id, name, code, is_active)
                VALUES (:id, 'Ẩm Thực Giáo Tuyết', 'ATGT', TRUE)
            """), {"id": tenant_id})
            print(f"[INFO] Created tenant: {tenant_id}")
        
        # Set RLS context
        session.execute(text(f"SET app.current_tenant = '{tenant_id}'"))
        
        # Create categories
        categories = {
            "Bàn ghế": {"id": str(uuid4()), "code": "BAN"},
            "Nhân viên": {"id": str(uuid4()), "code": "NV"},
            "Khai Vị": {"id": str(uuid4()), "code": "KV"},
            "Món chính": {"id": str(uuid4()), "code": "MC"},
            "Tráng miệng": {"id": str(uuid4()), "code": "TM"},
        }
        
        for name, cat_info in categories.items():
            # Check if category exists
            result = session.execute(
                text("SELECT id FROM categories WHERE tenant_id = :tid AND name = :name"),
                {"tid": tenant_id, "name": name}
            )
            existing = result.fetchone()
            
            if existing:
                cat_info["id"] = str(existing[0])
                print(f"[INFO] Category exists: {name}")
            else:
                session.execute(text("""
                    INSERT INTO categories (id, tenant_id, name, code, description)
                    VALUES (:id, :tid, :name, :code, :desc)
                """), {
                    "id": cat_info["id"],
                    "tid": tenant_id,
                    "name": name,
                    "code": cat_info["code"],
                    "desc": f"Danh mục {name}"
                })
                print(f"[INFO] Created category: {name}")
        
        session.commit()
        
        # Load CSV
        csv_path = project_root / "ẨM THỰC GIÁO TUYẾT - Database - Menus.csv"
        
        if not csv_path.exists():
            print(f"[ERROR] CSV file not found: {csv_path}")
            return
        
        # Read and insert menu items
        items_inserted = 0
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                try:
                    # Parse data
                    name = row.get('name', '').strip().strip('"')
                    category_name = row.get('category', '').strip()
                    selling_price = parse_price(row.get('selling_price', '0'))
                    cost_price = parse_price(row.get('cost_price', '0'))
                    unit = row.get('unit', 'Món').strip()
                    description = row.get('description', '').strip()
                    is_active = row.get('active', 'TRUE').strip().upper() == 'TRUE'
                    
                    # Get category ID
                    category_id = categories.get(category_name, {}).get("id")
                    
                    # Check if item exists
                    result = session.execute(
                        text("SELECT id FROM menu_items WHERE tenant_id = :tid AND name = :name"),
                        {"tid": tenant_id, "name": name}
                    )
                    if result.fetchone():
                        print(f"[SKIP] Item exists: {name}")
                        continue
                    
                    # Insert menu item
                    session.execute(text("""
                        INSERT INTO menu_items (id, tenant_id, category_id, name, description, uom, cost_price, selling_price, is_active)
                        VALUES (:id, :tid, :cid, :name, :desc, :uom, :cost, :price, :active)
                    """), {
                        "id": str(uuid4()),
                        "tid": tenant_id,
                        "cid": category_id,
                        "name": name,
                        "desc": description,
                        "uom": unit,
                        "cost": cost_price,
                        "price": selling_price,
                        "active": is_active
                    })
                    items_inserted += 1
                    
                except Exception as e:
                    print(f"[ERROR] Row: {row.get('name', 'Unknown')}, Error: {e}")
        
        session.commit()
        print(f"\n✅ SEED COMPLETE!")
        print(f"   - Categories: {len(categories)}")
        print(f"   - Menu Items: {items_inserted}")
        
    except Exception as e:
        session.rollback()
        print(f"[ERROR] Database error: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    print("=" * 50)
    print("SEEDING MENU DATA INTO POSTGRESQL")
    print("=" * 50)
    print(f"Database: {DATABASE_URL}")
    print("")
    
    seed_menus()
