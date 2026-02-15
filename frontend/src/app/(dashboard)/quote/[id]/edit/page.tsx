'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuote, useUpdateQuote } from '@/hooks/use-quotes';
import { Card, CardContent } from '@/components/ui/card';
import { QuoteWizard, useQuoteWizardState } from '../../components';

/**
 * Edit Quote Page — thin wrapper around shared QuoteWizard.
 * Before refactoring: 1,811 LOC. After: ~100 LOC.
 * Adds: data fetching, hydration, skeleton loading, and update mutation.
 */
export default function QuoteEditPage() {
    const router = useRouter();
    const params = useParams();
    const quoteId = params.id as string;

    const { data: existingQuote, isLoading: quoteLoading } = useQuote(quoteId);
    const updateMutation = useUpdateQuote();
    const state = useQuoteWizardState();
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    // Hydrate wizard state from existing quote data
    useEffect(() => {
        if (existingQuote && !isDataLoaded && state.menuItems.length > 0) {
            // Pre-populate formData
            state.setFormData({
                customer_name: existingQuote.customer_name || '',
                customer_phone: existingQuote.customer_phone || '',
                customer_email: existingQuote.customer_email || '',
                event_date: existingQuote.event_date ? existingQuote.event_date.split('T')[0] : '',
                event_time: existingQuote.event_time || (existingQuote.event_date ? existingQuote.event_date.split('T')[1]?.substring(0, 5) : '') || '',
                event_address: existingQuote.event_address || '',
                guest_count: existingQuote.guest_count?.toString() || '',
                table_count: existingQuote.table_count?.toString() || '',
                event_type: existingQuote.event_type || '',
                notes: existingQuote.notes || '',
            });

            // Pre-populate selected items
            if (existingQuote.items?.length > 0) {
                const itemIds: string[] = [];
                const itemsData: any[] = [];
                existingQuote.items.forEach((item: any) => {
                    const menuItem = state.menuItems.find(mi => mi.id === item.menu_item_id);
                    if (menuItem) {
                        itemIds.push(menuItem.id);
                        itemsData.push(menuItem);
                    }
                });
                state.setSelectedItems(itemIds);
                state.setSelectedItemsData(itemsData);
            }

            // Pre-populate services
            if (existingQuote.services && existingQuote.services.length > 0) {
                const services: Record<string, number> = {};
                let staff = 0;
                existingQuote.services.forEach((svc: any) => {
                    if (svc.service_name === 'Nhân viên phục vụ') {
                        staff = svc.quantity;
                    } else {
                        // Match by name to find service ID
                        const match = ['table-inox', 'table-event', 'canopy'].find((_, idx) => {
                            const names = ['Bàn, ghế inox', 'Bàn, ghế sự kiện', 'Khung rạp, trang trí'];
                            return names[idx] === svc.service_name;
                        });
                        if (match) services[match] = svc.quantity;
                    }
                });
                state.setSelectedServices(services);
                state.setStaffCount(staff);
            }

            // Pre-populate discounts & VAT
            if (existingQuote.discount_furniture_percent != null) state.setDiscountFurniture(existingQuote.discount_furniture_percent);
            if (existingQuote.discount_staff_percent != null) state.setDiscountStaff(existingQuote.discount_staff_percent);
            if (existingQuote.discount_total_percent != null) state.setDiscountOrder(existingQuote.discount_total_percent);
            if (existingQuote.is_vat_inclusive != null) state.setIncludeVat(existingQuote.is_vat_inclusive);

            setIsDataLoaded(true);
        }
    }, [existingQuote, isDataLoaded, state.menuItems]);

    const handleSubmit = () => {
        const payload = state.buildPayload();
        updateMutation.mutate(
            {
                id: quoteId,
                data: {
                    ...payload,
                    status: existingQuote?.status === 'DRAFT' ? 'NEW' : existingQuote?.status,
                } as any,
            },
            { onSuccess: () => router.push('/quote') }
        );
    };

    const handleSaveDraft = () => {
        const payload = state.buildPayload();
        updateMutation.mutate(
            { id: quoteId, data: { ...payload, status: 'DRAFT' } as any },
            { onSuccess: () => router.push('/quote') }
        );
    };

    // Skeleton loading while fetching quote data
    if (quoteLoading || !existingQuote) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="space-y-2">
                        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                    </div>
                </div>
                <Card>
                    <CardContent className="p-8">
                        <div className="space-y-4">
                            <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            <div className="h-10 w-full bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                            <div className="h-10 w-full bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                            <div className="h-10 w-2/3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <QuoteWizard
            mode="edit"
            state={state}
            isPending={updateMutation.isPending}
            onSubmit={handleSubmit}
            onSaveDraft={handleSaveDraft}
        />
    );
}
