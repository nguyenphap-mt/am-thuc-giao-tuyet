# Specialist Agents Index

> **Token Optimization**: Load individual specialist files instead of this master file.
> Each specialist is now a separate file for efficient context loading.

---

## Available Specialists

| Specialist | File | Size | When to Load |
| :--- | :--- | :---: | :--- |
| **Backend** | `specialists/backend.md` | ~3KB | Go/API development |
| **Frontend** | `specialists/frontend.md` | ~3KB | React/Next.js development |
| **Database** | `specialists/database.md` | ~3KB | SQL/PostgreSQL/RLS |
| **QA** | `specialists/qa.md` | ~3KB | Testing/Documentation |
| **Browser Test** | `specialists/browser-test.md` | ~3KB | UI verification |
| **Security** | `specialists/security.md` | ~3KB | Permissions/Authorization |
| **DevOps** | `specialists/devops.md` | ~8KB | Docker/K8s/CI-CD |

---

## Loading Instructions

### For Orchestrator
```
When assigning tasks, load ONLY the relevant specialist:

- Backend task → load `specialists/backend.md`
- Frontend task → load `specialists/frontend.md`
- Database task → load `specialists/database.md`
- QA task → load `specialists/qa.md`
- Browser test → load `specialists/browser-test.md`
- Permission check → load `specialists/security.md`
```

### For Workflow Steps
```
Step 2 (Database) → specialists/database.md
Step 3 (Backend) → specialists/backend.md
Step 4 (Frontend) → specialists/frontend.md
Step 5 (Browser Test) → specialists/browser-test.md
Step 6 (Permission) → specialists/security.md
Step 7 (Documentation) → specialists/qa.md
```

---

## Token Savings

| Scenario | Before (Full Load) | After (Selective) | Savings |
| :--- | :---: | :---: | :---: |
| Backend only | ~9KB | ~3KB | **67%** |
| Frontend only | ~9KB | ~3KB | **67%** |
| DB + Backend | ~9KB | ~6KB | **33%** |
| Full workflow | ~9KB | As needed | Variable |

---

## Quick Reference

### Domain Agents (by Module)
See `.agent/prompts/modules/*.md`:
- `inventory.md`, `inventory-ui.md`
- `sales.md`, `sales-ui.md`
- `projects.md`, `projects-ui.md`
- `finance_hr.md`, `finance_hr-ui.md`
- `manufacturing.md`, `manufacturing-ui.md`
- `customer.md`, `customer-ui.md`
- `dashboard.md`, `dashboard-ui.md`
- `settings.md`, `settings-ui.md`
- `auth.md`, `auth-ui.md`

### Cross-Module Features
See `.agent/prompts/router.md` for features spanning multiple modules.

---

## Legacy Support

The original `specialists.md` file is preserved but deprecated.
New workflow steps should reference individual files.
