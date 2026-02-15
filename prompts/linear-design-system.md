# Linear Design System Reference
**Context**: Design standards for ERP SaaS following Linear.app principles.
**Purpose**: Ensure consistent, high-quality UX across all modules.

---

## 1. Core Design Principles (Following Linear.app)

### 1.1 Elegance & Simplicity
- **Minimal Visual Noise**: Remove unnecessary elements.
- **Clean Typography**: Use Inter or SF Pro font family.
- **Purposeful Whitespace**: Balanced, not excessive.

### 1.2 Keyboard-First Approach
- **Full Keyboard Control**: Every action possible without mouse.
- **Hover Hints**: Show keyboard shortcuts on hover.
- **Muscle Memory**: Consistent shortcuts across modules.

### 1.3 Speed & Responsiveness
- **Instant Feedback**: < 100ms response for UI interactions.
- **Optimistic Updates**: Update UI before server confirms.
- **Progressive Loading**: Show skeleton loaders, not spinners.

### 1.4 Information Density
- **Data-Rich Views**: Show more info, less scrolling.
- **Contextual Details**: Side panels instead of page navigation.
- **Compact Mode**: Option for power users.

---

## 2. Command Palette (Cmd+K)

### 2.1 Specification
- **Trigger**: `Cmd+K` (Mac) / `Ctrl+K` (Windows)
- **Location**: Centered modal overlay
- **Features**:
  - Fuzzy search across all entities
  - Recent commands history
  - Grouped by category
  - Keyboard navigation (↑↓ to navigate, Enter to select)

### 2.2 Command Categories
| Category | Examples |
| :--- | :--- |
| Navigation | "Go to Inventory", "Open Item ABC" |
| Actions | "Create New Item", "Generate Cut Ticket" |
| Settings | "Toggle Dark Mode", "Change Language" |
| Search | "Find SKU 12345", "Search Customer XYZ" |

### 2.3 Implementation (Angular)
```typescript
// command-palette.component.ts
import { Component, HostListener, inject } from '@angular/core';
import { CommandPaletteService } from './command-palette.service';

@Component({
  selector: 'app-command-palette',
  standalone: true,
  template: `...`
})
export class CommandPaletteComponent {
  private cmdService = inject(CommandPaletteService);
  
  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.cmdService.open();
    }
  }
}
```

---

## 3. Global Keyboard Shortcuts

### 3.1 Navigation
| Shortcut | Action |
| :--- | :--- |
| `G then I` | Go to Inventory |
| `G then S` | Go to Sales |
| `G then P` | Go to Projects |
| `G then F` | Go to Finance |
| `G then C` | Go to Customers |

### 3.2 Actions
| Shortcut | Action |
| :--- | :--- |
| `N` | New Item (context-aware) |
| `E` | Edit selected |
| `D` | Delete selected |
| `Esc` | Cancel / Close |
| `?` | Show all shortcuts |

### 3.3 Grid Navigation
| Shortcut | Action |
| :--- | :--- |
| `↑ ↓ ← →` | Navigate cells |
| `Enter` | Edit / Open |
| `Space` | Toggle selection |
| `Ctrl+A` | Select all |
| `Ctrl+C/V` | Copy/Paste |

---

## 4. Color System

### 4.1 Dark Mode (Default)
| Token | Value | Usage |
| :--- | :--- | :--- |
| `--bg-primary` | `#0A0A0A` | Main background |
| `--bg-secondary` | `#141414` | Cards, panels |
| `--bg-tertiary` | `#1F1F1F` | Hover states |
| `--text-primary` | `#FAFAFA` | Main text |
| `--text-secondary` | `#A1A1A1` | Muted text |
| `--accent` | `#5E6AD2` | Primary actions |
| `--success` | `#4ADE80` | Success states |
| `--warning` | `#FACC15` | Warnings |
| `--error` | `#F87171` | Errors |

### 4.2 Light Mode
| Token | Value | Usage |
| :--- | :--- | :--- |
| `--bg-primary` | `#FFFFFF` | Main background |
| `--bg-secondary` | `#F8F8F8` | Cards, panels |
| `--text-primary` | `#171717` | Main text |
| `--accent` | `#5E6AD2` | Primary actions |

---

## 5. Layout Structure

### 5.1 Default Layout
```
┌──────────────────────────────────────────────────────────────────┐
│  [Logo]  [Sidebar Toggle]              [Search] [User] [⚙️]     │  <- Top Bar (48px)
├──────┬───────────────────────────────────────────────────────────┤
│      │                                                           │
│  📦  │   [Breadcrumb]                              [Actions]     │
│  💰  │   ═══════════════════════════════════════════════════     │
│  🏭  │                                                           │
│  📊  │   [ Main Content Area ]                                   │
│  👥  │   [ AG Grid / Form / Dashboard ]                          │
│      │                                                           │
│      │                                                           │
│      ├───────────────────────────────────────────────────────────┤
│ Side │   [ Context Drawer - Optional ]                           │
│ bar  │   [ Shows on row focus ]                                  │
│ 64px │                                                           │
└──────┴───────────────────────────────────────────────────────────┘
```

### 5.2 Sidebar
- **Width**: 64px (collapsed) / 240px (expanded)
- **Toggle**: Hover to expand or click to pin
- **Icons**: Lucide or Heroicons
- **Active Indicator**: Left border accent color

---

## 6. Component Patterns

### 6.1 Context Menu (Right-Click)
- Appear at cursor position
- Show relevant actions only
- Include keyboard shortcuts
- Max 10 items, use submenus for more

### 6.2 Tables (AG Grid)
- **Row Height**: 36px (compact) / 44px (normal)
- **Header Height**: 40px
- **Hover**: Subtle background change
- **Selection**: Checkbox + row highlight
- **Sorting**: Click header, show indicator

### 6.3 Forms
- **Layout**: Single column, max 600px width
- **Labels**: Above input (not inline)
- **Validation**: Inline errors below field
- **Actions**: Sticky footer with Save/Cancel

### 6.4 Modals
- **Size**: Small (400px), Medium (600px), Large (800px)
- **Close**: Click outside, Esc key, X button
- **Animation**: Fade + Scale (150ms)

---

## 7. Motion & Animation (Enhanced)

### 7.1 Animation Timing Configuration
| Type | Duration | Easing | CSS Variable |
| :--- | :--- | :--- | :--- |
| **Micro** (hover, focus) | 100ms | `ease-out` | `--motion-micro` |
| **Small** (modal, toast) | 150ms | `ease-out` | `--motion-small` |
| **Medium** (page, panel) | 200ms | `ease-in-out` | `--motion-medium` |
| **Large** (route change) | 300ms | `cubic-bezier(0.4, 0, 0.2, 1)` | `--motion-large` |

### 7.2 Motion Presets (Angular Animations)
```typescript
// lib/animations/motion-presets.ts
import { trigger, transition, style, animate, state, query, stagger } from '@angular/animations';

export const fadeIn = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('150ms ease-out', style({ opacity: 1 }))
  ]),
  transition(':leave', [
    animate('150ms ease-in', style({ opacity: 0 }))
  ])
]);

export const slideUp = trigger('slideUp', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(8px)' }),
    animate('150ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
  ]),
  transition(':leave', [
    animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(8px)' }))
  ])
]);

export const scaleIn = trigger('scaleIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.95)' }),
    animate('150ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
  ]),
  transition(':leave', [
    animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))
  ])
]);

export const slideFromRight = trigger('slideFromRight', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(20px)' }),
    animate('200ms ease-in-out', style({ opacity: 1, transform: 'translateX(0)' }))
  ]),
  transition(':leave', [
    animate('200ms ease-in-out', style({ opacity: 0, transform: 'translateX(20px)' }))
  ])
]);

export const staggerList = trigger('staggerList', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(10px)' }),
      stagger('50ms', [
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ], { optional: true })
  ])
]);

// Usage in component
@Component({
  animations: [fadeIn, slideUp, scaleIn]
})
```

### 7.3 Element-Specific Animations
| Element | Animation | Duration |
| :--- | :--- | :--- |
| **Button hover** | Background fade | 100ms |
| **Button press** | Scale down 0.98 | 50ms |
| **Dropdown open** | Slide down + fade | 150ms |
| **Modal open** | Scale + fade | 150ms |
| **Modal close** | Scale + fade | 100ms |
| **Toast appear** | Slide up | 200ms |
| **Toast dismiss** | Slide right | 150ms |
| **Row hover** | Background fade | 80ms |
| **Row expand** | Height animate | 200ms |
| **Sidebar collapse** | Width animate | 200ms |
| **Tab switch** | Underline slide | 150ms |
| **Page transition** | Fade + slight slide | 200ms |
| **Loading skeleton** | Shimmer pulse | 1.5s loop |

### 7.4 CSS Animation Variables
```scss
// styles/_animations.scss
:root {
  --motion-micro: 100ms;
  --motion-small: 150ms;
  --motion-medium: 200ms;
  --motion-large: 300ms;
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}

// Reusable animation mixins
@mixin transition-micro {
  transition: all var(--motion-micro) var(--ease-out);
}

@mixin transition-small {
  transition: all var(--motion-small) var(--ease-out);
}

// Button hover effect
.btn {
  @include transition-micro;
  
  &:hover {
    transform: translateY(-1px);
  }
  
  &:active {
    transform: scale(0.98);
  }
}
```

### 7.5 Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 7.6 Gesture Animations
| Gesture | Animation | Use Case |
| :--- | :--- | :--- |
| **Drag** | Follow cursor with spring | Kanban cards |
| **Swipe left** | Reveal actions | Mobile rows |
| **Swipe right** | Complete/Archive | Mobile tasks |
| **Pinch** | Zoom level | Gantt chart |
| **Long press** | Context menu | Mobile touch |

---

## 8. Accessibility (a11y)

### 8.1 Requirements
- **Contrast**: Minimum 4.5:1 for text
- **Focus**: Visible focus rings on all interactive elements
- **Screen Reader**: ARIA labels for icons
- **Reduced Motion**: Respect `prefers-reduced-motion`

### 8.2 Focus Order
- Logical tab order (top-to-bottom, left-to-right)
- Skip links for repetitive navigation
- Trap focus in modals

---

## 9. Linear.app Feature Checklist

> **Purpose**: Ensure feature parity with Linear.app UX patterns

### 9.1 Navigation Features
| Feature | Description | Status |
| :--- | :--- | :---: |
| **Command Palette** | Cmd+K universal search | ✅ |
| **Keyboard Navigation** | Full keyboard control | ✅ |
| **Breadcrumbs** | Hierarchical navigation | ✅ |
| **Back/Forward** | Browser-style navigation | ⬜ |
| **Quick Switcher** | Switch between views fast | ⬜ |

### 9.2 View Systems
| Feature | Description | Status |
| :--- | :--- | :---: |
| **Board View** | Kanban-style columns | ⬜ |
| **List View** | Table/Grid view | ✅ |
| **Timeline View** | Gantt chart | ⬜ |
| **Calendar View** | Date-based layout | ⬜ |
| **Custom Views** | Save filter+sort as view | ⬜ |
| **View Sharing** | Share view URL with team | ⬜ |

### 9.3 Filter & Sort System
| Feature | Description | Status |
| :--- | :--- | :---: |
| **Quick Filters** | One-click filter buttons | ⬜ |
| **Advanced Filters** | Multi-condition filters | ⬜ |
| **Filter Persistence** | Remember filter per page | ⬜ |
| **Sort Options** | Multi-column sort | ✅ |
| **Group By** | Group rows by field | ⬜ |
| **Save Filters** | Save as custom view | ⬜ |

### 9.4 Bulk Operations
| Feature | Description | Status |
| :--- | :--- | :---: |
| **Multi-Select** | Shift/Ctrl click | ⬜ |
| **Bulk Edit** | Edit multiple items | ⬜ |
| **Bulk Delete** | Delete multiple items | ⬜ |
| **Bulk Assign** | Assign to user/project | ⬜ |
| **Selection Actions Bar** | Floating action bar | ⬜ |

### 9.5 Real-time Features
| Feature | Description | Status |
| :--- | :--- | :---: |
| **Live Updates** | WebSocket data sync | ⬜ |
| **Presence Indicators** | Who's viewing | ⬜ |
| **Optimistic Updates** | Instant UI feedback | ⬜ |
| **Conflict Resolution** | Handle concurrent edits | ⬜ |

### 9.6 Productivity Features
| Feature | Description | Status |
| :--- | :--- | :---: |
| **Inline Editing** | Click to edit in place | ⬜ |
| **Quick Add** | Add item without modal | ⬜ |
| **Duplicate** | Clone item with Ctrl+D | ⬜ |
| **Undo/Redo** | Ctrl+Z/Ctrl+Y | ⬜ |
| **History** | View change history | ⬜ |
| **Templates** | Create from template | ⬜ |

### 9.7 Cycles & Sprints (Linear-specific)
| Feature | ERP Equivalent | Status |
| :--- | :--- | :---: |
| **Cycles** | Work Orders / Phases | ⬜ |
| **Milestones** | Project Milestones | ⬜ |
| **Progress Tracking** | WIP Dashboard | ✅ |
| **Burndown Chart** | Sprint velocity | ⬜ |

### 9.8 Notifications & Activity
| Feature | Description | Status |
| :--- | :--- | :---: |
| **Activity Feed** | Recent activity stream | ⬜ |
| **In-App Notifications** | Bell icon notifications | ⬜ |
| **Email Notifications** | Configurable alerts | ⬜ |
| **Mentions** | @user in comments | ⬜ |
| **Subscriptions** | Follow items for updates | ⬜ |

---

## 10. Implementation Shortcuts

### 10.1 New Shortcuts (Linear-style)
| Shortcut | Action | Context |
| :--- | :--- | :--- |
| `C` | Create new item | Any list view |
| `X` | Toggle selection | Row focused |
| `B` | Switch to Board view | List page |
| `L` | Switch to List view | Board page |
| `F` | Open filter panel | Any page |
| `S` | Open sort options | Any page |
| `/` | Focus search | Any page |
| `Shift+?` | Show all shortcuts | Global |
| `Cmd+Shift+P` | Toggle compact mode | Global |
| `Cmd+\` | Toggle sidebar | Global |

### 10.2 Vim-style Navigation (Optional)
| Shortcut | Action |
| :--- | :--- |
| `j` | Move down |
| `k` | Move up |
| `h` | Collapse/Left |
| `l` | Expand/Right |
| `gg` | Go to first |
| `G` | Go to last |

---

## 11. Component Library Checklist

| Component | Required | Status |
| :--- | :--- | :---: |
| `CommandPalette` | ✅ | ⬜ |
| `DataTable` (AG Grid) | ✅ | ✅ |
| `KanbanBoard` | ✅ | ⬜ |
| `GanttChart` | ✅ | ⬜ |
| `FilterPanel` | ✅ | ⬜ |
| `BulkActionBar` | ✅ | ⬜ |
| `ContextMenu` | ✅ | ⬜ |
| `Toast` | ✅ | ✅ |
| `Modal` | ✅ | ✅ |
| `Drawer` | ✅ | ⬜ |
| `Skeleton` | ✅ | ⬜ |
| `ProgressBar` | ✅ | ⬜ |
| `Badge` | ✅ | ✅ |
| `Avatar` | ✅ | ⬜ |
| `Tooltip` | ✅ | ✅ |
| `Popover` | ✅ | ⬜ |
| `DatePicker` | ✅ | ⬜ |
| `RichTextEditor` | ✅ | ⬜ |
