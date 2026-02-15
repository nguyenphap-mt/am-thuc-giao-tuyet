"""
Menu Module HTTP Router - PostgreSQL Version
Uses SQLAlchemy async for database operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, or_, delete as sql_delete
from sqlalchemy.orm import selectinload

from backend.core.database import get_db
from backend.modules.menu.domain.entities import (
    MenuItem, MenuItemBase, Category, CategoryBase, CategoryUpdate,
    SetMenuCreate, SetMenuUpdate, SetMenu, SetMenuItemResponse,
    BulkActionRequest, MenuStats
)
from backend.modules.menu.domain.models import (
    MenuItemModel, CategoryModel, SetMenuModel, SetMenuItemModel
)

router = APIRouter(tags=["Menu Management"])

# Default tenant for development
DEFAULT_TENANT_ID = UUID("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")


# --- Helper Functions ---

def model_to_category(model: CategoryModel) -> Category:
    """Convert SQLAlchemy model to Pydantic schema"""
    return Category(
        id=model.id,
        tenant_id=model.tenant_id,
        name=model.name,
        code=model.code,
        description=model.description,
        item_type=model.item_type or 'FOOD',
        sort_order=model.sort_order or 0,
        created_at=model.created_at,
        updated_at=model.updated_at
    )

def model_to_menu_item(model: MenuItemModel, category_name: str = None) -> MenuItem:
    """Convert SQLAlchemy model to Pydantic schema"""
    return MenuItem(
        id=model.id,
        tenant_id=model.tenant_id,
        category_id=model.category_id,
        name=model.name,
        description=model.description,
        image_url=model.image_url,
        uom=model.uom,
        cost_price=model.cost_price,
        selling_price=model.selling_price,
        is_active=model.is_active,
        sort_order=model.sort_order or 0,
        category_name=category_name,
        created_at=model.created_at,
        updated_at=model.updated_at
    )


# --- Categories Endpoints ---

@router.get("/categories", response_model=List[Category])
async def list_categories(
    item_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get all menu categories, optionally filtered by item_type (FOOD|SERVICE)"""
    query = select(CategoryModel).where(CategoryModel.tenant_id == DEFAULT_TENANT_ID)
    if item_type:
        query = query.where(CategoryModel.item_type == item_type.upper())
    query = query.order_by(CategoryModel.sort_order, CategoryModel.name)
    result = await db.execute(query)
    categories = result.scalars().all()
    return [model_to_category(c) for c in categories]


@router.get("/categories/{category_id}", response_model=Category)
async def get_category(category_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get category by ID"""
    result = await db.execute(
        select(CategoryModel)
        .where(CategoryModel.id == category_id)
        .where(CategoryModel.tenant_id == DEFAULT_TENANT_ID)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return model_to_category(category)


@router.post("/categories", response_model=Category)
async def create_category(data: CategoryBase, db: AsyncSession = Depends(get_db)):
    """Create new category"""
    new_category = CategoryModel(
        tenant_id=DEFAULT_TENANT_ID,
        name=data.name,
        code=data.code,
        description=data.description,
        item_type=data.item_type or 'FOOD',
        sort_order=data.sort_order
    )
    db.add(new_category)
    await db.commit()
    await db.refresh(new_category)
    return model_to_category(new_category)


@router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: UUID, data: CategoryUpdate, db: AsyncSession = Depends(get_db)):
    """Update category"""
    result = await db.execute(
        select(CategoryModel)
        .where(CategoryModel.id == category_id)
        .where(CategoryModel.tenant_id == DEFAULT_TENANT_ID)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if data.name is not None:
        category.name = data.name
    if data.code is not None:
        category.code = data.code
    if data.description is not None:
        category.description = data.description
    if data.item_type is not None:
        category.item_type = data.item_type
    if data.sort_order is not None:
        category.sort_order = data.sort_order
    
    await db.commit()
    await db.refresh(category)
    return model_to_category(category)


@router.delete("/categories/{category_id}")
async def delete_category(category_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete category (fails if items reference it)"""
    result = await db.execute(
        select(CategoryModel)
        .where(CategoryModel.id == category_id)
        .where(CategoryModel.tenant_id == DEFAULT_TENANT_ID)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check if items reference this category
    items_count_result = await db.execute(
        select(func.count(MenuItemModel.id))
        .where(MenuItemModel.category_id == category_id)
    )
    items_count = items_count_result.scalar()
    if items_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Không thể xóa danh mục đang có {items_count} món ăn"
        )
    
    await db.delete(category)
    await db.commit()
    return {"message": "Category deleted", "id": str(category_id)}


# --- Menu Items Endpoints ---

@router.get("/items", response_model=List[MenuItem])
async def list_items(
    category_id: Optional[UUID] = None,
    search: Optional[str] = None,
    active_only: bool = False,
    item_type: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    """Get all menu items with optional filters. item_type filters by category.item_type (FOOD|SERVICE)"""
    query = select(MenuItemModel, CategoryModel.name.label('cat_name')).outerjoin(
        CategoryModel, MenuItemModel.category_id == CategoryModel.id
    ).where(MenuItemModel.tenant_id == DEFAULT_TENANT_ID)
    
    # Filter by item_type (via category)
    if item_type:
        query = query.where(CategoryModel.item_type == item_type.upper())
    
    # Filter by category
    if category_id:
        query = query.where(MenuItemModel.category_id == category_id)
    
    # Search by name
    if search:
        query = query.where(MenuItemModel.name.ilike(f"%{search}%"))
    
    # Active only
    if active_only:
        query = query.where(MenuItemModel.is_active == True)
    
    # Pagination
    query = query.order_by(MenuItemModel.sort_order, MenuItemModel.name).offset(skip).limit(limit)
    
    result = await db.execute(query)
    rows = result.all()
    return [model_to_menu_item(item, cat_name) for item, cat_name in rows]


@router.get("/items/{item_id}", response_model=MenuItem)
async def get_item(item_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get menu item by ID"""
    result = await db.execute(
        select(MenuItemModel)
        .where(MenuItemModel.id == item_id)
        .where(MenuItemModel.tenant_id == DEFAULT_TENANT_ID)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return model_to_menu_item(item)


@router.post("/items", response_model=MenuItem)
async def create_item(data: MenuItemBase, db: AsyncSession = Depends(get_db)):
    """Create new menu item"""
    new_item = MenuItemModel(
        tenant_id=DEFAULT_TENANT_ID,
        category_id=data.category_id,
        name=data.name,
        description=data.description,
        uom=data.uom,
        cost_price=data.cost_price,
        selling_price=data.selling_price,
        is_active=data.is_active if hasattr(data, 'is_active') else True
    )
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    return model_to_menu_item(new_item)


@router.put("/items/{item_id}", response_model=MenuItem)
async def update_item(item_id: UUID, data: MenuItemBase, db: AsyncSession = Depends(get_db)):
    """Update menu item"""
    result = await db.execute(
        select(MenuItemModel)
        .where(MenuItemModel.id == item_id)
        .where(MenuItemModel.tenant_id == DEFAULT_TENANT_ID)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    # Update fields
    item.name = data.name
    item.description = data.description
    item.category_id = data.category_id
    item.uom = data.uom
    item.cost_price = data.cost_price
    item.selling_price = data.selling_price
    
    await db.commit()
    await db.refresh(item)
    return model_to_menu_item(item)


@router.delete("/items/{item_id}")
async def delete_item(item_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete menu item"""
    result = await db.execute(
        select(MenuItemModel)
        .where(MenuItemModel.id == item_id)
        .where(MenuItemModel.tenant_id == DEFAULT_TENANT_ID)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    await db.delete(item)
    await db.commit()
    return {"message": "Item deleted", "id": str(item_id)}


@router.put("/items/{item_id}/toggle-active")
async def toggle_item_active(item_id: UUID, db: AsyncSession = Depends(get_db)):
    """Toggle menu item active status"""
    result = await db.execute(
        select(MenuItemModel)
        .where(MenuItemModel.id == item_id)
        .where(MenuItemModel.tenant_id == DEFAULT_TENANT_ID)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    item.is_active = not item.is_active
    await db.commit()
    await db.refresh(item)
    return {"id": str(item_id), "is_active": item.is_active}


@router.post("/items/bulk-action")
async def bulk_action(data: BulkActionRequest, db: AsyncSession = Depends(get_db)):
    """Bulk activate/deactivate/delete menu items"""
    result = await db.execute(
        select(MenuItemModel)
        .where(MenuItemModel.id.in_(data.ids))
        .where(MenuItemModel.tenant_id == DEFAULT_TENANT_ID)
    )
    items = result.scalars().all()
    
    if not items:
        raise HTTPException(status_code=404, detail="No items found")
    
    if data.action == "activate":
        for item in items:
            item.is_active = True
    elif data.action == "deactivate":
        for item in items:
            item.is_active = False
    elif data.action == "delete":
        for item in items:
            await db.delete(item)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {data.action}")
    
    await db.commit()
    return {"message": f"Bulk {data.action} completed", "affected": len(items)}


# --- Stats Endpoint ---

@router.get("/stats", response_model=MenuStats)
async def get_menu_stats(db: AsyncSession = Depends(get_db)):
    """Get menu statistics"""
    total_result = await db.execute(
        select(func.count(MenuItemModel.id))
        .where(MenuItemModel.tenant_id == DEFAULT_TENANT_ID)
    )
    total_items = total_result.scalar()
    
    cat_result = await db.execute(
        select(func.count(CategoryModel.id))
        .where(CategoryModel.tenant_id == DEFAULT_TENANT_ID)
    )
    total_categories = cat_result.scalar()
    
    active_result = await db.execute(
        select(func.count(MenuItemModel.id))
        .where(MenuItemModel.tenant_id == DEFAULT_TENANT_ID)
        .where(MenuItemModel.is_active == True)
    )
    active_items = active_result.scalar()
    
    # Count set menus
    set_menu_result = await db.execute(
        select(func.count(SetMenuModel.id))
        .where(SetMenuModel.tenant_id == DEFAULT_TENANT_ID)
    )
    total_set_menus = set_menu_result.scalar()
    
    # Avg food cost % — ONLY for FOOD items (exclude SERVICE)
    avg_cost = None
    try:
        cost_result = await db.execute(
            select(
                func.avg(
                    MenuItemModel.cost_price / func.nullif(MenuItemModel.selling_price, 0) * 100
                )
            ).outerjoin(
                CategoryModel, MenuItemModel.category_id == CategoryModel.id
            ).where(
                MenuItemModel.tenant_id == DEFAULT_TENANT_ID,
                MenuItemModel.selling_price > 0,
                or_(CategoryModel.item_type == 'FOOD', CategoryModel.item_type.is_(None))
            )
        )
        avg_cost_val = cost_result.scalar()
        avg_cost = round(float(avg_cost_val), 1) if avg_cost_val else None
    except Exception:
        pass
    
    return MenuStats(
        total_items=total_items or 0,
        active_items=active_items or 0,
        inactive_items=(total_items or 0) - (active_items or 0),
        total_categories=total_categories or 0,
        total_set_menus=total_set_menus or 0,
        avg_food_cost_pct=avg_cost
    )

class SmartMatchRequest(BaseModel):
    items: List[str]

class MatchResult(BaseModel):
    input_text: str
    match_type: str  # 'exact', 'unaccent', 'fuzzy', 'none'
    matches: List[dict]  # List of {id, name, score}

@router.post("/smart-match", response_model=List[MatchResult])
async def smart_match_menu_items(
    payload: SmartMatchRequest,
    db: AsyncSession = Depends(get_db)
):
    results = []
    
    # Pre-clean inputs
    clean_inputs = [i.strip() for i in payload.items if i.strip()]
    
    for input_text in clean_inputs:
        matched = False
        candidates = []
        
        # 1. Exact Match (Case-insensitive)
        exact_query = select(MenuItemModel).where(func.lower(MenuItemModel.name) == input_text.lower())
        exact_result = (await db.execute(exact_query)).scalars().first()
        
        if exact_result:
            candidates.append({
                "id": str(exact_result.id),
                "name": exact_result.name,
                "score": 1.0,
                "price": exact_result.selling_price
            })
            results.append({
                "input_text": input_text,
                "match_type": "exact",
                "matches": candidates
            })
            continue

        # 2. Unaccent Match
        # unaccent(name) ILIKE unaccent(input)
        unaccent_query = select(MenuItemModel).where(
            text("unaccent(lower(name)) = unaccent(lower(:term))")
        ).params(term=input_text)
        
        unaccent_results = (await db.execute(unaccent_query)).scalars().all()
        
        if unaccent_results:
            for item in unaccent_results:
                candidates.append({
                    "id": str(item.id),
                    "name": item.name,
                    "score": 0.9,
                    "price": item.selling_price
                })
            results.append({
                "input_text": input_text,
                "match_type": "unaccent",
                "matches": candidates
            })
            continue

        # 3. Fuzzy Match (Trigram)
        try:
            # Using simple pg_trgm similarity
            # Note: We select MenuItemModel and score
            fuzzy_query = select(MenuItemModel, func.similarity(MenuItemModel.name, input_text).label("score"))\
                .where(text("name % :term")).params(term=input_text)\
                .order_by(text("score DESC")).limit(3)
            
            fuzzy_exec = await db.execute(fuzzy_query)
            fuzzy_rows = fuzzy_exec.all() 
            
            if fuzzy_rows:
                for item, score in fuzzy_rows:
                    candidates.append({
                        "id": str(item.id),
                        "name": item.name,
                        "score": float(score),
                        "price": item.selling_price
                    })
                results.append({
                    "input_text": input_text,
                    "match_type": "fuzzy",
                    "matches": candidates
                })
                continue
        except Exception as e:
            # Fallback if extension missing or other error
            print(f"Fuzzy search failed: {e}")

        # 4. No Match
        results.append({
            "input_text": input_text,
            "match_type": "none",
            "matches": []
        })

    return results


# ============ PHASE 15.1: RECIPE MANAGEMENT ============

from backend.modules.menu.domain.models import RecipeModel
# Note: Using raw SQL for inventory cost lookup to avoid cross-module ORM conflicts
from decimal import Decimal

class RecipeIngredientBase(BaseModel):
    """Base schema for recipe ingredient"""
    ingredient_id: UUID
    ingredient_name: str
    quantity_per_unit: float
    uom: str = "kg"
    notes: Optional[str] = None

class RecipeIngredient(RecipeIngredientBase):
    """Full recipe ingredient response"""
    id: UUID
    menu_item_id: UUID
    menu_item_name: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

class RecipeCostResponse(BaseModel):
    """Food cost calculation response"""
    menu_item_id: UUID
    menu_item_name: str
    selling_price: float
    ingredient_count: int
    total_food_cost: float
    food_cost_percentage: float
    profit_margin: float
    ingredients: List[dict]


@router.get("/items/{item_id}/recipes")
async def list_item_recipes(
    item_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get all recipe ingredients for a menu item"""
    # Verify item exists
    item_result = await db.execute(
        select(MenuItemModel).where(MenuItemModel.id == item_id)
    )
    item = item_result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    # Get recipes
    result = await db.execute(
        select(RecipeModel).where(RecipeModel.menu_item_id == item_id)
    )
    recipes = result.scalars().all()
    
    return {
        "menu_item_id": str(item_id),
        "menu_item_name": item.name,
        "ingredient_count": len(recipes),
        "ingredients": [
            {
                "id": str(r.id),
                "ingredient_id": str(r.ingredient_id),
                "ingredient_name": r.ingredient_name,
                "quantity_per_unit": float(r.quantity_per_unit),
                "uom": r.uom,
                "notes": r.notes
            }
            for r in recipes
        ]
    }


@router.post("/items/{item_id}/recipes")
async def add_recipe_ingredient(
    item_id: UUID,
    data: RecipeIngredientBase,
    db: AsyncSession = Depends(get_db)
):
    """Add ingredient to menu item recipe"""
    # Verify menu item exists
    item_result = await db.execute(
        select(MenuItemModel).where(MenuItemModel.id == item_id)
    )
    item = item_result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    # Check for duplicate
    existing = await db.execute(
        select(RecipeModel).where(
            RecipeModel.menu_item_id == item_id,
            RecipeModel.ingredient_id == data.ingredient_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ingredient already in recipe")
    
    # Create recipe entry
    recipe = RecipeModel(
        tenant_id=item.tenant_id,
        menu_item_id=item_id,
        menu_item_name=item.name,
        ingredient_id=data.ingredient_id,
        ingredient_name=data.ingredient_name,
        quantity_per_unit=data.quantity_per_unit,
        uom=data.uom,
        notes=data.notes
    )
    
    db.add(recipe)
    await db.commit()
    await db.refresh(recipe)
    
    return {
        "id": str(recipe.id),
        "menu_item_id": str(item_id),
        "ingredient_id": str(recipe.ingredient_id),
        "ingredient_name": recipe.ingredient_name,
        "quantity_per_unit": float(recipe.quantity_per_unit),
        "uom": recipe.uom,
        "message": "Ingredient added to recipe"
    }


@router.put("/items/{item_id}/recipes/{recipe_id}")
async def update_recipe_ingredient(
    item_id: UUID,
    recipe_id: UUID,
    data: RecipeIngredientBase,
    db: AsyncSession = Depends(get_db)
):
    """Update ingredient in recipe"""
    result = await db.execute(
        select(RecipeModel).where(
            RecipeModel.id == recipe_id,
            RecipeModel.menu_item_id == item_id
        )
    )
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe ingredient not found")
    
    recipe.quantity_per_unit = data.quantity_per_unit
    recipe.uom = data.uom
    recipe.notes = data.notes
    
    await db.commit()
    await db.refresh(recipe)
    
    return {
        "id": str(recipe.id),
        "quantity_per_unit": float(recipe.quantity_per_unit),
        "uom": recipe.uom,
        "message": "Recipe updated"
    }


@router.delete("/items/{item_id}/recipes/{recipe_id}")
async def delete_recipe_ingredient(
    item_id: UUID,
    recipe_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Remove ingredient from recipe"""
    result = await db.execute(
        select(RecipeModel).where(
            RecipeModel.id == recipe_id,
            RecipeModel.menu_item_id == item_id
        )
    )
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe ingredient not found")
    
    await db.delete(recipe)
    await db.commit()
    
    return {"message": "Ingredient removed from recipe"}


@router.get("/items/{item_id}/cost", response_model=RecipeCostResponse)
async def calculate_food_cost(
    item_id: UUID,
    portions: int = 1,
    db: AsyncSession = Depends(get_db)
):
    """Calculate food cost based on recipe ingredients and inventory costs"""
    # Get menu item
    item_result = await db.execute(
        select(MenuItemModel).where(MenuItemModel.id == item_id)
    )
    item = item_result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    # Get recipes with inventory costs
    result = await db.execute(
        select(RecipeModel).where(RecipeModel.menu_item_id == item_id)
    )
    recipes = result.scalars().all()
    
    total_cost = Decimal(0)
    ingredients_detail = []
    
    for recipe in recipes:
        # Get ingredient cost from inventory using raw SQL (avoid ORM cross-module conflict)
        inv_result = await db.execute(
            text("SELECT cost_price FROM inventory_items WHERE id = :item_id"),
            {"item_id": str(recipe.ingredient_id)}
        )
        inv_row = inv_result.fetchone()
        
        unit_cost = Decimal(inv_row[0] or 0) if inv_row else Decimal(0)
        ingredient_cost = Decimal(recipe.quantity_per_unit or 0) * unit_cost * portions
        total_cost += ingredient_cost
        
        ingredients_detail.append({
            "ingredient_id": str(recipe.ingredient_id),
            "ingredient_name": recipe.ingredient_name,
            "quantity": float(recipe.quantity_per_unit) * portions,
            "uom": recipe.uom,
            "unit_cost": float(unit_cost),
            "line_cost": float(ingredient_cost)
        })
    
    selling_price = float(item.selling_price or 0)
    food_cost_pct = (float(total_cost) / selling_price * 100) if selling_price > 0 else 0
    profit_margin = selling_price - float(total_cost)
    
    return RecipeCostResponse(
        menu_item_id=item_id,
        menu_item_name=item.name,
        selling_price=selling_price * portions,
        ingredient_count=len(recipes),
        total_food_cost=float(total_cost),
        food_cost_percentage=round(food_cost_pct, 2),
        profit_margin=profit_margin * portions,
        ingredients=ingredients_detail
    )


# ============ SET MENU (COMBO) MANAGEMENT ============

@router.get("/set-menus")
async def list_set_menus(db: AsyncSession = Depends(get_db)):
    """List all set menus with their items"""
    result = await db.execute(
        select(SetMenuModel)
        .options(selectinload(SetMenuModel.items).selectinload(SetMenuItemModel.menu_item))
        .where(SetMenuModel.tenant_id == DEFAULT_TENANT_ID)
        .order_by(SetMenuModel.sort_order, SetMenuModel.name)
    )
    set_menus = result.scalars().all()
    
    return [
        {
            "id": str(sm.id),
            "name": sm.name,
            "code": sm.code,
            "description": sm.description,
            "image_url": sm.image_url,
            "selling_price": float(sm.selling_price or 0),
            "is_active": sm.is_active,
            "created_at": sm.created_at.isoformat() if sm.created_at else None,
            "updated_at": sm.updated_at.isoformat() if sm.updated_at else None,
            "items": [
                {
                    "id": str(si.id),
                    "menu_item_id": str(si.menu_item_id),
                    "menu_item_name": si.menu_item.name if si.menu_item else None,
                    "quantity": si.quantity,
                    "notes": si.notes
                }
                for si in sm.items
            ]
        }
        for sm in set_menus
    ]


@router.post("/set-menus")
async def create_set_menu(data: SetMenuCreate, db: AsyncSession = Depends(get_db)):
    """Create a new set menu with items"""
    new_set_menu = SetMenuModel(
        tenant_id=DEFAULT_TENANT_ID,
        name=data.name,
        code=data.code,
        description=data.description,
        image_url=data.image_url,
        selling_price=data.selling_price,
        is_active=data.is_active
    )
    db.add(new_set_menu)
    await db.flush()
    
    for item_data in data.items:
        set_menu_item = SetMenuItemModel(
            tenant_id=DEFAULT_TENANT_ID,
            set_menu_id=new_set_menu.id,
            menu_item_id=item_data.menu_item_id,
            quantity=item_data.quantity,
            notes=item_data.notes
        )
        db.add(set_menu_item)
    
    await db.commit()
    await db.refresh(new_set_menu)
    return {"id": str(new_set_menu.id), "message": "Set menu created"}


@router.put("/set-menus/{set_menu_id}")
async def update_set_menu(set_menu_id: UUID, data: SetMenuUpdate, db: AsyncSession = Depends(get_db)):
    """Update a set menu"""
    result = await db.execute(
        select(SetMenuModel)
        .where(SetMenuModel.id == set_menu_id)
        .where(SetMenuModel.tenant_id == DEFAULT_TENANT_ID)
    )
    set_menu = result.scalar_one_or_none()
    if not set_menu:
        raise HTTPException(status_code=404, detail="Set menu not found")
    
    if data.name is not None:
        set_menu.name = data.name
    if data.code is not None:
        set_menu.code = data.code
    if data.description is not None:
        set_menu.description = data.description
    if data.selling_price is not None:
        set_menu.selling_price = data.selling_price
    if data.image_url is not None:
        set_menu.image_url = data.image_url
    if data.is_active is not None:
        set_menu.is_active = data.is_active
    
    if data.items is not None:
        await db.execute(
            sql_delete(SetMenuItemModel).where(SetMenuItemModel.set_menu_id == set_menu_id)
        )
        for item_data in data.items:
            set_menu_item = SetMenuItemModel(
                tenant_id=DEFAULT_TENANT_ID,
                set_menu_id=set_menu_id,
                menu_item_id=item_data.menu_item_id,
                quantity=item_data.quantity,
                notes=item_data.notes
            )
            db.add(set_menu_item)
    
    await db.commit()
    return {"id": str(set_menu_id), "message": "Set menu updated"}


@router.delete("/set-menus/{set_menu_id}")
async def delete_set_menu(set_menu_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete a set menu"""
    result = await db.execute(
        select(SetMenuModel)
        .where(SetMenuModel.id == set_menu_id)
        .where(SetMenuModel.tenant_id == DEFAULT_TENANT_ID)
    )
    set_menu = result.scalar_one_or_none()
    if not set_menu:
        raise HTTPException(status_code=404, detail="Set menu not found")
    
    await db.delete(set_menu)
    await db.commit()
    return {"message": "Set menu deleted", "id": str(set_menu_id)}


# ============ MENU ENGINEERING ANALYTICS ============

@router.get("/stats/menu-engineering")
async def menu_engineering_analysis(db: AsyncSession = Depends(get_db)):
    """
    Menu Engineering 4-quadrant analysis:
    - Star: High profitability, High popularity
    - Puzzle: High profitability, Low popularity
    - Workhorse: Low profitability, High popularity
    - Dog: Low profitability, Low popularity
    Uses food cost % as profitability proxy and selling_price rank as popularity proxy.
    """
    from decimal import Decimal as Dec
    from backend.modules.menu.domain.models import RecipeModel

    result = await db.execute(
        select(MenuItemModel)
        .outerjoin(CategoryModel, MenuItemModel.category_id == CategoryModel.id)
        .where(
            MenuItemModel.tenant_id == DEFAULT_TENANT_ID,
            MenuItemModel.is_active == True,
            or_(CategoryModel.item_type == 'FOOD', CategoryModel.item_type.is_(None))
        )
    )
    items = result.scalars().all()

    if not items:
        return {"items": [], "avg_food_cost": 0, "avg_selling_price": 0, "quadrants": {"star": 0, "puzzle": 0, "workhorse": 0, "dog": 0}}

    # Calculate food costs per item
    engineering_data = []
    for item in items:
        # Get recipe cost
        recipe_result = await db.execute(
            select(RecipeModel).where(RecipeModel.menu_item_id == item.id)
        )
        recipes = recipe_result.scalars().all()

        total_cost = Dec(0)
        for recipe in recipes:
            inv_result = await db.execute(
                text("SELECT cost_price FROM inventory_items WHERE id = :item_id"),
                {"item_id": str(recipe.ingredient_id)}
            )
            inv_row = inv_result.fetchone()
            unit_cost = Dec(inv_row[0] or 0) if inv_row else Dec(0)
            total_cost += Dec(recipe.quantity_per_unit or 0) * unit_cost

        selling = float(item.selling_price or 0)
        cost = float(total_cost)
        food_cost_pct = (cost / selling * 100) if selling > 0 else 0
        profit = selling - cost

        engineering_data.append({
            "id": str(item.id),
            "name": item.name,
            "category_name": None,  # will fill below
            "category_id": str(item.category_id) if item.category_id else None,
            "selling_price": selling,
            "food_cost": cost,
            "food_cost_pct": round(food_cost_pct, 1),
            "profit_margin": round(profit, 0),
            "popularity_score": selling,  # proxy: higher price items tend to be ordered
        })

    # Fill category names
    cat_result = await db.execute(
        select(CategoryModel).where(CategoryModel.tenant_id == DEFAULT_TENANT_ID)
    )
    cat_map = {str(c.id): c.name for c in cat_result.scalars().all()}
    for d in engineering_data:
        d["category_name"] = cat_map.get(d["category_id"], "Chưa phân loại")

    # Calculate medians for quadrant classification
    food_costs = [d["food_cost_pct"] for d in engineering_data if d["food_cost_pct"] > 0]
    selling_prices = [d["selling_price"] for d in engineering_data]

    avg_food_cost = sum(food_costs) / len(food_costs) if food_costs else 30
    avg_selling_price = sum(selling_prices) / len(selling_prices) if selling_prices else 0

    # Classify into quadrants
    quadrant_counts = {"star": 0, "puzzle": 0, "workhorse": 0, "dog": 0}
    for d in engineering_data:
        high_profit = d["food_cost_pct"] < avg_food_cost  # Low food cost = high profit
        high_popularity = d["selling_price"] >= avg_selling_price

        if high_profit and high_popularity:
            d["quadrant"] = "star"
        elif high_profit and not high_popularity:
            d["quadrant"] = "puzzle"
        elif not high_profit and high_popularity:
            d["quadrant"] = "workhorse"
        else:
            d["quadrant"] = "dog"

        quadrant_counts[d["quadrant"]] += 1

    return {
        "items": engineering_data,
        "avg_food_cost": round(avg_food_cost, 1),
        "avg_selling_price": round(avg_selling_price, 0),
        "quadrants": quadrant_counts,
        "total_items": len(engineering_data),
    }


@router.get("/stats/top-sellers")
async def top_sellers(limit: int = 10, db: AsyncSession = Depends(get_db)):
    """
    Top-selling menu items by selling price (proxy for popularity).
    In production, this would use actual order data.
    """
    result = await db.execute(
        select(MenuItemModel)
        .where(MenuItemModel.tenant_id == DEFAULT_TENANT_ID, MenuItemModel.is_active == True)
        .order_by(MenuItemModel.selling_price.desc())
        .limit(limit)
    )
    items = result.scalars().all()

    # Get category names
    cat_result = await db.execute(
        select(CategoryModel).where(CategoryModel.tenant_id == DEFAULT_TENANT_ID)
    )
    cat_map = {str(c.id): c.name for c in cat_result.scalars().all()}

    return [
        {
            "id": str(item.id),
            "name": item.name,
            "category_name": cat_map.get(str(item.category_id), "Chưa phân loại") if item.category_id else "Chưa phân loại",
            "selling_price": float(item.selling_price or 0),
            "cost_price": float(item.cost_price or 0),
            "food_cost_pct": round(float(item.cost_price or 0) / float(item.selling_price or 1) * 100, 1),
            "rank": idx + 1,
        }
        for idx, item in enumerate(items)
    ]


@router.get("/stats/category-breakdown")
async def category_breakdown(db: AsyncSession = Depends(get_db)):
    """Category breakdown with item counts and average food cost."""
    # Get all categories
    cat_result = await db.execute(
        select(CategoryModel).where(CategoryModel.tenant_id == DEFAULT_TENANT_ID)
    )
    categories = cat_result.scalars().all()

    # Get item counts per category
    result = await db.execute(
        select(
            MenuItemModel.category_id,
            func.count(MenuItemModel.id).label("item_count"),
            func.avg(MenuItemModel.selling_price).label("avg_selling_price"),
            func.avg(MenuItemModel.cost_price).label("avg_cost_price"),
            func.sum(MenuItemModel.selling_price).label("total_revenue_potential"),
        )
        .where(MenuItemModel.tenant_id == DEFAULT_TENANT_ID)
        .group_by(MenuItemModel.category_id)
    )
    breakdown = result.all()

    # Build map
    cat_map = {str(c.id): c.name for c in categories}
    breakdown_map = {}
    for row in breakdown:
        cat_id = str(row.category_id) if row.category_id else "uncategorized"
        avg_sell = float(row.avg_selling_price or 0)
        avg_cost = float(row.avg_cost_price or 0)
        breakdown_map[cat_id] = {
            "category_id": cat_id,
            "category_name": cat_map.get(cat_id, "Chưa phân loại"),
            "item_count": row.item_count,
            "avg_selling_price": round(avg_sell, 0),
            "avg_cost_price": round(avg_cost, 0),
            "avg_food_cost_pct": round(avg_cost / avg_sell * 100, 1) if avg_sell > 0 else 0,
            "total_revenue_potential": float(row.total_revenue_potential or 0),
        }

    return list(breakdown_map.values())
