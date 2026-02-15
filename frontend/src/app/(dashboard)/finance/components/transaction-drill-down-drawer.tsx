'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    IconArrowUp,
    IconArrowDown,
    IconDownload,
    IconX,
    IconReceipt,
} from '@tabler/icons-react';

export interface DrillDownFilter {
    type: 'category' | 'month' | 'dateRange';
    category?: string;
    month?: string; // Format: "01/2026"
    startDate?: string;
    endDate?: string;
    title?: string;
}

interface Transaction {
    id: string;
    code: string;
    transaction_date: string;
    type: 'RECEIPT' | 'PAYMENT';
    category: string | null;
    description: string | null;
    amount: number;
    payment_method: string | null;
}

interface TransactionDrillDownDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    filter: DrillDownFilter | null;
}

// Vietnamese category labels
const CATEGORY_LABELS: Record<string, string> = {
    NGUYENLIEU: 'Nguyên liệu',
    NHANCONG: 'Nhân công',
    THUEMUON: 'Thuê mướn',
    VANHANH: 'Vận hành',
    MARKETING: 'Marketing',
    UTILITIES: 'Tiện ích',
    OTHER: 'Khác',
};

export function TransactionDrillDownDrawer({
    open,
    onOpenChange,
    filter,
}: TransactionDrillDownDrawerProps) {
    const [page, setPage] = useState(1);
    const limit = 20;

    // Reset page when filter changes
    useEffect(() => {
        setPage(1);
    }, [filter]);

    // Build query params based on filter
    const buildQueryParams = () => {
        if (!filter) return '';

        const params = new URLSearchParams();
        params.set('limit', limit.toString());
        params.set('offset', ((page - 1) * limit).toString());

        if (filter.type === 'category' && filter.category) {
            params.set('category', filter.category);
        } else if (filter.type === 'month' && filter.month) {
            // Parse month format "01/2026" to date range
            const [month, year] = filter.month.split('/');
            const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            const endDate = new Date(parseInt(year), parseInt(month), 0);
            params.set('start_date', startDate.toISOString().split('T')[0]);
            params.set('end_date', endDate.toISOString().split('T')[0]);
        } else if (filter.type === 'dateRange' && filter.startDate && filter.endDate) {
            params.set('start_date', filter.startDate);
            params.set('end_date', filter.endDate);
        }

        return params.toString();
    };

    const { data, isLoading, error } = useQuery({
        queryKey: ['drill-down-transactions', filter, page],
        queryFn: async () => {
            const queryString = buildQueryParams();
            const response = await api.get<{
                transactions: Transaction[];
                total: number;
                summary: {
                    total_receipt: number;
                    total_payment: number;
                };
            }>(`/finance/transactions?${queryString}`);
            return response;
        },
        enabled: open && !!filter,
    });

    const getTitle = () => {
        if (!filter) return 'Chi tiết giao dịch';

        if (filter.title) return filter.title;

        if (filter.type === 'category' && filter.category) {
            return `Chi tiết: ${CATEGORY_LABELS[filter.category] || filter.category}`;
        } else if (filter.type === 'month' && filter.month) {
            return `Giao dịch tháng ${filter.month}`;
        }

        return 'Chi tiết giao dịch';
    };

    const totalPages = Math.ceil((data?.total || 0) / limit);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader className="pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="flex items-center gap-2">
                            <IconReceipt className="h-5 w-5 text-purple-600" />
                            {getTitle()}
                        </SheetTitle>
                    </div>
                    {data?.summary && (
                        <SheetDescription className="flex gap-4 pt-2">
                            <div className="flex items-center gap-1 text-green-600">
                                <IconArrowUp className="h-4 w-4" />
                                <span>Thu: {formatCurrency(data.summary.total_receipt)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-red-600">
                                <IconArrowDown className="h-4 w-4" />
                                <span>Chi: {formatCurrency(data.summary.total_payment)}</span>
                            </div>
                        </SheetDescription>
                    )}
                </SheetHeader>

                <div className="py-4 space-y-3">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))
                    ) : error ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            Không thể tải dữ liệu
                        </div>
                    ) : !data?.transactions?.length ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            Không có giao dịch nào
                        </div>
                    ) : (
                        <>
                            {data.transactions.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm">
                                                    {tx.code}
                                                </span>
                                                <Badge
                                                    variant={tx.type === 'RECEIPT' ? 'default' : 'secondary'}
                                                    className={
                                                        tx.type === 'RECEIPT'
                                                            ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                                            : 'bg-red-100 text-red-700 hover:bg-red-100'
                                                    }
                                                >
                                                    {tx.type === 'RECEIPT' ? 'Thu' : 'Chi'}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {tx.description || 'Không có mô tả'}
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                                {format(new Date(tx.transaction_date), 'dd/MM/yyyy', { locale: vi })}
                                                {tx.category && (
                                                    <span className="ml-2">
                                                        • {CATEGORY_LABELS[tx.category] || tx.category}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <div
                                            className={`font-semibold tabular-nums ${tx.type === 'RECEIPT' ? 'text-green-600' : 'text-red-600'
                                                }`}
                                        >
                                            {tx.type === 'RECEIPT' ? '+' : '-'}
                                            {formatCurrency(tx.amount)}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4 border-t">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        Trang {page} / {totalPages} ({data.total} giao dịch)
                                    </span>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                        >
                                            Trước
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                        >
                                            Sau
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
