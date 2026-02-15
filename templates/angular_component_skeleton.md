# Angular Component Skeleton (Frontend Template)

Sử dụng template này khi tạo một trang hoặc component mới trong Frontend.

## Cấu Trúc Thư Mục

```
frontend/src/app/
├── {module}/
│   └── {feature}/
│       ├── {feature}.component.ts        # Main component (Standalone)
│       ├── {feature}.component.html      # Template
│       ├── {feature}.component.scss      # Styles
│       ├── {feature}.component.spec.ts   # Unit tests
│       ├── {feature}.service.ts          # Data service
│       ├── {feature}.model.ts            # TypeScript interfaces
│       └── components/
│           ├── {feature}-grid/           # AG Grid wrapper
│           ├── {feature}-form/           # Create/Edit Form
│           └── {feature}-toolbar/        # Actions bar
├── core/
│   ├── services/                         # Shared services
│   ├── guards/                           # Route guards
│   └── interceptors/                     # HTTP interceptors
└── assets/
    └── i18n/
        ├── vi.json                       # Vietnamese translations
        └── en.json                       # English translations
```

---

## Code Mẫu

### 1. Model (`{feature}.model.ts`)
```typescript
export interface {Entity} {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
}

export interface {Entity}Create {
  name: string;
  // Add other create fields
}

export interface {Entity}Update {
  name?: string;
  // Add other update fields
}
```

### 2. Service (`{feature}.service.ts`)
```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { {Entity}, {Entity}Create, {Entity}Update } from './{feature}.model';

@Injectable({ providedIn: 'root' })
export class {Entity}Service {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/{entities}`;
  
  // State management with BehaviorSubject
  private {entities}Subject = new BehaviorSubject<{Entity}[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private selectedSubject = new BehaviorSubject<{Entity} | null>(null);
  
  // Public observables
  {entities}$ = this.{entities}Subject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  selected$ = this.selectedSubject.asObservable();
  
  load{Entities}(params?: Record<string, any>): void {
    this.loadingSubject.next(true);
    this.http.get<{Entity}[]>(this.apiUrl, { params })
      .pipe(finalize(() => this.loadingSubject.next(false)))
      .subscribe({entities} => this.{entities}Subject.next({entities}));
  }
  
  get{Entity}(id: string): Observable<{Entity}> {
    return this.http.get<{Entity}>(`${this.apiUrl}/${id}`);
  }
  
  create{Entity}(data: {Entity}Create): Observable<{Entity}> {
    return this.http.post<{Entity}>(this.apiUrl, data)
      .pipe(tap({entity} => {
        const current = this.{entities}Subject.value;
        this.{entities}Subject.next([...current, {entity}]);
      }));
  }
  
  update{Entity}(id: string, data: {Entity}Update): Observable<{Entity}> {
    return this.http.put<{Entity}>(`${this.apiUrl}/${id}`, data)
      .pipe(tap(updated => {
        const current = this.{entities}Subject.value;
        const index = current.findIndex(e => e.id === id);
        if (index !== -1) {
          current[index] = updated;
          this.{entities}Subject.next([...current]);
        }
      }));
  }
  
  delete{Entity}(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(tap(() => {
        const current = this.{entities}Subject.value;
        this.{entities}Subject.next(current.filter(e => e.id !== id));
      }));
  }
  
  select(entity: {Entity} | null): void {
    this.selectedSubject.next(entity);
  }
}
```

### 3. Main Component (`{feature}.component.ts`)
```typescript
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridReadyEvent, RowClickedEvent } from 'ag-grid-community';
import { {Entity}Service } from './{feature}.service';
import { {Entity} } from './{feature}.model';

@Component({
  selector: 'app-{feature}',
  standalone: true,
  imports: [CommonModule, TranslateModule, AgGridModule],
  templateUrl: './{feature}.component.html',
  styleUrls: ['./{feature}.component.scss']
})
export class {Entity}Component implements OnInit {
  private {entity}Service = inject({Entity}Service);
  private translate = inject(TranslateService);
  
  // Observables
  {entities}$ = this.{entity}Service.{entities}$;
  loading$ = this.{entity}Service.loading$;
  
  // AG Grid config
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true
  };
  
  ngOnInit(): void {
    this.setupColumns();
    this.{entity}Service.load{Entities}();
  }
  
  private setupColumns(): void {
    this.columnDefs = [
      { 
        field: 'id', 
        headerName: this.translate.instant('{entity}.grid.id'),
        width: 100,
        pinned: 'left'
      },
      { 
        field: 'name', 
        headerName: this.translate.instant('{entity}.grid.name'),
        flex: 1
      },
      { 
        field: 'createdAt', 
        headerName: this.translate.instant('{entity}.grid.createdAt'),
        width: 150
      }
    ];
  }
  
  onGridReady(event: GridReadyEvent): void {
    event.api.sizeColumnsToFit();
  }
  
  onRowClicked(event: RowClickedEvent<{Entity}>): void {
    if (event.data) {
      this.{entity}Service.select(event.data);
    }
  }
  
  onCreate(): void {
    // Open create modal/dialog
  }
  
  onRefresh(): void {
    this.{entity}Service.load{Entities}();
  }
}
```

### 4. Template (`{feature}.component.html`)
```html
<div class="page-container">
  <!-- Header -->
  <div class="page-header">
    <h1>{{ '{entity}.title' | translate }}</h1>
    <div class="header-actions">
      <button 
        *appHasPermission="['{entities}', 'create']"
        class="btn btn-primary"
        (click)="onCreate()"
        data-testid="create-btn"
      >
        {{ 'common.create' | translate }}
      </button>
      <button 
        class="btn btn-secondary"
        (click)="onRefresh()"
        data-testid="refresh-btn"
      >
        {{ 'common.refresh' | translate }}
      </button>
    </div>
  </div>
  
  <!-- Loading indicator -->
  <div *ngIf="loading$ | async" class="loading-overlay">
    <div class="spinner"></div>
  </div>
  
  <!-- AG Grid -->
  <ag-grid-angular
    class="ag-theme-alpine-dark"
    [rowData]="{entities}$ | async"
    [columnDefs]="columnDefs"
    [defaultColDef]="defaultColDef"
    [rowSelection]="'single'"
    [animateRows]="true"
    [rowBuffer]="20"
    (gridReady)="onGridReady($event)"
    (rowClicked)="onRowClicked($event)"
    data-testid="{entities}-grid"
    style="height: 600px; width: 100%;"
  ></ag-grid-angular>
</div>
```

### 5. Styles (`{feature}.component.scss`)
```scss
.page-container {
  padding: 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  
  h1 {
    margin: 0;
    font-size: 1.5rem;
  }
  
  .header-actions {
    display: flex;
    gap: 0.5rem;
  }
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  
  &-primary {
    background: var(--accent-primary, #5e6ad2);
    color: white;
    
    &:hover {
      background: var(--accent-hover, #6b76dc);
    }
  }
  
  &-secondary {
    background: var(--bg-tertiary, #1a1a1a);
    color: var(--text-primary, #ffffff);
    
    &:hover {
      background: var(--bg-secondary, #141414);
    }
  }
}
```

### 6. Translation File (`assets/i18n/vi.json`)
```json
{
  "{entity}": {
    "title": "Quản lý {Entity}",
    "grid": {
      "id": "Mã",
      "name": "Tên",
      "createdAt": "Ngày tạo"
    },
    "form": {
      "name": "Tên",
      "submit": "Lưu",
      "cancel": "Hủy"
    },
    "messages": {
      "created": "Đã tạo thành công",
      "updated": "Đã cập nhật thành công",
      "deleted": "Đã xóa thành công"
    }
  },
  "common": {
    "create": "Thêm mới",
    "edit": "Sửa",
    "delete": "Xóa",
    "refresh": "Làm mới",
    "save": "Lưu",
    "cancel": "Hủy"
  }
}
```

### 7. Routing (`app.routes.ts`)
```typescript
// Add to your routes
{
  path: '{entities}',
  loadComponent: () => import('./{module}/{feature}/{feature}.component')
    .then(m => m.{Entity}Component),
  canActivate: [authGuard]
},
{
  path: '{entities}/create',
  loadComponent: () => import('./{module}/{feature}/{feature}-form.component')
    .then(m => m.{Entity}FormComponent),
  canActivate: [canAccess('{entities}', 'create')]
}
```

---

## Checklist Khi Tạo Component Mới

- [ ] Tạo model với TypeScript interfaces
- [ ] Tạo service với BehaviorSubject state management
- [ ] Tạo standalone component với imports
- [ ] Tạo AG Grid với `columnDefs` sử dụng translate
- [ ] Tạo file translation `vi.json` và `en.json`
- [ ] Thêm route vào `app.routes.ts`
- [ ] Thêm permission guards nếu cần
- [ ] Đảm bảo component có `data-testid` cho testing
- [ ] Test keyboard navigation
- [ ] Test responsive layout
