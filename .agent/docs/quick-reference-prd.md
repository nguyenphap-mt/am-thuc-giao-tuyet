# 🚀 Quick Reference: PRD Workflows

> **Cheat Sheet cho Reflexion PRD và PRD Audit Workflows**

---

## ⚡ Reflexion PRD (`/prd`)

### Basic
```bash
/prd Thêm tính năng [mô tả]
```

### With Mode
```bash
/prd --mode=standard   # Simple features
/prd --mode=enhanced   # Medium complexity
/prd --mode=deep       # Complex/Security features
```

### Output
| Artifact | Path |
|:---------|:-----|
| PRD | `.agent/prds/PRD-{feature}.md` |
| Tests | `.agent/generated-tests/{id}/` |

### Quality Threshold
- **Standard/Enhanced:** 85/100
- **Deep Analysis:** 90/100

---

## 🔍 PRD Audit (`/prd-audit`)

### Basic
```bash
/prd-audit quote
/prd-audit order
/prd-audit inventory
/prd-audit crm
/prd-audit finance
/prd-audit hr
```

### Batch
```bash
/prd-audit --all
```

### With Focus
```bash
/prd-audit [module] --focus=security
/prd-audit [module] --focus=performance
/prd-audit [module] --focus=ux
```

### Grading
| Score | Grade | Action |
|:-----:|:-----:|:-------|
| 90+ | A | ✅ No PRD |
| 80-89 | B | ✅ Optional |
| 70-79 | C | ⚠️ PRD recommended |
| <70 | D/F | ❌ PRD required |

### Output
| Artifact | Path |
|:---------|:-----|
| Report | `.agent/audits/{module}/{id}.md` |
| Improvement PRD | `.agent/prds/PRD-IMP-{module}.md` |

---

## 📊 5-Dimension Assessment

| Dim | Weight | Focus |
|:---:|:------:|:------|
| UX | 20% | Flows, errors, states |
| UI | 20% | Design system, icons |
| FE | 20% | Components, state |
| BE | 20% | APIs, auth, validation |
| DA | 20% | RLS, indexes, schema |

---

## 🔗 Related Commands

| Command | Use Case |
|:--------|:---------|
| `/prd` | New feature PRD |
| `/prd-audit` | Audit existing code |
| `/create-module` | Implement from PRD |
| `/fix-bug` | Fix specific issue |
| `/refactor` | Improve existing code |

---

## 📁 Key Files

```
.agent/
├── workflows/
│   ├── reflexion-prd.md    # Main PRD workflow
│   └── prd-audit.md        # Audit workflow
├── skills/
│   ├── prd-drafter/        # Draft generation
│   ├── prd-critic/         # Quality critique
│   ├── prd-evaluator/      # Score & decision
│   ├── codebase-validator/ # Code validation
│   ├── domain-expert/      # Business validation
│   ├── test-generator/     # Auto tests
│   ├── effort-estimator/   # Effort estimation
│   └── module-auditor/     # 5-dim audit
├── config/
│   └── prd-workflow.yaml   # Configuration
├── docs/
│   ├── guide-reflexion-prd.md
│   └── guide-prd-audit.md
└── knowledge_base/
    ├── prd-lessons.md
    ├── effort-history.md
    └── audit-history.md
```
