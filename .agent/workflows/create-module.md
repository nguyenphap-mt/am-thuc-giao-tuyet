---
description: Tạo một module mới hoàn chỉnh từ đầu với tất cả components
---

---
description: Tạo một module mới hoàn chỉnh từ đầu với tất cả components
---

# /create-module Workflow

> **Trigger**: Khi người dùng muốn tạo một module hoàn toàn mới.
> **Output**: Full module với DB tables, APIs, UI, Tests, Docs, Permissions

// turbo-all

---

## 🔄 CHECKPOINT & RECOVERY SYSTEM

### Workflow State Tracking
```yaml
workflow_id: module_{timestamp}
module_name: {module_name}
current_step: 1
checkpoints:
  - step: 1
    name: planning_complete
    status: pending
  - step: 2
    name: database_complete
    status: pending
  - step: 3
    name: backend_complete
    status: pending
  - step: 4
    name: frontend_complete
    status: pending
  - step: 5
    name: permission_defined
    status: pending
  - step: 6
    name: integration_tests_passed
    status: pending
  - step: 7
    name: browser_test_passed
    status: pending
  - step: 8
    name: documentation_complete
    status: pending
  - step: 9
    name: final_verification
    status: pending
```

### Recovery Commands
| Command | Action |
| :--- | :--- |
| `/resume` | Tiếp tục từ checkpoint cuối cùng |
| `/retry {step}` | Thử lại step cụ thể |
| `/rollback {step}` | Quay lại step trước |
| `/status` | Xem trạng thái workflow hiện tại |
| `/abort` | Hủy workflow và rollback tất cả |

---

## Step 1: Module Planning (Lập kế hoạch)

### 📍 CHECKPOINT: `planning_complete`
// turbo-pause
> ⚠️ **HUMAN APPROVAL REQUIRED**: Review module scope before proceeding.

### 1.1 Xác định scope
- **Module Name**: {module_name}
- **Core Entities**: List các entity chính
- **Key Features**: List các features
- **Dependencies**: Module nào liên quan?

### 1.2 Tạo Domain Agent Prompt
```
Vị trí: .agent/prompts/modules/{module_name}.md
        .agent/prompts/modules/{module_name}-ui.md
```

### 1.3 Xác định API Endpoints
```
Thêm vào: .agent/api-contracts.md
```

### ✅ Checkpoint Validation
```
□ Module name and scope defined
□ Core entities identified  
□ Domain agent prompts created
□ API contracts documented
→ Save checkpoint: planning_complete
```

---

## Step 2: Database Schema (Cơ sở dữ liệu)

### 📍 CHECKPOINT: `database_complete`
// turbo-pause
> ⚠️ **HUMAN APPROVAL REQUIRED**: Review database schema before creating tables.

### 2.1 Thiết kế tables
Tham khảo: `.agent/database-schema.md`

### 2.2 Tạo Migration Files
```
migrations/
├── {timestamp}_create_{module}_tables.up.sql
└── {timestamp}_create_{module}_tables.down.sql
```

### 2.3 Checklist cho MỖI table
- [ ] `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- [ ] `tenant_id UUID NOT NULL REFERENCES tenants(id)`
- [ ] `created_at TIMESTAMP DEFAULT NOW()`
- [ ] `updated_at TIMESTAMP DEFAULT NOW()`
- [ ] `ENABLE ROW LEVEL SECURITY`
- [ ] `CREATE POLICY tenant_isolation`
- [ ] `CREATE INDEX idx_{table}_tenant ON {table}(tenant_id)`

### 2.4 Apply migrations
```bash
psql -U postgres -d erp_dev -f migrations/{timestamp}_create_{module}_tables.up.sql
```

### ✅ Checkpoint Validation
```
□ All tables created with RLS
□ Indexes created
□ Rollback script ready (.down.sql)
□ Schema added to database-schema.md
→ Save checkpoint: database_complete
```

### 🔙 Recovery from this step
```
psql -U postgres -d erp_dev -f migrations/{timestamp}_create_{module}_tables.down.sql
```

---

## Step 3: Backend Module Structure (Python/FastAPI)

### 📍 CHECKPOINT: `backend_complete`

### 3.1 Tạo folder structure
```
backend/modules/{module_name}/
├── domain/
│   ├── entities.py        # Pydantic entities
│   ├── repository.py      # Repository interfaces (ABC)
│   ├── service.py         # Domain services
│   └── errors.py          # Module-specific errors
├── application/
│   ├── dto.py             # Request/Response Pydantic schemas
│   ├── usecase.py         # Use cases
│   └── mapper.py          # Entity <-> DTO mapping
├── infrastructure/
│   ├── models.py          # SQLAlchemy ORM models
│   ├── postgres_repo.py   # Repository implementations
│   └── http_router.py     # FastAPI router
└── __init__.py            # Module registration
```

### 3.2 Implement từng layer
1. **Domain Layer** (entities.py, repository.py)
2. **Application Layer** (usecase.py, dto.py)
3. **Infrastructure Layer** (postgres_repo.py, http_router.py)

### 3.3 Register module
```python
# main.py
from modules.{module_name}.infrastructure.http_router import router as {module}_router

app.include_router({module}_router, prefix="/api/{module}")
```

### 3.4 Write unit tests
```
backend/tests/{module_name}/
├── test_service.py
├── test_usecase.py
└── test_repository.py
```

### 3.5 Run tests
```bash
pytest backend/tests/{module_name}/ -v --cov=modules.{module_name}
```

### ✅ Checkpoint Validation
```
□ All Python files created
□ Unit tests written and pass
□ Module registered in main.py
□ API endpoints responding (check /docs)
→ Save checkpoint: backend_complete
```

### 🔙 Recovery from this step
```
1. Check pytest output for failures
2. Review error logs
3. /retry 3
```

---

## Step 4: Frontend Module (Angular)

### 📍 CHECKPOINT: `frontend_complete`

### 4.1 Tạo folder structure
```
frontend/src/app/{module_name}/
├── {module}.component.ts       # Module home/list (standalone)
├── {module}.component.html
├── {module}.component.scss
├── {module}.service.ts         # Data service
├── {module}.model.ts           # TypeScript interfaces
├── [id]/
│   └── {module}-detail.component.ts
├── create/
│   └── {module}-create.component.ts
└── components/
    ├── {module}-list/            # AG Grid list
    ├── {module}-form/            # Create/Edit form
    └── {module}-card/            # Card component
```

### 4.2 Thêm API service
```typescript
// src/app/{module}/{module}.service.ts
@Injectable({ providedIn: 'root' })
export class {Module}Service {
  private http = inject(HttpClient);
  private apiUrl = '/api/{module}';
  
  private {module}sSubject = new BehaviorSubject<{Module}[]>([]);
  {module}s$ = this.{module}sSubject.asObservable();
  
  load(): void {
    this.http.get<{Module}[]>(this.apiUrl)
      .subscribe(data => this.{module}sSubject.next(data));
  }
}
```

### 4.3 Thêm translations
```
frontend/src/assets/i18n/
├── vi.json  (add {module} section)
└── en.json  (add {module} section)
```

### 4.4 Thêm routes
```typescript
// src/app/app.routes.ts
{
  path: '{module}',
  loadComponent: () => import('./{module}/{module}.component')
    .then(m => m.{Module}Component),
  canActivate: [authGuard]
}
```

### 4.5 Run frontend
```bash
cd frontend && ng serve
```

### 4.6 Orphaned Component Check (BẮT BUỘC)

> [!CAUTION]
> **SAU KHI tạo component mới, PHẢI verify nó được import ở parent component.**
> **Lesson Learned (2026-02-26)**: `SalaryAdvanceSection`, `AssignmentBatchModal`, `AssignmentGroupedView` 
> đã được code hoàn chỉnh nhưng KHÔNG import vào parent → chức năng "biến mất" khỏi UI.

```powershell
# // turbo - Scan for orphaned components
# Cho MỖI file .tsx/.ts mới tạo, verify nó được import ở nơi khác:
Get-ChildItem -Path "frontend/src" -Recurse -Include "*.tsx","*.ts" |
  Where-Object { $_.LastWriteTime -gt (Get-Date).AddHours(-2) } |
  ForEach-Object {
    $name = $_.BaseName
    $importCount = (Select-String -Path "frontend/src" -Pattern $name -Recurse -Include "*.tsx","*.ts" | 
      Where-Object { $_.Path -ne $_.Path }).Count
    if ($importCount -eq 0) {
      Write-Warning "⚠️ ORPHANED: $name — không được import ở đâu!"
    }
  }
```

**Orphaned Component Checklist**:
| New Component | Imported In | Rendered? | Status |
| :--- | :--- | :---: | :---: |
| `{ComponentA}.tsx` | `{ParentA}.tsx` | ✅ | ⬜ |
| `{ComponentB}.tsx` | `{ParentB}.tsx` | ✅ | ⬜ |

**Nếu có component orphaned → PHẢI fix TRƯỚC KHI tiếp tục.**

### ✅ Checkpoint Validation
```
□ All components created (standalone)
□ TypeScript compiles (build passes)
□ Translations added (VN + EN)
□ Routes added
□ ⭐ NO orphaned components (all new files imported in parent)
→ Save checkpoint: frontend_complete
```

### 🔙 Recovery from this step
```
1. ng lint --fix
2. Check TypeScript errors
3. /retry 4
```

---

## Step 5: Permission Matrix (Phân quyền)

### 📍 CHECKPOINT: `permission_defined`
// turbo-pause
> ⚠️ **HUMAN APPROVAL REQUIRED**: Review permission rules before implementation.

### 5.1 Thêm Module Access
Cập nhật `.agent/permission-matrix.md`:

```markdown
### {Module Name} Module

#### Module Access
| Role | Can Access |
| :--- | :---: |
| super_admin | ✅ |
| admin | ✅ |
| manager | ✅ |
| {role} | ✅/❌ |
...

#### Action Permissions
| Action | admin | manager | staff |
| :--- | :---: | :---: | :---: |
| View All | ✅ | ✅ | ❌ |
| View Own | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ |
| Edit | ✅ | ✅ | ❌ |
| Delete | ✅ | ❌ | ❌ |
```

### 5.2 Implement trong code
**Backend Middleware (FastAPI)**:
```python
@router.get("", dependencies=[Depends(require_permission("{module}", "view"))])
async def list_items(): ...

@router.delete("/{id}", dependencies=[Depends(require_permission("{module}", "delete"))])
async def delete_item(id: UUID): ...
```

**Frontend Check (Angular)**:
```typescript
<button *appHasPermission="['{module}', 'delete']">Delete</button>
```

### ✅ Checkpoint Validation
```
□ Permission matrix added to file
□ Backend middleware implemented
□ Frontend permission checks added
□ Domain agent updated with permissions
→ Save checkpoint: permission_defined
```

---

## Step 6: Integration Tests

### 📍 CHECKPOINT: `integration_tests_passed`

### 6.1 Backend Integration Tests
```python
# backend/tests/{module_name}/test_integration.py
import pytest

@pytest.mark.asyncio
async def test_module_crud(client, db_session):
    # Setup test database with RLS
    # Test Create, Read, Update, Delete
    # Verify RLS isolation
    pass
```

### 6.2 RLS Security Tests
```python
@pytest.mark.asyncio
async def test_module_rls(client, tenant_a, tenant_b):
    # Create data for Tenant A
    # Switch to Tenant B context
    # Verify Tenant B cannot see Tenant A data
    pass
```

### 6.3 Run all tests
```bash
pytest backend/tests/{module_name}/ -v --cov
```

### ✅ Checkpoint Validation
```
□ CRUD integration tests pass
□ RLS isolation tests pass
□ API response validation pass
→ Save checkpoint: integration_tests_passed
```

### 🔙 Recovery from this step
```
1. Check test failures
2. Fix code in Step 3 (backend)
3. /retry 6
```

---

## Step 7: Browser Testing

### 📍 CHECKPOINT: `browser_test_passed`

### 7.1 Start servers
```bash
# Terminal 1: Backend (FastAPI)
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2: Frontend (Angular)
cd frontend && ng serve --port 4200
```

### 7.2 Manual verification
- [ ] Navigate to /{module}
- [ ] List view renders
- [ ] Create new item
- [ ] Edit item
- [ ] Delete item
- [ ] Search/Filter works
- [ ] Pagination works

### 7.3 i18n verification
- [ ] Switch VN → EN
- [ ] All labels translated
- [ ] Date formats correct

### 7.4 Capture screenshots
```
.doc/{module_name}/
├── list_view.png
├── create_form.png
├── detail_view.png
└── delete_confirm.png
```

### ✅ Checkpoint Validation
```
□ All UI functions work
□ No console/network errors
□ i18n verified (VN/EN)
□ Screenshots captured
→ Save checkpoint: browser_test_passed
```

### 🔙 Recovery from this step
```
1. Console errors → /rollback 4 (frontend)
2. Network errors → /rollback 3 (backend)
3. /retry 7
```

---

## Step 8: Documentation

### 📍 CHECKPOINT: `documentation_complete`

### 8.1 Tạo User Guide
```
Vị trí: .doc/{module_name}.md
Template: .agent/templates/user_guide_template.md
```

### 8.2 Thêm vào Domain Agent
Cập nhật `.agent/prompts/modules/{module_name}.md` với Permission Matrix section.

### 8.3 API Documentation
Cập nhật `.agent/api-contracts.md` với endpoints mới.

### ✅ Checkpoint Validation
```
□ User guide created (Vietnamese)
□ Screenshots embedded
□ Domain agent updated
□ API docs updated
→ Save checkpoint: documentation_complete
```

---

## Step 9: Final Checklist

### 📍 CHECKPOINT: `final_verification`
// turbo-pause
> ⚠️ **HUMAN APPROVAL REQUIRED**: Final review before marking module complete.

### 9.1 Code Quality
- [ ] All tests pass
- [ ] No linting errors
- [ ] Code reviewed

### 9.2 Database
- [ ] Migrations applied
- [ ] RLS policies active
- [ ] Indexes created

### 9.3 Backend
- [ ] APIs working
- [ ] Error handling complete
- [ ] Input validation

### 9.4 Frontend
- [ ] UI renders correctly
- [ ] i18n complete (VN/EN)
- [ ] Responsive design
- [ ] ⭐ No orphaned components (all new .tsx imported in parent)

### 9.5 Security
- [ ] Permission matrix defined
- [ ] RLS tested
- [ ] 403 for unauthorized

### 9.6 Documentation
- [ ] User guide created
- [ ] Screenshots included
- [ ] API docs updated

### Workflow State Summary
```yaml
workflow_id: module_{timestamp}
module_name: {module_name}
status: COMPLETED
checkpoints:
  - planning_complete: ✅
  - database_complete: ✅
  - backend_complete: ✅
  - frontend_complete: ✅
  - permission_defined: ✅
  - integration_tests_passed: ✅
  - browser_test_passed: ✅
  - documentation_complete: ✅
  - final_verification: ✅
completed_at: {timestamp}
```

---

## 🔄 Recovery Scenarios

### Scenario 1: Database Migration Fails
```
Checkpoint: database_complete (FAILED)
Recovery:
1. Check SQL syntax errors
2. Fix migration file
3. /retry 2
```

### Scenario 2: Backend Tests Fail
```
Checkpoint: backend_complete (FAILED)
Recovery:
1. Check test outp