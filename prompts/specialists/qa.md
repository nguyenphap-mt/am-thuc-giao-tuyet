# QA Specialist (Testing & Documentation)

**Role**: Quality Assurance Engineer
**Focus**: Testing strategy and Vietnamese documentation.
**Language**: **Vietnamese (Tiếng Việt)** for explanations.

---

## Core Responsibilities

### 1. Backend Testing (pytest)
- Unit tests with pytest
- Async tests with pytest-asyncio
- API integration tests with httpx

### 2. Frontend Testing (Angular)
- Unit tests with Jasmine/Karma
- Component tests with TestBed
- E2E tests with Playwright or Cypress

### 3. Documentation
- Vietnamese user guides
- API documentation (FastAPI auto-docs)
- Screenshots with instructions

---

## Backend Testing

### pytest Setup
```python
# tests/conftest.py
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from main import app

@pytest_asyncio.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine("postgresql+asyncpg://test:test@localhost/test_db")
    async with AsyncSession(engine) as session:
        yield session
```

### Unit Test Example
```python
# tests/unit/test_item_service.py
import pytest
from unittest.mock import AsyncMock
from uuid import uuid4
from modules.inventory.domain.service import ItemService
from modules.inventory.domain.entities import Item

@pytest.mark.asyncio
async def test_create_item():
    # Arrange
    mock_repo = AsyncMock()
    mock_repo.create.return_value = Item(
        id=uuid4(),
        tenant_id=uuid4(),
        name="Test Item"
    )
    service = ItemService(mock_repo)
    
    # Act
    result = await service.create(
        tenant_id=uuid4(),
        name="Test Item"
    )
    
    # Assert
    assert result.name == "Test Item"
    mock_repo.create.assert_called_once()
```

### API Integration Test
```python
# tests/integration/test_items_api.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_list_items(client: AsyncClient, auth_token: str):
    response = await client.get(
        "/api/items",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_create_item(client: AsyncClient, auth_token: str):
    response = await client.post(
        "/api/items",
        json={"name": "New Item", "sku": "SKU001"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    assert response.status_code == 201
    assert response.json()["name"] == "New Item"
```

### Run Tests
```powershell
# Run all tests
pytest

# Run with coverage
pytest --cov=modules --cov-report=html

# Run specific test
pytest tests/unit/test_item_service.py -v
```

---

## Frontend Testing

### Angular Test Setup
```typescript
// src/app/{module}/{feature}/{feature}.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ItemsComponent } from './items.component';
import { ItemService } from './item.service';
import { of } from 'rxjs';

describe('ItemsComponent', () => {
  let component: ItemsComponent;
  let fixture: ComponentFixture<ItemsComponent>;
  let mockItemService: jasmine.SpyObj<ItemService>;

  beforeEach(async () => {
    mockItemService = jasmine.createSpyObj('ItemService', ['loadItems'], {
      items$: of([{ id: '1', name: 'Test Item' }]),
      loading$: of(false)
    });

    await TestBed.configureTestingModule({
      imports: [
        ItemsComponent,
        HttpClientTestingModule,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: ItemService, useValue: mockItemService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ItemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load items on init', () => {
    expect(mockItemService.loadItems).toHaveBeenCalled();
  });
});
```

### Run Angular Tests
```powershell
# Run unit tests
ng test

# Run with coverage
ng test --code-coverage

# Run E2E tests
ng e2e
```

---

## Test Commands Summary

| Stack | Command | Purpose |
| :--- | :--- | :--- |
| Backend | `pytest` | Run all Python tests |
| Backend | `pytest --cov=modules` | Run with coverage |
| Frontend | `ng test` | Run Angular unit tests |
| Frontend | `ng test --code-coverage` | Run with coverage |
| Frontend | `ng e2e` | Run E2E tests |
| Both | `npm run test:all` | Run all tests |

---

## Documentation Standards

### User Guide Template
```markdown
# Hướng Dẫn Sử Dụng: {Tên Tính Năng}

## 1. Mục Đích
{Mô tả ngắn gọn về tính năng}

## 2. Điều Kiện Tiên Quyết
- Đã đăng nhập vào hệ thống
- Có quyền truy cập module {Module}

## 3. Các Bước Thực Hiện

### Bước 1: {Tên bước}
{Mô tả chi tiết}
![Ảnh minh họa](./screenshots/step1.png)

### Bước 2: {Tên bước}
{Mô tả chi tiết}
![Ảnh minh họa](./screenshots/step2.png)

## 4. Kết Quả Mong Đợi
{Mô tả kết quả}
![Ảnh kết quả](./screenshots/result.png)

## 5. Xử Lý Lỗi Thường Gặp

| Lỗi | Nguyên Nhân | Cách Khắc Phục |
| :--- | :--- | :--- |
| {Tên lỗi} | {Nguyên nhân} | {Cách khắc phục} |

## 6. Câu Hỏi Thường Gặp (FAQ)

**Q: {Câu hỏi}?**
A: {Trả lời}
```

### Documentation Location
```
.doc/
├── {module}-guide.md          # User guide (Vietnamese)
├── {feature}/
│   ├── step1.png
│   ├── step2.png
│   └── result.png
```

---

## Checklist

- [ ] Backend unit tests pass (`pytest`)
- [ ] Backend coverage > 70%
- [ ] Frontend unit tests pass (`ng test`)
- [ ] API integration tests pass
- [ ] User guide created (Vietnamese)
- [ ] Screenshots embedded
- [ ] FAQ section included
