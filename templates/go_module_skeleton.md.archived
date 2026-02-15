# Go Module Skeleton (Backend Template)

Sử dụng template này khi tạo một Module mới trong hệ thống ERP.

## Cấu Trúc Thư Mục

```
internal/modules/{module_name}/
├── domain/
│   ├── entity.go          # Domain Entities (structs)
│   ├── repository.go      # Repository Interface
│   └── service.go         # Domain Service (business logic)
├── application/
│   ├── dto.go             # Data Transfer Objects (Request/Response)
│   ├── usecase.go         # Application Use Cases
│   └── mapper.go          # Entity <-> DTO mapping
├── infrastructure/
│   ├── postgres_repo.go   # Repository Implementation
│   └── http_handler.go    # HTTP Handlers (Gin/Chi)
└── module.go              # Module Registration (DI)
```

---

## Code Mẫu

### 1. Entity (`domain/entity.go`)
```go
package domain

import (
    "time"
    "github.com/google/uuid"
)

// {Entity} represents the core domain object.
// RULE: No external dependencies here. Pure Go structs.
type {Entity} struct {
    ID        uuid.UUID  `json:"id"`
    TenantID  uuid.UUID  `json:"tenant_id"` // MANDATORY for RLS
    Name      string     `json:"name"`
    CreatedAt time.Time  `json:"created_at"`
    UpdatedAt time.Time  `json:"updated_at"`
}
```

### 2. Repository Interface (`domain/repository.go`)
```go
package domain

import (
    "context"
    "github.com/google/uuid"
)

// {Entity}Repository defines the contract for data access.
// RULE: Interface lives in CONSUMER package (domain), not infrastructure.
type {Entity}Repository interface {
    GetByID(ctx context.Context, id uuid.UUID) (*{Entity}, error)
    List(ctx context.Context, limit, offset int) ([]*{Entity}, error)
    Create(ctx context.Context, entity *{Entity}) error
    Update(ctx context.Context, entity *{Entity}) error
    Delete(ctx context.Context, id uuid.UUID) error
}
```

### 3. Repository Implementation (`infrastructure/postgres_repo.go`)
```go
package infrastructure

import (
    "context"
    "database/sql"
    "github.com/google/uuid"
    "your_project/internal/modules/{module_name}/domain"
)

type postgres{Entity}Repo struct {
    db *sql.DB
}

func NewPostgres{Entity}Repo(db *sql.DB) domain.{Entity}Repository {
    return &postgres{Entity}Repo{db: db}
}

func (r *postgres{Entity}Repo) GetByID(ctx context.Context, id uuid.UUID) (*domain.{Entity}, error) {
    // IMPORTANT: RLS is active. No need for tenant_id in WHERE clause,
    // but you MUST set the session variable before this query.
    query := `SELECT id, tenant_id, name, created_at, updated_at 
              FROM {table_name} WHERE id = $1`
    
    row := r.db.QueryRowContext(ctx, query, id)
    
    var entity domain.{Entity}
    err := row.Scan(&entity.ID, &entity.TenantID, &entity.Name, &entity.CreatedAt, &entity.UpdatedAt)
    if err != nil {
        return nil, err
    }
    return &entity, nil
}
```

### 4. RLS Session Setup (Middleware)
```go
// CRITICAL: This middleware MUST run before any DB query.
func SetTenantContext(db *sql.DB, tenantID uuid.UUID) error {
    _, err := db.Exec("SET app.current_tenant = $1", tenantID.String())
    return err
}
```

---

## Checklist Khi Tạo Module Mới

- [ ] Tạo `domain/entity.go` với `TenantID`
- [ ] Tạo `domain/repository.go` (Interface)
- [ ] Tạo `infrastructure/postgres_repo.go` (Implementation)
- [ ] Tạo SQL Migration với RLS Policy
- [ ] Đăng ký module trong DI container
