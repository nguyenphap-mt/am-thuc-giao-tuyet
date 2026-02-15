// Reports hooks — revenue & order analytics
import { useQuery } from '@tanstack/react-query';
import api from '../api';

// Types — mirroring backend OverviewStats model
export interface AnalyticsOverview {
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

export interface RevenueReport {
    total_revenue: number;
    total_orders: number;
    avg_order_value: number;
    period: string;
}

// Hooks
export function useRevenueReport(period: string = '30d') {
    return useQuery<RevenueReport>({
        queryKey: ['revenue-report', period],
        queryFn: () => api.get(`/analytics/revenue?period=${period}`),
        staleTime: 120_000, // 2 minutes
    });
}

// BUGFIX: BUG-20260215-002
// Changed from non-existent /analytics/dashboard to /analytics/overview
export function useAnalyticsDashboard() {
    return useQuery<AnalyticsOverview>({
        queryKey: ['analytics-dashboard'],
        queryFn: () => api.get('/analytics/overview'),
        staleTime: 120_000,
    });
}
