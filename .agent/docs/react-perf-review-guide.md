# Hướng Dẫn Chi Tiết: /react-perf-review

> **Phiên bản**: 1.0  
> **Cập nhật**: 01/02/2026  
> **Skill sử dụng**: `react-best-practices`, `composition-patterns`

---

## Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Cách Sử Dụng](#2-cách-sử-dụng)
3. [Chi Tiết 8 Categories](#3-chi-tiết-8-categories)
4. [Ví Dụ Thực Tế](#4-ví-dụ-thực-tế)
5. [Đọc Hiểu Report](#5-đọc-hiểu-report)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Tổng Quan

### 1.1 Mục đích

`/react-perf-review` là workflow review performance cho React/Next.js codebase, sử dụng 57 rules từ Vercel Engineering.

### 1.2 Khi nào sử dụng?

| Tình huống | Khuyến nghị |
| :--- | :---: |
| Viết xong component mới | ✅ |
| Trước khi merge PR | ✅ |
| Debug performance issue | ✅ |
| Optimize bundle size | ✅ |
| Review existing code | ✅ |
| Quick syntax check | ❌ (dùng ESLint) |

### 1.3 Output

- **Performance Score**: 1-10
- **Issues by Priority**: CRITICAL → LOW
- **Recommendations**: Cách fix từng issue
- **Report file**: `.reports/react-perf/{date}-review.md`

---

## 2. Cách Sử Dụng

### 2.1 Cú pháp cơ bản

```
/react-perf-review {path}
```

### 2.2 Ví dụ

```bash
# Review toàn bộ components
/react-perf-review src/components

# Review một component cụ thể
/react-perf-review src/components/Dashboard

# Review Next.js app directory
/react-perf-review src/app

# Review pages directory
/react-perf-review pages/
```

### 2.3 Parameters

| Parameter | Mô tả | Mặc định |
| :--- | :--- | :--- |
| `{path}` | Đường dẫn tới code cần review | Required |

---

## 3. Chi Tiết 8 Categories

### 3.1 Category 1: Eliminating Waterfalls (CRITICAL)

> **Impact**: CRITICAL  
> **Prefix**: `async-`

**Vấn đề**: Sequential awaits gây chậm load time.

**Rules**:
| Rule | Mô tả |
| :--- | :--- |
| `async-defer-await` | Move await vào branches thực sự cần |
| `async-parallel` | Dùng Promise.all() cho independent operations |
| `async-dependencies` | Dùng better-all cho partial dependencies |
| `async-api-routes` | Start promises early, await late |
| `async-suspense-boundaries` | Dùng Suspense để stream content |

**Ví dụ sai**:
```typescript
// ❌ Sequential awaits
const user = await getUser(id);
const posts = await getPosts(id);
const comments = await getComments(id);
```

**Ví dụ đúng**:
```typescript
// ✅ Parallel fetching
const [user, posts, comments] = await Promise.all([
  getUser(id),
  getPosts(id),
  getComments(id)
]);
```

---

### 3.2 Category 2: Bundle Size Optimization (CRITICAL)

> **Impact**: CRITICAL  
> **Prefix**: `bundle-`

**Vấn đề**: Bundle quá lớn gây chậm initial load.

**Rules**:
| Rule | Mô tả |
| :--- | :--- |
| `bundle-barrel-imports` | Import trực tiếp, tránh barrel files |
| `bundle-dynamic-imports` | Dùng next/dynamic cho heavy components |
| `bundle-defer-third-party` | Load analytics sau hydration |
| `bundle-conditional` | Load modules chỉ khi feature activated |
| `bundle-preload` | Preload on hover/focus |

**Ví dụ sai**:
```typescript
// ❌ Barrel import (imports everything)
import { Button, Modal, Form } from '@/components';
```

**Ví dụ đúng**:
```typescript
// ✅ Direct imports
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
```

---

### 3.3 Category 3: Server-Side Performance (HIGH)

> **Impact**: HIGH  
> **Prefix**: `server-`

**Rules**:
| Rule | Mô tả |
| :--- | :--- |
| `server-auth-actions` | Auth server actions như API routes |
| `server-cache-react` | React.cache() cho per-request dedup |
| `server-cache-lru` | LRU cache cho cross-request caching |
| `server-dedup-props` | Tránh duplicate serialization |
| `server-serialization` | Minimize data passed to client |
| `server-parallel-fetching` | Restructure cho parallel fetches |
| `server-after-nonblocking` | Dùng after() cho non-blocking ops |

---

### 3.4 Category 4: Client-Side Data Fetching (MEDIUM-HIGH)

> **Impact**: MEDIUM-HIGH  
> **Prefix**: `client-`

**Rules**:
| Rule | Mô tả |
| :--- | :--- |
| `client-swr-dedup` | Dùng SWR cho request deduplication |
| `client-event-listeners` | Deduplicate global event listeners |
| `client-passive-event-listeners` | Passive listeners cho scroll |
| `client-localstorage-schema` | Version và minimize localStorage |

---

### 3.5 Category 5: Re-render Optimization (MEDIUM)

> **Impact**: MEDIUM  
> **Prefix**: `rerender-`

**Rules**:
| Rule | Mô tả |
| :--- | :--- |
| `rerender-defer-reads` | Không subscribe state chỉ dùng trong callbacks |
| `rerender-memo` | Extract expensive work vào memoized components |
| `rerender-memo-with-default-value` | Hoist default non-primitive props |
| `rerender-dependencies` | Primitive dependencies trong effects |
| `rerender-derived-state` | Subscribe derived booleans, không raw values |
| `rerender-derived-state-no-effect` | Derive state trong render, không effects |
| `rerender-functional-setstate` | Functional setState cho stable callbacks |
| `rerender-lazy-state-init` | Pass function cho expensive useState |
| `rerender-simple-expression-in-memo` | Tránh memo cho simple primitives |
| `rerender-move-effect-to-event` | Put interaction logic trong event handlers |
| `rerender-transitions` | startTransition cho non-urgent updates |
| `rerender-use-ref-transient-values` | Refs cho transient frequent values |

**Ví dụ sai**:
```typescript
// ❌ Expensive calculation mỗi render
function Component({ items }) {
  const sorted = items.sort((a, b) => a.date - b.date);
  return <List items={sorted} />;
}
```

**Ví dụ đúng**:
```typescript
// ✅ Memoized calculation
function Component({ items }) {
  const sorted = useMemo(
    () => items.sort((a, b) => a.date - b.date),
    [items]
  );
  return <List items={sorted} />;
}
```

---

### 3.6 Category 6: Rendering Performance (MEDIUM)

> **Impact**: MEDIUM  
> **Prefix**: `rendering-`

**Rules**:
| Rule | Mô tả |
| :--- | :--- |
| `rendering-animate-svg-wrapper` | Animate div wrapper, không SVG |
| `rendering-content-visibility` | content-visibility cho long lists |
| `rendering-hoist-jsx` | Extract static JSX outside components |
| `rendering-svg-precision` | Giảm SVG coordinate precision |
| `rendering-hydration-no-flicker` | Inline script cho client-only data |
| `rendering-hydration-suppress-warning` | Suppress expected mismatches |
| `rendering-activity` | Activity component cho show/hide |
| `rendering-conditional-render` | Ternary, không && cho conditionals |
| `rendering-usetransition-loading` | useTransition cho loading state |

---

### 3.7 Category 7: JavaScript Performance (LOW-MEDIUM)

> **Impact**: LOW-MEDIUM  
> **Prefix**: `js-`

**Rules**:
| Rule | Mô tả |
| :--- | :--- |
| `js-batch-dom-css` | Group CSS changes via classes |
| `js-index-maps` | Build Map cho repeated lookups |
| `js-cache-property-access` | Cache object properties trong loops |
| `js-cache-function-results` | Cache function results trong Map |
| `js-cache-storage` | Cache localStorage reads |
| `js-combine-iterations` | Combine filter/map thành một loop |
| `js-length-check-first` | Check array length trước expensive comparison |
| `js-early-exit` | Return early từ functions |
| `js-hoist-regexp` | Hoist RegExp creation ngoài loops |
| `js-min-max-loop` | Dùng loop cho min/max thay sort |
| `js-set-map-lookups` | Set/Map cho O(1) lookups |
| `js-tosorted-immutable` | toSorted() cho immutability |

---

### 3.8 Category 8: Advanced Patterns (LOW)

> **Impact**: LOW  
> **Prefix**: `advanced-`

**Rules**:
| Rule | Mô tả |
| :--- | :--- |
| `advanced-event-handler-refs` | Store event handlers trong refs |
| `advanced-init-once` | Initialize app once per app load |
| `advanced-use-latest` | useLatest cho stable callback refs |

---

## 4. Ví Dụ Thực Tế

### 4.1 Review Dashboard Component

```
/react-perf-review src/components/Dashboard
```

**Output mẫu**:
```markdown
## 🔴 CRITICAL Priority Issues
| File | Line | Rule | Description |
| :--- | :---: | :--- | :--- |
| Dashboard.tsx | 45 | async-parallel | Sequential awaits trong useEffect |
| Dashboard.tsx | 12 | bundle-barrel-imports | Import từ index.ts |

## 🟠 HIGH Priority Issues
| File | Line | Rule | Description |
| :--- | :---: | :--- | :--- |
| Chart.tsx | 89 | server-serialization | Large object passed to client |

## Performance Score: 6.5/10
```

### 4.2 Review Next.js App

```
/react-perf-review src/app
```

---

## 5. Đọc Hiểu Report

### 5.1 Performance Score

| Score | Đánh giá | Action |
| :---: | :--- | :--- |
| 9-10 | Excellent | Sẵn sàng release |
| 7-8 | Good | Minor improvements |
| 5-6 | Fair | Cần fix HIGH issues |
| 3-4 | Poor | Cần fix CRITICAL issues |
| 1-2 | Critical | Block release |

### 5.2 Issue Priority

| Priority | Color | Action |
| :--- | :--- | :--- |
| CRITICAL | 🔴 | Must fix trước release |
| HIGH | 🟠 | Should fix soon |
| MEDIUM | 🟡 | Nice to have |
| LOW | 🟢 | Future improvement |

### 5.3 Score Calculation

```
Score = Σ(Category Weight × Category Score) / Σ(Category Weight)

Weights:
- Waterfalls: 0.25
- Bundle Size: 0.20
- Server Performance: 0.15
- Re-renders: 0.15
- Rendering: 0.10
- JS Performance: 0.10
- Composition: 0.05
```

---

## 6. Troubleshooting

### Q1: Report không có issues nhưng app vẫn chậm?

**A**: Workflow chỉ check code patterns. Cần thêm:
- Chrome DevTools Performance tab
- Lighthouse audit
- Bundle analyzer

### Q2: False positive - Rule không áp dụng cho case của tôi?

**A**: Một số rules có exceptions:
- `async-parallel`: Không áp dụng nếu operations thực sự dependent
- `bundle-barrel-imports`: OK nếu đã tree-shake properly

### Q3: Làm sao ignore một file?

**A**: Thêm comment ở đầu file:
```typescript
// @perf-review-ignore
```

### Q4: Report quá dài, làm sao focus?

**A**: Focus theo thứ tự:
1. CRITICAL issues trước
2. HIGH issues tiếp theo
3. Ignore LOW nếu deadline gấp

---

## Liên Kết

| Tài liệu | Đường dẫn |
| :--- | :--- |
| Workflow file | `../.agent/workflows/react-perf-review.md` |
| Skill: react-best-practices | `../.agent/skills/react-best-practices/` |
| Skill: composition-patterns | `../.agent/skills/composition-patterns/` |
| Full rules | `../.agent/skills/react-best-practices/AGENTS.md` |

---

> **Ghi chú**: Workflow này sẽ tự động update khi Vercel cập nhật rules mới.
