# Python Module Skeleton (Backend Template)

Sử dụng template này khi tạo một Module mới trong hệ thống ERP.

## Cấu Trúc Thư Mục

```
backend/modules/{module_name}/
├── domain/
│   ├── entities.py        # Domain Entities (Pydantic models)
│   ├── repository.py      # Repository Interface (ABC)
│   └── service.py         # Domain Service (business logic)
├── application/
│   ├── dto.py             # Data Transfer Objects (Request/Response)
│   ├── usecase.py         # Application Use Cases
│   └── mapper.py          # Entity <-> DTO mapping
├── infrastructure/
│   ├── models.py          # SQLAlchemy ORM Models
│   ├── postgres_repo.py   # Repository Implementation
│   └── http_router.py     # FastAPI Router
└── __init__.py            # Module Registration
```

---

## Code Mẫu

### 1. Entity (`domain/entities.py`)
```python
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class {Entity}(BaseModel):
    """
    {Entity} represents the core domain object.
    RULE: Domain entities use Pydantic for validation.
    """
    id: UUID
    tenant_id: UUID  # MANDATORY for RLS
    name: str = Field(..., min_length=1, max_length=255)
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
    
    def validate_business_rules(self) -> None:
        """Custom business validation logic"""
        if not self.name.strip():
            raise ValueError("Name cannot be empty")
```

### 2. Repository Interface (`domain/repository.py`)
```python
from abc import ABC, abstractmethod
from uuid import UUID
from typing import Optional, List
from .entities import {Entity}

class {Entity}Repository(ABC):
    """
    {Entity}Repository defines the contract for data access.
    RULE: Interface lives in DOMAIN layer, not infrastructure.
    """
    
    @abstractmethod
    async def get_by_id(self, id: UUID) -> Optional[{Entity}]:
        pass
    
    @abstractmethod
    async def list(
        self, 
        tenant_id: UUID,
        limit: int = 100, 
        offset: int = 0
    ) -> List[{Entity}]:
        pass
    
    @abstractmethod
    async def create(self, entity: {Entity}) -> {Entity}:
        pass
    
    @abstractmethod
    async def update(self, entity: {Entity}) -> {Entity}:
        pass
    
    @abstractmethod
    async def delete(self, id: UUID) -> bool:
        pass
```

### 3. SQLAlchemy Model (`infrastructure/models.py`)
```python
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from core.database import Base
import uuid

class {Entity}Model(Base):
    __tablename__ = "{table_name}"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

### 4. Repository Implementation (`infrastructure/postgres_repo.py`)
```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.sql import text
from uuid import UUID
from typing import Optional, List

from ..domain.repository import {Entity}Repository
from ..domain.entities import {Entity}
from .models import {Entity}Model

class Postgres{Entity}Repo({Entity}Repository):
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_by_id(self, id: UUID) -> Optional[{Entity}]:
        # IMPORTANT: RLS is active via session context
        result = await self.session.execute(
            select({Entity}Model).where({Entity}Model.id == id)
        )
        row = result.scalar_one_or_none()
        return {Entity}.model_validate(row) if row else None
    
    async def list(
        self, 
        tenant_id: UUID,
        limit: int = 100, 
        offset: int = 0
    ) -> List[{Entity}]:
        result = await self.session.execute(
            select({Entity}Model)
            .limit(limit)
            .offset(offset)
        )
        return [{Entity}.model_validate(row) for row in result.scalars()]
    
    async def create(self, entity: {Entity}) -> {Entity}:
        model = {Entity}Model(**entity.model_dump())
        self.session.add(model)
        await self.session.commit()
        await self.session.refresh(model)
        return {Entity}.model_validate(model)
```

### 5. FastAPI Router (`infrastructure/http_router.py`)
```python
from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from typing import List

from ..application.dto import {Entity}Create, {Entity}Response, {Entity}Update
from ..domain.service import {Entity}Service
from core.dependencies import get_{entity}_service, get_current_tenant

router = APIRouter(prefix="/{entities}", tags=["{entities}"])

@router.get("", response_model=List[{Entity}Response])
async def list_{entities}(
    limit: int = 100,
    offset: int = 0,
    service: {Entity}Service = Depends(get_{entity}_service),
    tenant_id: UUID = Depends(get_current_tenant)
):
    return await service.list(tenant_id, limit=limit, offset=offset)

@router.get("/{id}", response_model={Entity}Response)
async def get_{entity}(
    id: UUID,
    service: {Entity}Service = Depends(get_{entity}_service)
):
    entity = await service.get_by_id(id)
    if not entity:
        raise HTTPException(status_code=404, detail="{Entity} not found")
    return entity

@router.post("", response_model={Entity}Response, status_code=status.HTTP_201_CREATED)
async def create_{entity}(
    data: {Entity}Create,
    service: {Entity}Service = Depends(get_{entity}_service),
    tenant_id: UUID = Depends(get_current_tenant)
):
    return await service.create(tenant_id=tenant_id, **data.model_dump())

@router.put("/{id}", response_model={Entity}Response)
async def update_{entity}(
    id: UUID,
    data: {Entity}Update,
    service: {Entity}Service = Depends(get_{entity}_service)
):
    return await service.update(id, **data.model_dump(exclude_unset=True))

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_{entity}(
    id: UUID,
    service: {Entity}Service = Depends(get_{entity}_service)
):
    await service.delete(id)
```

### 6. RLS Session Setup (Middleware)
```python
# CRITICAL: This middleware MUST run before any DB query.
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import text

async def set_tenant_context(session: AsyncSession, tenant_id: UUID):
    """Set RLS context for the current session"""
    await session.execute(
        text("SET LOCAL app.current_tenant = :tenant_id"),
        {"tenant_id": str(tenant_id)}
    )
```

---

## Checklist Khi Tạo Module Mới

- [ ] Tạo `domain/entities.py` với Pydantic models
- [ ] Tạo `domain/repository.py` (ABC Interface)
- [ ] Tạo `infrastructure/models.py` (SQLAlchemy)
- [ ] Tạo `infrastructure/postgres_repo.py` (Implementation)
- [ ] Tạo `infrastructure/http_router.py` (FastAPI)
- [ ] Tạo SQL Migration với RLS Policy
- [ ] Đăng ký router trong main app
- [ ] Viết unit tests với pytest-asyncio
