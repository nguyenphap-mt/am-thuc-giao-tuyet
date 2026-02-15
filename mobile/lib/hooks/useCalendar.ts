// Calendar hooks — events by month
import { useQuery } from '@tanstack/react-query';
import api from '../api';

// Types
export interface CalendarEvent {
    id: string;
    title: string;
    date: string; // ISO date
    start_time?: string;
    end_time?: string;
    type?: string;
    status?: string;
    customer_name?: string;
    location?: string;
    order_id?: string;
}

// Hooks
export function useCalendarEvents(month?: string, year?: string) {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    if (year) params.set('year', year);

    return useQuery<CalendarEvent[]>({
        queryKey: ['calendar-events', month, year],
        queryFn: () => api.get(`/calendar/events?${params.toString()}`),
    });
}
