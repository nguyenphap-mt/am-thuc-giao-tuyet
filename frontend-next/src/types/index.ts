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
    id: number;
    name: string;
    category: string;
    price: number;
    description?: string;
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

// Quote
export interface Quote {
    id: number;
    quote_number: string;
    customer_id: number;
    customer_name: string;
    event_date: string;
    event_location: string;
    guest_count: number;
    total_amount: number;
    status: 'draft' | 'sent' | 'confirmed' | 'cancelled';
    created_at: string;
    items: QuoteItem[];
}

export interface QuoteItem {
    id: number;
    menu_item_id: number;
    menu_item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

// Order
export interface Order {
    id: number;
    order_number: string;
    customer_id: number;
    customer_name: string;
    event_date: string;
    event_location: string;
    guest_count: number;
    total_amount: number;
    status: 'pending' | 'confirmed' | 'preparing' | 'completed' | 'cancelled';
    created_at: string;
}

// Inventory Item
export interface InventoryItem {
    id: number;
    name: string;
    category: string;
    unit: string;
    quantity: number;
    min_quantity: number;
    cost_price: number;
    latest_purchase_price: number;
    is_active: boolean;
}

// Supplier
export interface Supplier {
    id: number;
    name: string;
    contact_person: string;
    phone: string;
    email?: string;
    address?: string;
    is_active: boolean;
}

// Purchase Order
export interface PurchaseOrder {
    id: number;
    po_number: string;
    supplier_id: number;
    supplier_name: string;
    order_date: string;
    expected_date: string;
    total_amount: number;
    status: 'draft' | 'pending' | 'approved' | 'received' | 'cancelled';
    items: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
    id: number;
    inventory_item_id: number;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

// Employee
export interface Employee {
    id: number;
    tenant_id: string;
    full_name: string;
    role_type: string;
    phone?: string;
    email?: string;
    is_fulltime: boolean;
    hourly_rate: number;
    base_salary: number;
    is_active: boolean;
    id_number?: string;
    date_of_birth?: string;
    address?: string;
    bank_account?: string;
    bank_name?: string;
    emergency_contact?: string;
    joined_date?: string;
    notes?: string;
    // User-Employee link
    user_id?: string;
    has_login_account: boolean;
    created_at: string;
    updated_at: string;
    // Legacy compat
    position?: string;
    department?: string;
    hire_date?: string;
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
