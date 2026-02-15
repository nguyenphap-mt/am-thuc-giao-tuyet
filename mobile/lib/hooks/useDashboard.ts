// Dashboard hook — KPI stats + today's events
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import type { Order } from './useOrders';

// Types
export interface DashboardStats {
    revenue: { total: number; today: number; this_month: number };
    orders: { total: number; pending: number; confirmed: number; in_progress: number; completed: number };
    expenses: { total: number; this_month: number };
    receivables: { total: number; overdue: number };
}

// Hooks
export function useDashboardStats() {
    return useQuery<DashboardStats>({
        queryKey: ['dashboard-stats'],
        queryFn: () => api.get('/dashboard/stats'),
        staleTime: 60_000, // 1 minute
    });
}

export function useTodayOrders() {
    const today = new Date().toISOString().split('T')[0];
    return useQuery<Order[]>({
        queryKey: ['today-orders', today],
        queryFn: async () => {
            // BUGFIX: BUG-20260215-001
            // Backend returns PaginatedOrderResponse { items, total }
            // Extract .items from paginated response
            const res = await api.get(`/orders?event_date=${today}`);
            return Array.isArray(res) ? res : (res.items ?? []);
        },
        staleTime: 60_000,
    });
}
