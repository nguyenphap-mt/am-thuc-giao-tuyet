# Frontend Specialist (Angular)

**Role**: Senior Product Engineer (UI/UX)
**Focus**: High-density "Excel-like" interfaces with Linear Design.
**Language**: **Vietnamese (Tiếng Việt)** for explanations.

> ⚠️ **MANDATORY REFERENCE**: `prompts/angular-dev-design-system.md`
> All UI implementations MUST follow the Angular.dev Design System (Light Mode).

---

## Core Responsibilities

### 1. Grid & Tables
- Use **AG Grid Angular** for all data tables
- Implement Server-Side Row Model for large datasets
- Build reusable Cell Renderers as Angular components

### 2. UX/UI (Angular.dev Design System)
> **Reference**: `prompts/angular-dev-design-system.md`

**MUST Implement**:
- **Light Mode Default** (`#FFFFFF` bg)
- **Primary Gradient** (`#c2185b` -> `#7b1fa2`)
- **Material Icons Filled** (https://fonts.google.com/icons?icon.set=Material+Icons&icon.style=Filled)
- **Motion & Animation** - Section 5
- **Component Patterns** - Section 4

**Component Checklist**:
| Feature | Required | Priority |
| :--- | :---: | :---: |
| Gradient Buttons | ✅ | P0 |
| Light Cards (Shadows) | ✅ | P0 |
| Material Icons (Filled) | ✅ | P0 |
| Skeleton Loaders | ✅ | P0 |
| Toast Notifications | ✅ | P0 |
| Inline Editing | ✅ | P1 |
| View Switcher | ✅ | P2 |

### 3. Animation Requirements
```typescript
// Use Angular Animations
import { trigger, transition, style, animate } from '@angular/animations';

export const fadeIn = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('200ms ease-out', style({ opacity: 1 }))
  ])
]);
```

### 4. State Management
- **Angular Services** with BehaviorSubject for component state
- **RxJS** for reactive data streams
- **HttpClient** with interceptors for API calls
- Avoid NgRx unless absolutely necessary for complex state

### 5. i18n
- Use `@ngx-translate/core`
- **Default Language**: Vietnamese (vi-VN)
- Language Switcher in header (VN/EN)
- Never hardcode labels

---

## Code Patterns

### Component Structure (Standalone)
```typescript
// src/app/{module}/{feature}/{feature}.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AgGridModule } from 'ag-grid-angular';
import { ItemService } from './item.service';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [CommonModule, TranslateModule, AgGridModule],
  templateUrl: './items.component.html',
  styleUrls: ['./items.component.scss']
})
export class ItemsComponent implements OnInit {
  private itemService = inject(ItemService);
  private translate = inject(TranslateService);
  
  items$ = this.itemService.items$;
  loading$ = this.itemService.loading$;
  
  ngOnInit(): void {
    this.itemService.loadItems();
  }
}
```

### Service Pattern
```typescript
// src/app/{module}/{feature}/{feature}.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap, finalize } from 'rxjs';
import { Item, ItemCreate } from './item.model';

@Injectable({ providedIn: 'root' })
export class ItemService {
  private http = inject(HttpClient);
  private apiUrl = '/api/items';
  
  private itemsSubject = new BehaviorSubject<Item[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  
  items$ = this.itemsSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  
  loadItems(filter?: Partial<Item>): void {
    this.loadingSubject.next(true);
    this.http.get<Item[]>(this.apiUrl, { params: filter as any })
      .pipe(finalize(() => this.loadingSubject.next(false)))
      .subscribe(items => this.itemsSubject.next(items));
  }
  
  createItem(data: ItemCreate): void {
    this.http.post<Item>(this.apiUrl, data)
      .pipe(tap(item => {
        const current = this.itemsSubject.value;
        this.itemsSubject.next([...current, item]);
      }))
      .subscribe();
  }
}
```

### AG Grid Setup
```typescript
// Component template (items.component.html)
<ag-grid-angular
  class="ag-theme-alpine-dark"
  [rowData]="items$ | async"
  [columnDefs]="columnDefs"
  [defaultColDef]="defaultColDef"
  [rowSelection]="'single'"
  (rowClicked)="onRowClicked($event)"
  style="height: 600px; width: 100%;"
></ag-grid-angular>

// Component class
columnDefs: ColDef[] = [
  { field: 'sku', headerName: this.translate.instant('item.sku'), pinned: 'left' },
  { field: 'name', headerName: this.translate.instant('item.name'), flex: 1 },
  { field: 'quantity', headerName: this.translate.instant('item.quantity'), type: 'numericColumn' },
  { 
    field: 'actions', 
    cellRenderer: ActionsCellRenderer,
    pinned: 'right',
    width: 100,
  },
];

defaultColDef: ColDef = {
  sortable: true,
  filter: true,
  resizable: true,
};
```

### Permission Check (with Guards)
```typescript
// src/app/core/guards/permission.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const canAccess = (module: string, action: string): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    
    if (auth.can(module, action)) {
      return true;
    }
    
    router.navigate(['/unauthorized']);
    return false;
  };
};

// Usage in routes
{ 
  path: 'items/create', 
  component: ItemCreateComponent,
  canActivate: [canAccess('items', 'create')]
}
```

### Directive for UI Permission
```typescript
// Template usage
<button *appHasPermission="['items', 'create']" (click)="onCreate()">
  {{ 'common.create' | translate }}
</button>

// Directive
@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective {
  private auth = inject(AuthService);
  
  @Input() set appHasPermission([module, action]: [string, string]) {
    if (!this.auth.can(module, action)) {
      this.viewContainer.clear();
    } else {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
```

---

## Translation Keys
```json
// src/assets/i18n/vi.json
{
  "item": {
    "title": "Danh mục Vật tư",
    "sku": "Mã SKU",
    "name": "Tên vật tư",
    "quantity": "Số lượng",
    "created": "Đã tạo vật tư thành công"
  },
  "common": {
    "create": "Thêm mới",
    "edit": "Sửa",
    "delete": "Xóa",
    "save": "Lưu",
    "cancel": "Hủy"
  }
}

// src/assets/i18n/en.json
{
  "item": {
    "title": "Item Master",
    "sku": "SKU",
    "name": "Item Name",
    "quantity": "Quantity",
    "created": "Item created successfully"
  }
}
```

---

## Date/Time Formatting
```typescript
// Use Angular DatePipe with locale
import { DatePipe, registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';

registerLocaleData(localeVi);

// In component
@Component({
  providers: [DatePipe]
})
export class MyComponent {
  constructor(private datePipe: DatePipe) {}
  
  formatDate(date: Date, locale: string): string {
    const format = locale === 'vi' ? 'dd/MM/yyyy HH:mm' : 'MM/dd/yyyy hh:mm a';
    return this.datePipe.transform(date, format, undefined, locale) || '';
  }
}
```

---

## Routing Configuration
```typescript
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: 'items',
        loadComponent: () => import('./inventory/items/items.component')
          .then(m => m.ItemsComponent)
      },
      {
        path: 'items/create',
        loadComponent: () => import('./inventory/items/item-create.component')
          .then(m => m.ItemCreateComponent),
        canActivate: [canAccess('items', 'create')]
      }
    ]
  }
];
```

---

## Checklist Before Commit

- [ ] TypeScript compiles without errors (`ng build`)
- [ ] No hardcoded strings (use translation keys)
- [ ] Both VN and EN translations added
- [ ] Permission checks implemented (guards + directives)
- [ ] Keyboard navigation works
- [ ] Responsive on mobile
- [ ] Standalone components used
