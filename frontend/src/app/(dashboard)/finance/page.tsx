'use client';

import { useState, useMemo } from 'react';
import { useTabPersistence } from '@/hooks/useTabPersistence';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useReportExport, type ExportFormat, type ExportConfig } from '@/hooks/use-report-export';
import { ExportDialog } from '@/components/analytics/export-dialog';
import type { ReportSheet, KpiCard, ColumnDef } from '@/lib/excel-report-engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { IconCash, IconTrendingUp, IconTrendingDown, IconWallet, IconAlertTriangle, IconDownload } from '@tabler/icons-react';
import { SparklineKpiCard, type SparklineDataPoint } from './components/sparkline-kpi-card';
import { PermissionGate } from '@/components/shared/PermissionGate';

// Import all components
import { MonthlyStatsChart } from './components/monthly-stats-chart';
import { ExpensesCategoryChart } from './components/expenses-category-chart';
import { ReceivablesAlerts } from './components/receivables-alerts';
import { ReceivablesTable } from './components/receivables-table';
import { AgingDistributionChart } from './components/aging-distribution-chart';
import { PayablesTable } from './components/payables-table';
import { PaymentSchedule } from './components/payment-schedule';
import { TransactionsTable } from './components/transactions-table';
import { CreateTransactionModal } from './components/create-transaction-modal';
import { BalanceSheetReport } from './components/balance-sheet-report';
import { PeriodClosingManager } from './components/period-closing-manager';
import { ProfitLossReport } from './components/profit-loss-report';
import { CashFlowReport } from './components/cashflow-report';
import { PeriodSelector, DateRange } from './components/period-selector';
import { IconReportMoney } from '@tabler/icons-react';
import { startOfMonth, endOfMonth } from 'date-fns';

// R2: Receivables Alert interface
interface ReceivablesAlertSummary {
    total_overdue: number;
    total_amount: number;
    high_priority_count: number;
}

const FINANCE_TABS = ['overview', 'receivables', 'payables', 'transactions', 'reports'] as const;

export default function FinancePage() {
    const { activeTab, handleTabChange } = useTabPersistence(FINANCE_TABS, 'overview');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const { isExporting, exportData } = useReportExport();
    const [dateRange, setDateRange] = useState<DateRange>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    const { data: stats, isLoading } = useQuery({
        queryKey: ['finance-stats'],
        queryFn: async () => {
            // Backend uses /finance/dashboard with nested response structure
            const response = await api.get<{
                revenue: { current_month: number; previous_month?: number };
                expenses: { current_month: number; previous_month?: number };
                profit: { current_month: number; margin_percent: number; previous_month?: number };
                receivables: { total: number; previous_month?: number };
            }>('/finance/dashboard');

            // Calculate trends
            const calcTrend = (current: number, previous?: number) => {
                if (!previous || previous === 0) return 0;
                return ((current - previous) / previous) * 100;
            };

            return {
                total_revenue: response.revenue?.current_month || 0,
                revenue_trend: calcTrend(response.revenue?.current_month, response.revenue?.previous_month),
                total_expenses: response.expenses?.current_month || 0,
                expenses_trend: calcTrend(response.expenses?.current_month, response.expenses?.previous_month),
                net_profit: response.profit?.current_month || 0,
                profit_trend: calcTrend(response.profit?.current_month, response.profit?.previous_month),
                cash_balance: response.receivables?.total || 0,
                receivables_trend: calcTrend(response.receivables?.total, response.receivables?.previous_month),
            };
        },
    });

    // R2: Fetch receivables alerts
    const { data: alerts } = useQuery({
        queryKey: ['receivables-alerts'],
        queryFn: () => api.get<ReceivablesAlertSummary>('/finance/receivables/alerts?days_threshold=7'),
    });

    // Sparkline data: 6 months of revenue & profit for primary KPI cards
    const { data: sparklineRaw } = useQuery({
        queryKey: ['finance-sparkline'],
        queryFn: () => api.get<{ month: string; revenue: number; expenses: number; profit: number }[]>('/finance/stats/monthly?months=6'),
    });

    const revenueSparkline: SparklineDataPoint[] = useMemo(
        () => (sparklineRaw || []).map(d => ({ month: d.month, value: d.revenue })),
        [sparklineRaw]
    );
    const profitSparkline: SparklineDataPoint[] = useMemo(
        () => (sparklineRaw || []).map(d => ({ month: d.month, value: d.profit })),
        [sparklineRaw]
    );

    // ========== PROFESSIONAL EXPORT CONFIG ==========
    const colDef = (key: string, header: string, opts: Partial<ColumnDef> = {}): ColumnDef => ({
        key, header, format: 'text', ...opts,
    });

    const financeExportConfig = useMemo((): ExportConfig => {
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

        const kpiCards: KpiCard[] = [
            { label: 'DOANH THU', value: stats?.total_revenue || 0, format: 'currency', trend: stats?.revenue_trend || 0, trendLabel: 'vs tháng trước', bgColor: 'E8F5E9', valueColor: '1B7D3A', icon: '💵' },
            { label: 'CHI PHÍ', value: stats?.total_expenses || 0, format: 'currency', trend: stats?.expenses_trend || 0, trendLabel: 'vs tháng trước', bgColor: 'FFEBEE', valueColor: 'C62828', icon: '📉' },
            { label: 'LỢI NHUẬN', value: stats?.net_profit || 0, format: 'currency', trend: stats?.profit_trend || 0, trendLabel: 'vs tháng trước', bgColor: 'E3F2FD', valueColor: '1565C0', icon: '📈' },
            { label: 'CÔNG NỢ', value: stats?.cash_balance || 0, format: 'currency', trend: 0, trendLabel: '', bgColor: 'F3E5F5', valueColor: '7B1FA2', icon: '💳' },
        ];

        const dataRows = [
            { metric: 'Doanh thu tháng hiện tại', value: stats?.total_revenue || 0, trend: stats?.revenue_trend || 0, category: 'Thu nhập' },
            { metric: 'Chi phí tháng hiện tại', value: stats?.total_expenses || 0, trend: stats?.expenses_trend || 0, category: 'Chi phí' },
            { metric: 'Lợi nhuận ròng', value: stats?.net_profit || 0, trend: stats?.profit_trend || 0, category: 'Lợi nhuận' },
            { metric: 'Tổng công nợ', value: stats?.cash_balance || 0, trend: stats?.receivables_trend || 0, category: 'Công nợ' },
        ];

        const sheets: ReportSheet[] = [{
            name: 'Tổng quan tài chính',
            title: 'Báo cáo Tổng quan Tài chính',
            subtitle: `Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}`,
            kpiCards,
            columns: [
                colDef('metric', 'Chỉ số', { width: 28 }),
                colDef('category', 'Phân loại', { width: 14 }),
                colDef('value', 'Giá trị', { format: 'currency', width: 22 }),
                colDef('trend', 'Xu hướng (%)', { format: 'number', width: 16, alignment: 'center' }),
            ],
            data: dataRows,
            summaryRow: false,
        }];

        return {
            title: 'Báo cáo Tài chính',
            columns: [
                { key: 'metric', header: 'Chỉ số' },
                { key: 'category', header: 'Phân loại' },
                { key: 'value', header: 'Giá trị', format: (v) => formatCurrency(v as number) },
                { key: 'trend', header: 'Xu hướng (%)' },
            ],
            data: dataRows,
            filename: `bao-cao-tai-chinh_${today}`,
            sheets,
        };
    }, [stats]);

    const handleFinanceExport = async (format: ExportFormat, filename: string) => {
        const config = { ...financeExportConfig, filename };
        await exportData(format, config);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Tài chính</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Quản lý tài chính doanh nghiệp</p>
                    </div>
                    <PermissionGate module="finance" action="export">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExportOpen(true)}
                            className="gap-1.5 border-gray-300 hover:border-[#c2185b] hover:text-[#c2185b] transition-colors"
                        >
                            <IconDownload className="h-4 w-4" />
                            <span className="hidden sm:inline">Xuất báo cáo</span>
                        </Button>
                    </PermissionGate>
                </div>
            </motion.div>

            {/* R2: Alerts Banner */}
            {alerts && alerts.high_priority_count > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-3"
                >
                    <IconAlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                        <p className="text-sm font-medium text-yellow-800">
                            Có {alerts.high_priority_count} công nợ quá hạn nghiêm trọng
                        </p>
                        <p className="text-xs text-yellow-600">
                            Tổng: {formatCurrency(alerts.total_amount)} từ {alerts.total_overdue} đơn hàng
                        </p>
                    </div>
                </motion.div>
            )}

            {/* KPI Cards — 2 Primary (with sparkline) + 2 Secondary (compact) */}
            <motion.div
                className="space-y-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                {/* Row 1: Primary KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                    <SparklineKpiCard
                        title="Doanh thu"
                        value={stats?.total_revenue || 0}
                        trend={stats?.revenue_trend || 0}
                        icon={IconCash}
                        bgColor="bg-green-50"
                        iconColor="text-green-600"
                        accentColor="#22c55e"
                        sparklineData={revenueSparkline}
                        variant="primary"
                        isLoading={isLoading}
                    />
                    <SparklineKpiCard
                        title="Lợi nhuận"
                        value={stats?.net_profit || 0}
                        trend={stats?.profit_trend || 0}
                        icon={IconTrendingUp}
                        bgColor="bg-blue-50"
                        iconColor="text-blue-600"
                        accentColor="#3b82f6"
                        sparklineData={profitSparkline}
                        variant="primary"
                        isLoading={isLoading}
                    />
                </div>
                {/* Row 2: Secondary KPIs (compact) */}
                <div className="grid grid-cols-2 gap-2">
                    <SparklineKpiCard
                        title="Chi phí"
                        value={stats?.total_expenses || 0}
                        trend={stats?.expenses_trend || 0}
                        icon={IconTrendingDown}
                        bgColor="bg-red-50"
                        iconColor="text-red-600"
                        accentColor="#ef4444"
                        variant="secondary"
                        isLoading={isLoading}
                        invertTrend
                    />
                    <SparklineKpiCard
                        title="Công nợ"
                        value={stats?.cash_balance || 0}
                        trend={stats?.receivables_trend || 0}
                        icon={IconWallet}
                        bgColor="bg-purple-50"
                        iconColor="text-purple-600"
                        accentColor="#a855f7"
                        variant="secondary"
                        isLoading={isLoading}
                    />
                </div>
            </motion.div>

            {/* Tabs - Responsive */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                    <TabsList className="w-full md:w-auto flex overflow-x-auto">
                        <TabsTrigger value="overview" className="text-xs md:text-sm">Tổng quan</TabsTrigger>
                        <TabsTrigger value="receivables" className="text-xs md:text-sm relative">
                            Phải thu
                            {alerts && alerts.total_overdue > 0 && (
                                <Badge variant="destructive" className="ml-1 h-5 min-w-[1.25rem] text-[10px] px-1">
                                    {alerts.total_overdue}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="payables" className="text-xs md:text-sm">Phải trả</TabsTrigger>
                        <TabsTrigger value="transactions" className="text-xs md:text-sm">Giao dịch</TabsTrigger>
                        <TabsTrigger value="reports" className="text-xs md:text-sm">
                            <IconReportMoney className="h-4 w-4 mr-1" />
                            Báo cáo
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab - Charts */}
                    <TabsContent value="overview" className="space-y-4">
                        {/* Period Selector */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <PeriodSelector
                                value={dateRange}
                                onChange={setDateRange}
                            />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <MonthlyStatsChart dateRange={dateRange} />
                            <ExpensesCategoryChart dateRange={dateRange} />
                        </div>
                    </TabsContent>

                    {/* Receivables Tab */}
                    <TabsContent value="receivables" className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-2">
                                <ReceivablesTable />
                            </div>
                            <div className="space-y-4">
                                <AgingDistributionChart />
                                <ReceivablesAlerts daysThreshold={7} />
                            </div>
                        </div>
                    </TabsContent>

                    {/* Payables Tab */}
                    <TabsContent value="payables" className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-2">
                                <PayablesTable />
                            </div>
                            <div>
                                <PaymentSchedule />
                            </div>
                        </div>
                    </TabsContent>

                    {/* Transactions Tab */}
                    <TabsContent value="transactions">
                        <TransactionsTable onCreateClick={() => setShowCreateModal(true)} />
                    </TabsContent>

                    {/* Reports Tab */}
                    <TabsContent value="reports" className="space-y-4">

                        {/* Reports Grid - All 4 reports */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <BalanceSheetReport />
                            <ProfitLossReport />
                            <CashFlowReport />
                            <PeriodClosingManager />
                        </div>
                    </TabsContent>
                </Tabs>
            </motion.div>

            {/* Create Transaction Modal */}
            <CreateTransactionModal
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
            />

            {/* Professional Export Dialog */}
            <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                onExport={handleFinanceExport}
                defaultFilename={financeExportConfig.filename}
                title="Xuất báo cáo Tài chính"
                isExporting={isExporting}
            />
        </div>
    );
}
