// Quote hooks — list, detail & mutations
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

// Types
export interface QuoteItem {
    id: string;
    menu_item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

export interface Quote {
    id: string;
    code: string;
    customer_name: string;
    customer_phone?: string;
    event_date?: string;
    event_type?: string;
    guest_count?: number;
    status: string; // DRAFT | SENT | ACCEPTED | REJECTED | CONVERTED
    total_amount: number;
    discount_amount: number;
    final_amount: number;
    notes?: string;
    created_at: string;
    items?: QuoteItem[];
}

export interface CreateQuotePayload {
    customer_id?: string;
    customer_name: string;
    customer_phone?: string;
    customer_email?: string;
    event_date?: string;
    event_time?: string;
    event_address?: string;
    event_type?: string;
    notes?: string;
    guest_count?: number;
    table_count?: number;
    discount_total_percent?: number;
    is_vat_inclusive?: boolean;
    vat_rate?: number;
    total_amount?: number;
    valid_until?: string;
    status?: string;
    items?: {
        menu_item_id?: string;
        item_name: string;
        description?: string;
        uom?: string;
        quantity: number;
        unit_price: number;
        total_price: number;
        note?: string;
    }[];
    services?: any[];
    staff_count?: number;
}

// Hooks
export function useQuoteList(status?: string) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);

    return useQuery<Quote[]>({
        queryKey: ['quotes', status],
        queryFn: () => api.get(`/quotes?${params.toString()}`),
    });
}

export function useQuoteDetail(id: string | undefined) {
    return useQuery<Quote>({
        queryKey: ['quote', id],
        queryFn: () => api.get(`/quotes/${id}`),
        enabled: !!id,
    });
}

export function useCreateQuote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateQuotePayload) => api.post<Quote>('/quotes', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quotes'] });
        },
    });
}

