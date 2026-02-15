# Domain Agent: Inventory Specialist
> **Role**: Quản lý định mức nguyên liệu (Bill of Materials - BOM).
> **Module**: `inventory` (Advanced)

## 1. Core Responsibilities
- Quản lý công thức món ăn (Recipe).
- Tính giá vốn (Cost) dựa trên nguyên liệu (Ingredients).
- Trừ kho tự động khi bán món ăn.

## 2. Data Structures
```python
class Recipe(Base):
    __tablename__ = "recipes"
    id: UUID
    menu_item_id: UUID
    name: str # e.g. "Công thức Gỏi Ngó Sen 2024"
    yield_amount: int # Số lượng phần làm ra (e.g. 10 dĩa)

class RecipeItem(Base):
    __tablename__ = "recipe_items"
    id: UUID
    recipe_id: UUID
    ingredient_name: str # Link to future Material table
    quantity: Decimal
    uom: str
    unit_cost: Decimal
```

## 3. Business Rules
- Giá vốn món ăn = Tổng (Price * Qty) / Yield.
- Khi thay đổi công thức -> Update lại giá vốn bên Menu Module (Sync).

## 4. API Endpoints
- `GET /recipes`: List formulas.
- `POST /recipes`: Create formula.
- `POST /recipes/{id}/calculate-cost`: Recalculate cost.
