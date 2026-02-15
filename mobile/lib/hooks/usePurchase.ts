// Purchase Requisition hook — CRUD via existing procurement APIs
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

// Types
export interface PRLine {
    id?: string;
    item_id?: string | null;
    item_name: string;
    item_sku?: string | null;
    quantity: number;
    uom?: string | null;
    estimated_unit_price: number;
    estimated_total?: number;
    notes?: string | null;
}

export interface PurchaseRequisition {
    id: string;
    code: string;
    title: string;
    status: string; // PENDING | APPROVED | REJECTED | CONVERTED
    priority: string; // LOW | NORMAL | HIGH | URGENT
    total_amount: number;
    notes?: string | null;
    created_at?: string | null;
    lines: PRLine[];
}

export interface PRCreatePayload {
    title: string;
    priority: string;
    notes?: string;
    lines: {
        item_name: string;
        quantity: number;
        uom?: string;
        estimated_unit_price: number;
    }[];
}

export interface ProcurementStats {
    total_orders: number;
    total_amount: number;
    total_requisitions: number;
    pending_prs: number;
    approved_prs: number;
    supplier_count: number;
}

// Hooks
export function usePRList(status?: string) {
    const endpoint = status
        ? `/procurement/requisitions?status=${status}`
        : '/procurement/requisitions';

    return useQuery<PurchaseRequisition[]>({
        queryKey: ['purchase-requisitions', status],
        queryFn: () => api.get(endpoint),
    });
}

export function useProcurementStats() {
    return useQuery<ProcurementStats>({
        queryKey: ['procurement-stats'],
        queryFn: () => api.get('/procurement/stats'),
    });
}

export function useCreatePR() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: PRCreatePayload) =>
            api.post('/procurement/requisitions', data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['purchase-requisitions'] });
            qc.invalidateQueries({ queryKey: ['procurement-stats'] });
        },
    });
}

export function useApprovePR() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            api.put(`/procurement/requisitions/${id}/approve`, {}),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['purchase-requisitions'] });
            qc.invalidateQueries({ queryKey: ['procurement-stats'] });
        },
    });
}

export function useRejectPR() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            api.put(`/procurement/requisitions/${id}/reject`, {}),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['purchase-requisitions'] });
            qc.invalidateQueries({ queryKey: ['procurement-stats'] });
        },
    });
}

export function useDeletePR() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            api.delete(`/procurement/requisitions/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['purchase-requisitions'] });
            qc.invalidateQueries({ queryKey: ['procurement-stats'] });
        },
    });
}
