'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { IconUser, IconPhone, IconMail, IconCash, IconId, IconBuildingBank, IconLoader2 } from '@tabler/icons-react';
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

    useEffect(() => {
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
            });
        } else {
            setFormData(initialFormData);
        }
    }, [mode, employee, open]);

    const createMutation = useMutation({
        mutationFn: async (data: EmployeePayload) => {
            return api.post('/hr/employees', data);
        },
        onSuccess: () => {
            toast.success('Thêm nhân viên thành công!');
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
