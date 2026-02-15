import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Quote, PaginatedResponse, CreateQuotePayload } from '@/types';
import { toast } from 'sonner';

interface QuoteFilters {
    page?: number;
    page_size?: number;
    status?: string;
    search?: string;
}

export function useQuotes(filters: QuoteFilters = {}) {
    return useQuery({
        queryKey: ['quotes', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.page) params.append('page', filters.page.toString());
            if (filters.page_size) params.append('page_size', filters.page_size.toString());
            if (filters.status) params.append('status', filters.status);
            if (filters.search) params.append('search', filters.search);

            const response = await api.get<Quote[] | PaginatedResponse<Quote>>(`/quotes?${params.toString()}`);

            // Normalize response: backend returns raw array, but we need PaginatedResponse format
            if (Array.isArray(response)) {
                // Backend returns raw array - wrap it in PaginatedResponse format
                return {
                    items: response,
                    total: response.length,
                    page: 1,
                    page_size: response.length,
                    total_pages: 1
                } as PaginatedResponse<Quote>;
            }

            // Backend returns paginated response (future-proof)
            return response;
        },
    });
}

export function useQuote(id: string | number) {
    return useQuery({
        queryKey: ['quote', id],
        queryFn: () => api.get<Quote>(`/quotes/${id}`),
        enabled: !!id && id !== 'create',
    });
}

export function useCreateQuote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateQuotePayload) => api.post<Quote>('/quotes', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quotes'] });
            toast.success('Tạo báo giá thành công');
        },
        onError: (error: any) => {
            // ISS-001 FIX: Handle Pydantic v2 validation error array format
            // Pydantic v2 returns: { detail: [{ type, loc, msg, input, ctx }] }
            // We need to extract error messages properly to avoid React render crash
            let message = 'Không thể tạo báo giá';
            const detail = error?.response?.data?.detail;

            if (Array.isArray(detail)) {
                // Pydantic v2 format: extract and join all error messages
                message = detail.map((e: any) => e.msg || e.message || String(e)).join(', ');
            } else if (typeof detail === 'string') {
                message = detail;
            } else if (typeof detail === 'object' && detail?.msg) {
                // Single error object
                message = detail.msg;
            } else if (error?.message) {
                message = error.message;
            }

            toast.error(message);
        },
    });
}

export function useUpdateQuote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: Partial<Quote> }) =>
            api.put<Quote>(`/quotes/${id}`, data),
        onSuccess: (_data, variables) => {
            // BUGFIX: BUG-20260203-001 - Invalidate BOTH list AND single quote cache
            // Previously only list was invalidated, causing stale data on re-edit
            queryClient.invalidateQueries({ queryKey: ['quotes'] });
            queryClient.invalidateQueries({ queryKey: ['quote', variables.id] });
            toast.success('Cập nhật báo giá thành công');
        },
        onError: () => {
            toast.error('Không thể cập nhật báo giá');
        },
    });
}

export function useDeleteQuote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => api.delete(`/quotes/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quotes'] });
            toast.success('Xóa báo giá thành công');
        },
        onError: () => {
            toast.error('Không thể xóa báo giá');
        },
    });
}

// PRD-QUOTE-LOST-001: Mark quote as lost (declined by customer)
export function useMarkQuoteLost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, reason }: { id: string | number; reason?: string }) =>
            api.post(`/quotes/${id}/mark-lost`, { reason }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quotes'] });
            toast.success('Đã đánh dấu báo giá là "Không chốt"');
        },
        onError: () => {
            toast.error('Không thể cập nhật trạng thái báo giá');
        },
    });
}
