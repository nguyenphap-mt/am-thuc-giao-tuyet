'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { IconAlertTriangle, IconPhone, IconMail, IconExternalLink } from '@tabler/icons-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ReceivablesAlert {
    order_id: string;
    order_code: string;
    customer_name: string;
    customer_phone?: string;
    customer_email?: string;
    balance_amount: number | string;  // API returns balance_amount
    event_date: string;
    days_overdue: number;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface ReceivablesAlertSummary {
    total_overdue: number;
    total_amount: number | string;
    high_priority_count: number;
    alerts: ReceivablesAlert[];
}

const priorityStyles = {
    HIGH: 'bg-red-100 text-red-700 border-red-200',
    MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    LOW: 'bg-orange-100 text-orange-700 border-orange-200',
};

const priorityLabels = {
    HIGH: 'Nghiêm trọng',
    MEDIUM: 'Cần theo dõi',
    LOW: 'Nhắc nhở',
};

export function ReceivablesAlerts({ daysThreshold = 7 }: { daysThreshold?: number }) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['receivables-alerts-detail', daysThreshold],
        queryFn: async () => {
            const response = await api.get<ReceivablesAlertSummary>(
                `/finance/receivables/alerts?days_threshold=${daysThreshold}`
            );
            return response;
        },
    });

    if (isLoading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        );
    }

    if (error || !data || data.total_overdue === 0) {
        return (
            <Card className="border-green-200 bg-green-50">
                <CardContent className="py-6 text-center">
                    <p className="text-green-700 font-medium">✅ Không có công nợ quá hạn</p>
                    <p className="text-sm text-green-600 mt-1">
                        Tất cả các đơn hàng đều được thanh toán đúng hạn
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary */}
            <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                        <IconAlertTriangle className="h-6 w-6 text-red-600" />
                        <div>
                            <p className="font-medium text-red-800">
                                {data.total_overdue} đơn hàng quá hạn thanh toán
                            </p>
                            <p className="text-sm text-red-600">
                                Tổng công nợ: <span className="tabular-nums">{formatCurrency(Number(data.total_amount || 0))}</span>
                                {data.high_priority_count > 0 && (
                                    <span className="ml-2">
                                        ({data.high_priority_count} cần xử lý ngay)
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Alert Cards */}
            <div className="grid gap-3">
                {data.alerts?.slice(0, 5).map((alert) => (
                    <Link
                        href={`/orders/${alert.order_id}`}
                        key={alert.order_id}
                        className={`block border cursor-pointer hover:shadow-md transition-colors duration-200 rounded-lg ${priorityStyles[alert.priority]}`}
                    >
                        <CardContent className="py-3">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                                            {alert.order_code}
                                        </span>
                                        <Badge variant="outline" className={priorityStyles[alert.priority]}>
                                            {priorityLabels[alert.priority]}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{alert.customer_name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Sự kiện: {format(parseISO(alert.event_date), 'dd/MM/yyyy', { locale: vi })}
                                        <span className="mx-1">•</span>
                                        Quá hạn {alert.days_overdue} ngày
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg text-gray-900 dark:text-gray-100 tabular-nums">
                                        {formatCurrency(Number(alert.balance_amount || 0))}
                                    </p>
                                    <div className="flex gap-1 mt-2">
                                        {alert.customer_phone && (
                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label="Gọi điện">
                                                <IconPhone className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {alert.customer_email && (
                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label="Gửi email">
                                                <IconMail className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Link>
                ))}
            </div>

            {data.alerts && data.alerts.length > 5 && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    Và {data.alerts.length - 5} đơn hàng khác...
                </p>
            )}
        </div>
    );
}
