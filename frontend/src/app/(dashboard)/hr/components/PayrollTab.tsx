'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
    IconCash,
    IconCheck,
    IconCalculator,
    IconRefresh,
    IconCalendar,
    IconUsers,
    IconClock,
    IconMoon,
    IconSun,
    IconPlus,
    IconCreditCard,
    IconSettings,
    IconDownload,
    IconPrinter,
} from '@tabler/icons-react';
import CreatePayrollPeriodModal from './CreatePayrollPeriodModal';
import PayrollItemDetailModal from './PayrollItemDetailModal';
import PayrollSettingsModal from './PayrollSettingsModal';
import { useReportExport, type ExportFormat, type ExportConfig } from '@/hooks/use-report-export';
import { ExportDialog } from '@/components/analytics/export-dialog';
import type { ReportSheet, KpiCard, ColumnDef } from '@/lib/excel-report-engine';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { generateBatchPayrollSlipPdf, type PayrollSlipData } from '@/lib/payroll-slip-pdf';
import SalaryAdvanceSection from './SalaryAdvanceSection';

interface PayrollPeriodResponse {
    id: string;
    tenant_id: string;
    period_name: string;
    start_date: string;
    end_date: string;
    status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PAID';
    total_employees: number;
    total_gross: number;
    total_deductions: number;
    total_net: number;
    calculated_at: string | null;
    approved_at: string | null;
    notes: string | null;
    created_at: string;
}

interface PayrollItemResponse {
    id: string;
    employee_id: string;
    employee_name: string;
    employee_role: string;
    is_fulltime: boolean;
    regular_hours: number;
    overtime_hours: number;
    weekend_hours: number;
    holiday_hours: number;
    night_hours: number;
    regular_pay: number;
    overtime_pay: number;
    weekend_pay: number;
    holiday_pay: number;
    night_pay: number;
    allowance_meal: number;
    allowance_transport: number;
    bonus: number;
    gross_salary: number;
    deduction_social_ins: number;
    deduction_advance: number;
    total_deductions: number;
    net_salary: number;
    status: string;
}

interface PayrollStats {
    current_period: string | null;
    total_periods: number;
    total_paid_this_year: number;
    pending_advances: number;
}

export default function PayrollTab() {
    const queryClient = useQueryClient();
    const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<PayrollItemResponse | null>(null);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
    const [exportOpen, setExportOpen] = useState(false);
    const [isPrintingBatch, setIsPrintingBatch] = useState(false);
    const { isExporting, exportData } = useReportExport();

    // Query: List payroll periods
    const { data: periods, isLoading: periodsLoading } = useQuery({
        queryKey: ['hr', 'payroll', 'periods'],
        queryFn: async () => {
            return await api.get<PayrollPeriodResponse[]>('/hr/payroll/periods');
        },
    });

    // Query: Get payroll stats
    const { data: stats } = useQuery({
        queryKey: ['hr', 'payroll', 'stats'],
        queryFn: async () => {
            return await api.get<PayrollStats>('/hr/payroll/stats');
        },
    });

    // Query: Get payroll items for selected period
    const { data: payrollItems, isLoading: itemsLoading } = useQuery({
        queryKey: ['hr', 'payroll', 'items', selectedPeriodId],
        queryFn: async () => {
            if (!selectedPeriodId) return [];
            return await api.get<PayrollItemResponse[]>(`/hr/payroll/periods/${selectedPeriodId}/items`);
        },
        enabled: !!selectedPeriodId,
    });

    // Mutation: Calculate payroll
    const calculateMutation = useMutation({
        mutationFn: async (periodId: string) => {
            return await api.post(`/hr/payroll/periods/${periodId}/calculate`, {});
        },
        onSuccess: () => {
            toast.success('Đã tính lương thành công!');
            queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
        },
        onError: () => {
            toast.error('Tính lương thất bại');
        },
    });

    // Mutation: Approve payroll
    const approveMutation = useMutation({
        mutationFn: async (periodId: string) => {
            return await api.post(`/hr/payroll/periods/${periodId}/approve`, {});
        },
        onSuccess: () => {
            toast.success('Đã duyệt bảng lương!');
            queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
        },
        onError: () => {
            toast.error('Duyệt thất bại');
        },
    });

    // Mutation: Pay payroll
    const payMutation = useMutation({
        mutationFn: async (periodId: string) => {
            return await api.post(`/hr/payroll/periods/${periodId}/pay`, {});
        },
        onSuccess: () => {
            toast.success('Đã xác nhận trả lương!');
            queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
        },
        onError: () => {
            toast.error('Trả lương thất bại');
        },
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PAID':
                return <Badge className="bg-green-100 text-green-700">Đã trả</Badge>;
            case 'APPROVED':
                return <Badge className="bg-blue-100 text-blue-700">Đã duyệt</Badge>;
            case 'CALCULATED':
                return <Badge className="bg-accent-100 text-accent-strong">Đã tính</Badge>;
            default:
                return <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">Nháp</Badge>;
        }
    };

    const selectedPeriod = periods?.find((p) => p.id === selectedPeriodId);

    // Determine items to export (selected or all)
    const itemsToExport = useMemo(() => {
        if (!payrollItems) return [];
        if (selectedEmployeeIds.size === 0) return payrollItems;
        return payrollItems.filter(i => selectedEmployeeIds.has(i.id));
    }, [payrollItems, selectedEmployeeIds]);

    // Toggle single employee selection
    const toggleEmployee = (id: string) => {
        setSelectedEmployeeIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    // Toggle all employees
    const toggleAll = () => {
        if (!payrollItems) return;
        if (selectedEmployeeIds.size === payrollItems.length) {
            setSelectedEmployeeIds(new Set());
        } else {
            setSelectedEmployeeIds(new Set(payrollItems.map(i => i.id)));
        }
    };

    // Build export config
    const payrollExportConfig = useMemo((): ExportConfig => {
        const col = (key: string, header: string, opts: Partial<ColumnDef> = {}): ColumnDef => ({
            key, header, format: 'text', ...opts,
        });

        const exportItems = itemsToExport.map((item, idx) => ({
            stt: idx + 1,
            employee_name: item.employee_name,
            employee_role: item.employee_role,
            regular_hours: item.regular_hours,
            overtime_hours: item.overtime_hours,
            regular_pay: item.regular_pay,
            overtime_pay: item.overtime_pay,
            allowance_meal: item.allowance_meal,
            allowance_transport: item.allowance_transport,
            bonus: item.bonus,
            gross_salary: item.gross_salary,
            deduction_social_ins: item.deduction_social_ins,
            deduction_advance: item.deduction_advance,
            total_deductions: item.total_deductions,
            net_salary: item.net_salary,
        }));

        const totalGross = itemsToExport.reduce((s, i) => s + i.gross_salary, 0);
        const totalNet = itemsToExport.reduce((s, i) => s + i.net_salary, 0);
        const totalDeductions = itemsToExport.reduce((s, i) => s + i.total_deductions, 0);

        const kpiCards: KpiCard[] = [
            { label: 'TỔNG LƯƠNG GROSS', value: totalGross, format: 'currency', trend: 0, trendLabel: '', bgColor: 'E8F5E9', valueColor: '1B7D3A', icon: '💰' },
            { label: 'THỰC NHẬN', value: totalNet, format: 'currency', trend: 0, trendLabel: '', bgColor: 'E3F2FD', valueColor: '1565C0', icon: '💵' },
            { label: 'KHẤU TRỪ', value: totalDeductions, format: 'currency', trend: 0, trendLabel: '', bgColor: 'FCE4EC', valueColor: 'C62828', icon: '📉' },
            { label: 'SỐ NHÂN VIÊN', value: itemsToExport.length, format: 'number', trend: 0, trendLabel: '', bgColor: 'F3E5F5', valueColor: '7B1FA2', icon: '👥' },
        ];

        const periodLabel = selectedPeriod?.period_name ?? 'Bảng lương';
        const dateRange = selectedPeriod
            ? `${formatDate(selectedPeriod.start_date)} — ${formatDate(selectedPeriod.end_date)}`
            : '';

        const sheets: ReportSheet[] = [{
            name: 'Bảng lương',
            title: `Bảng lương — ${periodLabel}`,
            subtitle: dateRange,
            kpiCards,
            columns: [
                col('stt', 'STT', { format: 'number', width: 6 }),
                col('employee_name', 'Họ tên', { width: 22 }),
                col('employee_role', 'Chức vụ', { width: 14 }),
                col('regular_hours', 'Giờ TT', { format: 'number', width: 10 }),
                col('overtime_hours', 'Giờ OT', { format: 'number', width: 10 }),
                col('regular_pay', 'Lương cơ bản', { format: 'currency', width: 18 }),
                col('overtime_pay', 'Lương OT', { format: 'currency', width: 16 }),
                col('allowance_meal', 'PC Ăn', { format: 'currency', width: 14 }),
                col('allowance_transport', 'PC Đi lại', { format: 'currency', width: 14 }),
                col('bonus', 'Thưởng', { format: 'currency', width: 14 }),
                col('gross_salary', 'Tổng TN', { format: 'currency', width: 18 }),
                col('deduction_social_ins', 'BHXH', { format: 'currency', width: 14 }),
                col('deduction_advance', 'Tạm ứng', { format: 'currency', width: 14 }),
                col('total_deductions', 'Tổng KT', { format: 'currency', width: 16 }),
                col('net_salary', 'Thực nhận', { format: 'currency', width: 18 }),
            ],
            data: exportItems,
            summaryRow: true,
        }];

        const selLabel = selectedEmployeeIds.size > 0
            ? `${selectedEmployeeIds.size}-nv`
            : 'tat-ca';

        return {
            title: `Bảng lương — ${periodLabel}`,
            columns: [],
            data: exportItems,
            filename: `bang-luong_${periodLabel.replace(/\s+/g, '-').toLowerCase()}_${selLabel}`,
            sheets,
            dateRange,
        };
    }, [itemsToExport, selectedPeriod, selectedEmployeeIds, formatDate]);

    // Export handler
    const handlePayrollExport = async (format: ExportFormat, filename: string) => {
        await exportData(format, { ...payrollExportConfig, filename });
    };

    return (
        <>
            <div className="space-y-4">
                {/* Header with Stats and Settings */}
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Quản lý Lương</h2>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSettingsModal(true)}
                        className="border-accent-subtle text-accent-primary hover:bg-accent-50"
                    >
                        <IconSettings className="h-4 w-4 mr-1" />
                        Cài đặt lương
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        { label: 'Kỳ lương', value: stats?.total_periods || 0, icon: IconCalendar, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
                        { label: 'Đã trả (năm)', value: formatCurrency(stats?.total_paid_this_year || 0), icon: IconCash, bgColor: 'bg-green-50', iconColor: 'text-green-600', isValue: true },
                        { label: 'Tạm ứng chờ', value: stats?.pending_advances || 0, icon: IconClock, bgColor: 'bg-amber-50', iconColor: 'text-amber-600' },
                        { label: 'Kỳ hiện tại', value: stats?.current_period || '--', icon: IconUsers, bgColor: 'bg-accent-50', iconColor: 'text-accent-primary', isText: true },
                    ].map((stat, i) => (
                        <Card key={i} className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-3">
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
                                        <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                                        <p className={`font-bold ${stat.isValue || stat.isText ? 'text-sm' : 'text-lg'}`}>{stat.value}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid lg:grid-cols-3 gap-4">
                    {/* Payroll Periods List */}
                    <Card className="lg:col-span-1">
                        <CardHeader className="py-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <IconCalendar className="h-5 w-5" />
                                    Kỳ lương
                                </CardTitle>
                                <Button
                                    size="sm"
                                    className="bg-accent-gradient to-purple-500"
                                    onClick={() => setShowCreateModal(true)}
                                >
                                    <IconPlus className="h-4 w-4 mr-1" />
                                    Tạo
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                            {periodsLoading ? (
                                <div className="p-4 space-y-2">
                                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                                </div>
                            ) : !periods || periods.length === 0 ? (
                                <div className="text-center py-12">
                                    <IconCalendar className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                                    <p className="mt-4 text-gray-500 dark:text-gray-400">Chưa có kỳ lương</p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {periods.map((period) => (
                                        <div
                                            key={period.id}
                                            className={`p-3 cursor-pointer transition-colors ${selectedPeriodId === period.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900'
                                                }`}
                                            onClick={() => setSelectedPeriodId(period.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <p className="font-medium text-sm">{period.period_name}</p>
                                                {getStatusBadge(period.status)}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {formatDate(period.start_date)} - {formatDate(period.end_date)}
                                            </p>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{period.total_employees} NV</span>
                                                <span className="text-sm font-bold text-green-600">{formatCurrency(period.total_net)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Payroll Detail */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="py-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <IconCash className="h-5 w-5" />
                                    {selectedPeriod ? selectedPeriod.period_name : 'Chi tiết bảng lương'}
                                </CardTitle>
                                {selectedPeriod && (
                                    <div className="flex items-center gap-2">
                                        {selectedPeriod.status === 'DRAFT' && (
                                            <Button
                                                size="sm"
                                                onClick={() => calculateMutation.mutate(selectedPeriod.id)}
                                                disabled={calculateMutation.isPending}
                                                className="bg-accent-solid "
                                            >
                                                <IconCalculator className="h-4 w-4 mr-1" />
                                                Tính lương
                                            </Button>
                                        )}
                                        {selectedPeriod.status === 'CALCULATED' && (
                                            <Button
                                                size="sm"
                                                onClick={() => approveMutation.mutate(selectedPeriod.id)}
                                                disabled={approveMutation.isPending}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <IconCheck className="h-4 w-4 mr-1" />
                                                Duyệt
                                            </Button>
                                        )}
                                        {selectedPeriod.status === 'APPROVED' && (
                                            <Button
                                                size="sm"
                                                onClick={() => payMutation.mutate(selectedPeriod.id)}
                                                disabled={payMutation.isPending}
                                                className="bg-accent-gradient"
                                            >
                                                <IconCreditCard className="h-4 w-4 mr-1" />
                                                Trả lương
                                            </Button>
                                        )}
                                        {payrollItems && payrollItems.length > 0 && (
                                            <>
                                                <PermissionGate module="hr" action="export">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setExportOpen(true)}
                                                        className="border-amber-200 text-amber-700 hover:bg-amber-50"
                                                    >
                                                        <IconDownload className="h-4 w-4 mr-1" />
                                                        Xuất{selectedEmployeeIds.size > 0 ? ` (${selectedEmployeeIds.size} NV)` : ''}
                                                    </Button>
                                                </PermissionGate>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={async () => {
                                                        if (!payrollItems || payrollItems.length === 0) return;
                                                        setIsPrintingBatch(true);
                                                        try {
                                                            const itemsToPrint = selectedEmployeeIds.size > 0
                                                                ? payrollItems.filter(i => selectedEmployeeIds.has(i.id))
                                                                : payrollItems;
                                                            await generateBatchPayrollSlipPdf(
                                                                itemsToPrint as PayrollSlipData[],
                                                                selectedPeriod?.period_name || '',
                                                                selectedPeriod?.start_date,
                                                                selectedPeriod?.end_date,
                                                            );
                                                        } catch (e) {
                                                            console.error('Batch print failed:', e);
                                                            toast.error('In phiếu lương thất bại');
                                                        } finally {
                                                            setIsPrintingBatch(false);
                                                        }
                                                    }}
                                                    disabled={isPrintingBatch}
                                                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                                                >
                                                    <IconPrinter className="h-4 w-4 mr-1" />
                                                    {isPrintingBatch ? 'Đang tạo...' : `In phiếu lương${selectedEmployeeIds.size > 0 ? ` (${selectedEmployeeIds.size} NV)` : ''}`}
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {!selectedPeriodId ? (
                                <div className="text-center py-12">
                                    <IconCash className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                                    <p className="mt-4 text-gray-500 dark:text-gray-400">Chọn kỳ lương để xem chi tiết</p>
                                </div>
                            ) : itemsLoading ? (
                                <div className="p-4 space-y-2">
                                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                                </div>
                            ) : !payrollItems || payrollItems.length === 0 ? (
                                <div className="text-center py-12">
                                    <IconUsers className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                                    <p className="mt-4 text-gray-500 dark:text-gray-400">Chưa có dữ liệu lương</p>
                                    <p className="text-sm text-gray-400 dark:text-gray-500">Nhấn &quot;Tính lương&quot; để tạo bảng lương</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-900 border-b">
                                            <tr>
                                                <th className="text-center px-2 py-2 w-10">
                                                    <Checkbox
                                                        checked={payrollItems ? selectedEmployeeIds.size === payrollItems.length && payrollItems.length > 0 : false}
                                                        onCheckedChange={toggleAll}
                                                    />
                                                </th>
                                                <th className="text-left px-3 py-2 font-medium">Nhân viên</th>
                                                <th className="text-center px-2 py-2 font-medium">Giờ</th>
                                                <th className="text-center px-2 py-2 font-medium">OT</th>
                                                <th className="text-right px-2 py-2 font-medium">Lương cơ bản</th>
                                                <th className="text-right px-2 py-2 font-medium">Phụ cấp</th>
                                                <th className="text-right px-2 py-2 font-medium">Khấu trừ</th>
                                                <th className="text-right px-3 py-2 font-medium">Thực nhận</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {payrollItems.map((item) => (
                                                <tr
                                                    key={item.id}
                                                    className={`hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900 cursor-pointer ${selectedEmployeeIds.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                                    onClick={() => {
                                                        setSelectedItem(item);
                                                        setShowDetailModal(true);
                                                    }}
                                                >
                                                    <td className="text-center px-2 py-2" onClick={e => e.stopPropagation()}>
                                                        <Checkbox
                                                            checked={selectedEmployeeIds.has(item.id)}
                                                            onCheckedChange={() => toggleEmployee(item.id)}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <p className="font-medium">{item.employee_name}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.employee_role}</p>
                                                    </td>
                                                    <td className="text-center px-2 py-2">{item.regular_hours.toFixed(1)}</td>
                                                    <td className="text-center px-2 py-2">
                                                        {item.overtime_hours > 0 && (
                                                            <span className="text-accent-primary">{item.overtime_hours.toFixed(1)}</span>
                                                        )}
                                                        {item.overtime_hours === 0 && '--'}
                                                    </td>
                                                    <td className="text-right px-2 py-2">{formatCurrency(item.regular_pay)}</td>
                                                    <td className="text-right px-2 py-2 text-green-600">
                                                        +{formatCurrency(item.allowance_meal + item.allowance_transport + item.bonus)}
                                                    </td>
                                                    <td className="text-right px-2 py-2 text-red-600">
                                                        -{formatCurrency(item.total_deductions)}
                                                    </td>
                                                    <td className="text-right px-3 py-2 font-bold text-green-700">
                                                        {formatCurrency(item.net_salary)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        {selectedPeriod && (
                                            <tfoot className="bg-gray-100 dark:bg-gray-800 border-t-2 font-bold">
                                                <tr>
                                                    <td colSpan={4} className="px-3 py-2">TỔNG</td>
                                                    <td className="text-right px-2 py-2">{formatCurrency(selectedPeriod.total_gross)}</td>
                                                    <td className="text-right px-2 py-2">--</td>
                                                    <td className="text-right px-2 py-2 text-red-600">-{formatCurrency(selectedPeriod.total_deductions)}</td>
                                                    <td className="text-right px-3 py-2 text-green-700">{formatCurrency(selectedPeriod.total_net)}</td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Vietnam Labor Law Info */}
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                    <CardContent className="py-3 px-4">
                        <div className="flex items-start gap-3">
                            <IconSun className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium text-blue-800">Áp dụng Luật Lao động Việt Nam</p>
                                <p className="text-blue-600 text-xs mt-1">
                                    Thường: 100% • Tăng ca: 150% • Cuối tuần: 200% • Lễ: 300% • Đêm (22h-6h): +30%
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Salary Advance Section */}
                <SalaryAdvanceSection />
            </div>

            {/* Create Payroll Period Modal */}
            <CreatePayrollPeriodModal
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
            />

            {/* Payroll Item Detail Modal */}
            <PayrollItemDetailModal
                open={showDetailModal}
                onOpenChange={setShowDetailModal}
                item={selectedItem}
                periodName={selectedPeriod?.period_name}
                periodStart={selectedPeriod?.start_date}
                periodEnd={selectedPeriod?.end_date}
            />

            {/* Payroll Settings Modal */}
            <PayrollSettingsModal
                open={showSettingsModal}
                onOpenChange={setShowSettingsModal}
            />

            {/* Export Dialog */}
            <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                onExport={handlePayrollExport}
                isExporting={isExporting}
                defaultFilename={payrollExportConfig.filename}
                title={`Xuất bảng lương${selectedEmployeeIds.size > 0 ? ` (${selectedEmployeeIds.size} NV)` : ' (Tất cả)'}`}
            />
        </>
    );
}
