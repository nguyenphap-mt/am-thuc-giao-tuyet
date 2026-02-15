/**
 * Hook for converting a Quote to an Order
 * Calls POST /quotes/{quoteId}/convert-to-order
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface ConvertResponse {
    success: boolean;
    message: string;
    order_id: string;
    order_code: string;
    quote_code: string;
}

export function useConvertToOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (quoteId: string): Promise<ConvertResponse> => {
            const response = await api.post<ConvertResponse>(`/quotes/${quoteId}/convert-to-order`);
            return response;
        },
        onSuccess: (data) => {
            toast.success(data.message || 'Đã chuyển báo giá thành đơn hàng');
            // Invalidate both quotes and orders
            queryClient.invalidateQueries({ queryKey: ['quotes'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
        onError: (error: any) => {
            const message = error?.response?.data?.detail || error?.message || 'Không thể chuyển đổi báo giá';
            toast.error(message);
        },
    });
}
