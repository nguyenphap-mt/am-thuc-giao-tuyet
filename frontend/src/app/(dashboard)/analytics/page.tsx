'use client';

import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
    IconChartBar, IconShoppingCart, IconPackage, IconTruck,
    IconCash, IconUsers, IconDownload,
} from '@tabler/icons-react';
import { Suspense, useRef, useState, useMemo, useCallback } from 'react';
import { useTabPersistence } from '@/hooks/useTabPersistence';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportDialog } from '@/components/analytics/export-dialog';
import { useReportExport, type ExportFormat, type ExportConfig, type ExportColumn } from '@/hooks/use-report-export';
import type { ReportSheet, ColumnDef, KpiCard } from '@/lib/excel-report-engine';
import {
    useAnalyticsOverview, useSalesReport, useInventoryReport,
    useProcurementReport, useHRReport,
} from '@/hooks/use-analytics';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';

// Lazy load report components for code-splitting
import { ReportsOverview } from './components/reports-overview';
import { SalesReports } from './components/sales-reports';
import { InventoryReports } from './components/inventory-reports';
import { ProcurementReports } from './components/procurement-reports';
import { HRReports } from './components/hr-reports';

// Re-use existing Finance report components
import { BalanceSheetReport } from '../finance/components/balance-sheet-report';
import { ProfitLossReport } from '../finance/components/profit-loss-report';
import { CashFlowReport } from '../finance/components/cashflow-report';
import { PeriodClosingManager } from '../finance/components/period-closing-manager';

function LoadingSkeleton() {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
            </div>
            <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>
    );
}

// ============ EXPORT COLUMN CONFIGS ============

const overviewColumns: ExportColumn[] = [
    { key: 'metric', header: 'Chỉ số' },
    { key: 'value', header: 'Giá trị' },
    { key: 'trend', header: 'Xu hướng (%)' },
];

const salesColumns: ExportColumn[] = [
    { key: 'period', header: 'Kỳ' },
    { key: 'revenue', header: 'Doanh thu (₫)', format: (v) => formatCurrency(v as number) },
    { key: 'orders_count', header: 'Số đơn hàng' },
    { key: 'expenses', header: 'Chi phí (₫)', format: (v) => formatCurrency(v as number) },
    { key: 'profit', header: 'Lợi nhuận (₫)', format: (v) => formatCurrency(v as number) },
];

const salesCustomerColumns: ExportColumn[] = [
    { key: 'customer_name', header: 'Khách hàng' },
    { key: 'total_revenue', header: 'Doanh thu (₫)', format: (v) => formatCurrency(v as number) },
    { key: 'orders_count', header: 'Số đơn hàng' },
];

const inventoryColumns: ExportColumn[] = [
    { key: 'period', header: 'Kỳ' },
    { key: 'imports_value', header: 'Giá trị nhập (₫)', format: (v) => formatCurrency(v as number) },
    { key: 'exports_value', header: 'Giá trị xuất (₫)', format: (v) => formatCurrency(v as number) },
    { key: 'net_value', header: 'Biến động ròng (₫)', format: (v) => formatCurrency(v as number) },
];

const inventoryItemColumns: ExportColumn[] = [
    { key: 'item_name', header: 'Nguyên liệu' },
    { key: 'quantity_used', header: 'Số lượng tiêu thụ' },
    { key: 'unit', header: 'Đơn vị' },
];

const procurementColumns: ExportColumn[] = [
    { key: 'supplier_name', header: 'Nhà cung cấp' },
    { key: 'total_spend', header: 'Tổng chi tiêu (₫)', format: (v) => formatCurrency(v as number) },
    { key: 'po_count', header: 'Số PO' },
];

const hrColumns: ExportColumn[] = [
    { key: 'department', header: 'Phòng ban' },
    { key: 'count', header: 'Số nhân viên' },
];

const TAB_LABELS: Record<string, string> = {
    overview: 'Tổng quan',
    sales: 'Doanh thu',
    inventory: 'Kho hàng',
    procurement: 'Mua hàng',
    finance: 'Tài chính',
    hr: 'Nhân sự',
};

const ANALYTICS_TABS = ['overview', 'sales', 'inventory', 'procurement', 'finance', 'hr'] as const;

export default function AnalyticsPage() {
    const { activeTab, handleTabChange } = useTabPersistence(ANALYTICS_TABS, 'overview');
    const [exportOpen, setExportOpen] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const reportRef = useRef<HTMLDivElement>(null);
    const { isExporting, exportData } = useReportExport();

    // Date range params for API calls
    const dateParams = useMemo(() => {
        if (!dateRange?.from) return {};
        return {
            from_date: format(dateRange.from, 'yyyy-MM-dd'),
            to_date: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd'),
        };
    }, [dateRange]);

    // Fetch data for export (all tabs use cache)
    const { data: overviewData } = useAnalyticsOverview(dateParams);
    const { data: salesData } = useSalesReport({ group_by: 'month', ...dateParams });
    const { data: inventoryData } = useInventoryReport(dateParams);
    const { data: procurementData } = useProcurementReport(dateParams);
    const { data: hrData } = useHRReport(dateParams);

    // Drill-down from KPI cards → switch tab via URL
    const handleDrillDown = useCallback((tab: string) => {
        handleTabChange(tab);
    }, [handleTabChange]);

    // Build export config dynamically based on active tab
    const dateRangeLabel = useMemo(() => {
        if (dateRange?.from) {
            const from = format(dateRange.from, 'dd/MM/yyyy');
            const to = dateRange.to ? format(dateRange.to, 'dd/MM/yyyy') : from;
            return `${from} — ${to}`;
        }
        return undefined;
    }, [dateRange]);

    const exportConfig = useMemo((): ExportConfig => {
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

        // Helper: build ColumnDef[] for professional sheets
        const col = (key: string, header: string, opts: Partial<ColumnDef> = {}): ColumnDef => ({
            key, header, format: 'text', ...opts,
        });

        switch (activeTab) {
            case 'overview': {
                // Build KPI cards from overview data
                const kpiCards: KpiCard[] = overviewData ? [
                    {
                        label: 'DOANH THU',
                        value: overviewData.revenue_month ?? 0,
                        format: 'currency',
                        trend: overviewData.revenue_trend ?? 0,
                        trendLabel: 'so với tháng trước',
                        bgColor: 'E8F5E9',
                        valueColor: '1B7D3A',
                        icon: '💰',
                    },
                    {
                        label: 'CHI PHÍ',
                        value: overviewData.expenses_month ?? 0,
                        format: 'currency',
                        trend: overviewData.expenses_trend ?? 0,
                        trendLabel: 'so với tháng trước',
                        bgColor: 'FCE4EC',
                        valueColor: 'C62828',
                        icon: '📊',
                    },
                    {
                        label: 'LỢI NHUẬN',
                        value: overviewData.profit_month ?? 0,
                        format: 'currency',
                        trend: overviewData.profit_margin ?? 0,
                        trendLabel: 'so với tháng trước',
                        bgColor: 'F3E5F5',
                        valueColor: '7B1FA2',
                        icon: '📈',
                    },
                    {
                        label: 'ĐƠN HÀNG',
                        value: overviewData.orders_month ?? 0,
                        format: 'number',
                        trend: overviewData.orders_trend ?? 0,
                        trendLabel: 'so với tháng trước',
                        bgColor: 'E3F2FD',
                        valueColor: '1565C0',
                        icon: '🧾',
                    },
                ] : [];

                // Build overview data with status column
                const overviewRows = overviewData ? [
                    { metric: 'Tổng Doanh Thu', value: overviewData.revenue_month, trend: overviewData.revenue_trend, status: (overviewData.revenue_trend ?? 0) > 10 ? 'Xuất sắc' : (overviewData.revenue_trend ?? 0) > 0 ? 'Tốt' : 'Cần theo dõi' },
                    { metric: 'Chi phí tháng', value: overviewData.expenses_month, trend: overviewData.expenses_trend, status: (overviewData.expenses_trend ?? 0) < 5 ? 'Tốt' : 'Cần theo dõi', _isSectionHeader: false },
                    { metric: 'Lợi nhuận', value: overviewData.profit_month, trend: overviewData.profit_margin, status: (overviewData.profit_margin ?? 0) > 15 ? 'Xuất sắc' : (overviewData.profit_margin ?? 0) > 0 ? 'Tốt' : 'Cần theo dõi' },
                    { metric: 'Đơn hàng tháng', value: overviewData.orders_month, trend: overviewData.orders_trend, status: (overviewData.orders_trend ?? 0) > 0 ? 'Tốt' : 'Ổn định', _format_value: 'number' },
                    { metric: 'Giá trị tồn kho', value: overviewData.inventory_value, trend: 0, status: 'Ổn định' },
                    { metric: 'Công nợ phải thu', value: overviewData.receivables_total, trend: 0, status: (overviewData.receivables_total ?? 0) > 0 ? 'Cần theo dõi' : 'Tốt' },
                    { metric: 'Khách hàng', value: overviewData.customers_total, trend: 0, status: 'Tốt', _format_value: 'number' },
                    { metric: 'Nhân viên', value: overviewData.employees_active, trend: 0, status: 'Ổn định', _format_value: 'number' },
                ] : [];

                const sheets: ReportSheet[] = [{
                    name: 'Tổng quan KPI',
                    title: 'Báo cáo Tổng quan Kinh doanh',
                    subtitle: dateRangeLabel,
                    kpiCards,
                    columns: [
                        col('metric', 'Chỉ số', { width: 25 }),
                        col('value', 'Giá trị', { format: 'currency', width: 22 }),
                        col('trend', 'Xu hướng (%)', { format: 'percent', width: 16 }),
                        col('status', 'Trạng thái', { format: 'status', width: 18 }),
                    ],
                    data: overviewRows,
                    summaryRow: false,
                }];
                return {
                    title: 'Báo cáo Tổng quan',
                    columns: overviewColumns,
                    data: sheets[0].data,
                    filename: `bao-cao-tong-quan_${today}`,
                    sheets,
                    dateRange: dateRangeLabel,
                };
            }

            case 'sales': {
                const periodRows = salesData?.revenue_by_period?.map(p => ({
                    period: p.period,
                    revenue: p.revenue,
                    orders_count: p.orders_count,
                    expenses: p.expenses,
                    profit: p.profit,
                })) || [];

                const customerRows = salesData?.top_customers?.map(c => ({
                    customer_name: c.customer_name,
                    total_revenue: c.total_revenue,
                    orders_count: c.orders_count,
                })) || [];

                const sheets: ReportSheet[] = [
                    {
                        name: 'Doanh thu theo kỳ',
                        title: 'Báo cáo Doanh thu theo Kỳ',
                        subtitle: dateRangeLabel,
                        columns: [
                            col('period', 'Kỳ', { width: 14 }),
                            col('revenue', 'Doanh thu', { format: 'currency', width: 22, summaryFn: 'sum' }),
                            col('orders_count', 'Số đơn hàng', { format: 'number', width: 14, summaryFn: 'sum' }),
                            col('expenses', 'Chi phí', { format: 'currency', width: 22, summaryFn: 'sum' }),
                            col('profit', 'Lợi nhuận', { format: 'currency', width: 22, summaryFn: 'sum' }),
                        ],
                        data: periodRows,
                        summaryRow: true,
                    },
                    ...(customerRows.length > 0 ? [{
                        name: 'Top Khách hàng',
                        title: 'Top Khách hàng theo Doanh thu',
                        subtitle: dateRangeLabel,
                        columns: [
                            col('customer_name', 'Khách hàng', { width: 30 }),
                            col('total_revenue', 'Doanh thu', { format: 'currency' as const, width: 22, summaryFn: 'sum' as const }),
                            col('orders_count', 'Số đơn', { format: 'number' as const, width: 12, summaryFn: 'sum' as const }),
                        ],
                        data: customerRows,
                        summaryRow: true,
                    }] : []),
                ];

                return {
                    title: 'Báo cáo Doanh thu',
                    columns: salesColumns,
                    data: periodRows,
                    filename: `bao-cao-doanh-thu_${today}`,
                    sheets,
                    dateRange: dateRangeLabel,
                };
            }

            case 'inventory': {
                const movementRows = inventoryData?.movements?.map(m => ({
                    period: m.period,
                    imports_value: m.imports_value,
                    exports_value: m.exports_value,
                    net_value: m.net_value,
                })) || [];

                const topItems = inventoryData?.top_consumed?.map(item => ({
                    item_name: item.item_name,
                    quantity_used: item.quantity_used,
                    unit: item.unit,
                })) || [];

                const sheets: ReportSheet[] = [
                    {
                        name: 'Biến động Nhập-Xuất',
                        title: 'Báo cáo Biến động Kho',
                        subtitle: dateRangeLabel,
                        columns: [
                            col('period', 'Kỳ', { width: 14 }),
                            col('imports_value', 'Giá trị nhập', { format: 'currency', width: 22, summaryFn: 'sum' }),
                            col('exports_value', 'Giá trị xuất', { format: 'currency', width: 22, summaryFn: 'sum' }),
                            col('net_value', 'Biến động ròng', { format: 'currency', width: 22, summaryFn: 'sum' }),
                        ],
                        data: movementRows,
                        summaryRow: true,
                    },
                    ...(topItems.length > 0 ? [{
                        name: 'Top Nguyên liệu',
                        title: 'Top Nguyên liệu Tiêu thụ',
                        subtitle: dateRangeLabel,
                        columns: [
                            col('item_name', 'Nguyên liệu', { width: 30 }),
                            col('quantity_used', 'Số lượng', { format: 'number' as const, width: 16, summaryFn: 'sum' as const }),
                            col('unit', 'Đơn vị', { width: 12 }),
                        ],
                        data: topItems,
                        summaryRow: false,
                    }] : []),
                ];

                return {
                    title: 'Báo cáo Kho hàng',
                    columns: inventoryColumns,
                    data: movementRows,
                    filename: `bao-cao-kho-hang_${today}`,
                    sheets,
                    dateRange: dateRangeLabel,
                };
            }

            case 'procurement': {
                const supplierRows = procurementData?.top_suppliers?.map(s => ({
                    supplier_name: s.supplier_name,
                    total_spend: s.total_spend,
                    po_count: s.po_count,
                })) || [];

                const sheets: ReportSheet[] = [{
                    name: 'Top Nhà cung cấp',
                    title: 'Báo cáo Mua hàng — Top Nhà cung cấp',
                    subtitle: dateRangeLabel,
                    columns: [
                        col('supplier_name', 'Nhà cung cấp', { width: 30 }),
                        col('total_spend', 'Tổng chi tiêu', { format: 'currency', width: 22, summaryFn: 'sum' }),
                        col('po_count', 'Số PO', { format: 'number', width: 12, summaryFn: 'sum' }),
                    ],
                    data: supplierRows,
                    summaryRow: true,
                }];

                return {
                    title: 'Báo cáo Mua hàng',
                    columns: procurementColumns,
                    data: supplierRows,
                    filename: `bao-cao-mua-hang_${today}`,
                    sheets,
                    dateRange: dateRangeLabel,
                };
            }

            case 'hr': {
                const deptRows = hrData?.department_headcount?.map(d => ({
                    department: d.department || 'Không xác định',
                    count: d.count,
                })) || [];

                const sheets: ReportSheet[] = [{
                    name: 'Phân bố nhân sự',
                    title: 'Báo cáo Nhân sự — Phân bố theo Phòng ban',
                    subtitle: dateRangeLabel,
                    columns: [
                        col('department', 'Phòng ban', { width: 30 }),
                        col('count', 'Số nhân viên', { format: 'number', width: 16, summaryFn: 'sum' }),
                    ],
                    data: deptRows,
                    summaryRow: true,
                }];

                return {
                    title: 'Báo cáo Nhân sự',
                    columns: hrColumns,
                    data: deptRows,
                    filename: `bao-cao-nhan-su_${today}`,
                    sheets,
                    dateRange: dateRangeLabel,
                };
            }

            case 'finance': {
                const noteData = [{ note: 'Vui lòng sử dụng tính năng xuất riêng trong từng báo cáo tài chính (Bảng cân đối, Lãi/Lỗ, Dòng tiền).' }];
                return {
                    title: 'Báo cáo Tài chính',
                    columns: [
                        { key: 'note', header: 'Ghi chú' },
                    ],
                    data: noteData,
                    filename: `bao-cao-tai-chinh_${today}`,
                };
            }

            default:
                return {
                    title: 'Báo cáo',
                    columns: [],
                    data: [],
                    filename: `bao-cao_${today}`,
                };
        }
    }, [activeTab, overviewData, salesData, inventoryData, procurementData, hrData, dateRangeLabel]);

    const handleExport = async (format: ExportFormat, filename: string) => {
        const config = { ...exportConfig, filename };
        await exportData(format, config, reportRef.current);
    };

    return (
        <div className="space-y-4">
            {/* Header with Date Range Picker + Export Button */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between flex-wrap gap-2"
            >
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Báo cáo & Phân tích</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Tổng hợp dữ liệu toàn hệ thống</p>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangePicker
                        value={dateRange}
                        onChange={setDateRange}
                        className="h-9 text-xs md:text-sm"
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExportOpen(true)}
                        className="gap-1.5 border-gray-300 dark:border-gray-600 hover:border-[#c2185b] hover:text-[#c2185b] transition-colors"
                    >
                        <IconDownload className="h-4 w-4" />
                        <span className="hidden sm:inline">Xuất báo cáo</span>
                    </Button>
                </div>
            </motion.div>

            {/* Tabs */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Tabs
                    value={activeTab}
                    onValueChange={handleTabChange}
                    className="space-y-4"
                >
                    <TabsList className="w-full md:w-auto flex overflow-x-auto">
                        <TabsTrigger value="overview" className="text-xs md:text-sm gap-1">
                            <IconChartBar className="h-4 w-4" />
                            Tổng quan
                        </TabsTrigger>
                        <TabsTrigger value="sales" className="text-xs md:text-sm gap-1">
                            <IconShoppingCart className="h-4 w-4" />
                            Doanh thu
                        </TabsTrigger>
                        <TabsTrigger value="inventory" className="text-xs md:text-sm gap-1">
                            <IconPackage className="h-4 w-4" />
                            Kho hàng
                        </TabsTrigger>
                        <TabsTrigger value="procurement" className="text-xs md:text-sm gap-1">
                            <IconTruck className="h-4 w-4" />
                            Mua hàng
                        </TabsTrigger>
                        <TabsTrigger value="finance" className="text-xs md:text-sm gap-1">
                            <IconCash className="h-4 w-4" />
                            Tài chính
                        </TabsTrigger>
                        <TabsTrigger value="hr" className="text-xs md:text-sm gap-1">
                            <IconUsers className="h-4 w-4" />
                            Nhân sự
                        </TabsTrigger>
                    </TabsList>

                    {/* Wrap tab content in ref for PDF export */}
                    <div ref={reportRef}>
                        {/* Tab 1: Overview */}
                        <TabsContent value="overview">
                            <Suspense fallback={<LoadingSkeleton />}>
                                <ReportsOverview onTabChange={handleDrillDown} dateParams={dateParams} />
                            </Suspense>
                        </TabsContent>

                        {/* Tab 2: Sales */}
                        <TabsContent value="sales">
                            <Suspense fallback={<LoadingSkeleton />}>
                                <SalesReports />
                            </Suspense>
                        </TabsContent>

                        {/* Tab 3: Inventory */}
                        <TabsContent value="inventory">
                            <Suspense fallback={<LoadingSkeleton />}>
                                <InventoryReports />
                            </Suspense>
                        </TabsContent>

                        {/* Tab 4: Procurement */}
                        <TabsContent value="procurement">
                            <Suspense fallback={<LoadingSkeleton />}>
                                <ProcurementReports />
                            </Suspense>
                        </TabsContent>

                        {/* Tab 5: Finance — Re-use existing components */}
                        <TabsContent value="finance" className="space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <BalanceSheetReport />
                                <ProfitLossReport />
                                <CashFlowReport />
                                <PeriodClosingManager />
                            </div>
                        </TabsContent>

                        {/* Tab 6: HR */}
                        <TabsContent value="hr">
                            <Suspense fallback={<LoadingSkeleton />}>
                                <HRReports />
                            </Suspense>
                        </TabsContent>
                    </div>
                </Tabs>
            </motion.div>

            {/* Export Dialog */}
            <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                onExport={handleExport}
                defaultFilename={exportConfig.filename}
                title={`Xuất ${TAB_LABELS[activeTab] || 'báo cáo'}`}
                isExporting={isExporting}
            />
        </div>
    );
}
