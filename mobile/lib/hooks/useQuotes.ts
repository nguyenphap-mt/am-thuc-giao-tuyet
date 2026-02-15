// Quote hooks — list & detail
import { useQuery } from '@tanstack/react-query';
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
