"""Test Low Stock API with proper models"""
import asyncio
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import sys
sys.path.insert(0, 'd:/PROJECT/AM THUC GIAO TUYET/backend')

DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/catering_db"

async def main():
    engine = create_async_engine(DATABASE_URL)
    async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session_maker() as session:
        # Get a list of users
        from backend.core.auth.models import User
        result = await session.execute(select(User.email, User.role, User.id))
        users = result.all()
        print("=== Users in database ===")
        for u in users:
            print(f"  - Email: {u.email}, Role: {u.role}")
        
        # Test Low Stock calculation (same logic as API)
        from backend.modules.inventory.domain.models import InventoryItemModel, InventoryStockModel
        
        query = (
            select(
                InventoryItemModel,
                func.coalesce(func.sum(InventoryStockModel.quantity), 0).label('current_stock')
            )
            .outerjoin(InventoryStockModel, InventoryItemModel.id == InventoryStockModel.item_id)
            .group_by(InventoryItemModel.id)
        )
        
        result = await session.execute(query)
        rows = result.all()
        
        print(f"\n=== Inventory Items ({len(rows)} total) ===")
        low_stock_items = []
        
        for row in rows:
            item = row[0]
            current_stock = float(row[1] or 0)
            min_stock = float(item.min_stock or 0)
            
            # Determine status
            if min_stock > 0:
                if current_stock <= 0:
                    status = "CRITICAL"
                elif current_stock < min_stock:
                    status = "WARNING"
                elif current_stock <= min_stock * 1.2:
                    status = "LOW"
                else:
                    status = "OK"
            else:
                status = "N/A (no min_stock configured)"
            
            if status in ["CRITICAL", "WARNING", "LOW"]:
                low_stock_items.append({
                    "name": item.name,
                    "sku": item.sku,
                    "current_stock": current_stock,
                    "min_stock": min_stock,
                    "status": status
                })
                
        print(f"\n=== Low Stock Items ({len(low_stock_items)} found) ===")
        for item in low_stock_items:
            print(f"  [{item['status']}] {item['name']} (SKU: {item['sku']})")
            print(f"       Current: {item['current_stock']}, Min: {item['min_stock']}")
        
        if not low_stock_items:
            print("  No low stock items found.")
            print("\n  Note: To test Low Stock Alert, configure 'min_stock' for items")
            print("        and ensure stock is below the threshold.")
    
    await engine.dispose()

if __name__ == "__main__":
    print("Testing Low Stock Alert API...")
    print("=" * 50)
    asyncio.run(main())
    print("\n" + "=" * 50)
    print("Test completed.")
