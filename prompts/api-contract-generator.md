# API Contract Auto-Generation

> **Purpose**: Automatically generate TypeScript interfaces and API contracts from Go backend structs.
> **Trigger**: After `backend_complete` checkpoint

---

## Generation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Go DTO Files → Parser → TypeScript Interfaces → API Contracts  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Source Files (Go)

| Location | Type | Example |
| :--- | :--- | :--- |
| `internal/modules/{module}/application/dto.go` | Request/Response | `CreateItemRequest` |
| `internal/modules/{module}/domain/entity.go` | Domain Models | `Item` |

---

## Target Files (TypeScript)

| Location | Type | Example |
| :--- | :--- | :--- |
| `frontend/src/types/{module}.ts` | Interfaces | `interface Item {}` |
| `frontend/src/lib/api/{module}.ts` | API Client | `createItem()` |

---

## Generation Rules

### 1. Type Mapping
| Go Type | TypeScript Type |
| :--- | :--- |
| `string` | `string` |
| `int`, `int32`, `int64` | `number` |
| `float32`, `float64` | `number` |
| `bool` | `boolean` |
| `time.Time` | `string` (ISO 8601) |
| `uuid.UUID` | `string` |
| `[]T` | `T[]` |
| `*T` | `T \| null` |
| `map[string]T` | `Record<string, T>` |
| `interface{}` | `unknown` |
| `json.RawMessage` | `unknown` |

### 2. JSON Tag Extraction
```go
// Go
type CreateItemRequest struct {
    SKU          string  `json:"sku" validate:"required"`
    Name         string  `json:"name" validate:"required"`
    CategoryID   *string `json:"category_id,omitempty"`
    BasePrice    float64 `json:"base_price"`
}
```

```typescript
// Generated TypeScript
export interface CreateItemRequest {
  sku: string;          // required
  name: string;         // required
  category_id?: string; // omitempty → optional
  base_price: number;
}
```

### 3. Response Wrapper
```go
// Go common response
type Response[T any] struct {
    Success bool   `json:"success"`
    Data    T      `json:"data,omitempty"`
    Error   string `json:"error,omitempty"`
}
```

```typescript
// Generated wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

---

## Generation Template

### TypeScript Interface Generator
```typescript
// Template: .agent/templates/ts_interface_template.md

// Auto-generated from Go DTOs
// Source: internal/modules/{module}/application/dto.go
// Generated: {timestamp}
// DO NOT EDIT MANUALLY

export interface {StructName} {
{fields}
}
```

### API Client Generator
```typescript
// Template: .agent/templates/ts_api_client_template.md

import { apiClient } from '@/lib/api-client';
import type { {interfaces} } from '@/types/{module}';

const BASE_URL = '/api/{module}';

export const {module}Api = {
  list: async (params?: ListParams) => 
    apiClient.get<ApiResponse<{Entity}[]>>(BASE_URL, { params }),
    
  getById: async (id: string) =>
    apiClient.get<ApiResponse<{Entity}>>(`${BASE_URL}/${id}`),
    
  create: async (data: Create{Entity}Request) =>
    apiClient.post<ApiResponse<{Entity}>>(BASE_URL, data),
    
  update: async (id: string, data: Update{Entity}Request) =>
    apiClient.put<ApiResponse<{Entity}>>(`${BASE_URL}/${id}`, data),
    
  delete: async (id: string) =>
    apiClient.delete<ApiResponse<void>>(`${BASE_URL}/${id}`),
};
```

---

## Integration with Workflow

### Step 3.5: API Contract Generation (NEW)
```yaml
after: backend_complete
before: frontend_start

actions:
  1_scan_dto_files:
    path: internal/modules/{module}/application/dto.go
    parse: go_struct_ast
    
  2_generate_interfaces:
    template: ts_interface_template.md
    output: frontend/src/types/{module}.ts
    
  3_generate_api_client:
    template: ts_api_client_template.md
    output: frontend/src/lib/api/{module}.ts
    
  4_update_barrel:
    file: frontend/src/types/index.ts
    add: export * from './{module}';
```

---

## Usage Example

### Input (Go)
```go
// internal/modules/inventory/application/dto.go
type CreateItemRequest struct {
    SKU         string  `json:"sku" validate:"required"`
    Name        string  `json:"name" validate:"required,min=3"`
    Description *string `json:"description,omitempty"`
    CategoryID  string  `json:"category_id" validate:"required,uuid"`
    BasePrice   float64 `json:"base_price" validate:"gte=0"`
    TenantID    string  `json:"-"` // Ignored (dash)
}

type ItemResponse struct {
    ID          string    `json:"id"`
    SKU         string    `json:"sku"`
    Name        string    `json:"name"`
    Description *string   `json:"description,omitempty"`
    CategoryID  string    `json:"category_id"`
    BasePrice   float64   `json:"base_price"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

### Output (TypeScript)
```typescript
// frontend/src/types/inventory.ts
// Auto-generated - DO NOT EDIT

export interface CreateItemRequest {
  sku: string;
  name: string;
  description?: string;
  category_id: string;
  base_price: number;
}

export interface ItemResponse {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category_id: string;
  base_price: number;
  created_at: string;
  updated_at: string;
}
```

---

## Validation Rules Mapping

| Go Validate Tag | TypeScript Zod Schema |
| :--- | :--- |
| `required` | `.min(1)` or non-optional |
| `min=X` | `.min(X)` |
| `max=X` | `.max(X)` |
| `email` | `.email()` |
| `uuid` | `.uuid()` |
| `gte=X` | `.gte(X)` |
| `lte=X` | `.lte(X)` |
| `oneof=A B` | `.enum(['A', 'B'])` |

---

## Conflict Resolution

| Scenario | Resolution |
| :--- | :--- |
| File already exists | Regenerate with backup |
| Field name conflict | Use Go field name |
| Unknown type | Use `unknown` + warning |
| Circular reference | Use type alias |
