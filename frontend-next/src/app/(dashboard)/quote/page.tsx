'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuotes, useDeleteQuote } from '@/hooks/use-quotes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Quote } from '@/types';
import {
    IconPlus,
    IconSearch,
    IconEdit,
    IconTrash,
    IconPrinter,
    IconFileText,
    IconClock,
    IconCheck,
    IconX,
    IconStar,
    IconStarFilled,
    IconDotsVertical,
    IconRefresh,
} from '@tabler/icons-react';

const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
    draft: 'Nháp',
    sent: 'Đã gửi',
    confirmed: 'Xác nhận',
    cancelled: 'Đã hủy',
};

export default function QuoteListPage() {
    const [search, setSearch] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [starredIds, setStarredIds] = useState<number[]>([]);
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    const { data, isLoading, error, refetch } = useQuotes({ search });
    const deleteMutation = useDeleteQuote();

    const handleDelete = () => {
        if (deleteId) {
            deleteMutation.mutate(deleteId, {
                onSuccess: () => setDeleteId(null),
            });
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === quotes.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(quotes.map((q: Quote) => q.id));
        }
    };

    const toggleStar = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setStarredIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const quotes = data?.items || [];

    // Calculate stats
    const stats = {
        total: data?.total || 0,
        draft: quotes.filter((q: Quote) => q.status === 'draft').length,
        confirmed: quotes.filter((q: Quote) => q.status === 'confirmed').length,
        cancelled: quotes.filter((q: Quote) => q.status === 'cancelled').length,
    };

    return (
        <div className="space-y-4">
            {/* Header - Gmail style compact */}
            <motion.div
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">Báo giá</h1>
                    <p className="text-sm text-gray-500">Quản lý danh sách báo giá</p>
                </div>
                <Link href="/quote/create">
                    <Button className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                        <IconPlus className="mr-2 h-4 w-4" />
                        Tạo báo giá
                    </Button>
                </Link>
            </motion.div>

            {/* Stats Cards - Compact */}
            <motion.div
                className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                {[
                    { label: 'Tổng', value: stats.total, icon: IconFileText, color: 'blue' },
                    { label: 'Chờ duyệt', value: stats.draft, icon: IconClock, color: 'amber' },
                    { label: 'Xác nhận', value: stats.confirmed, icon: IconCheck, color: 'green' },
                    { label: 'Đã hủy', value: stats.cancelled, icon: IconX, color: 'red' },
                ].map((stat, i) => (
                    <Card key={i} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-3 md:p-4">
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className={`p-1.5 md:p-2 rounded-lg bg-${stat.color}-50`}>
                                    <stat.icon className={`h-4 w-4 md:h-5 md:w-5 text-${stat.color}-600`} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">{stat.label}</p>
                                    <p className="text-base md:text-lg font-bold">{stat.value}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </motion.div>

            {/* Gmail-style List Container */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Card className="overflow-hidden">
                    {/* Toolbar - Gmail style */}
                    <div className="flex items-center gap-2 p-2 md:p-3 border-b bg-gray-50/50">
                        <Checkbox
                            checked={quotes.length > 0 && selectedIds.length === quotes.length}
                            onCheckedChange={toggleSelectAll}
                            className="ml-1"
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
                            <IconRefresh className="h-4 w-4" />
                        </Button>
                        <div className="flex-1" />
                        <div className="relative w-full max-w-xs">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Tìm kiếm..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-8 text-sm"
                            />
                        </div>
                    </div>

                    {/* List Content */}
                    <div className="divide-y">
                        {isLoading ? (
                            <div className="p-4 space-y-2">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Skeleton key={i} className="h-14 w-full" />
                                ))}
                            </div>
                        ) : error ? (
                            <p className="text-red-500 text-center py-8">Không thể tải danh sách</p>
                        ) : quotes.length === 0 ? (
                            <div className="text-center py-16">
                                <IconFileText className="mx-auto h-12 w-12 text-gray-300" />
                                <p className="mt-4 text-gray-500">Chưa có báo giá nào</p>
                                <Link href="/quote/create">
                                    <Button className="mt-4" variant="outline" size="sm">
                                        <IconPlus className="mr-2 h-4 w-4" />
                                        Tạo báo giá
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            quotes.map((quote: Quote) => (
                                <div
                                    key={quote.id}
                                    className={`
                                        flex items-center gap-2 md:gap-4 px-2 md:px-4 py-2 md:py-3 
                                        cursor-pointer transition-colors
                                        ${selectedIds.includes(quote.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}
                                        ${hoveredId === quote.id ? 'bg-gray-50' : ''}
                                    `}
                                    onMouseEnter={() => setHoveredId(quote.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    onClick={() => toggleSelect(quote.id)}
                                >
                                    {/* Checkbox */}
                                    <Checkbox
                                        checked={selectedIds.includes(quote.id)}
                                        onCheckedChange={() => toggleSelect(quote.id)}
                                        onClick={(e) => e.stopPropagation()}
                                    />

                                    {/* Star */}
                                    <button
                                        onClick={(e) => toggleStar(quote.id, e)}
                                        className="p-1 hover:bg-gray-100 rounded"
                                    >
                                        {starredIds.includes(quote.id) ? (
                                            <IconStarFilled className="h-4 w-4 text-amber-400" />
                                        ) : (
                                            <IconStar className="h-4 w-4 text-gray-400 hover:text-amber-400" />
                                        )}
                                    </button>

                                    {/* Main Content - Gmail style */}
                                    <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-4">
                                        {/* Customer Name */}
                                        <div className="w-24 md:w-40 truncate">
                                            <span className="font-medium text-sm text-gray-900">
                                                {quote.customer_name || 'Khách hàng'}
                                            </span>
                                        </div>

                                        {/* Quote Number + Status */}
                                        <div className="flex-1 min-w-0 flex items-center gap-2">
                                            <Badge className={`${statusColors[quote.status]} text-xs px-1.5 py-0.5 shrink-0`}>
                                                {statusLabels[quote.status]}
                                            </Badge>
                                            <span className="text-sm text-gray-600 truncate hidden sm:inline">
                                                {quote.quote_number} - {quote.guest_count} khách
                                            </span>
                                            <span className="text-sm text-gray-600 truncate sm:hidden">
                                                {quote.quote_number}
                                            </span>
                                        </div>

                                        {/* Amount */}
                                        <div className="text-right shrink-0">
                                            <span className="text-sm font-medium text-gray-900">
                                                {formatCurrency(quote.total_amount)}
                                            </span>
                                        </div>

                                        {/* Date - Desktop only */}
                                        <div className="w-20 text-right shrink-0 hidden lg:block">
                                            <span className="text-xs text-gray-500">
                                                {formatDate(quote.event_date)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions - Show on hover (desktop) or always (mobile) */}
                                    <div className={`
                                        flex items-center gap-0.5 shrink-0
                                        ${hoveredId === quote.id ? 'opacity-100' : 'opacity-0 md:opacity-0'}
                                        transition-opacity
                                    `}>
                                        <Link href={`/quote/${quote.id}/edit`} onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                                <IconEdit className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                                            <IconPrinter className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteId(quote.id);
                                            }}
                                        >
                                            <IconTrash className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>

                                    {/* Mobile: 3-dot menu always visible */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 md:hidden"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <IconDotsVertical className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer - Pagination info */}
                    {quotes.length > 0 && (
                        <div className="flex items-center justify-between p-3 border-t bg-gray-50/50 text-sm text-gray-500">
                            <span>{selectedIds.length > 0 ? `${selectedIds.length} đã chọn` : `${quotes.length} báo giá`}</span>
                            <span>Trang 1 / 1</span>
                        </div>
                    )}
                </Card>
            </motion.div>

            {/* Delete Dialog */}
            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa báo giá này?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Hủy</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
