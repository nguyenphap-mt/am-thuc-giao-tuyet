'use client';

import { PermissionGate } from '@/components/shared/PermissionGate';

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
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { IconSearch, IconArrowUp, IconArrowDown, IconDownload, IconChevronLeft, IconChevronRight, IconReceipt, IconArrowUpRight, IconArrowDownRight, IconPlus } from '@tabler/icons-react';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { useReportExport, type ExportFormat, type ExportConfig } from '@/hooks/use-report-export';
import { ExportDialog } from '@/components/analytics/export-dialog';
import type { ReportSheet, KpiCard, ColumnDef } from '@/lib/excel-report-engine';

import { TransactionDetailDrawer } from './transaction-detail-drawer';

interface Transaction {
 id: string;
 code: string;
 type: 'RECEIPT' | 'PAYMENT';
 category: string;
 amount: number;
 payment_method: string;
 description: string;
 reference_type: string | null;
 reference_id: string | null;
 transaction_date: string;
 created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
 REVENUE: 'Doanh thu',
 DEPOSIT: 'Đặt cọc',
 OTHER_INCOME: 'Thu khác',
 NGUYENLIEU: 'Nguyên liệu',
 NHANCONG: 'Nhân công',
 THUEMUON: 'Thuê mướn',
 VANHANH: 'Vận hành',
 LABOR: 'Lao động',
 SALARY: 'Lương',
 OTHER: 'Khác',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
 CASH: 'Tiền mặt',
 BANK: 'Chuyển khoản',
 TRANSFER: 'Chuyển khoản',
 CARD: 'Thẻ',
 EWALLET: 'Ví điện tử',
};

type SortField = 'transaction_date' | 'amount' | 'category' | 'code';
type SortDir = 'asc' | 'desc';

interface TransactionsTableProps {
 onCreateClick?: () => void;
}

const ITEMS_PER_PAGE = 15;

export function TransactionsTable({ onCreateClick }: TransactionsTableProps) {
 const [search, setSearch] = useState('');
 const [typeFilter, setTypeFilter] = useState<string>('all');
 const [categoryFilter, setCategoryFilter] = useState<string>('all');
 const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
 const [exportOpen, setExportOpen] = useState(false);
 const { isExporting, exportData } = useReportExport();
 const [currentPage, setCurrentPage] = useState(1);
 const [sortField, setSortField] = useState<SortField>('transaction_date');
 const [sortDir, setSortDir] = useState<SortDir>('desc');
 const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

 const { data, isLoading, error } = useQuery({
 queryKey: ['finance-transactions'],
 queryFn: async () => {
 const response = await api.get<Transaction[]>('/finance/transactions?limit=500');
 return response;
 },
 });

 // Get unique categories for filter
 const categories = useMemo(() => {
 if (!data) return [];
 const cats = new Set(data.map(t => t.category));
 return Array.from(cats).sort();
 }, [data]);

 // Enhanced filtering with date range and category
 const filteredData = useMemo(() => {
 if (!data) return [];

 return data.filter((item) => {
 // Text search
 const matchesSearch =
 item.code.toLowerCase().includes(search.toLowerCase()) ||
 item.description?.toLowerCase().includes(search.toLowerCase()) ||
 (CATEGORY_LABELS[item.category] || item.category).toLowerCase().includes(search.toLowerCase());

 // Type filter
 const matchesType = typeFilter === 'all' || item.type === typeFilter;

 // Category filter
 const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

 // Date range filter
 let matchesDateRange = true;
 if (dateRange?.from) {
 const txDate = parseISO(item.transaction_date);
 if (dateRange.to) {
 matchesDateRange = isWithinInterval(txDate, {
 start: dateRange.from,
 end: dateRange.to,
 });
 } else {
 matchesDateRange = txDate >= dateRange.from;
 }
 }

 return matchesSearch && matchesType && matchesCategory && matchesDateRange;
 });
 }, [data, search, typeFilter, categoryFilter, dateRange]);

 // Sort data
 const sortedData = useMemo(() => {
 return [...filteredData].sort((a, b) => {
 let cmp = 0;
 switch (sortField) {
 case 'transaction_date':
 cmp = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
 break;
 case 'amount':
 cmp = Number(a.amount) - Number(b.amount);
 break;
 case 'category':
 cmp = (CATEGORY_LABELS[a.category] || a.category).localeCompare(CATEGORY_LABELS[b.category] || b.category);
 break;
 case 'code':
 cmp = a.code.localeCompare(b.code);
 break;
 }
 return sortDir === 'desc' ? -cmp : cmp;
 });
 }, [filteredData, sortField, sortDir]);

 // Pagination
 const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
 const paginatedData = useMemo(() => {
 const start = (currentPage - 1) * ITEMS_PER_PAGE;
 return sortedData.slice(start, start + ITEMS_PER_PAGE);
 }, [sortedData, currentPage]);

 // Calculate totals from filtered data
 const totalReceipts = filteredData.filter(t => t.type === 'RECEIPT').reduce((sum, t) => sum + Number(t.amount || 0), 0);
 const totalPayments = filteredData.filter(t => t.type === 'PAYMENT').reduce((sum, t) => sum + Number(t.amount || 0), 0);
 const netFlow = totalReceipts - totalPayments;
 const totalCount = filteredData.length;

 // Handle sort
 const handleSort = (field: SortField) => {
 if (sortField === field) {
 setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
 } else {
 setSortField(field);
 setSortDir('desc');
 }
 setCurrentPage(1);
 };

 // Sort indicator component
 const SortIndicator = ({ field }: { field: SortField }) => {
 if (sortField !== field) return null;
 return sortDir === 'desc'
 ? <IconArrowDown className="inline h-3 w-3 ml-1" />
 : <IconArrowUp className="inline h-3 w-3 ml-1" />;
 };

 // ========== PROFESSIONAL EXPORT CONFIG ==========
 const colDef = (key: string, header: string, opts: Partial<ColumnDef> = {}): ColumnDef => ({
 key, header, format: 'text', ...opts,
 });

 const txExportConfig = useMemo((): ExportConfig => {
 const kpiCards: KpiCard[] = [
 { label: 'TỔNG THU', value: totalReceipts, format: 'currency', trend: 0, trendLabel: '', bgColor: 'E8F5E9', valueColor: '1B7D3A', icon: '⬆️' },
 { label: 'TỔNG CHI', value: totalPayments, format: 'currency', trend: 0, trendLabel: '', bgColor: 'FFEBEE', valueColor: 'C62828', icon: '⬇️' },
 { label: 'SỐ DƯ', value: netFlow, format: 'currency', trend: 0, trendLabel: netFlow >= 0 ? 'Dương' : 'Âm', bgColor: netFlow >= 0 ? 'E3F2FD' : 'FFF3E0', valueColor: netFlow >= 0 ? '1565C0' : 'E65100', icon: netFlow >= 0 ? '📈' : '📉' },
 { label: 'SỐ GIAO DỊCH', value: totalCount, format: 'number', trend: 0, trendLabel: '', bgColor: 'F3E5F5', valueColor: '7B1FA2', icon: '📝' },
 ];

 const dataRows = sortedData.map(item => ({
 code: item.code,
 type: item.type === 'RECEIPT' ? 'Thu' : 'Chi',
 category: CATEGORY_LABELS[item.category] || item.category,
 amount: Number(item.amount || 0),
 payment_method: PAYMENT_METHOD_LABELS[item.payment_method] || item.payment_method,
 transaction_date: format(parseISO(item.transaction_date), 'dd/MM/yyyy'),
 description: item.description || '',
 }));

 const columns: ColumnDef[] = [
 colDef('code', 'Mã GD', { width: 14 }),
 colDef('type', 'Loại', { width: 8 }),
 colDef('category', 'Danh mục', { width: 16 }),
 colDef('amount', 'Số tiền', { format: 'currency', width: 18 }),
 colDef('payment_method', 'Phương thức', { width: 14 }),
 colDef('transaction_date', 'Ngày', { width: 12 }),
 colDef('description', 'Mô tả', { width: 30 }),
 ];

 const sheets: ReportSheet[] = [{
 name: 'Giao dịch',
 title: 'Báo cáo Giao dịch tài chính',
 subtitle: `Xuất ngày: ${format(new Date(), 'dd/MM/yyyy')}`,
 kpiCards,
 columns,
 data: dataRows,
 summaryRow: true,
 }];

 return {
 title: 'Báo cáo Giao dịch tài chính',
 columns: [
 { key: 'code', header: 'Mã GD' },
 { key: 'type', header: 'Loại' },
 { key: 'category', header: 'Danh mục' },
 { key: 'amount', header: 'Số tiền', format: (v) => formatCurrency(v as number) },
 { key: 'payment_method', header: 'Phương thức' },
 { key: 'transaction_date', header: 'Ngày' },
 { key: 'description', header: 'Mô tả' },
 ],
 data: dataRows,
 filename: `giao-dich-tai-chinh-${format(new Date(), 'yyyy-MM-dd')}`,
 sheets,
 };
 }, [sortedData, totalReceipts, totalPayments, netFlow, totalCount]);

 const handleTxExport = async (fmt: ExportFormat, filename: string) => {
 const config = { ...txExportConfig, filename };
 await exportData(fmt, config);
 };

 if (isLoading) {
 return (
 <div className="space-y-4">
 {/* Skeleton stat cards */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {[1, 2, 3, 4].map(i => (
 <Skeleton key={i} className="h-24 rounded-xl" />
 ))}
 </div>
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-base">Lịch sử giao dịch</CardTitle>
 </CardHeader>
 <CardContent>
 <Skeleton className="h-64 w-full" />
 </CardContent>
 </Card>
 </div>
 );
 }

 if (error) {
 return (
 <Card>
 <CardContent className="py-12 text-center text-gray-500 dark:text-gray-400">
 Không thể tải dữ liệu giao dịch
 </CardContent>
 </Card>
 );
 }

 return (
 <div className="space-y-4">
 {/* Compact Flow Summary Bar */}
 <div className="border rounded-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 p-3">
 {/* Top row: net balance + inline stats */}
 <div className="flex items-center justify-between mb-2.5">
 <div className="text-left">
 <span className="text-xs text-gray-500 dark:text-gray-400">Số dư ròng</span>
 <span className={`ml-2 text-base font-bold tabular-nums ${netFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
 {formatCurrency(Math.abs(netFlow))}
 </span>
 <span className={`ml-1.5 text-xs ${netFlow >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
 {netFlow >= 0 ? '▲ Dương' : '▼ Âm'}
 </span>
 </div>
 <div className="flex items-center gap-3 text-xs">
 <button
 onClick={() => { setTypeFilter(typeFilter === 'RECEIPT' ? 'all' : 'RECEIPT'); setCurrentPage(1); }}
 className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-pointer transition-all ${typeFilter === 'RECEIPT' ? 'bg-green-100 text-green-700 ring-1 ring-green-300' : 'text-gray-500 hover:bg-green-50 hover:text-green-600'}`}
 >
 <IconArrowUpRight className="h-3.5 w-3.5" />
 <span className="font-medium tabular-nums">{formatCurrency(totalReceipts)}</span>
 </button>
 <button
 onClick={() => { setTypeFilter(typeFilter === 'PAYMENT' ? 'all' : 'PAYMENT'); setCurrentPage(1); }}
 className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-pointer transition-all ${typeFilter === 'PAYMENT' ? 'bg-red-100 text-red-700 ring-1 ring-red-300' : 'text-gray-500 hover:bg-red-50 hover:text-red-600'}`}
 >
 <IconArrowDownRight className="h-3.5 w-3.5" />
 <span className="font-medium tabular-nums">{formatCurrency(totalPayments)}</span>
 </button>
 <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
 <IconReceipt className="h-3.5 w-3.5" />
 <span className="font-medium tabular-nums">{totalCount}</span>
 </span>
 </div>
 </div>
 {/* Thu/Chi ratio bar */}
 {(totalReceipts + totalPayments) > 0 && (
 <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
 {totalReceipts > 0 && (
 <button
 onClick={() => { setTypeFilter(typeFilter === 'RECEIPT' ? 'all' : 'RECEIPT'); setCurrentPage(1); }}
 className="bg-green-400 hover:bg-green-500 transition-colors cursor-pointer"
 style={{ width: `${(totalReceipts / (totalReceipts + totalPayments)) * 100}%` }}
 title={`Thu: ${formatCurrency(totalReceipts)} (${((totalReceipts / (totalReceipts + totalPayments)) * 100).toFixed(0)}%)`}
 />
 )}
 {totalPayments > 0 && (
 <button
 onClick={() => { setTypeFilter(typeFilter === 'PAYMENT' ? 'all' : 'PAYMENT'); setCurrentPage(1); }}
 className="bg-red-400 hover:bg-red-500 transition-colors cursor-pointer"
 style={{ width: `${(totalPayments / (totalReceipts + totalPayments)) * 100}%` }}
 title={`Chi: ${formatCurrency(totalPayments)} (${((totalPayments / (totalReceipts + totalPayments)) * 100).toFixed(0)}%)`}
 />
 )}
 </div>
 )}
 {/* Legend row */}
 <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500 dark:text-gray-400">
 <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" />Thu: {formatCurrency(totalReceipts)}</span>
 <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />Chi: {formatCurrency(totalPayments)}</span>
 <span className="ml-auto">{totalCount} giao dịch</span>
 </div>
 </div>

 {/* Table Card */}
 <Card>
 <CardHeader className="pb-2">
 <div className="flex flex-col gap-3">
 {/* Header Row */}
 <div className="flex items-center justify-between">
 <CardTitle className="text-base">Lịch sử giao dịch</CardTitle>
 <div className="flex items-center gap-2">
 {/* Export Button */}
 <PermissionGate module="finance" action="export">
 <Button variant="outline" size="sm" disabled={isExporting} onClick={() => setExportOpen(true)}>
 <IconDownload className="h-4 w-4 mr-1" />
 Xuất
 </Button>
 </PermissionGate>

 <PermissionGate module="finance" action="create">
 {onCreateClick && (
 <Button size="sm" onClick={onCreateClick}>
 <IconPlus className="h-4 w-4 mr-1" />
 Tạo giao dịch
 </Button>
 )}
 </PermissionGate>
 </div>
 </div>

 {/* Filters */}
 <div className="flex flex-col md:flex-row gap-2">
 <div className="relative flex-1">
 <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
 <Input
 placeholder="Tìm mã, mô tả, danh mục..."
 value={search}
 onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
 className="pl-9"
 />
 </div>
 <DateRangePicker
 value={dateRange}
 onChange={(v) => { setDateRange(v); setCurrentPage(1); }}
 className="w-full md:w-auto"
 />
 <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
 <SelectTrigger className="w-full md:w-28">
 <SelectValue placeholder="Loại" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">Tất cả</SelectItem>
 <SelectItem value="RECEIPT">Thu</SelectItem>
 <SelectItem value="PAYMENT">Chi</SelectItem>
 </SelectContent>
 </Select>
 <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
 <SelectTrigger className="w-full md:w-36">
 <SelectValue placeholder="Danh mục" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">Tất cả danh mục</SelectItem>
 {categories.map(cat => (
 <SelectItem key={cat} value={cat}>
 {CATEGORY_LABELS[cat] || cat}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 </CardHeader>
 <CardContent>
 {paginatedData.length === 0 ? (
 <div className="py-12 text-center text-gray-400 dark:text-gray-500">
 {data?.length === 0
 ? 'Chưa có giao dịch nào'
 : 'Không tìm thấy kết quả'}
 </div>
 ) : (
 <>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-gray-200 dark:border-gray-700">
 <th
 className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900"
 onClick={() => handleSort('code')}
 >
 Mã <SortIndicator field="code" />
 </th>
 <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Loại</th>
 <th
 className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900"
 onClick={() => handleSort('category')}
 >
 Danh mục <SortIndicator field="category" />
 </th>
 <th
 className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900"
 onClick={() => handleSort('amount')}
 >
 Số tiền <SortIndicator field="amount" />
 </th>
 <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Phương thức</th>
 <th
 className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900"
 onClick={() => handleSort('transaction_date')}
 >
 Ngày <SortIndicator field="transaction_date" />
 </th>
 <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Mô tả</th>
 </tr>
 </thead>
 <tbody>
 {paginatedData.map((item) => (
 <tr
 key={item.id}
 className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900 transition-colors cursor-pointer"
 onClick={() => setSelectedTransaction(item)}
 >
 <td className="py-3 px-2 font-medium text-gray-900 dark:text-gray-100 font-mono text-xs tabular-nums">
 {item.code}
 </td>
 <td className="py-3 px-2">
 {item.type === 'RECEIPT' ? (
 <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
 <IconArrowUpRight className="h-3 w-3 mr-1" />
 Thu
 </Badge>
 ) : (
 <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
 <IconArrowDownRight className="h-3 w-3 mr-1" />
 Chi
 </Badge>
 )}
 </td>
 <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
 {CATEGORY_LABELS[item.category] || item.category}
 </td>
 <td className={`py-3 px-2 text-right font-medium tabular-nums ${item.type === 'RECEIPT' ? 'text-green-600' : 'text-red-600'
 }`}>
 {item.type === 'RECEIPT' ? '+' : '-'}{formatCurrency(item.amount)}
 </td>
 <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
 {PAYMENT_METHOD_LABELS[item.payment_method] || item.payment_method}
 </td>
 <td className="py-3 px-2 text-gray-600 dark:text-gray-400 tabular-nums">
 {format(parseISO(item.transaction_date), 'dd/MM/yyyy', { locale: vi })}
 </td>
 <td className="py-3 px-2 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
 {item.description || '-'}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 {totalPages > 1 && (
 <div className="flex items-center justify-between mt-4 pt-4 border-t">
 <p className="text-sm text-gray-500 dark:text-gray-400">
 Trang {currentPage} / {totalPages} • {sortedData.length} giao dịch
 </p>
 <div className="flex items-center gap-1">
 <Button
 variant="outline"
 size="sm"
 disabled={currentPage === 1}
 onClick={() => setCurrentPage(p => p - 1)}
 >
 <IconChevronLeft className="h-4 w-4" />
 </Button>
 {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
 let page: number;
 if (totalPages <= 5) {
 page = i + 1;
 } else if (currentPage <= 3) {
 page = i + 1;
 } else if (currentPage >= totalPages - 2) {
 page = totalPages - 4 + i;
 } else {
 page = currentPage - 2 + i;
 }
 return (
 <Button
 key={page}
 variant={currentPage === page ? 'default' : 'outline'}
 size="sm"
 className="w-8"
 onClick={() => setCurrentPage(page)}
 >
 {page}
 </Button>
 );
 })}
 <Button
 variant="outline"
 size="sm"
 disabled={currentPage === totalPages}
 onClick={() => setCurrentPage(p => p + 1)}
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
 {/* Transaction Detail Drawer */}
 <TransactionDetailDrawer
 open={!!selectedTransaction}
 onOpenChange={(open) => { if (!open) setSelectedTransaction(null); }}
 transaction={selectedTransaction}
 />
 <ExportDialog
 open={exportOpen}
 onOpenChange={setExportOpen}
 onExport={handleTxExport}
 isExporting={isExporting}
 defaultFilename={txExportConfig.filename}
 title="Xuất BC Giao dịch"
 />
 </div>
 );
}
