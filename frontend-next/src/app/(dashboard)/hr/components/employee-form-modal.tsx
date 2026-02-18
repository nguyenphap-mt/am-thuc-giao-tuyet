'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    IconUser, IconBriefcase, IconLock, IconCopy, IconCheck, IconLoader2,
    IconBuildingBank, IconAlertTriangle, IconNotes,
} from '@tabler/icons-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface EmployeeFormData {
    full_name: string;
    role_type: string;
    phone: string;
    email: string;
    is_fulltime: boolean;
    hourly_rate: number;
    base_salary: number;
    id_number: string;
    date_of_birth: string;
    address: string;
    // Bank info
    bank_name: string;
    bank_account: string;
    // Extra
    emergency_contact: string;
    notes: string;
    // Login account
    create_account: boolean;
    login_email: string;
    login_password: string;
    login_role: string;
}

const INITIAL_FORM: EmployeeFormData = {
    full_name: '',
    role_type: 'WAITER',
    phone: '',
    email: '',
    is_fulltime: false,
    hourly_rate: 0,
    base_salary: 0,
    id_number: '',
    date_of_birth: '',
    address: '',
    bank_name: '',
    bank_account: '',
    emergency_contact: '',
    notes: '',
    create_account: true,
    login_email: '',
    login_password: '',
    login_role: 'staff',
};

const ROLE_TYPES = [
    { value: 'CHEF', label: 'Đầu bếp' },
    { value: 'WAITER', label: 'Phục vụ' },
    { value: 'DRIVER', label: 'Tài xế' },
    { value: 'MANAGER', label: 'Quản lý' },
    { value: 'BARTENDER', label: 'Pha chế' },
    { value: 'OTHER', label: 'Khác' },
];

const SYSTEM_ROLES = [
    { value: 'staff', label: 'Nhân viên (Staff)' },
    { value: 'manager', label: 'Quản lý (Manager)' },
    { value: 'admin', label: 'Admin' },
];

function generatePassword(): string {
    return `GiaoTuyet@${new Date().getFullYear()}`;
}

interface EmployeeFormModalProps {
    open: boolean;
    onClose: () => void;
}

export function EmployeeFormModal({ open, onClose }: EmployeeFormModalProps) {
    const [form, setForm] = useState<EmployeeFormData>({ ...INITIAL_FORM, login_password: generatePassword() });
    const [copied, setCopied] = useState(false);
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: (payload: Record<string, unknown>) => api.post('/hr/employees', payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast.success('Thêm nhân viên thành công!');
            handleClose();
        },
        onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
            const msg = err?.response?.data?.detail || 'Không thể thêm nhân viên';
            toast.error(msg);
        },
    });

    const handleClose = () => {
        setForm({ ...INITIAL_FORM, login_password: generatePassword() });
        setCopied(false);
        onClose();
    };

    const handleSubmit = () => {
        if (!form.full_name.trim()) {
            toast.error('Vui lòng nhập họ tên');
            return;
        }
        if (form.create_account && !form.login_email.trim()) {
            toast.error('Vui lòng nhập email đăng nhập');
            return;
        }
        if (form.create_account && form.login_password.length < 8) {
            toast.error('Mật khẩu phải ít nhất 8 ký tự');
            return;
        }

        const payload: Record<string, unknown> = {
            full_name: form.full_name,
            role_type: form.role_type,
            phone: form.phone || null,
            email: form.email || form.login_email || null,
            is_fulltime: form.is_fulltime,
            hourly_rate: form.hourly_rate,
            base_salary: form.base_salary,
            id_number: form.id_number || null,
            date_of_birth: form.date_of_birth || null,
            address: form.address || null,
            bank_name: form.bank_name || null,
            bank_account: form.bank_account || null,
            emergency_contact: form.emergency_contact || null,
            notes: form.notes || null,
        };

        if (form.create_account) {
            payload.login_email = form.login_email;
            payload.login_password = form.login_password;
            payload.login_role = form.login_role;
        }

        createMutation.mutate(payload);
    };

    const copyPassword = () => {
        navigator.clipboard.writeText(form.login_password);
        setCopied(true);
        toast.success('Đã copy mật khẩu');
        setTimeout(() => setCopied(false), 2000);
    };

    const updateField = <K extends keyof EmployeeFormData>(key: K, value: EmployeeFormData[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">Thêm nhân viên mới</DialogTitle>
                    <DialogDescription>
                        Nhập thông tin nhân viên và tài khoản đăng nhập
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    {/* Section 1: Personal Info */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <IconUser className="h-4 w-4 text-purple-500" />
                            Thông tin cá nhân
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="sm:col-span-2">
                                <Label htmlFor="full_name">Họ tên <span className="text-red-500">*</span></Label>
                                <Input
                                    id="full_name"
                                    value={form.full_name}
                                    onChange={(e) => updateField('full_name', e.target.value)}
                                    placeholder="Nguyễn Văn A"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="phone">Số điện thoại</Label>
                                <Input
                                    id="phone"
                                    value={form.phone}
                                    onChange={(e) => updateField('phone', e.target.value)}
                                    placeholder="0901234567"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="id_number">CCCD/CMND</Label>
                                <Input
                                    id="id_number"
                                    value={form.id_number}
                                    onChange={(e) => updateField('id_number', e.target.value)}
                                    placeholder="012345678901"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="date_of_birth">Ngày sinh</Label>
                                <Input
                                    id="date_of_birth"
                                    type="date"
                                    value={form.date_of_birth}
                                    onChange={(e) => updateField('date_of_birth', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="address">Địa chỉ</Label>
                                <Input
                                    id="address"
                                    value={form.address}
                                    onChange={(e) => updateField('address', e.target.value)}
                                    placeholder="123 Đường ABC, HCM"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Employment Info */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <IconBriefcase className="h-4 w-4 text-blue-500" />
                            Thông tin công việc
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <Label>Chức vụ <span className="text-red-500">*</span></Label>
                                <Select value={form.role_type} onValueChange={(v) => updateField('role_type', v)}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Chọn chức vụ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLE_TYPES.map(r => (
                                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end gap-4">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={form.is_fulltime}
                                        onCheckedChange={(v) => updateField('is_fulltime', v)}
                                    />
                                    <Label className="text-sm">{form.is_fulltime ? 'Full-time' : 'Part-time'}</Label>
                                </div>
                            </div>
                            {form.is_fulltime ? (
                                <div>
                                    <Label htmlFor="base_salary">Lương cơ bản (VNĐ/tháng)</Label>
                                    <Input
                                        id="base_salary"
                                        type="number"
                                        value={form.base_salary || ''}
                                        onChange={(e) => updateField('base_salary', Number(e.target.value))}
                                        placeholder="5,000,000"
                                        className="mt-1"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <Label htmlFor="hourly_rate">Lương giờ (VNĐ/giờ)</Label>
                                    <Input
                                        id="hourly_rate"
                                        type="number"
                                        value={form.hourly_rate || ''}
                                        onChange={(e) => updateField('hourly_rate', Number(e.target.value))}
                                        placeholder="50,000"
                                        className="mt-1"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 3: Bank Info */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <IconBuildingBank className="h-4 w-4 text-amber-500" />
                            Thông tin ngân hàng
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="bank_name">Ngân hàng</Label>
                                <Input
                                    id="bank_name"
                                    value={form.bank_name}
                                    onChange={(e) => updateField('bank_name', e.target.value)}
                                    placeholder="Vietcombank"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="bank_account">Số tài khoản</Label>
                                <Input
                                    id="bank_account"
                                    value={form.bank_account}
                                    onChange={(e) => updateField('bank_account', e.target.value)}
                                    placeholder="0123456789"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Emergency Contact & Notes */}
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="emergency_contact" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <IconAlertTriangle className="h-4 w-4 text-red-400" />
                                Liên hệ khẩn cấp
                            </Label>
                            <Input
                                id="emergency_contact"
                                value={form.emergency_contact}
                                onChange={(e) => updateField('emergency_contact', e.target.value)}
                                placeholder="Tên - SĐT người thân"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="notes" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <IconNotes className="h-4 w-4 text-gray-400" />
                                Ghi chú
                            </Label>
                            <Textarea
                                id="notes"
                                value={form.notes}
                                onChange={(e) => updateField('notes', e.target.value)}
                                placeholder="Ghi chú thêm..."
                                className="mt-1 min-h-[80px]"
                            />
                        </div>
                    </div>

                    {/* Section 5: Login Account */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <IconLock className="h-4 w-4 text-green-500" />
                                Tài khoản đăng nhập
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={form.create_account}
                                    onCheckedChange={(v) => updateField('create_account', v)}
                                />
                                <span className="text-xs text-gray-500">{form.create_account ? 'Tạo tài khoản' : 'Không tạo'}</span>
                            </div>
                        </div>

                        {form.create_account && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border">
                                <div className="sm:col-span-2">
                                    <Label htmlFor="login_email">Email đăng nhập <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="login_email"
                                        type="email"
                                        value={form.login_email}
                                        onChange={(e) => updateField('login_email', e.target.value)}
                                        placeholder="nhanvien@giatuyet.com"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="login_password">Mật khẩu <span className="text-red-500">*</span></Label>
                                    <div className="flex gap-1 mt-1">
                                        <Input
                                            id="login_password"
                                            value={form.login_password}
                                            onChange={(e) => updateField('login_password', e.target.value)}
                                            className="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={copyPassword}
                                            title="Copy mật khẩu"
                                        >
                                            {copied ? <IconCheck className="h-4 w-4 text-green-500" /> : <IconCopy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Mật khẩu mặc định. Nhân viên có thể đổi sau.</p>
                                </div>
                                <div>
                                    <Label>Vai trò hệ thống <span className="text-red-500">*</span></Label>
                                    <Select value={form.login_role} onValueChange={(v) => updateField('login_role', v)}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SYSTEM_ROLES.map(r => (
                                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={handleClose}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={createMutation.isPending}
                        className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90"
                    >
                        {createMutation.isPending && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {createMutation.isPending ? 'Đang tạo...' : 'Thêm nhân viên'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
