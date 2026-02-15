'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, useReducedMotion } from 'framer-motion';
import { useReportExport, type ExportFormat, type ExportConfig } from '@/hooks/use-report-export';
import { ExportDialog } from '@/components/analytics/export-dialog';
import type { ReportSheet, KpiCard, ColumnDef } from '@/lib/excel-report-engine';
import { useQuotes, useDeleteQuote, useMarkQuoteLost } from '@/hooks/use-quotes';
import { useConvertToOrder } from '@/hooks/use-convert-to-order';
import { PermissionGate } from '@/components/shared/PermissionGate';
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
    IconSortAscending,
    IconSortDescending,
    IconLoader2,
    IconTransform,
    IconHandOff,
    IconDownload,
} from '@tabler/icons-react';

const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    NEW: 'bg-blue-100 text-blue-700',
    APPROVED: 'bg-green-100 text-green-700',
    CONVERTED: 'bg-purple-100 text-purple-700',
    REJECTED: 'bg-red-100 text-red-700',
    LOST: 'bg-orange-100 text-orange-700',      // PRD-QUOTE-LOST-001
    EXPIRED: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',        // PRD-QUOTE-LOST-001
    // Legacy lowercase support
    draft: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    sent: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
    DRAFT: 'BG nháp',
    NEW: 'BG mới lập',
    APPROVED: 'Đã duyệt',
    CONVERTED: 'Đã chuyển ĐH',
    REJECTED: 'Từ chối',
    LOST: 'Không chốt',      // PRD-QUOTE-LOST-001
    EXPIRED: 'Hết hạn',      // PRD-QUOTE-LOST-001
    // Legacy lowercase support
    draft: 'BG nháp',
    sent: 'Đã gửi',
    confirmed: 'Xác nhận',
    cancelled: 'Đã hủy',
};

export default function QuoteListPage() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [search, setSearch] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [starredIds, setStarredIds] = useState<number[]>([]);

    // === Gmail-style resizable columns ===
    const defaultWidths: Record<string, number> = { code: 120, customer: 180, eventDate: 125, eventType: 100, tables: 70, amount: 120, status: 110, createdAt: 130 };
    const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('quote-col-widths');
            if (saved) return { ...defaultWidths, ...JSON.parse(saved) };
        }
        return defaultWidths;
    });
    const [resizing, setResizing] = useState<{ col: string; startX: number; startW: number } | null>(null);

    const getWidth = (col: string) => `${colWidths[col] ?? defaultWidths[col] ?? 100}px`;
    const startResize = (col: string, clientX: number) => {
        setResizing({ col, startX: clientX, startW: colWidths[col] ?? defaultWidths[col] ?? 100 });
    };

    useEffect(() => {
        if (!resizing) return;
        const handleMove = (e: MouseEvent) => {
            const diff = e.clientX - resizing.startX;
            const newWidth = Math.max(50, resizing.startW + diff);
            setColWidths(prev => {
                const next = { ...prev, [resizing.col]: newWidth };
                localStorage.setItem('quote-col-widths', JSON.stringify(next));
                return next;
            });
        };
        const handleUp = () => setResizing(null);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
        };
    }, [resizing]);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'date' | 'amount' | 'customer'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
    const [convertQuoteId, setConvertQuoteId] = useState<string | null>(null);
    const [convertQuoteCode, setConvertQuoteCode] = useState<string>('');
    // PRD-QUOTE-LOST-001: Mark as lost state
    const [lostQuoteId, setLostQuoteId] = useState<string | null>(null);
    const [lostQuoteCode, setLostQuoteCode] = useState<string>('');
    const [lostReason, setLostReason] = useState<string>('');
    const [exportOpen, setExportOpen] = useState(false);

    const { data, isLoading, error, refetch } = useQuotes({ search });
    const shouldReduceMotion = useReducedMotion();
    const deleteMutation = useDeleteQuote();
    const convertMutation = useConvertToOrder();
    const markLostMutation = useMarkQuoteLost();  // PRD-QUOTE-LOST-001
    const { isExporting, exportData } = useReportExport();

    const handleDelete = () => {
        if (deleteId) {
            deleteMutation.mutate(deleteId, {
                onSuccess: () => setDeleteId(null),
            });
        }
    };

    const handleBulkDelete = async () => {
        let successCount = 0;
        let failCount = 0;
        let conflictCount = 0;

        for (const id of selectedIds) {
            try {
                // Determine if this quote can be deleted (basic check)
                await deleteMutation.mutateAsync(id);
                successCount++;
            } catch (error: unknown) {
                const axiosErr = error as { response?: { status?: number } };
                if (axiosErr?.response?.status === 409) {
                    console.warn(`Skipped quote ${id}: Linked to Order`);
                    conflictCount++;
                } else {
                    console.error(`Failed to delete quote ${id}`, error);
                    failCount++;
                }
            }
        }

        setSelectedIds([]);
        setShowBulkDeleteDialog(false);

        if (conflictCount > 0 || failCount > 0) {
            toast.warning(
                `Đã xóa ${successCount} báo giá. \n` +
                `${conflictCount} báo giá đang được sử dụng (không thể xóa). \n` +
                (failCount > 0 ? `${failCount} lỗi hệ thống.` : '')
            );
        } else {
            toast.success(`Đã xóa thành công ${successCount} báo giá`);
        }
    };

    const handleConvert = () => {
        if (convertQuoteId) {
            convertMutation.mutate(convertQuoteId, {
                onSuccess: (data) => {
                    setConvertQuoteId(null);
                    setConvertQuoteCode('');
                    // Navigate to orders list (order detail page may not exist yet)
                    router.push('/orders');
                },
            });
        }
    };

    // PRD-QUOTE-LOST-001: Handle mark as lost
    const handleMarkLost = () => {
        if (lostQuoteId) {
            markLostMutation.mutate(
                { id: lostQuoteId, reason: lostReason },
                {
                    onSuccess: () => {
                        setLostQuoteId(null);
                        setLostQuoteCode('');
                        setLostReason('');
                    },
                }
            );
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

    const allQuotes = data?.items || [];

    // Filter by status
    const filteredQuotes = statusFilter === 'all'
        ? allQuotes
        : allQuotes.filter((q: Quote) => q.status === statusFilter);

    // Sort quotes
    const quotes = [...filteredQuotes].sort((a: Quote, b: Quote) => {
        let comparison = 0;
        if (sortBy === 'date') {
            comparison = new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
        } else if (sortBy === 'amount') {
            comparison = a.total_amount - b.total_amount;
        } else {
            comparison = (a.customer_name || '').localeCompare(b.customer_name || '');
        }
        return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Calculate stats from all quotes (not filtered)
    const stats = {
        total: data?.total || 0,
        draft: allQuotes.filter((q: Quote) => q.status === 'draft').length,
        sent: allQuotes.filter((q: Quote) => q.status === 'sent').length,
        confirmed: allQuotes.filter((q: Quote) => q.status === 'confirmed').length,
        cancelled: allQuotes.filter((q: Quote) => q.status === 'cancelled').length,
    };

    const totalValue = allQuotes.reduce((sum: number, q: Quote) => sum + (Number(q.total_amount) || 0), 0);
    const approvedCount = allQuotes.filter((q: Quote) => q.status === 'APPROVED' || q.status === 'confirmed').length;
    const pendingCount = allQuotes.filter((q: Quote) => ['DRAFT', 'NEW', 'draft', 'sent'].includes(q.status)).length;

    // ========== PROFESSIONAL EXPORT CONFIG ==========
    const col = (key: string, header: string, opts: Partial<ColumnDef> = {}): ColumnDef => ({
        key, header, format: 'text', ...opts,
    });

    const exportConfig = useMemo((): ExportConfig => {
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

        const kpiCards: KpiCard[] = [
            { label: 'TỔNG BÁO GIÁ', value: stats.total, format: 'number', trend: 0, trendLabel: '', bgColor: 'E3F2FD', valueColor: '1565C0', icon: '📋' },
            { label: 'ĐÃ DUYỆT', value: approvedCount, format: 'number', trend: 0, trendLabel: '', bgColor: 'E8F5E9', valueColor: '1B7D3A', icon: '✅' },
            { label: 'CHỜ XỬ LÝ', value: pendingCount, format: 'number', trend: 0, trendLabel: '', bgColor: 'FFF3E0', valueColor: 'E65100', icon: '⏳' },
            { label: 'TỔNG GIÁ TRỊ', value: totalValue, format: 'currency', trend: 0, trendLabel: '', bgColor: 'F3E5F5', valueColor: '7B1FA2', icon: '💰' },
        ];

        const dataRows = allQuotes.map((q: Quote) => ({
            code: q.code || q.quote_number || `BG-${q.id}`,
            customer_name: q.customer_name || 'Khách lẻ',
            event_date: formatDate(q.event_date),
            event_type: q.event_type || '',
            table_count: q.table_count || 0,
            total_amount: Number(q.total_amount) || 0,
            status: statusLabels[q.status] || q.status,
            created_at: q.created_at ? formatDate(q.created_at) : '',
        }));

        const sheets: ReportSheet[] = [{
            name: 'Báo giá',
            title: 'Báo cáo Danh sách Báo giá',
            subtitle: `Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}`,
            kpiCards,
            columns: [
                col('code', 'Mã BG', { width: 14 }),
                col('customer_name', 'Khách hàng', { width: 24 }),
                col('event_date', 'Ngày sự kiện', { width: 16 }),
                col('event_type', 'Loại sự kiện', { width: 16 }),
                col('table_count', 'Số bàn', { format: 'number', width: 10, alignment: 'center' }),
                col('total_amount', 'Giá trị', { format: 'currency', width: 20, summaryFn: 'sum' }),
                col('status', 'Trạng thái', { format: 'status', width: 16 }),
                col('created_at', 'Ngày tạo', { width: 16 }),
            ],
            data: dataRows,
            summaryRow: true,
        }];

        return {
            title: 'Báo cáo Báo giá',
            columns: [
                { key: 'code', header: 'Mã BG' },
                { key: 'customer_name', header: 'Khách hàng' },
                { key: 'event_date', header: 'Ngày sự kiện' },
                { key: 'event_type', header: 'Loại sự kiện' },
                { key: 'table_count', header: 'Số bàn' },
                { key: 'total_amount', header: 'Giá trị', format: (v) => formatCurrency(v as number) },
                { key: 'status', header: 'Trạng thái' },
                { key: 'created_at', header: 'Ngày tạo' },
            ],
            data: dataRows,
            filename: `bao-cao-bao-gia_${today}`,
            sheets,
        };
    }, [allQuotes, stats, totalValue, approvedCount, pendingCount]);

    const handleExport = async (format: ExportFormat, filename: string) => {
        const config = { ...exportConfig, filename };
        await exportData(format, config);
    };

    const statusTabs = [
        { key: 'all', label: 'Tất cả', count: stats.total },
        { key: 'draft', label: 'Nháp', count: stats.draft },
        { key: 'sent', label: 'Đã gửi', count: stats.sent },
        { key: 'confirmed', label: 'Xác nhận', count: stats.confirmed },
        { key: 'cancelled', label: 'Đã hủy', count: stats.cancelled },
    ];

    return (
        <div className="space-y-4">
            {/* Header - Gmail style compact */}
            <motion.div
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                initial={shouldReduceMotion ? false : { opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Báo giá</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Quản lý danh sách báo giá</p>
                </div>
                <PermissionGate module="quote" action="create">
                    <Button
                        className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 disabled:opacity-70"
                        disabled={isPending}
                        onClick={() => startTransition(() => router.push('/quote/create'))}
                    >
                        {isPending ? (
                            <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <IconPlus className="mr-2 h-4 w-4" />
                        )}
                        {isPending ? 'Đang chuyển...' : 'Tạo báo giá'}
                    </Button>
                </PermissionGate>
            </motion.div>

            {/* Stats Cards - Compact */}
            <motion.div
                className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3"
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.1 }}
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
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                                    <p className="text-base md:text-lg font-bold">{stat.value}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </motion.div>

            {/* Gmail-style List Container */}
            <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.2 }}
            >
                <Card className="overflow-hidden">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1 px-4 border-b bg-gray-50 dark:bg-gray-900 dark:bg-gray-800/30 overflow-x-auto">
                        {statusTabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setStatusFilter(tab.key)}
                                className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors
                                    ${statusFilter === tab.key
                                        ? 'text-purple-600 border-b-2 border-purple-500'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300 dark:text-gray-600'
                                    }`}
                            >
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </div>

                    {/* Bulk Actions Toolbar */}
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border-b">
                            <span className="text-sm font-medium text-blue-700">
                                {selectedIds.length} đã chọn
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => window.print()}
                            >
                                <IconPrinter className="mr-1.5 h-3.5 w-3.5" />
                                In
                            </Button>
                            <PermissionGate module="quote" action="delete">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 text-xs"
                                    onClick={() => setShowBulkDeleteDialog(true)}
                                >
                                    <IconTrash className="mr-1.5 h-3.5 w-3.5" />
                                    Xóa
                                </Button>
                            </PermissionGate>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => setSelectedIds([])}
                            >
                                Bỏ chọn
                            </Button>
                        </div>
                    )}

                    {/* Toolbar - Gmail style */}
                    <div className="flex items-center gap-2 p-2 md:p-3 border-b bg-gray-50 dark:bg-gray-900/50 dark:bg-gray-800/50">
                        <Checkbox
                            checked={quotes.length > 0 && selectedIds.length === quotes.length}
                            onCheckedChange={toggleSelectAll}
                            className="ml-1"
                            aria-label="Chọn tất cả báo giá"
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} aria-label="Làm mới">
                            <IconRefresh className="h-4 w-4" />
                        </Button>

                        {/* Sort Dropdown */}
                        <div className="hidden sm:flex items-center gap-1 ml-2">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'customer')}
                                className="text-xs h-7 px-2 border rounded-md bg-white focus:ring-1 focus:ring-purple-500 focus-visible:outline-none"
                                aria-label="Sắp xếp theo"
                            >
                                <option value="date">Ngày sự kiện</option>
                                <option value="amount">Giá trị</option>
                                <option value="customer">Khách hàng</option>
                            </select>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                aria-label="Đổi thứ tự sắp xếp"
                            >
                                {sortOrder === 'desc' ? (
                                    <IconSortDescending className="h-4 w-4" />
                                ) : (
                                    <IconSortAscending className="h-4 w-4" />
                                )}
                            </Button>
                        </div>

                        <div className="flex-1" />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExportOpen(true)}
                            className="gap-1.5 h-8 border-gray-300 hover:border-[#c2185b] hover:text-[#c2185b] transition-colors"
                        >
                            <IconDownload className="h-4 w-4" />
                            <span className="hidden sm:inline">Xuất báo cáo</span>
                        </Button>
                        <div className="relative w-full max-w-xs">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <Input
                                placeholder="Tìm kiếm…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-8 text-sm"
                                spellCheck={false}
                            />
                        </div>
                    </div>

                    {/* Gmail-style Table Content */}
                    <div className="overflow-x-auto">
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
                            <div className="text-sm">
                                {/* === RESIZABLE HEADER ROW === */}
                                <div className="flex items-center h-9 bg-[#f5f5f5] border-b select-none px-3">
                                    {/* Checkbox + Star (fixed) */}
                                    <div className="flex items-center shrink-0 w-16">
                                        <Checkbox
                                            checked={quotes.length > 0 && selectedIds.length === quotes.length}
                                            onCheckedChange={toggleSelectAll}
                                            aria-label="Chọn tất cả"
                                        />
                                    </div>
                                    {/* Code */}
                                    <div className="relative flex items-center shrink-0 h-full border-r border-gray-300 hover:bg-[#cce8ff] transition-colors cursor-default" style={{ width: getWidth('code') }}>
                                        <span className="flex-1 truncate px-2 font-semibold text-gray-700 text-xs">Mã báo giá</span>
                                        <div className="absolute right-0 top-0 w-3 h-full cursor-col-resize z-10" onMouseDown={(e) => { e.stopPropagation(); startResize('code', e.clientX); }} title="Kéo để thay đổi kích thước" />
                                    </div>
                                    {/* Customer */}
                                    <div className="relative flex items-center shrink-0 h-full border-r border-gray-300 hover:bg-[#cce8ff] transition-colors cursor-default" style={{ width: getWidth('customer') }}>
                                        <span className="flex-1 truncate px-2 font-semibold text-gray-700 text-xs">Khách hàng</span>
                                        <div className="absolute right-0 top-0 w-3 h-full cursor-col-resize z-10" onMouseDown={(e) => { e.stopPropagation(); startResize('customer', e.clientX); }} title="Kéo để thay đổi kích thước" />
                                    </div>
                                    {/* Event Date */}
                                    <div className="relative hidden sm:flex items-center shrink-0 h-full border-r border-gray-300 hover:bg-[#cce8ff] transition-colors cursor-default" style={{ width: getWidth('eventDate') }}>
                                        <span className="flex-1 truncate px-2 font-semibold text-gray-700 text-xs">Ngày sự kiện</span>
                                        <div className="absolute right-0 top-0 w-3 h-full cursor-col-resize z-10" onMouseDown={(e) => { e.stopPropagation(); startResize('eventDate', e.clientX); }} title="Kéo để thay đổi kích thước" />
                                    </div>
                                    {/* Event Type */}
                                    <div className="relative hidden md:flex items-center shrink-0 h-full border-r border-gray-300 hover:bg-[#cce8ff] transition-colors cursor-default" style={{ width: getWidth('eventType') }}>
                                        <span className="flex-1 truncate px-2 font-semibold text-gray-700 text-xs">Loại SK</span>
                                        <div className="absolute right-0 top-0 w-3 h-full cursor-col-resize z-10" onMouseDown={(e) => { e.stopPropagation(); startResize('eventType', e.clientX); }} title="Kéo để thay đổi kích thước" />
                                    </div>
                                    {/* Tables */}
                                    <div className="relative hidden lg:flex items-center shrink-0 h-full border-r border-gray-300 hover:bg-[#cce8ff] transition-colors cursor-default" style={{ width: getWidth('tables') }}>
                                        <span className="flex-1 truncate px-2 font-semibold text-gray-700 text-xs text-center">Bàn</span>
                                        <div className="absolute right-0 top-0 w-3 h-full cursor-col-resize z-10" onMouseDown={(e) => { e.stopPropagation(); startResize('tables', e.clientX); }} title="Kéo để thay đổi kích thước" />
                                    </div>
                                    {/* Amount */}
                                    <div className="relative flex items-center shrink-0 h-full border-r border-gray-300 hover:bg-[#cce8ff] transition-colors cursor-default" style={{ width: getWidth('amount') }}>
                                        <span className="flex-1 truncate px-2 font-semibold text-gray-700 text-xs text-right">Giá trị</span>
                                        <div className="absolute right-0 top-0 w-3 h-full cursor-col-resize z-10" onMouseDown={(e) => { e.stopPropagation(); startResize('amount', e.clientX); }} title="Kéo để thay đổi kích thước" />
                                    </div>
                                    {/* Status */}
                                    <div className="relative hidden lg:flex items-center shrink-0 h-full border-r border-gray-300 hover:bg-[#cce8ff] transition-colors cursor-default" style={{ width: getWidth('status') }}>
                                        <span className="flex-1 truncate px-2 font-semibold text-gray-700 text-xs">Trạng thái</span>
                                        <div className="absolute right-0 top-0 w-3 h-full cursor-col-resize z-10" onMouseDown={(e) => { e.stopPropagation(); startResize('status', e.clientX); }} title="Kéo để thay đổi kích thước" />
                                    </div>
                                    {/* Created At — fills remaining space */}
                                    <div className="relative hidden lg:flex flex-1 items-center h-full hover:bg-[#cce8ff] transition-colors cursor-default">
                                        <span className="px-2 font-semibold text-gray-700 text-xs">Ngày tạo</span>
                                        <div className="absolute right-0 top-0 w-3 h-full cursor-col-resize z-10" onMouseDown={(e) => { e.stopPropagation(); startResize('createdAt', e.clientX); }} title="Kéo để thay đổi kích thước" />
                                    </div>
                                </div>

                                {/* === DATA ROWS === */}
                                <div className="divide-y">
                                    {quotes.map((quote: Quote) => {
                                        const sellingPrice = Number(quote.total_amount) || 0;
                                        const isSelected = selectedIds.includes(quote.id);
                                        const quoteCode = quote.code || quote.quote_number || `BG-${quote.id}`;

                                        return (
                                            <div
                                                key={quote.id}
                                                className={`relative flex items-center px-3 py-3 cursor-pointer transition-colors group
                                                    ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                                onClick={() => startTransition(() => router.push(`/quote/${quote.id}/edit`))}
                                            >
                                                {/* Checkbox + Star (fixed) */}
                                                <div className="flex items-center gap-1 shrink-0 w-16">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleSelect(quote.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        aria-label={`Chọn ${quoteCode}`}
                                                    />
                                                    <button
                                                        onClick={(e) => toggleStar(quote.id, e)}
                                                        className="p-0.5 hover:bg-gray-100 rounded"
                                                        aria-label="Đánh dấu quan trọng"
                                                    >
                                                        {starredIds.includes(quote.id) ? (
                                                            <IconStarFilled className="h-4 w-4 text-amber-400" />
                                                        ) : (
                                                            <IconStar className="h-4 w-4 text-gray-300 hover:text-amber-400" />
                                                        )}
                                                    </button>
                                                </div>

                                                {/* Code */}
                                                <div className="shrink-0 px-2 truncate" style={{ width: getWidth('code') }}>
                                                    <span className="font-medium text-gray-900">{quoteCode}</span>
                                                </div>

                                                {/* Customer */}
                                                <div className="shrink-0 px-2 truncate" style={{ width: getWidth('customer') }}>
                                                    <div className="font-medium text-gray-900 truncate">{quote.customer_name || 'Khách lẻ'}</div>
                                                    <div className="text-xs text-gray-500 truncate">{quote.company_name || '-'}</div>
                                                </div>

                                                {/* Event Date */}
                                                <div className="hidden sm:block shrink-0 px-2" style={{ width: getWidth('eventDate') }}>
                                                    <div className="text-gray-900 truncate">{formatDate(quote.event_date)}</div>
                                                    <div className="text-xs text-gray-500">{quote.event_time || '—'}</div>
                                                </div>

                                                {/* Event Type */}
                                                <div className="hidden md:block shrink-0 px-2 text-gray-700 truncate" style={{ width: getWidth('eventType') }}>
                                                    {quote.event_type || '—'}
                                                </div>

                                                {/* Tables */}
                                                <div className="hidden lg:flex shrink-0 items-center justify-center px-2" style={{ width: getWidth('tables') }}>
                                                    <span className="inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                                                        {quote.table_count || 0}
                                                    </span>
                                                </div>

                                                {/* Amount */}
                                                <div className="shrink-0 px-2 text-right font-medium text-gray-900 tabular-nums" style={{ width: getWidth('amount') }}>
                                                    {formatCurrency(sellingPrice)}
                                                </div>

                                                {/* Status */}
                                                <div className="hidden lg:flex shrink-0 items-center px-2" style={{ width: getWidth('status') }}>
                                                    <Badge className={`${statusColors[quote.status]} text-xs px-2 py-0.5`}>
                                                        {statusLabels[quote.status]}
                                                    </Badge>
                                                </div>

                                                {/* Created At — fills remaining */}
                                                <div className="hidden lg:flex flex-1 items-center px-2">
                                                    <div className="text-xs text-gray-500 tabular-nums">
                                                        {quote.created_at ? formatDate(quote.created_at) : '—'}
                                                    </div>
                                                </div>

                                                {/* === OVERLAY ACTIONS (Gmail-style) === */}
                                                <div className={`absolute right-2 top-1/2 -translate-y-1/2
                                                    flex items-center gap-0.5 pl-6
                                                    opacity-0 group-hover:opacity-100 transition-opacity
                                                    hidden md:flex
                                                    bg-gradient-to-l ${isSelected ? 'from-blue-50 via-blue-50' : 'from-gray-50 via-gray-50'} to-transparent`}>

                                                    {/* Edit */}
                                                    <PermissionGate module="quote" action="edit">
                                                        <Link href={`/quote/${quote.id}/edit`} onClick={(e) => e.stopPropagation()}>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 bg-white/80 hover:bg-white" aria-label="Chỉnh sửa">
                                                                <IconEdit className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                    </PermissionGate>

                                                    {/* Delete (DRAFT only) */}
                                                    {(quote.status === 'DRAFT' || quote.status === 'draft') && (
                                                        <PermissionGate module="quote" action="delete">
                                                            <Button
                                                                variant="ghost" size="icon"
                                                                className="h-7 w-7 bg-white/80 hover:bg-white text-red-500"
                                                                onClick={(e) => { e.stopPropagation(); setDeleteId(quote.id); }}
                                                                aria-label="Xóa"
                                                            >
                                                                <IconTrash className="h-4 w-4" />
                                                            </Button>
                                                        </PermissionGate>
                                                    )}

                                                    {/* Convert + Mark Lost (NEW/APPROVED only) */}
                                                    {(quote.status === 'NEW' || quote.status === 'APPROVED') && (
                                                        <>
                                                            <PermissionGate module="quote" action="convert">
                                                                <Button
                                                                    variant="ghost" size="icon"
                                                                    className="h-7 w-7 bg-white/80 hover:bg-white"
                                                                    onClick={(e) => { e.stopPropagation(); setConvertQuoteId(String(quote.id)); setConvertQuoteCode(quote.code); }}
                                                                    aria-label="Tạo đơn hàng" title="Tạo đơn hàng từ báo giá này"
                                                                >
                                                                    <IconTransform className="h-4 w-4 text-purple-600" />
                                                                </Button>
                                                            </PermissionGate>
                                                            <Button
                                                                variant="ghost" size="icon"
                                                                className="h-7 w-7 bg-white/80 hover:bg-white"
                                                                onClick={(e) => { e.stopPropagation(); setLostQuoteId(String(quote.id)); setLostQuoteCode(quote.code); }}
                                                                aria-label="Đánh dấu không chốt" title="Đánh dấu báo giá không chốt"
                                                            >
                                                                <IconHandOff className="h-4 w-4 text-orange-500" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer - Pagination info */}
                    {quotes.length > 0 && (
                        <div className="flex items-center justify-between p-3 border-t bg-gray-50 dark:bg-gray-900/50 dark:bg-gray-800/50 text-sm text-gray-500 dark:text-gray-400">
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

            {/* Bulk Delete Dialog */}
            <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Xóa {selectedIds.length} báo giá</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa {selectedIds.length} báo giá đã chọn? Hành động này không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)}>Hủy</Button>
                        <Button variant="destructive" onClick={handleBulkDelete} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? 'Đang xóa...' : `Xóa ${selectedIds.length} báo giá`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Convert to Order Dialog */}
            <Dialog open={!!convertQuoteId} onOpenChange={() => { setConvertQuoteId(null); setConvertQuoteCode(''); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Tạo đơn hàng từ báo giá</DialogTitle>
                        <DialogDescription>
                            Bạn có muốn chuyển báo giá <strong>{convertQuoteCode}</strong> thành đơn hàng?
                            <br /><br />
                            • Đơn hàng mới sẽ có trạng thái <strong>Đã xác nhận</strong>
                            <br />
                            • Báo giá sẽ được đánh dấu là <strong>Đã chuyển ĐH</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => { setConvertQuoteId(null); setConvertQuoteCode(''); }}>Hủy</Button>
                        <Button
                            onClick={handleConvert}
                            disabled={convertMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            {convertMutation.isPending ? 'Đang tạo...' : 'Tạo đơn hàng'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* PRD-QUOTE-LOST-001: Mark as Lost Dialog */}
            <Dialog open={!!lostQuoteId} onOpenChange={() => { setLostQuoteId(null); setLostQuoteCode(''); setLostReason(''); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Đánh dấu không chốt</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn đánh dấu báo giá <strong>{lostQuoteCode}</strong> là "Không chốt"?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Lý do (tùy chọn)
                        </label>
                        <Input
                            placeholder="Ví dụ: Khách hàng chọn nhà cung cấp khác"
                            value={lostReason}
                            onChange={(e) => setLostReason(e.target.value)}
                            className="mt-1.5"
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => { setLostQuoteId(null); setLostQuoteCode(''); setLostReason(''); }}>Hủy</Button>
                        <Button
                            onClick={handleMarkLost}
                            disabled={markLostMutation.isPending}
                            className="bg-orange-500 hover:bg-orange-600"
                        >
                            {markLostMutation.isPending ? 'Đang xử lý...' : 'Xác nhận'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Professional Export Dialog */}
            <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                onExport={handleExport}
                defaultFilename={exportConfig.filename}
                title="Xuất báo cáo Báo giá"
                isExporting={isExporting}
            />
        </div>
    );
}
