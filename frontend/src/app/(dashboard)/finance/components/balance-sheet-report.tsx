'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { IconReportMoney, IconCheck, IconAlertTriangle, IconDownload, IconCalendar } from '@tabler/icons-react';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useReportExport, type ExportFormat, type ExportConfig } from '@/hooks/use-report-export';
import { ExportDialog } from '@/components/analytics/export-dialog';
import type { ReportSheet, KpiCard, ColumnDef } from '@/lib/excel-report-engine';

interface BalanceSheetItem {
    account_code: string;
    account_name: string;
    account_type: string;
    debit_balance: number;
    credit_balance: number;
    net_balance: number;
}

interface BalanceSheetSection {
    items: BalanceSheetItem[];
    total: number;
    retained_earnings?: number;
}

interface BalanceSheetResponse {
    as_of_date: string;
    sections: {
        assets: BalanceSheetSection;
        liabilities: BalanceSheetSection;
        equity: BalanceSheetSection;
    };
    summary: {
        total_assets: number;
        total_liabilities: number;
        total_equity: number;
        is_balanced: boolean;
    };
}

export function BalanceSheetReport() {
    const [reportDate, setReportDate] = useState<Date>(new Date());
    const [exportOpen, setExportOpen] = useState(false);
    const { isExporting, exportData } = useReportExport();

    const { data, isLoading, error } = useQuery({
        queryKey: ['balance-sheet', reportDate.toISOString().split('T')[0]],
        queryFn: async () => {
            const dateStr = reportDate.toISOString().split('T')[0];
            const response = await api.get<BalanceSheetResponse>(`/finance/reports/balance-sheet?as_of_date=${dateStr}`);
            return response;
        },
    });

    // ========== PROFESSIONAL EXPORT CONFIG ==========
    const colDef = (key: string, header: string, opts: Partial<ColumnDef> = {}): ColumnDef => ({
        key, header, format: 'text', ...opts,
    });

    const bsExportConfig = useMemo((): ExportConfig => {
        const summary = data?.summary;
        const sections = data?.sections;
        const dateStr = format(reportDate, 'dd/MM/yyyy');

        const kpiCards: KpiCard[] = [
            { label: 'TỔNG TÀI SẢN', value: summary?.total_assets || 0, format: 'currency', trend: 0, trendLabel: '', bgColor: 'E3F2FD', valueColor: '1565C0', icon: '🏦' },
            { label: 'TỔNG NỢ', value: summary?.total_liabilities || 0, format: 'currency', trend: 0, trendLabel: '', bgColor: 'FFEBEE', valueColor: 'C62828', icon: '📋' },
            { label: 'TỔNG VỐN', value: summary?.total_equity || 0, format: 'currency', trend: 0, trendLabel: '', bgColor: 'E8F5E9', valueColor: '1B7D3A', icon: '💰' },
            { label: summary?.is_balanced ? '✅ CÂN ĐỐI' : '⚠️ KHÔNG CÂN ĐỐI', value: summary?.total_equity || 0, format: 'currency', trend: 0, trendLabel: '', bgColor: summary?.is_balanced ? 'E8F5E9' : 'FFEBEE', valueColor: summary?.is_balanced ? '1B7D3A' : 'C62828', icon: summary?.is_balanced ? '✅' : '⚠️' },
        ];

        // Build combined data rows with section headers
        const dataRows: Record<string, unknown>[] = [];
        if (sections) {
            // Assets
            dataRows.push({ account_code: '', account_name: '--- TÀI SẢN ---', account_type: '', debit_balance: '', credit_balance: '', net_balance: '' });
            sections.assets.items.forEach(item => dataRows.push({ ...item }));
            dataRows.push({ account_code: '', account_name: 'Tổng Tài sản', account_type: '', debit_balance: '', credit_balance: '', net_balance: summary?.total_assets || 0 });

            // Liabilities
            dataRows.push({ account_code: '', account_name: '--- NỢ PHẢI TRẢ ---', account_type: '', debit_balance: '', credit_balance: '', net_balance: '' });
            sections.liabilities.items.forEach(item => dataRows.push({ ...item }));
            dataRows.push({ account_code: '', account_name: 'Tổng Nợ', account_type: '', debit_balance: '', credit_balance: '', net_balance: summary?.total_liabilities || 0 });

            // Equity
            dataRows.push({ account_code: '', account_name: '--- VỐN CHỦ SỞ HỮU ---', account_type: '', debit_balance: '', credit_balance: '', net_balance: '' });
            sections.equity.items.forEach(item => dataRows.push({ ...item }));
            if (sections.equity.retained_earnings !== undefined) {
                dataRows.push({ account_code: '', account_name: 'Lợi nhuận giữ lại', account_type: '', debit_balance: '', credit_balance: '', net_balance: sections.equity.retained_earnings });
            }
            dataRows.push({ account_code: '', account_name: 'Tổng Vốn', account_type: '', debit_balance: '', credit_balance: '', net_balance: summary?.total_equity || 0 });
        }

        const columns: ColumnDef[] = [
            colDef('account_code', 'Mã TK', { width: 12 }),
            colDef('account_name', 'Tên tài khoản', { width: 30 }),
            colDef('account_type', 'Loại', { width: 15 }),
            colDef('debit_balance', 'Dư Nợ', { format: 'currency', width: 18 }),
            colDef('credit_balance', 'Dư Có', { format: 'currency', width: 18 }),
            colDef('net_balance', 'Số dư', { format: 'currency', width: 18 }),
        ];

        const sheets: ReportSheet[] = [{
            name: 'Bảng CĐKT',
            title: 'Bảng Cân Đối Kế Toán',
            subtitle: `Ngày: ${dateStr}`,
            kpiCards,
            columns,
            data: dataRows,
            summaryRow: false,
        }];

        return {
            title: 'Bảng Cân Đối Kế Toán',
            columns: [
                { key: 'account_code', header: 'Mã TK' },
                { key: 'account_name', header: 'Tên tài khoản' },
                { key: 'account_type', header: 'Loại' },
                { key: 'debit_balance', header: 'Dư Nợ', format: (v) => formatCurrency(v as number) },
                { key: 'credit_balance', header: 'Dư Có', format: (v) => formatCurrency(v as number) },
                { key: 'net_balance', header: 'Số dư', format: (v) => formatCurrency(v as number) },
            ],
            data: dataRows,
            filename: `balance-sheet-${format(reportDate, 'yyyy-MM-dd')}`,
            sheets,
        };
    }, [data, reportDate]);

    const handleBsExport = async (fmt: ExportFormat, filename: string) => {
        const config = { ...bsExportConfig, filename };
        await exportData(fmt, config);
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <IconReportMoney className="h-5 w-5" />
                        Bảng cân đối kế toán
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-gray-500 dark:text-gray-400">
                    Không thể tải báo cáo. API có thể chưa được triển khai.
                </CardContent>
            </Card>
        );
    }

    const { sections, summary } = data;

    return (
        <>
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <IconReportMoney className="h-5 w-5 text-blue-600" />
                            Bảng cân đối kế toán
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {summary.is_balanced ? (
                                <Badge className="bg-green-100 text-green-700">
                                    <IconCheck className="h-3 w-3 mr-1" />
                                    Cân đối
                                </Badge>
                            ) : (
                                <Badge className="bg-red-100 text-red-700">
                                    <IconAlertTriangle className="h-3 w-3 mr-1" />
                                    Không cân đối
                                </Badge>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2 mt-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "justify-start text-left font-normal",
                                        !reportDate && "text-muted-foreground"
                                    )}
                                >
                                    <IconCalendar className="h-4 w-4 mr-2" />
                                    Ngày: {format(reportDate, 'dd/MM/yyyy', { locale: vi })}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={reportDate}
                                    onSelect={(date) => date && setReportDate(date)}
                                    initialFocus
                                    locale={vi}
                                />
                            </PopoverContent>
                        </Popover>
                        <PermissionGate module="finance" action="export">
                            <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
                                <IconDownload className="h-4 w-4 mr-1" />
                                Xuất
                            </Button>
                        </PermissionGate>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Assets Column */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">
                                TÀI SẢN
                            </h3>
                            {sections.assets.items.length === 0 ? (
                                <p className="text-sm text-gray-400 dark:text-gray-500">Chưa có dữ liệu</p>
                            ) : (
                                <div className="space-y-2">
                                    {sections.assets.items.map((item) => (
                                        <div
                                            key={item.account_code}
                                            className="flex justify-between text-sm"
                                        >
                                            <span className="text-gray-600 dark:text-gray-400">
                                                <span className="font-mono text-xs text-gray-400 dark:text-gray-500 mr-2">
                                                    {item.account_code}
                                                </span>
                                                {item.account_name}
                                            </span>
                                            <span className={cn(
                                                "font-medium tabular-nums",
                                                item.net_balance < 0 && "text-red-600"
                                            )}>
                                                {formatCurrency(item.net_balance)}
                                                {item.net_balance < 0 && (
                                                    <IconAlertTriangle className="inline h-3 w-3 ml-1 text-red-500" />
                                                )}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-between pt-2 border-t font-semibold">
                                <span>Tổng tài sản</span>
                                <span className="text-blue-600 tabular-nums">
                                    {formatCurrency(summary.total_assets)}
                                </span>
                            </div>
                        </div>

                        {/* Liabilities + Equity Column */}
                        <div className="space-y-4">
                            {/* Liabilities */}
                            <div className="space-y-2">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">
                                    NỢ PHẢI TRẢ
                                </h3>
                                {sections.liabilities.items.length === 0 ? (
                                    <p className="text-sm text-gray-400 dark:text-gray-500">Chưa có dữ liệu</p>
                                ) : (
                                    <div className="space-y-2">
                                        {sections.liabilities.items.map((item) => (
                                            <div
                                                key={item.account_code}
                                                className="flex justify-between text-sm"
                                            >
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    <span className="font-mono text-xs text-gray-400 dark:text-gray-500 mr-2">
                                                        {item.account_code}
                                                    </span>
                                                    {item.account_name}
                                                </span>
                                                <span className="font-medium tabular-nums">
                                                    {formatCurrency(item.net_balance)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex justify-between pt-2 border-t text-sm font-medium">
                                    <span>Tổng nợ</span>
                                    <span className="tabular-nums">
                                        {formatCurrency(summary.total_liabilities)}
                                    </span>
                                </div>
                            </div>

                            {/* Equity */}
                            <div className="space-y-2 mt-4">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">
                                    VỐN CHỦ SỞ HỮU
                                </h3>
                                {sections.equity.items.length === 0 && !sections.equity.retained_earnings ? (
                                    <p className="text-sm text-gray-400 dark:text-gray-500">Chưa có dữ liệu</p>
                                ) : (
                                    <div className="space-y-2">
                                        {sections.equity.items.map((item) => (
                                            <div
                                                key={item.account_code}
                                                className="flex justify-between text-sm"
                                            >
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    <span className="font-mono text-xs text-gray-400 dark:text-gray-500 mr-2">
                                                        {item.account_code}
                                                    </span>
                                                    {item.account_name}
                                                </span>
                                                <span className="font-medium tabular-nums">
                                                    {formatCurrency(item.net_balance)}
                                                </span>
                                            </div>
                                        ))}
                                        {sections.equity.retained_earnings !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600 dark:text-gray-400 italic">
                                                    Lợi nhuận giữ lại
                                                </span>
                                                <span className="font-medium tabular-nums">
                                                    {formatCurrency(sections.equity.retained_earnings)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="flex justify-between pt-2 border-t text-sm font-medium">
                                    <span>Tổng vốn</span>
                                    <span className="tabular-nums">
                                        {formatCurrency(summary.total_equity)}
                                    </span>
                                </div>
                            </div>

                            {/* Total Liabilities + Equity */}
                            <div className="flex justify-between pt-4 border-t-2 font-semibold">
                                <span>Tổng nợ + vốn</span>
                                <span className="text-blue-600 tabular-nums">
                                    {formatCurrency(summary.total_liabilities + summary.total_equity)}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                onExport={handleBsExport}
                isExporting={isExporting}
                defaultFilename={bsExportConfig.filename}
                title="Xuất BCĐKT"
            />
        </>
    );
}
