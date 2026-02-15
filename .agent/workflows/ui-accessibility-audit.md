---
description: UI Accessibility Audit theo Web Interface Guidelines (100+ rules, 15 categories)
version: 1.0
last_updated: 2026-02-01
trigger_keywords: ["accessibility", "a11y", "ui audit", "ux review", "focus states", "aria", "wcag"]
skills_used: ["web-design-guidelines"]
---

# /ui-accessibility-audit Workflow

> **Trigger**: Khi cần audit UI về accessibility, UX, và best practices.
> **Skill**: `web-design-guidelines`
> **Output**: Terse findings theo format `file:line` (VS Code clickable).

// turbo-all

---

## Pre-Requisites

| Variable | Description | Example |
| :--- | :--- | :--- |
| `{target_path}` | Đường dẫn tới UI code | `src/components/` |
| `{file_pattern}` | Pattern files cần audit | `*.tsx,*.vue,*.svelte` |

---

## Step 1: Fetch Latest Guidelines

> [!IMPORTANT]
> Luôn fetch guidelines mới nhất trước mỗi review.

### 1.1 Fetch Web Interface Guidelines

```
WebFetch URL: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

### 1.2 Load Skill Reference

```
Read SKILL.md từ: .agent/skills/web-design-guidelines/SKILL.md
```

### 1.3 Identify Target Files

```powershell
# // turbo - List UI files to audit
Get-ChildItem -Path "{target_path}" -Recurse -Include "*.tsx","*.jsx","*.vue","*.svelte","*.html" |
  Select-Object FullName, Length
```

---

## Step 2: Accessibility Audit

### 2.1 Focus States Check

**Rules**:
- Interactive elements need visible focus: `focus-visible:ring-*`
- Never `outline-none` without focus replacement
- Use `:focus-visible` over `:focus`
- Group focus with `:focus-within`

```powershell
# // turbo - Find outline-none without replacement
Select-String -Path "{target_path}/**/*.tsx" -Pattern "outline-none|outline:\s*none" -AllMatches
```

**Checklist**:
- [ ] Tất cả interactive elements có visible focus?
- [ ] Không có `outline-none` không thay thế?
- [ ] Sử dụng `:focus-visible` pattern?

### 2.2 Forms Audit

**Rules**:
- Inputs need `autocomplete` and meaningful `name`
- Use correct `type` (`email`, `tel`, `url`, `number`)
- Never block paste (`onPaste` + `preventDefault`)
- Labels clickable (`htmlFor` or wrapping control)
- Submit button stays enabled until request starts
- Errors inline next to fields

```powershell
# // turbo - Find inputs without autocomplete
Select-String -Path "{target_path}/**/*.tsx" -Pattern "<input[^>]*(?!autocomplete)" -AllMatches
```

**Checklist**:
- [ ] Inputs có `autocomplete` attribute?
- [ ] Correct input `type` được sử dụng?
- [ ] Labels clickable (htmlFor)?
- [ ] Errors inline next to fields?

### 2.3 Semantic HTML Check

**Rules**:
- Use semantic HTML elements
- Icon buttons need `aria-label`
- Form inputs need labels

```powershell
# // turbo - Find icon buttons without aria-label
Select-String -Path "{target_path}/**/*.tsx" -Pattern "<button[^>]*>[^<]*<(svg|Icon)" -AllMatches
```

---

## Step 3: Animation & Performance Audit

### 3.1 Animation Rules

**Rules**:
- Honor `prefers-reduced-motion`
- Animate `transform`/`opacity` only (compositor-friendly)
- Never `transition: all`
- Animations interruptible

```powershell
# // turbo - Find transition: all anti-pattern
Select-String -Path "{target_path}/**/*.tsx" -Pattern "transition:\s*all|transition-all" -AllMatches
```

**Checklist**:
- [ ] `prefers-reduced-motion` được honor?
- [ ] Chỉ animate transform/opacity?
- [ ] Không có `transition: all`?

### 3.2 Performance Rules

**Rules**:
- Large lists (>50 items): virtualize
- No layout reads in render
- Add `<link rel="preconnect">` for CDN domains
- Images need explicit `width` and `height`

```powershell
# // turbo - Find large lists without virtualization
Select-String -Path "{target_path}/**/*.tsx" -Pattern "\.map\(" -AllMatches
```

**Checklist**:
- [ ] Large lists virtualized?
- [ ] Images có width/height?
- [ ] Preconnect cho CDN domains?

---

## Step 4: Typography & Content Audit

### 4.1 Typography Rules

**Rules**:
- `…` not `...`
- Curly quotes `"` `"` not straight `"`
- Non-breaking spaces: `10 MB`, `⌘ K`
- Loading states end with `…`
- `font-variant-numeric: tabular-nums` for number columns

```powershell
# // turbo - Find straight quotes
Select-String -Path "{target_path}/**/*.tsx" -Pattern '\"[^\"]+\"' -AllMatches
```

### 4.2 Content Handling Rules

**Rules**:
- Text containers handle long content: `truncate`, `line-clamp-*`
- Flex children need `min-w-0` for truncation
- Handle empty states

```powershell
# // turbo - Find flex without min-w-0
Select-String -Path "{target_path}/**/*.tsx" -Pattern "flex[^>]*truncate" -AllMatches
```

---

## Step 5: Navigation & State Audit

### 5.1 URL State Rules

**Rules**:
- URL reflects state (filters, tabs, pagination)
- Links use `<Link>` (Cmd/Ctrl+click support)
- Deep-link all stateful UI
- Destructive actions need confirmation

```powershell
# // turbo - Find onClick navigation without Link
Select-String -Path "{target_path}/**/*.tsx" -Pattern "onClick.*navigate|router\.push" -AllMatches
```

### 5.2 Dark Mode & Theming

**Rules**:
- `color-scheme: dark` on `<html>` for dark themes
- `<meta name="theme-color">` matches page background
- Native `<select>`: explicit background-color and color

---

## Step 6: i18n & Locale Audit

### 6.1 Locale Rules

**Rules**:
- Dates/times: use `Intl.DateTimeFormat`
- Numbers/currency: use `Intl.NumberFormat`
- Detect language via `Accept-Language` / `navigator.languages`

```powershell
# // turbo - Find hardcoded date formats
Select-String -Path "{target_path}/**/*.tsx" -Pattern "\.toLocaleDateString\(\)|\.toLocaleString\(\)" -AllMatches
```

---

## Step 7: Anti-Patterns Detection

> [!CAUTION]
> Các patterns sau PHẢI được flag.

| Anti-Pattern | Detection |
| :--- | :--- |
| `user-scalable=no` | Disabling zoom |
| `onPaste` + `preventDefault` | Blocking paste |
| `transition: all` | Performance issue |
| `outline-none` without replacement | Accessibility |
| Inline onClick navigation | No Link support |
| `<div>` with click handlers | Should be `<button>` |
| Images without dimensions | CLS issue |
| Large `.map()` without virtualization | Performance |
| Form inputs without labels | Accessibility |
| Icon buttons without `aria-label` | Accessibility |

```powershell
# // turbo - Scan all anti-patterns
$antiPatterns = @(
  "user-scalable=no",
  "maximum-scale=1",
  "transition:\s*all",
  "outline:\s*none",
  "outline-none"
)
Select-String -Path "{target_path}/**/*.tsx" -Pattern ($antiPatterns -join "|") -AllMatches
```

---

## Step 8: Generate Report

### 8.1 Output Format

> **Format**: Group by file. Use `file:line` format (VS Code clickable). Terse findings.

```markdown
## src/components/Button.tsx

src/components/Button.tsx:42 - icon button missing aria-label
src/components/Button.tsx:18 - input lacks label
src/components/Button.tsx:55 - animation missing prefers-reduced-motion
src/components/Button.tsx:67 - transition: all → list properties

## src/components/Modal.tsx

src/components/Modal.tsx:12 - missing overscroll-behavior: contain
src/components/Modal.tsx:34 - "..." → "…"

## src/components/Card.tsx

✓ pass
```

### 8.2 Summary Table

| Category | Issues | Severity |
| :--- | :---: | :--- |
| Accessibility | | |
| Focus States | | |
| Forms | | |
| Animation | | |
| Performance | | |
| Typography | | |
| Navigation | | |
| i18n | | |
| Anti-patterns | | |

### 8.3 Save Report

```powershell
# // turbo - Save report
$date = Get-Date -Format "yyyyMMdd"
New-Item -Path ".reports/ui-audit/$date-accessibility.md" -ItemType File -Force
```

---

## Output Files

| File | Location | Description |
| :--- | :--- | :--- |
| Audit Report | `.reports/ui-audit/{date}-accessibility.md` | Terse findings |
| Summary | `.reports/ui-audit/{date}-summary.json` | CI integration |

---

## Pass/Fail Criteria

| Criterion | Threshold | Required? |
| :--- | :---: | :---: |
| No accessibility violations | 0 critical | ✅ |
| No anti-patterns | 0 | ✅ |
| Focus states present | 100% | ✅ |
| Form inputs labeled | 100% | ✅ |

---

## Quick Reference

### Trigger Command
```
/ui-accessibility-audit {path}
/ui-accessibility-audit src/components
```

### Related Workflows
| Workflow | When to Use |
| :--- | :--- |
| `/react-perf-review` | Performance issues found |
| `/ui-ux-pro-max` | Need design improvements |
| `/frontend-quality-gate` | Full frontend review |
