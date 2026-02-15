---
description: React/Next.js Performance Review sử dụng Vercel Best Practices (57 rules, 8 categories)
version: 1.0
last_updated: 2026-02-01
trigger_keywords: ["react review", "next.js review", "performance review", "react audit", "bundle size", "waterfall"]
skills_used: ["react-best-practices", "composition-patterns"]
---

# /react-perf-review Workflow

> **Trigger**: Khi cần review performance cho React/Next.js codebase.
> **Skills**: `vercel-react-best-practices`, `vercel-composition-patterns`
> **Output**: Performance Report với prioritized recommendations.

// turbo-all

---

## Pre-Requisites

| Variable | Description | Example |
| :--- | :--- | :--- |
| `{target_path}` | Đường dẫn tới code cần review | `src/components/` |
| `{framework}` | React hoặc Next.js | `nextjs` |

---

## Step 1: Load Skills & Context

### 1.1 Load React Best Practices Skill

> [!IMPORTANT]
> Skill chứa 57 rules chia theo 8 priority levels.

```
Read SKILL.md từ: .agent/skills/react-best-practices/SKILL.md
Read AGENTS.md từ: .agent/skills/react-best-practices/AGENTS.md (full rules)
```

### 1.2 Load Composition Patterns Skill

```
Read SKILL.md từ: .agent/skills/composition-patterns/SKILL.md
Read AGENTS.md từ: .agent/skills/composition-patterns/AGENTS.md
```

### 1.3 Identify Target Files

```powershell
# // turbo - List React/TypeScript files
Get-ChildItem -Path "{target_path}" -Recurse -Include "*.tsx","*.ts","*.jsx","*.js" | 
  Where-Object { $_.Name -notmatch "\.test\.|\.spec\." } |
  Select-Object FullName, Length
```

---

## Step 2: Critical Priority Analysis (CRITICAL Impact)

### 2.1 Eliminating Waterfalls Check

> **Rules**: `async-defer-await`, `async-parallel`, `async-dependencies`, `async-api-routes`, `async-suspense-boundaries`

**Kiểm tra**:
- [ ] Sequential await statements có thể chạy parallel?
- [ ] Promise.all() được sử dụng cho independent operations?
- [ ] Suspense boundaries được sử dụng để stream content?
- [ ] API routes start promises early, await late?

```powershell
# // turbo - Find sequential awaits
Select-String -Path "{target_path}/**/*.ts*" -Pattern "await.*\n.*await" -AllMatches
```

### 2.2 Bundle Size Optimization Check

> **Rules**: `bundle-barrel-imports`, `bundle-dynamic-imports`, `bundle-defer-third-party`, `bundle-conditional`, `bundle-preload`

**Kiểm tra**:
- [ ] Import trực tiếp thay vì từ barrel files (index.ts)?
- [ ] Heavy components sử dụng next/dynamic?
- [ ] Analytics/logging load sau hydration?
- [ ] Modules chỉ load khi feature activated?

```powershell
# // turbo - Find barrel imports
Select-String -Path "{target_path}/**/*.ts*" -Pattern "from ['\"]\.\.?/[^/]+['\"]" -AllMatches
```

---

## Step 3: High Priority Analysis (HIGH Impact)

### 3.1 Server-Side Performance Check

> **Rules**: `server-auth-actions`, `server-cache-react`, `server-cache-lru`, `server-dedup-props`, `server-serialization`, `server-parallel-fetching`, `server-after-nonblocking`

**Kiểm tra**:
- [ ] Server actions có auth giống API routes?
- [ ] React.cache() được dùng cho per-request deduplication?
- [ ] Minimize data passed to client components?
- [ ] Component structure cho phép parallel fetches?

```powershell
# // turbo - Find server components
Select-String -Path "{target_path}/**/*.ts*" -Pattern "'use server'|\"use server\"" -AllMatches
```

---

## Step 4: Medium Priority Analysis (MEDIUM Impact)

### 4.1 Re-render Optimization Check

> **Rules**: `rerender-defer-reads`, `rerender-memo`, `rerender-memo-with-default-value`, `rerender-dependencies`, `rerender-derived-state`, `rerender-functional-setstate`, `rerender-lazy-state-init`, `rerender-transitions`

**Kiểm tra**:
- [ ] Expensive calculations được memoize?
- [ ] Default non-primitive props được hoist?
- [ ] Primitive dependencies trong useEffect?
- [ ] Derived state trong render, không phải effects?
- [ ] startTransition cho non-urgent updates?

```powershell
# // turbo - Find useMemo/useCallback usage
Select-String -Path "{target_path}/**/*.ts*" -Pattern "useMemo|useCallback|React.memo" -AllMatches
```

### 4.2 Rendering Performance Check

> **Rules**: `rendering-content-visibility`, `rendering-hoist-jsx`, `rendering-conditional-render`, `rendering-usetransition-loading`

**Kiểm tra**:
- [ ] Static JSX extracted outside components?
- [ ] content-visibility cho long lists?
- [ ] Ternary thay && cho conditionals?

### 4.3 Composition Patterns Check

> **Rules từ composition-patterns skill**

**Kiểm tra**:
- [ ] Không có boolean prop proliferation?
- [ ] Compound components cho complex UI?
- [ ] State lifted vào provider components?
- [ ] Children over render props?

```powershell
# // turbo - Find components with many boolean props
Select-String -Path "{target_path}/**/*.ts*" -Pattern ":\s*(boolean|true|false)" -AllMatches | 
  Group-Object Path | Where-Object { $_.Count -gt 5 }
```

---

## Step 5: Low Priority Analysis (LOW-MEDIUM Impact)

### 5.1 JavaScript Performance Check

> **Rules**: `js-batch-dom-css`, `js-index-maps`, `js-cache-property-access`, `js-set-map-lookups`, `js-combine-iterations`, `js-early-exit`

**Kiểm tra**:
- [ ] Map/Set cho O(1) lookups?
- [ ] Combined iterations thay multiple filter/map?
- [ ] Early returns trong functions?

---

## Step 6: Generate Report

### 6.1 Performance Score Calculation

| Category | Weight | Score (1-10) | Weighted |
| :--- | :---: | :---: | :---: |
| Waterfall Elimination | 0.25 | | |
| Bundle Size | 0.20 | | |
| Server Performance | 0.15 | | |
| Re-render Optimization | 0.15 | | |
| Rendering Performance | 0.10 | | |
| JS Performance | 0.10 | | |
| Composition Patterns | 0.05 | | |
| **TOTAL** | 1.00 | | **/10** |

### 6.2 Issues by Priority

```markdown
## 🔴 CRITICAL Priority Issues
| File | Line | Rule | Description | Fix |
| :--- | :---: | :--- | :--- | :--- |

## 🟠 HIGH Priority Issues
| File | Line | Rule | Description | Fix |
| :--- | :---: | :--- | :--- | :--- |

## 🟡 MEDIUM Priority Issues
| File | Line | Rule | Description | Fix |
| :--- | :---: | :--- | :--- | :--- |

## 🟢 LOW Priority Issues
| File | Line | Rule | Description | Fix |
| :--- | :---: | :--- | :--- | :--- |
```

### 6.3 Save Report

```powershell
# // turbo - Save report
$date = Get-Date -Format "yyyyMMdd"
New-Item -Path ".reports/react-perf/$date-review.md" -ItemType File -Force
```

---

## Output Files

| File | Location | Description |
| :--- | :--- | :--- |
| Performance Report | `.reports/react-perf/{date}-review.md` | Detailed findings |
| Summary JSON | `.reports/react-perf/{date}-summary.json` | CI integration |

---

## Pass/Fail Criteria

| Criterion | Threshold | Required? |
| :--- | :---: | :---: |
| No CRITICAL issues | 0 | ✅ |
| Performance Score | ≥7/10 | ✅ |
| Bundle Size optimized | Pass | Recommended |

---

## Quick Reference

### Trigger Command
```
/react-perf-review {path}
/react-perf-review src/components
```

### Related Workflows
| Workflow | When to Use |
| :--- | :--- |
| `/ui-accessibility-audit` | UI/UX issues found |
| `/frontend-quality-gate` | Full frontend review |
| `/refactor` | When technical debt identified |
