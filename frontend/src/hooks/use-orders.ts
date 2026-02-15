import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Order, OrderPayment, PaginatedResponse } from '@/types';
import { toast } from 'sonner';

interface AddPaymentData {
    amount: number;
    payment_method: string;
    reference_no?: string;
    note?: string;
}

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

export function useOrder(id: string) {
    return useQuery({
        queryKey: ['order', id],
        queryFn: () => api.get<Order>(`/orders/${id}`),
        enabled: !!id,
    });
}

// ISS-004 Fix: Use correct backend endpoints for status changes
type OrderAction = 'confirm' | 'start' | 'complete' | 'cancel' | 'hold' | 'resume' | 'mark-paid';

export function useOrderAction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, action }: { id: string; action: OrderAction }) =>
            api.post<Order>(`/orders/${id}/${action}`, {}),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['order', variables.id] });
            const actionLabels: Record<OrderAction, string> = {
                'confirm': 'Xác nhận đơn hàng',
                'start': 'Bắt đầu thực hiện đơn hàng',
                'complete': 'Hoàn thành đơn hàng',
                'cancel': 'Hủy đơn hàng',
                'hold': 'Tạm hoãn đơn hàng',
                'resume': 'Tiếp tục đơn hàng',
                'mark-paid': 'Đánh dấu đã thanh toán',
            };
            toast.success(`${actionLabels[variables.action]} thành công`);
        },
        onError: () => {
            toast.error('Không thể thực hiện thao tác');
        },
    });
}

// Legacy hook - deprecated, use useOrderAction instead
export function useUpdateOrderStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            // Map status to action
            const actionMap: Record<string, OrderAction> = {
                'CONFIRMED': 'confirm',
                'COMPLETED': 'complete',
                'CANCELLED': 'cancel',
                'ON_HOLD': 'hold',
                'PAID': 'mark-paid',
            };
            const action = actionMap[status];
            if (!action) {
                throw new Error(`Unknown status: ${status}`);
            }
            return api.post<Order>(`/orders/${id}/${action}`, {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success('Cập nhật trạng thái thành công');
        },
        onError: () => {
            toast.error('Không thể cập nhật trạng thái');
        },
    });
}

// Add payment to an order
export function useAddPayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orderId, data }: { orderId: string; data: AddPaymentData }) =>
            api.post<OrderPayment>(`/orders/${orderId}/payments`, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
            toast.success('Thêm thanh toán thành công');
        },
        onError: () => {
            toast.error('Không thể thêm thanh toán');
        },
    });
}
