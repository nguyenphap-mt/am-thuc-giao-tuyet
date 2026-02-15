---
name: Standardized Delete Modal
description: Guidelines for implementing and verifying consistent delete confirmation modals across the application.
---

# Standardized Delete Modal

This skill defines the mandatory UI/UX and implementation standards for "Delete Confirmation" modals in the application. All modules (Procurement, Sales, Inventory, etc.) **MUST** follow this standard to ensure consistency.

## 1. UI/UX Standard

The delete modal must strictly adhere to the following visual design:

### Visual Elements
*   **Header Background**: Light Red (`#FEF2F2` / `bg-red-50`)
*   **Header Border**: Light Red (`#FECACA` / `border-red-200`)
*   **Icon**: Material Design `warning` icon
    *   Icon Color: Red (`#DC2626` / `text-red-600`)
    *   Icon Background: Light Red Circle (`#FEE2E2` / `bg-red-100`)
*   **Title**: Bold Red Text (`#991B1B` / `text-red-800`), e.g., "Xác nhận xóa" or "Xóa [Entity]"
*   **Action Button (Delete)**:
    *   Background: Red (`#DC2626` / `bg-red-600`)
    *   Text: White
    *   Hover: Darker Red (`#B91C1C` / `bg-red-700`)
    *   Label: "Xóa [Item Name]" (e.g., "Xóa đơn", "Xóa báo giá")
*   **Cancel Button**: White background, Gray border.

### Reference Screenshot
*(Refer to the "Delete Quote" or "Delete Order" modal implementation)*

## 2. Implementation

Use the shared `ConfirmDeleteModalComponent` for all delete confirmations.

### Component Path
`src/app/shared/components/confirm-delete-modal/confirm-delete-modal.component.ts`

### Helper Usage
In your feature component (e.g., `OrderDetailComponent`, `QuoteListComponent`):

```typescript
// 1. Import
import { ConfirmDeleteModalComponent } from 'path/to/shared/components/...';

// 2. Template
<app-confirm-delete-modal
  *ngIf="showDeleteModal"
  [title]="'Xóa Đơn Hàng'"                  <!-- Custom Title -->
  [message]="'Bạn có chắc chắn muốn xóa đơn hàng này? Hành động này không thể hoàn tác.'" <!-- Custom Message -->
  [typeName]="'đơn hàng'"                   <!-- Label: Xóa đơn hàng -->
  (confirm)="confirmDelete()"
  (cancel)="showDeleteModal = false">
</app-confirm-delete-modal>
```

### Legacy Support
The component supports legacy inputs (`itemName`) for backward compatibility, but strictly prefer `title` and `message` for clarity.

## 3. Verification Checklist ("delete_modal_check")

When implementing or reviewing a delete feature, verify the following:

- [ ] **Trigger**: Button "Xóa [Entity]" is red or has a delete icon.
- [ ] **Modal Appearance**:
    - [ ] Header background is **#FEF2F2**.
    - [ ] Warning icon is present and red.
    - [ ] Title is bold and red.
- [ ] **Content**: Message clearly states what is being deleted and warns about "no undo".
- [ ] **Action**:
    - [ ] Delete button is red.
    - [ ] Click Confirm -> Calls API -> Redirects/Updates List.
    - [ ] Click Cancel -> Closes modal without action.
- [ ] **Keyboard**: `Esc` key (optional but recommended) or clicking outside should close the modal (if configured).

## 4. Anti-Patterns (DO NOT DO)

*   ❌ Using browser native `confirm('Are you sure?')`.
*   ❌ Using generic blue/gray headers for destructive actions.
*   ❌ Using "OK/Cancel" generic labels; use "Xóa/Hủy bỏ".
