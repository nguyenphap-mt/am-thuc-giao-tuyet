// Finance hooks — dashboard stats, transactions, quick expense
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

// Types
export interface FinanceDashboard {
    total_revenue: number;
    total_expenses: number;
    net_profit: number;
    total_receivables: number;
    overdue_receivables: number;
    recent_transactions: FinanceTransaction[];
}

export interface FinanceTransaction {
    id: string;
    type: string; // RECEIPT | PAYMENT
    amount: number;
    description: string;
    category?: string;
    reference_code?: string;
    created_at: string;
}

export interface MonthlyStats {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
}

export interface CreateExpensePayload {
    type: 'PAYMENT';
    amount: number;
    description: string;
    category?: string;
    reference_code?: string;
}

// Hooks
export function useFinanceDashboard() {
    return useQuery<FinanceDashboard>({
        queryKey: ['finance-dashboard'],
        queryFn: () => api.get('/finance/dashboard'),
        staleTime: 60_000,
    });
}

export function useRecentTransactions(type?: string) {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    params.set('limit', '20');

    return useQuery<FinanceTransaction[]>({
        queryKey: ['finance-transactions', type],
        queryFn: () => api.get(`/finance/transactions?${params.toString()}`),
    });
}

export function useMonthlyStats() {
    return useQuery<MonthlyStats[]>({
        queryKey: ['finance-monthly'],
        queryFn: () => api.get('/finance/monthly-stats'),
    });
}

export function useCreateExpense() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateExpensePayload) =>
            api.post('/finance/transactions', data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['finance-transactions'] });
            qc.invalidateQueries({ queryKey: ['finance-dashboard'] });
        },
    });
}
