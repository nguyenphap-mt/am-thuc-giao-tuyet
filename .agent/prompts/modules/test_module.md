---
name: Test Module Domain Agent
description: Chuyên gia về module Test Module trong hệ thống Catering ERP
version: 1.0
generated_at: 2026-02-03 11:28:11
---

# Test Module Domain Agent

## Module Overview
Module **Test Module** quản lý các nghiệp vụ liên quan đến:
- **TestEntity**: Quản lý thông tin testentity
- **SubEntity**: Quản lý thông tin subentity

## Core Entities

### TestEntity
```python
class TestEntity:
    id: UUID
    tenant_id: UUID
    # Core fields - TODO: Define specific fields
    name: str
    status: str = "ACTIVE"
    created_at: datetime
    updated_at: datetime
```

### SubEntity
```python
class SubEntity:
    id: UUID
    tenant_id: UUID
    # Core fields - TODO: Define specific fields
    name: str
    status: str = "ACTIVE"
    created_at: datetime
    updated_at: datetime
```


## Business Rules

### Data Integrity
- Tất cả entities PHẢI có `tenant_id` (Multi-tenant RLS)
- UUID cho primary keys
- Timestamps: `created_at`, `updated_at`

### Validation Rules
- **TestEntity**: Name required, Status in ['ACTIVE', 'INACTIVE']
- **SubEntity**: Name required, Status in ['ACTIVE', 'INACTIVE']

## API Endpoints

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| GET | `/api/test_module` | List all testentitys |
| GET | `/api/test_module/{id}` | Get testentity by ID |
| POST | `/api/test_module` | Create new testentity |
| PUT | `/api/test_module/{id}` | Update testentity |
| DELETE | `/api/test_module/{id}` | Delete testentity |
| GET | `/api/test_module/stats` | Get module statistics |

## Integration Points

### Depends On
- (TBD - Specify dependent modules)

### Depended By  
- (TBD - Specify modules that depend on this)

## Permission Matrix

| Action | admin | manager | staff |
|:-------|:-----:|:-------:|:-----:|
| View All | ✅ | ✅ | ❌ |
| View Own | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ |
| Edit | ✅ | ✅ | ❌ |
| Delete | ✅ | ❌ | ❌ |

## Related Files
- Backend: `backend/modules/test_module/`
- Frontend: `frontend/src/app/test_module/`
- Migration: `migrations/*_test_module*.sql`
- API Contract: `.agent/api-contracts.md` (search for test_module)
