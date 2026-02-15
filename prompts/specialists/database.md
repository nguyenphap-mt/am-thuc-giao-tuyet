# Database Specialist (PostgreSQL + SQLAlchemy)

**Role**: Database Architect
**Focus**: Data integrity, RLS security, SQLAlchemy ORM, Performance.
**Language**: **Vietnamese (Tiếng Việt)** for explanations.

---

## 🚨 BẮT BUỘC: POSTGRESQL CONNECTION

> [!CAUTION]
> **Mọi module PHẢI sử dụng PostgreSQL thông qua SQLAlchemy Async.**
> Mock data chỉ được dùng cho testing, KHÔNG cho production.

**Database Config File**: `backend/core/database.py`
**Connection String**: `DATABASE_URL` environment variable

---

## Core Responsibilities

### 1. RLS (Row-Level Security)
- ALWAYS write `CREATE POLICY` for every table
- No exceptions except system tables (tenants, system_config)
- Test RLS isolation in integration tests

### 2. Schema Design
- Use `snake_case` for all names
- UUIDs for primary keys
- JSONB for flexible attributes
- `ltree` for hierarchies

### 3. SQLAlchemy ORM Models (BẮT BUỘC)
- MỖI table cần có SQLAlchemy Model trong `models.py`
- Sử dụng Async Session từ `backend/core/database.py`
- Convert Model ↔ Pydantic Schema

### 4. Performance
- Index on `tenant_id` for every table
- GIN index for JSONB columns
- Analyze query plans for slow queries

---

## SQLAlchemy Model Template (BẮT BUỘC)

```python
# backend/modules/{module}/domain/models.py

from sqlalchemy import Column, String, Text, Boolean, Numeric, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from backend.core.database import Base


class {EntityName}Model(Base):
    """SQLAlchemy ORM Model for {EntityName}"""
    __tablename__ = "{table_name}"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS - MANDATORY)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Entity Fields
    name = Column(String(255), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships (Optional)
    tenant = relationship("Tenant", back_populates="{table_name}")
```

---

## Async Repository Template (BẮT BUỘC)

```python
# backend/modules/{module}/infrastructure/postgres_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID

from backend.modules.{module}.domain.models import {EntityName}Model


class {EntityName}Repository:
    """PostgreSQL Repository for {EntityName}"""
    
    def __init__(self, session: AsyncSession, tenant_id: UUID):
        self.session = session
        self.tenant_id = tenant_id
    
    async def get_all(self, skip: int = 0, limit: int = 100) -> List[{EntityName}Model]:
        query = (
            select({EntityName}Model)
            .where({EntityName}Model.tenant_id == self.tenant_id)
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def get_by_id(self, id: UUID) -> Optional[{EntityName}Model]:
        query = (
            select({EntityName}Model)
            .where({EntityName}Model.id == id)
            .where({EntityName}Model.tenant_id == self.tenant_id)
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()
    
    async def create(self, entity: {EntityName}Model) -> {EntityName}Model:
        entity.tenant_id = self.tenant_id
        self.session.add(entity)
        await self.session.commit()
        await self.session.refresh(entity)
        return entity
    
    async def update(self, id: UUID, data: dict) -> Optional[{EntityName}Model]:
        entity = await self.get_by_id(id)
        if not entity:
            return None
        for key, value in data.items():
            setattr(entity, key, value)
        await self.session.commit()
        await self.session.refresh(entity)
        return entity
    
    async def delete(self, id: UUID) -> bool:
        entity = await self.get_by_id(id)
        if not entity:
            return False
        await self.session.delete(entity)
        await self.session.commit()
        return True
```

---

## HTTP Router với Database (BẮT BUỘC)

```python
# backend/modules/{module}/infrastructure/http_router.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from backend.core.database import get_db
from backend.modules.{module}.domain.models import {EntityName}Model
from backend.modules.{module}.domain.entities import {EntityName}, {EntityName}Base

router = APIRouter(tags=["{Module} Management"])

# Default tenant for development
DEFAULT_TENANT_ID = UUID("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")


@router.get("/items", response_model=List[{EntityName}])
async def list_items(db: AsyncSession = Depends(get_db)):
    """Get all items from PostgreSQL"""
    from sqlalchemy import select
    result = await db.execute(
        select({EntityName}Model)
        .where({EntityName}Model.tenant_id == DEFAULT_TENANT_ID)
    )
    items = result.scalars().all()
    return [model_to_entity(i) for i in items]
```

---

## RLS Template (MANDATORY)

```sql
-- ============================================
-- Table: {table_name}
-- ============================================

CREATE TABLE {table_name} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    -- other columns
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 1: Enable RLS
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- Step 2: Create Policy
CREATE POLICY tenant_isolation ON {table_name}
    USING (tenant_id = current_setting('app.current_tenant')::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);

-- Step 3: Index on tenant_id (CRITICAL for performance)
CREATE INDEX idx_{table_name}_tenant ON {table_name}(tenant_id);

-- Step 4: Updated_at trigger
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON {table_name}
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## Common Patterns

### JSONB for Flexible Attributes
```sql
CREATE TABLE items (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    specs JSONB DEFAULT '{}',  -- Flexible specs
    UNIQUE(tenant_id, sku)
);

-- GIN Index for JSONB queries
CREATE INDEX idx_items_specs ON items USING GIN (specs);

-- Query example
SELECT * FROM items 
WHERE specs @> '{"voltage": "220V"}';
```

### Hierarchy with ltree
```sql
CREATE EXTENSION IF NOT EXISTS ltree;

CREATE TABLE categories (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    path ltree NOT NULL  -- e.g., 'Electrical.Cables.LV'
);

CREATE INDEX idx_categories_path ON categories USING GIST (path);
```

---

## Migration Best Practices

### Up Migration
```sql
-- migrations/XXX_{module}_tables.sql
BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE {table_name} (...);
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON {table_name} ...;
CREATE INDEX idx_{table_name}_tenant ON {table_name}(tenant_id);

COMMIT;
```

---

## Exception Tables (No RLS)

| Table | Reason |
| :--- | :--- |
| `tenants` | Parent table for tenant_id |
| `system_config` | Global configuration |
| `migrations` | Schema versioning |

---

## Checklist MỖI Module (BẮT BUỘC)

- [ ] Migration SQL file created (`backend/migrations/XXX_{module}.sql`)
- [ ] All tables have `tenant_id`
- [ ] RLS enabled and policy created
- [ ] Index on `tenant_id`
- [ ] SQLAlchemy Model created (`domain/models.py`)
- [ ] Repository created (`infrastructure/postgres_repo.py`)
- [ ] HTTP Router uses `Depends(get_db)` 
- [ ] Model ↔ Entity converter functions
- [ ] Seed data script (if needed)
