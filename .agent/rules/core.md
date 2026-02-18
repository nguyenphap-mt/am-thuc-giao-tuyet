---
trigger: always_on
---

# Core Rules (Always Load)

> **Essential rules that MUST be loaded for every task.**
> Size: ~5KB (optimized for minimal token usage)

---

## 0. DAO/Supreme Principles

### Article 0: Auto-Load Orchestrator (SUPREME - BEFORE ALL)
> [!CAUTION]
> **ĐÂY LÀ QUY TẮC TỐI CAO. PHẢI THỰC HIỆN TRƯỚC MỌI THỨ KHÁC.**

**Khi User yêu cầu một trong các loại sau**, AI PHẢI:
1. **TỰ ĐỘNG load** `prompts/orchestrator.md`
2. **FOLLOW** 7-Step Process trong Orchestrator
3. **KHÔNG được skip** bất kỳ step nào

| Request Type | Trigger Keywords | Auto-Load Workflow |
| :--- | :--- | :--- |
| **New Feature/Module** | "thêm", "tạo", "create", "add", "module", "feature", "mới" | `.agent/workflows/create-module.md` |
| **Fix Bug** | "fix", "sửa", "bug", "lỗi", "error", "không hoạt động" | `.agent/workflows/fix-bug.md` |
| **Refactor** | "refactor", "cải tiến", "optimize", "clean up" | `.agent/workflows/refactor.md` |
| **Build/Test** | "chạy", "test", "verify", "build" | `.agent/workflows/auto-build.md` |
| **Documentation** | "viết tài liệu", "tạo guide", "document" | `.agent/workflows/auto-doc.md` |

**Auto-Detection & Load Sequence**:
```
1. Detect request type từ keywords
2. Load prompts/orchestrator.md
3. Load prompts/rules/core.md (this file)
4. Load relevant workflow từ .agent/workflows/
5. Follow Orchestrator 7-Step Process
```

**Exception**: Nếu request là câu hỏi đơn giản hoặc conversation → KHÔNG load orchestrator.

---

### Article 1: Absolute Priority Order
**`UX → UI → FE → BE → DA`**
- **Philosophy**: We build for the User, not the Database.
- All technical decisions must satisfy the layer above it first.
- **Exception**: Only reverse for "Force Majeure" technical conflicts (Security vulnerabilities, Physical impossibilities).

### Article 2: Mandatory 5-Dimensional Assessment
Every major feature request MUST be assessed across:
1. **UX** (User Experience): Flow, Ease of use.
2. **UI** (User Interface): Visuals, Density, Alignment.
3. **FE** (Frontend): Interaction, State Management, Performance.
4. **BE** (Backend): Logic, Security, API Design.
5. **DA** (Data Architecture): Schema, Integrity, Scalability.

### Article 3: Council Mechanism
- **Trigger**: If 2+ dimensions have High/Equal Impact → Stop and Simulate Multi-Agent Discussion.

### Article 4: Permission Matrix Compliance (MANDATORY)
> [!CAUTION]
> **KHÔNG ĐƯỢC bỏ qua bước này. Vi phạm sẽ bị AUTO-REJECT.**

- **TRƯỚC khi code bất kỳ feature/module mới**, PHẢI:
  1. Mở file `.agent/permission-matrix.md`
  2. Thêm module vào **Section 2** (Module Access Matrix)
  3. Định nghĩa Actions trong **Section 3**
  4. Cập nhật `MODULE_ACCESS` config trong Backend/Frontend

- **Reference File**: `.agent/permission-matrix.md`
- **Enforcement**: Step 5 trong Orchestrator workflow sẽ reject nếu không tuân thủ.

### Article 5: Angular.dev Design System Compliance (MANDATORY)
> [!IMPORTANT]
> **TẤT CẢ UI/Frontend components PHẢI tuân thủ Angular.dev Design System.**
> **Light Mode là DEFAULT. Không dùng Dark Mode trừ khi user yêu cầu.**

- **UI Standards**:
  - **Light Mode Default**: `#ffffff` background, `#fafafa` cards
  - **Primary Color**: Angular Gradient (`#c2185b` → `#7b1fa2` → `#512da8`)
  - **Font**: Inter hoặc SF Pro
  - **Animations**: 100-200ms ease-out (skeleton 1.5s)
  - **Loading**: Skeleton loaders (KHÔNG dùng spinners)
  - **Icons**: Material Icons Outlined
  - **Shadows**: Subtle card shadows on cards and tables

- **Required Pattern Cho Component Mới**:
  ```scss
  // CSS Variables (từ design-tokens.scss)
  --bg-primary: #ffffff;
  --bg-secondary: #fafafa;
  --bg-tertiary: #f5f5f5;
  --text-primary: #1a1a2e;
  --text-secondary: #64748b;
  --accent-primary: #c2185b;
  --gradient-primary: linear-gradient(90deg, #c2185b 0%, #7b1fa2 50%, #512da8 100%);
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  ```

- **Reference File**: `prompts/angular-dev-design-system.md`
- **Design Tokens**: `frontend/src/styles/design-tokens.scss`
- **Enforcement**: Browser Test sẽ reject nếu:
  - Background là Dark Mode colors (`#0A0A0A`, `#141414`)
  - Không có focus ring trên inputs
  - Buttons không dùng gradient-primary


### Article 6: PostgreSQL Database Compliance (MANDATORY)
> [!CAUTION]
> **TẤT CẢ modules PHẢI sử dụng PostgreSQL thực, KHÔNG dùng mock data.**

- **TRƯỚC khi code bất kỳ module mới**, PHẢI:
  1. Tạo Migration SQL file (`backend/migrations/XXX_{module}.sql`)
  2. Chạy migration vào PostgreSQL (`catering_db`)
  3. Tạo SQLAlchemy ORM Model (`domain/models.py`)
  4. HTTP Router sử dụng `Depends(get_db)` từ `backend/core/database.py`

- **Connection String**: `postgresql://postgres:postgres@localhost:5432/catering_db`
- **Reference File**: `prompts/specialists/database.md`
- **Enforcement**: API phải trả data từ PostgreSQL (verify với /stats endpoint).

### Article 7: Auto-Build & Auto-Run Compliance (MANDATORY)
> [!IMPORTANT]
> **AI Workforce PHẢI tự động khởi động services trước khi test/verify.**
> Không cần user nhắc - tự động kích hoạt khi cần.

- **Khi nào Auto-Start kích hoạt**:
  - Trước Browser Test (Step 4 trong Orchestrator)
  - Trước Integration Test
  - Khi User yêu cầu "chạy", "test", "verify", "build"

- **Commands (// turbo - auto-run safe)**:
  | Service | Start Command | Health Check |
  | :--- | :--- | :--- |
  | **Backend** | `cd backend && python -m uvicorn main:app --reload --port 8000` | Port 8000 |
  | **Frontend** | `cd frontend && ng serve --port 4500` | Port 4500 |

- **Health Check Endpoints**:
  - Backend: `http://localhost:8000/health` → `{"status": "healthy"}`
  - Frontend: `http://localhost:4500` → HTTP 200 OK

- **Quick Start Script**:
  ```powershell
  .\.agent\scripts\dev-start.ps1
  ```

- **Reference Workflow**: `.agent/workflows/auto-build.md`
- **Enforcement**: Browser Test sẽ fail nếu services không running.

### Article 8: Auto-Documentation Compliance (MANDATORY)
> [!IMPORTANT]
> **AI Workforce PHẢI tự động tạo tài liệu SAU KHI test/verify thành công.**
> Không cần user nhắc - tự động kích hoạt sau Browser Test PASS.

- **Trigger Conditions**:
  - Sau Browser Test PASS
  - Khi User yêu cầu "viết tài liệu", "tạo guide", "document"
  - Sau khi hoàn thành feature/module mới

- **Output Requirements**:
  | Requirement | Mô tả |
  | :--- | :--- |
  | **File Path** | `.doc/{module-name}-guide.md` |
  | **Language** | Vietnamese (Tiếng Việt) |
  | **Screenshots** | Tối thiểu 2 hình ảnh |
  | **Sections** | Giới thiệu, Hướng dẫn, FAQ |

- **Screenshot Storage**:
  ```
  .doc/screenshots/{module-name}/
  ├── main.png
  ├── feature1.png
  └── feature2.png
  ```

- **Reference Template**: `.agent/templates/user_guide_template.md`
- **Reference Workflow**: `.agent/workflows/auto-doc.md`
- **Enforcement**: DoD Check sẽ reject nếu không có documentation.

### Article 9: PRD Compliance Enforcement (MANDATORY)
> [!CAUTION]
> **TRƯỚC khi code feature/module, PHẢI đọc PRD liên quan.**
> **Vi phạm PRD = vi phạm kiến trúc hệ thống.**

- **TRƯỚC khi code bất kỳ feature liên quan module**, PHẢI:
  1. Scan folder `.agent/prds/` tìm PRD liên quan đến module đang code
  2. Đọc và tuân thủ **dependency map**, **integration patterns**, và **business rules**
  3. KHÔNG được tạo integration trái chiều với PRD (vd: import trực tiếp ORM cross-module khi PRD chỉ cho phép raw SQL)
  4. Nếu cần thay đổi kiến trúc khác PRD → báo User trước, cập nhật PRD sau

- **PRD Registry** (scan khi cần):
  | Module | PRD File |
  | :--- | :--- |
  | Inventory cross-module | `.agent/prds/PRD-luong-nghiep-vu-kho-hang-v2.md` |
  | Menu Management | `.agent/prds/PRD-menu-management.md` |
  | Finance/HR Audit | `.agent/prds/finance-hr-prd-audit-20260206.md` |
  | Order Detail | `.agent/prds/order-detail-improvement-prd.md` |
  | Period Management | `.agent/prds/PRD-quan-ly-ky-ke-toan.md` |

- **Cross-Module Integration Source of Truth**: `.agent/config/business-flows.yaml`
- **Enforcement**: Code Review sẽ reject nếu integration pattern không khớp PRD.

---
## 1. Architecture & Tech Stack

| Component | Technology | Version |
| :--- | :--- | :--- |
| **Pattern** | Modular Monolith | - |
| **Backend** | Python (FastAPI) | 3.12+ |
| **Database** | PostgreSQL | 16+ |
| **Frontend** | Angular | 18+ (Standalone) |
| **UI Grid** | AG Grid Angular | Required |
| **ORM** | SQLAlchemy | 2.0+ (Async) |
| **State Mgmt** | Angular Services | RxJS/BehaviorSubject |

---

## 2. Multi-Tenancy (Non-Negotiable)

- **Row-Level Security (RLS)** is the primary defense.
- **EVERY table** (except global configs) MUST have `tenant_id` column.
- App Context MUST set `app.current_tenant` at start of every transaction.
- **NEVER** bypass RLS except for super-admin migrations.

---

## 3. Module Boundaries

| Module | Owns Tables | Exposes |
| :--- | :--- | :--- |
| **Inventory** | items, lots, warehouses | ItemService interface |
| **Sales** | orders, quotes, customers | OrderService interface |
| **Projects** | projects, wbs, tasks | ProjectService interface |
| **Finance** | journals, accounts | JournalService interface |

**Rule**: Modules MUST NOT query each other's tables directly. Use service interfaces.

---

## 4. Communication Standards

- **Language**: Vietnamese (Tiếng Việt) for all explanations and documentation.
- **Code Comments**: English (for international compatibility).
- **i18n**: Default Vietnamese, English as secondary.

### Date/Time Format (Vietnam Standard - BẮT BUỘC)
| Context | Format | Example |
| :--- | :--- | :--- |
| **Display Date** | `dd/MM/yyyy` | 17/01/2026 |
| **Display Time** | `HH:mm` (24h) | 14:30 |
| **Display DateTime** | `dd/MM/yyyy HH:mm` | 17/01/2026 14:30 |
| **API Response** | ISO 8601 | 2026-01-17T14:30:00+07:00 |
| **Database Storage** | `TIMESTAMP WITH TIME ZONE` | UTC |
| **Timezone** | `Asia/Ho_Chi_Minh` (UTC+7) | - |

**Frontend Angular Pipe**:
```typescript
{{ date | date:'dd/MM/yyyy' }}
{{ date | date:'dd/MM/yyyy HH:mm' }}
```

**Backend Python**:
```python
from datetime import datetime
import pytz

VN_TZ = pytz.timezone('Asia/Ho_Chi_Minh')
dt.strftime('%d/%m/%Y %H:%M')
```

---


## 5. Definition of Done (DoD)

Every feature is complete when:
- [ ] 5-Dimensional Assessment documented
- [ ] Unit tests with >70% coverage
- [ ] Integration test for happy path
- [ ] RLS compliance verified
- [ ] Permission Matrix defined
- [ ] User Guide (Vietnamese) created
- [ ] Browser test passed

---

## Quick Reference

### Load Additional Rules (As Needed)
| Need | File |
| :--- | :--- |
| Database/SQL work | `prompts/rules/database.md` |
| Frontend/React work | `prompts/rules/frontend.md` |
| Security/Auth work | `prompts/rules/security.md` |
| Domain logic | `prompts/rules/domain-logic.md` |

### Key Documents
| Document | Path |
| :--- | :--- |
| Permission Matrix | `.agent/permission-matrix.md` |
| API Contracts | `.agent/api-contracts.md` |
| Database Schema | `.agent/database-schema.md` |
| Roadmap | `.agent/ROADMAP.md` |
| **Angular.dev Design System** | `prompts/angular-dev-design-system.md` |
| **Frontend Rules** | `prompts/rules/frontend.md` |
| Design Tokens | `frontend/src/styles/design-tokens.scss` |
| **PRD Registry** | `.agent/prds/` |
| **Business Flows Config** | `.agent/config/business-flows.yaml` |

---

## 6. Frontend Rules Compliance (MANDATORY)

> [!CAUTION]
> **KHÔNG ĐƯỢC vi phạm các quy tắc Frontend. Browser Test sẽ reject.**

### 6.1 Confirmation Dialogs
- **KHÔNG** sử dụng `window.confirm()`, `window.alert()`, hoặc native browser dialogs
- **PHẢI** sử dụng `ConfirmDeleteModalComponent` từ `shared/components/`
- Pattern:
  ```typescript
  // ❌ SAI
  if (confirm('Xác nhận?')) { ... }
  
  // ✅ ĐÚNG
  showConfirmModal = true;  // Show Angular modal
  ```

### 6.2 AG Grid Requirements
- Server-Side Row Model cho >1000 rows
- Row virtualization enabled
- Keyboard navigation required

### 6.3 i18n Requirements
- Default: Vietnamese (vi-VN)
- Date format: `dd/MM/yyyy`
- Currency: `VND` với `đ` symbol

### 6.4 Icons
- **MUST** use Material Icons **Filled** (NOT Ou