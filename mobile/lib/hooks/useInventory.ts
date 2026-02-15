// Inventory hook — search items, view stock, create transactions
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

// Types
export interface InventoryItem {
    id: string;
    name: string;
    sku?: string;
    category?: string;
    uom: string;
    current_stock: number;
    min_stock: number;
    max_stock?: number;
    unit_cost?: number;
    is_active: boolean;
}

export interface InventoryStats {
    total_items: number;
    low_stock_count: number;
    out_of_stock_count: number;
    total_value: number;
    categories: number;
}

export interface CreateTransactionPayload {
    item_id: string;
    warehouse_id?: string;
    type: 'IMPORT' | 'EXPORT';
    quantity: number;
    unit_cost?: number;
    reference?: string;
    notes?: string;
}

// Hooks
export function useInventoryItems(search?: string) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('limit', '100');

    return useQuery<InventoryItem[]>({
        queryKey: ['inventory-items', search],
        queryFn: async () => {
            const res = await api.get(`/inventory/items?${params.toString()}`);
            // Backend returns { items: [...], total }
            return Array.isArray(res) ? res : (res.items ?? []);
        },
    });
}

export function useInventoryStats() {
    return useQuery<InventoryStats>({
        queryKey: ['inventory-stats'],
        queryFn: async () => {
            const res = await api.get('/inventory/stats');
            // Map backend field names to frontend types
            return {
                total_items: res.total_sku ?? 0,
                low_stock_count: res.warning_items ?? 0,
                out_of_stock_count: res.out_of_stock ?? 0,
                total_value: res.total_value ?? 0,
                categories: res.categories ?? 0,
            };
        },
    });
}

export function useCreateInventoryTransaction() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateTransactionPayload) =>
            api.post('/inventory/transactions', data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['inventory-items'] });
            qc.invalidateQueries({ queryKey: ['inventory-stats'] });
        },
    });
}
