import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ============ TYPES ============

export interface OverviewStats {
    revenue_month: number;
    revenue_prev_month: number;
    revenue_trend: number;
    expenses_month: number;
    expenses_trend: number;
    profit_month: number;
    profit_margin: number;
    orders_month: number;
    orders_trend: number;
    inventory_value: number;
    inventory_warning: number;
    receivables_total: number;
    receivables_overdue: number;
    employees_active: number;
    customers_total: number;
    new_customers: number;
}

export interface RevenueByPeriod {
    period: string;
    revenue: number;
    expenses: number;
    profit: number;
    orders_count: number;
}

export interface TopCustomer {
    customer_name: string;
    total_revenue: number;
    orders_count: number;
}

export interface TopMenuItem {
    item_name: string;
    quantity: number;
    revenue: number;
}

export interface SalesReport {
    revenue_by_period: RevenueByPeriod[];
    top_customers: TopCustomer[];
    top_items: TopMenuItem[];
    avg_order_value: number;
    conversion_rate: number;
    total_quotes: number;
    total_orders: number;
}

export interface InventoryMovement {
    period: string;
    imports_value: number;
    exports_value: number;
    net_value: number;
}

export interface TopInventoryItem {
    item_name: string;
    quantity_used: number;
    unit: string;
}

export interface ExpiringLot {
    item_name: string;
    lot_number: string;
    quantity: number;
    expiry_date: string | null;
    days_until_expiry: number;
}

export interface InventoryReport {
    movements: InventoryMovement[];
    top_consumed: TopInventoryItem[];
    expiring_lots: ExpiringLot[];
    total_value: number;
    total_sku: number;
    warning_items: number;
    out_of_stock: number;
    turnover_rate: number;
}

export interface SupplierSpend {
    supplier_name: string;
    total_spend: number;
    po_count: number;
}

export interface POStatusBreakdown {
    status: string;
    count: number;
    total_value: number;
}

export interface ProcurementReport {
    total_spend: number;
    total_pos: number;
    spend_trend: RevenueByPeriod[];
    top_suppliers: SupplierSpend[];
    po_status_breakdown: POStatusBreakdown[];
    avg_po_value: number;
}

export interface DepartmentHeadcount {
    department: string;
    count: number;
}

export interface HRSummaryCard {
    label: string;
    value: number;
    unit: string;
}

export interface HRReport {
    total_employees: number;
    active_employees: number;
    total_hours_month: number;
    total_payroll_month: number;
    department_headcount: DepartmentHeadcount[];
    summary_cards: HRSummaryCard[];
}

// ============ HOOKS ============

export function useAnalyticsOverview(params: DateRangeParams = {}) {
    const search = new URLSearchParams();
    if (params.from_date) search.append('from_date', params.from_date);
    if (params.to_date) search.append('to_date', params.to_date);
    const qs = search.toString();

    return useQuery({
        queryKey: ['analytics-overview', params],
        queryFn: () => api.get<OverviewStats>(`/analytics/overview${qs ? `?${qs}` : ''}`),
        staleTime: 5 * 60 * 1000, // 5 min cache
    });
}

interface DateRangeParams {
    from_date?: string;
    to_date?: string;
    group_by?: 'day' | 'week' | 'month';
}

export function useSalesReport(params: DateRangeParams = {}) {
    const search = new URLSearchParams();
    if (params.from_date) search.append('from_date', params.from_date);
    if (params.to_date) search.append('to_date', params.to_date);
    if (params.group_by) search.append('group_by', params.group_by);
    const qs = search.toString();

    return useQuery({
        queryKey: ['analytics-sales', params],
        queryFn: () => api.get<SalesReport>(`/analytics/sales${qs ? `?${qs}` : ''}`),
        staleTime: 5 * 60 * 1000,
    });
}

export function useInventoryReport(params: DateRangeParams = {}) {
    const search = new URLSearchParams();
    if (params.from_date) search.append('from_date', params.from_date);
    if (params.to_date) search.append('to_date', params.to_date);
    const qs = search.toString();

    return useQuery({
        queryKey: ['analytics-inventory', params],
        queryFn: () => api.get<InventoryReport>(`/analytics/inventory${qs ? `?${qs}` : ''}`),
        staleTime: 5 * 60 * 1000,
    });
}

export function useProcurementReport(params: DateRangeParams = {}) {
    const search = new URLSearchParams();
    if (params.from_date) search.append('from_date', params.from_date);
    if (params.to_date) search.append('to_date', params.to_date);
    const qs = search.toString();

    return useQuery({
        queryKey: ['analytics-procurement', params],
        queryFn: () => api.get<ProcurementReport>(`/analytics/procurement${qs ? `?${qs}` : ''}`),
        staleTime: 5 * 60 * 1000,
    });
}

export function useHRReport(params: DateRangeParams = {}) {
    const search = new URLSearchParams();
    if (params.from_date) search.append('from_date', params.from_date);
    if (params.to_date) search.append('to_date', params.to_date);
    const qs = search.toString();

    return useQuery({
        queryKey: ['analytics-hr', params],
        queryFn: () => api.get<HRReport>(`/analytics/hr${qs ? `?${qs}` : ''}`),
        staleTime: 5 * 60 * 1000,
    });
}
