'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { IconSearch, IconArrowUp, IconArrowDown, IconDownload, IconChevronLeft, IconChevronRight, IconExternalLink } from '@tabler/icons-react';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PayableDetailDrawer } from './payable-detail-drawer';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useReportExport, type ExportFormat, type ExportConfig } from '@/hooks/use-report-export';
import { ExportDialog } from '@/components/analytics/export-dialog';
import type { ReportSheet, KpiCard, ColumnDef } from '@/lib/excel-report-engine';

interface Payable {
    po_id: string;
    po_code: string;
    supplier_name: string;
    total_amount: number;
    paid_amount: number;
    balance: number;
    status: string;
    created_at: string;
    payment_terms_days: number;
    days_outstanding: number;
}

type SortField = 'po_code' | 'supplier_name' | 'created_at' | 'total_amount' | 'balance';
type SortDirection = 'asc' | 'desc';
type AgingFilter = 'all' | 'on-time' | 'due-soon' | 'overdue' | 'paid';

const ITEMS_PER_PAGE = 15;

// Calculate aging bucket based on payment terms
const getAgingBucket = (payable: Payable): AgingFilter => {
    if (payable.balance <= 0) return 'on-time';
    const dueDate = addDays(parseISO(payable.created_at), payable.payment_terms_days || 30);
    const daysUntilDue = differenceInDays(dueDate, new Date());
    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue <= 7) return 'due-soon';
    return 'on-time';
};

const getStatusBadge = (payable: Payable) => {
    const bucket = getAgingBucket(payable);
    switch (bucket) {
        case 'on-time':
            return <Badge className="bg-green-100 text-green-700">Đúng hạn</Badge>;
        case 'due-soon':
            return <Badge className="bg-yellow-100 text-yellow-700">Sắp đến hạn</Badge>;
        case 'overdue':
            return <Badge className="bg-red-100 text-red-700">Quá hạn</Badge>;
    }
};

const AGING_FILTER_OPTIONS: { value: AgingFilter; label: string }[] = [
    { value: 'all', label: 'Tất cả' },
    { value: 'on-time', label: 'Đúng hạn' },
    { value: 'due-soon', label: 'Sắp đến hạn' },
    { value: 'overdue', label: 'Quá hạn' },
    { value: 'paid', label: 'Đã thanh toán' },
];

export function PayablesTable() {
    const [search, setSearch] = useState('');
    const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
    const [exportOpen, setExportOpen] = useState(false);
    const { isExporting, exportData } = useReportExport();

    // State for sorting, filtering, pagination
    const [sortField, setSortField] = useState<SortField>('created_at');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [agingFilter, setAgingFilter] = useState<AgingFilter>('all');
    const [currentPage, setCurrentPage] = useState(1);

    // When 'paid' filter is selected or search is active, include paid POs
    const shouldIncludePaid = agingFilter === 'paid' || search.length > 0;

    const { data, isLoading, error } = useQuery({
        queryKey: ['finance-payables', shouldIncludePaid],
        queryFn: async () => {
            const params = shouldIncludePaid ? '?include_paid=true' : '';
            const response = await api.get<Payable[]>(`/finance/payables${params}`);
            return response;
        },
    });

    // Memoized filtered, sorted, and paginated data
    const { filteredData, paginatedData, totalPages, stats } = useMemo(() => {
        if (!data) return { filteredData: [], paginatedData: [], totalPages: 0, stats: { total: 0, onTime: 0, dueSoon: 0, overdue: 0, count: 0 } };

        // Step 1: Calculate stats
        const stats = data.reduce((acc, item) => {
            const bucket = getAgingBucket(item);
            const balance = Number(item.balance || 0);
            acc.total += balance;
            if (bucket === 'on-time') acc.onTime += balance;
            else if (bucket === 'due-soon') acc.dueSoon += balance;
            else acc.overdue += balance;
            acc.count++;
            return acc;
        }, { total: 0, onTime: 0, dueSoon: 0, overdue: 0, count: 0 });

        // Step 2: Filter by search
        let filtered = data.filter(
            (item) =>
                item.po_code.toLowerCase().includes(search.toLowerCase()) ||
                item.supplier_name.toLowerCase().includes(search.toLowerCase())
        );

        // Step 3: Filter by aging bucket or paid status
        if (agingFilter === 'paid') {
            filtered = filtered.filter((item) => item.status === 'PAID');
        } else if (agingFilter !== 'all') {
            filtered = filtered.filter((item) => item.status !== 'PAID' && getAgingBucket(item) === agingFilter);
        }

        // Step 4: Sort
        filtered.sort((a, b) => {
            let aVal: number | string = '';
            let bVal: number | string = '';

            switch (sortField) {
                case 'po_code':
                    aVal = a.po_code;
                    bVal = b.po_code;
                    break;
                case 'supplier_name':
                    aVal = a.supplier_name;
                    bVal = b.supplier_name;
                    break;
                case 'created_at':
                    aVal = new Date(a.created_at).getTime();
                    bVal = new Date(b.created_at).getTime();
                    break;
                case 'total_amount':
                    aVal = Number(a.total_amount || 0);
                    bVal = Number(b.total_amount || 0);
                    break;
                case 'balance':
                    aVal = Number(a.balance || 0);
                    bVal = Number(b.balance || 0);
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

    // Sort handler
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
        setCurrentPage(1);
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc'
            ? <IconArrowUp className="h-3 w-3 inline ml-1" />
            : <IconArrowDown className="h-3 w-3 inline ml-1" />;
    };

    // Open detail drawer
    const handleRowClick = (poId: string) => {
        setSelectedPoId(poId);
    };

    // ========== PROFESSIONAL EXPORT CONFIG ==========
    const colDef = (key: string, header: string, opts: Partial<ColumnDef> = {}): ColumnDef => ({
        key, header, format: 'text', ...opts,
    });

    const apExportConfig = useMemo((): ExportConfig => {
        const items = filteredData || [];

        const kpiCards: KpiCard[] = [
            { label: 'TỔNG NỢ PHẢI TRẢ', value: stats.total, format: 'currency', trend: 0, trendLabel: `${stats.count} PO`, bgColor: 'F3E5F5', valueColor: '7B1FA2', icon: '📊' },
            { label: 'ĐÚNG HẠN', value: stats.onTime, format: 'currency', trend: 0, trendLabel: '', bgColor: 'E8F5E9', valueColor: '1B7D3A', icon: '✅' },
            { label: 'SẮP ĐẾN HẠN', value: stats.dueSoon, format: 'currency', trend: 0, trendLabel: '', bgColor: 'FFF3E0', valueColor: 'E65100', icon: '⚠️' },
            { label: 'QUÁ HẠN', value: stats.overdue, format: 'currency', trend: 0, trendLabel: '', bgColor: 'FFEBEE', valueColor: 'C62828', icon: '🚨' },
        ];

        const dataRows = items.map(item => ({
            po_code: item.po_code,
            supplier_name: item.supplier_name,
            created_at: format(parseISO(item.created_at), 'dd/MM/yyyy'),
            total_amount: Number(item.total_amount || 0),
            paid_amount: Number(item.paid_amount || 0),
            balance: Number(item.balance || 0),
            status: getAgingBucket(item),
        }));

        const columns: ColumnDef[] = [
            colDef('po_code', 'Mã PO', { width: 14 }),
            colDef('supplier_name', 'Nhà cung cấp', { width: 25 }),
            colDef('created_at', 'Ngày tạo', { width: 14 }),
            colDef('total_amount', 'Tổng tiền', { format: 'currency', width: 18 }),
            colDef('paid_amount', 'Đã trả', { format: 'currency', width: 18 }),
            colDef('balance', 'Còn nợ', { format: 'currency', width: 18 }),
            colDef('status', 'Trạng thái', { width: 14 }),
        ];

        const sheets: ReportSheet[] = [{
            name: 'Công nợ phải trả',
            title: 'Báo cáo Công nợ phải trả',
            subtitle: `Xuất ngày: ${format(new Date(), 'dd/MM/yyyy')}`,
            kpiCards,
            columns,
            data: dataRows,
            summaryRow: true,
        }];

        return {
            title: 'Báo cáo Công nợ phải trả',
            columns: [
                { key: 'po_code', header: 'Mã PO' },
                { key: 'supplier_name', header: 'Nhà cung cấp' },
                { key: 'created_at', header: 'Ngày tạo' },
                { key: 'total_amount', header: 'Tổng tiền', format: (v) => formatCurrency(v as number) },
                { key: 'paid_amount', header: 'Đã trả', format: (v) => formatCurrency(v as number) },
                { key: 'balance', header: 'Còn nợ', format: (v) => formatCurrency(v as number) },
                { key: 'status', header: 'Trạng thái' },
            ],
            data: dataRows,
            filename: `cong-no-phai-tra-${format(new Date(), 'yyyy-MM-dd')}`,
            sheets,
        };
    }, [filteredData, stats]);

    const handleApExport = async (fmt: ExportFormat, filename: string) => {
        const config = { ...apExportConfig, filename };
        await exportData(fmt, config);
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Danh sách công nợ phải trả</CardTitle>
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
                    Không thể tải dữ liệu công nợ phải trả
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
                        <span className="text-xs text-gray-500 dark:text-gray-400">Tổng nợ phải trả</span>
                        <span className="ml-2 text-base font-bold text-gray-900 dark:text-gray-100 tabular-nums">{formatCurrency(stats.total)}</span>
                        <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">({stats.count} PO)</span>
                    </button>
                    <div className="flex items-center gap-1">
                        {([
                            { key: 'on-time' as AgingFilter, label: 'Đúng hạn', activeClass: 'bg-green-100 text-green-700 ring-1 ring-green-300', hoverClass: 'text-gray-500 hover:bg-green-50 hover:text-green-600' },
                            { key: 'due-soon' as AgingFilter, label: 'Sắp đến hạn', activeClass: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300', hoverClass: 'text-gray-500 hover:bg-yellow-50 hover:text-yellow-600' },
                            { key: 'overdue' as AgingFilter, label: 'Quá hạn', activeClass: 'bg-red-100 text-red-700 ring-1 ring-red-300', hoverClass: 'text-gray-500 hover:bg-red-50 hover:text-red-600' },
                            { key: 'paid' as AgingFilter, label: 'Đã TT', activeClass: 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300', hoverClass: 'text-gray-500 hover:bg-indigo-50 hover:text-indigo-600' },
                        ]).map(({ key, label, activeClass, hoverClass }) => (
                            <button
                                key={key}
                                onClick={() => { setAgingFilter(agingFilter === key ? 'all' : key); setCurrentPage(1); }}
                                className={`px-2 py-0.5 rounded-full text-[11px] font-medium cursor-pointer transition-all ${agingFilter === key ? activeClass : hoverClass}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                {/* Stacked progress bar */}
                {stats.total > 0 && (
                    <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                        {stats.onTime > 0 && (
                            <button
                                onClick={() => { setAgingFilter(agingFilter === 'on-time' ? 'all' : 'on-time'); setCurrentPage(1); }}
                                className="bg-green-400 hover:bg-green-500 transition-colors cursor-pointer"
                                style={{ width: `${(stats.onTime / stats.total) * 100}%` }}
                                title={`Đúng hạn: ${formatCurrency(stats.onTime)} (${((stats.onTime / stats.total) * 100).toFixed(0)}%)`}
                            />
                        )}
                        {stats.dueSoon > 0 && (
                            <button
                                onClick={() => { setAgingFilter(agingFilter === 'due-soon' ? 'all' : 'due-soon'); setCurrentPage(1); }}
                                className="bg-yellow-400 hover:bg-yellow-500 transition-colors cursor-pointer"
                                style={{ width: `${(stats.dueSoon / stats.total) * 100}%` }}
                                title={`Sắp đến hạn: ${formatCurrency(stats.dueSoon)} (${((stats.dueSoon / stats.total) * 100).toFixed(0)}%)`}
                            />
                        )}
                        {stats.overdue > 0 && (
                            <button
                                onClick={() => { setAgingFilter(agingFilter === 'overdue' ? 'all' : 'overdue'); setCurrentPage(1); }}
                                className="bg-red-400 hover:bg-red-500 transition-colors cursor-pointer"
                                style={{ width: `${(stats.overdue / stats.total) * 100}%` }}
                                title={`Quá hạn: ${formatCurrency(stats.overdue)} (${((stats.overdue / stats.total) * 100).toFixed(0)}%)`}
                            />
                        )}
                    </div>
                )}
                {/* Legend row */}
                <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" />Đúng hạn: {formatCurrency(stats.onTime)}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" />Sắp đến hạn: {formatCurrency(stats.dueSoon)}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />Quá hạn: {formatCurrency(stats.overdue)}</span>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <CardTitle className="text-base">
                            Danh sách công nợ phải trả
                            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                                ({filteredData.length} PO)
                            </span>
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative w-full md:w-48">
                                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                                <Input
                                    placeholder="Tìm mã PO, NCC..."
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                    className="pl-9 h-9"
                                />
                            </div>
                            <Select value={agingFilter} onValueChange={(v: AgingFilter) => { setAgingFilter(v); setCurrentPage(1); }}>
                                <SelectTrigger className="w-32 h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {AGING_FILTER_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <PermissionGate module="finance" action="export">
                                <Button variant="outline" size="sm" onClick={() => setExportOpen(true)} className="h-9">
                                    <IconDownload className="h-4 w-4 mr-1" />
                                    Xuất
                                </Button>
                            </PermissionGate>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {!paginatedData || paginatedData.length === 0 ? (
                        <div className="py-12 text-center text-gray-400 dark:text-gray-500">
                            {data?.length === 0
                                ? 'Không có công nợ phải trả'
                                : 'Không tìm thấy kết quả'}
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th
                                                className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-100"
                                                onClick={() => handleSort('po_code')}
                                            >
                                                Mã PO <SortIcon field="po_code" />
                                            </th>
                                            <th
                                                className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-100"
                                                onClick={() => handleSort('supplier_name')}
                                            >
                                                Nhà cung cấp <SortIcon field="supplier_name" />
                                            </th>
                                            <th
                                                className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-100"
                                                onClick={() => handleSort('created_at')}
                                            >
                                                Ngày tạo <SortIcon field="created_at" />
                                            </th>
                                            <th
                                                className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-100"
                                                onClick={() => handleSort('total_amount')}
                                            >
                                                Tổng tiền <SortIcon field="total_amount" />
                                            </th>
                                            <th className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Đã trả</th>
                                            <th
                                                className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-100"
                                                onClick={() => handleSort('balance')}
                                            >
                                                Còn nợ <SortIcon field="balance" />
                                            </th>
                                            <th className="text-center py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Trạng thái</th>
                                            <th className="text-center py-3 px-2 font-medium text-gray-600 dark:text-gray-400 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedData.map((item) => (
                                            <tr
                                                key={item.po_id}
                                                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900 cursor-pointer transition-colors"
                                                onClick={() => handleRowClick(item.po_id)}
                                            >
                                                <td className="py-3 px-2 font-medium text-blue-600">
                                                    {item.po_code}
                                                </td>
                                                <td className="py-3 px-2">{item.supplier_name}</td>
                                                <td className="py-3 px-2 text-gray-600 dark:text-gray-400 tabular-nums">
                                                    {format(parseISO(item.created_at), 'dd/MM/yyyy', { locale: vi })}
                                                </td>
                                                <td className="py-3 px-2 text-right tabular-nums">{formatCurrency(item.total_amount)}</td>
                                                <td className="py-3 px-2 text-right text-green-600 tabular-nums">
                                                    {formatCurrency(item.paid_amount)}
                                                </td>
                                                <td className="py-3 px-2 text-right font-medium text-red-600 tabular-nums">
                                                    {formatCurrency(item.balance)}
                                                </td>
                                                <td className="py-3 px-2 text-center">
                                                    {item.status === 'PAID'
                                                        ? <Badge className="bg-indigo-100 text-indigo-700">Đã thanh toán</Badge>
                                                        : getStatusBadge(item)}
                                                </td>
                                                <td className="py-3 px-2 text-center">
                                                    <IconExternalLink className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination - Sprint 2 Feature */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Trang {currentPage}/{totalPages} ({filteredData.length} kết quả)
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <IconChevronLeft className="h-4 w-4" />
                                        </Button>
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let page = i + 1;
                                            if (totalPages > 5) {
                                                if (currentPage > 3) page = currentPage - 2 + i;
                                                if (currentPage > totalPages - 2) page = totalPages - 4 + i;
                                            }
                                            return (
                                                <Button
                                                    key={page}
                                                    variant={currentPage === page ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setCurrentPage(page)}
                                                    className="w-8"
                                                >
                                                    {page}
                                                </Button>
                                            );
                                        })}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
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

            {/* PO Detail Drawer */}
            <PayableDetailDrawer
                open={!!selectedPoId}
                onOpenChange={(open) => { if (!open) setSelectedPoId(null); }}
                poId={selectedPoId}
            />

            <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                onExport={handleApExport}
                isExporting={isExporting}
                defaultFilename={apExportConfig.filename}
                title="Xuất BC Công nợ phải trả"
            />
        </>
    );
}
