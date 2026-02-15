'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// =============================================
// Types
// =============================================

export interface Tenant {
    id: string;
    name: string;
    slug: string | null;
    code: string | null;
    plan: string;
    status: string;
    domain: string | null;
    logo_url: string | null;
    plan_details: {
        max_users?: number;
        max_orders_per_month?: number;
        storage_mb?: number;
    };
    contact_email: string | null;
    contact_phone: string | null;
    address: string | null;
    trial_ends_at: string | null;
    suspended_at: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface TenantListResponse {
    tenants: Tenant[];
    total: number;
    page: number;
    limit: number;
}

export interface TenantStats {
    total: number;
    active: number;
    trial: number;
    suspended: number;
    plans: Record<string, number>;
}

export interface TenantUsage {
    users: {
        current: number;
        limit: number;
        percentage: number;
    };
    orders_this_month: {
        current: number;
        limit: number;
        percentage: number;
    };
    storage: {
        current: number;
        limit: number;
        percentage: number;
    };
    plan: string;
    status: string;
    modules: string[];
}

export interface TenantSetting {
    key: string;
    value: string;
    type: string;
    description: string;
}

export interface TenantFilters {
    search?: string;
    status?: string;
    plan?: string;
    page?: number;
    limit?: number;
}

export interface TenantCreateData {
    name: string;
    slug?: string;
    plan?: string;
    domain?: string;
    contact_email?: string;
    contact_phone?: string;
    address?: string;
    plan_details?: Record<string, number>;
}

export interface TenantUpdateData {
    name?: string;
    slug?: string;
    plan?: string;
    domain?: string;
    logo_url?: string;
    contact_email?: string;
    contact_phone?: string;
    address?: string;
    plan_details?: Record<string, number>;
}

// =============================================
// Query Keys
// =============================================

export const tenantKeys = {
    all: ['tenants'] as const,
    lists: () => [...tenantKeys.all, 'list'] as const,
    list: (filters: TenantFilters) => [...tenantKeys.lists(), filters] as const,
    details: () => [...tenantKeys.all, 'detail'] as const,
    detail: (id: string) => [...tenantKeys.details(), id] as const,
    stats: () => [...tenantKeys.all, 'stats'] as const,
    usage: (id: string) => [...tenantKeys.all, 'usage', id] as const,
    me: () => [...tenantKeys.all, 'me'] as const,
    meUsage: () => [...tenantKeys.all, 'me-usage'] as const,
    meSettings: () => [...tenantKeys.all, 'me-settings'] as const,
};

// =============================================
// Hooks
// =============================================

export function useTenants(filters: TenantFilters = {}) {
    return useQuery({
        queryKey: tenantKeys.list(filters),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.search) params.set('search', filters.search);
            if (filters.status) params.set('status', filters.status);
            if (filters.plan) params.set('plan', filters.plan);
            if (filters.page) params.set('page', String(filters.page));
            if (filters.limit) params.set('limit', String(filters.limit));

            const queryString = params.toString();
            const url = `/tenants${queryString ? `?${queryString}` : ''}`;
            return api.get<TenantListResponse>(url);
        },
    });
}

export function useTenantStats() {
    return useQuery({
        queryKey: tenantKeys.stats(),
        queryFn: () => api.get<TenantStats>('/tenants/stats'),
    });
}

export function useTenant(id: string) {
    return useQuery({
        queryKey: tenantKeys.detail(id),
        queryFn: () => api.get<Tenant>(`/tenants/${id}`),
        enabled: !!id,
    });
}

export function useTenantUsage(id: string) {
    return useQuery({
        queryKey: tenantKeys.usage(id),
        queryFn: () => api.get<TenantUsage>(`/tenants/${id}/usage`),
        enabled: !!id,
    });
}

export function useMyTenant() {
    return useQuery({
        queryKey: tenantKeys.me(),
        queryFn: () => api.get<Tenant>('/tenants/me'),
    });
}

export function useMyTenantUsage() {
    return useQuery({
        queryKey: tenantKeys.meUsage(),
        queryFn: () => api.get<TenantUsage>('/tenants/me/usage'),
    });
}

export function useMyTenantSettings() {
    return useQuery({
        queryKey: tenantKeys.meSettings(),
        queryFn: () => api.get<TenantSetting[]>('/tenants/me/settings'),
    });
}

export function useCreateTenant() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: TenantCreateData) => api.post<Tenant>('/tenants', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tenantKeys.all });
        },
    });
}

export function useUpdateTenant() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: TenantUpdateData }) =>
            api.put<Tenant>(`/tenants/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tenantKeys.all });
        },
    });
}

export function useUpdateTenantStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            api.patch<Tenant>(`/tenants/${id}/status`, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tenantKeys.all });
        },
    });
}

export function useDeleteTenant() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/tenants/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tenantKeys.all });
        },
    });
}

export function useUpdateMyTenant() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: TenantUpdateData) => api.put<Tenant>('/tenants/me', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tenantKeys.me() });
            queryClient.invalidateQueries({ queryKey: tenantKeys.meUsage() });
        },
    });
}

export function useUpdateMyTenantSettings() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (settings: Record<string, string>) =>
            api.put('/tenants/me/settings', { settings }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tenantKeys.meSettings() });
        },
    });
}

export function useSwitchTenant() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (tenantId: string) =>
            api.post<Tenant>(`/tenants/switch/${tenantId}`),
        onSuccess: () => {
            queryClient.invalidateQueries();
        },
    });
}

export function useUploadTenantLogo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            // Use api.post with custom headers to override Content-Type
            return api.post<{ logo_url: string; message: string }>(
                '/tenants/me/logo',
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tenantKeys.me() });
        },
    });
}

export function useDeleteTenantLogo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => api.delete('/tenants/me/logo'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tenantKeys.me() });
        },
    });
}

