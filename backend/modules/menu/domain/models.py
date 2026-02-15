"""
SQLAlchemy ORM Models for Menu Module
"""
from sqlalchemy import Column, String, Text, Boolean, Numeric, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from backend.core.database import Base


class Tenant(Base):
    """Tenant model for multi-tenancy"""
    __tablename__ = "tenants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    code = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    categories = relationship("CategoryModel", back_populates="tenant")
    menu_items = relationship("MenuItemModel", back_populates="tenant")


class CategoryModel(Base):
    """Category ORM model"""
    __tablename__ = "categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(50))
    description = Column(Text)
    item_type = Column(String(20), nullable=False, default='FOOD')  # FOOD | SERVICE
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="categories")
    items = relationship("MenuItemModel", back_populates="category")


class MenuItemModel(Base):
    """Menu Item ORM model"""
    __tablename__ = "menu_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    image_url = Column(Text)
    uom = Column(String(50), default="Món")
    cost_price = Column(Numeric(15, 2), default=0)
    selling_price = Column(Numeric(15, 2), default=0)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="menu_items")
    category = relationship("CategoryModel", back_populates="items")
    recipes = relationship("RecipeModel", back_populates="menu_item", cascade="all, delete-orphan")


# Recipe Management - Ingredient Mapping
class RecipeModel(Base):
    """Recipe ORM model - Maps Menu Items to Inventory Items (ingredients)"""
    __tablename__ = "recipes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    
    menu_item_id = Column(UUID(as_uuid=True), ForeignKey("menu_items.id", ondelete="CASCADE"), nullable=False)
    menu_item_name = Column(String(255), nullable=False)
    ingredient_id = Column(UUID(as_uuid=True), nullable=False)
    ingredient_name = Column(String(255), nullable=False)
    
    quantity_per_unit = Column(Numeric(15, 4), default=1)
    uom = Column(String(50), default="kg")
    
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    menu_item = relationship("MenuItemModel", back_populates="recipes")


# Set Menu (Combo) Management
class SetMenuModel(Base):
    """Set Menu / Combo ORM model"""
    __tablename__ = "set_menus"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(50))
    description = Column(Text)
    image_url = Column(Text)
    selling_price = Column(Numeric(15, 2), default=0)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    items = relationship("SetMenuItemModel", back_populates="set_menu", cascade="all, delete-orphan")


class SetMenuItemModel(Base):
    """Set Menu Item ORM model - Maps Set Menus to Menu Items"""
    __tablename__ = "set_menu_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    set_menu_id = Column(UUID(as_uuid=True), ForeignKey("set_menus.id", ondelete="CASCADE"), nullable=False)
    menu_item_id = Column(UUID(as_uuid=True), ForeignKey("menu_items.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, default=1)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    set_menu = relationship("SetMenuModel", back_populates="items")
    menu_item = relationship("MenuItemModel")
