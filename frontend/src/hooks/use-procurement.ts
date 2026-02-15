'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// ========== TYPES ==========
// FE-1: Canonical Supplier type from @/types (single source of truth)
export type { Supplier } from '@/types';
import type { Supplier } from '@/types';

export interface PurchaseOrderItem {
    id: string;
    purchase_order_id: string;
    item_id?: string;
    item_name: string;
    quantity: number;
    uom?: string;
    unit_price: number;
    total_price: number;
    created_at?: string;
}

export interface PurchaseOrder {
    id: string;
    tenant_id?: string;
    supplier_id?: string;
    code: string;
    total_amount: number;
    status: string;
    expected_delivery?: string;
    note?: string;
    payment_terms?: string;
    due_date?: string;
    paid_amount?: number;
    payment_date?: string;
    created_at?: string;
    updated_at?: string;
    supplier?: Supplier;
    items: PurchaseOrderItem[];
}

export interface PurchaseRequisitionLine {
    id: string;
    item_id?: string;
    item_name: string;
    item_sku?: string;
    quantity: number;
    uom?: string;
    estimated_unit_price: number;
    estimated_total: number;
    notes?: string;
}

export interface PurchaseRequisition {
    id: string;
    code: string;
    title: string;
    status: string;
    priority: string;
    total_amount: number;
    notes?: string;
    created_at?: string;
    converted_to_po_id?: string;
    lines: PurchaseRequisitionLine[];
}

export interface ProcurementStats {
    total_orders: number;
    total_amount: number;
    draft_count: number;
    sent_count: number;
    received_count: number;
    paid_count: number;
    total_paid: number;
    total_requisitions: number;
    pending_prs: number;
    approved_prs: number;
    supplier_count: number;
}

// ========== STATS ==========

export function useProcurementStats() {
    return useQuery({
        queryKey: ['procurement-stats'],
        queryFn: () => api.get<ProcurementStats>('/procurement/stats'),
    });
}

// ========== PURCHASE ORDERS ==========

export function usePurchaseOrders(status?: string) {
    return useQuery({
        queryKey: ['purchase-orders', status],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (status) params.append('status', status);
            return api.get<PurchaseOrder[]>(`/procurement/orders?${params.toString()}`);
        },
    });
}

export function usePurchaseOrder(id: string) {
    return useQuery({
        queryKey: ['purchase-order', id],
        queryFn: () => api.get<PurchaseOrder>(`/procurement/orders/${id}`),
        enabled: !!id,
    });
}

export function useCreatePO() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            supplier_id?: string;
            code?: string;
            total_amount?: number;
            status?: string;
            expected_delivery?: string;
            note?: string;
            items: Array<{
                item_id?: string;
                item_name: string;
                quantity: number;
                uom?: string;
                unit_price: number;
                total_price?: number;
            }>;
        }) => api.post<PurchaseOrder>('/procurement/orders', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            queryClient.invalidateQueries({ queryKey: ['procurement-stats'] });
            toast.success('Tạo đơn mua hàng thành công');
        },
        onError: () => toast.error('Không thể tạo đơn mua hàng'),
    });
}

export function useUpdatePOStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            api.put<PurchaseOrder>(`/procurement/orders/${id}/status?status=${status}`, {}),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            queryClient.invalidateQueries({ queryKey: ['purchase-order', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['procurement-stats'] });
            const labels: Record<string, string> = {
                'DRAFT': 'Chuyển về nháp',
                'SENT': 'Đã gửi đơn',
                'RECEIVED': 'Đã nhận hàng',
                'PAID': 'Đã thanh toán',
            };
            toast.success(labels[variables.status] || 'Cập nhật trạng thái thành công');
        },
        onError: () => toast.error('Không thể cập nhật trạng thái'),
    });
}

export function useDeletePO() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/procurement/orders/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            queryClient.invalidateQueries({ queryKey: ['procurement-stats'] });
            toast.success('Xóa đơn mua hàng thành công');
        },
        onError: () => toast.error('Không thể xóa đơn mua hàng'),
    });
}

export function useReceivePO() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: {
            id: string;
            data: {
                items: Array<{ item_id: string; quantity: number; unit_price: number }>;
                note?: string;
            }
        }) => api.post(`/procurement/orders/${id}/receive`, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            queryClient.invalidateQueries({ queryKey: ['purchase-order', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['procurement-stats'] });
            toast.success('Nhận hàng thành công — Kho đã được cập nhật');
        },
        onError: () => toast.error('Không thể nhận hàng'),
    });
}

// ========== SUPPLIERS ==========

export function useSuppliers() {
    return useQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
            // BUGFIX: BUG-20260209-001
            // Root Cause: Backend GET /suppliers returns paginated object {items, total, skip, limit}
            // but frontend expected a plain Supplier[]. The object is truthy so || [] fallback
            // doesn't trigger, causing .filter() to fail on the object.
            // Solution: Extract .items array from paginated response.
            const res = await api.get<{ items: Supplier[]; total: number }>('/procurement/suppliers');
            return (res as any)?.items ?? res ?? [];
        },
    });
}

export function useCreateSupplier() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<Supplier>) =>
            api.post<Supplier>('/procurement/suppliers', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-stats'] });
            queryClient.invalidateQueries({ queryKey: ['procurement-stats'] });
            toast.success('Thêm nhà cung cấp thành công');
        },
        onError: () => toast.error('Không thể thêm nhà cung cấp'),
    });
}

export function useUpdateSupplier() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: { id: string } & Partial<Supplier>) =>
            api.put<Supplier>(`/procurement/suppliers/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-stats'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-detail'] });
            toast.success('Cập nhật nhà cung cấp thành công');
        },
        onError: () => toast.error('Không thể cập nhật nhà cung cấp'),
    });
}

export function useDeleteSupplier() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/procurement/suppliers/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['procurement-stats'] });
            toast.success('Xóa nhà cung cấp thành công');
        },
        onError: () => toast.error('Không thể xóa nhà cung cấp'),
    });
}

// ========== PURCHASE REQUISITIONS ==========

export function usePurchaseRequisitions(status?: string) {
    return useQuery({
        queryKey: ['purchase-requisitions', status],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (status) params.append('status', status);
            return api.get<PurchaseRequisition[]>(`/procurement/requisitions?${params.toString()}`);
        },
    });
}

export function useCreatePR() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            title: string;
            priority?: string;
            notes?: string;
            lines: Array<{
                item_id?: string;
                item_name: string;
                item_sku?: string;
                quantity: number;
                uom?: string;
                estimated_unit_price: number;
                notes?: string;
            }>;
        }) => api.post<PurchaseRequisition>('/procurement/requisitions', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
            queryClient.invalidateQueries({ queryKey: ['procurement-stats'] });
            toast.success('Tạo yêu cầu mua hàng thành công');
        },
        onError: () => toast.error('Không thể tạo yêu cầu mua hàng'),
    });
}

// FE-5: Update existing Purchase Requisition
export function useUpdatePR() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: {
            id: string;
            title?: string;
            priority?: string;
            notes?: string;
            lines?: Array<{
                item_id?: string;
                item_name: string;
                item_sku?: string;
                quantity: number;
                uom?: string;
                estimated_unit_price: number;
                notes?: string;
            }>;
        }) => api.put<PurchaseRequisition>(`/procurement/requisitions/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
            queryClient.invalidateQueries({ queryKey: ['procurement-stats'] });
            toast.success('Cập nhật yêu cầu mua hàng thành công');
        },
        onError: () => toast.error('Không thể cập nhật yêu cầu mua hàng'),
    });
}

export function useApprovePR() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.put(`/procurement/requisitions/${id}/approve`, {}),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
            queryClient.invalidateQueries({ queryKey: ['procurement-stats'] });
            toast.success('Duyệt yêu cầu mua hàng thành công');
        },
        onError: () => toast.error('Không thể duyệt yêu cầu'),
    });
}

export function useRejectPR() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.put(`/procurement/requisitions/${id}/reject`, {}),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
            queryClient.invalidateQueries({ queryKey: ['procurement-stats'] });
            toast.success('Từ chối yêu cầu mua hàng');
        },
        onError: () => toast.error('Không thể từ chối yêu cầu'),
    });
}

export function useConvertPRtoPO() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, supplier_id }: { id: string; supplier_id?: string }) => {
            const params = supplier_id ? `?supplier_id=${supplier_id}` : '';
            return api.post<PurchaseOrder>(`/procurement/requisitions/${id}/convert-to-po${params}`, {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            queryClient.invalidateQueries({ queryKey: ['procurement-stats'] });
            toast.success('Chuyển đổi thành đơn mua hàng thành công');
        },
        onError: () => toast.error('Không thể chuyển đổi yêu cầu'),
    });
}

export function useDeletePR() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/procurement/requisitions/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
            queryClient.invalidateQueries({ queryKey: ['procurement-stats'] });
            toast.success('Xóa yêu cầu mua hàng thành công');
        },
        onError: () => toast.error('Không thể xóa yêu cầu'),
    });
}
