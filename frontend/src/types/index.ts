// Common types used across the application

// Pagination
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

// API Error
export interface ApiError {
    detail: string;
    status_code: number;
}

// Select option
export interface SelectOption {
    value: string | number;
    label: string;
}

// Table column
export interface TableColumn<T> {
    key: keyof T | string;
    header: string;
    sortable?: boolean;
    width?: string;
    render?: (row: T) => React.ReactNode;
}

// Status badge variant
export type StatusVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

// Common entity fields
export interface BaseEntity {
    id: number;
    created_at: string;
    updated_at: string;
    tenant_id: number;
}

// Menu Item
export interface MenuItem {
    id: string; // UUID from backend
    name: string;
    category_id?: string;
    category?: string; // For display
    selling_price: string | number;
    cost_price?: string | number;
    description?: string;
    uom?: string;
    is_active: boolean;
}

// Customer
export interface Customer {
    id: number;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    loyalty_tier?: string;
    total_orders: number;
    total_spent: number;
}

// Quote - Synced with backend Quote entity (entities.py)
export interface Quote {
    id: number;  // UUID string from backend but used as number in some places
    code: string;  // Quote code (e.g., BG-2026XXXX)
    quote_number?: string;  // Legacy support
    tenant_id?: string;
    customer_id?: string;
    customer_name: string;
    customer_phone?: string;
    customer_email?: string;
    event_date: string;
    event_time?: string;
    event_location?: string;  // Legacy support
    event_address?: string;
    event_type?: string;
    guest_count: number;
    table_count?: number;
    staff_count?: number;
    notes?: string;
    company_name?: string;

    // Pricing
    subtotal?: number;
    total_amount: number;

    // Discounts
    discount_furniture_percent?: number;
    discount_staff_percent?: number;
    discount_total_percent?: number;

    // VAT
    is_vat_inclusive?: boolean;
    vat_rate?: number;
    vat_amount?: number;

    // Status - PRD-QUOTE-LOST-001
    status: 'DRAFT' | 'NEW' | 'APPROVED' | 'CONVERTED' | 'REJECTED' | 'LOST' | 'EXPIRED' | 'draft' | 'sent' | 'confirmed' | 'cancelled';
    valid_until?: string;

    // Lost/Expired tracking - PRD-QUOTE-LOST-001
    lost_reason?: string;
    lost_at?: string;
    expired_at?: string;

    // Audit
    created_by?: string;
    updated_by?: string;
    converted_by?: string;
    converted_at?: string;
    created_at: string;
    updated_at?: string;

    // Relations
    items: QuoteItem[];
    services?: QuoteServiceBase[];
}

export interface QuoteItem {
    id: number;
    menu_item_id: number;
    menu_item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

// ISS-005: Proper payload interface for creating quotes
export interface CreateQuotePayload {
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    event_date: string;
    event_time: string;
    event_address: string;
    event_type: string;
    guest_count?: number;
    table_count: number;
    notes?: string;
    status?: 'DRAFT' | 'PENDING' | 'APPROVED';
    items?: QuoteItemBase[];
    services?: QuoteServiceBase[];
}

export interface QuoteItemBase {
    menu_item_id?: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

export interface QuoteServiceBase {
    service_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

// Order - Synced with backend Order entity
export interface Order {
    id: string;  // UUID from backend
    code: string;  // Order code (e.g., DH-2026XXXX)
    tenant_id: string;
    quote_id?: string;
    customer_id?: string;
    customer_name: string;
    customer_phone?: string;
    event_type?: string;
    event_date: string;
    event_time?: string;
    event_address?: string;
    guest_count?: number;
    total_amount: number;
    discount_amount?: number;
    vat_rate?: number;
    vat_amount?: number;
    final_amount: number;
    paid_amount: number;
    balance_amount: number;
    expenses_amount?: number;  // R1: Order Cost Tracking
    cost_amount?: number;  // Total cost from menu item cost_prices
    status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'PAID' | 'CANCELLED';
    note?: string;
    confirmed_at?: string;
    completed_at?: string;
    created_at: string;
    updated_at: string;
    items?: OrderItem[];
    payments?: OrderPayment[];

    // Revision Tracking (Order Amendment Feature)
    replaced_by_order_id?: string;  // New order that replaced this one
    replaces_order_id?: string;  // Old order this one replaced  
    cancel_reason?: string;  // Reason for cancellation
}


// Order Item - Synced with backend OrderItem entity  
export interface OrderItem {
    id: string;
    order_id: string;
    menu_item_id?: string;
    item_name: string;
    category?: string;
    description?: string;
    uom: string;
    quantity: number;
    unit_price: number;
    cost_price?: number;  // BUG-20260203-002: Unit cost for profit calculation
    total_price: number;
    note?: string;
    created_at: string;
}

// Order Payment - Synced with backend OrderPayment entity
export interface OrderPayment {
    id: string;
    order_id: string;
    amount: number;
    payment_method: 'CASH' | 'TRANSFER' | 'CARD';
    payment_date: string;
    reference_no?: string;
    note?: string;
    created_at: string;
}



// Inventory Item
export interface InventoryItem {
    id: number;
    name: string;
    sku?: string;
    category: string;
    unit: string;
    quantity: number;
    min_quantity: number;
    cost_price: number;
    latest_purchase_price: number;
    is_active: boolean;
}

// Inventory Transaction
export interface InventoryTransaction {
    id: string;
    item_id: string;
    item_name?: string;
    warehouse_id: string;
    warehouse_name?: string;
    transaction_type: 'IMPORT' | 'EXPORT';
    quantity: number;
    reference_doc?: string;
    notes?: string;
    unit_price?: number;
    lot_id?: string;
    created_at: string;
    created_by?: string;
}

// Inventory Lot (FIFO)
export interface InventoryLot {
    id: string;
    item_id: string;
    item_name?: string;
    warehouse_id: string;
    lot_number: string;
    expiry_date?: string;
    remaining_quantity: number;
    initial_quantity: number;
    unit_cost: number;
    created_at: string;
}

// Supplier
export interface Supplier {
    id: string;  // UUID from backend
    tenant_id?: string;
    name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
    tax_id?: string;
    category: string;  // FOOD, BEVERAGE, EQUIPMENT, SERVICE, OTHER
    website?: string;
    notes?: string;
    is_active: boolean;
    payment_terms: string;  // IMMEDIATE, NET15, NET30, NET60, NET90
    bank_account?: string;
    bank_name?: string;
    balance: number;
    created_at?: string;
    updated_at?: string;
}

// Purchase Order — Synced with backend PO entity (UUID, UPPERCASE statuses)
export interface PurchaseOrder {
    id: string;  // UUID from backend
    tenant_id?: string;
    supplier_id?: string;
    code: string;
    total_amount: number;
    status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'PAID' | 'CANCELLED';
    expected_delivery?: string;
    note?: string;
    payment_terms?: string;
    due_date?: string;
    paid_amount?: number;
    payment_date?: string;
    created_at?: string;
    updated_at?: string;
    supplier?: Supplier;
    items: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
    id: string;  // UUID from backend
    purchase_order_id: string;
    item_id?: string;  // FK to inventory_items
    item_name: string;
    quantity: number;
    uom?: string;
    unit_price: number;
    total_price: number;
    created_at?: string;
}

// Employee - Synced with backend HR Module
export interface Employee {
    id: number;
    tenant_id?: string;
    full_name: string;
    email?: string;
    phone?: string;
    position?: string;  // Legacy field for display
    department?: string;  // Legacy field for display
    role_type: 'CHEF' | 'WAITER' | 'DRIVER' | 'MANAGER' | 'KITCHEN' | 'LEAD' | string;
    is_active: boolean;
    is_fulltime: boolean;
    hourly_rate: number;
    base_salary?: number;  // Monthly salary for fulltime employees
    id_number?: string;
    date_of_birth?: string;
    address?: string;
    bank_account?: string;
    bank_name?: string;
    emergency_contact?: string;
    joined_date?: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
    // Per-employee payroll config
    allowance_meal?: number;
    allowance_transport?: number;
    allowance_phone?: number;
    allowance_other?: number;
    insurance_salary_base?: number;  // Mức lương hưởng BHXH
    rate_social_override?: number;   // Override % BHXH
    rate_health_override?: number;   // Override % BHYT
    rate_unemployment_override?: number;  // Override % BHTN
    // User-Employee link
    user_id?: string;
    has_login_account?: boolean;
    login_email?: string;
    login_role?: string;
    account_active?: boolean;
}

// Employee Create/Update payload
export interface EmployeePayload {
    full_name: string;
    role_type?: string;
    phone?: string;
    email?: string;
    is_fulltime?: boolean;
    hourly_rate?: number;
    base_salary?: number;  // Monthly salary for fulltime
    is_active?: boolean;
    id_number?: string;
    date_of_birth?: string;
    address?: string;
    bank_account?: string;
    bank_name?: string;
    emergency_contact?: string;
    notes?: string;
    // Login account fields (User-Employee Unification)
    create_account?: boolean;
    login_email?: string;
    login_password?: string;
    login_role?: string;
    // Per-employee payroll config
    allowance_meal?: number;
    allowance_transport?: number;
    allowance_phone?: number;
    allowance_other?: number;
    insurance_salary_base?: number;
    rate_social_override?: number;
    rate_health_override?: number;
    rate_unemployment_override?: number;
}

// Dashboard Stats
export interface DashboardStats {
    total_orders: number;
    total_revenue: number;
    pending_orders: number;
    customers_count: number;
    orders_today: number;
    revenue_today: number;
}

// User
export interface User {
    id: number;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
    tenant_id: number;
}
