'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { IconCalendar, IconClock, IconAlertCircle, IconExternalLink } from '@tabler/icons-react';
import { format, parseISO, differenceInDays, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { vi } from 'date-fns/locale';


interface ScheduleItem {
    po_id: string;
    po_code: string;
    supplier_name: string;
    amount: number;
    paid_amount: number;
    balance: number;
    payment_terms: string;
    due_date: string;
    days_until_due: number;
    status: string;  // ON_TIME, DUE_SOON, OVERDUE
}

interface ScheduleResponse {
    schedule: ScheduleItem[];
    summary: {
        total_count: number;
        overdue_count: number;
        due_soon_count: number;
        total_amount: number;
    };
}

const groupByUrgency = (items: ScheduleItem[]) => {
    return {
        overdue: items.filter(i => i.status === 'OVERDUE'),
        today: items.filter(i => i.days_until_due === 0 && i.status !== 'OVERDUE'),
        tomorrow: items.filter(i => i.days_until_due === 1),
        thisWeek: items.filter(i => i.days_until_due >= 2 && i.days_until_due <= 7),
        later: items.filter(i => i.days_until_due > 7),
    };
};

function ScheduleGroup({
    title,
    items,
    urgent = false,
    icon: Icon,
    onItemClick
}: {
    title: string;
    items: ScheduleItem[];
    urgent?: boolean;
    icon?: any;
    onItemClick?: (poId: string) => void;
}) {
    if (items.length === 0) return null;

    return (
        <div className="space-y-2">
            <div className={`flex items-center gap-2 text-sm font-medium ${urgent ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}`}>
                {Icon && <Icon className="h-4 w-4" />}
                {title}
                <Badge variant="outline" className={urgent ? 'border-red-200 text-red-600' : ''}>
                    {items.length}
                </Badge>
            </div>
            <div className="space-y-2">
                {items.map((item) => (
                    <div
                        key={item.po_id}
                        onClick={() => onItemClick?.(item.po_id)}
                        className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-colors duration-200 ${urgent ? 'border-red-200 bg-red-50 hover:bg-red-100' : 'border-gray-200 dark:border-gray-700 bg-white hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                                    {item.po_code}
                                    <IconExternalLink className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{item.supplier_name}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{formatCurrency(item.balance)}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {item.due_date ? format(parseISO(item.due_date), 'dd/MM/yyyy', { locale: vi }) : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function PaymentSchedule() {
    const router = useRouter();

    const { data, isLoading, error } = useQuery({
        queryKey: ['finance-payment-schedule'],
        queryFn: async () => {
            const response = await api.get<ScheduleResponse>('/finance/payables/schedule');
            return response;
        },
    });

    const handleNavigateToPO = (poId: string) => {
        router.push(`/procurement/purchase-orders/${poId}`);
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Lịch thanh toán</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-48 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-gray-500 dark:text-gray-400">
                    Không thể tải lịch thanh toán
                </CardContent>
            </Card>
        );
    }

    const scheduleItems = data.schedule || [];

    if (scheduleItems.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Lịch thanh toán</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="py-8 text-center text-gray-400 dark:text-gray-500">
                        <IconCalendar className="mx-auto h-8 w-8 mb-2" />
                        Không có khoản thanh toán sắp tới
                    </div>
                </CardContent>
            </Card>
        );
    }

    const grouped = groupByUrgency(scheduleItems);
    const totalDue = data.summary?.total_amount || scheduleItems.reduce((sum, item) => sum + item.balance, 0);

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Lịch thanh toán</CardTitle>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        Tổng: {formatCurrency(totalDue)}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <ScheduleGroup
                    title="Quá hạn"
                    items={grouped.overdue}
                    urgent
                    icon={IconAlertCircle}
                    onItemClick={handleNavigateToPO}
                />
                <ScheduleGroup
                    title="Hôm nay"
                    items={grouped.today}
                    urgent
                    icon={IconClock}
                    onItemClick={handleNavigateToPO}
                />
                <ScheduleGroup
                    title="Ngày mai"
                    items={grouped.tomorrow}
                    icon={IconCalendar}
                    onItemClick={handleNavigateToPO}
                />
                <ScheduleGroup
                    title="Trong tuần"
                    items={grouped.thisWeek}
                    icon={IconCalendar}
                    onItemClick={handleNavigateToPO}
                />
                <ScheduleGroup
                    title="Sau đó"
                    items={grouped.later}
                    icon={IconCalendar}
                    onItemClick={handleNavigateToPO}
                />
            </CardContent>
        </Card>
    );
}
