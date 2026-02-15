// Order Management hook — read orders + update status via existing Order APIs
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

// Types
export interface OrderItem {
    id: string;
    menu_item_id?: string;
    menu_item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes?: string;
}

export interface Order {
    id: string;
    code: string;
    customer_name: string;
    customer_phone?: string;
    event_date?: string;
    event_time_start?: string;
    event_time_end?: string;
    event_location?: string;
    status: string; // DRAFT | PENDING | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED
    guest_count?: number;
    final_amount: number;
    paid_amount: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    items?: OrderItem[];
    assigned_staff?: any[];
}

export interface OrderStats {
    total_orders: number;
    pending: number;
    confirmed: number;
    in_progress: number;
    completed: number;
    total_revenue: number;
}

// Hooks
export function useOrderList(status?: string) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);

    const endpoint = params.toString()
        ? `/orders?${params.toString()}`
        : '/orders';

    return useQuery<Order[]>({
        queryKey: ['orders', status],
        queryFn: async () => {
            const res = await api.get(endpoint);
            // Backend returns PaginatedOrderResponse { items, total, page, ... }
            return Array.isArray(res) ? res : (res.items ?? []);
        },
    });
}

export function useOrderDetail(id: string | undefined) {
    return useQuery<Order>({
        queryKey: ['order', id],
        queryFn: () => api.get(`/orders/${id}`),
        enabled: !!id,
    });
}

export function useUpdateOrderStatus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            api.put(`/orders/${id}/status`, { status }),
        onSuccess: (_data, variables) => {
            qc.invalidateQueries({ queryKey: ['orders'] });
            qc.invalidateQueries({ queryKey: ['order', variables.id] });
        },
    });
}
