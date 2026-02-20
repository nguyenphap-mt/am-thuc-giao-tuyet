'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { IconUser, IconPhone, IconMail, IconCash, IconId, IconBuildingBank, IconLoader2, IconLock, IconCopy, IconCheck, IconRefresh, IconShieldLock } from '@tabler/icons-react';
import { Employee, EmployeePayload } from '@/types';

interface EmployeeFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee?: Employee | null;
    mode: 'create' | 'edit';
}

const ROLE_TYPES = [
    { value: 'WAITER', label: 'Phục vụ' },
    { value: 'CHEF', label: 'Đầu bếp' },
    { value: 'KITCHEN', label: 'Nhân viên bếp' },
    { value: 'DRIVER', label: 'Tài xế' },
    { value: 'LEAD', label: 'Trưởng nhóm' },
    { value: 'MANAGER', label: 'Quản lý' },
];

const SYSTEM_ROLES = [
    { value: 'staff', label: 'Nhân viên (Staff)' },
    { value: 'manager', label: 'Quản lý (Manager)' },
    { value: 'admin', label: 'Admin' },
];

const initialFormData: EmployeePayload = {
    full_name: '',
    role_type: 'WAITER',
    phone: '',
    email: '',
    is_fulltime: false,
    hourly_rate: 50000,
    base_salary: 0,  // Monthly salary for fulltime
    is_active: true,
    id_number: '',
    date_of_birth: '',
    address: '',
    bank_account: '',
    bank_name: '',
    emergency_contact: '',
    notes: '',
    // Login account fields
    create_account: true,
    login_email: '',
    login_password: 'GiaoTuyet@2026',
    login_role: 'staff',
    // Per-employee payroll config (undefined = use tenant default)
    allowance_meal: undefined,
    allowance_transport: undefined,
    allowance_phone: undefined,
    allowance_other: undefined,
    insurance_salary_base: undefined,
    rate_social_override: undefined,
    rate_health_override: undefined,
    rate_unemployment_override: undefined,
};

export default function EmployeeFormModal({
    open,
    onOpenChange,
    employee,
    mode,
}: EmployeeFormModalProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<EmployeePayload>(initialFormData);
    const [copied, setCopied] = useState(false);
    const [resetResult, setResetResult] = useState<string | null>(null);

    useEffect(() => {
        setResetResult(null);
        if (mode === 'edit' && employee) {
            setFormData({
                full_name: employee.full_name || '',
                role_type: employee.role_type || 'WAITER',
                phone: employee.phone || '',
                email: employee.email || '',
                is_fulltime: employee.is_fulltime || false,
                hourly_rate: employee.hourly_rate || 50000,
                base_salary: employee.base_salary || 0,
                is_active: employee.is_active ?? true,
                id_number: employee.id_number || '',
                date_of_birth: employee.date_of_birth || '',
                address: employee.address || '',
                bank_account: employee.bank_account || '',
                bank_name: employee.bank_name || '',
                emergency_contact: employee.emergency_contact || '',
                notes: employee.notes || '',
                create_account: false,
                login_role: employee.login_role || 'staff',
            });
        } else {
            setFormData(initialFormData);
        }
    }, [mode, employee, open]);

    const generatePassword = () => {
        const pw = `GiaoTuyet@${new Date().getFullYear()}`;
        handleChange('login_password', pw);
    };

    const copyPassword = () => {
        if (formData.login_password) {
            navigator.clipboard.writeText(formData.login_password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const createMutation = useMutation({
        mutationFn: async (data: EmployeePayload) => {
            return api.post('/hr/employees', data);
        },
        onSuccess: () => {
            toast.success('Thêm nhân viên thành công!');
            // P2: Onboarding Quick-Setup guidance
            setTimeout(() => {
                toast.info('Bước tiếp: Phân công nhân viên vào đơn hàng hoặc thiết lập lịch làm việc', {
                    duration: 6000,
                    description: '→ Vào tab "Phân công" để gán nhân viên vào đơn hàng',
                });
            }, 1000);
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            onOpenChange(false);
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Không thể thêm nhân viên');
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (data: EmployeePayload) => {
            return api.put(`/hr/employees/${employee?.id}`, data);
        },
        onSuccess: () => {
            toast.success('Cập nhật nhân viên thành công!');
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            onOpenChange(false);
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Không thể cập nhật nhân viên');
        },
    });

    const resetPasswordMutation = useMutation({
        mutationFn: async () => {
            return api.post(`/hr/employees/${employee?.id}/reset-password`, {});
        },
        onSuccess: (data: any) => {
            const newPw = data?.new_password || `GiaoTuyet@${new Date().getFullYear()}`;
            setResetResult(newPw);
            toast.success('Đã đặt lại mật khẩu thành công!');
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Không thể đặt lại mật khẩu');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.full_name.trim()) {
            toast.error('Vui lòng nhập họ tên nhân viên');
            return;
        }

        if (mode === 'create') {
            createMutation.mutate(formData);
        } else {
            updateMutation.mutate(formData);
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    const handleChange = (field: keyof EmployeePayload, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <IconUser className="h-5 w-5" />
                        {mode === 'create' ? 'Thêm nhân viên mới' : 'Chỉnh sửa nhân viên'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Basic Info Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="full_name" className="flex items-center gap-1">
                                <IconUser className="h-4 w-4" />
                                Họ và tên <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="full_name"
                                value={formData.full_name}
                                onChange={(e) => handleChange('full_name', e.target.value)}
                                placeholder="Nguyễn Văn A"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role_type">Vị trí</Label>
                            <Select
                                value={formData.role_type}
                                onValueChange={(value) => handleChange('role_type', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn vị trí" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ROLE_TYPES.map((role) => (
                                        <SelectItem key={role.value} value={role.value}>
                                            {role.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone" className="flex items-center gap-1">
                                <IconPhone className="h-4 w-4" />
                                Số điện thoại
                            </Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                placeholder="0901234567"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="flex items-center gap-1">
                                <IconMail className="h-4 w-4" />
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                placeholder="email@example.com"
                            />
                        </div>
                    </div>

                    {/* Employment Info */}
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Thông tin công việc</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="hourly_rate" className="flex items-center gap-1">
                                    <IconCash className="h-4 w-4" />
                                    Lương theo giờ (VND)
                                </Label>
                                <Input
                                    id="hourly_rate"
                                    type="number"
                                    value={formData.hourly_rate}
                                    onChange={(e) => handleChange('hourly_rate', Number(e.target.value))}
                                    placeholder="50000"
                                />
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="is_fulltime"
                                        checked={formData.is_fulltime}
                                        onCheckedChange={(checked) => handleChange('is_fulltime', checked)}
                                    />
                                    <Label htmlFor="is_fulltime" className="cursor-pointer">
                                        Nhân viên toàn thời gian
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="is_active"
                                        checked={formData.is_active}
                                        onCheckedChange={(checked) => handleChange('is_active', checked)}
                                    />
                                    <Label htmlFor="is_active" className="cursor-pointer">
                                        Đang hoạt động
                                    </Label>
                                </div>
                            </div>

                            {/* Base Salary - Only for fulltime employees */}
                            {formData.is_fulltime && (
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="base_salary" className="flex items-center gap-1">
                                        <IconCash className="h-4 w-4 text-purple-600" />
                                        Lương cơ bản tháng (VND)
                                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Cho nhân viên toàn thời gian)</span>
                                    </Label>
                                    <Input
                                        id="base_salary"
                                        type="number"
                                        value={formData.base_salary}
                                        onChange={(e) => handleChange('base_salary', Number(e.target.value))}
                                        placeholder="10000000"
                                        className="border-purple-200 focus:border-purple-500"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Nhập mức lương cố định hàng tháng. Hệ thống sẽ dùng lương này thay vì lương theo giờ.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Personal Info */}
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Thông tin cá nhân</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="id_number" className="flex items-center gap-1">
                                    <IconId className="h-4 w-4" />
                                    CCCD/CMND
                                </Label>
                                <Input
                                    id="id_number"
                                    value={formData.id_number}
                                    onChange={(e) => handleChange('id_number', e.target.value)}
                                    placeholder="012345678901"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="date_of_birth">Ngày sinh</Label>
                                <Input
                                    id="date_of_birth"
                                    type="date"
                                    value={formData.date_of_birth}
                                    onChange={(e) => handleChange('date_of_birth', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="address">Địa chỉ</Label>
                                <Input
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    placeholder="123 Đường ABC, Quận 1, TP.HCM"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bank Info */}
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Thông tin ngân hàng</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="bank_name" className="flex items-center gap-1">
                                    <IconBuildingBank className="h-4 w-4" />
                                    Ngân hàng
                                </Label>
                                <Input
                                    id="bank_name"
                                    value={formData.bank_name}
                                    onChange={(e) => handleChange('bank_name', e.target.value)}
                                    placeholder="Vietcombank"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bank_account">Số tài khoản</Label>
                                <Input
                                    id="bank_account"
                                    value={formData.bank_account}
                                    onChange={(e) => handleChange('bank_account', e.target.value)}
                                    placeholder="0123456789"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Emergency & Notes */}
                    <div className="border-t pt-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="emergency_contact">Liên hệ khẩn cấp</Label>
                                <Input
                                    id="emergency_contact"
                                    value={formData.emergency_contact}
                                    onChange={(e) => handleChange('emergency_contact', e.target.value)}
                                    placeholder="Tên - SĐT người thân"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Ghi chú</Label>
                                <Textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => handleChange('notes', e.target.value)}
                                    placeholder="Ghi chú thêm..."
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Login Account Section */}
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                            <IconLock className="h-4 w-4 text-green-500" />
                            Tài khoản đăng nhập
                        </h4>

                        {/* CASE 1: Edit mode + HAS account → Show management UI */}
                        {mode === 'edit' && employee?.has_login_account ? (
                            <div className="space-y-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-xs font-medium text-emerald-700">Đã liên kết tài khoản</span>
                                </div>

                                {/* Email - readonly */}
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-500">Email đăng nhập</Label>
                                    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-md border text-sm text-gray-700">
                                        <IconMail className="h-4 w-4 text-gray-400" />
                                        {employee.login_email || employee.email || '—'}
                                    </div>
                                </div>

                                {/* Role + Active row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-gray-500">Vai trò hệ thống</Label>
                                        <Select
                                            value={formData.login_role || employee.login_role || 'staff'}
                                            onValueChange={(value) => handleChange('login_role', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Chọn vai trò" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SYSTEM_ROLES.map((role) => (
                                                    <SelectItem key={role.value} value={role.value}>
                                                        {role.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-gray-500">Trạng thái tài khoản</Label>
                                        <div className="flex items-center gap-2 h-10 px-3 bg-white rounded-md border">
                                            <div className={`h-2 w-2 rounded-full ${employee.account_active !== false ? 'bg-green-500' : 'bg-red-400'}`}></div>
                                            <span className="text-sm">{employee.account_active !== false ? 'Hoạt động' : 'Đã khóa'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Reset Password */}
                                <div className="pt-2 border-t border-emerald-200">
                                    {resetResult ? (
                                        <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-md border border-amber-200">
                                            <IconShieldLock className="h-4 w-4 text-amber-600" />
                                            <span className="text-sm text-amber-800 font-mono">{resetResult}</span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 ml-auto"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(resetResult);
                                                    setCopied(true);
                                                    setTimeout(() => setCopied(false), 2000);
                                                }}
                                            >
                                                {copied ? <IconCheck className="h-4 w-4 text-green-500" /> : <IconCopy className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="text-amber-700 border-amber-300 hover:bg-amber-50"
                                            onClick={() => resetPasswordMutation.mutate()}
                                            disabled={resetPasswordMutation.isPending}
                                        >
                                            {resetPasswordMutation.isPending ? (
                                                <IconLoader2 className="h-4 w-4 animate-spin mr-1" />
                                            ) : (
                                                <IconRefresh className="h-4 w-4 mr-1" />
                                            )}
                                            Đặt lại mật khẩu
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* CASE 2: Create mode OR Edit without account → Create toggle */
                            <>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-gray-500">
                                        {mode === 'edit' ? 'Nhân viên chưa có tài khoản' : 'Tạo tài khoản cùng lúc'}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="create_account" className="text-xs text-gray-500">Tạo tài khoản</Label>
                                        <Switch
                                            id="create_account"
                                            checked={formData.create_account ?? (mode === 'create')}
                                            onCheckedChange={(v) => handleChange('create_account', v)}
                                        />
                                    </div>
                                </div>

                                {formData.create_account && (
                                    <div className="space-y-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                        <div className="space-y-2">
                                            <Label htmlFor="login_email" className="flex items-center gap-1">
                                                <IconMail className="h-4 w-4" />
                                                Email đăng nhập <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="login_email"
                                                type="email"
                                                value={formData.login_email || ''}
                                                onChange={(e) => handleChange('login_email', e.target.value)}
                                                placeholder="nhanvien@giaotuyet.com"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label htmlFor="login_password">Mật khẩu <span className="text-red-500">*</span></Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        id="login_password"
                                                        value={formData.login_password || ''}
                                                        onChange={(e) => handleChange('login_password', e.target.value)}
                                                        placeholder="Mật khẩu"
                                                    />
                                                    <Button type="button" variant="outline" size="icon" onClick={copyPassword} title="Sao chép mật khẩu">
                                                        {copied ? <IconCheck className="h-4 w-4 text-green-500" /> : <IconCopy className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-gray-500">
                                                    Mặc định: GiaoTuyet@{new Date().getFullYear()}.
                                                    <button type="button" onClick={generatePassword} className="ml-1 text-purple-600 hover:underline">Tạo lại</button>
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="login_role">Vai trò hệ thống <span className="text-red-500">*</span></Label>
                                                <Select
                                                    value={formData.login_role || 'staff'}
                                                    onValueChange={(value) => handleChange('login_role', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Chọn vai trò" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {SYSTEM_ROLES.map((role) => (
                                                            <SelectItem key={role.value} value={role.value}>
                                                                {role.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Payroll Config Section - Only for fulltime employees */}
                    {formData.is_fulltime && (
                        <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <h4 className="font-medium text-purple-800 flex items-center gap-2">
                                <IconCash className="h-4 w-4" />
                                Cài đặt lương & phụ cấp riêng
                            </h4>
                            <p className="text-xs text-purple-600 mb-2">
                                Để trống = dùng cài đặt công ty mặc định
                            </p>

                            {/* Allowances */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Phụ cấp ăn (VND)</Label>
                                    <Input
                                        type="number"
                                        value={formData.allowance_meal ?? ''}
                                        onChange={(e) => handleChange('allowance_meal', e.target.value ? Number(e.target.value) : undefined)}
                                        placeholder="500,000"
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Phụ cấp xăng (VND)</Label>
                                    <Input
                                        type="number"
                                        value={formData.allowance_transport ?? ''}
                                        onChange={(e) => handleChange('allowance_transport', e.target.value ? Number(e.target.value) : undefined)}
                                        placeholder="300,000"
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Phụ cấp ĐT (VND)</Label>
                                    <Input
                                        type="number"
                                        value={formData.allowance_phone ?? ''}
                                        onChange={(e) => handleChange('allowance_phone', e.target.value ? Number(e.target.value) : undefined)}
                                        placeholder="200,000"
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Phụ cấp khác (VND)</Label>
                                    <Input
                                        type="number"
                                        value={formData.allowance_other ?? ''}
                                        onChange={(e) => handleChange('allowance_other', e.target.value ? Number(e.target.value) : undefined)}
                                        placeholder="0"
                                        className="h-8 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Insurance Config */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-purple-200">
                                <div className="space-y-1 md:col-span-2">
                                    <Label className="text-xs">Lương đóng BHXH (VND)</Label>
                                    <Input
                                        type="number"
                                        value={formData.insurance_salary_base ?? ''}
                                        onChange={(e) => handleChange('insurance_salary_base', e.target.value ? Number(e.target.value) : undefined)}
                                        placeholder="Để trống = dùng Gross"
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">% BHXH</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={formData.rate_social_override ? formData.rate_social_override * 100 : ''}
                                        onChange={(e) => handleChange('rate_social_override', e.target.value ? Number(e.target.value) / 100 : undefined)}
                                        placeholder="8%"
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">% BHYT</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={formData.rate_health_override ? formData.rate_health_override * 100 : ''}
                                        onChange={(e) => handleChange('rate_health_override', e.target.value ? Number(e.target.value) / 100 : undefined)}
                                        placeholder="1.5%"
                                        className="h-8 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">% BHTN</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={formData.rate_unemployment_override ? formData.rate_unemployment_override * 100 : ''}
                                        onChange={(e) => handleChange('rate_unemployment_override', e.target.value ? Number(e.target.value) / 100 : undefined)}
                                        placeholder="1%"
                                        className="h-8 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isPending}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"
                        >
                            {isPending ? (
                                <>
                                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : mode === 'create' ? (
                                'Thêm nhân viên'
                            ) : (
                                'Lưu thay đổi'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
