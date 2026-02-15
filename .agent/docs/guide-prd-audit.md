# 📘 Hướng Dẫn Sử Dụng: PRD Audit Workflow

> **Version:** 1.0.0  
> **Last Updated:** 24/01/2026  
> **Trigger:** `/prd-audit [module-name]`

---

## 1. Tổng Quan

### Workflow này dùng để làm gì?
Đánh giá chất lượng module đã implement theo **5-Dimension Assessment** và tự động tạo **Improvement PRD** nếu cần.

### Khi nào nên dùng?
- ✅ Review chất lượng code định kỳ
- ✅ Trước khi release major version
- ✅ Khi nghi ngờ có technical debt
- ✅ Onboard team member mới (hiểu cấu trúc)
- ❌ Debug lỗi cụ thể (dùng `/fix-bug`)
- ❌ Tạo feature mới (dùng `/prd`)

---

## 2. Cách Sử Dụng

### 2.1 Audit Một Module

```bash
/prd-audit quote
```

### 2.2 Audit Tất Cả Modules

```bash
/prd-audit --all
```

### 2.3 Audit Với Focus Cụ Thể

```bash
/prd-audit inventory --focus=security
/prd-audit crm --focus=performance
/prd-audit finance --focus=ux
```

---

## 3. Available Modules

| Module | Description | Paths |
|:-------|:------------|:------|
| `quote` | Quote Management | `backend/modules/sales`, `frontend/src/app/quote` |
| `order` | Order Management | `backend/modules/sales`, `frontend/src/app/order` |
| `inventory` | Inventory Management | `backend/modules/inventory`, `frontend/src/app/inventory` |
| `crm` | Customer Management | `backend/modules/crm`, `frontend/src/app/crm` |
| `finance` | Finance & Accounting | `backend/modules/finance`, `frontend/src/app/finance` |
| `hr` | Human Resources | `backend/modules/hr`, `frontend/src/app/hr` |

---

## 4. 5-Dimension Assessment

Mỗi module được đánh giá trên 5 chiều:

| Dimension | Weight | Kiểm tra gì |
|:----------|:------:|:------------|
| **UX** | 20% | User flows, error handling, empty states |
| **UI** | 20% | Design System compliance, icons, animations |
| **FE** | 20% | Standalone components, state management, types |
| **BE** | 20% | API design, auth, input validation |
| **DA** | 20% | RLS, indexes, relationships, migrations |

---

## 5. Grading Scale

| Score | Grade | Status | Action |
|:------|:-----:|:-------|:-------|
| 90-100 | A | 🟢 Excellent | Minor polish only |
| 80-89 | B | 🟢 Good | Optional improvements |
| 70-79 | C | 🟡 Needs Work | Improvement PRD recommended |
| 60-69 | D | 🟠 Poor | Improvement PRD required |
| <60 | F | 🔴 Critical | Major refactor needed |

---

## 6. Workflow Phases

```
Phase 1: Module Discovery
    ↓ Scan all files in module
Phase 2: 5-Dimension Audit
    ↓ module-auditor skill
Phase 3: Score & Decision
    ↓ Grade A/B: Report only
    ↓ Grade C/D/F: Generate Improvement PRD
Phase 4: Reflexion Loop (if PRD generated)
    ↓ Same as /prd workflow
Phase 5: Tracking & History
    ↓ Update audit-history.md
```

---

## 7. Output Artifacts

| Artifact | Mô tả | Path |
|:---------|:------|:-----|
| Audit Report | Chi tiết issues + scores | `.agent/audits/{module}/{audit_id}.md` |
| Improvement PRD | PRD cho improvements (nếu score < 80) | `.agent/prds/PRD-IMP-{module}.md` |
| Audit History | Track scores theo thời gian | `.agent/knowledge_base/audit-history.md` |

---

## 8. Ví Dụ Output

### 8.1 Audit Summary

```markdown
## 📊 Audit Results: quote

| Dimension | Score | Max | Status |
|:----------|:-----:|:---:|:-------|
| UX | 16 | 20 | 🟢 |
| UI | 14 | 20 | 🟡 |
| FE | 15 | 20 | 🟢 |
| BE | 12 | 20 | 🟠 |
| DA | 15 | 20 | 🟢 |
| **Total** | **72** | **100** | **Grade: C** |

### Issues Found
- 🔴 CRITICAL: 1
- 🟠 HIGH: 4
- 🟡 MEDIUM: 6
- 🟢 LOW: 3
```

### 8.2 Issue Detail

```markdown
## ISS-001 [CRITICAL] - BE
**Issue:** Protected endpoint /quotes/{id} missing auth
**File:** backend/modules/quote/http/router.py:45
**Suggestion:** Add Depends(get_current_user)
**Effort:** XS
```

---

## 9. Ví Dụ Prompt Theo Use Case

### 9.1 Pre-Release Audit

```bash
/prd-audit order

Context: Chuẩn bị release v2.0
Focus: Security + Performance
Output: 
- Security checklist
- Performance bottlenecks
- Improvement PRD nếu cần
```

### 9.2 Technical Debt Assessment

```bash
/prd-audit --all

Context: Sprint planning Q2
Goal: Prioritize tech debt
Output:
- Module health dashboard
- Top 10 critical issues
- Effort estimation cho fixes
```

### 9.3 Specific Dimension Deep-Dive

```bash
/prd-audit crm --focus=ux

Context: UX audit cho CRM module
Check:
- User journey completeness
- Error message clarity
- Empty state handling
- Loading indicators
```

---

## 10. Interpreting Results

### 10.1 Khi Score Cao (80+)

```
Agent: Quote module đạt 85/100 (Grade B).
       Không cần Improvement PRD.
       
       Minor suggestions:
       - Thêm loading skeleton cho list view
       - Fix 2 icon style (Outlined → Filled)

User: OK, note lại cho sprint sau.
```

### 10.2 Khi Score Thấp (<80)

```
Agent: Inventory module đạt 68/100 (Grade D).
       Generating Improvement PRD...
       
       Critical issues:
       - RLS not enforced on 2 tables
       - Missing auth on 3 endpoints
       - N+1 query pattern detected

       [PRD generated: PRD-IMP-inventory.md]
       
       Bạn muốn review PRD?

User: Có, cho tôi xem
```

---

## 11. Tracking Trends

### Xem Audit History

```bash
# View in Knowledge Base
cat .agent/knowledge_base/audit-history.md
```

### Sample History

```markdown
| Module | Last Audit | Score | Grade | Trend |
|:-------|:-----------|:-----:|:-----:|:-----:|
| quote | 2026-01-24 | 85 | B | ↗️ +12 |
| order | 2026-01-20 | 78 | C | → 0 |
| inventory | 2026-01-24 | 68 | D | ↘️ -5 |
```

---

## 12. Troubleshooting

| Vấn đề | Nguyên nhân | Giải pháp |
|:-------|:------------|:----------|
| "Module not found" | Tên module sai | Check available modules list |
| Empty audit | Module chưa có code | Scaffold module trước |
| Score quá thấp | Nhiều critical issues | Focus fix P0 issues trước |
| PRD không generate | Score >= 80 | Đây là expected behavior |

---

## 13. Tips & Best Practices

1. **Audit định kỳ** - Mỗi sprint hoặc trước major release
2. **Fix P0 trước** - Critical/High issues first
3. **Track trends** - Score giảm = technical debt tăng
4. **Team review** - Share audit reports trong sprint planning
5. **Automation** - Có thể integrate vào CI/CD

---

## 14. Related Workflows

| Workflow | Khi nào dùng |
|:---------|:-------------|
| `/prd` | Tạo PRD cho feature mới |
| `/fix-bug` | Fix issue cụ thể từ audit |
| `/refactor` | Refactor code theo suggestions |
| `/create-module` | Implement từ Improvement PRD |
