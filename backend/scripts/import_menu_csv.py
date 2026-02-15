import sys
import os
import asyncio
import csv
from sqlalchemy import select, text
from decimal import Decimal

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))
from backend.core.database import AsyncSessionLocal
from backend.modules.menu.domain.models import MenuItemModel, CategoryModel, Tenant

CSV_PATH = r"d:\PROJECT\AM THUC GIAO TUYET\ẨM THỰC GIÁO TUYẾT - Database - Menus.csv"

async def import_data():
    async with AsyncSessionLocal() as session:
        # 1. Get Tenant
        res = await session.execute(select(Tenant).limit(1))
        tenant = res.scalars().first()
        if not tenant:
            print("Error: No tenant found. Please migrate tenants first.")
            return
        tenant_id = tenant.id
        print(f"Using Tenant: {tenant.name} ({tenant_id})")

        # 2. Get Categories Cache
        res = await session.execute(select(CategoryModel))
        categories = {c.name.lower().strip(): c for c in res.scalars().all()}
        print(f"Loaded {len(categories)} categories.")

        # 3. Read CSV
        if not os.path.exists(CSV_PATH):
            print(f"Error: CSV file not found at {CSV_PATH}")
            return

        items_to_add = []
        items_to_update = []
        
        # Helper to parse price
        def parse_price(p_str):
            if not p_str: return 0
            # Remove dots, commas if strictly thousand separator
            # Vietnamese format: 250.000 -> 250000
            clean = p_str.replace('.', '').replace(',', '')
            return Decimal(clean)

        with open(CSV_PATH, encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = row.get('name', '').strip()
                if not name: continue
                
                cat_name = row.get('category', '').strip()
                price_str = row.get('selling_price', '0')
                cost_str = row.get('cost_price', '0')
                unit = row.get('unit', 'Món')
                desc = row.get('description', '')
                active = row.get('active', 'TRUE').strip().upper() == 'TRUE'

                # Resolve Category
                if not cat_name:
                    cat_name = "Uncategorized"
                
                cat_key = cat_name.lower()
                if cat_key not in categories:
                    # Create new category
                    new_cat = CategoryModel(
                        tenant_id=tenant_id,
                        name=cat_name,
                        code=cat_name[:10].upper(), # Simple code gen
                        description="Imported from CSV"
                    )
                    session.add(new_cat)
                    await session.flush() # Get ID
                    categories[cat_key] = new_cat
                    print(f"Created Category: {cat_name}")
                
                category = categories[cat_key]

                # Check existing item
                # For simplicity in this script, we query one by one or fetch all. 
                # Fetching all is better. But let's check duplicates by name logic.
                # Ideally we check by ID, but CSV `menu_id` might not match DB ID (UUID).
                # We'll match by Name for update.
                
                # Doing a check per item for safety on this small dataset (~50 items)
                res = await session.execute(select(MenuItemModel).where(
                    MenuItemModel.name == name, 
                    MenuItemModel.tenant_id == tenant_id
                ))
                existing = res.scalars().first()

                if existing:
                    # Update
                    existing.category_id = category.id
                    existing.selling_price = parse_price(price_str)
                    existing.cost_price = parse_price(cost_str)
                    existing.uom = unit
                    existing.description = desc
                    existing.is_active = active
                    session.add(existing)
                    items_to_update.append(name)
                else:
                    # Create
                    new_item = MenuItemModel(
                        tenant_id=tenant_id,
                        category_id=category.id,
                        name=name,
                        selling_price=parse_price(price_str),
                        cost_price=parse_price(cost_str),
                        uom=unit,
                        description=desc,
                        is_active=active
                    )
                    session.add(new_item)
                    items_to_add.append(name)

        await session.commit()
        print(f"Success! Added {len(items_to_add)} items, Updated {len(items_to_update)} items.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(import_data())
