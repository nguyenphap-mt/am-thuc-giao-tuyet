'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Types
export interface MenuItem {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
    category_id?: string;
    category_name?: string;
    uom: string;
    cost_price: number;
    selling_price: number;
    is_active: boolean;
    sort_order: number;
}

export interface Category {
    id: string;
    name: string;
    code?: string;
    description?: string;
    item_type?: string;  // FOOD | SERVICE
    sort_order: number;
}

export interface MenuStats {
    total_items: number;
    active_items: number;
    inactive_items: number;
    total_categories: number;
    total_set_menus: number;
    avg_food_cost_pct: number | null;
}

export interface SetMenuItem {
    id: string;
    menu_item_id: string;
    menu_item_name?: string;
    quantity: number;
    notes?: string;
}

export interface SetMenu {
    id: string;
    name: string;
    code?: string;
    description?: string;
    image_url?: string;
    selling_price: number;
    is_active: boolean;
    items: SetMenuItem[];
    created_at?: string;
    updated_at?: string;
}

export interface SmartMatchResult {
    input_text: string;
    match_type: 'exact' | 'unaccent' | 'fuzzy' | 'none';
    matches: Array<{
        id: string;
        name: string;
        score: number;
        price: number;
    }>;
}

export interface RecipeIngredient {
    id: string;
    ingredient_id: string;
    ingredient_name: string;
    quantity_per_unit: number;
    uom: string;
    notes?: string;
}

export interface RecipeData {
    menu_item_id: string;
    menu_item_name: string;
    ingredient_count: number;
    ingredients: RecipeIngredient[];
}

// Parse price strings to numbers (API returns Decimal as string)
function parseItem(item: MenuItem): MenuItem {
    return {
        ...item,
        cost_price: typeof item.cost_price === 'string' ? parseFloat(item.cost_price) : (item.cost_price || 0),
        selling_price: typeof item.selling_price === 'string' ? parseFloat(item.selling_price) : (item.selling_price || 0),
    };
}

// ========== MENU ITEMS ==========

export function useMenuItems(search?: string, categoryId?: string, itemType?: string) {
    return useQuery<MenuItem[]>({
        queryKey: ['menu-items', search, categoryId, itemType],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (categoryId) params.append('category_id', categoryId);
            if (itemType) params.append('item_type', itemType);
            params.append('active_only', 'false');
            params.append('limit', '500');
            const items = await api.get<MenuItem[]>(`/menu/items?${params.toString()}`);
            return items.map(parseItem);
        },
        staleTime: 30 * 1000,
    });
}

export function useCreateMenuItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<MenuItem>) => api.post<MenuItem>('/menu/items', data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['menu-items'] }); qc.invalidateQueries({ queryKey: ['menu-stats'] }); },
    });
}

export function useUpdateMenuItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: Partial<MenuItem> & { id: string }) => api.put<MenuItem>(`/menu/items/${id}`, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['menu-items'] }); qc.invalidateQueries({ queryKey: ['menu-stats'] }); },
    });
}

export function useDeleteMenuItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/menu/items/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['menu-items'] }); qc.invalidateQueries({ queryKey: ['menu-stats'] }); },
    });
}

export function useToggleMenuItemActive() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.put<{ id: string; is_active: boolean }>(`/menu/items/${id}/toggle-active`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['menu-items'] }); qc.invalidateQueries({ queryKey: ['menu-stats'] }); },
    });
}

export function useBulkMenuAction() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { ids: string[]; action: string }) => api.post('/menu/items/bulk-action', data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['menu-items'] }); qc.invalidateQueries({ queryKey: ['menu-stats'] }); },
    });
}

// ========== CATEGORIES ==========

export function useMenuCategories() {
    return useQuery<Category[]>({
        queryKey: ['menu-categories'],
        queryFn: () => api.get<Category[]>('/menu/categories'),
        staleTime: 10 * 60 * 1000,
    });
}

export function useCreateCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { name: string; code?: string; description?: string; item_type?: string }) => api.post('/menu/categories', data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['menu-categories'] }),
    });
}

export function useUpdateCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: { id: string; name?: string; code?: string; description?: string; item_type?: string }) => api.put(`/menu/categories/${id}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['menu-categories'] }),
    });
}

export function useDeleteCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/menu/categories/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['menu-categories'] }),
    });
}

// ========== STATS ==========

export function useMenuStats() {
    return useQuery<MenuStats>({
        queryKey: ['menu-stats'],
        queryFn: () => api.get<MenuStats>('/menu/stats'),
        staleTime: 30 * 1000,
    });
}

// ========== SET MENUS ==========

export function useSetMenus() {
    return useQuery<SetMenu[]>({
        queryKey: ['set-menus'],
        queryFn: () => api.get<SetMenu[]>('/menu/set-menus'),
        staleTime: 30 * 1000,
    });
}

export function useCreateSetMenu() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<SetMenu>) => api.post('/menu/set-menus', data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['set-menus'] }); qc.invalidateQueries({ queryKey: ['menu-stats'] }); },
    });
}

export function useUpdateSetMenu() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: Partial<SetMenu> & { id: string }) => api.put(`/menu/set-menus/${id}`, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['set-menus'] }); qc.invalidateQueries({ queryKey: ['menu-stats'] }); },
    });
}

export function useDeleteSetMenu() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/menu/set-menus/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['set-menus'] }); qc.invalidateQueries({ queryKey: ['menu-stats'] }); },
    });
}

// ========== RECIPES ==========

export function useItemRecipes(itemId?: string) {
    return useQuery<RecipeData>({
        queryKey: ['menu-recipes', itemId],
        queryFn: () => api.get<RecipeData>(`/menu/items/${itemId}/recipes`),
        enabled: !!itemId,
    });
}

export function useAddRecipeIngredient() {
    const qc = useQueryClient();
    return useMutation<unknown, Error, { itemId: string; ingredient_id: string; ingredient_name: string; quantity_per_unit: number; uom: string; notes?: string }>({
        mutationFn: (data) => {
            const { itemId, ...payload } = data;
            return api.post(`/menu/items/${itemId}/recipes`, payload);
        },
        onSuccess: (_: unknown, vars) => { qc.invalidateQueries({ queryKey: ['menu-recipes', vars.itemId] }); qc.invalidateQueries({ queryKey: ['menu-food-cost'] }); },
    });
}

export function useDeleteRecipeIngredient() {
    const qc = useQueryClient();
    return useMutation<unknown, Error, { itemId: string; recipeId: string }>({
        mutationFn: (data) => api.delete(`/menu/items/${data.itemId}/recipes/${data.recipeId}`),
        onSuccess: (_: unknown, vars) => { qc.invalidateQueries({ queryKey: ['menu-recipes', vars.itemId] }); qc.invalidateQueries({ queryKey: ['menu-food-cost'] }); },
    });
}

export function useUpdateRecipeIngredient() {
    const qc = useQueryClient();
    return useMutation<unknown, Error, { itemId: string; recipeId: string; ingredient_id: string; ingredient_name: string; quantity_per_unit: number; uom: string }>({
        mutationFn: (data) => {
            const { itemId, recipeId, ...payload } = data;
            return api.put(`/menu/items/${itemId}/recipes/${recipeId}`, payload);
        },
        onSuccess: (_: unknown, vars) => { qc.invalidateQueries({ queryKey: ['menu-recipes', vars.itemId] }); qc.invalidateQueries({ queryKey: ['menu-food-cost'] }); },
    });
}

export interface FoodCostData {
    menu_item_id: string;
    menu_item_name: string;
    selling_price: number;
    ingredient_count: number;
    total_food_cost: number;
    food_cost_percentage: number;
    profit_margin: number;
    ingredients: Array<{
        ingredient_id: string;
        ingredient_name: string;
        quantity: number;
        uom: string;
        unit_cost: number;
        line_cost: number;
    }>;
}

export function useFoodCost(itemId?: string) {
    return useQuery<FoodCostData>({
        queryKey: ['menu-food-cost', itemId],
        queryFn: () => api.get<FoodCostData>(`/menu/items/${itemId}/cost`),
        enabled: !!itemId,
    });
}

// ========== INVENTORY SEARCH (for Recipe Drawer) ==========

export interface InventoryItem {
    id: string;
    name: string;
    sku?: string;
    uom: string;
    cost_price: number;
    current_stock: number;
}

export function useInventorySearch(search?: string) {
    return useQuery<InventoryItem[]>({
        queryKey: ['inventory-items-search', search],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            params.append('limit', '20');
            const res = await api.get<{ items: InventoryItem[]; total: number }>(`/inventory/items?${params.toString()}`);
            return res.items;
        },
        enabled: !!search && search.length >= 1,
        staleTime: 30 * 1000,
    });
}

export function useCreateInventoryItem() {
    const qc = useQueryClient();
    return useMutation<InventoryItem, Error, { name: string; sku: string; uom: string; cost_price?: number }>({
        mutationFn: (data) => api.post<InventoryItem>('/inventory/items', data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-items-search'] }); },
    });
}

export function useSmartMatch() {
    return useMutation<SmartMatchResult[], Error, string[]>({
        mutationFn: async (items: string[]) => {
            return api.post<SmartMatchResult[]>('/menu/smart-match', { items });
        },
    });
}

// ========== ANALYTICS ==========

export interface MenuEngineeringItem {
    id: string;
    name: string;
    category_name: string;
    category_id: string | null;
    selling_price: number;
    food_cost: number;
    food_cost_pct: number;
    profit_margin: number;
    popularity_score: number;
    quadrant: 'star' | 'puzzle' | 'workhorse' | 'dog';
}

export interface MenuEngineeringData {
    items: MenuEngineeringItem[];
    avg_food_cost: number;
    avg_selling_price: number;
    quadrants: { star: number; puzzle: number; workhorse: number; dog: number };
    total_items: number;
}

export interface TopSellerItem {
    id: string;
    name: string;
    category_name: string;
    selling_price: number;
    cost_price: number;
    food_cost_pct: number;
    rank: number;
}

export interface CategoryBreakdownItem {
    category_id: string;
    category_name: string;
    item_count: number;
    avg_selling_price: number;
    avg_cost_price: number;
    avg_food_cost_pct: number;
    total_revenue_potential: number;
}

export function useMenuEngineering() {
    return useQuery<MenuEngineeringData>({
        queryKey: ['menu-engineering'],
        queryFn: async () => api.get<MenuEngineeringData>('/menu/stats/menu-engineering'),
        staleTime: 60 * 1000,
    });
}

export function useTopSellers(limit = 10) {
    return useQuery<TopSellerItem[]>({
        queryKey: ['menu-top-sellers', limit],
        queryFn: async () => api.get<TopSellerItem[]>(`/menu/stats/top-sellers?limit=${limit}`),
        staleTime: 60 * 1000,
    });
}

export function useCategoryBreakdown() {
    return useQuery<CategoryBreakdownItem[]>({
        queryKey: ['menu-category-breakdown'],
        queryFn: async () => api.get<CategoryBreakdownItem[]>('/menu/stats/category-breakdown'),
        staleTime: 60 * 1000,
    });
}

