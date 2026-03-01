// Expense hooks — active orders for linking, create order expense, create general expense
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

// Types
export interface ActiveOrder {
    id: string;
    code: string;
    customer_name: string;
    event_date: string | null;
    event_location: string | null;
}

export interface OrderExpenseCreate {
    category: 'NGUYENLIEU' | 'NHANCONG' | 'THUEMUON' | 'VANHANH' | 'KHAC';
    amount: number;
    description?: string;
}

export interface OrderExpenseResponse {
    id: string;
    order_id: string;
    category: string;
    amount: number;
    description?: string;
    created_at: string;
}

export const EXPENSE_CATEGORIES = [
    { code: 'NGUYENLIEU' as const, label: 'Nguyên liệu', icon: 'restaurant' as const },
    { code: 'NHANCONG' as const, label: 'Nhân công', icon: 'engineering' as const },
    { code: 'THUEMUON' as const, label: 'Thuê mướn', icon: 'chair' as const },
    { code: 'VANHANH' as const, label: 'Vận hành', icon: 'local-shipping' as const },
    { code: 'KHAC' as const, label: 'Khác', icon: 'inventory-2' as const },
] as const;

// Payment types
export interface OrderPaymentCreate {
    amount: number;
    payment_method: 'CASH' | 'TRANSFER' | 'EWALLET';
    reference_no?: string;
    note?: string;
}

export const PAYMENT_METHODS = [
    { code: 'CASH' as const, label: 'Tiền mặt', icon: 'payments' as const },
    { code: 'TRANSFER' as const, label: 'Chuyển khoản', icon: 'account-balance' as const },
    { code: 'EWALLET' as const, label: 'Ví điện tử', icon: 'phone-android' as const },
] as const;

// ============ HOOKS ============

// Get today's active orders for expense linking
export function useMyActiveOrders() {
    return useQuery<ActiveOrder[]>({
        queryKey: ['my-active-orders'],
        queryFn: () => api.get('/orders/my-active'),
        staleTime: 5 * 60_000, // 5 min cache
    });
}

// Create expense linked to an order
export function useCreateOrderExpense() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ orderId, data }: { orderId: string; data: OrderExpenseCreate }) =>
            api.post(`/orders/${orderId}/expenses`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['finance-dashboard'] });
            qc.invalidateQueries({ queryKey: ['finance-transactions'] });
            qc.invalidateQueries({ queryKey: ['my-active-orders'] });
        },
    });
}

// Create general expense (not linked to order)
export function useCreateGeneralExpense() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { type: 'PAYMENT'; amount: number; description: string; category?: string }) =>
            api.post('/finance/transactions', data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['finance-dashboard'] });
            qc.invalidateQueries({ queryKey: ['finance-transactions'] });
        },
    });
}

// Record payment for an order
export function useCreateOrderPayment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ orderId, data }: { orderId: string; data: OrderPaymentCreate }) =>
            api.post(`/orders/${orderId}/payments`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['finance-dashboard'] });
            qc.invalidateQueries({ queryKey: ['orders'] });
        },
    });
}
