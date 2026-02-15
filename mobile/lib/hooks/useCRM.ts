// CRM hooks — customer list, detail, interactions
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

// Types
export interface Customer {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    customer_type?: string; // PERSONAL | CORPORATE
    total_orders?: number;
    total_revenue?: number;
    last_order_date?: string;
    birthday?: string;
    notes?: string;
    created_at: string;
}

export interface InteractionLog {
    id: string;
    customer_id: string;
    type: string; // CALL | EMAIL | MEETING | NOTE
    content: string;
    created_at: string;
    created_by?: string;
}

export interface CreateInteractionPayload {
    type: string;
    content: string;
}

// Hooks
export function useCustomerList(search?: string) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('limit', '50');

    return useQuery<Customer[]>({
        queryKey: ['customers', search],
        queryFn: () => api.get(`/crm/customers?${params.toString()}`),
    });
}

export function useCustomerDetail(id: string | undefined) {
    return useQuery<Customer>({
        queryKey: ['customer', id],
        queryFn: () => api.get(`/crm/customers/${id}`),
        enabled: !!id,
    });
}

export function useCustomerInteractions(customerId: string | undefined) {
    return useQuery<InteractionLog[]>({
        queryKey: ['customer-interactions', customerId],
        queryFn: () => api.get(`/crm/customers/${customerId}/interactions`),
        enabled: !!customerId,
    });
}

// Typed response for customer statistics
export interface CustomerStats {
    total_customers: number;
    active_customers: number;
    corporate_customers: number;
    top_revenue: number;
}

export function useCustomerStats() {
    return useQuery<CustomerStats>({
        queryKey: ['customer-stats'],
        queryFn: () => api.get('/crm/customers/stats'),
    });
}

export function useCreateInteraction(customerId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateInteractionPayload) =>
            api.post(`/crm/customers/${customerId}/interactions`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['customer-interactions', customerId] });
        },
    });
}
