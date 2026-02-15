---
description: 
---

---
description: Tạo một tính năng mới với full workflow từ Database → Backend → Frontend → Test → Documentation
---

# /create-feature Workflow

> **Trigger**: Khi người dùng muốn tạo một tính năng mới trong module đã có.
> **Output**: Code hoàn chỉnh + Test passed + User Guide

// turbo-all

---

## 🔄 CHECKPOINT & RECOVERY SYSTEM

### Workflow State Tracking
```yaml
workflow_id: feature_{timestamp}
feature_name: {feature_name}
current_step: 1
checkpoints:
  - step: 1
    name: analysis_complete
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
    name: browser_test_passed
    status: pending
  - step: 6
    name: permission_defined
    status: pending
  - step: 7
    name: documentation_complete
    status: pending
  - step: 8
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

---

## Step 1: Reception & Analysis (Tiếp nhận & Phân tích)

### 📍 CHECKPOINT: `analysis_complete`

### 1.1 Đọc yêu cầu người dùng
- Xác định **module** chứa tính năng (Sales, Inventory, Projects, etc.)
- Xác định **loại tính năng** (CRUD, Report, Workflow, etc.)

### 1.2 Thực hiện 5-Dimensional Assessment
Tạo bảng đánh giá:

| Dimension | Related? | Level | Reason |
| :--- | :---: | :---: | :--- |
| **UX** | ? | ? | ... |
| **UI** | ? | ? | ... |
| **FE** | ? | ? | ... |
| **BE** | ? | ? | ... |
| **DA** | ? | ? | ... |

### 1.3 Đọc Domain Agent
```
Mở file: .agent/prompts/modules/{module_name}.md
```

### ✅ Checkpoint Validation
```
□ Module identified
□ Feature type determined
□ 5-Dim assessment completed
□ Domain agent loaded
→ Save checkpoint: analysis_complete
```

---

## Step 2: Database Schema (Cơ sở dữ liệu)

### 📍 CHECKPOINT: `database_complete`
// turbo-validate
> ✅ **AUTO-VALIDATION**: Schema Validator runs automatically.
> ⚠️ Human review only if critical validation fails.
> Reference: `.agent/prompts/validators/schema-validator.md`

### 2.1 Tạo Migration File
```
Vị trí: migrations/{timestamp}_{feature_name}.up.sql
Template: .agent/templates/sql_migration_template.md
```

### 2.2 Checklist bắt buộc
- [ ] Có cột `tenant_id UUID NOT NULL`
- [ ] Có `REFERENCES tenants(id)`
- [ ] Có `ENABLE ROW LEVEL SECURITY`
- [ ] Có `CREATE POLICY tenant_isolation`
- [ ] Có `CREATE INDEX idx_{table}_tenant`

### 2.3 Chạy migration
```bash
# Áp dụng migration
psql -U postgres -d erp_dev -f migrations/{timestamp}_{feature_name}.up.sql
```

### ✅ Checkpoint Validation
```
□ Migration file created
□ RLS policy included
□ Migration applied successfully
□ Tables verified in database
→ Save checkpoint: database_complete
```

### 🔙 Recovery from this step
```
Nếu cần rollback:
psql -U postgres -d erp_dev -f migrations/{timestamp}_{feature_name}.down.sql
```

---

## Step 3: Backend API (Python/FastAPI)

### 📍 CHECKPOINT: `backend_complete`

### ⚡ PARALLEL EXECUTION HINT
```
// parallel-start: backend_interface
Sau khi tạo xong domain/entities.py và domain/repository.py (Interface),
Frontend có thể bắt đầu Step 4 song song với phần còn lại của Step 3.

Timeline tối ưu:
├─ Step 3.1-3.2 (Interface) ──────┐
│                                 ├─→ Step 4 (Frontend) bắt đầu
└─ Step 3.3-3.4 (Implementation) ─┘
// parallel-end
```

### 3.1 Tạo cấu trúc module
```
Template: .agent/templates/python_module_skeleton.md
Vị trí: backend/modules/{module_name}/
```

### 3.2 Tạo các file
1. `domain/entities.py` - Pydantic domain entities
2. `domain/repository.py` - Repository interface (ABC)
3. `domain/service.py` - Business logic
4. `application/dto.py` - Request/Response Pydantic schemas
5. `application/usecase.py` - Use cases
6. `infrastructure/models.py` - SQLAlchemy ORM models
7. `infrastructure/postgres_repo.py` - DB implementation
8. `infrastructure/http_router.py` - FastAPI router

### 3.3 Đăng ký routes
```python
# main.py
from modules.{module_name}.infrastructure.http_router import router as {feature}_router

app.include_router({feature}_router, prefix="/api")
```

### 3.4 Chạy tests
```bash
pytest backend/tests/ -v
```

### ✅ Checkpoint Validation
```
□ All Python files created
□ pytest tests pass
□ API endpoints responding (check /docs)
□ RLS context dependency active
→ Save checkpoint: backend_complete
```

### 🔙 Recovery from this step
```
Nếu backend fails:
1. Check pytest output
2. Review FastAPI error logs
3. /retry 3  # Retry this step
```

---

## Step 4: Frontend UI (Angular)

### 📍 CHECKPOINT: `frontend_complete`

### 4.1 Tạo components
```
Template: .agent/templates/angular_component_skeleton.md
Vị trí: frontend/src/app/{module}/{feature}/
```

### 4.2 Tạo các file
1. `{feature}.component.ts` - Main standalone component
2. `{feature}.component.html` - Template
3. `{feature}.component.scss` - Styles  
4. `{feature}.service.ts` - Data service
5. `{feature}.model.ts` - TypeScript interfaces
6. `components/{Feature}Grid.component.ts` - AG Grid wrapper
7. `components/{Feature}Form.component.ts` - Create/Edit form

### 4.3 Thêm translations
```
Vị trí: frontend/src/assets/i18n/vi.json
        frontend/src/assets/i18n/en.json
```

### 4.4 Thêm routes
```typescript
// app.routes.ts
{
  path: '{feature}',
  loadComponent: () => import('./{module}/{feature}/{feature}.component')
    .then(m => m.{Feature}Component)
}
```

### ✅ Checkpoint Validation
```
□ Angular components created (standalone)
□ TypeScript compiles without errors (ng build)
□ Translations added (VN + EN)
□ Route added to app.routes.ts
→ Save checkpoint: frontend_complete
```

### 🔙 Recovery from this step
```
Nếu frontend fails:
1. ng lint --fix
2. Check TypeScript errors
3. /retry 4  # Retry this step
```

---

## Step 5: Browser Auto-Test (Kiểm tra tự động)

### 📍 CHECKPOINT: `browser_test_passed`

### ⚡ PARALLEL EXECUTION HINT
```
// parallel-start: doc_and_permission
Trong khi Browser Test đang chạy (Step 5),
có thể bắt đầu chuẩn bị Permission Matrix (Step 6) và Documentation outline (Step 7).

Timeline tối ưu:
├─ Step 5 (Browser Test) ─────────┐
├─ Step 6 (Permission Draft) ────┼─→ Merge khi test pass
└─ Step 7 (Doc Outline) ─────────┘
// parallel-end
```

### 5.1 Khởi động dev servers
```bash
# Terminal 1: Backend (FastAPI)
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2: Frontend (Angular)
cd frontend && ng serve --port 4200
```

### 5.2 Mở browser và kiểm tra
- [ ] Trang load không lỗi
- [ ] Không có console errors
- [ ] Không có network errors
- [ ] UI hiển thị đúng (Light Mode, Angular Gradients)
- [ ] **Icons**: Sử dụng Material Icons **Filled**
- [ ] CRUD hoạt động

### 5.3 Test i18n
- [ ] Chuyển ngôn ngữ VN → EN
- [ ] Tất cả labels dịch đúng
- [ ] Format ngày tháng đúng (VN: dd/MM/yyyy, EN: MM/dd/yyyy)

### 5.4 Chụp screenshots
```
Lưu tại: .doc/{feature_name}/
```

### ✅ Checkpoint Validation
```
□ All browser tests pass
□ No console/network errors
□ i18n verified
□ Screenshots captured
→ Save checkpoint: browser_test_passed
```

### 🔙 Recovery from this step
```
Nếu browser test fails:
1. Check console errors → Fix frontend
2. Check network errors → Fix backend API
3. /rollback 4  # Go back to frontend step
   hoặc
   /rollback 3  # Go back to backend step
```

---

## Step 6: Permission Matrix (Phân quyền)

### 📍 CHECKPOINT: `permission_defined`

### 6.1 Định nghĩa phân quyền
Tham khảo: `.agent/permission-matrix.md`

### 6.2 Checklist
- [ ] Module Access defined (role nào được thấy?)
- [ ] RBAC Actions defined (role nào làm gì?)
- [ ] ReBAC Relations defined (owner/member/viewer?)
- [ ] Frontend enforces permissions (ẩn button không có quyền)
- [ ] Backend returns 403 for unauthorized

### 6.3 Thêm vào permission-matrix.md
```markdown
### {Feature Name} Permissions

#### Module Access
| Role | Can Access |
| :--- | :---: |
| admin | ✅ |
| ...   | ... |

#### Action Permissions
| Action | admin | manager | staff |
| :--- | :---: | :---: | :---: |
| View | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ❌ |
| ...
```

### ✅ Checkpoint Validation
```
□ Permission matrix added to file
□ Frontend permission checks implemented
□ Backend 403 responses verified
→ Save checkpoint: permission_defined
```

---

## Step 7: User Documentation (Tài liệu hướng dẫn)

### 📍 CHECKPOINT: `documentation_complete`

### 7.1 Tạo file hướng dẫn
```
Template: .agent/templates/user_guide_template.md
Vị trí: .doc/{feature_name}.md
```

### 7.2 Nội dung bắt buộc
1. **Mục đích** - Tính năng này làm gì?
2. **Điều kiện** - Cần quyền gì?
3. **Các bước thực hiện** - Hướng dẫn từng bước với screenshots
4. **Kết quả mong đợi** - Screenshot kết quả
5. **Xử lý lỗi** - Các lỗi thường gặp

### 7.3 Thêm screenshots
```
Vị trí: .doc/{feature_name}/
        ├── step1.png
        ├── step2.png
        └── result.png
```

### ✅ Checkpoint Validation
```
□ User guide created in Vietnamese
□ Screenshots embedded
□ Error handling section included
→ Save checkpoint: documentation_complete
```

---

## Step 8: Final Verification (Kiểm tra cuối)

### 📍 CHECKPOINT: `final_verification`
// turbo-pause
> ⚠️ **HUMAN APPROVAL REQUIRED**: Final review before marking complete.

### 8.1 Definition of Done Checklist
- [ ] Database migration applied
- [ ] Backend tests passed
- [ ] Frontend renders correctly
- [ ] i18n works (VN/EN)
- [ ] Permission matrix defined
- [ ] User guide created with screenshots
- [ ] Code reviewed for RLS compliance

### 8.2 Workflow State Summary
```yaml
workflow_id: feature_{timestamp}
feature_name: {feature_name}
status: COMPLETED
checkpoints:
  - analysis_complete: ✅
  - database_complete: ✅
  - backend_complete: ✅
  - frontend_complete: ✅
  - browser_test_passed: ✅
  - permission_defined: ✅
  - documentation_complete: ✅
  - final_verification: ✅
completed_at: {timestamp}
```

### 8.3 Mark as COMPLETED
```
Feature "{feature_name}" is now COMPLETE and ready for merge.
```

---

## 🔄 Recovery Scenarios

### Scenario 1: Backend Test Fails
```
Current checkpoint: backend_complete (FAILED)
Recovery path:
1. /status  # Check what failed
2. Fix the Go code
3. /retry 3  # Retry backend step
4. Continue from Step 4
```

### Scenario 2: Browser Test Fails - Frontend Issue
```
Current checkpoint: browser_test_passed (FAILED)
Recovery path:
1. Check console errors
2. /rollback 4  # Go back to frontend
3. Fix React components
4. /resume  # Continue from Step 5
```

### Scenario 3: Browser Test Fails - Backend Issue
```
Current checkpoint: browser_test_passed (FAILED)
Recovery path:
1. Check network errors (4xx, 5xx)
2. /rollback 3  # Go back to backend
3. Fix API handlers
4. /resume  # Continue from Step 5
```

### Scenario 4: Need to Restart Completely
```
Recovery path:
1. /rollback 2  # Rollback database if needed
2. psql -f migrations/{xxx}.down.sql
3. Start fresh with /create-feature
```

---

## Quick Reference

| Step | Agent | Checkpoint | Recovery |
| :---: | :--- | :--- | :--- |
| 1 | Orchestrator | `analysis_complete` | N/A |
| 2 | Database Specialist | `database_complete` | `/rollback 2` |
| 3 | Backend Specialist | `backend_complete` | `/retry 3` |
| 4 | Frontend Specialist | `frontend_complete` | `/retry 4` |
| 5 | Browser Auto-Test | `browser_test_passed` | `/rollback 3` or `/rollback 4` |
| 6 | Security Specialist | `permission_defined` | `/retry 6` |
| 7 | QA Specialist | `documentation_complete` | `/retry 7` |
| 8 | Orchestrator | `final_verification` | N/A |

---

## Turbo Annotations Reference

| Annotation | Meaning |
| :--- | :--- |
| `// turbo-all` | Auto-run all safe commands |
| `// turbo-pause` | Stop and wait for human approval |
| `// turbo` | Auto-run only this specific step |
