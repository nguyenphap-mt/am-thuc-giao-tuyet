'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// ========== TYPES ==========

export interface InventoryItemData {
    id: string;
    tenant_id?: string;
    sku: string;
    name: string;
    category?: string;
    uom: string;
    min_stock: number;
    cost_price: number;
    latest_purchase_price: number;
    notes?: string;
    is_active: boolean;
    current_stock: number;
    created_at?: string;
    updated_at?: string;
}

export interface InventoryTransactionData {
    id: string;
    tenant_id?: string;
    item_id: string;
    item_name?: string;
    warehouse_id: string;
    transaction_type: 'IMPORT' | 'EXPORT' | 'ADJUST';
    quantity: number;
    unit_price?: number;
    reference_doc?: string;
    notes?: string;
    is_reversed: boolean;
    reversed_by_txn_id?: string;
    reverses_txn_id?: string;
    lot_id?: string;
    created_at: string;
}

export interface InventoryLotData {
    id: string;
    tenant_id?: string;
    item_id: string;
    item_name?: string;
    warehouse_id: string;
    lot_number: string;
    batch_code?: string;
    manufacture_date?: string;
    expiry_date?: string;
    initial_quantity: number;
    remaining_quantity: number;
    unit_cost: number;
    received_date: string;
    status: string;
    reference_doc?: string;
    notes?: string;
    created_at: string;
}

export interface InventoryStats {
    total_sku: number;
    warning_items: number;
    out_of_stock: number;
    total_value: number;
}

export interface LowStockItem {
    item_id: string;
    sku: string;
    name: string;
    category: string | null;
    current_stock: number;
    min_stock: number;
    shortfall: number;
    uom: string;
    status: 'CRITICAL' | 'WARNING' | 'LOW';
    last_purchase_price: number | null;
    suggested_order_qty: number;
}

export interface LowStockResponse {
    checked_at: string;
    total_items_checked: number;
    critical_count: number;
    warning_count: number;
    low_count: number;
    items: LowStockItem[];
}

export interface ExpiringLot {
    lot_id: string;
    lot_number: string;
    item_id: string;
    item_name: string;
    item_sku: string;
    remaining_quantity: number;
    expiry_date: string | null;
    days_until_expiry: number | null;
    status: 'CRITICAL' | 'WARNING';
}

export interface ExpiringLotsResponse {
    threshold_days: number;
    total_expiring: number;
    critical_count: number;
    lots: ExpiringLot[];
}

export interface AutoReorderResult {
    success: boolean;
    pr_id: string | null;
    pr_code: string | null;
    items_count: number;
    total_amount: number;
    message: string;
}

export interface AlertsSummary {
    checked_at: string;
    low_stock: {
        critical: number;
        warning: number;
        low: number;
        total: number;
    };
    expiring: {
        critical: number;
        total: number;
    };
    requires_attention: boolean;
}

// ========== EXPORT WITH LOTS ==========

export interface LotAllocation {
    lot_id: string;
    quantity: number;
}

export interface ExportWithLotsRequest {
    item_id: string;
    warehouse_id: string;
    quantity: number;
    reason?: string;
    notes?: string;
    lot_allocations?: LotAllocation[];
}

export interface ExportWithLotsResponse {
    success: boolean;
    transaction_id: string;
    item_name: string;
    quantity_exported: number;
    reason: string;
    method: 'FIFO' | 'MANUAL';
    lots: Array<{
        lot_id: string;
        lot_number: string;
        quantity_deducted?: number;
        remaining: number;
        status?: string;
    }>;
    message: string;
}

// ========== STATS ==========

export function useInventoryStats() {
    return useQuery({
        queryKey: ['inventory-stats'],
        queryFn: () => api.get<InventoryStats>('/inventory/stats'),
    });
}

// ========== ITEMS ==========

export interface PaginatedItems {
    items: InventoryItemData[];
    total: number;
}

export function useInventoryItems(search?: string, category?: string, limit?: number, offset: number = 0) {
    return useQuery({
        queryKey: ['inventory-items', search, category, limit, offset],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (category) params.append('category', category);
            if (limit !== undefined) params.append('limit', String(limit));
            if (offset > 0) params.append('offset', String(offset));
            const queryStr = params.toString();
            return api.get<PaginatedItems>(`/inventory/items${queryStr ? `?${queryStr}` : ''}`);
        },
    });
}

export function useItemTransactions(itemId?: string) {
    return useQuery({
        queryKey: ['inventory-item-transactions', itemId],
        queryFn: async () => {
            const res = await api.get<{ transactions: InventoryTransactionData[], total: number }>(`/inventory/transactions?item_id=${itemId}&limit=10`);
            return res.transactions;
        },
        enabled: !!itemId,
    });
}

export function useCreateItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            sku: string;
            name: string;
            category?: string;
            uom: string;
            min_stock?: number;
            cost_price?: number;
            notes?: string;
        }) => api.post<InventoryItemData>('/inventory/items', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
            toast.success('Thêm sản phẩm thành công');
        },
        onError: () => toast.error('Không thể thêm sản phẩm'),
    });
}

export function useUpdateItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: {
            id: string;
            sku: string;
            name: string;
            category?: string;
            uom: string;
            min_stock?: number;
            cost_price?: number;
            notes?: string;
        }) => api.put<InventoryItemData>(`/inventory/items/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
            toast.success('Cập nhật sản phẩm thành công');
        },
        onError: () => toast.error('Không thể cập nhật sản phẩm'),
    });
}

export function useDeleteItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/inventory/items/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
            toast.success('Xóa sản phẩm thành công');
        },
        onError: () => toast.error('Không thể xóa sản phẩm'),
    });
}

// ========== TRANSACTIONS ==========

export function useInventoryTransactions(itemId?: string, limit: number = 50, offset: number = 0) {
    return useQuery({
        queryKey: ['inventory-transactions', itemId, limit, offset],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (itemId) params.append('item_id', itemId);
            params.append('limit', String(limit));
            params.append('offset', String(offset));
            const res = await api.get<{ transactions: InventoryTransactionData[], total: number }>(`/inventory/transactions?${params.toString()}`);
            return res;
        },
    });
}

export function useCreateTransaction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            item_id: string;
            warehouse_id: string;
            transaction_type: 'IMPORT' | 'EXPORT';
            quantity: number;
            unit_price?: number;
            reference_doc?: string;
            notes?: string;
        }) => api.post<InventoryTransactionData>('/inventory/transactions', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-item-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-expiring-lots'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-alerts-summary'] });
            toast.success('Giao dịch kho thành công');
        },
        onError: () => toast.error('Không thể tạo giao dịch kho'),
    });
}

export function useReverseTransaction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, reason }: { id: string; reason?: string }) => {
            const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
            return api.post<InventoryTransactionData>(`/inventory/transactions/${id}/reverse${params}`, {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-item-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-expiring-lots'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-alerts-summary'] });
            toast.success('Đảo giao dịch thành công');
        },
        onError: () => toast.error('Không thể đảo giao dịch'),
    });
}

// ========== LOTS ==========

export function useInventoryLots(itemId?: string, status: string = 'ACTIVE') {
    return useQuery({
        queryKey: ['inventory-lots', itemId, status],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (itemId) params.append('item_id', itemId);
            params.append('status', status);
            return api.get<InventoryLotData[]>(`/inventory/lots?${params.toString()}`);
        },
    });
}

export function useExpiringLots(days: number = 30) {
    return useQuery({
        queryKey: ['inventory-expiring-lots', days],
        queryFn: () => api.get<ExpiringLotsResponse>(`/inventory/lots-expiring?days=${days}`),
    });
}

export interface FifoAllocation {
    lot_id: string;
    lot_number: string;
    quantity: number;
    quantity_to_use: number;
    available: number;
    unit_cost: number;
}

export interface FifoLotsResponse {
    item_id: string;
    total_available: number;
    lot_count: number;
    lots: {
        lot_id: string;
        lot_number: string;
        remaining_quantity: number;
        expiry_date: string | null;
        unit_cost: number;
        received_date: string;
    }[];
    allocation?: {
        quantity_needed: number;
        quantity_fulfilled: number;
        shortfall: number;
        lots_to_use: FifoAllocation[];
    };
}

export function useFifoLots(itemId?: string, quantityNeeded?: number) {
    return useQuery({
        queryKey: ['inventory-fifo-lots', itemId, quantityNeeded],
        queryFn: () => {
            const params = quantityNeeded ? `?quantity_needed=${quantityNeeded}` : '';
            return api.get<FifoLotsResponse>(`/inventory/items/${itemId}/lots/fifo${params}`);
        },
        enabled: !!itemId,
    });
}

export function useCreateLot() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            item_id: string;
            warehouse_id: string;
            lot_number: string;
            batch_code?: string;
            manufacture_date?: string;
            expiry_date?: string;
            initial_quantity: number;
            unit_cost?: number;
            reference_doc?: string;
            notes?: string;
        }) => api.post<InventoryLotData>('/inventory/lots', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-lots'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-fifo-lots'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-expiring-lots'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
            toast.success('Tạo Lot thành công');
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.detail || 'Không thể tạo Lot';
            toast.error(msg);
        },
    });
}

// ========== LOW STOCK & ALERTS ==========

export function useLowStockAlerts() {
    return useQuery({
        queryKey: ['inventory-low-stock'],
        queryFn: () => api.get<LowStockResponse>('/inventory/low-stock'),
    });
}

export function useAutoReorder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data?: { item_ids?: string[]; multiplier?: number }) =>
            api.post<AutoReorderResult>('/inventory/low-stock/auto-reorder', data || {}),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
        },
    });
}

export function useInventoryAlertsSummary() {
    return useQuery({
        queryKey: ['inventory-alerts-summary'],
        queryFn: () => api.get<AlertsSummary>('/inventory/alerts/summary'),
    });
}

// ========== WAREHOUSES ==========

export function useDefaultWarehouse() {
    return useQuery({
        queryKey: ['inventory-default-warehouse'],
        queryFn: () => api.get<{ id: string; name: string; location: string }>('/inventory/warehouses/default'),
    });
}

// ========== EXPORT WITH LOTS ==========

export function useExportWithLots() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: ExportWithLotsRequest) =>
            api.post<ExportWithLotsResponse>('/inventory/export-with-lots', data),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-item-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-lots'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-fifo-lots'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-expiring-lots'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-alerts-summary'] });
            toast.success(result.message || 'Xuất kho thành công');
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.detail || 'Không thể xuất kho';
            toast.error(msg);
        },
    });
}
