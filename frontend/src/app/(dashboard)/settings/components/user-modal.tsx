'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    IconCheck,
    IconLoader2,
    IconMail,
    IconUser,
    IconPhone,
    IconShieldCheck,
    IconLock,
    IconEye,
    IconEyeOff,
    IconCopy,
    IconRefresh,
    IconArrowRight,
    IconInfoCircle,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { UserItem, RoleOption } from '@/types/user';
import { getRoleCode } from '@/types/user';
import Link from 'next/link';

interface UserModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: UserItem | null; // null = create, non-null = edit
    roles: RoleOption[];
    onSaved: () => void;
}

// Default password generator
function generateDefaultPassword(): string {
    return `GiaoTuyet@${new Date().getFullYear()}`;
}

export function UserModal({ open, onOpenChange, user, roles, onSaved }: UserModalProps) {
    const isEdit = !!user;

    const [form, setForm] = useState({
        email: '',
        full_name: '',
        phone_number: '',
        role_code: 'staff',
        password: '',
        is_active: true,
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState(false);

    // Reset form when modal opens
    useEffect(() => {
        if (open) {
            if (user) {
                setForm({
                    email: user.email || '',
                    full_name: user.full_name || '',
                    phone_number: user.phone_number || '',
                    role_code: getRoleCode(user.role),
                    password: '',
                    is_active: user.is_active,
                });
            } else {
                setForm({
                    email: '',
                    full_name: '',
                    phone_number: '',
                    role_code: 'staff',
                    password: generateDefaultPassword(),
                    is_active: true,
                });
            }
            setErrors({});
            setShowPassword(false);
            setCopied(false);
        }
    }, [open, user]);

    const validate = (): boolean => {
        const errs: Record<string, string> = {};

        if (!form.email.trim()) errs.email = 'Email không được để trống';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email không hợp lệ';

        if (!form.full_name.trim()) errs.full_name = 'Họ tên không được để trống';

        if (!isEdit && !form.password) errs.password = 'Mật khẩu không được để trống';
        if (form.password && form.password.length < 8) errs.password = 'Mật khẩu tối thiểu 8 ký tự';

        if (!form.role_code) errs.role_code = 'Vui lòng chọn vai trò';

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        try {
            setSaving(true);
            if (isEdit) {
                // Update user
                const updateData: Record<string, unknown> = {
                    full_name: form.full_name,
                    phone_number: form.phone_number || undefined,
                    role_code: form.role_code,
                    is_active: form.is_active,
                };
                if (form.password) updateData.password = form.password;

                await api.put(`/users/${user!.id}`, updateData);
                toast.success(`Đã cập nhật thông tin "${form.full_name}"`);
            } else {
                // Create user
                await api.post('/users', {
                    email: form.email,
                    full_name: form.full_name,
                    phone_number: form.phone_number || undefined,
                    password: form.password,
                    role_code: form.role_code,
                    is_active: form.is_active,
                });
                toast.success(`Đã tạo tài khoản "${form.full_name}"`);
            }
            onSaved();
        } catch (err: any) {
            const msg = err?.response?.data?.detail || 'Đã xảy ra lỗi';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleCopyPassword = () => {
        if (form.password) {
            navigator.clipboard.writeText(form.password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success('Đã sao chép mật khẩu');
        }
    };

    const handleRegeneratePassword = () => {
        const pw = generateDefaultPassword();
        setForm(f => ({ ...f, password: pw }));
        setErrors(e => ({ ...e, password: '' }));
    };

    // Clear field error on change
    const updateField = (field: string, value: string | boolean) => {
        setForm(f => ({ ...f, [field]: value }));
        if (errors[field]) {
            setErrors(e => ({ ...e, [field]: '' }));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isEdit ? (
                            <><IconUser className="h-5 w-5 text-accent-primary" /> Chỉnh sửa người dùng</>
                        ) : (
                            <><IconShieldCheck className="h-5 w-5 text-accent-primary" /> Tạo tài khoản mới</>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? 'Cập nhật thông tin và vai trò người dùng'
                            : 'Tạo tài khoản đăng nhập cho nhân viên'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Info Banner - only for create mode */}
                    {!isEdit && (
                        <div className="flex items-start gap-2.5 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                            <IconInfoCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                            <div className="text-xs text-blue-700 dark:text-blue-300">
                                <p>Tạo tài khoản đăng nhập hệ thống. Để tạo hồ sơ nhân viên đầy đủ (lương, ngân hàng, BHXH):</p>
                                <Link
                                    href="/hr"
                                    className="inline-flex items-center gap-1 mt-1 font-medium text-accent-primary hover:underline"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Đi tới Nhân sự <IconArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Email */}
                    <div className="space-y-1.5">
                        <Label htmlFor="user-email" className="text-sm font-medium flex items-center gap-1.5">
                            <IconMail className="h-4 w-4 text-gray-400" />
                            Email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="user-email"
                            type="email"
                            autoComplete="email"
                            placeholder="example@company.com"
                            value={form.email}
                            onChange={(e) => updateField('email', e.target.value)}
                            disabled={isEdit}
                            className={`h-10 focus-visible:ring-accent ${isEdit ? 'bg-gray-50 dark:bg-gray-800' : ''} ${errors.email ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
                        />
                        {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                    </div>

                    {/* Full Name */}
                    <div className="space-y-1.5">
                        <Label htmlFor="user-fullname" className="text-sm font-medium flex items-center gap-1.5">
                            <IconUser className="h-4 w-4 text-gray-400" />
                            Họ và tên <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="user-fullname"
                            autoComplete="name"
                            placeholder="Nguyễn Văn A"
                            value={form.full_name}
                            onChange={(e) => updateField('full_name', e.target.value)}
                            className={`h-10 focus-visible:ring-accent ${errors.full_name ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
                        />
                        {errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-1.5">
                        <Label htmlFor="user-phone" className="text-sm font-medium flex items-center gap-1.5">
                            <IconPhone className="h-4 w-4 text-gray-400" />
                            Số điện thoại
                        </Label>
                        <Input
                            id="user-phone"
                            type="tel"
                            autoComplete="tel"
                            placeholder="0901 234 567"
                            value={form.phone_number}
                            onChange={(e) => updateField('phone_number', e.target.value)}
                            className="h-10 focus-visible:ring-accent"
                        />
                    </div>

                    {/* Role and Active Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium flex items-center gap-1.5">
                                <IconShieldCheck className="h-4 w-4 text-gray-400" />
                                Vai trò <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={form.role_code}
                                onValueChange={(v) => updateField('role_code', v)}
                            >
                                <SelectTrigger className={`h-10 ${errors.role_code ? 'border-red-300' : ''}`}>
                                    <SelectValue placeholder="Chọn vai trò" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map(r => (
                                        <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.role_code && <p className="text-xs text-red-500">{errors.role_code}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">Trạng thái</Label>
                            <div className="flex items-center gap-3 h-10">
                                <Switch
                                    checked={form.is_active}
                                    onCheckedChange={(v) => updateField('is_active', v)}
                                />
                                <span className={`text-sm font-medium ${form.is_active ? 'text-green-600' : 'text-gray-400 dark:text-gray-500'}`}>
                                    {form.is_active ? 'Hoạt động' : 'Đã khóa'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <Label htmlFor="user-password" className="text-sm font-medium flex items-center gap-1.5">
                            <IconLock className="h-4 w-4 text-gray-400" />
                            {isEdit ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'}
                            {!isEdit && <span className="text-red-500"> *</span>}
                        </Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="user-password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    placeholder={isEdit ? '••••••••' : 'Tối thiểu 8 ký tự…'}
                                    value={form.password}
                                    onChange={(e) => updateField('password', e.target.value)}
                                    className={`h-10 pr-10 focus-visible:ring-accent ${errors.password ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword
                                        ? <IconEyeOff className="h-4 w-4" />
                                        : <IconEye className="h-4 w-4" />}
                                </button>
                            </div>
                            {/* Copy button */}
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 shrink-0"
                                onClick={handleCopyPassword}
                                disabled={!form.password}
                                title="Sao chép mật khẩu"
                            >
                                {copied
                                    ? <IconCheck className="h-4 w-4 text-green-500" />
                                    : <IconCopy className="h-4 w-4" />}
                            </Button>
                            {/* Regenerate button */}
                            {!isEdit && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10 shrink-0"
                                    onClick={handleRegeneratePassword}
                                    title="Tạo lại mật khẩu mặc định"
                                >
                                    <IconRefresh className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                        {!isEdit && (
                            <p className="text-xs text-gray-500">
                                Mặc định: GiaoTuyet@{new Date().getFullYear()}
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter className="flex gap-2 sm:justify-end">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="bg-accent-gradient hover:opacity-90 transition-opacity"
                    >
                        {saving ? (
                            <><IconLoader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Đang lưu…</>
                        ) : (
                            <><IconCheck className="mr-2 h-4 w-4" /> {isEdit ? 'Cập nhật' : 'Tạo mới'}</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
