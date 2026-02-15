'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';
import { IconCash, IconTrendingUp, IconTrendingDown, IconDownload, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useReportExport, type ExportFormat, type ExportConfig } from '@/hooks/use-report-export';
import { ExportDialog } from '@/components/analytics/export-dialog';
import type { ReportSheet, KpiCard, ColumnDef } from '@/lib/excel-report-engine';

interface CashFlowItem {
    period: string;
    receipts: number;
    payments: number;
    net_flow: number;
}

export function CashFlowReport() {
    const [exportOpen, setExportOpen] = useState(false);
    const { isExporting, exportData } = useReportExport();

    const { data, isLoading, error } = useQuery({
        queryKey: ['cashflow-report'],
        queryFn: async () => {
            const response = await api.get<CashFlowItem[]>('/finance/reports/cashflow?months=6');
            return response;
        },
    });

    // ========== PROFESSIONAL EXPORT CONFIG ==========
    const colDef = (key: string, header: string, opts: Partial<ColumnDef> = {}): ColumnDef => ({
        key, header, format: 'text', ...opts,
    });

    const cfExportConfig = useMemo((): ExportConfig => {
        const items = data || [];
        const totalReceipts = items.reduce((s, i) => s + i.receipts, 0);
        const totalPayments = items.reduce((s, i) => s + i.payments, 0);
        const totalNetFlow = items.reduce((s, i) => s + i.net_flow, 0);

        const kpiCards: KpiCard[] = [
            { label: 'TỔNG THU VÀO', value: totalReceipts, format: 'currency', trend: 0, trendLabel: '', bgColor: 'E8F5E9', valueColor: '1B7D3A', icon: '⬆️' },
            { label: 'TỔNG CHI RA', value: totalPayments, format: 'currency', trend: 0, trendLabel: '', bgColor: 'FFEBEE', valueColor: 'C62828', icon: '⬇️' },
            { label: 'DÒNG TIỀN RÒNG', value: totalNetFlow, format: 'currency', trend: 0, trendLabel: totalNetFlow >= 0 ? 'Dương' : 'Âm', bgColor: totalNetFlow >= 0 ? 'E3F2FD' : 'FFF3E0', valueColor: totalNetFlow >= 0 ? '1565C0' : 'E65100', icon: totalNetFlow >= 0 ? '📈' : '📉' },
        ];

        const dataRows = items.map(item => ({
            period: item.period,
            receipts: item.receipts,
            payments: item.payments,
            net_flow: item.net_flow,
        }));

        const columns: ColumnDef[] = [
            colDef('period', 'Kỳ', { width: 15 }),
            colDef('receipts', 'Thu vào', { format: 'currency', width: 20 }),
            colDef('payments', 'Chi ra', { format: 'currency', width: 20 }),
            colDef('net_flow', 'Dòng tiền ròng', { format: 'currency', width: 20 }),
        ];

        const sheets: ReportSheet[] = [{
            name: 'Dòng tiền',
            title: 'Báo cáo Dòng tiền',
            subtitle: '6 tháng gần nhất',
            kpiCards,
            columns,
            data: dataRows,
            summaryRow: true,
        }];

        return {
            title: 'Báo cáo Dòng tiền',
            columns: [
                { key: 'period', header: 'Kỳ' },
                { key: 'receipts', header: 'Thu vào', format: (v) => formatCurrency(v as number) },
                { key: 'payments', header: 'Chi ra', format: (v) => formatCurrency(v as number) },
                { key: 'net_flow', header: 'Dòng tiền ròng', format: (v) => formatCurrency(v as number) },
            ],
            data: dataRows,
            filename: `cashflow-report-${new Date().toISOString().split('T')[0]}`,
            sheets,
        };
    }, [data]);

    const handleCfExport = async (fmt: ExportFormat, filename: string) => {
        const config = { ...cfExportConfig, filename };
        await exportData(fmt, config);
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardContent>
            </Card>
        );
    }

    if (error || !data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <IconCash className="h-5 w-5" />
                        Báo cáo Dòng tiền
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Không có dữ liệu dòng tiền</p>
                </CardContent>
            </Card>
        );
    }

    const totalReceipts = data.reduce((sum, item) => sum + item.receipts, 0);
    const totalPayments = data.reduce((sum, item) => sum + item.payments, 0);
    const totalNetFlow = data.reduce((sum, item) => sum + item.net_flow, 0);

    return (
        <>
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <IconCash className="h-5 w-5 text-primary" />
                            <CardTitle className="text-base font-semibold">Báo cáo Dòng tiền</CardTitle>
                        </div>
                        <Badge
                            variant={totalNetFlow >= 0 ? "default" : "destructive"}
                            className="flex items-center gap-1"
                        >
                            {totalNetFlow >= 0 ? (
                                <IconTrendingUp className="h-3 w-3" />
                            ) : (
                                <IconTrendingDown className="h-3 w-3" />
                            )}
                            {totalNetFlow >= 0 ? 'Dương' : 'Âm'}
                        </Badge>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-muted-foreground">6 tháng gần nhất</span>
                        <PermissionGate module="finance" action="export">
                            <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
                                <IconDownload className="h-4 w-4 mr-1" />
                                Xuất
                            </Button>
                        </PermissionGate>
                    </div>
                </CardHeader>

                <CardContent className="space-y-3">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-green-50 rounded-lg p-2 text-center">
                            <IconArrowUp className="h-4 w-4 text-green-600 mx-auto" />
                            <p className="text-xs text-muted-foreground mt-1">Thu vào</p>
                            <p className="text-sm font-bold text-green-600 tabular-nums">
                                {formatCurrency(totalReceipts)}
                            </p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-2 text-center">
                            <IconArrowDown className="h-4 w-4 text-red-600 mx-auto" />
                            <p className="text-xs text-muted-foreground mt-1">Chi ra</p>
                            <p className="text-sm font-bold text-red-600 tabular-nums">
                                {formatCurrency(totalPayments)}
                            </p>
                        </div>
                        <div className={cn(
                            "rounded-lg p-2 text-center",
                            totalNetFlow >= 0 ? "bg-blue-50" : "bg-amber-50"
                        )}>
                            {totalNetFlow >= 0 ? (
                                <IconTrendingUp className="h-4 w-4 text-blue-600 mx-auto" />
                            ) : (
                                <IconTrendingDown className="h-4 w-4 text-amber-600 mx-auto" />
                            )}
                            <p className="text-xs text-muted-foreground mt-1">Ròng</p>
                            <p className={cn(
                                "text-sm font-bold tabular-nums",
                                totalNetFlow >= 0 ? "text-blue-600" : "text-amber-600"
                            )}>
                                {formatCurrency(totalNetFlow)}
                            </p>
                        </div>
                    </div>

                    {/* Monthly Breakdown */}
                    <div className="space-y-2 mt-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Chi tiết theo tháng</p>
                        <div className="space-y-1">
                            {data.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <span className="text-sm font-medium">{item.period}</span>
                                    <div className="flex items-center gap-4 text-sm tabular-nums">
                                        <span className="text-green-600">+{formatCurrency(item.receipts)}</span>
                                        <span className="text-red-600">-{formatCurrency(item.payments)}</span>
                                        <span className={cn(
                                            "font-semibold min-w-[100px] text-right",
                                            item.net_flow >= 0 ? "text-blue-600" : "text-amber-600"
                                        )}>
                                            {item.net_flow >= 0 ? '+' : ''}{formatCurrency(item.net_flow)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
            <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                onExport={handleCfExport}
                isExporting={isExporting}
                defaultFilename={cfExportConfig.filename}
                title="Xuất BC Dòng tiền"
            />
        </>
    );
}
