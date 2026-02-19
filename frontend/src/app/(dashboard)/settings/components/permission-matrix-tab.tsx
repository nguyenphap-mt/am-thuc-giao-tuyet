'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    IconShieldCheck, IconPlus, IconDeviceFloppy,
    IconRefresh, IconLoader2, IconLock, IconSearch,
    IconLayoutDashboard, IconToolsKitchen2, IconFileInvoice,
    IconTruckDelivery, IconCalendar, IconShoppingCart,
    IconBuildingWarehouse, IconUsers, IconCoin, IconUserCircle,
    IconChartBar, IconPencil, IconTrash, IconDotsVertical,
    IconChecks, IconX, IconAlertTriangle
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

// Types
interface RoleData {
    id: string;
    code: string;
    name: string;
    description?: string;
    permissions: string[];
    is_system: boolean;
}

// Module icon mapping (UI-04 fix)
const MODULE_ICONS: Record<string, React.ReactNode> = {
    dashboard: <IconLayoutDashboard className="h-4 w-4" />,
    menu: <IconToolsKitchen2 className="h-4 w-4" />,
    quote: <IconFileInvoice className="h-4 w-4" />,
    order: <IconTruckDelivery className="h-4 w-4" />,
    calendar: <IconCalendar className="h-4 w-4" />,
    procurement: <IconShoppingCart className="h-4 w-4" />,
    inventory: <IconBuildingWarehouse className="h-4 w-4" />,
    hr: <IconUsers className="h-4 w-4" />,
    finance: <IconCoin className="h-4 w-4" />,
    crm: <IconUserCircle className="h-4 w-4" />,
    analytics: <IconChartBar className="h-4 w-4" />,
    user: <IconUsers className="h-4 w-4" />,
    settings: <IconShieldCheck className="h-4 w-4" />,
};

// Module color mapping for left border (UI-01 fix)
const MODULE_COLORS: Record<string, string> = {
    dashboard: '#8b5cf6',
    menu: '#f59e0b',
    quote: '#3b82f6',
    order: '#10b981',
    calendar: '#06b6d4',
    procurement: '#f97316',
    inventory: '#84cc16',
    hr: '#ec4899',
    finance: '#6366f1',
    crm: '#14b8a6',
    analytics: '#a855f7',
    user: '#ef4444',
    settings: '#78716c',
};

// Permission module definitions
const PERMISSION_MODULES = [
    { module: 'dashboard', label: 'Dashboard', actions: ['view'] },
    { module: 'menu', label: 'Thực đơn', actions: ['view', 'create', 'edit', 'delete', 'set_price', 'view_cost'] },
    { module: 'quote', label: 'Báo giá', actions: ['view', 'create', 'edit', 'delete', 'convert', 'clone', 'export'] },
    { module: 'order', label: 'Đơn hàng', actions: ['view', 'create', 'edit', 'delete', 'confirm', 'cancel', 'update_status'] },
    { module: 'calendar', label: 'Lịch', actions: ['view', 'create', 'edit', 'assign_staff', 'check_in'] },
    { module: 'procurement', label: 'Mua hàng', actions: ['view', 'create', 'edit', 'delete', 'approve_po', 'record_payment'] },
    { module: 'inventory', label: 'Kho hàng', actions: ['view', 'create', 'edit', 'delete', 'stock_transfer'] },
    { module: 'hr', label: 'Nhân sự', actions: ['view', 'create', 'edit', 'delete', 'view_salary', 'view_detail', 'check_in_out', 'approve', 'reject', 'view_leave', 'approve_leave', 'view_payroll', 'process_payroll', 'approve_payroll'] },
    { module: 'finance', label: 'Tài chính', actions: ['view', 'create', 'edit', 'delete', 'post_journal', 'close_period'] },
    { module: 'crm', label: 'Khách hàng', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'analytics', label: 'Phân tích', actions: ['view', 'export'] },
    { module: 'user', label: 'Quản lý user', actions: ['view', 'create', 'edit', 'delete', 'manage_roles'] },
    { module: 'settings', label: 'Cài đặt', actions: ['view', 'edit'] },
];

const ACTION_LABELS: Record<string, string> = {
    view: 'Xem',
    create: 'Tạo',
    edit: 'Sửa',
    delete: 'Xóa',
    manage_roles: 'Quản lý vai trò',
    convert: 'Chuyển đổi',
    clone: 'Nhân bản',
    export: 'Xuất',
    confirm: 'Xác nhận',
    cancel: 'Hủy',
    update_status: 'Cập nhật TT',
    assign_staff: 'Phân công',
    check_in: 'Check-in',
    approve_po: 'Duyệt PO',
    record_payment: 'Thanh toán',
    stock_transfer: 'Xuất/Nhập kho',
    view_salary: 'Xem lương',
    view_detail: 'Xem chi tiết',
    check_in_out: 'Check-in/out',
    approve: 'Duyệt',
    reject: 'Từ chối',
    view_leave: 'Xem nghỉ phép',
    approve_leave: 'Duyệt nghỉ phép',
    view_payroll: 'Xem lương',
    process_payroll: 'Tính lương',
    approve_payroll: 'Duyệt lương',
    post_journal: 'Đăng bút toán',
    close_period: 'Đóng kỳ',
    set_price: 'Đặt giá',
    view_cost: 'Xem giá vốn',
};

// Tooltips for permission actions (UX-06 fix)
const ACTION_TOOLTIPS: Record<string, string> = {
    view: 'Cho phép xem danh sách và chi tiết',
    create: 'Cho phép tạo mới bản ghi',
    edit: 'Cho phép chỉnh sửa bản ghi',
    delete: 'Cho phép xóa bản ghi',
    manage_roles: 'Cho phép quản lý vai trò và phân quyền',
    convert: 'Cho phép chuyển đổi báo giá thành đơn hàng',
    clone: 'Cho phép nhân bản (copy) bản ghi',
    export: 'Cho phép xuất dữ liệu ra file',
    confirm: 'Cho phép xác nhận đơn hàng',
    cancel: 'Cho phép hủy đơn hàng',
    update_status: 'Cho phép cập nhật trạng thái',
    assign_staff: 'Cho phép phân công nhân viên',
    check_in: 'Cho phép check-in sự kiện',
    approve_po: 'Cho phép duyệt đơn mua hàng',
    record_payment: 'Cho phép ghi nhận thanh toán',
    stock_transfer: 'Cho phép xuất/nhập kho hàng',
    view_salary: 'Cho phép xem thông tin lương nhân viên',
    view_detail: 'Cho phép xem chi tiết chấm công',
    check_in_out: 'Cho phép chấm công vào/ra cho nhân viên',
    approve: 'Cho phép duyệt bản chấm công',
    reject: 'Cho phép từ chối bản chấm công',
    view_leave: 'Cho phép xem danh sách đơn nghỉ phép',
    approve_leave: 'Cho phép duyệt/từ chối đơn nghỉ phép',
    view_payroll: 'Cho phép xem bảng lương',
    process_payroll: 'Cho phép chạy tính lương hàng tháng',
    approve_payroll: 'Cho phép duyệt bảng lương',
    post_journal: 'Cho phép đăng bút toán vào sổ',
    close_period: 'Cho phép đóng kỳ kế toán',
    set_price: 'Cho phép thiết lập giá bán',
    view_cost: 'Cho phép xem giá vốn nguyên liệu',
};

const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.03 } }
};
const itemVariants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

export function PermissionMatrixTab() {
    const [roles, setRoles] = useState<RoleData[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    // Permission state: { roleId: Set<'module:action'> }
    const [permissionMap, setPermissionMap] = useState<Record<string, Set<string>>>({});
    const [originalMap, setOriginalMap] = useState<Record<string, Set<string>>>({});

    // Search/filter (UX-01 fix)
    const [searchQuery, setSearchQuery] = useState('');

    // Role modal (shared for Create + Edit) (FE-02 fix)
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState<RoleData | null>(null);
    const [roleForm, setRoleForm] = useState({ code: '', name: '', description: '' });
    const [submittingRole, setSubmittingRole] = useState(false);

    // Delete confirm (FE-01 fix)
    const [deleteTarget, setDeleteTarget] = useState<RoleData | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Navigate-away warning (FE-06 fix)
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (dirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [dirty]);

    // Filtered modules (UX-01 fix)
    const filteredModules = useMemo(() => {
        if (!searchQuery.trim()) return PERMISSION_MODULES;
        const q = searchQuery.toLowerCase();
        return PERMISSION_MODULES.filter(m =>
            m.label.toLowerCase().includes(q) ||
            m.module.toLowerCase().includes(q) ||
            m.actions.some(a => (ACTION_LABELS[a] || a).toLowerCase().includes(q))
        );
    }, [searchQuery]);

    const fetchRoles = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.get<RoleData[]>('/roles/');
            setRoles(data);

            // Build permission map
            const pMap: Record<string, Set<string>> = {};
            data.forEach(role => {
                const perms = new Set<string>();
                (role.permissions || []).forEach(p => {
                    if (p === 'ALL') {
                        PERMISSION_MODULES.forEach(m => {
                            m.actions.forEach(a => perms.add(`${m.module}:${a}`));
                        });
                        perms.add('ALL');
                    } else if (p.endsWith(':*')) {
                        const mod = p.replace(':*', '');
                        const modDef = PERMISSION_MODULES.find(m => m.module === mod);
                        if (modDef) {
                            modDef.actions.forEach(a => perms.add(`${mod}:${a}`));
                        }
                        perms.add(p);
                    } else {
                        perms.add(p);
                    }
                });
                pMap[role.id] = perms;
            });

            setPermissionMap(pMap);
            const oCopy: Record<string, Set<string>> = {};
            Object.entries(pMap).forEach(([k, v]) => { oCopy[k] = new Set(v); });
            setOriginalMap(oCopy);
            setDirty(false);
        } catch (err) {
            console.error('Failed to fetch roles:', err);
            toast.error('Không thể tải danh sách vai trò');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRoles(); }, [fetchRoles]);

    const togglePermission = (roleId: string, permKey: string) => {
        setPermissionMap(prev => {
            const copy = { ...prev };
            const perms = new Set(copy[roleId] || new Set());
            if (perms.has(permKey)) {
                perms.delete(permKey);
            } else {
                perms.add(permKey);
            }
            copy[roleId] = perms;
            return copy;
        });
        setDirty(true);
    };

    // Select All per module (UX-02 fix)
    const toggleModuleAll = (roleId: string, moduleCode: string) => {
        const mod = PERMISSION_MODULES.find(m => m.module === moduleCode);
        if (!mod) return;

        setPermissionMap(prev => {
            const copy = { ...prev };
            const perms = new Set(copy[roleId] || new Set());
            const allKeys = mod.actions.map(a => `${moduleCode}:${a}`);
            const allChecked = allKeys.every(k => perms.has(k));

            if (allChecked) {
                allKeys.forEach(k => perms.delete(k));
            } else {
                allKeys.forEach(k => perms.add(k));
            }
            copy[roleId] = perms;
            return copy;
        });
        setDirty(true);
    };

    // Select All per role (UX-03 fix)
    const toggleRoleAll = (roleId: string) => {
        setPermissionMap(prev => {
            const copy = { ...prev };
            const perms = new Set(copy[roleId] || new Set());
            const allKeys = PERMISSION_MODULES.flatMap(m => m.actions.map(a => `${m.module}:${a}`));
            const allChecked = allKeys.every(k => perms.has(k));

            if (allChecked) {
                allKeys.forEach(k => perms.delete(k));
            } else {
                allKeys.forEach(k => perms.add(k));
            }
            copy[roleId] = perms;
            return copy;
        });
        setDirty(true);
    };

    // Check if all permissions for a module are checked for a role
    const isModuleAllChecked = (roleId: string, moduleCode: string): boolean => {
        const mod = PERMISSION_MODULES.find(m => m.module === moduleCode);
        if (!mod) return false;
        const perms = permissionMap[roleId] || new Set();
        return mod.actions.every(a => perms.has(`${moduleCode}:${a}`));
    };

    const isModuleSomeChecked = (roleId: string, moduleCode: string): boolean => {
        const mod = PERMISSION_MODULES.find(m => m.module === moduleCode);
        if (!mod) return false;
        const perms = permissionMap[roleId] || new Set();
        const checked = mod.actions.filter(a => perms.has(`${moduleCode}:${a}`));
        return checked.length > 0 && checked.length < mod.actions.length;
    };

    // Check if all permissions for a role are checked
    const isRoleAllChecked = (roleId: string): boolean => {
        const perms = permissionMap[roleId] || new Set();
        return PERMISSION_MODULES.every(m =>
            m.actions.every(a => perms.has(`${m.module}:${a}`))
        );
    };

    const isRoleSomeChecked = (roleId: string): boolean => {
        const perms = permissionMap[roleId] || new Set();
        const total = PERMISSION_MODULES.reduce((sum, m) => sum + m.actions.length, 0);
        const checked = PERMISSION_MODULES.reduce((sum, m) =>
            sum + m.actions.filter(a => perms.has(`${m.module}:${a}`)).length, 0);
        return checked > 0 && checked < total;
    };

    // Save with parallel optimization (FE-05 fix)
    const handleSave = async () => {
        try {
            setSaving(true);

            const promises: Promise<any>[] = [];
            for (const role of roles) {
                if (role.code === 'super_admin') continue;

                const currentPerms = permissionMap[role.id] || new Set();
                const originalPerms = originalMap[role.id] || new Set();

                const currentArr = Array.from(currentPerms).filter(p => !p.endsWith(':*') && p !== 'ALL').sort();
                const originalArr = Array.from(originalPerms).filter(p => !p.endsWith(':*') && p !== 'ALL').sort();

                if (JSON.stringify(currentArr) !== JSON.stringify(originalArr)) {
                    const compressed: string[] = [];
                    const remaining = new Set(currentArr);

                    PERMISSION_MODULES.forEach(mod => {
                        const allActions = mod.actions.map(a => `${mod.module}:${a}`);
                        const allSelected = allActions.every(a => remaining.has(a));

                        if (allSelected && allActions.length > 1) {
                            compressed.push(`${mod.module}:*`);
                            allActions.forEach(a => remaining.delete(a));
                        }
                    });

                    remaining.forEach(p => compressed.push(p));
                    promises.push(api.put(`/roles/${role.id}/permissions`, { permissions: compressed }));
                }
            }

            if (promises.length > 0) {
                const results = await Promise.allSettled(promises);
                const failures = results.filter(r => r.status === 'rejected');
                if (failures.length > 0) {
                    toast.error(`${failures.length} vai trò không thể cập nhật`);
                } else {
                    toast.success('Đã cập nhật phân quyền thành công');
                }
            } else {
                toast.info('Không có thay đổi nào cần lưu');
            }

            setDirty(false);
            fetchRoles();
        } catch (err: any) {
            const msg = err?.response?.data?.detail || 'Không thể lưu phân quyền';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        const oCopy: Record<string, Set<string>> = {};
        Object.entries(originalMap).forEach(([k, v]) => { oCopy[k] = new Set(v); });
        setPermissionMap(oCopy);
        setDirty(false);
    };

    // Create / Edit role (FE-02 fix — shared modal)
    const openCreateRole = () => {
        setEditingRole(null);
        setRoleForm({ code: '', name: '', description: '' });
        setShowRoleModal(true);
    };

    const openEditRole = (role: RoleData) => {
        setEditingRole(role);
        setRoleForm({ code: role.code, name: role.name, description: role.description || '' });
        setShowRoleModal(true);
    };

    const handleSubmitRole = async () => {
        if (!roleForm.name.trim()) {
            toast.error('Vui lòng nhập tên vai trò');
            return;
        }
        if (!editingRole && !roleForm.code.trim()) {
            toast.error('Vui lòng nhập mã vai trò');
            return;
        }

        try {
            setSubmittingRole(true);

            if (editingRole) {
                // Update role
                await api.put(`/roles/${editingRole.id}`, {
                    name: roleForm.name,
                    description: roleForm.description || undefined,
                });
                toast.success(`Đã cập nhật vai trò "${roleForm.name}"`);
            } else {
                // Create role
                await api.post('/roles/', {
                    code: roleForm.code.toLowerCase().replace(/\s+/g, '_'),
                    name: roleForm.name,
                    description: roleForm.description || undefined,
                    permissions: ['dashboard:view']
                });
                toast.success(`Đã tạo vai trò "${roleForm.name}"`);
            }

            setShowRoleModal(false);
            setRoleForm({ code: '', name: '', description: '' });
            setEditingRole(null);
            fetchRoles();
        } catch (err: any) {
            const msg = err?.response?.data?.detail || 'Không thể thực hiện thao tác';
            toast.error(msg);
        } finally {
            setSubmittingRole(false);
        }
    };

    // Delete role (FE-01 fix)
    const handleDeleteRole = async () => {
        if (!deleteTarget) return;

        try {
            setDeleting(true);
            await api.delete(`/roles/${deleteTarget.id}`);
            toast.success(`Đã xóa vai trò "${deleteTarget.name}"`);
            setDeleteTarget(null);
            fetchRoles();
        } catch (err: any) {
            const msg = err?.response?.data?.detail || 'Không thể xóa vai trò';
            toast.error(msg);
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <TooltipProvider delayDuration={200}>
            <motion.div className="space-y-4" variants={containerVariants} initial="hidden" animate="show">
                {/* Header Actions */}
                <motion.div variants={itemVariants}>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center">
                                        <IconShieldCheck className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Ma trận phân quyền</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {roles.length} vai trò · {PERMISSION_MODULES.length} modules
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={openCreateRole}
                                    >
                                        <IconPlus className="mr-1 h-4 w-4" />
                                        Thêm vai trò
                                    </Button>
                                    {dirty && (
                                        <>
                                            <Button variant="outline" size="sm" onClick={handleReset}>
                                                <IconRefresh className="mr-1 h-4 w-4" />
                                                Hoàn tác
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={handleSave}
                                                disabled={saving}
                                                className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 transition-opacity"
                                            >
                                                {saving ? (
                                                    <IconLoader2 className="mr-1 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <IconDeviceFloppy className="mr-1 h-4 w-4" />
                                                )}
                                                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Search Bar (UX-01 fix) */}
                <motion.div variants={itemVariants}>
                    <div className="relative">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <Input
                            placeholder="Tìm module (Dashboard, Tài chính, Xem, Tạo...)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-10 bg-white focus-visible:ring-purple-500"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 dark:text-gray-600 transition-colors"
                            >
                                <IconX className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* Permission Matrix Table */}
                <motion.div variants={itemVariants}>
                    <Card className="border-0 shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    {/* Sticky Header (UI-03 fix) */}
                                    <thead className="sticky top-0 z-20 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                                        <tr className="border-b">
                                            <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400 min-w-[200px] sticky left-0 bg-white z-30">
                                                Module
                                            </th>
                                            <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400 min-w-[80px] sticky left-[200px] bg-white z-30">
                                                Quyền
                                            </th>
                                            {roles.map(role => (
                                                <th key={role.id} className="text-center p-3 min-w-[110px]">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className="flex items-center gap-1">
                                                            <Badge className={`text-xs ${role.code === 'super_admin'
                                                                ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white'
                                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                                                }`}>
                                                                {role.name}
                                                            </Badge>
                                                            {/* Role actions dropdown (FE-01 + FE-02) */}
                                                            {!role.is_system && (
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <button className="p-0.5 rounded hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 dark:text-gray-600 transition-colors">
                                                                            <IconDotsVertical className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="w-40">
                                                                        <DropdownMenuItem onClick={() => openEditRole(role)}>
                                                                            <IconPencil className="mr-2 h-4 w-4" />
                                                                            Sửa vai trò
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            onClick={() => setDeleteTarget(role)}
                                                                            className="text-red-600 focus:text-red-600"
                                                                        >
                                                                            <IconTrash className="mr-2 h-4 w-4" />
                                                                            Xóa vai trò
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            )}
                                                        </div>
                                                        {role.is_system && (
                                                            <span className="text-[10px] text-gray-400 dark:text-gray-500">Hệ thống</span>
                                                        )}
                                                        {/* Select All per role (UX-03 fix) */}
                                                        {role.code !== 'super_admin' && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div className="mt-0.5">
                                                                        <Checkbox
                                                                            checked={isRoleAllChecked(role.id)}
                                                                            // @ts-ignore - indeterminate support
                                                                            data-state={isRoleSomeChecked(role.id) ? 'indeterminate' : isRoleAllChecked(role.id) ? 'checked' : 'unchecked'}
                                                                            onCheckedChange={() => toggleRoleAll(role.id)}
                                                                            className="h-3.5 w-3.5 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                                                        />
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Chọn/bỏ tất cả quyền</TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredModules.length === 0 && (
                                            <tr>
                                                <td colSpan={2 + roles.length} className="text-center py-12 text-gray-400 dark:text-gray-500">
                                                    <IconSearch className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                                    <p>Không tìm thấy module nào khớp "{searchQuery}"</p>
                                                </td>
                                            </tr>
                                        )}
                                        {filteredModules.map((mod, mIdx) => (
                                            mod.actions.map((action, aIdx) => (
                                                <tr
                                                    key={`${mod.module}:${action}`}
                                                    className={`
                                                        border-b last:border-b-0
                                                        ${aIdx === 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''}
                                                        hover:bg-purple-50/30 transition-colors group
                                                    `}
                                                    style={aIdx === 0 ? {
                                                        borderLeftWidth: '3px',
                                                        borderLeftColor: MODULE_COLORS[mod.module] || '#9ca3af',
                                                        borderLeftStyle: 'solid'
                                                    } : {
                                                        borderLeftWidth: '3px',
                                                        borderLeftColor: (MODULE_COLORS[mod.module] || '#9ca3af') + '40',
                                                        borderLeftStyle: 'solid'
                                                    }}
                                                >
                                                    {/* Module name + Select All (first row only) */}
                                                    <td className={`p-3 sticky left-0 bg-white group-hover:bg-purple-50/30 z-10 transition-colors ${aIdx === 0 ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500 text-xs pl-8'}`}>
                                                        {aIdx === 0 ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-gray-500 dark:text-gray-400">
                                                                    {MODULE_ICONS[mod.module] || <IconShieldCheck className="h-4 w-4" />}
                                                                </span>
                                                                {mod.label}
                                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal ml-1">
                                                                    ({mod.actions.length})
                                                                </span>
                                                            </div>
                                                        ) : ''}
                                                    </td>

                                                    {/* Action label with tooltip */}
                                                    <td className="p-3 text-gray-600 dark:text-gray-400 text-xs sticky left-[200px] bg-white group-hover:bg-purple-50/30 z-10 transition-colors">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="cursor-help border-b border-dashed border-gray-300 dark:border-gray-600">
                                                                    {ACTION_LABELS[action] || action}
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="right">
                                                                {ACTION_TOOLTIPS[action] || action}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </td>

                                                    {/* Permission toggles */}
                                                    {roles.map(role => {
                                                        const permKey = `${mod.module}:${action}`;
                                                        const isSuperAdmin = role.code === 'super_admin';
                                                        const isChecked = isSuperAdmin || (permissionMap[role.id]?.has(permKey) ?? false);

                                                        // If first action row, show module-level select all
                                                        if (aIdx === 0 && !isSuperAdmin) {
                                                            const moduleAllChecked = isModuleAllChecked(role.id, mod.module);
                                                            const moduleSomeChecked = isModuleSomeChecked(role.id, mod.module);
                                                            return (
                                                                <td key={role.id} className="p-3 text-center">
                                                                    <div className="flex items-center justify-center gap-1.5">
                                                                        {/* Module-level select all (UX-02 fix) */}
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <button
                                                                                    onClick={() => toggleModuleAll(role.id, mod.module)}
                                                                                    className={`p-0.5 rounded transition-colors ${moduleAllChecked
                                                                                        ? 'text-purple-600 hover:text-purple-800'
                                                                                        : moduleSomeChecked
                                                                                            ? 'text-purple-400 hover:text-purple-600'
                                                                                            : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:text-gray-400'
                                                                                        }`}
                                                                                >
                                                                                    <IconChecks className="h-3.5 w-3.5" />
                                                                                </button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                {moduleAllChecked ? 'Bỏ chọn tất cả' : 'Chọn tất cả'} quyền {mod.label}
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                        <Checkbox
                                                                            checked={isChecked}
                                                                            onCheckedChange={() => togglePermission(role.id, permKey)}
                                                                            className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                                                        />
                                                                    </div>
                                                                </td>
                                                            );
                                                        }

                                                        return (
                                                            <td key={role.id} className="p-3 text-center">
                                                                {isSuperAdmin ? (
                                                                    <div className="flex items-center justify-center">
                                                                        <IconLock className="h-4 w-4 text-purple-400" />
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center justify-center">
                                                                        <Checkbox
                                                                            checked={isChecked}
                                                                            onCheckedChange={() => togglePermission(role.id, permKey)}
                                                                            className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Dirty indicator */}
                <AnimatePresence>
                    {dirty && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="fixed bottom-6 right-6 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-3 z-50"
                        >
                            <span className="text-sm font-medium">Có thay đổi chưa lưu</span>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={handleReset}
                                className="bg-white/20 hover:bg-white/30 text-white h-7"
                            >
                                Hoàn tác
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-white/20 hover:bg-white/30 text-white h-7"
                            >
                                {saving ? 'Đang lưu...' : 'Lưu ngay'}
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Create/Edit Role Modal (FE-02 fix) */}
                <Dialog open={showRoleModal} onOpenChange={setShowRoleModal}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {editingRole ? 'Chỉnh sửa vai trò' : 'Tạo vai trò mới'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingRole
                                    ? `Cập nhật thông tin cho vai trò "${editingRole.name}"`
                                    : 'Thêm vai trò tùy chỉnh cho hệ thống'
                                }
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            {!editingRole && (
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">
                                        Mã vai trò <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        placeholder="vd: supervisor"
                                        value={roleForm.code}
                                        onChange={(e) => setRoleForm(f => ({ ...f, code: e.target.value }))}
                                        className="h-10 focus-visible:ring-purple-500"
                                    />
                                    <p className="text-xs text-gray-400 dark:text-gray-500">Mã code duy nhất, viết thường, không dấu</p>
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium">
                                    Tên vai trò <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    placeholder="vd: Giám sát viên"
                                    value={roleForm.name}
                                    onChange={(e) => setRoleForm(f => ({ ...f, name: e.target.value }))}
                                    className="h-10 focus-visible:ring-purple-500"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium">Mô tả</Label>
                                <Input
                                    placeholder="Mô tả ngắn về vai trò..."
                                    value={roleForm.description}
                                    onChange={(e) => setRoleForm(f => ({ ...f, description: e.target.value }))}
                                    className="h-10 focus-visible:ring-purple-500"
                                />
                            </div>
                        </div>
                        <DialogFooter className="flex gap-2 sm:justify-end">
                            <Button variant="outline" onClick={() => setShowRoleModal(false)} disabled={submittingRole}>
                                Hủy
                            </Button>
                            <Button
                                onClick={handleSubmitRole}
                                disabled={submittingRole}
                                className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 transition-opacity"
                            >
                                {submittingRole ? (
                                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : editingRole ? (
                                    <IconDeviceFloppy className="mr-2 h-4 w-4" />
                                ) : (
                                    <IconPlus className="mr-2 h-4 w-4" />
                                )}
                                {submittingRole
                                    ? (editingRole ? 'Đang cập nhật...' : 'Đang tạo...')
                                    : (editingRole ? 'Cập nhật' : 'Tạo vai trò')
                                }
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirm Modal (FE-01 fix) */}
                <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600">
                                <IconAlertTriangle className="h-5 w-5" />
                                Xóa vai trò
                            </DialogTitle>
                            <DialogDescription>
                                Bạn có chắc chắn muốn xóa vai trò <strong>"{deleteTarget?.name}"</strong>?
                                Hành động này không thể hoàn tác.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="flex gap-2 sm:justify-end">
                            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                                Hủy
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteRole}
                                disabled={deleting}
                            >
                                {deleting ? (
                                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <IconTrash className="mr-2 h-4 w-4" />
                                )}
                                {deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </motion.div>
        </TooltipProvider>
    );
}
