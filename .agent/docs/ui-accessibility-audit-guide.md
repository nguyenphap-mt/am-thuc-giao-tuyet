# Hướng Dẫn Chi Tiết: /ui-accessibility-audit

> **Phiên bản**: 1.0  
> **Cập nhật**: 01/02/2026  
> **Skill sử dụng**: `web-design-guidelines`

---

## Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Cách Sử Dụng](#2-cách-sử-dụng)
3. [Chi Tiết 15 Categories](#3-chi-tiết-15-categories)
4. [Anti-Patterns Cần Tránh](#4-anti-patterns-cần-tránh)
5. [Ví Dụ Thực Tế](#5-ví-dụ-thực-tế)
6. [Đọc Hiểu Report](#6-đọc-hiểu-report)

---

## 1. Tổng Quan

### 1.1 Mục đích

`/ui-accessibility-audit` là workflow audit UI về accessibility, UX, và web best practices, sử dụng 100+ rules từ Vercel Web Interface Guidelines.

### 1.2 Khi nào sử dụng?

| Tình huống | Khuyến nghị |
| :--- | :---: |
| Review UI mới | ✅ |
| Trước release | ✅ |
| Accessibility compliance check | ✅ |
| UX review | ✅ |
| Form validation check | ✅ |
| Quick code review | ❌ (dùng `/react-perf-review`) |

### 1.3 Output

- **Format**: Terse `file:line` (VS Code clickable)
- **Grouped by file**: Dễ navigate
- **Report file**: `.reports/ui-audit/{date}-accessibility.md`

---

## 2. Cách Sử Dụng

### 2.1 Cú pháp cơ bản

```
/ui-accessibility-audit {path}
```

### 2.2 Ví dụ

```bash
# Audit toàn bộ components
/ui-accessibility-audit src/components

# Audit một form cụ thể
/ui-accessibility-audit src/components/LoginForm

# Audit Next.js app
/ui-accessibility-audit app/

# Audit pages
/ui-accessibility-audit pages/
```

---

## 3. Chi Tiết 15 Categories

### 3.1 Focus States

> **Mức độ**: CRITICAL

**Rules**:
- Interactive elements cần visible focus: `focus-visible:ring-*`
- Không bao giờ `outline-none` mà không có focus replacement
- Dùng `:focus-visible` thay `:focus`
- Group focus với `:focus-within`

**Ví dụ sai**:
```tsx
// ❌ No focus indicator
<button className="outline-none">Click me</button>
```

**Ví dụ đúng**:
```tsx
// ✅ Visible focus ring
<button className="focus-visible:ring-2 focus-visible:ring-blue-500">
  Click me
</button>
```

---

### 3.2 Forms

> **Mức độ**: CRITICAL

**Rules**:
- Inputs cần `autocomplete` và meaningful `name`
- Dùng đúng `type` (`email`, `tel`, `url`, `number`)
- Không block paste (`onPaste` + `preventDefault`)
- Labels clickable (`htmlFor` hoặc wrapping control)
- Disable spellcheck trên emails, codes (`spellCheck={false}`)
- Errors inline cạnh fields
- Placeholders kết thúc bằng `…`

**Ví dụ sai**:
```tsx
// ❌ Missing label, wrong type
<input type="text" placeholder="Enter email" />
```

**Ví dụ đúng**:
```tsx
// ✅ Proper form input
<label htmlFor="email">Email</label>
<input 
  id="email"
  type="email"
  name="email"
  autocomplete="email"
  placeholder="example@company.com…"
  spellCheck={false}
/>
```

---

### 3.3 Animation

> **Mức độ**: HIGH

**Rules**:
- Honor `prefers-reduced-motion`
- Chỉ animate `transform`/`opacity` (compositor-friendly)
- Không `transition: all`
- Set đúng `transform-origin`
- Animations phải interruptible

**Ví dụ sai**:
```css
/* ❌ transition: all is slow */
.button {
  transition: all 0.3s ease;
}
```

**Ví dụ đúng**:
```css
/* ✅ Specific properties */
.button {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

@media (prefers-reduced-motion: reduce) {
  .button {
    transition: none;
  }
}
```

---

### 3.4 Typography

> **Mức độ**: MEDIUM

**Rules**:
- `…` không phải `...`
- Curly quotes `"` `"` không phải straight `"`
- Non-breaking spaces: `10 MB`, `⌘ K`
- Loading states kết thúc bằng `…`: `"Loading…"`
- `font-variant-numeric: tabular-nums` cho number columns

**Ví dụ sai**:
```tsx
// ❌ Straight quotes, three dots
<p>"Hello..." says the user</p>
```

**Ví dụ đúng**:
```tsx
// ✅ Curly quotes, ellipsis
<p>"Hello…" says the user</p>
```

---

### 3.5 Content Handling

> **Mức độ**: MEDIUM

**Rules**:
- Text containers handle long content: `truncate`, `line-clamp-*`
- Flex children cần `min-w-0` để allow truncation
- Handle empty states
- Xử lý user-generated content với mọi độ dài

**Ví dụ đúng**:
```tsx
// ✅ Handle long text
<div className="flex min-w-0">
  <span className="truncate">{longUserName}</span>
</div>
```

---

### 3.6 Images

> **Mức độ**: HIGH

**Rules**:
- `<img>` cần explicit `width` và `height` (prevent CLS)
- Below-fold images: `loading="lazy"`
- Above-fold images: `priority` hoặc `fetchpriority="high"`

**Ví dụ đúng**:
```tsx
// ✅ Proper image
<Image 
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority
/>
```

---

### 3.7 Performance

> **Mức độ**: HIGH

**Rules**:
- Large lists (>50 items): virtualize
- Không layout reads trong render (`getBoundingClientRect`)
- Batch DOM reads/writes
- Prefer uncontrolled inputs
- Add `<link rel="preconnect">` cho CDN domains

---

### 3.8 Navigation & State

> **Mức độ**: MEDIUM

**Rules**:
- URL reflects state (filters, tabs, pagination)
- Links dùng `<Link>` (Cmd/Ctrl+click support)
- Deep-link all stateful UI
- Destructive actions cần confirmation modal

---

### 3.9 Touch & Interaction

> **Mức độ**: MEDIUM

**Rules**:
- `touch-action: manipulation` (no double-tap zoom delay)
- `-webkit-tap-highlight-color` set intentionally
- `overscroll-behavior: contain` trong modals/drawers
- `autoFocus` sparingly—desktop only

---

### 3.10 Safe Areas & Layout

> **Mức độ**: MEDIUM

**Rules**:
- Full-bleed layouts cần `env(safe-area-inset-*)`
- Tránh unwanted scrollbars: `overflow-x-hidden`
- Flex/grid over JS measurement

---

### 3.11 Dark Mode & Theming

> **Mức độ**: LOW

**Rules**:
- `color-scheme: dark` trên `<html>` cho dark themes
- `<meta name="theme-color">` matches page background
- Native `<select>`: explicit background-color và color

---

### 3.12 Locale & i18n

> **Mức độ**: MEDIUM

**Rules**:
- Dates/times: dùng `Intl.DateTimeFormat`
- Numbers/currency: dùng `Intl.NumberFormat`
- Detect language via `Accept-Language` / `navigator.languages`

**Ví dụ sai**:
```typescript
// ❌ Hardcoded format
const formatted = date.toLocaleDateString();
```

**Ví dụ đúng**:
```typescript
// ✅ Intl API
const formatted = new Intl.DateTimeFormat('vi-VN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(date);
```

---

### 3.13 Hydration Safety

> **Mức độ**: HIGH

**Rules**:
- Inputs với `value` cần `onChange` (hoặc dùng `defaultValue`)
- Date/time rendering: guard against hydration mismatch
- `suppressHydrationWarning` chỉ khi thực sự cần

---

### 3.14 Hover & Interactive States

> **Mức độ**: MEDIUM

**Rules**:
- Buttons/links cần `hover:` state
- Interactive states increase contrast

---

### 3.15 Content & Copy

> **Mức độ**: LOW

**Rules**:
- Active voice: "Install the CLI" không phải "The CLI will be installed"
- Title Case cho headings/buttons
- Numerals cho counts: "8 deployments" không phải "eight"
- Specific button labels: "Save API Key" không phải "Continue"
- Error messages include fix/next step

---

## 4. Anti-Patterns Cần Tránh

> ⚠️ **CAUTION**: Các patterns sau sẽ LUÔN bị flag.

| Anti-Pattern | Vấn đề |
| :--- | :--- |
| `user-scalable=no` | Disabling zoom |
| `maximum-scale=1` | Disabling zoom |
| `onPaste` + `preventDefault` | Blocking paste |
| `transition: all` | Performance issue |
| `outline-none` without replacement | Accessibility |
| Inline `onClick` navigation without `<Link>` | No Cmd+click |
| `<div>` hoặc `<span>` with click handlers | Should be `<button>` |
| Images without dimensions | CLS issue |
| Large `.map()` without virtualization | Performance |
| Form inputs without labels | Accessibility |
| Icon buttons without `aria-label` | Accessibility |
| Hardcoded date/number formats | i18n issue |
| `autoFocus` without justification | Mobile issue |

---

## 5. Ví Dụ Thực Tế

### 5.1 Audit Login Form

```
/ui-accessibility-audit src/components/LoginForm
```

**Output mẫu**:
```markdown
## src/components/LoginForm.tsx

src/components/LoginForm.tsx:23 - input lacks autocomplete attribute
src/components/LoginForm.tsx:31 - input missing htmlFor label
src/components/LoginForm.tsx:45 - outline-none without focus replacement
src/components/LoginForm.tsx:52 - "..." → "…"

## src/components/PasswordInput.tsx

src/components/PasswordInput.tsx:12 - missing aria-label on toggle button
src/components/PasswordInput.tsx:28 - transition: all → list properties

## Summary
- Total issues: 6
- Critical: 2
- High: 2
- Medium: 2
```

---

## 6. Đọc Hiểu Report

### 6.1 Output Format

```
{file}:{line} - {issue description}
```

Format này clickable trong VS Code, IntelliJ, và hầu hết editors.

### 6.2 Issue Severity (ngầm định)

| Pattern trong description | Severity |
| :--- | :--- |
| "missing aria-label" | CRITICAL |
| "input lacks label" | CRITICAL |
| "outline-none" | HIGH |
| "transition: all" | MEDIUM |
| Typo fixes (`...` → `…`) | LOW |

### 6.3 Pass/Fail

File được đánh dấu `✓ pass` nếu không có issues.

---

## Liên Kết

| Tài liệu | Đường dẫn |
| :--- | :--- |
| Workflow file | `../.agent/workflows/ui-accessibility-audit.md` |
| Skill | `../.agent/skills/web-design-guidelines/` |
| Guidelines source | [web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines) |

---

> **Ghi chú**: Workflow này fetch guidelines mới nhất từ GitHub trước mỗi audit.
