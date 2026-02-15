'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, cn } from '@/lib/utils';
import { IconChartBar, IconTrendingUp, IconTrendingDown, IconDownload } from '@tabler/icons-react';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useReportExport, type ExportFormat, type ExportConfig } from '@/hooks/use-report-export';
import { ExportDialog } from '@/components/analytics/export-dialog';
import type { ReportSheet, KpiCard, ColumnDef } from '@/lib/excel-report-engine';

interface PnLItem {
    category: string;
    amount: number;
}

interface PnLSummary {
    revenue: number;
    cogs: number;
    gross_profit: number;
    opex: number;
    net_profit: number;
    gross_margin: number;
    net_margin: number;
}

interface PnLResponse {
    period: string;
    items: PnLItem[];
    summary: PnLSummary;
}

export function ProfitLossReport() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(currentMonth);
    const [exportOpen, setExportOpen] = useState(false);
    const { isExporting, exportData } = useReportExport();

    const { data, isLoading, error } = useQuery({
        queryKey: ['pnl-report', year, month],
        queryFn: async () => {
            const response = await api.get<PnLResponse>(`/finance/reports/pnl?year=${year}&month=${month}`);
            return response;
        },
    });

    // ========== PROFESSIONAL EXPORT CONFIG ==========
    const colDef = (key: string, header: string, opts: Partial<ColumnDef> = {}): ColumnDef => ({
        key, header, format: 'text', ...opts,
    });

    const pnlExportConfig = useMemo((): ExportConfig => {
        const summary = data?.summary;
        const items = data?.items || [];
        const period = `${String(month).padStart(2, '0')}-${year}`;

        const kpiCards: KpiCard[] = [
            { label: 'DOANH THU', value: summary?.revenue || 0, format: 'currency', trend: 0, trendLabel: '', bgColor: 'E8F5E9', valueColor: '1B7D3A', icon: '💵' },
            { label: 'LỢI NHUẬN GỘP', value: summary?.gross_profit || 0, format: 'currency', trend: summary?.gross_margin || 0, trendLabel: 'Biên LN gộp', bgColor: 'E3F2FD', valueColor: '1565C0', icon: '📊' },
            { label: 'CHI PHÍ VẬN HÀNH', value: summary?.opex || 0, format: 'currency', trend: 0, trendLabel: '', bgColor: 'FFEBEE', valueColor: 'C62828', icon: '📉' },
            { label: 'LỢI NHUẬN RÒNG', value: summary?.net_profit || 0, format: 'currency', trend: summary?.net_margin || 0, trendLabel: 'Biên LN ròng', bgColor: 'F3E5F5', valueColor: '7B1FA2', icon: '📈' },
        ];

        const dataRows = items.map(item => ({
            category: item.category,
            amount: item.amount,
        }));

        const sheets: ReportSheet[] = [{
            name: 'Lãi Lỗ',
            title: 'Báo cáo Lãi/Lỗ (P&L)',
            subtitle: `Kỳ: Tháng ${month}/${year}`,
            kpiCards,
            columns: [
                colDef('category', 'Danh mục', { width: 30 }),
                colDef('amount', 'Số tiền', { format: 'currency', width: 22 }),
            ],
            data: dataRows,
            summaryRow: true,
        }];

        return {
            title: 'Báo cáo Lãi/Lỗ (P&L)',
            columns: [
                { key: 'category', header: 'Danh mục' },
                { key: 'amount', header: 'Số tiền', format: (v) => formatCurrency(v as number) },
            ],
            data: dataRows,
            filename: `pnl-report-${period}`,
            sheets,
        };
    }, [data, month, year]);

    const handlePnlExport = async (format: ExportFormat, filename: string) => {
        const config = { ...pnlExportConfig, filename };
        await exportData(format, config);
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

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <IconChartBar className="h-5 w-5" />
                        Báo cáo Lãi/Lỗ (P&L)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Không thể tải dữ liệu báo cáo</p>
                </CardContent>
            </Card>
        );
    }

    const { items, summary } = data;

    const months = [
        { value: 1, label: 'Tháng 1' },
        { value: 2, label: 'Tháng 2' },
        { value: 3, label: 'Tháng 3' },
        { value: 4, label: 'Tháng 4' },
        { value: 5, label: 'Tháng 5' },
        { value: 6, label: 'Tháng 6' },
        { value: 7, label: 'Tháng 7' },
        { value: 8, label: 'Tháng 8' },
        { value: 9, label: 'Tháng 9' },
        { value: 10, label: 'Tháng 10' },
        { value: 11, label: 'Tháng 11' },
        { value: 12, label: 'Tháng 12' },
    ];

    return (
        <>
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <IconChartBar className="h-5 w-5 text-primary" />
                            <CardTitle className="text-base font-semibold">Báo cáo Lãi/Lỗ (P&L)</CardTitle>
                        </div>
                        <Badge
                            variant={summary.net_profit >= 0 ? "default" : "destructive"}
                            className="flex items-center gap-1"
                        >
                            {summary.net_profit >= 0 ? (
                                <IconTrendingUp className="h-3 w-3" />
                            ) : (
                                <IconTrendingDown className="h-3 w-3" />
                            )}
                            {summary.net_margin}% margin
                        </Badge>
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-2 mt-2">
                        <div className="flex items-center gap-2">
                            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                                <SelectTrigger className="w-[120px] h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map(m => (
                                        <SelectItem key={m.value} value={String(m.value)}>
                                            {m.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                                <SelectTrigger className="w-[90px] h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                                        <SelectItem key={y} value={String(y)}>
                                            {y}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <PermissionGate module="finance" action="export">
                            <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
                                <IconDownload className="h-4 w-4 mr-1" />
                                Xuất
                            </Button>
                        </PermissionGate>
                    </div>
                </CardHeader>

                <CardContent className="space-y-3">
                    <div className="space-y-2">
                        {items.map((item, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "flex items-center justify-between py-2 px-3 rounded-lg",
                                    item.category === 'Lợi nhuận ròng' && "bg-primary/5 font-semibold",
                                    item.category === 'Lợi nhuận gộp' && "bg-muted/50"
                                )}
                            >
                                <span className="text-sm">{item.category}</span>
                                <span className={cn(
                                    "font-medium tabular-nums text-sm",
                                    item.amount < 0 && "text-red-600",
                                    item.amount > 0 && item.category.includes('Lợi nhuận') && "text-green-600"
                                )}>
                                    {formatCurrency(item.amount)}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="border-t pt-3 grid grid-cols-2 gap-4">
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Biên LN Gộp</p>
                            <p className={cn(
                                "text-lg font-bold tabular-nums",
                                summary.gross_margin >= 30 ? "text-green-600" : "text-amber-600"
                            )}>
                                {summary.gross_margin}%
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Biên LN Ròng</p>
                            <p className={cn(
                                "text-lg font-bold tabular-nums",
                                summary.net_margin >= 15 ? "text-green-600" :
                                    summary.net_margin >= 0 ? "text-amber-600" : "text-red-600"
                            )}>
                                {summary.net_margin}%
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                onExport={handlePnlExport}
                isExporting={isExporting}
                defaultFilename={pnlExportConfig.filename}
                title="Xuất báo cáo Lãi/Lỗ"
            />
        </>
    );
}
