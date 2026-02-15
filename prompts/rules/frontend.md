# Frontend Rules (Load for FE/UI Dimension)

> **Load when**: Working on Angular components, pages, UI design.
> Size: ~8KB

---

## 1. Angular.dev Design System (MANDATORY)

> [!IMPORTANT]
> **Angular.dev Light Mode là DESIGN SYSTEM MẶC ĐỊNH.**
> Linear Design System (Dark Mode) đã được thay thế.
> Chi tiết tham khảo: `prompts/angular-dev-design-system.md`

### 1.1 Core Principles
- **Light Mode Default**: `#FFFFFF` background, `#FAFAFA` cards
- **Angular Gradient Branding**: Pink-to-Purple signature gradient
- **Subtle Shadows**: Depth using card shadows
- **Font**: Inter

### 1.2 Color Tokens (Light Mode)
```css
:root {
  /* Background */
  --bg-primary: #ffffff;
  --bg-secondary: #fafafa;
  --bg-tertiary: #f5f5f5;
  
  /* Text */
  --text-primary: #1a1a2e;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  
  /* Accent (Angular Brand) */
  --accent-primary: #c2185b;
  --accent-secondary: #7b1fa2;
  
  /* Gradient */
  --gradient-primary: linear-gradient(90deg, #c2185b 0%, #7b1fa2 50%, #512da8 100%);
  
  /* Status */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
}
```

### 1.3 Typography
```css
body {
  font-family: 'Inter', -apple-system, sans-serif;
  font-size: 14px;
  line-height: 1.5;
}

h1 { font-size: 24px; font-weight: 700; }
h2 { font-size: 18px; font-weight: 600; }
h3 { font-size: 14px; font-weight: 600; }
```

### 1.4 Icons
- **MUST** use [Google Material Icons **Filled**](https://fonts.google.com/icons?icon.set=Material+Icons&icon.style=Filled)
- **NOT** Outlined style

---

## 2. AG Grid Requirements

### 2.1 Mandatory Grid Features
- Server-Side Row Model for >1000 rows
- Column virtualization enabled
- Row virtualization enabled
- Keyboard navigation

### 2.2 Grid Configuration
```typescript
const gridOptions: GridOptions = {
  rowModelType: 'serverSide',
  serverSideStoreType: 'partial',
  cacheBlockSize: 100,
  maxBlocksInCache: 10,
  rowHeight: 32,
  headerHeight: 36,
  enableRangeSelection: true,
  suppressCellFocus: false,
};
```

### 2.3 Master/Detail Pattern
```typescript
const masterDetailOptions = {
  masterDetail: true,
  detailRowAutoHeight: true,
  detailCellRendererParams: {
    detailGridOptions: {
      columnDefs: detailColumnDefs,
    },
    getDetailRowData: (params) => {
      params.successCallback(params.data.details);
    },
  },
};
```

---

## 3. i18n Requirements

### 3.1 Translation Rules
- **Default**: Vietnamese (vi-VN)
- **Secondary**: English (en-US)
- **Never hardcode** labels

### 3.2 Date/Time Formatting
```typescript
// Vietnamese
const vnFormat = "dd/MM/yyyy HH:mm";

// English
const enFormat = "MM/dd/yyyy hh:mm a";

// Use locale-aware formatting
format(date, locale === 'vi' ? vnFormat : enFormat);
```

### 3.3 Number/Currency
```typescript
// Vietnamese
new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(amount);
// → "123.456.789 ₫"

// English
new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'VND'
}).format(amount);
// → "₫123,456,789"
```

---

## 4. Component Patterns

### 4.1 Page Structure
```typescript
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [CommonModule, TranslateModule, ItemListComponent],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>{{ 'item.title' | translate }}</h1>
        <button (click)="onCreate()">{{ 'common.create' | translate }}</button>
      </div>
      <app-item-list></app-item-list>
    </div>
  `
})
export class ItemsComponent implements OnInit {
  private translate = inject(TranslateService);
  
  ngOnInit(): void {
    // Load data
  }
}
```

### 4.2 Form Pattern (Angular Reactive Forms)
```typescript
// item-form.component.ts
import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-item-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="form-field">
        <label>{{ 'item.sku' | translate }}</label>
        <input formControlName="sku" />
        <span *ngIf="form.get('sku')?.errors?.['required']" class="error">
          Required
        </span>
      </div>
      
      <div class="form-field">
        <label>{{ 'item.name' | translate }}</label>
        <input formControlName="name" />
      </div>
      
      <div class="form-actions">
        <button type="button" (click)="cancel.emit()">
          {{ 'common.cancel' | translate }}
        </button>
        <button type="submit" [disabled]="form.invalid">
          {{ 'common.save' | translate }}
        </button>
      </div>
    </form>
  `
})
export class ItemFormComponent implements OnInit {
  @Input() item: any;
  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();
  
  private fb = inject(FormBuilder);
  form!: FormGroup;
  
  ngOnInit(): void {
    this.form = this.fb.group({
      sku: [this.item?.sku || '', Validators.required],
      name: [this.item?.name || '', Validators.required],
    });
  }
  
  onSubmit(): void {
    if (this.form.valid) {
      this.save.emit(this.form.value);
    }
  }
}
```

### 4.3 Permission Check
```typescript
// Using directive
<div>
  <button *appHasPermission="['items', 'create']">Create</button>
  <button *appHasPermission="['items', 'edit']">Edit</button>
  <button *appHasPermission="['items', 'delete']">Delete</button>
</div>

// Using service in component
import { AuthService } from '@core/services/auth.service';
const auth = inject(AuthService);
if (auth.can('items', 'delete')) { ... }
```

---

## 5. State Management

### 5.1 Server State (Angular Services + RxJS)
```typescript
// Service with BehaviorSubject
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ItemService {
  private http = inject(HttpClient);
  private itemsSubject = new BehaviorSubject<Item[]>([]);
  items$ = this.itemsSubject.asObservable();
  
  loadItems(): void {
    this.http.get<Item[]>('/api/items')
      .subscribe(items => this.itemsSubject.next(items));
  }
}
```

### 5.2 Async Pipe in Templates
```html
<ag-grid-angular [rowData]="items$ | async"></ag-grid-angular>
```

---

## 6. Performance Requirements

| Metric | Target | Measurement |
| :--- | :---: | :--- |
| First Contentful Paint | < 1.5s | Lighthouse |
| Time to Interactive | < 3s | Lighthouse |
| Bundle Size (initial) | < 200KB | webpack-bundle-analyzer |
| Grid Render (1000 rows) | < 500ms | Performance API |

---

## 7. Accessibility

- All inputs must have labels
- Color contrast ratio ≥ 4.5:1
- Focus indicators visible
- Screen reader compatible (aria-labels)

---

## 8. Confirmation Dialogs (BẮT BUỘC)

> [!CAUTION]
> **KHÔNG ĐƯỢC sử dụng `window.confirm()`, `window.alert()` hoặc native browser dialogs.**
> Phải sử dụng custom Angular modal component để đảm bảo UX nhất quán.

### 8.1 Tại Sao?
- Native `confirm()` có thể bị trình duyệt block
- Không có styling, không phù hợp với design system
- Khó nhìn thấy và dễ bị bỏ qua bởi user
- Không hỗ trợ i18n

### 8.2 Component Bắt Buộc
Sử dụng `ConfirmDeleteModalComponent` tại:
```
frontend/src/app/shared/components/confirm-delete-modal/
```

### 8.3 Pattern Mẫu
```typescript
// ❌ SAI - KHÔNG sử dụng native dialog
if (confirm('Xác nhận xóa?')) {
  this.deleteItem();
}

// ✅ ĐÚNG - Sử dụng custom modal
// 1. Import component
import { ConfirmDeleteModalComponent } from '../../../shared/components/confirm-delete-modal/confirm-delete-modal.component';

// 2. Thêm vào imports
@Component({
  imports: [ConfirmDeleteModalComponent],
})

// 3. Thêm state variables
showConfirmModal = false;
confirmModalConfig = { title: '', message: '', actionLabel: '' };
pendingAction: (() => void) | null = null;

// 4. Template
<app-confirm-delete-modal
  *ngIf="showConfirmModal"
  [title]="confirmModalConfig.title"
  [message]="confirmModalConfig.message"
  [actionLabel]="confirmModalConfig.actionLabel"
  (confirm)="onConfirmAction()"
  (cancel)="closeConfirmModal()">
</app-confirm-delete-modal>

// 5. Handler methods
showDeleteConfirmModal(item: any): void {
  this.confirmModalConfig = {
    title: 'Xác nhận xóa',
    message: `Bạn có chắc chắn muốn xóa "${item.name}"?`,
    actionLabel: 'Xóa'
  };
  this.pendingAction = () => this.executeDelete(item);
  this.showConfirmModal = true;
}

closeConfirmModal(): void {
  this.showConfirmModal = false;
  this.pendingAction = null;
}

onConfirmAction(): void {
  if (this.pendingAction) {
    this.pendingAction();
  }
  this.closeConfirmModal();
}
```

### 8.4 Checklist Verification
Khi review code, kiểm tra:
- [ ] Không có `window.confirm()` hoặc `confirm()` trong code
- [ ] Không có `window.alert()` hoặc `alert()` trong code  
- [ ] Tất cả destructive actions (xóa, hủy) dùng `ConfirmDeleteModalComponent`
- [ ] Modal có title, message, actionLabel phù hợp với action
