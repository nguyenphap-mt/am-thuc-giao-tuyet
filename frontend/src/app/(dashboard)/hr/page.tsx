'use client';

import { PermissionGate } from '@/components/shared/PermissionGate';
import { useTabPersistence } from '@/hooks/useTabPersistence';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useReportExport, type ExportFormat, type ExportConfig } from '@/hooks/use-report-export';
import { ExportDialog } from '@/components/analytics/export-dialog';
import type { ReportSheet, KpiCard, ColumnDef } from '@/lib/excel-report-engine';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useResizableColumns, ColumnConfig } from '@/hooks/useResizableColumns';

// Column configuration for resizable table
const EMPLOYEE_TABLE_COLUMNS: ColumnConfig[] = [
    { id: 'name', minWidth: 80, defaultWidth: 128, maxWidth: 200 },
    { id: 'role', minWidth: 60, defaultWidth: 80, maxWidth: 120 },
    { id: 'phone', minWidth: 80, defaultWidth: 96, maxWidth: 150 },
    { id: 'email', minWidth: 100, defaultWidth: 144, maxWidth: 250 },
    { id: 'address', minWidth: 80, defaultWidth: 128, maxWidth: 400 },
    { id: 'joinedDate', minWidth: 80, defaultWidth: 96, maxWidth: 150 },
    { id: 'status', minWidth: 50, defaultWidth: 64, maxWidth: 100 },
];
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Employee } from '@/types';
import TimeSheetTab from './components/TimeSheetTab';
import PayrollTab from './components/PayrollTab';
import LeaveTab from './components/LeaveTab';
import AssignmentTab from './components/AssignmentTab';
import EmployeeFormModal from './components/EmployeeFormModal';
import DeleteEmployeeModal from './components/DeleteEmployeeModal';
import { EmployeeDetailModal } from './components/EmployeeDetailModal';
import {
    IconSearch,
    IconPlus,
    IconUsers,
    IconClock,
    IconCash,
    IconRefresh,
    IconDotsVertical,
    IconEdit,
    IconPhone,
    IconMail,
    IconCalendar,
    IconDownload,
    IconTrash,
    IconUserPlus,
} from '@tabler/icons-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const HR_TABS = ['employees', 'assignments', 'timesheets', 'payroll', 'leave'] as const;

export default function HrPage() {
    const { activeTab, handleTabChange } = useTabPersistence(HR_TABS, 'employees');
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [exportOpen, setExportOpen] = useState(false);
    const { isExporting, exportData } = useReportExport();
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    // Modal states
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    // Resizable columns hook
    const { getWidth, startResize, resetToDefaults } = useResizableColumns(
        'hr_employee_list_column_widths',
        EMPLOYEE_TABLE_COLUMNS
    );

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['employees', search, roleFilter],
        queryFn: async () => {
            // Build query params
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (roleFilter && roleFilter !== 'all') params.append('role_type', roleFilter);
            const queryString = params.toString();
            const employees = await api.get<Employee[]>(`/hr/employees${queryString ? `?${queryString}` : ''}`);
            return { items: employees, total: employees.length };
        },
    });

    // Stats query
    const { data: statsData } = useQuery({
        queryKey: ['employee-stats'],
        queryFn: async () => {
            try {
                const stats = await api.get<{ total: number; active: number; fulltime: number; parttime: number }>('/hr/employees/stats');
                return stats;
            } catch {
                return null;
            }
        },
    });

    const employees = data?.items || [];
    const stats = statsData || {
        total: data?.total || 0,
        active: employees.filter((e: Employee) => e.is_active).length,
        fulltime: employees.filter((e: Employee) => e.is_fulltime).length,
    };

    const toggleSelect = (id: number) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const toggleSelectAll = () => setSelectedIds(selectedIds.length === employees.length ? [] : employees.map((e: Employee) => e.id));

    // Bulk delete mutation
    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: number[]) => {
            // Delete each employee sequentially
            for (const id of ids) {
                await api.delete(`/hr/employees/${id}`);
            }
            return ids;
        },
        onSuccess: (ids) => {
            toast.success(`Đã xóa ${ids.length} nhân viên`);
            setSelectedIds([]);
            setBulkDeleteModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['employee-stats'] });
        },
        onError: (error: Error) => {
            toast.error(`Lỗi khi xóa: ${error.message}`);
        },
    });

    const handleBulkDelete = () => {
        if (selectedIds.length > 0) {
            setBulkDeleteModalOpen(true);
        }
    };

    const confirmBulkDelete = () => {
        bulkDeleteMutation.mutate(selectedIds);
    };

    // Modal handlers
    const handleAddEmployee = () => {
        setSelectedEmployee(null);
        setModalMode('create');
        setFormModalOpen(true);
    };

    const handleEditEmployee = (employee: Employee, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedEmployee(employee);
        setModalMode('edit');
        setFormModalOpen(true);
    };

    const handleDeleteEmployee = (employee: Employee, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedEmployee(employee);
        setDeleteModalOpen(true);
    };

    const handleCallEmployee = (phone: string | undefined, e: React.MouseEvent) => {
        e.stopPropagation();
        if (phone) {
            window.location.href = `tel:${phone}`;
        } else {
            toast.info('Nhân viên chưa có số điện thoại');
        }
    };

    const handleEmailEmployee = (email: string | undefined, e: React.MouseEvent) => {
        e.stopPropagation();
        if (email) {
            window.location.href = `mailto:${email}`;
        } else {
            toast.info('Nhân viên chưa có email');
        }
    };

    // Get role label
    const getRoleLabel = (role: string | undefined) => {
        const roles: Record<string, string> = {
            'WAITER': 'Phục vụ',
            'CHEF': 'Đầu bếp',
            'KITCHEN': 'Nhân viên bếp',
            'DRIVER': 'Tài xế',
            'LEAD': 'Trưởng nhóm',
            'MANAGER': 'Quản lý',
        };
        return roles[role || ''] || role || 'N/A';
    };

    // Get role badge color
    const getRoleBadgeColor = (role: string | undefined) => {
        const colors: Record<string, string> = {
            'CHEF': 'bg-red-100 text-red-700',
            'KITCHEN': 'bg-orange-100 text-orange-700',
            'WAITER': 'bg-blue-100 text-blue-700',
            'DRIVER': 'bg-purple-100 text-purple-700',
            'LEAD': 'bg-yellow-100 text-yellow-700',
            'MANAGER': 'bg-pink-100 text-pink-700',
        };
        return colors[role || ''] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    };

    // Format date for display
    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return '--';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
            return '--';
        }
    };

    // ========== PROFESSIONAL EXPORT CONFIG ==========
    const colDef = (key: string, header: string, opts: Partial<ColumnDef> = {}): ColumnDef => ({
        key, header, format: 'text', ...opts,
    });

    const hrExportConfig = useMemo((): ExportConfig => {
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

        const kpiCards: KpiCard[] = [
            { label: 'TỔNG NHÂN VIÊN', value: stats.total, format: 'number', trend: 0, trendLabel: '', bgColor: 'E3F2FD', valueColor: '1565C0', icon: '👥' },
            { label: 'ĐANG LÀM', value: stats.active, format: 'number', trend: 0, trendLabel: '', bgColor: 'E8F5E9', valueColor: '1B7D3A', icon: '✅' },
            { label: 'TOÀN THỜI GIAN', value: stats.fulltime || 0, format: 'number', trend: 0, trendLabel: '', bgColor: 'F3E5F5', valueColor: '7B1FA2', icon: '🏢' },
        ];

        const dataRows = employees.map(emp => ({
            full_name: emp.full_name || '',
            role_type: getRoleLabel(emp.role_type),
            phone: emp.phone || '',
            email: emp.email || '',
            address: emp.address || '',
            joined_date: formatDate(emp.joined_date),
            status: emp.is_active ? 'Đang làm' : 'Đã nghỉ',
        }));

        const sheets: ReportSheet[] = [{
            name: 'Nhân viên',
            title: 'Báo cáo Danh sách Nhân viên',
            subtitle: `Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}`,
            kpiCards,
            columns: [
                colDef('full_name', 'Họ và tên', { width: 24 }),
                colDef('role_type', 'Chức vụ', { width: 14 }),
                colDef('phone', 'Điện thoại', { width: 16 }),
                colDef('email', 'Email', { width: 24 }),
                colDef('address', 'Địa chỉ', { width: 28 }),
                colDef('joined_date', 'Ngày vào', { width: 14 }),
                colDef('status', 'Trạng thái', { format: 'status', width: 14 }),
            ],
            data: dataRows,
            summaryRow: false,
        }];

        return {
            title: 'Báo cáo Nhân sự',
            columns: [
                { key: 'full_name', header: 'Họ và tên' },
                { key: 'role_type', header: 'Chức vụ' },
                { key: 'phone', header: 'Điện thoại' },
                { key: 'email', header: 'Email' },
                { key: 'address', header: 'Địa chỉ' },
                { key: 'joined_date', header: 'Ngày vào' },
                { key: 'status', header: 'Trạng thái' },
            ],
            data: dataRows,
            filename: `bao-cao-nhan-su_${today}`,
            sheets,
        };
    }, [employees, stats]);

    const handleHRExport = async (format: ExportFormat, filename: string) => {
        const config = { ...hrExportConfig, filename };
        await exportData(format, config);
    };

    return (
        <div className="space-y-4">
            <motion.div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Nhân sự</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Quản lý nhân viên, chấm công, lương và nghỉ phép</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExportOpen(true)}
                        className="gap-1.5 border-gray-300 hover:border-[#c2185b] hover:text-[#c2185b] transition-colors"
                    >
                        <IconDownload className="h-4 w-4" />
                        <span className="hidden sm:inline">Xuất báo cáo</span>
                    </Button>
                    <PermissionGate module="hr" action="create">
                        <Button
                            className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 transition-opacity"
                            onClick={handleAddEmployee}
                        >
                            <IconUserPlus className="mr-2 h-4 w-4" />Thêm nhân viên
                        </Button>
                    </PermissionGate>
                </div>
            </motion.div>

            <motion.div className="grid grid-cols-3 gap-2 md:gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                {[
                    { label: 'Tổng NV', value: stats.total, icon: IconUsers, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
                    { label: 'Đang làm', value: stats.active, icon: IconClock, bgColor: 'bg-green-50', iconColor: 'text-green-600' },
                    { label: 'Toàn thời gian', value: stats.fulltime || '--', icon: IconCash, bgColor: 'bg-purple-50', iconColor: 'text-purple-600' },
                ].map((stat, i) => (
                    <Card key={i} className="hover:shadow-sm transition-shadow cursor-pointer">
                        <CardContent className="p-3 md:p-4">
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className={`p-1.5 md:p-2 rounded-lg ${stat.bgColor}`}>
                                    <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.iconColor}`} />
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

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                    <TabsList className="w-full md:w-auto flex overflow-x-auto">
                        <TabsTrigger value="employees" className="text-xs md:text-sm">Nhân viên</TabsTrigger>
                        <TabsTrigger value="assignments" className="text-xs md:text-sm">Phân công</TabsTrigger>
                        <TabsTrigger value="timesheets" className="text-xs md:text-sm">Chấm công</TabsTrigger>
                        <TabsTrigger value="payroll" className="text-xs md:text-sm">Lương</TabsTrigger>
                        <TabsTrigger value="leave" className="text-xs md:text-sm">Nghỉ phép</TabsTrigger>
                    </TabsList>

                    <TabsContent value="employees">
                        <Card className="overflow-hidden">
                            {/* Toolbar */}
                            <div className="flex items-center gap-2 p-2 md:p-3 border-b bg-gray-50 dark:bg-gray-900/50 dark:bg-gray-800/50">
                                <Checkbox checked={employees.length > 0 && selectedIds.length === employees.length} onCheckedChange={toggleSelectAll} className="ml-1" />
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} title="Làm mới" aria-label="Làm mới danh sách"><IconRefresh className="h-4 w-4" /></Button>

                                {selectedIds.length > 0 && (
                                    <>
                                        <Badge variant="secondary" className="text-xs">
                                            {selectedIds.length} đã chọn
                                        </Badge>
                                        <PermissionGate module="hr" action="delete">
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={handleBulkDelete}
                                                disabled={bulkDeleteMutation.isPending}
                                            >
                                                <IconTrash className="h-3.5 w-3.5 mr-1" />
                                                Xóa
                                            </Button>
                                        </PermissionGate>
                                    </>
                                )}

                                <div className="flex-1" />

                                {/* Role Filter */}
                                <Select value={roleFilter} onValueChange={setRoleFilter}>
                                    <SelectTrigger className="w-28 h-8 text-xs">
                                        <SelectValue placeholder="Chức vụ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tất cả</SelectItem>
                                        <SelectItem value="CHEF">Đầu bếp</SelectItem>
                                        <SelectItem value="KITCHEN">NV Bếp</SelectItem>
                                        <SelectItem value="WAITER">Phục vụ</SelectItem>
                                        <SelectItem value="DRIVER">Tài xế</SelectItem>
                                        <SelectItem value="LEAD">Trưởng nhóm</SelectItem>
                                        <SelectItem value="MANAGER">Quản lý</SelectItem>
                                    </SelectContent>
                                </Select>

                                <div className="relative w-full max-w-xs">
                                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                                    <Input placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
                                </div>
                            </div>

                            {/* Header Row - Resizable (Windows Explorer Style) */}
                            <div className="hidden md:flex items-center gap-0 px-4 h-9 border-b bg-[#f5f5f5] text-sm font-normal text-gray-700 dark:text-gray-300 select-none" role="row">
                                <div className="w-6 shrink-0 h-full" /> {/* Checkbox */}
                                <div className="w-8 shrink-0 h-full" /> {/* Avatar */}

                                {/* Name */}
                                <div
                                    className="relative flex items-center shrink-0 h-full border-r border-gray-300 dark:border-gray-600 hover:bg-[#cce8ff] transition-colors cursor-default"
                                    style={{ width: getWidth('name') }}
                                >
                                    <span className="flex-1 truncate px-2">Họ và tên</span>
                                    <div
                                        className="absolute right-0 top-0 w-3 h-full cursor-col-resize z-10"
                                        onMouseDown={(e) => { e.stopPropagation(); startResize('name', e.clientX); }}
                                        title="Kéo để thay đổi kích thước"
                                    />
                                </div>

                                {/* Role */}
                                <div
                                    className="relative flex items-center shrink-0 h-full border-r border-gray-300 dark:border-gray-600 hover:bg-[#cce8ff] transition-colors cursor-default"
                                    style={{ width: getWidth('role') }}
                                >
                                    <span className="flex-1 truncate px-2">Chức vụ</span>
                                    <div
                                        className="absolute right-0 top-0 w-3 h-full cursor-col-resize z-10"
                                        onMouseDown={(e) => { e.stopPropagation(); startResize('role', e.clientX); }}
                                        title="Kéo để thay đổi kích thước"
                                    />
                                </div>

                                {/* Phone */}
                                <div
                                    className="relative flex items-center shrink-0 h-full border-r border-gray-300 dark:border-gray-600 hover:bg-[#cce8ff] transition-colors cursor-default"
                                    style={{ width: getWidth('phone') }}
                                >
                                    <span className="flex-1 truncate px-2">Điện thoại</span>
                                    <div
                                        className="absolute right-0 top-0 w-3 h-full cursor-col-resize z-10"
                                        onMouseDown={(e) => { e.stopPropagation(); startResize('phone', e.clientX); }}
                                        title="Kéo để thay đổi kích thước"
                                    />
                                </div>

                                {/* Email */}
                                <div
                                    className="hidden lg:flex relative items-center shrink-0 h-full border-r border-gray-300 dark:border-gray-600 hover:bg-[#cce8ff] transition-colors cursor-default"
                                    style={{ width: getWidth('email') }}
                                >
                                    <span className="flex-1 truncate px-2">Email</span>
                                    <div
                                        className="absolute right-0 top-0 w-3 h-full cursor-col-resize z-10"
                                        onMouseDown={(e) => { e.stopPropagation(); startResize('email', e.clientX); }}
                                        title="Kéo để thay đổi kích thước"
                                    />
                                </div>

                                {/* Address */}
                                <div
                                    className="hidden xl:flex relative items-center shrink-0 h-full border-r border-gray-300 dark:border-gray-600 hover:bg-[#cce8ff] transition-colors cursor-default"
                                    style={{ width: getWidth('address') }}
                                >
                                    <span className="flex-1 truncate px-2">Địa chỉ</span>
                                    <div
                                        className="absolute right-0 top-0 w-3 h-full cursor-col-resize z-10"
                                        onMouseDown={(e) => { e.stopPropagation(); startResize('address', e.clientX); }}
                                        title="Kéo để thay đổi kích thước"
                                    />
                                </div>

                                {/* Joined Date */}
                                <div
                                    className="hidden lg:flex relative items-center shrink-0 h-full border-r border-gray-300 dark:border-gray-600 hover:bg-[#cce8ff] transition-colors cursor-default"
                                    style={{ width: getWidth('joinedDate') }}
                                >
                                    <span className="flex-1 truncate px-2">Ngày vào</span>
                                    <div
                                        className="absolute right-0 top-0 w-3 h-full cursor-col-resize z-10"
                                        onMouseDown={(e) => { e.stopPropagation(); startResize('joinedDate', e.clientX); }}
                                        title="Kéo để thay đổi kích thước"
                                    />
                                </div>

                                {/* Status - fills remaining space (Gmail-style) */}
                                <div className="flex-1 flex items-center h-full hover:bg-[#cce8ff] transition-colors cursor-default">
                                    <span className="truncate px-2">Trạng thái</span>
                                </div>

                                {/* Actions appear on row hover - no column header needed */}
                            </div>

                            <div className="divide-y" role="grid" aria-label="Danh sách nhân viên">
                                {isLoading ? (
                                    <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                                ) : employees.length === 0 ? (
                                    <div className="text-center py-16">
                                        <IconUsers className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                                        <p className="mt-4 text-gray-500 dark:text-gray-400">Chưa có nhân viên</p>
                                        <PermissionGate module="hr" action="create">
                                            <Button variant="outline" className="mt-4" onClick={handleAddEmployee}>
                                                <IconPlus className="mr-2 h-4 w-4" />
                                                Thêm nhân viên đầu tiên
                                            </Button>
                                        </PermissionGate>
                                    </div>
                                ) : (
                                    employees.map((emp: Employee) => (
                                        <div
                                            key={emp.id}
                                            role="row"
                                            tabIndex={0}
                                            className={`relative flex items-center gap-0 px-2 md:px-4 py-2 md:py-3 cursor-pointer transition-colors ${selectedIds.includes(emp.id) ? 'bg-blue-50' : 'hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800'} focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-inset group`}
                                            onMouseEnter={() => setHoveredId(emp.id)}
                                            onMouseLeave={() => setHoveredId(null)}
                                            onClick={() => { setSelectedEmployee(emp); setDetailModalOpen(true); }}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedEmployee(emp); setDetailModalOpen(true); } }}
                                        >
                                            <Checkbox checked={selectedIds.includes(emp.id)} onCheckedChange={() => toggleSelect(emp.id)} onClick={(e) => e.stopPropagation()} aria-label={`Chọn ${emp.full_name}`} />

                                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-medium text-sm shrink-0">
                                                {emp.full_name?.charAt(0) || 'N'}
                                            </div>

                                            {/* Name - Click to open detail */}
                                            <div className="truncate shrink-0" style={{ width: getWidth('name') }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedEmployee(emp); setDetailModalOpen(true); }}
                                                    className="font-medium text-sm text-gray-900 dark:text-gray-100 hover:text-purple-600 hover:underline text-left truncate max-w-full block"
                                                >
                                                    {emp.full_name}
                                                </button>
                                            </div>

                                            {/* Role Badge - Color coded */}
                                            <div className="hidden sm:block shrink-0" style={{ width: getWidth('role') }}>
                                                <Badge className={`${getRoleBadgeColor(emp.role_type)} text-xs px-1.5 py-0.5`}>
                                                    {getRoleLabel(emp.role_type)}
                                                </Badge>
                                            </div>

                                            {/* Phone */}
                                            <div className="hidden md:block shrink-0" style={{ width: getWidth('phone') }}>
                                                <button
                                                    onClick={(e) => handleCallEmployee(emp.phone, e)}
                                                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 hover:underline truncate max-w-full block"
                                                    aria-label={`Gọi ${emp.phone || 'không có số'}`}
                                                >
                                                    {emp.phone || '--'}
                                                </button>
                                            </div>

                                            {/* Email */}
                                            <div className="hidden lg:block truncate shrink-0" style={{ width: getWidth('email') }}>
                                                <button
                                                    onClick={(e) => handleEmailEmployee(emp.email, e)}
                                                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 hover:underline truncate block max-w-full"
                                                    aria-label={`Gửi email đến ${emp.email || 'không có email'}`}
                                                >
                                                    {emp.email || '--'}
                                                </button>
                                            </div>

                                            {/* Address */}
                                            <div className="hidden xl:block truncate shrink-0" style={{ width: getWidth('address') }} title={emp.address || 'Chưa có địa chỉ'}>
                                                <span className="text-sm text-gray-500 dark:text-gray-400">{emp.address || '--'}</span>
                                            </div>

                                            {/* Hired Date */}
                                            <div className="hidden lg:block shrink-0" style={{ width: getWidth('joinedDate') }}>
                                                <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(emp.joined_date)}</span>
                                            </div>

                                            {/* Status Badge - fills remaining space (Gmail-style) */}
                                            <div className="hidden md:flex flex-1 items-center">
                                                <Badge className={`${emp.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'} text-xs px-1.5 py-0.5`} title={emp.is_active ? 'Đang hoạt động' : 'Đã nghỉ'}>
                                                    {emp.is_active ? 'HĐ' : 'Nghỉ'}
                                                </Badge>
                                            </div>

                                            {/* Desktop actions - Gmail-style overlay */}
                                            <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pl-6 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex bg-gradient-to-l ${selectedIds.includes(emp.id) ? 'from-blue-50 via-blue-50' : 'from-gray-50 via-gray-50'} to-transparent`}>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 bg-white/80 hover:bg-white" onClick={(e) => handleCallEmployee(emp.phone, e)} aria-label="Gọi điện"><IconPhone className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 bg-white/80 hover:bg-white" onClick={(e) => handleEmailEmployee(emp.email, e)} aria-label="Gửi email"><IconMail className="h-4 w-4" /></Button>
                                                <PermissionGate module="hr" action="edit">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 bg-white/80 hover:bg-white" onClick={(e) => handleEditEmployee(emp, e)} aria-label="Chỉnh sửa"><IconEdit className="h-4 w-4" /></Button>
                                                </PermissionGate>
                                                <PermissionGate module="hr" action="delete">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 bg-white/80 hover:bg-white text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => handleDeleteEmployee(emp, e)} aria-label="Xóa"><IconTrash className="h-4 w-4" /></Button>
                                                </PermissionGate>
                                            </div>

                                            {/* Mobile dropdown */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden" onClick={(e) => e.stopPropagation()} aria-label="Menu hành động">
                                                        <IconDotsVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={(e) => handleCallEmployee(emp.phone, e as any)}>
                                                        <IconPhone className="mr-2 h-4 w-4" />Gọi điện
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={(e) => handleEmailEmployee(emp.email, e as any)}>
                                                        <IconMail className="mr-2 h-4 w-4" />Gửi email
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <PermissionGate module="hr" action="edit">
                                                        <DropdownMenuItem onClick={() => handleEditEmployee(emp)}>
                                                            <IconEdit className="mr-2 h-4 w-4" />Chỉnh sửa
                                                        </DropdownMenuItem>
                                                    </PermissionGate>
                                                    <PermissionGate module="hr" action="delete">
                                                        <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteEmployee(emp)}>
                                                            <IconTrash className="mr-2 h-4 w-4" />Xóa
                                                        </DropdownMenuItem>
                                                    </PermissionGate>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    ))
                                )}
                            </div>


                            {employees.length > 0 && (
                                <div className="flex items-center justify-between p-3 border-t bg-gray-50 dark:bg-gray-900/50 dark:bg-gray-800/50 text-sm text-gray-500 dark:text-gray-400">
                                    <span>{selectedIds.length > 0 ? `${selectedIds.length} đã chọn` : `${employees.length} NV`}</span>
                                </div>
                            )}
                        </Card>
                    </TabsContent>
                    <TabsContent value="assignments"><AssignmentTab /></TabsContent>
                    <TabsContent value="timesheets"><TimeSheetTab /></TabsContent>
                    <TabsContent value="payroll"><PayrollTab /></TabsContent>
                    <TabsContent value="leave"><LeaveTab /></TabsContent>
                </Tabs>
            </motion.div>

            {/* Modals */}
            <EmployeeFormModal
                open={formModalOpen}
                onOpenChange={setFormModalOpen}
                employee={selectedEmployee}
                mode={modalMode}
            />
            <DeleteEmployeeModal
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                employee={selectedEmployee}
            />

            {/* Bulk Delete Confirmation Modal */}
            {
                bulkDeleteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Xác nhận xóa nhiều nhân viên</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                Bạn có chắc chắn muốn xóa <strong>{selectedIds.length}</strong> nhân viên đã chọn?
                                Hành động này không thể hoàn tác.
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setBulkDeleteModalOpen(false)}
                                    disabled={bulkDeleteMutation.isPending}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={confirmBulkDelete}
                                    disabled={bulkDeleteMutation.isPending}
                                >
                                    {bulkDeleteMutation.isPending ? 'Đang xóa...' : `Xóa ${selectedIds.length} NV`}
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Employee Detail Modal */}
            <EmployeeDetailModal
                open={detailModalOpen}
                onOpenChange={setDetailModalOpen}
                employee={selectedEmployee}
                onEdit={(emp) => {
                    setSelectedEmployee(emp);
                    setModalMode('edit');
                    setFormModalOpen(true);
                }}
            />

            {/* Professional Export Dialog */}
            <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                onExport={handleHRExport}
                defaultFilename={hrExportConfig.filename}
                title="Xuất báo cáo Nhân sự"
                isExporting={isExporting}
            />
        </div >
    );
}
