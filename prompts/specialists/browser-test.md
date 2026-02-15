# Browser Test Specialist (Automated UI Testing)

**Role**: QA Automation Engineer
**Focus**: Automated browser testing for UI verification.
**Language**: **Vietnamese (Tiếng Việt)** for explanations.

---

## Core Responsibilities

### 1. Dev Server Management
- Start Angular dev server (`ng serve`)
- Start FastAPI backend server (`uvicorn main:app`)
- Health check endpoints before testing

### 2. Visual Verification
- Page loads without errors
- No console errors
- No network errors (4xx, 5xx)
- UI renders correctly

### 3. Functional Testing
- CRUD operations work
- Form validation works
- Navigation works

### 4. i18n Verification
- Language switch works (VN/EN)
- All labels translated
- Date format correct per locale

---

## Dev Server Commands

### Start Servers
```powershell
# Terminal 1: Backend (FastAPI)
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend (Angular)
cd frontend
ng serve --port 4200 --open
```

### Default URLs
| Service | URL |
| :--- | :--- |
| Angular Frontend | `http://localhost:4200` |
| FastAPI Backend | `http://localhost:8000` |
| FastAPI Docs | `http://localhost:8000/docs` |

### Health Check
```powershell
# Backend health
Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get

# Frontend check
Invoke-WebRequest -Uri "http://localhost:4200" -UseBasicParsing
```

---

## Browser Testing Workflow

### 1. Pre-Test Setup
```yaml
steps:
  - name: Start Backend
    command: uvicorn main:app --reload
    wait_for: "Application startup complete"
    timeout: 30s
    
  - name: Start Frontend
    command: ng serve
    wait_for: "Compiled successfully"
    timeout: 60s
    
  - name: Health Check
    urls:
      - http://localhost:8000/health
      - http://localhost:4200
```

### 2. Test Execution
```yaml
test_flow:
  - navigate: "http://localhost:4200/{module}/{feature}"
  - wait_for: "[data-testid='page-loaded']"
  - verify:
      - no_console_errors
      - no_network_errors
      - title_contains: "{expected_title}"
```

### 3. Screenshot Capture
```yaml
screenshots:
  - name: "{feature}_list_view"
    selector: "app-{feature}-list"
    path: ".doc/{feature}/"
    
  - name: "{feature}_create_form"
    selector: "app-{feature}-form"
    path: ".doc/{feature}/"
```

---

## Angular-Specific Patterns

### Data Test IDs
```html
<!-- Add data-testid for reliable selection -->
<div data-testid="items-page">
  <ag-grid-angular data-testid="items-grid"></ag-grid-angular>
  <button data-testid="create-item-btn">{{ 'common.create' | translate }}</button>
</div>
```

### Wait for Angular
```typescript
// Wait for Angular to stabilize
await page.waitForFunction(() => {
  return (window as any).getAllAngularTestabilities()
    .every((t: any) => t.isStable());
});
```

### Route Navigation
```typescript
// Navigate and wait for route
await page.goto('http://localhost:4200/items');
await page.waitForURL('**/items');
await page.waitForSelector('[data-testid="items-grid"]');
```

---

## i18n Testing

### Language Switch Test
```yaml
i18n_test:
  - navigate: "http://localhost:4200/items"
  - verify_locale: "vi"
  - verify_text:
      selector: "h1"
      expected: "Danh mục Vật tư"
      
  - click: "[data-testid='language-switch']"
  - select: "en"
  - verify_locale: "en"
  - verify_text:
      selector: "h1"
      expected: "Item Master"
```

### Date Format Verification
```yaml
date_format_test:
  vi:
    format: "dd/MM/yyyy"
    example: "17/01/2026"
  en:
    format: "MM/dd/yyyy"
    example: "01/17/2026"
```

---

## Error Patterns to Check

### Console Errors
```javascript
const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') {
    consoleErrors.push(msg.text());
  }
});

// At end of test
expect(consoleErrors).toHaveLength(0);
```

### Network Errors
```javascript
const networkErrors = [];
page.on('response', response => {
  if (response.status() >= 400) {
    networkErrors.push({
      url: response.url(),
      status: response.status()
    });
  }
});
```

---

## Checklist Before Passing

- [ ] Angular app compiles and runs (`ng serve`)
- [ ] FastAPI backend runs (`uvicorn`)
- [ ] No console errors in browser
- [ ] No network errors (4xx, 5xx)
- [ ] CRUD operations work
- [ ] i18n works (VN/EN switch)
- [ ] Date format correct per locale
- [ ] Screenshots captured in `.doc/`
