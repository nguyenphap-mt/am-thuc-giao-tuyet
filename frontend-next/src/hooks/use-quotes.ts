import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Quote, PaginatedResponse } from '@/types';
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

            return api.get<PaginatedResponse<Quote>>(`/quotes?${params.toString()}`);
        },
    });
}

export function useQuote(id: number) {
    return useQuery({
        queryKey: ['quote', id],
        queryFn: () => api.get<Quote>(`/quotes/${id}`),
        enabled: !!id,
    });
}

export function useCreateQuote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Partial<Quote>) => api.post<Quote>('/quotes', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quotes'] });
            toast.success('Tạo báo giá thành công');
        },
        onError: () => {
            toast.error('Không thể tạo báo giá');
        },
    });
}

export function useUpdateQuote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<Quote> }) =>
            api.put<Quote>(`/quotes/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quotes'] });
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
