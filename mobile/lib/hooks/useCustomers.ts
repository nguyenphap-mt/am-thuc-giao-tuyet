// Customer hook — for CRM customer search
import { useQuery } from '@tanstack/react-query';
import api from '../api';

export interface Customer {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
}

export function useCustomerSearch(search: string) {
    return useQuery<Customer[]>({
        queryKey: ['customers', search],
        queryFn: () => api.get(`/crm/customers?search=${encodeURIComponent(search)}&limit=10`),
        enabled: search.length >= 2,
    });
}
