import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { UserItem, UserStats, RoleOption } from '@/types/user';
import { toast } from 'sonner';

// --- Query Keys ---
export const userKeys = {
    all: ['users'] as const,
    lists: () => [...userKeys.all, 'list'] as const,
    list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
    stats: () => [...userKeys.all, 'stats'] as const,
    roles: () => ['roles'] as const,
    sessions: () => [...userKeys.all, 'sessions'] as const,
};

// --- Types ---
export interface UserFilters {
    search?: string;
    role?: string;
    status?: string;
}

interface CreateUserData {
    email: string;
    full_name: string;
    password: string;
    role: string;
    phone_number?: string;
}

interface UpdateUserData {
    full_name?: string;
    role?: string;
    phone_number?: string;
    is_active?: boolean;
}

// --- Queries ---

export function useUsers(filters: UserFilters = {}) {
    return useQuery({
        queryKey: userKeys.list(filters),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.search) params.set('search', filters.search);
            if (filters.role && filters.role !== 'all') params.set('role', filters.role);
            if (filters.status && filters.status !== 'all') params.set('status', filters.status);
            const queryStr = params.toString() ? `?${params.toString()}` : '';
            return api.get<UserItem[]>(`/users/${queryStr}`);
        },
    });
}

export function useUserStats() {
    return useQuery({
        queryKey: userKeys.stats(),
        queryFn: () => api.get<UserStats>('/users/stats'),
    });
}

export function useRoles() {
    return useQuery({
        queryKey: userKeys.roles(),
        queryFn: () => api.get<RoleOption[]>('/roles/'),
    });
}

export function useUserSessions() {
    return useQuery({
        queryKey: userKeys.sessions(),
        queryFn: () => api.get<any[]>('/users/me/sessions'),
    });
}

// --- Mutations ---

export function useCreateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateUserData) =>
            api.post<UserItem>('/users/', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.all });
            toast.success('Tạo người dùng thành công');
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.detail || 'Không thể tạo người dùng';
            toast.error(msg);
        },
    });
}

export function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) =>
            api.put<UserItem>(`/users/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.all });
            toast.success('Cập nhật người dùng thành công');
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.detail || 'Không thể cập nhật người dùng';
            toast.error(msg);
        },
    });
}

export function useDeleteUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) =>
            api.delete(`/users/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.all });
            toast.success('Đã xóa người dùng');
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.detail || 'Không thể xóa người dùng';
            toast.error(msg);
        },
    });
}
