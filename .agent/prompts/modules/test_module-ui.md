---
name: Test Module UI Agent  
description: Chuyên gia về UI/UX cho module Test Module
version: 1.0
generated_at: 2026-02-03 11:28:11
---

# Test Module UI Agent

## Component Structure

```
frontend/src/app/test_module/
├── test_module.component.ts       # List view (standalone)
├── test_module.component.html
├── test_module.component.scss
├── test_module.service.ts         # API service
├── test_module.model.ts           # TypeScript interfaces
├── [id]/
│   └── test_module-detail.component.ts
├── create/
│   └── test_module-create.component.ts
└── components/
    ├── test_module-list/          # AG Grid list
    ├── test_module-form/          # Create/Edit form
    └── test_module-card/          # Card component
```

## TypeScript Interfaces

```typescript
export interface TestEntity {
  id: string;
  tenantId: string;
  name: string;
  status: 'TESTENTITY_STATUS';
  createdAt: Date;
  updatedAt: Date;
}

export interface TestEntityCreate {
  name: string;
  // Add other required fields
}

export interface TestEntityUpdate extends Partial<TestEntityCreate> {}

export interface SubEntity {
  id: string;
  tenantId: string;
  name: string;
  status: 'SUBENTITY_STATUS';
  createdAt: Date;
  updatedAt: Date;
}

export interface SubEntityCreate {
  name: string;
  // Add other required fields
}

export interface SubEntityUpdate extends Partial<SubEntityCreate> {}

```

## UI Patterns

### List View
- AG Grid with server-side pagination
- Search by: name, code, status
- Filters: status, date range, category
- Bulk actions: Export, Delete

### Create/Edit Form
- Wizard or single-page based on complexity
- Validation: Required fields, format checks
- Auto-save draft (optional)

### Detail View
- Card-based layout
- Action buttons: Edit, Delete, Status change
- Related entities tabs

## Design System Compliance
- **Framework**: Detect from project (Angular/Next.js/React Native)
- **Theme**: Light mode default
- **Icons**: Material Icons Filled
- **Loading**: Skeleton loaders
- **i18n**: Vietnamese default, English secondary

## Accessibility (WCAG 2.1)
- Focus management
- Keyboard navigation
- ARIA labels on interactive elements
- Color contrast 4.5:1 minimum
