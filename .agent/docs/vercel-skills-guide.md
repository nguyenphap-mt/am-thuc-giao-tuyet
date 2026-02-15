# Hướng Dẫn Sử Dụng Vercel Agent Skills

> **Phiên bản**: 1.0  
> **Cập nhật**: 01/02/2026  
> **Tác giả**: AI Workforce

---

## Mục Lục

1. [Giới Thiệu](#1-giới-thiệu)
2. [Danh Sách Skills](#2-danh-sách-skills)
3. [Danh Sách Workflows](#3-danh-sách-workflows)
4. [Hướng Dẫn Từng Workflow](#4-hướng-dẫn-từng-workflow)
5. [Best Practices](#5-best-practices)
6. [FAQ](#6-faq)

---

## 1. Giới Thiệu

### 1.1 Vercel Agent Skills là gì?

Vercel Agent Skills là bộ sưu tập chính thức từ Vercel chứa các **skills** cho AI coding agents. Mỗi skill là một tập hợp các:
- **Instructions**: Hướng dẫn chi tiết cho AI
- **Rules**: Các quy tắc cần tuân thủ
- **Scripts**: Các scripts hỗ trợ tự động hóa

### 1.2 Nguồn gốc

| Thông tin | Chi tiết |
| :--- | :--- |
| **Repository** | [github.com/vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) |
| **Format** | Agent Skills theo chuẩn [agentskills.io](https://agentskills.io/) |
| **License** | MIT |

### 1.3 Skills đã cài đặt

Tất cả skills được lưu trong: `.agent/skills/`

```
.agent/skills/
├── react-best-practices/      # 57 rules, React/Next.js performance
├── web-design-guidelines/     # 100+ rules, UI/UX compliance
├── composition-patterns/      # React composition patterns
└── react-native-skills/       # React Native/Expo best practices
```

---

## 2. Danh Sách Skills

### 2.1 react-best-practices

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Mô tả** | React/Next.js performance optimization |
| **Số rules** | 57 rules |
| **Categories** | 8 (theo priority) |
| **Skill path** | `.agent/skills/react-best-practices/SKILL.md` |

**8 Categories theo Priority**:

| Priority | Category | Impact |
| :---: | :--- | :--- |
| 1 | Eliminating Waterfalls | CRITICAL |
| 2 | Bundle Size Optimization | CRITICAL |
| 3 | Server-Side Performance | HIGH |
| 4 | Client-Side Data Fetching | MEDIUM-HIGH |
| 5 | Re-render Optimization | MEDIUM |
| 6 | Rendering Performance | MEDIUM |
| 7 | JavaScript Performance | LOW-MEDIUM |
| 8 | Advanced Patterns | LOW |

**Khi nào sử dụng**:
- ✅ Viết mới React components
- ✅ Viết mới Next.js pages
- ✅ Review code về performance
- ✅ Optimize bundle size
- ✅ Refactor React/Next.js code

---

### 2.2 web-design-guidelines

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Mô tả** | Web Interface Guidelines compliance |
| **Số rules** | 100+ rules |
| **Categories** | 15 |
| **Skill path** | `.agent/skills/web-design-guidelines/SKILL.md` |

**15 Categories**:
1. Accessibility
2. Focus States
3. Forms
4. Animation
5. Typography
6. Content Handling
7. Images
8. Performance
9. Navigation & State
10. Touch & Interaction
11. Safe Areas & Layout
12. Dark Mode & Theming
13. Locale & i18n
14. Hydration Safety
15. Hover & Interactive States

**Khi nào sử dụng**:
- ✅ "Review my UI"
- ✅ "Check accessibility"
- ✅ "Audit design"
- ✅ "Review UX"
- ✅ "Check my site against best practices"

---

### 2.3 composition-patterns

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Mô tả** | React composition patterns |
| **Số rules** | ~10 rules |
| **Categories** | 4 |
| **Skill path** | `.agent/skills/composition-patterns/SKILL.md` |

**4 Categories**:

| Priority | Category | Impact |
| :---: | :--- | :--- |
| 1 | Component Architecture | HIGH |
| 2 | State Management | MEDIUM |
| 3 | Implementation Patterns | MEDIUM |
| 4 | React 19 APIs | MEDIUM |

**Khi nào sử dụng**:
- ✅ Refactor components với nhiều boolean props
- ✅ Build reusable component libraries
- ✅ Design flexible component APIs
- ✅ Review component architecture

---

### 2.4 react-native-skills

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Mô tả** | React Native/Expo best practices |
| **Số rules** | ~40 rules |
| **Categories** | 8 |
| **Skill path** | `.agent/skills/react-native-skills/SKILL.md` |

**8 Categories**:

| Priority | Category | Impact |
| :---: | :--- | :--- |
| 1 | List Performance | CRITICAL |
| 2 | Animation | HIGH |
| 3 | Navigation | HIGH |
| 4 | UI Patterns | HIGH |
| 5 | State Management | MEDIUM |
| 6 | Rendering | MEDIUM |
| 7 | Monorepo | MEDIUM |
| 8 | Configuration | LOW |

**Khi nào sử dụng**:
- ✅ Build React Native/Expo apps
- ✅ Optimize list performance
- ✅ Implement animations với Reanimated
- ✅ Work với native modules

---

## 3. Danh Sách Workflows

4 workflows mới được tạo để tận dụng Vercel Skills:

| Workflow | Mô tả | Skills sử dụng |
| :--- | :--- | :--- |
| `/react-perf-review` | React/Next.js performance review | react-best-practices, composition-patterns |
| `/ui-accessibility-audit` | UI accessibility audit | web-design-guidelines |
| `/react-native-review` | React Native/Expo review | react-native-skills |
| `/frontend-quality-gate` | Comprehensive frontend quality gate | ALL skills |

---

## 4. Hướng Dẫn Từng Workflow

### 4.1 /react-perf-review

**Mục đích**: Review performance cho React/Next.js codebase.

**Cách sử dụng**:
```
/react-perf-review {path}
```

**Ví dụ**:
```
/react-perf-review src/components
/react-perf-review src/app
```

**Output**: Performance Report với:
- Score theo 8 categories
- Issues by priority (CRITICAL → LOW)
- Recommendations

**Chi tiết**: Xem [react-perf-review-guide.md](./react-perf-review-guide.md)

---

### 4.2 /ui-accessibility-audit

**Mục đích**: Audit UI về accessibility và UX.

**Cách sử dụng**:
```
/ui-accessibility-audit {path}
```

**Ví dụ**:
```
/ui-accessibility-audit src/components
/ui-accessibility-audit app/
```

**Output**: Terse findings theo format `file:line`:
```
src/Button.tsx:42 - icon button missing aria-label
src/Modal.tsx:12 - missing overscroll-behavior: contain
```

**Chi tiết**: Xem [ui-accessibility-audit-guide.md](./ui-accessibility-audit-guide.md)

---

### 4.3 /react-native-review

**Mục đích**: Review performance cho React Native/Expo apps.

**Cách sử dụng**:
```
/react-native-review {path}
```

**Ví dụ**:
```
/react-native-review src/screens
/react-native-review app/
```

**Output**: Mobile Performance Report với:
- Score theo 8 categories
- FlashList compliance check
- Animation optimization tips

**Chi tiết**: Xem [react-native-review-guide.md](./react-native-review-guide.md)

---

### 4.4 /frontend-quality-gate

**Mục đích**: Comprehensive quality gate trước release.

**Cách sử dụng**:
```
/frontend-quality-gate {path} --platform {platform} --release {type}
```

**Ví dụ**:
```
/frontend-quality-gate src/ --platform web --release minor
/frontend-quality-gate src/ --platform both --release major
```

**Output**: Complete Quality Report với:
- 6 Phase scores
- Go/No-Go decision
- Blocking issues list

**Chi tiết**: Xem [frontend-quality-gate-guide.md](./frontend-quality-gate-guide.md)

---

## 5. Best Practices

### 5.1 Khi nào sử dụng workflow nào?

| Tình huống | Workflow khuyến nghị |
| :--- | :--- |
| Review 1 component React | `/react-perf-review` |
| Trước merge PR | `/react-perf-review` hoặc `/ui-accessibility-audit` |
| Trước release | `/frontend-quality-gate` |
| Audit accessibility | `/ui-accessibility-audit` |
| Review React Native app | `/react-native-review` |
| Full frontend audit | `/frontend-quality-gate` |

### 5.2 Quy trình khuyến nghị

```mermaid
graph TD
    A[Development] --> B{Feature Complete?}
    B -->|No| A
    B -->|Yes| C[/react-perf-review]
    C --> D{Score >= 7?}
    D -->|No| E[Fix Issues]
    E --> C
    D -->|Yes| F[/ui-accessibility-audit]
    F --> G{Pass?}
    G -->|No| E
    G -->|Yes| H[/frontend-quality-gate]
    H --> I{GO?}
    I -->|No| E
    I -->|Yes| J[Release]
```

### 5.3 Tích hợp CI/CD

Các workflows output JSON reports có thể tích hợp vào CI:

```yaml
# .github/workflows/frontend-quality.yml
steps:
  - name: Run Quality Gate
    run: |
      # Trigger workflow và parse output
      # Check .reports/quality-gate/*.json
```

---

## 6. FAQ

### Q1: Skills tự động load khi nào?

**A**: Skills được load tự động khi:
- AI detect task liên quan đến skill
- User gọi workflow sử dụng skill
- User yêu cầu review với keywords như "performance", "accessibility"

### Q2: Làm sao biết skill nào được sử dụng?

**A**: Mỗi workflow file có header `skills_used` liệt kê skills:
```yaml
skills_used: ["react-best-practices", "composition-patterns"]
```

### Q3: Report được lưu ở đâu?

**A**: Tất cả reports lưu trong `.reports/`:
```
.reports/
├── react-perf/          # /react-perf-review outputs
├── ui-audit/            # /ui-accessibility-audit outputs
├── react-native/        # /react-native-review outputs
└── quality-gate/        # /frontend-quality-gate outputs
```

### Q4: Làm sao update skills lên phiên bản mới?

**A**: Chạy lệnh:
```bash
npx skills update vercel-labs/agent-skills
```

### Q5: Có thể customize rules không?

**A**: Có, edit trực tiếp trong:
- `SKILL.md`: Instructions chính
- `AGENTS.md`: Full rules compiled
- `rules/*.md`: Individual rules

---

## Liên Kết Nhanh

| Tài liệu | Đường dẫn |
| :--- | :--- |
| React Perf Review Guide | [react-perf-review-guide.md](./react-perf-review-guide.md) |
| UI Accessibility Audit Guide | [ui-accessibility-audit-guide.md](./ui-accessibility-audit-guide.md) |
| React Native Review Guide | [react-native-review-guide.md](./react-native-review-guide.md) |
| Frontend Quality Gate Guide | [frontend-quality-gate-guide.md](./frontend-quality-gate-guide.md) |
| Workflows Directory | `../.agent/workflows/` |
| Skills Directory | `../.agent/skills/` |

---

> **Ghi chú**: Tài liệu này được tự động generate bởi AI Workforce. Nếu có thắc mắc, liên hệ team Development.
