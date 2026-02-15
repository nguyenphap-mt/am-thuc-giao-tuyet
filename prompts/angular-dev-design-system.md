# Angular.dev Design System Reference
**Context**: Design standards for ERP SaaS following Angular.dev principles.
**Purpose**: Ensure consistent, modern UI/UX across all modules.
**Date Updated**: 2026-01-19

> [!IMPORTANT]
> **This replaces the Linear Design System (Dark Mode).**
> **Angular.dev Light Mode is now the DEFAULT for all components.**

---

## 1. Core Design Principles (Following Angular.dev)

### 1.1 Design Philosophy
- **Light Mode Default**: Clean, professional appearance
- **Angular Gradient Branding**: Pink-to-Purple signature gradient
- **Subtle Shadows**: Depth without heavy shadows
- **Content-First**: UI serves the content, not the other way around

### 1.2 Key Differences from Linear Design

| Aspect | Linear (Old) | Angular.dev (New) |
| :--- | :--- | :--- |
| **Default Mode** | Dark Mode | Light Mode |
| **Primary Color** | `#5E6AD2` (Blue) | `#C2185B` (Angular Pink) |
| **Background** | `#0A0A0A` | `#FFFFFF` |
| **Cards** | `#141414` | `#FAFAFA` |
| **Shadows** | None | Subtle card shadows |
| **Gradients** | None | Pink → Purple → Indigo |

---

## 2. Color System

### 2.1 Light Mode (DEFAULT - MANDATORY)

```scss
:root {
  /* Primary Gradient (Angular.dev signature) */
  --gradient-primary: linear-gradient(90deg, #c2185b 0%, #7b1fa2 50%, #512da8 100%);
  --gradient-hero: linear-gradient(135deg, #f8bbd9 0%, #e1bee7 50%, #d1c4e9 100%);
  --gradient-subtle: linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%);

  /* Background Colors */
  --bg-primary: #ffffff;
  --bg-secondary: #fafafa;
  --bg-tertiary: #f5f5f5;
  --bg-elevated: #ffffff;
  --bg-hover: rgba(0, 0, 0, 0.04);
  --bg-active: rgba(0, 0, 0, 0.08);

  /* Text Colors */
  --text-primary: #1a1a2e;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --text-inverse: #ffffff;

  /* Accent Colors (Angular brand) */
  --accent-primary: #c2185b;
  --accent-secondary: #7b1fa2;
  --accent-tertiary: #512da8;

  /* Semantic Colors */
  --color-success: #22c55e;
  --color-success-bg: #dcfce7;
  --color-warning: #f59e0b;
  --color-warning-bg: #fef3c7;
  --color-error: #ef4444;
  --color-error-bg: #fee2e2;
  --color-info: #3b82f6;
  --color-info-bg: #dbeafe;

  /* Border Colors */
  --border-primary: #e2e8f0;
  --border-secondary: #f1f5f9;
  --border-focus: var(--accent-primary);
}
```

### 2.2 Dark Mode (Optional - Toggle Only)

```scss
[data-theme="dark"] {
  --bg-primary: #0a0a0a;
  --bg-secondary: #141414;
  --bg-tertiary: #1f1f1f;
  --bg-elevated: #1a1a1a;
  --bg-hover: rgba(255, 255, 255, 0.08);
  --bg-active: rgba(255, 255, 255, 0.12);

  --text-primary: #fafafa;
  --text-secondary: #a1a1a1;
  --text-muted: #6b7280;

  --border-primary: #2d2d2d;
  --border-secondary: #1f1f1f;
}
```

---

## 3. Typography

### 3.1 Font Family
```scss
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
```

### 3.2 Font Sizes
| Token | Size | Usage |
| :--- | :--- | :--- |
| `--text-xs` | 12px | Labels, badges |
| `--text-sm` | 14px | Body text, inputs |
| `--text-base` | 16px | Default body |
| `--text-lg` | 18px | Section headers |
| `--text-xl` | 20px | Card titles |
| `--text-2xl` | 24px | Page titles |
| `--text-3xl` | 30px | Large headings |

### 3.3 Font Weights
| Token | Weight | Usage |
| :--- | :--- | :--- |
| `--font-normal` | 400 | Body text |
| `--font-medium` | 500 | Buttons, links |
| `--font-semibold` | 600 | Headings, labels |
| `--font-bold` | 700 | Titles, emphasis |

---

## 4. Component Specifications

### 4.1 Buttons

#### Primary Button (Gradient)
```scss
.btn-primary {
  background: var(--gradient-primary);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius-md); // 8px
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  
  &:active {
    transform: scale(0.98);
  }
}
```

#### Secondary Button (Outline)
```scss
.btn-secondary {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  padding: 10px 20px;
  border-radius: var(--radius-md);
  
  &:hover {
    background: var(--bg-hover);
  }
}
```

#### Icon Button
```scss
.btn-icon {
  width: 36px;
  height: 36px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  
  &:hover {
    background: var(--bg-hover);
    color: var(--accent-primary);
  }
}
```

### 4.2 Form Inputs

#### Text Input
```scss
.input {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--text-primary);
  
  &::placeholder {
    color: var(--text-muted);
  }
  
  &:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(194, 24, 91, 0.15);
  }
  
  &:disabled {
    background: var(--bg-tertiary);
    cursor: not-allowed;
  }
}
```

#### Select Dropdown
```scss
.select {
  padding: 10px 14px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--text-primary);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,..."); // Chevron icon
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 36px;
  
  &:focus {
    outline: none;
    border-color: var(--accent-primary);
  }
}
```

### 4.3 Inline Edit

```scss
.inline-edit {
  padding: 4px 8px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: text;
  
  &:hover {
    background: var(--bg-hover);
    border-color: var(--border-primary);
  }
  
  &:focus {
    background: var(--bg-primary);
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 2px rgba(194, 24, 91, 0.1);
  }
}
```

### 4.4 Cards

```scss
.card {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg); // 12px
  padding: 20px;
  box-shadow: var(--shadow-card);
  transition: all var(--duration-normal) var(--ease-out);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-card-hover);
  }
}

.card-gradient {
  background: var(--gradient-primary);
  color: white;
}
```

### 4.5 Data Tables

```scss
.data-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  
  th {
    padding: 14px 16px;
    text-align: left;
    font-weight: var(--font-semibold);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-primary);
    border-right: 1px solid rgba(0, 0, 0, 0.05); // Vertical divider
    
    &.clickable {
      cursor: pointer;
      user-select: none;
      
      &:hover {
        background: var(--bg-hover);
      }
    }
    
    &:last-child {
      border-right: none;
    }
  }
  
  td {
    padding: 14px 16px;
    font-size: var(--text-sm);
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-secondary);
    border-right: 1px solid rgba(0, 0, 0, 0.05);
    
    &:last-child {
      border-right: none;
    }
  }
  
  tr:hover {
    background: var(--bg-hover);
  }
}
```

### 4.6 Badges / Status Tags

```scss
.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: var(--radius-full); // 9999px - Pill shape
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.badge-success {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.badge-warning {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.badge-error {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.badge-info {
  background: var(--color-info-bg);
  color: var(--color-info);
}
```

### 4.7 Dropdown Menu

```scss
.dropdown {
  position: relative;
  
  .dropdown-trigger {
    // Button or clickable element
  }
  
  .dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 180px;
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-dropdown);
    z-index: var(--z-dropdown);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-4px);
    transition: all var(--duration-fast) var(--ease-out);
    
    &.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
  }
  
  .dropdown-item {
    padding: 8px 12px;
    font-size: var(--text-sm);
    color: var(--text-primary);
    cursor: pointer;
    
    &:hover {
      background: var(--bg-hover);
    }
    
    &:first-child {
      border-radius: var(--radius-md) var(--radius-md) 0 0;
    }
    
    &:last-child {
      border-radius: 0 0 var(--radius-md) var(--radius-md);
    }
  }
}
```

---

## 5. Motion & Animation

### 5.1 Timing System

| Type | Duration | Easing | CSS Variable |
| :--- | :--- | :--- | :--- |
| **Instant** | 50ms | - | `--duration-instant` |
| **Fast** | 100ms | `ease-out` | `--duration-fast` |
| **Normal** | 200ms | `ease-out` | `--duration-normal` |
| **Slow** | 300ms | `ease-in-out` | `--duration-slow` |
| **Slower** | 500ms | `ease-in-out` | `--duration-slower` |

### 5.2 Easing Functions

```scss
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

### 5.3 Component Animations

| Component | Animation | Duration |
| :--- | :--- | :--- |
| **Button hover** | translateY(-1px) + shadow | 100ms |
| **Button press** | scale(0.98) | 50ms |
| **Card hover** | translateY(-2px) + shadow | 200ms |
| **Modal open** | scale(0.95 → 1) + fadeIn | 200ms |
| **Modal close** | scale(1 → 0.95) + fadeOut | 150ms |
| **Dropdown open** | translateY(-4px → 0) + fadeIn | 150ms |
| **Toast slide in** | translateX(100% → 0) | 200ms |
| **Row hover** | background fade | 100ms |
| **Skeleton shimmer** | background-position loop | 1500ms |

### 5.4 Skeleton Loader Pattern

```scss
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-tertiary) 25%,
    var(--bg-primary) 50%,
    var(--bg-tertiary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 5.5 Angular Animations Module

```typescript
// animations/angular-dev.animations.ts
import { trigger, transition, style, animate } from '@angular/animations';

export const fadeIn = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('150ms ease-out', style({ opacity: 1 }))
  ])
]);

export const scaleIn = trigger('scaleIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.95)' }),
    animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
  ])
]);

export const slideUp = trigger('slideUp', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(8px)' }),
    animate('150ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
  ])
]);
```

---

## 6. Shadows

```scss
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
--shadow-card: 0 2px 8px rgba(0, 0, 0, 0.08);
--shadow-card-hover: 0 8px 24px rgba(0, 0, 0, 0.12);
--shadow-dropdown: 0 4px 16px rgba(0, 0, 0, 0.12);
```

---

## 7. Border Radius

| Token | Size | Usage |
| :--- | :--- | :--- |
| `--radius-none` | 0 | Sharp corners |
| `--radius-sm` | 4px | Small buttons, badges |
| `--radius-md` | 8px | Inputs, buttons |
| `--radius-lg` | 12px | Cards, tables |
| `--radius-xl` | 16px | Modals |
| `--radius-2xl` | 24px | Hero cards |
| `--radius-full` | 9999px | Pills, avatars |

---

## 8. Z-Index Scale

```scss
--z-dropdown: 100;
--z-sticky: 200;
--z-overlay: 300;
--z-modal: 400;
--z-popover: 500;
--z-toast: 600;
--z-tooltip: 700;
```

---

## 9. Spacing Scale

| Token | Size | Usage |
| :--- | :--- | :--- |
| `--space-1` | 4px | Tight spacing |
| `--space-2` | 8px | Icon gaps |
| `--space-3` | 12px | Small gaps |
| `--space-4` | 16px | Default |
| `--space-5` | 20px | Section gaps |
| `--space-6` | 24px | Card padding |
| `--space-8` | 32px | Page padding |

---

## 10. Material Icons

All icons must use **Material Icons Outlined**:

```html
<link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet">

<!-- Usage -->
<span class="material-icons-outlined">receipt_long</span>
<span class="material-icons-outlined">add</span>
<span class="material-icons-outlined">edit</span>
<span class="material-icons-outlined">delete</span>
<span class="material-icons-outlined">visibility</span>
```

Icon sizes:
- Small: 18px
- Default: 24px
- Large: 32px

---

## 11. Component Checklist

| Component | Status | Notes |
| :--- | :---: | :--- |
| Buttons (Primary, Secondary, Icon) | ✅ | Gradient primary |
| Text Input | ✅ | Focus ring with accent |
| Select Dropdown | ✅ | Custom chevron |
| Inline Edit | ✅ | Click-to-edit pattern |
| Cards | ✅ | Shadow + hover lift |
| Data Tables | ✅ | Sortable headers, dividers |
| Badges | ✅ | Semantic colors |
| Dropdown Menu | ✅ | Slide animation |
| Modal | ✅ | Scale animation |
| Toast | ✅ | Slide from right |
| Skeleton Loader | ✅ | Shimmer animation |
| Tooltip | ⬜ | Planned |
| Date Picker | ⬜ | Planned |
| Tabs | ⬜ | Planned |

---

## 12. Verification Checklist

When reviewing UI components, verify:

| Check | Pass Criteria |
| :--- | :--- |
| **Background** | Uses Light Mode (`#ffffff`, `#fafafa`) |
| **Primary Button** | Uses gradient-primary (pink → purple) |
| **Focus States** | Has focus ring with accent color |
| **Animations** | ≤200ms for most, skeleton 1.5s |
| **Icons** | Material Icons Outlined |
| **Shadows** | Uses card shadows |
| **Typography** | Inter font, correct weights |
| **Spacing** | Consistent with token scale |

---

## 13. Reference

- **Design Tokens**: `frontend/src/styles/design-tokens.scss`
- **Animations**: `frontend/src/styles/_animations.scss`
- **Angular.dev**: https://angular.dev/

