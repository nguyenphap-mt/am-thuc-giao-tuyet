// Add to existing API Contracts

### 8. Menu Management (Module 1.2)

#### 8.1 Items
```http
GET /api/v1/menu/items
GET /api/v1/menu/items/{id}
POST /api/v1/menu/items
PUT /api/v1/menu/items/{id}
DELETE /api/v1/menu/items/{id}
```

#### 8.2 Categories
```http
GET /api/v1/menu/categories
POST /api/v1/menu/categories
```

#### 8.3 Set Menus
```http
GET /api/v1/menu/sets
POST /api/v1/menu/sets
```

#### 11.2 Purchase Orders
```http
GET /api/v1/procurement/purchase-orders
POST /api/v1/procurement/purchase-orders
POST /api/v1/procurement/purchase-orders/{id}/receive
```

### 12. HR Management (Module 2.3)

#### 12.1 Employees
```http
GET /api/v1/hr/employees
POST /api/v1/hr/employees
```

#### 12.2 Assignments (Rostering)
```http
GET /api/v1/hr/assignments?event_id={uuid}
POST /api/v1/hr/assignments
POST /api/v1/hr/assignments/{id}/check-in
```

### 13. Finance Management (Module 3.1)

#### 13.1 Chart of Accounts
```http
GET /api/v1/finance/accounts
POST /api/v1/finance/accounts
```

#### 13.2 Journal Entries
```http
GET /api/v1/finance/journals
POST /api/v1/finance/journals
```

### 14. CRM (Module 3.2)

#### 14.1 Customers
```http
GET /api/v1/crm/customers?search={phone}
POST /api/v1/crm/customers
GET /api/v1/crm/customers/{id}
```

#### 14.2 Interactions
```http
POST /api/v1/crm/customers/{id}/interactions
```

### 15. Analytics (Module 3.3)

#### 15.1 Reports
```http
GET /api/v1/analytics/overview
GET /api/v1/analytics/revenue-chart?year=2024
GET /api/v1/analytics/top-items
```

### 16. Mobile API (Module 4.1)

#### 16.1 Staff Operations
```http
GET /api/mobile/v1/my-schedule
POST /api/mobile/v1/tasks/{id}/check-in
POST /api/mobile/v1/tasks/{id}/complete
GET /api/mobile/v1/notifications
```

### 17. Notification System (Module 4.2)

#### 17.1 Internal
```http
POST /api/internal/notify
```

### 18. Advanced Inventory (Module 4.3)

#### 18.1 Recipes (BOM)
```http
GET /api/v1/inventory/recipes
POST /api/v1/inventory/recipes
POST /api/v1/inventory/recipes/{id}/calculate-cost
```

### 19. Dashboard KPI (Homepage)

#### 19.1 Overview Stats
```http
GET /api/v1/dashboard/overview
```

#### 19.2 Activity Feed
```http
GET /api/v1/dashboard/activity?limit=10
```

#### 19.3 Upcoming Events
```http
GET /api/v1/dashboard/upcoming-events?limit=5
```

### 20. User Management (Module 8)

#### 20.1 Users
```http
GET /api/v1/users
GET /api/v1/users/{id}
POST /api/v1/users
PUT /api/v1/users/{id}
DELETE /api/v1/users/{id}
```

#### 20.2 Authentication
```http
POST /api/v1/auth/login
GET /api/v1/auth/me
POST /api/v1/auth/refresh
```


### 20.5 Supplier Management (Procurement)

#### 20.5.1 Supplier CRUD
```http
GET    /api/v1/procurement/suppliers          # List (paginated)
       ?search={text}&category={FOOD|BEVERAGE|EQUIPMENT|SERVICE|OTHER}
       &is_active={true|false}&skip={0}&limit={50}
       → { items: Supplier[], total: int, skip: int, limit: int }

GET    /api/v1/procurement/suppliers/{id}     # Detail + PO history
       → { supplier: Supplier, purchase_orders: PO[], stats: SupplierStats }

POST   /api/v1/procurement/suppliers          # Create
       Body: { name*, category, contact_person, phone, email, ... }
       → Supplier (201) | 422 (validation error)

PUT    /api/v1/procurement/suppliers/{id}     # Update
       Body: { name*, ... }
       → Supplier (200) | 404

DELETE /api/v1/procurement/suppliers/{id}     # Delete
       → 200 | 400 (has linked POs)
```

#### 20.5.2 Supplier Stats
```http
GET    /api/v1/procurement/suppliers/stats
       → { total, active, inactive, total_balance, categories: {} }
```

### 21. CRM (Customer Management)

#### 21.1 Customers
`http
GET /api/v1/crm/customers         # List with pagination/search
GET /api/v1/crm/customers/{id}    # Detail
POST /api/v1/crm/customers        # Create
PUT /api/v1/crm/customers/{id}    # Update
DELETE /api/v1/crm/customers/{id} # Delete
`

#### 21.2 Stats
`http
GET /api/v1/crm/stats             # KPI counters
`

