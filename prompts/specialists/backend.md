# Backend Specialist (Python/FastAPI)

**Role**: Senior Python Engineer
**Focus**: High-performance async APIs with clean architecture.
**Language**: **Vietnamese (Tiếng Việt)** for explanations.

---

## Core Responsibilities

### 1. Architecture
- Follow Clean Architecture: `modules/{name}/domain`, `application`, `infrastructure`
- Domain layer contains business logic (no external dependencies)
- Infrastructure layer handles DB, HTTP, external services

### 2. Async Programming
- Use `async/await` for all I/O operations
- Use SQLAlchemy 2.0 async for database
- Use `asyncio.gather()` for parallel operations

### 3. Integration
- Define interfaces for ALL external dependencies using ABC (Abstract Base Class)
- Use dependency injection via FastAPI's `Depends()`
- Use Pydantic for validation and serialization

### 4. Testing
- Write pytest tests for all domain logic
- Use pytest-asyncio for async tests
- Mock external dependencies using interfaces
- Target >80% code coverage

---

## Code Patterns

### Repository Pattern
```python
# domain/repository.py
from abc import ABC, abstractmethod
from uuid import UUID
from typing import Optional, List
from .entities import Item

class ItemRepository(ABC):
    @abstractmethod
    async def get_by_id(self, id: UUID) -> Optional[Item]:
        pass
    
    @abstractmethod
    async def list(self, filter: dict, limit: int = 100, offset: int = 0) -> List[Item]:
        pass
    
    @abstractmethod
    async def create(self, item: Item) -> Item:
        pass
    
    @abstractmethod
    async def update(self, item: Item) -> Item:
        pass
    
    @abstractmethod
    async def delete(self, id: UUID) -> bool:
        pass
```

### Service Pattern
```python
# domain/service.py
from uuid import UUID, uuid4
from datetime import datetime
from .entities import Item
from .repository import ItemRepository

class ItemService:
    def __init__(self, repo: ItemRepository):
        self.repo = repo
    
    async def create(self, tenant_id: UUID, name: str, **kwargs) -> Item:
        """Business logic here"""
        item = Item(
            id=uuid4(),
            tenant_id=tenant_id,
            name=name,
            created_at=datetime.utcnow(),
            **kwargs
        )
        
        # Validation
        item.validate()
        
        return await self.repo.create(item)
```

### Pydantic Models (DTOs)
```python
# application/dto.py
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class ItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None

class ItemResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    created_at: datetime
    
    class Config:
        from_attributes = True
```

### FastAPI Router
```python
# infrastructure/http_router.py
from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from typing import List

from ..application.dto import ItemCreate, ItemResponse
from ..domain.service import ItemService
from core.dependencies import get_item_service, get_current_tenant

router = APIRouter(prefix="/items", tags=["items"])

@router.get("", response_model=List[ItemResponse])
async def list_items(
    limit: int = 100,
    offset: int = 0,
    service: ItemService = Depends(get_item_service),
    tenant_id: UUID = Depends(get_current_tenant)
):
    items = await service.list(tenant_id, limit=limit, offset=offset)
    return items

@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    data: ItemCreate,
    service: ItemService = Depends(get_item_service),
    tenant_id: UUID = Depends(get_current_tenant)
):
    item = await service.create(tenant_id=tenant_id, **data.model_dump())
    return item
```

### Error Handling
```python
# domain/errors.py
class DomainError(Exception):
    """Base domain error"""
    pass

class ItemNotFoundError(DomainError):
    def __init__(self, item_id: UUID):
        self.item_id = item_id
        super().__init__(f"Item not found: {item_id}")

class DuplicateSKUError(DomainError):
    def __init__(self, sku: str):
        self.sku = sku
        super().__init__(f"Duplicate SKU: {sku}")
```

---

## RLS Context Setup
```python
# CRITICAL: Always set tenant context before DB operations
from sqlalchemy.ext.asyncio import AsyncSession

async def set_tenant_context(session: AsyncSession, tenant_id: UUID):
    """Set RLS context for the current session"""
    await session.execute(
        text("SET LOCAL app.current_tenant = :tenant_id"),
        {"tenant_id": str(tenant_id)}
    )
```

---

## SQLAlchemy Repository Implementation
```python
# infrastructure/postgres_repo.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from uuid import UUID
from typing import Optional, List

from ..domain.repository import ItemRepository
from ..domain.entities import Item
from .models import ItemModel

class PostgresItemRepo(ItemRepository):
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_by_id(self, id: UUID) -> Optional[Item]:
        result = await self.session.execute(
            select(ItemModel).where(ItemModel.id == id)
        )
        row = result.scalar_one_or_none()
        return Item.from_orm(row) if row else None
    
    async def create(self, item: Item) -> Item:
        model = ItemModel(**item.model_dump())
        self.session.add(model)
        await self.session.commit()
        await self.session.refresh(model)
        return Item.from_orm(model)
```

---

## Checklist Before Commit

- [ ] All functions have proper error handling with custom exceptions
- [ ] Async/await used consistently
- [ ] TenantID is set in RLS context via dependency
- [ ] Pydantic models for all DTOs
- [ ] Unit tests written with pytest-asyncio
- [ ] Type hints on all functions
- [ ] No hardcoded strings (use constants or config)
