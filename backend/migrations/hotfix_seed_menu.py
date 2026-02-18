
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import os
from uuid import uuid4

logger = logging.getLogger(__name__)

async def seed_menu_data_hotfix():
    """
    HOTFIX: Seed menu data from embedded CSV content.
    Executed on app startup.
    Idempotent: Checks if items exist by name before inserting.
    """
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.warning("DATABASE_URL not set, skipping menu seed hotfix")
        return

    # Ensure asyncpg driver
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")

    # Embedded Data
    tenant_id = "00000000-0000-0000-0000-000000000000" # Default tenant
    
    categories_data = [
        {"name": "Bàn ghế", "code": "BAN", "desc": "Bàn ghế"},
        {"name": "Nhân viên", "code": "NV", "desc": "Nhân viên"},
        {"name": "Khai Vị", "code": "KV", "desc": "Khai Vị"},
        {"name": "Món chính", "code": "MC", "desc": "Món chính"},
        {"name": "Tráng miệng", "code": "TM", "desc": "Tráng miệng"},
    ]

    # Data from CSV
    menu_items_data = [
        {"name": "Bàn, ghế inox", "category": "Bàn ghế", "selling_price": 250000, "cost_price": 250000, "unit": "Bộ", "description": "", "active": True},
        {"name": "Bàn, ghế sự kiện", "category": "Bàn ghế", "selling_price": 500000, "cost_price": 500000, "unit": "Bộ", "description": "", "active": True},
        {"name": "Khung rạp", "category": "Bàn ghế", "selling_price": 450000, "cost_price": 400000, "unit": "Bộ", "description": "Khung cho 2 bàn", "active": True},
        {"name": "Nhân viên phục vụ", "category": "Nhân viên", "selling_price": 350000, "cost_price": 300000, "unit": "Người", "description": "", "active": True},
        {"name": "Nem chua + chả Huế", "category": "Khai Vị", "selling_price": 150000, "cost_price": 90000, "unit": "Món", "description": "Gỏi cuốn tươi ngon với tôm và thịt", "active": True},
        {"name": "Tôm chiên rế", "category": "Khai Vị", "selling_price": 250000, "cost_price": 150000, "unit": "Món", "description": "Bún chả đặc sản Hà Nội", "active": True},
        {"name": "Nem nướng + Chả giò", "category": "Khai Vị", "selling_price": 350000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Nem nướng + Bò cuộn kim châm", "category": "Khai Vị", "selling_price": 350000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Gỏi ngó sen tôm thịt", "category": "Khai Vị", "selling_price": 300000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Gỏi bò bắp ngũ sắc", "category": "Khai Vị", "selling_price": 400000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Bánh chưng + Chả lụa + củ kiệu", "category": "Khai Vị", "selling_price": 250000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Súp nấm tuyết nhỉ", "category": "Món chính", "selling_price": 270000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Súp hải sản", "category": "Món chính", "selling_price": 300000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Soup hoành thánh", "category": "Món chính", "selling_price": 300000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Cháo tiều", "category": "Món chính", "selling_price": 350000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Cháo bồ câu **", "category": "Món chính", "selling_price": 500000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Súp bào ngư hải sản **", "category": "Món chính", "selling_price": 700000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Gà ta hấp đồng quê + xôi/bánh bao", "category": "Món chính", "selling_price": 450000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Gà xối mắm + cơm nêu", "category": "Món chính", "selling_price": 450000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Gà ta bó xôi", "category": "Món chính", "selling_price": 450000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Gà lên mâm", "category": "Món chính", "selling_price": 700000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Heo rừng áp chảo", "category": "Món chính", "selling_price": 400000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Bò né thiên lý", "category": "Món chính", "selling_price": 400000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Nai né thiên lý **", "category": "Món chính", "selling_price": 400000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Bò (Lagu/hầm rượu vang)", "category": "Món chính", "selling_price": 450000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Dê hấp tía tô **", "category": "Món chính", "selling_price": 500000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Giò heo giả cầy", "category": "Món chính", "selling_price": 550000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Bồ câu rôti", "category": "Món chính", "selling_price": 1300000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Cá điêu hồng chưng tương", "category": "Món chính", "selling_price": 350000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Mực ống (hấp/sate)", "category": "Món chính", "selling_price": 400000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Cá tai tượng sốt cam", "category": "Món chính", "selling_price": 400000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Cá chẽm hấp HongKong **", "category": "Món chính", "selling_price": 450000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Tôm sú (hấp/tiềm) ***", "category": "Món chính", "selling_price": 500000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Tôm sú Size lớn(hấp/tiềm) ***", "category": "Món chính", "selling_price": 700000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Cá mú hấp HongKong **", "category": "Món chính", "selling_price": 800000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Tôm càng xanh (sốt/hấp) ***", "category": "Món chính", "selling_price": 1000000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Cua lột rang bơ tỏi ***", "category": "Món chính", "selling_price": 1200000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Lẩu riêu cua bắp bò", "category": "Món chính", "selling_price": 450000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Lẩu thái (hải sản/nấm)", "category": "Món chính", "selling_price": 500000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Lẩu cá tầm **", "category": "Món chính", "selling_price": 650000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Lẩu cá bớp **", "category": "Món chính", "selling_price": 650000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Lẩu cá lăng **", "category": "Món chính", "selling_price": 650000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Lẩu cá chình **", "category": "Món chính", "selling_price": 900000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Lẩu cua biển **", "category": "Món chính", "selling_price": 1000000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Trái cây bốn mùa", "category": "Tráng miệng", "selling_price": 100000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Rau câu", "category": "Tráng miệng", "selling_price": 100000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Sữa chua (nha đam/nếp cẩm)", "category": "Tráng miệng", "selling_price": 100000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Tàu hũ Singapo", "category": "Tráng miệng", "selling_price": 150000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Nho Mỹ (đen/xanh)", "category": "Tráng miệng", "selling_price": 200000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
        {"name": "Cherry Newzealand", "category": "Tráng miệng", "selling_price": 300000, "cost_price": 280000, "unit": "Món", "description": "", "active": True},
    ]

    try:
        engine = create_async_engine(database_url)
        async with engine.begin() as conn:
            logger.info("Starting Menu Seed Hotfix...")
            
            # Ensure Tenant
            # We assume tenant exist, but to be sure:
            # await conn.execute(text("INSERT INTO tenants ... ON CONFLICT DO NOTHING"))
            
            # Set RLS
            await conn.execute(text(f"SET app.current_tenant = '{tenant_id}'"))

            # Seed Categories
            cat_map = {} # name -> id
            for cat in categories_data:
                # Check exist
                res = await conn.execute(text("SELECT id FROM categories WHERE tenant_id = :tid AND name = :name"), 
                                         {"tid": tenant_id, "name": cat["name"]})
                existing = res.fetchone()
                if existing:
                    cat_map[cat["name"]] = existing[0]
                else:
                    new_id = str(uuid4())
                    cat_map[cat["name"]] = new_id
                    await conn.execute(text("""
                        INSERT INTO categories (id, tenant_id, name, code, description)
                        VALUES (:id, :tid, :name, :code, :desc)
                    """), {
                        "id": new_id,
                        "tid": tenant_id,
                        "name": cat["name"],
                        "code": cat["code"],
                        "desc": cat["desc"]
                    })
                    logger.info(f"Created category: {cat['name']}")

            # Seed Items
            count = 0
            for item in menu_items_data:
                cid = cat_map.get(item["category"])
                if not cid:
                    logger.warning(f"Category not found for item: {item['name']}")
                    continue

                # Check exist
                res = await conn.execute(text("SELECT id FROM menu_items WHERE tenant_id = :tid AND name = :name"), 
                                         {"tid": tenant_id, "name": item["name"]})
                if res.fetchone():
                    continue

                await conn.execute(text("""
                    INSERT INTO menu_items (id, tenant_id, category_id, name, description, uom, cost_price, selling_price, is_active)
                    VALUES (:id, :tid, :cid, :name, :desc, :uom, :cost, :price, :active)
                """), {
                    "id": str(uuid4()),
                    "tid": tenant_id,
                    "cid": cid,
                    "name": item["name"],
                    "desc": item["description"],
                    "uom": item["unit"],
                    "cost": item["cost_price"],
                    "price": item["selling_price"],
                    "active": item["active"]
                })
                count += 1
            
            logger.info(f"Menu Seed Hotfix complete. Added {count} items.")

        await engine.dispose()
    except Exception as e:
        logger.error(f"Failed to seed menu: {e}")
