---
name: Data Table UI/UX Pattern
description: Chuẩn hóa giao diện bảng dữ liệu theo Angular.dev Design System. Dựa trên mẫu QuoteListComponent đã được verify và production-ready.
---

# Data Table UI/UX Pattern

> **Reference Component**: `frontend/src/app/quote/components/quote-list/quote-list.component.ts`  
> **Design System**: Angular.dev Light Mode (design-tokens.scss)

## 1. Cấu Trúc Tổng Quan (Page Layout)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Page Header                                                         │
│ ┌─────────────────────────────────────────┐ ┌────────────────────┐  │
│ │ 📋 Title + Subtitle                     │ │ + Primary Button   │  │
│ └─────────────────────────────────────────┘ └────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│ KPI Cards (Grid 4 columns)                                          │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│ │ KPI 1    │ │ KPI 2    │ │ KPI 3    │ │ KPI 4    │                │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘                │
├─────────────────────────────────────────────────────────────────────┤
│ Filters Section                                                     │
│ ┌────────────────────────────┐  ┌───────────────────────────────┐  │
│ │ 🔍 Search Box              │  │ Tab | Tab | Tab | Tab | Tab   │  │
│ └────────────────────────────┘  └───────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│ Data Table (with border-radius container)                           │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ Header Row (uppercase, sortable)                              │  │
│ ├───────────────────────────────────────────────────────────────┤  │
│ │ Data Row (hover effect, selectable)                           │  │
│ │ Data Row                                                      │  │
│ │ Data Row                                                      │  │
│ └───────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│ Pagination                                                          │
│ Hiển thị X / Y items           ◀ 1/N Trang ▶                       │
├─────────────────────────────────────────────────────────────────────┤
│ Keyboard Shortcuts Hint (Fixed bottom-right)                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Design Tokens (CSS Variables)

### 2.1 Colors
```css
/* Primary Gradient (Angular brand) */
--gradient-primary: linear-gradient(90deg, #c2185b 0%, #7b1fa2 50%, #512da8 100%);

/* Background Colors */
--bg-primary: #ffffff;
--bg-secondary: #fafafa;
--bg-tertiary: #f5f5f5;
--bg-hover: rgba(0, 0, 0, 0.04);
--bg-active: rgba(0, 0, 0, 0.08);

/* Text Colors */
--text-primary: #1a1a2e;
--text-secondary: #64748b;
--text-muted: #94a3b8;

/* Accent Colors */
--accent-primary: #c2185b;

/* Semantic Colors */
--color-success: #22c55e;    --color-success-bg: #dcfce7;
--color-warning: #f59e0b;    --color-warning-bg: #fef3c7;
--color-error: #ef4444;      --color-error-bg: #fee2e2;
--color-info: #3b82f6;       --color-info-bg: #dbeafe;

/* Border Colors */
--border-primary: #e2e8f0;
--border-secondary: #f1f5f9;
```

### 2.2 Typography
```css
--font-sans: 'Inter', -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', monospace;

--text-xs: 0.75rem;   /* 12px */
--text-sm: 0.875rem;  /* 14px */
--text-base: 1rem;    /* 16px */
--text-lg: 1.125rem;  /* 18px */
--text-2xl: 1.5rem;   /* 24px */
--text-3xl: 1.875rem; /* 30px */

--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### 2.3 Spacing & Radius
```css
--radius-sm: 0.25rem;   /* 4px - buttons */
--radius-md: 0.5rem;    /* 8px - inputs */
--radius-lg: 0.75rem;   /* 12px - cards */
--radius-full: 9999px;  /* Pills/badges */

--shadow-card: 0 2px 8px rgba(0, 0, 0, 0.08);
--shadow-card-hover: 0 8px 24px rgba(0, 0, 0, 0.12);
```

### 2.4 Animation
```css
--duration-fast: 100ms;
--duration-normal: 200ms;
--ease-out: cubic-bezier(0, 0, 0.2, 1);
```

---

## 3. Component Patterns

### 3.1 Page Container
```css
.data-page {
  padding: 24px 32px;
  max-width: 1400px;
  margin: 0 auto;
}
```

### 3.2 Page Header
```html
<div class="page-header">
  <div class="header-left">
    <h1>📋 Title</h1>
    <span class="subtitle">Description text</span>
  </div>
  <button class="btn-primary" (click)="createNew()">
    <span>+</span> Tạo Mới
  </button>
</div>
```

```css
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h1 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin: 0;
}

.subtitle {
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.btn-primary {
  background: var(--gradient-primary);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all var(--duration-fast) var(--ease-out);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
```

### 3.3 KPI Cards
```html
<div class="kpi-cards">
  <div class="kpi-card" *ngFor="let kpi of kpiCards">
    <div class="kpi-value" [style.color]="kpi.color">{{ kpi.value }}</div>
    <div class="kpi-label">{{ kpi.label }}</div>
    <div class="kpi-change" [class.positive]="kpi.change > 0">
      {{ kpi.changeText }}
    </div>
  </div>
</div>
```

```typescript
// Data Structure
kpiCards = [
  { label: 'Tổng', value: 45, change: 5, changeText: 'tuần này', color: '#5E6AD2' },
  { label: 'Chờ Duyệt', value: 4, change: 2, changeText: 'hôm nay', color: '#FACC15' },
  { label: 'Đã Duyệt', value: 0, change: 0, changeText: '₫0M', color: '#4ADE80' },
  { label: 'Từ Chối', value: 20, change: -3, changeText: 'vs tuần trước', color: '#F87171' }
];
```

```css
.kpi-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.kpi-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-card);
  transition: all var(--duration-normal) var(--ease-out);
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}

.kpi-value {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  margin-bottom: 4px;
}

.kpi-label {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  margin-bottom: 8px;
}

.kpi-change {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.kpi-change.positive { color: var(--color-success); }
.kpi-change.negative { color: var(--color-error); }
```

### 3.4 Filters (Search + Tabs)
```html
<div class="filters">
  <div class="search-box">
    <span class="search-icon">🔍</span>
    <input type="text" 
           placeholder="Tìm kiếm..." 
           [(ngModel)]="searchTerm" 
           (input)="filterData()">
  </div>
  <div class="filter-tabs">
    <button *ngFor="let tab of statusTabs"
            [class.active]="activeTab === tab.value"
            (click)="setTab(tab.value)">
      {{ tab.label }}
    </button>
  </div>
</div>
```

```css
.filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-box input {
  width: 100%;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  padding: 12px 12px 12px 40px;
  color: var(--text-primary);
  font-size: var(--text-sm);
  outline: none;
  transition: border-color var(--duration-fast);
}

.search-box input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(194, 24, 91, 0.15);
}

.filter-tabs {
  display: flex;
  gap: 8px;
}

.filter-tabs button {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  color: var(--text-secondary);
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-sm);
  transition: all var(--duration-fast);
}

.filter-tabs button:hover {
  background: var(--bg-hover);
}

.filter-tabs button.active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: white;
}
```

### 3.5 Data Table
```html
<div class="table-container" *ngIf="!isLoading">
  <table class="data-table">
    <thead>
      <tr>
        <th (click)="sortBy('code')">Mã</th>
        <th (click)="sortBy('name')">Tên</th>
        <th>Ngày</th>
        <th>Số lượng</th>
        <th>Tổng Tiền</th>
        <th>Trạng Thái</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr *ngFor="let item of filteredData"
          (click)="viewItem(item)"
          [class.selected]="selectedItem?.id === item.id">
        <td class="code">{{ item.code }}</td>
        <td>{{ item.name }}</td>
        <td>{{ item.date | date:'dd/MM/yyyy' }}</td>
        <td class="number">{{ item.quantity }}</td>
        <td class="number">{{ item.total | number:'1.0-0' }} đ</td>
        <td>
          <span class="status-badge" [class]="item.status">
            {{ getStatusLabel(item.status) }}
          </span>
        </td>
        <td class="actions">
          <button class="action-btn" (click)="editItem(item, $event)">✏️</button>
          <button class="action-btn delete" (click)="deleteItem(item, $event)">🗑️</button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

```css
.table-container {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  text-align: left;
  padding: 16px;
  font-weight: var(--font-semibold);
  font-size: var(--text-xs);
  text-transform: uppercase;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
  border-right: 1px solid rgba(0, 0, 0, 0.05);
  cursor: pointer;
  user-select: none;
}

.data-table th:last-child { border-right: none; }

.data-table th:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.data-table td {
  padding: 16px;
  font-size: var(--text-sm);
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-secondary);
  border-right: 1px solid rgba(0, 0, 0, 0.05);
}

.data-table td:last-child { border-right: none; }

.data-table tbody tr {
  transition: background var(--duration-fast);
  cursor: pointer;
}

.data-table tbody tr:hover {
  background: var(--bg-hover);
}

.data-table tbody tr.selected {
  background: var(--bg-active);
}

/* Special Cell Styles */
.code {
  font-family: var(--font-mono);
  color: var(--accent-primary);
  font-weight: var(--font-semibold);
}

.number {
  text-align: right;
  font-family: var(--font-mono);
}
```

### 3.6 Status Badges
```css
.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.status-badge.draft {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.status-badge.pending {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.status-badge.approved {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.status-badge.rejected {
  background: var(--color-error-bg);
  color: var(--color-error);
}
```

### 3.7 Action Buttons
```css
.actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: var(--radius-sm);
  transition: background var(--duration-fast);
}

.action-btn:hover {
  background: var(--bg-hover);
}

.action-btn.delete:hover {
  background: var(--color-error-bg);
}

/* Outlined Action Button */
.btn-create-order {
  background: #ffffff;
  border: 1px solid var(--accent-primary);
  color: var(--accent-primary);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--duration-fast);
  white-space: nowrap;
}

.btn-create-order:hover {
  background: var(--accent-primary);
  color: white;
}
```

### 3.8 Skeleton Loading
```html
<div class="skeleton-container" *ngIf="isLoading">
  <div class="skeleton-row" *ngFor="let i of [1,2,3,4,5]">
    <div class="skeleton-cell" style="width: 100px"></div>
    <div class="skeleton-cell" style="width: 200px"></div>
    <div class="skeleton-cell" style="width: 120px"></div>
    <div class="skeleton-cell" style="width: 100px"></div>
    <div class="skeleton-cell" style="width: 80px"></div>
  </div>
</div>
```

```css
.skeleton-container {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 16px;
}

.skeleton-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.skeleton-cell {
  height: 20px;
  background: linear-gradient(90deg, 
    var(--bg-tertiary) 25%, 
    var(--bg-primary) 50%, 
    var(--bg-tertiary) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### 3.9 Pagination
```html
<div class="pagination">
  <span>Hiển thị {{ filteredData.length }} / {{ allData.length }} items</span>
  <div class="page-controls">
    <button (click)="prevPage()" [disabled]="currentPage === 1">◀</button>
    <span>{{ currentPage }}/{{ totalPages }} Trang</span>
    <button (click)="nextPage()" [disabled]="currentPage === totalPages">▶</button>
  </div>
</div>
```

```css
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.page-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-controls button {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  color: var(--text-primary);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--duration-fast);
}

.page-controls button:hover:not(:disabled) {
  background: var(--bg-hover);
}

.page-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### 3.10 Keyboard Shortcuts Hint
```html
<div class="shortcuts-hint">
  <span>N: Tạo mới</span>
  <span>E: Sửa</span>
  <span>P: Xuất PDF</span>
  <span>/: Tìm kiếm</span>
</div>
```

```css
.shortcuts-hint {
  position: fixed;
  bottom: 16px;
  right: 16px;
  display: flex;
  gap: 16px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  padding: 8px 16px;
  font-size: var(--text-xs);
  color: var(--text-muted);
  box-shadow: var(--shadow-card);
}
```

---

## 4. Modal Patterns

### 4.1 Delete Confirmation Modal
```html
<div class="modal-overlay" *ngIf="showDeleteModal" (click)="cancelDelete()">
  <div class="modal-content" (click)="$event.stopPropagation()">
    <div class="modal-header">
      <div class="modal-icon">⚠️</div>
      <div class="modal-title">Xác nhận xóa</div>
    </div>
    <div class="modal-body">
      Bạn có chắc chắn muốn xóa <strong>{{ itemToDelete?.name }}</strong>?<br>
      <span style="color: var(--text-secondary); font-size: 0.9em;">
        Hành động này không thể hoàn tác.
      </span>
    </div>
    <div class="modal-actions">
      <button class="btn-cancel" (click)="cancelDelete()">Hủy bỏ</button>
      <button class="btn-delete" (click)="confirmDelete()" [disabled]="isDeleting">
        <span *ngIf="isDeleting">⏳</span>
        {{ isDeleting ? 'Đang xóa...' : 'Xóa' }}
      </button>
    </div>
  </div>
</div>
```

```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out;
}

.modal-content {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  animation: slideUp 0.2s ease-out;
}

.modal-header {
  padding: 20px;
  background: #FEF2F2; /* Warning/Danger bg */
  border-bottom: 1px solid #FECACA;
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-icon {
  background: #FEE2E2;
  color: #DC2626;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: #991B1B;
}

.modal-body {
  padding: 24px 20px;
  color: var(--text-primary);
  font-size: var(--text-base);
  line-height: 1.5;
}

.modal-actions {
  padding: 16px 20px;
  background: var(--bg-tertiary);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid var(--border-primary);
}

.btn-cancel {
  background: white;
  border: 1px solid var(--border-secondary);
  color: var(--text-primary);
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: var(--bg-hover);
}

.btn-delete {
  background: #DC2626;
  border: 1px solid #DC2626;
  color: white;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-delete:hover {
  background: #B91C1C;
  box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.3);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

### 4.2 Success Notification Modal
```html
<div class="notification-overlay" *ngIf="showSuccessNotification">
  <div class="notification-content success">
    <div class="notification-icon">✅</div>
    <div class="notification-text">{{ successMessage }}</div>
    <button class="btn-notification-close" (click)="closeNotification()">Đóng</button>
  </div>
</div>
```

```css
.notification-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
  animation: fadeIn 0.2s ease-out;
}

.notification-content {
  background: white;
  border-radius: var(--radius-lg);
  padding: 24px 32px;
  text-align: center;
  box-shadow: var(--shadow-xl);
  animation: slideUp 0.2s ease-out;
  max-width: 400px;
}

.notification-content.success {
  border-top: 4px solid var(--color-success);
}

.notification-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.notification-text {
  font-size: var(--text-base);
  color: var(--text-primary);
  margin-bottom: 20px;
  line-height: 1.5;
}

.btn-notification-close {
  background: var(--color-success);
  border: none;
  color: white;
  padding: 10px 24px;
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 0.15s;
}

.btn-notification-close:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
```

---

## 5. Responsive Design

```css
@media (max-width: 1200px) {
  .kpi-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .filters {
    flex-wrap: wrap;
  }
  
  .search-box {
    max-width: 100%;
    width: 100%;
  }
  
  .kpi-cards {
    grid-template-columns: 1fr;
  }
}
```

---

## 6. TypeScript Component Structure

```typescript
@Component({
  selector: 'app-data-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `...`,
  styles: [`...`]
})
export class DataListComponent implements OnInit {
  private router = inject(Router);
  private dataService = inject(DataService);

  // Data State
  allData: DataItem[] = [];
  filteredData: DataItem[] = [];
  selectedItem: DataItem | null = null;
  isLoading = true;

  // Search & Filter
  searchTerm = '';
  activeTab = 'all';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // KPI Cards
  kpiCards = [
    { label: 'Tổng', value: 0, change: 0, changeText: '', color: '#5E6AD2' },
    // ...
  ];

  // Status Tabs
  statusTabs = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Bản nháp', value: 'draft' },
    // ...
  ];

  // Modal State
  showDeleteModal = false;
  itemToDelete: DataItem | null = null;
  isDeleting = false;

  // Keyboard Shortcuts
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'n') this.createNew();
    if (event.key === 'e' && this.selectedItem) this.editItem(this.selectedItem);
    if (event.key === '/') {
      event.preventDefault();
      document.querySelector<HTMLInputElement>('.search-box input')?.focus();
    }
  }

  ngOnInit() {
    this.loadData();
  }

  // Data Methods
  loadData() { /* ... */ }
  filterData() { /* ... */ }
  setTab(tab: string) { /* ... */ }
  sortBy(column: string) { /* ... */ }
  calculateKPIs() { /* ... */ }

  // CRUD Methods
  createNew() { this.router.navigate(['/module/create']); }
  viewItem(item: DataItem) { /* ... */ }
  editItem(item: DataItem, event?: Event) { /* ... */ }
  
  // Delete Modal
  deleteItem(item: DataItem, event: Event) {
    event.stopPropagation();
    this.itemToDelete = item;
    this.showDeleteModal = true;
  }

  confirmDelete() {
    if (!this.itemToDelete) return;
    this.isDeleting = true;
    this.dataService.delete(this.itemToDelete.id).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.loadData();
      },
      error: (err) => { /* handle error */ }
    });
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.itemToDelete = null;
  }

  // Pagination
  prevPage() { if (this.currentPage > 1) this.currentPage--; }
  nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }
}
```

---

## 7. Checklist Khi Apply SKILL

- [ ] Import `CommonModule`, `FormsModule` trong standalone component
- [ ] Đảm bảo design-tokens.scss đã được import global
- [ ] Sử dụng emoji icons hoặc Material Icons (Filled style)
- [ ] Date format: `dd/MM/yyyy` (Vietnam standard)
- [ ] Currency format: `number:'1.0-0'` + ` đ` suffix
- [ ] Keyboard shortcuts với `@HostListener`
- [ ] Skeleton loading khi `isLoading = true`
- [ ] Modal có backdrop-filter blur và animation
- [ ] Responsive breakpoints: 1200px, 768px
- [ ] **AG Grid**: Đồng bộ row height với native table (xem Section 8)

---

## 8. AG Grid Styling (Đồng bộ với Native Table)

> **Quan trọng**: Khi dùng AG Grid thay vì native HTML table, cần override styles để khớp với design system.

### 8.1 AG Grid CSS Variables
```scss
/* AG Grid Overrides - Match Native Table Styling */
::ng-deep .ag-theme-alpine {
    /* Colors */
    --ag-foreground-color: var(--text-primary);
    --ag-background-color: var(--bg-primary);
    --ag-header-foreground-color: var(--text-secondary);
    --ag-header-background-color: var(--bg-tertiary);
    --ag-odd-row-background-color: var(--bg-primary);
    --ag-border-color: var(--border-primary);
    --ag-row-hover-color: var(--bg-hover);
    
    /* Typography */
    --ag-font-family: 'Inter', sans-serif;
    --ag-font-size: 14px;  /* Match --text-sm */
    
    /* CRITICAL: Row Height - Match native table padding: 16px * 2 + content */
    --ag-row-height: 52px;
    --ag-header-height: 52px;
    --ag-cell-horizontal-padding: 16px;
}
```

### 8.2 Header Cell Styling
```scss
::ng-deep .ag-header-cell {
    padding: 16px;
}

::ng-deep .ag-header-cell-text {
    font-weight: 600;
    text-transform: uppercase;
    font-size: 12px;    /* Match --text-xs */
    letter-spacing: 0.5px;
}
```

### 8.3 Body Cell Styling
```scss
::ng-deep .ag-cell {
    padding: 16px;
    display: flex;
    align-items: center;
}
```

### 8.4 Status Badge trong AG Grid
```scss
::ng-deep .status-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    font-weight: var(--font-semibold);
    color: white;
    line-height: 1.2;
}
```

### 8.5 Action Buttons trong AG Grid
```scss
::ng-deep .action-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    padding: 4px;
    border-radius: var(--radius-sm);
    transition: all var(--duration-fast);
}

::ng-deep .action-btn:hover {
    color: var(--accent-primary);
    background: var(--bg-hover);
}

::ng-deep .action-btn .material-icons {
    font-size: 18px;
    vertical-align: middle;
}
```

### 8.6 Grid Container
```scss
.grid-container {
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-card);
}
```

### 8.7 So sánh Native Table vs AG Grid

| Property | Native Table | AG Grid Override |
|----------|--------------|------------------|
| Row height | `padding: 16px` → ~52px | `--ag-row-height: 52px` |
| Header height | `padding: 16px` → ~52px | `--ag-header-height: 52px` |
| Cell padding | `padding: 16px` | `--ag-cell-horizontal-padding: 16px` |
| Body font | `var(--text-sm)` (14px) | `--ag-font-size: 14px` |
| Header font | `var(--text-xs)` (12px) | `.ag-header-cell-text { font-size: 12px }` |
| Font family | `var(--font-sans)` | `--ag-font-family: 'Inter', sans-serif` |

