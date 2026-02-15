# Rules Index (Lazy Loading Guide)

> **Purpose**: Load only the rules you need to save tokens.
> Original `rules.md` = ~32KB. Modular approach = Load ~5-8KB per domain.

---

## Available Rules Files

| File | Size | When to Load |
| :--- | :---: | :--- |
| `rules/core.md` | ~3KB | **ALWAYS** - Every task |
| `rules/database.md` | ~5KB | DA dimension, SQL, migrations |
| `rules/frontend.md` | ~4KB | FE/UI dimension, Angular, Components |
| `rules/security.md` | ~5KB | Auth, permissions, audit |
| `rules/domain-logic.md` | ~5KB | Business logic, calculations |

---

## Loading Strategy

### For Orchestrator
```
Step 1 (Analysis):
  → ALWAYS load: rules/core.md
  
Step 2 (Database):
  → Load: rules/core.md + rules/database.md
  
Step 3 (Backend):
  → Load: rules/core.md + rules/security.md
  
Step 4 (Frontend):
  → Load: rules/core.md + rules/frontend.md
  
Step 5-8:
  → Load: rules/core.md only
```

### By 5-Dimension Assessment

| Dimension | Load Rules |
| :--- | :--- |
| **UX** | core.md |
| **UI** | core.md + frontend.md |
| **FE** | core.md + frontend.md |
| **BE** | core.md + security.md + domain-logic.md |
| **DA** | core.md + database.md |

---

## Token Savings Comparison

| Scenario | Full Load | Selective | Savings |
| :--- | :---: | :---: | :---: |
| Database task | 32KB | 8KB | **75%** |
| Frontend task | 32KB | 7KB | **78%** |
| Full feature | 32KB | 22KB | **31%** |
| Quick review | 32KB | 3KB | **91%** |

---

## Quick Reference

### Core Rules Summary
- Priority: `UX → UI → FE → BE → DA`
- Architecture: Modular Monolith
- Stack: Python (FastAPI) + PostgreSQL + Angular
- ORM: SQLAlchemy 2.0 (Async)
- State: Angular Services + RxJS
- Multi-tenancy: RLS mandatory
- Language: Vietnamese for docs

### When to Load Full rules.md
Load the original `.agent/rules.md` only when:
- First-time project setup
- Complete audit needed
- Onboarding new AI agent

---

## File Paths

```
.agent/
├── rules.md                    # Original (32KB, deprecated for daily use)
└── prompts/
    └── rules/
        ├── index.md            # This file
        ├── core.md             # Always load
        ├── database.md         # DA dimension
        ├── frontend.md         # FE/UI dimension
        ├── security.md         # Auth/Permission
        └── domain-logic.md     # Business rules
```
