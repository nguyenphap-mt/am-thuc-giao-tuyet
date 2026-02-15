'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { IconSearch, IconExternalLink, IconCash, IconArrowUp, IconArrowDown, IconDownload, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { BulkPaymentModal } from './bulk-payment-modal';
import { ReceivableDetailDrawer } from './receivable-detail-drawer';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useReportExport, type ExportFormat, type ExportConfig } from '@/hooks/use-report-export';
import { ExportDialog } from '@/components/analytics/export-dialog';
import type { ReportSheet, KpiCard, ColumnDef } from '@/lib/excel-report-engine';

interface Receivable {
    order_id: string;
    order_code: string;
    customer_name: string;
    event_date: string;
    final_amount: number | string;
    paid_amount: number | string;
    balance_amount: number | string;
    status: string;
    aging_bucket?: string;
}

type SortField = 'order_code' | 'customer_name' | 'event_date' | 'final_amount' | 'balance_amount';
type SortDirection = 'asc' | 'desc';
type AgingFilter = 'all' | 'current' | '0-7' | '8-15' | '15+';

const ITEMS_PER_PAGE = 15;

const getAgingBucket = (eventDate: string): AgingFilter => {
    const daysOverdue = differenceInDays(new Date(), parseISO(eventDate));
    if (daysOverdue <= 0) return 'current';
    if (daysOverdue <= 7) return '0-7';
    if (daysOverdue <= 15) return '8-15';
    return '15+';
};

const getAgingBadge = (eventDate: string) => {
    const bucket = getAgingBucket(eventDate);
    switch (bucket) {
        case 'current':
            return <Badge className="bg-blue-100 text-blue-700">Sắp tới</Badge>;
        case '0-7':
            return <Badge className="bg-yellow-100 text-yellow-700">0-7 ngày</Badge>;
        case '8-15':
            return <Badge className="bg-orange-100 text-orange-700">8-15 ngày</Badge>;
        case '15+':
            return <Badge className="bg-red-100 text-red-700">&gt;15 ngày</Badge>;
    }
};

const AGING_FILTER_OPTIONS: { value: AgingFilter; label: string }[] = [
    { value: 'all', label: 'Tất cả' },
    { value: 'current', label: 'Sắp tới' },
    { value: '0-7', label: 'Quá hạn 0-7 ngày' },
    { value: '8-15', label: 'Quá hạn 8-15 ngày' },
    { value: '15+', label: 'Quá hạn >15 ngày' },
];

export function ReceivablesTable() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [exportOpen, setExportOpen] = useState(false);
    const { isExporting, exportData } = useReportExport();

    // New state for sorting, filtering, pagination
    const [sortField, setSortField] = useState<SortField>('event_date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [agingFilter, setAgingFilter] = useState<AgingFilter>('all');
    const [currentPage, setCurrentPage] = useState(1);

    const { data, isLoading, error } = useQuery({
        queryKey: ['finance-receivables'],
        queryFn: async () => {
            const response = await api.get<Receivable[]>('/finance/receivables');
            return response;
        },
    });

    // Memoized filtered, sorted, and paginated data
    const { filteredData, paginatedData, totalPages, stats } = useMemo(() => {
        if (!data) return { filteredData: [], paginatedData: [], totalPages: 0, stats: { total: 0, current: 0, overdue7: 0, overdue15: 0, overdue15plus: 0 } };

        // Step 1: Calculate stats
        const stats = data.reduce((acc, item) => {
            const bucket = getAgingBucket(item.event_date);
            acc.total += Number(item.balance_amount || 0);
            if (bucket === 'current') acc.current += Number(item.balance_amount || 0);
            else if (bucket === '0-7') acc.overdue7 += Number(item.balance_amount || 0);
            else if (bucket === '8-15') acc.overdue15 += Number(item.balance_amount || 0);
            else acc.overdue15plus += Number(item.balance_amount || 0);
            return acc;
        }, { total: 0, current: 0, overdue7: 0, overdue15: 0, overdue15plus: 0 });

        // Step 2: Filter by search
        let filtered = data.filter(
            (item) =>
                item.order_code.toLowerCase().includes(search.toLowerCase()) ||
                item.customer_name.toLowerCase().includes(search.toLowerCase())
        );

        // Step 3: Filter by aging bucket
        if (agingFilter !== 'all') {
            filtered = filtered.filter((item) => getAgingBucket(item.event_date) === agingFilter);
        }

        // Step 4: Sort
        filtered.sort((a, b) => {
            let aVal: number | string = '';
            let bVal: number | string = '';

            switch (sortField) {
                case 'order_code':
                    aVal = a.order_code;
                    bVal = b.order_code;
                    break;
                case 'customer_name':
                    aVal = a.customer_name;
                    bVal = b.customer_name;
                    break;
                case 'event_date':
                    aVal = new Date(a.event_date).getTime();
                    bVal = new Date(b.event_date).getTime();
                    break;
                case 'final_amount':
                    aVal = Number(a.final_amount || 0);
                    bVal = Number(b.final_amount || 0);
                    break;
                case 'balance_amount':
                    aVal = Number(a.balance_amount || 0);
                    bVal = Number(b.balance_amount || 0);
                    break;
            }

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
        });

        // Step 5: Paginate
        const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
        const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
        const paginated = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

        return { filteredData: filtered, paginatedData: paginated, totalPages, stats };
    }, [data, search, agingFilter, sortField, sortDirection, currentPage]);

    const totalBalance = stats.total;

    // Sort handler
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
        setCurrentPage(1); // Reset to first page on sort
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc'
            ? <IconArrowUp className="h-3 w-3 inline ml-1" />
            : <IconArrowDown className="h-3 w-3 inline ml-1" />;
    };

    // Selection handlers
    const toggleSelect = (orderId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(orderId)) {
                next.delete(orderId);
            } else {
                next.add(orderId);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === (paginatedData?.length || 0)) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(paginatedData?.map((item) => item.order_id) || []));
        }
    };

    const selectedOrders = filteredData?.filter((item) => selectedIds.has(item.order_id)).map((item) => ({
        order_id: item.order_id,
        order_code: item.order_code,
        customer_name: item.customer_name,
        event_date: item.event_date,
        final_amount: Number(item.final_amount || 0),
        paid_amount: Number(item.paid_amount || 0),
        balance_amount: Number(item.balance_amount || 0),
    })) || [];

    const handlePaymentSuccess = () => {
        setSelectedIds(new Set());
        queryClient.invalidateQueries({ queryKey: ['finance-receivables'] });
        queryClient.invalidateQueries({ queryKey: ['finance-dashboard-stats'] });
    };

    // ========== PROFESSIONAL EXPORT CONFIG ==========
    const colDef = (key: string, header: string, opts: Partial<ColumnDef> = {}): ColumnDef => ({
        key, header, format: 'text', ...opts,
    });

    const arExportConfig = useMemo((): ExportConfig => {
        const items = filteredData || [];

        const kpiCards: KpiCard[] = [
            { label: 'TỔNG CÔNG NỢ', value: stats.total, format: 'currency', trend: 0, trendLabel: `${data?.length || 0} đơn`, bgColor: 'F3E5F5', valueColor: '7B1FA2', icon: '📊' },
            { label: 'SẮP TỚI', value: stats.current, format: 'currency', trend: 0, trendLabel: '', bgColor: 'E3F2FD', valueColor: '1565C0', icon: '⏳' },
            { label: 'QUÁ HẠN 0-7 NGÀY', value: stats.overdue7, format: 'currency', trend: 0, trendLabel: '', bgColor: 'FFF3E0', valueColor: 'E65100', icon: '⚠️' },
            { label: 'QUÁ HẠN >15 NGÀY', value: stats.overdue15plus, format: 'currency', trend: 0, trendLabel: '', bgColor: 'FFEBEE', valueColor: 'C62828', icon: '🚨' },
        ];

        const dataRows = items.map(item => ({
            order_code: item.order_code,
            customer_name: item.customer_name,
            event_date: format(parseISO(item.event_date), 'dd/MM/yyyy'),
            final_amount: Number(item.final_amount || 0),
            paid_amount: Number(item.paid_amount || 0),
            balance_amount: Number(item.balance_amount || 0),
            aging_bucket: getAgingBucket(item.event_date),
        }));

        const columns: ColumnDef[] = [
            colDef('order_code', 'Mã đơn', { width: 14 }),
            colDef('customer_name', 'Khách hàng', { width: 25 }),
            colDef('event_date', 'Ngày sự kiện', { width: 14 }),
            colDef('final_amount', 'Tổng tiền', { format: 'currency', width: 18 }),
            colDef('paid_amount', 'Đã thu', { format: 'currency', width: 18 }),
            colDef('balance_amount', 'Còn nợ', { format: 'currency', width: 18 }),
            colDef('aging_bucket', 'Tình trạng', { width: 14 }),
        ];

        const sheets: ReportSheet[] = [{
            name: 'Công nợ phải thu',
            title: 'Báo cáo Công nợ phải thu',
            subtitle: `Xuất ngày: ${format(new Date(), 'dd/MM/yyyy')}`,
            kpiCards,
            columns,
            data: dataRows,
            summaryRow: true,
        }];

        return {
            title: 'Báo cáo Công nợ phải thu',
            columns: [
                { key: 'order_code', header: 'Mã đơn' },
                { key: 'customer_name', header: 'Khách hàng' },
                { key: 'event_date', header: 'Ngày sự kiện' },
                { key: 'final_amount', header: 'Tổng tiền', format: (v) => formatCurrency(v as number) },
                { key: 'paid_amount', header: 'Đã thu', format: (v) => formatCurrency(v as number) },
                { key: 'balance_amount', header: 'Còn nợ', format: (v) => formatCurrency(v as number) },
                { key: 'aging_bucket', header: 'Tình trạng' },
            ],
            data: dataRows,
            filename: `cong-no-phai-thu-${format(new Date(), 'yyyy-MM-dd')}`,
            sheets,
        };
    }, [filteredData, stats, data]);

    const handleArExport = async (fmt: ExportFormat, filename: string) => {
        const config = { ...arExportConfig, filename };
        await exportData(fmt, config);
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Danh sách công nợ phải thu</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full animate-pulse" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-gray-500 dark:text-gray-400">
                    Không thể tải dữ liệu công nợ
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            {/* Compact Aging Summary Bar */}
            <div className="mb-4 border rounded-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 p-3">
                {/* Top row: total + filter chips */}
                <div className="flex items-center justify-between mb-2.5">
                    <button
                        onClick={() => { setAgingFilter('all'); setCurrentPage(1); }}
                        className={`text-left cursor-pointer transition-colors ${agingFilter === 'all' ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                    >
                        <span className="text-xs text-gray-500 dark:text-gray-400">Tổng công nợ phải thu</span>
                        <span className="ml-2 text-base font-bold text-gray-900 dark:text-gray-100 tabular-nums">{formatCurrency(stats.total)}</span>
                        <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">({data?.length || 0} đơn)</span>
                    </button>
                    <div className="flex items-center gap-1">
                        {([
                            { key: 'current' as AgingFilter, label: 'Sắp tới', color: 'blue' },
                            { key: '0-7' as AgingFilter, label: '0-7 ngày', color: 'yellow' },
                            { key: '15+' as AgingFilter, label: '>15 ngày', color: 'red' },
                        ]).map(({ key, label, color }) => (
                            <button
                                key={key}
                                onClick={() => { setAgingFilter(agingFilter === key ? 'all' : key); setCurrentPage(1); }}
                                className={`px-2 py-0.5 rounded-full text-[11px] font-medium cursor-pointer transition-all ${agingFilter === key
                                        ? `bg-${color}-100 text-${color}-700 ring-1 ring-${color}-300`
                                        : `text-gray-500 hover:bg-${color}-50 hover:text-${color}-600`
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                {/* Stacked progress bar */}
                {stats.total > 0 && (
                    <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                        {stats.current > 0 && (
                            <button
                                onClick={() => { setAgingFilter(agingFilter === 'current' ? 'all' : 'current'); setCurrentPage(1); }}
                                className="bg-blue-400 hover:bg-blue-500 transition-colors cursor-pointer"
                                style={{ width: `${(stats.current / stats.total) * 100}%` }}
                                title={`Sắp tới: ${formatCurrency(stats.current)} (${((stats.current / stats.total) * 100).toFixed(0)}%)`}
                            />
                        )}
                        {stats.overdue7 > 0 && (
                            <button
                                onClick={() => { setAgingFilter(agingFilter === '0-7' ? 'all' : '0-7'); setCurrentPage(1); }}
                                className="bg-yellow-400 hover:bg-yellow-500 transition-colors cursor-pointer"
                                style={{ width: `${(stats.overdue7 / stats.total) * 100}%` }}
                                title={`Quá hạn 0-7 ngày: ${formatCurrency(stats.overdue7)} (${((stats.overdue7 / stats.total) * 100).toFixed(0)}%)`}
                            />
                        )}
                        {stats.overdue15 > 0 && (
                            <button
                                onClick={() => { setAgingFilter(agingFilter === '8-15' ? 'all' : '8-15'); setCurrentPage(1); }}
                                className="bg-orange-400 hover:bg-orange-500 transition-colors cursor-pointer"
                                style={{ width: `${(stats.overdue15 / stats.total) * 100}%` }}
                                title={`Quá hạn 8-15 ngày: ${formatCurrency(stats.overdue15)} (${((stats.overdue15 / stats.total) * 100).toFixed(0)}%)`}
                            />
                        )}
                        {stats.overdue15plus > 0 && (
                            <button
                                onClick={() => { setAgingFilter(agingFilter === '15+' ? 'all' : '15+'); setCurrentPage(1); }}
                                className="bg-red-400 hover:bg-red-500 transition-colors cursor-pointer"
                                style={{ width: `${(stats.overdue15plus / stats.total) * 100}%` }}
                                title={`Quá hạn >15 ngày: ${formatCurrency(stats.overdue15plus)} (${((stats.overdue15plus / stats.total) * 100).toFixed(0)}%)`}
                            />
                        )}
                    </div>
                )}
                {/* Legend row */}
                <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />Sắp tới: {formatCurrency(stats.current)}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" />0-7d: {formatCurrency(stats.overdue7)}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" />8-15d: {formatCurrency(stats.overdue15)}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />&gt;15d: {formatCurrency(stats.overdue15plus)}</span>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <CardTitle className="text-base">
                            Danh sách công nợ phải thu
                            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                                ({filteredData.length} đơn - {formatCurrency(totalBalance)})
                            </span>
                        </CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                            {selectedIds.size > 0 && (
                                <Button
                                    size="sm"
                                    onClick={() => setShowBulkModal(true)}
                                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                                >
                                    <IconCash className="h-4 w-4 mr-2" />
                                    Ghi nhận thanh toán ({selectedIds.size})
                                </Button>
                            )}
                            <Select value={agingFilter} onValueChange={(v) => { setAgingFilter(v as AgingFilter); setCurrentPage(1); }}>
                                <SelectTrigger className="w-[160px] h-9 text-sm">
                                    <SelectValue placeholder="Lọc theo tuổi nợ" />
                                </SelectTrigger>
                                <SelectContent>
                                    {AGING_FILTER_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <PermissionGate module="finance" action="export">
                                <Button size="sm" variant="outline" onClick={() => setExportOpen(true)} className="h-9">
                                    <IconDownload className="h-4 w-4 mr-1" />
                                    Xuất
                                </Button>
                            </PermissionGate>
                            <div className="relative w-full md:w-56">
                                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                                <Input
                                    placeholder="Tìm mã đơn, khách hàng..."
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                    className="pl-9 h-9"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {paginatedData.length === 0 ? (
                        <div className="py-12 text-center text-gray-400 dark:text-gray-500">
                            {data?.length === 0
                                ? 'Không có công nợ phải thu'
                                : 'Không tìm thấy kết quả'}
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-center py-3 px-2 w-10">
                                                <Checkbox
                                                    checked={selectedIds.size === paginatedData.length && paginatedData.length > 0}
                                                    onCheckedChange={toggleSelectAll}
                                                />
                                            </th>
                                            <th
                                                className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-100"
                                                onClick={() => handleSort('order_code')}
                                            >
                                                Mã đơn <SortIcon field="order_code" />
                                            </th>
                                            <th
                                                className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-100"
                                                onClick={() => handleSort('customer_name')}
                                            >
                                                Khách hàng <SortIcon field="customer_name" />
                                            </th>
                                            <th
                                                className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-100"
                                                onClick={() => handleSort('event_date')}
                                            >
                                                Ngày sự kiện <SortIcon field="event_date" />
                                            </th>
                                            <th
                                                className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-100"
                                                onClick={() => handleSort('final_amount')}
                                            >
                                                Tổng tiền <SortIcon field="final_amount" />
                                            </th>
                                            <th className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Đã thu</th>
                                            <th
                                                className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-100"
                                                onClick={() => handleSort('balance_amount')}
                                            >
                                                Còn nợ <SortIcon field="balance_amount" />
                                            </th>
                                            <th className="text-center py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Tình trạng</th>
                                            <th className="text-center py-3 px-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedData.map((item) => {
                                            const bucket = getAgingBucket(item.event_date);
                                            const isOverdue = bucket === '8-15' || bucket === '15+';
                                            return (
                                                <tr
                                                    key={item.order_id}
                                                    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900 cursor-pointer transition-colors ${selectedIds.has(item.order_id)
                                                        ? 'bg-purple-50 hover:bg-purple-100'
                                                        : isOverdue
                                                            ? 'bg-red-50/30'
                                                            : ''
                                                        }`}
                                                    onClick={() => setSelectedOrderId(item.order_id)}
                                                >
                                                    <td className="py-3 px-2 text-center" onClick={(e) => toggleSelect(item.order_id, e)}>
                                                        <Checkbox checked={selectedIds.has(item.order_id)} />
                                                    </td>
                                                    <td className="py-3 px-2 font-medium text-blue-600">
                                                        {item.order_code}
                                                    </td>
                                                    <td className="py-3 px-2">{item.customer_name}</td>
                                                    <td className="py-3 px-2 text-gray-600 dark:text-gray-400 tabular-nums">
                                                        {format(parseISO(item.event_date), 'dd/MM/yyyy', { locale: vi })}
                                                    </td>
                                                    <td className="py-3 px-2 text-right tabular-nums">{formatCurrency(Number(item.final_amount || 0))}</td>
                                                    <td className="py-3 px-2 text-right text-green-600 tabular-nums">
                                                        {formatCurrency(Number(item.paid_amount || 0))}
                                                    </td>
                                                    <td className="py-3 px-2 text-right font-medium text-red-600 tabular-nums">
                                                        {formatCurrency(Number(item.balance_amount || 0))}
                                                    </td>
                                                    <td className="py-3 px-2 text-center">
                                                        {getAgingBadge(item.event_date)}
                                                    </td>
                                                    <td className="py-3 px-2 text-center">
                                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                                            <IconExternalLink className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} / {filteredData.length}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setCurrentPage(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="h-8 w-8 p-0"
                                        >
                                            <IconChevronLeft className="h-4 w-4" />
                                        </Button>
                                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                            const pageNum = i + 1;
                                            return (
                                                <Button
                                                    key={pageNum}
                                                    size="sm"
                                                    variant={currentPage === pageNum ? 'default' : 'outline'}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    {pageNum}
                                                </Button>
                                            );
                                        })}
                                        {totalPages > 5 && <span className="text-gray-400 dark:text-gray-500">...</span>}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setCurrentPage(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            className="h-8 w-8 p-0"
                                        >
                                            <IconChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Bulk Payment Modal */}
            <BulkPaymentModal
                open={showBulkModal}
                onOpenChange={setShowBulkModal}
                selectedOrders={selectedOrders}
                onSuccess={handlePaymentSuccess}
            />

            {/* Receivable Detail Drawer */}
            <ReceivableDetailDrawer
                open={!!selectedOrderId}
                onOpenChange={(open) => { if (!open) setSelectedOrderId(null); }}
                orderId={selectedOrderId}
            />

            <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                onExport={handleArExport}
                isExporting={isExporting}
                defaultFilename={arExportConfig.filename}
                title="Xuất BC Công nợ phải thu"
            />
        </>
    );
}
