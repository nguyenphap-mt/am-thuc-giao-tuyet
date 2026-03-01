// Hook for pending actions count — used by Quick Actions card
import { useQuery } from '@tanstack/react-query';
import api from '../api';

interface PendingCounts {
    quotes_pending: number;
    orders_pending: number;
    purchase_pending: number;
    leave_pending: number;
}

export function usePendingActions() {
    return useQuery<PendingCounts>({
        queryKey: ['pending-actions'],
        queryFn: async () => {
            // Aggregate from multiple endpoints in parallel
            try {
                const [quotes, orders] = await Promise.allSettled([
                    api.get('/quotes?status=DRAFT'),
                    api.get('/orders?status=NEW'),
                ]);

                return {
                    quotes_pending: quotes.status === 'fulfilled' ? (quotes.value as any[])?.length || 0 : 0,
                    orders_pending: orders.status === 'fulfilled' ? (orders.value as any[])?.length || 0 : 0,
                    purchase_pending: 0,
                    leave_pending: 0,
                };
            } catch {
                return { quotes_pending: 0, orders_pending: 0, purchase_pending: 0, leave_pending: 0 };
            }
        },
        refetchInterval: 60000, // Refresh every minute
    });
}
