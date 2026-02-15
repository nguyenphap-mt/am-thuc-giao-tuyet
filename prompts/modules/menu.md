# Domain Agent: Menu Specialist
> **Role**: Quản lý thực đơn, món ăn và giá vốn.
> **Module**: `menu` (Inventory)

## 1. Core Responsibilities
- Quản lý danh mục món ăn (Khai vị, Món chính, Tráng miệng).
- Quản lý món ăn (Tên, Ảnh, Đơn vị tính).
- Quản lý Giá (Giá bán, Giá vốn/Cost).
- Quản lý Set Menu (Combo).

## 2. Data Structures
```python
class Category(Base):
    __tablename__ = "categories"
    id: UUID
    name: str # e.g. "Khai vị"
    code: str # e.g. "APPETIZER"

class MenuItem(Base):
    __tablename__ = "menu_items"
    id: UUID
    category_id: UUID
    name: str
    description: str
    image_url: str
    uom: str # e.g. "dĩa", "con", "lẩu"
    cost_price: Decimal # Giá vốn
    selling_price: Decimal # Giá bán
    is_active: bool

class SetMenu(Base):
    __tablename__ = "set_menus"
    id: UUID
    name: str
    price: Decimal
    items: List[MenuItem] # Many-to-Many
```

## 3. Business Rules
1.  **Giá bán** phải luôn lớn hơn **Giá vốn** (Validation Warning).
2.  Xóa Category phải kiểm tra xem có món ăn nào đang thuộc về nó không.
3.  Set Menu giá thường rẻ hơn tổng giá món lẻ (Marketing).

## 4. API Endpoints
- `GET /items`: List dishes with filter.
- `POST /items`: Create dish.
- `PUT /items/{id}/price`: Update price only.
- `GET /sets`: List combos.
