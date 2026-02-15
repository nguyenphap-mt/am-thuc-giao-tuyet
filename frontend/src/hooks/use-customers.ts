'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// ========== TYPES ==========

export interface CustomerData {
    id: string;
    tenant_id?: string;
    full_name: string;
    phone?: string;
    email?: string;
    address?: string;
    source?: string;
    notes?: string;
    customer_type?: string;
    loyalty_tier?: string;
    loyalty_points?: number;
    preferences?: Record<string, unknown>;
    total_spent?: number;
    order_count?: number;
    avg_rating?: number;
    last_order_at?: string;
    birthday?: string;
    created_at?: string;
    updated_at?: string;
}

export interface CustomerCreateInput {
    full_name: string;
    phone?: string;
    email?: string;
    address?: string;
    source?: string;
    notes?: string;
    customer_type?: string;
    preferences?: Record<string, unknown>;
}

export interface CustomerUpdateInput extends CustomerCreateInput { }

export interface CrmStats {
    total_customers: number;
    vip_customers: number;
    loyal_customers: number;
    new_this_month: number;
    churn_risk: number;
}

export interface Interaction {
    id: string;
    tenant_id?: string;
    customer_id: string;
    type: string;
    content?: string;
    sentiment?: string;
    created_at: string;
}

export interface LiveStats {
    total_orders: number;
    total_spent: number;
    last_order_at?: string;
    total_quotes: number;
    rejected_quotes: number;
}

export interface LoyaltySummary {
    customer_id: string;
    points: number;
    tier: {
        name: string;
        color: string;
        icon: string;
        discount_percent: number;
        benefits: string[];
    };
    next_tier: {
        name: string;
        min_points: number;
        points_needed: number;
    } | null;
}

export interface RetentionStats {
    churn_risk_count: number;
    lost_count: number;
    total_at_risk: number;
}

// ========== HOOKS ==========

export function useCustomers(search?: string, customerType?: string) {
    return useQuery({
        queryKey: ['customers', search, customerType],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (customerType) params.append('customer_type', customerType);
            const queryStr = params.toString();
            const data = await api.get<CustomerData[]>(`/crm/customers${queryStr ? `?${queryStr}` : ''}`);
            return data;
        },
    });
}

export function useCrmStats() {
    return useQuery({
        queryKey: ['crm-stats'],
        queryFn: () => api.get<CrmStats>('/crm/stats'),
    });
}

export function useCustomerDetail(id: string | null) {
    return useQuery({
        queryKey: ['customer', id],
        queryFn: () => api.get<CustomerData>(`/crm/customers/${id}`),
        enabled: !!id,
    });
}

export function useCustomerLiveStats(id: string | null) {
    return useQuery({
        queryKey: ['customer-live-stats', id],
        queryFn: () => api.get<LiveStats>(`/crm/customers/${id}/live-stats`),
        enabled: !!id,
    });
}

export function useCustomerInteractions(id: string | null) {
    return useQuery({
        queryKey: ['customer-interactions', id],
        queryFn: () => api.get<Interaction[]>(`/crm/customers/${id}/interactions`),
        enabled: !!id,
    });
}

export function useLoyaltySummary(id: string | null) {
    return useQuery({
        queryKey: ['customer-loyalty', id],
        queryFn: () => api.get<LoyaltySummary>(`/api/v1/customers/${id}/loyalty`),
        enabled: !!id,
    });
}

export function useRetentionStats() {
    return useQuery({
        queryKey: ['retention-stats'],
        queryFn: () => api.get<RetentionStats>('/crm/marketing/retention-stats'),
    });
}

export function useCreateCustomer() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: CustomerCreateInput) => api.post<CustomerData>('/crm/customers', data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['customers'] });
            qc.invalidateQueries({ queryKey: ['crm-stats'] });
            toast.success('Đã thêm khách hàng mới');
        },
        onError: (err: Error) => toast.error(err.message || 'Lỗi khi thêm khách hàng'),
    });
}

export function useUpdateCustomer() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: CustomerUpdateInput }) =>
            api.put<CustomerData>(`/crm/customers/${id}`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['customers'] });
            qc.invalidateQueries({ queryKey: ['crm-stats'] });
            toast.success('Đã cập nhật khách hàng');
        },
        onError: (err: Error) => toast.error(err.message || 'Lỗi khi cập nhật'),
    });
}

export function useDeleteCustomer() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/crm/customers/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['customers'] });
            qc.invalidateQueries({ queryKey: ['crm-stats'] });
            toast.success('Đã xóa khách hàng');
        },
        onError: (err: Error) => toast.error(err.message || 'Lỗi khi xóa'),
    });
}

export function useCreateInteraction(customerId: string | null) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { type: string; content?: string; sentiment?: string }) =>
            api.post<Interaction>(`/crm/customers/${customerId}/interactions`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['customer-interactions', customerId] });
            toast.success('Đã thêm ghi chú');
        },
        onError: (err: Error) => toast.error(err.message || 'Lỗi'),
    });
}

export function useSendCampaign() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { customer_ids: string[]; template_id: string; channel: string }) =>
            api.post('/crm/marketing/campaigns/send', data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['customer-interactions'] });
            toast.success('Đã gửi chiến dịch');
        },
        onError: (err: Error) => toast.error(err.message || 'Lỗi gửi chiến dịch'),
    });
}

// ========== NEW: Birthday & Growth Hooks ==========

export interface BirthdayAlert {
    id: string;
    full_name: string;
    phone?: string;
    birthday: string;
    days_until: number;
    customer_type?: string;
}

export interface GrowthStat {
    month: string;
    count: number;
}

export function useUpcomingBirthdays(days: number = 30) {
    return useQuery({
        queryKey: ['upcoming-birthdays', days],
        queryFn: () => api.get<BirthdayAlert[]>(`/crm/upcoming-birthdays?days=${days}`),
    });
}

export function useCustomerGrowth(months: number = 6) {
    return useQuery({
        queryKey: ['customer-growth', months],
        queryFn: () => api.get<GrowthStat[]>(`/crm/growth-stats?months=${months}`),
    });
}

