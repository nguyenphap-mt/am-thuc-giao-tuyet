# API Contract Definitions
> **Format**: REST API (JSON)
> **Authentication**: JWT Bearer Token
> **Base URL**: `/api/v1`

---

## 0. Common Patterns

### 0.1 Authentication Header
```http
Authorization: Bearer <jwt_token>
```

### 0.2 Standard Response Format
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150
  }
}
```

### 0.3 Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### 0.4 HTTP Status Codes
| Code | Meaning |
| :--- | :--- |
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (optimistic lock) |
| 429 | Rate Limited |
| 500 | Server Error |

---

## 1. Authentication APIs

### 1.1 Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secret123"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2g...",
    "expires_in": 3600,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "Nguyen Van A",
      "role": "admin",
      "tenant": {
        "id": "uuid",
        "name": "ABC Company",
        "plan": "business"
      }
    }
  }
}
```

### 1.2 Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

### 1.3 Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

### 1.4 Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

---

## 2. Inventory APIs

### 2.1 Items

#### List Items
```http
GET /api/v1/items?page=1&per_page=20&search=cable&category_id=uuid
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sku": "CAB-001",
      "name": "Cáp điện 3x2.5",
      "category": {
        "id": "uuid",
        "name": "Cáp điện"
      },
      "item_type": "raw_material",
      "base_uom": "m",
      "attributes": {
        "voltage": 220,
        "cross_section": 2.5
      },
      "stock_summary": {
        "on_hand": 1500,
        "reserved": 200,
        "available": 1300
      }
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 150 }
}
```

#### Create Item
```http
POST /api/v1/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "sku": "CAB-002",
  "name": "Cáp điện 4x4",
  "category_id": "uuid",
  "item_type": "raw_material",
  "base_uom": "m",
  "attributes": {
    "voltage": 380,
    "cross_section": 4
  },
  "is_serialized": false
}
```

#### Update Item
```http
PUT /api/v1/items/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Cáp điện 4x4 (Updated)",
  "attributes": { ... }
}
```

#### Delete Item
```http
DELETE /api/v1/items/:id
Authorization: Bearer <token>
```

### 2.2 Stock Movements

#### Create Stock In
```http
POST /api/v1/stock/in
Authorization: Bearer <token>
Content-Type: application/json

{
  "warehouse_id": "uuid",
  "reference_type": "purchase_order",
  "reference_id": "uuid",
  "lines": [
    {
      "item_id": "uuid",
      "quantity": 100,
      "uom": "m",
      "unit_cost": 25000,
      "lot_number": "LOT-2024-001"
    }
  ]
}
```

#### Create Stock Out
```http
POST /api/v1/stock/out
Authorization: Bearer <token>
Content-Type: application/json

{
  "warehouse_id": "uuid",
  "reference_type": "work_order",
  "reference_id": "uuid",
  "lines": [
    {
      "lot_id": "uuid",
      "quantity": 50,
      "uom": "m"
    }
  ]
}
```

---

## 3. Finance APIs

### 3.1 Chart of Accounts

#### List Accounts
```http
GET /api/v1/accounts?type=expense
Authorization: Bearer <token>
```

#### Create Account
```http
POST /api/v1/accounts
Content-Type: application/json

{
  "code": "6211",
  "name": "Chi phí NVL trực tiếp",
  "account_type": "expense",
  "parent_code": "621"
}
```

### 3.2 Journal Entries

#### Create Journal Entry
```http
POST /api/v1/journal-entries
Content-Type: application/json

{
  "entry_date": "2024-01-15",
  "description": "Xuất kho NVL cho dự án",
  "lines": [
    { "account_code": "621", "debit": 5000000, "credit": 0 },
    { "account_code": "152", "debit": 0, "credit": 5000000 }
  ]
}
```

#### Post Journal Entry
```http
POST /api/v1/journal-entries/:id/post
Authorization: Bearer <token>
```

---

## 4. Projects APIs

### 4.1 Projects

#### List Projects
```http
GET /api/v1/projects?status=active
Authorization: Bearer <token>
```

#### Create Project
```http
POST /api/v1/projects
Content-Type: application/json

{
  "code": "PRJ-2024-001",
  "name": "Vincom Tower",
  "customer_id": "uuid",
  "start_date": "2024-02-01",
  "end_date": "2024-12-31",
  "budget": 50000000000
}
```

### 4.2 Work Packages (WBS)

#### Get WBS Tree
```http
GET /api/v1/projects/:id/wbs
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Vincom Tower",
    "children": [
      {
        "id": "uuid",
        "wbs_path": "1",
        "name": "Phase 1: Foundation",
        "children": [
          {
            "id": "uuid",
            "wbs_path": "1.1",
            "name": "Excavation",
            "progress_pct": 100
          }
        ]
      }
    ]
  }
}
```

#### Create Work Package
```http
POST /api/v1/projects/:id/wbs
Content-Type: application/json

{
  "parent_id": "uuid",
  "code": "1.2",
  "name": "Concrete Pouring",
  "package_type": "task",
  "planned_start": "2024-03-01",
  "planned_end": "2024-03-15",
  "budget_cost": 500000000
}
```

#### Update Progress
```http
PATCH /api/v1/wbs/:id/progress
Content-Type: application/json

{
  "progress_pct": 75,
  "version": 1
}
```

**Response 409 (Conflict):**
```json
{
  "success": false,
  "error": {
    "code": "OPTIMISTIC_LOCK_CONFLICT",
    "message": "Data has been modified by another user. Please reload."
  }
}
```

---

## 5. Sales APIs

### 5.1 Customers

#### List Customers
```http
GET /api/v1/customers?search=vingroup
Authorization: Bearer <token>
```

#### Create Customer
```http
POST /api/v1/customers
Content-Type: application/json

{
  "code": "CUST-001",
  "name": "VinGroup JSC",
  "tax_code": "0123456789",
  "address": "72 Le Thanh Ton, District 1, HCMC",
  "credit_limit": 10000000000
}
```

### 5.2 Quotes

#### Create Quote
```http
POST /api/v1/quotes
Content-Type: application/json

{
  "customer_id": "uuid",
  "project_id": "uuid",
  "valid_until": "2024-02-28",
  "lines": [
    {
      "item_id": "uuid",
      "description": "Tủ điện chính",
      "quantity": 1,
      "uom": "bộ",
      "unit_price": 150000000
    }
  ]
}
```

#### Convert Quote to Order
```http
POST /api/v1/quotes/:id/convert-to-order
Authorization: Bearer <token>
```

---

## 6. Dashboard APIs

### 6.1 KPIs
```http
GET /api/v1/dashboard/kpis
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "sales": {
      "revenue": 25500000000,
      "pipeline": 45200000000,
      "win_rate": 32.5
    },
    "manufacturing": {
      "oee": 82.3,
      "on_time_delivery": 94.5
    },
    "inventory": {
      "stock_turnover": 6.2,
      "stockout_rate": 1.8
    },
    "finance": {
      "cash_position": 8200000000,
      "ar_aging_90": 15.2,
      "dso": 42
    },
    "projects": {
      "active_count": 13,
      "on_track": 8,
      "at_risk": 3,
      "behind": 2
    }
  },
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### 6.2 Alerts
```http
GET /api/v1/dashboard/alerts?severity=critical
Authorization: Bearer <token>
```

---

## 7. WebSocket Events

### 7.1 Connection
```javascript
const ws = new WebSocket('wss://api.example.com/ws');
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'dashboard',
  token: 'jwt_token'
}));
```

### 7.2 Events
| Event | Payload |
| :--- | :--- |
| `kpi.updated` | `{ metric: "revenue", value: 25500000000 }` |
| `alert.triggered` | `{ id: "uuid", severity: "critical", message: "..." }` |
| `wbs.updated` | `{ project_id: "uuid", task_id: "uuid", progress: 75 }` |
