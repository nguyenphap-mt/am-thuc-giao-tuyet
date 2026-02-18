
import asyncio
import csv
import logging
import os
from uuid import uuid4
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# CSV File Path
CSV_FILE_PATH = "ẨM THỰC GIÁO TUYẾT - Database - Menus.csv"
TENANT_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" # Must match backend DEFAULT_TENANT_ID

async def seed_menu_data():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL not set.")
        return

    # Ensure asyncpg driver
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")

    # Read CSV Data
    menu_items_data = []
    if not os.path.exists(CSV_FILE_PATH):
        logger.error(f"CSV file not found: {CSV_FILE_PATH}")
        return

    try:
        # Try UTF-8 first, then CP1258/Latin1
        encodings = ['utf-8', 'utf-8-sig', 'cp1258', 'latin1']
        used_encoding = None
        for enc in encodings:
            try:
                with open(CSV_FILE_PATH, 'r', encoding=enc) as f:
                    reader = csv.DictReader(f)
                    menu_items_data = list(reader)
                    used_encoding = enc
                    logger.info(f"Successfully read CSV with encoding: {enc}")
                    break
            except UnicodeDecodeError:
                continue
            except Exception as e:
                logger.error(f"Error reading with {enc}: {e}")
                
        if not used_encoding:
            logger.error("Failed to read CSV with any encoding.")
            return

    except Exception as e:
        logger.error(f"Failed to read CSV: {e}")
        return

    try:
        engine = create_async_engine(database_url)
        async with engine.begin() as conn:
            logger.info("Starting Menu Migration to Supabase...")
            
            # Set Tenant Context
            await conn.execute(text(f"SET app.current_tenant = '{TENANT_ID}'"))

            # cache categories
            cat_map = {} # name -> id

            # Process Items
            items_count = 0
            new_cats = 0
            
            for item in menu_items_data:
                # Normalize keys (strip spaces if any)
                item = {k.strip(): v for k, v in item.items() if k}
                
                name = item.get('name')
                category = item.get('category')
                
                if not name or not category:
                    continue

                # 1. Handle Category
                if category not in cat_map:
                    # Check DB
                    res = await conn.execute(text("SELECT id FROM categories WHERE tenant_id = :tid AND name = :name"), 
                                             {"tid": TENANT_ID, "name": category})
                    existing = res.fetchone()
                    if existing:
                        cat_map[category] = existing[0]
                    else:
                        new_id = str(uuid4())
                        cat_map[category] = new_id
                        # Generate code from name (simple)
                        # e.g., "Món chính" -> "MC" or just random/sequence? 
                        # For now use first letters upper or just 'GEN'
                        code = "".join([w[0].upper() for w in category.split()])[:10]
                        
                        await conn.execute(text("""
                            INSERT INTO categories (id, tenant_id, name, code, description)
                            VALUES (:id, :tid, :name, :code, :desc)
                        """), {
                            "id": new_id,
                            "tid": TENANT_ID,
                            "name": category,
                            "code": code,
                            "desc": category
                        })
                        new_cats += 1
                        logger.info(f"Created new category: {category}")

                cid = cat_map[category]

                # 2. Check Item Existence
                res = await conn.execute(text("SELECT id FROM menu_items WHERE tenant_id = :tid AND name = :name"), 
                                         {"tid": TENANT_ID, "name": name})
                existing_item = res.fetchone()
                
                # Parse Stats
                selling_price = float(item.get('selling_price', 0)) if item.get('selling_price') else 0
                cost_price = float(item.get('cost_price', 0)) if item.get('cost_price') else 0
                unit = item.get('unit', 'Món')
                desc = item.get('description', '')
                active = True
                if item.get('active'):
                     val = str(item.get('active')).lower()
                     active = val in ['true', '1', 'yes', 't']

                if existing_item:
                    # Update?
                    # For now, let's just log or maybe update price? 
                    # Implementation Plan said "Upsert logic".
                    await conn.execute(text("""
                        UPDATE menu_items 
                        SET selling_price = :price, cost_price = :cost, description = :desc, uom = :uom, is_active = :active, category_id = :cid
                        WHERE id = :id
                    """), {
                        "id": existing_item[0],
                        "price": selling_price,
                        "cost": cost_price,
                        "desc": desc,
                        "uom": unit,
                        "active": active,
                        "cid": cid
                    })
                else:
                    # Insert
                    await conn.execute(text("""
                        INSERT INTO menu_items (id, tenant_id, category_id, name, description, uom, cost_price, selling_price, is_active)
                        VALUES (:id, :tid, :cid, :name, :desc, :uom, :cost, :price, :active)
                    """), {
                        "id": str(uuid4()),
                        "tid": TENANT_ID,
                        "cid": cid,
                        "name": name,
                        "desc": desc,
                        "uom": unit,
                        "cost": cost_price,
                        "price": selling_price,
                        "active": active
                    })
                    items_count += 1
            
            logger.info(f"Migration Complete. New Categories: {new_cats}. New/Updated Items Processed: {items_count + (len(menu_items_data)-items_count)}")

        await engine.dispose()
    except Exception as e:
        logger.error(f"Migration Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(seed_menu_data())
