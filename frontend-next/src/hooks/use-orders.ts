import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Order, PaginatedResponse } from '@/types';
import { toast } from 'sonner';

interface OrderFilters {
    page?: number;
    page_size?: number;
    status?: string;
    search?: string;
}

export function useOrders(filters: OrderFilters = {}) {
    return useQuery({
        queryKey: ['orders', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.page) params.append('page', filters.page.toString());
            if (filters.page_size) params.append('page_size', filters.page_size.toString());
            if (filters.status) params.append('status', filters.status);
            if (filters.search) params.append('search', filters.search);

            return api.get<PaginatedResponse<Order>>(`/orders?${params.toString()}`);
        },
    });
}

export function useOrder(id: number) {
    return useQuery({
        queryKey: ['order', id],
        queryFn: () => api.get<Order>(`/orders/${id}`),
        enabled: !!id,
    });
}

export function useUpdateOrderStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            api.patch<Order>(`/orders/${id}/status`, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success('Cập nhật trạng thái thành công');
        },
        onError: () => {
            toast.error('Không thể cập nhật trạng thái');
        },
    });
}
