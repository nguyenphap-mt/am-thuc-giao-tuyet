from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from decimal import Decimal

# --- Domain Entities (Pydantic) ---

# Category
class CategoryBase(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    item_type: str = 'FOOD'  # FOOD | SERVICE
    sort_order: int = 0

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    item_type: Optional[str] = None  # FOOD | SERVICE
    sort_order: Optional[int] = None

class Category(CategoryBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Menu Item
class MenuItemBase(BaseModel):
    category_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    uom: str = "dĩa"
    cost_price: Decimal = Decimal(0)
    selling_price: Decimal = Decimal(0)
    is_active: bool = True
    sort_order: int = 0

class MenuItem(MenuItemBase):
    id: UUID
    tenant_id: UUID
    category_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Set Menu
class SetMenuBase(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    selling_price: Decimal = Decimal(0)
    image_url: Optional[str] = None
    is_active: bool = True

class SetMenuItemCreate(BaseModel):
    menu_item_id: UUID
    quantity: int = 1
    notes: Optional[str] = None

class SetMenuCreate(SetMenuBase):
    items: List[SetMenuItemCreate] = []

class SetMenuUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    selling_price: Optional[Decimal] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    items: Optional[List[SetMenuItemCreate]] = None

class SetMenuItemResponse(BaseModel):
    id: UUID
    menu_item_id: UUID
    menu_item_name: Optional[str] = None
    quantity: int
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True

class SetMenu(SetMenuBase):
    id: UUID
    tenant_id: UUID
    items: List[SetMenuItemResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Bulk Actions
class BulkActionRequest(BaseModel):
    ids: List[UUID]
    action: str  # "activate", "deactivate", "delete"

# Stats
class MenuStats(BaseModel):
    total_items: int = 0
    active_items: int = 0
    inactive_items: int = 0
    total_categories: int = 0
    total_set_menus: int = 0
    avg_food_cost_pct: Optional[float] = None

# Recipe
class RecipeIngredientBase(BaseModel):
    ingredient_id: UUID
    ingredient_name: str
    quantity_per_unit: Decimal = Decimal(1)
    uom: str = "kg"
    notes: Optional[str] = None

class RecipeIngredient(RecipeIngredientBase):
    id: UUID
    menu_item_id: UUID
    menu_item_name: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
