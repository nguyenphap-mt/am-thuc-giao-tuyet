// Menu Management hooks — CRUD operations for menu items & categories
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

export interface MenuItem {
    id: string;
    name: string;
    description?: string;
    category_id?: string;
    category_name?: string;
    uom?: string;
    cost_price?: number;
    selling_price?: number;
    is_active?: boolean;
    sort_order?: number;
    image_url?: string;
    created_at?: string;
    updated_at?: string;
}

export interface MenuCategory {
    id: string;
    name: string;
    code?: string;
    description?: string;
    item_type?: string;
    sort_order?: number;
}

export interface MenuStats {
    total_items: number;
    active_items: number;
    inactive_items: number;
    total_categories: number;
    avg_food_cost_pct?: number;
}

// --- Queries ---

export function useMenuItems(search?: string, categoryId?: string) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryId) params.set('category_id', categoryId);

    return useQuery<MenuItem[]>({
        queryKey: ['menu-items', search, categoryId],
        queryFn: () => api.get(`/menu/items?${params.toString()}`),
    });
}

export function useMenuItemDetail(id: string | undefined) {
    return useQuery<MenuItem>({
        queryKey: ['menu-item', id],
        queryFn: () => api.get(`/menu/items/${id}`),
        enabled: !!id,
    });
}

export function useMenuCategories() {
    return useQuery<MenuCategory[]>({
        queryKey: ['menu-categories'],
        queryFn: () => api.get('/menu/categories'),
    });
}

export function useMenuStats() {
    return useQuery<MenuStats>({
        queryKey: ['menu-stats'],
        queryFn: () => api.get('/menu/stats'),
    });
}

// --- Mutations ---

export function useCreateMenuItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            name: string;
            category_id?: string;
            description?: string;
            uom?: string;
            cost_price?: number;
            selling_price?: number;
        }) => api.post('/menu/items', data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['menu-items'] });
            qc.invalidateQueries({ queryKey: ['menu-stats'] });
        },
    });
}

export function useUpdateMenuItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: {
            id: string;
            name: string;
            category_id?: string;
            description?: string;
            uom?: string;
            cost_price?: number;
            selling_price?: number;
        }) => api.put(`/menu/items/${id}`, data),
        onSuccess: (_data, variables) => {
            qc.invalidateQueries({ queryKey: ['menu-items'] });
            qc.invalidateQueries({ queryKey: ['menu-item', variables.id] });
            qc.invalidateQueries({ queryKey: ['menu-stats'] });
        },
    });
}

export function useDeleteMenuItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/menu/items/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['menu-items'] });
            qc.invalidateQueries({ queryKey: ['menu-stats'] });
        },
    });
}

export function useToggleMenuItemActive() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.put(`/menu/items/${id}/toggle-active`, {}),
        onSuccess: (_data, id) => {
            qc.invalidateQueries({ queryKey: ['menu-items'] });
            qc.invalidateQueries({ queryKey: ['menu-item', id] });
            qc.invalidateQueries({ queryKey: ['menu-stats'] });
        },
    });
}
