# Next.js Component Skeleton (Frontend Template)

Sử dụng template này khi tạo một trang hoặc component mới trong Frontend.

## Cấu Trúc Thư Mục

```
src/
├── app/
│   └── [locale]/
│       └── {module}/
│           ├── page.tsx           # Main page (Server Component)
│           └── components/
│               ├── {Module}Grid.tsx      # AG Grid wrapper
│               ├── {Module}Form.tsx      # Create/Edit Form
│               └── {Module}Toolbar.tsx   # Actions bar
├── components/
│   └── ui/                        # Shared UI components
├── lib/
│   └── api/
│       └── {module}.ts            # API client functions
└── locales/
    ├── vi/
    │   └── {module}.json          # Vietnamese translations
    └── en/
        └── {module}.json          # English translations
```

---

## Code Mẫu

### 1. AG Grid Component (`{Module}Grid.tsx`)
```tsx
'use client';

import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent } from 'ag-grid-community';
import { useTranslation } from 'next-i18next';

interface {Entity}GridProps {
  data: {Entity}[];
  onRowClick?: (row: {Entity}) => void;
}

export function {Entity}Grid({ data, onRowClick }: {Entity}GridProps) {
  const { t } = useTranslation('{module}');

  // RULE: Always use translation keys, never hardcode labels
  const columnDefs: ColDef[] = [
    { field: 'id', headerName: t('grid.id'), width: 100 },
    { field: 'name', headerName: t('grid.name'), flex: 1 },
    { field: 'createdAt', headerName: t('grid.createdAt'), width: 150 },
  ];

  const defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
  };

  return (
    <div className="ag-theme-alpine h-[600px] w-full">
      <AgGridReact
        rowData={data}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowSelection="single"
        onRowClicked={(e) => onRowClick?.(e.data)}
        // RULE: Enable virtualization for large datasets
        rowBuffer={20}
        animateRows={true}
      />
    </div>
  );
}
```

### 2. API Client (`lib/api/{module}.ts`)
```typescript
import { apiClient } from '@/lib/api/client';

export interface {Entity} {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
}

export const {module}Api = {
  list: async (params?: { limit?: number; offset?: number }) => {
    return apiClient.get<{Entity}[]>('/{module}', { params });
  },
  
  getById: async (id: string) => {
    return apiClient.get<{Entity}>(`/{module}/${id}`);
  },
  
  create: async (data: Omit<{Entity}, 'id' | 'tenantId' | 'createdAt'>) => {
    return apiClient.post<{Entity}>('/{module}', data);
  },
  
  update: async (id: string, data: Partial<{Entity}>) => {
    return apiClient.put<{Entity}>(`/{module}/${id}`, data);
  },
  
  delete: async (id: string) => {
    return apiClient.delete(`/{module}/${id}`);
  },
};
```

### 3. Translation File (`locales/vi/{module}.json`)
```json
{
  "title": "Quản lý {Module}",
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
  "actions": {
    "create": "Thêm mới",
    "edit": "Sửa",
    "delete": "Xóa"
  }
}
```

---

## Checklist Khi Tạo Component Mới

- [ ] Tạo AG Grid với `columnDefs` sử dụng `t()` cho labels
- [ ] Tạo file API client trong `lib/api/`
- [ ] Tạo file translation `vi/{module}.json` và `en/{module}.json`
- [ ] Đảm bảo component hỗ trợ Keyboard Navigation
- [ ] Test trên màn hình nhỏ (Responsive)
