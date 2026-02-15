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
import { IconCheck, IconLoader2 } from '@tabler/icons-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { UserItem, RoleOption } from '@/types/user';
import { getRoleCode } from '@/types/user';

interface UserModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: UserItem | null; // null = create, non-null = edit
    roles: RoleOption[];
    onSaved: () => void;
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
                    password: '',
                    is_active: true,
                });
            }
            setErrors({});
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
                    role_code: form.role_code,
                    is_active: form.is_active,
                };
                if (form.password) updateData.password = form.password;

                await api.put(`/users/${user!.id}`, updateData);
                toast.success(`Đã cập nhật thông tin "${form.full_name}"`);
            } else {
                // Create user
                await api.post('/users/', {
                    email: form.email,
                    full_name: form.full_name,
                    password: form.password,
                    role_code: form.role_code,
                    is_active: form.is_active,
                });
                toast.success(`Đã tạo người dùng "${form.full_name}"`);
            }
            onSaved();
        } catch (err: any) {
            const msg = err?.response?.data?.detail || 'Đã xảy ra lỗi';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? 'Chỉnh sửa người dùng' : 'Thêm nhân viên mới'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? 'Cập nhật thông tin và vai trò người dùng'
                            : 'Tạo tài khoản mới cho nhân viên'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Email */}
                    <div className="space-y-1.5">
                        <Label htmlFor="user-email" className="text-sm font-medium">
                            Email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="user-email"
                            type="email"
                            autoComplete="email"
                            placeholder="example@company.com"
                            value={form.email}
                            onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                            disabled={isEdit}
                            className={`h-10 focus-visible:ring-purple-500 ${isEdit ? 'bg-gray-50 dark:bg-gray-900 dark:bg-gray-800' : ''} ${errors.email ? 'border-red-300' : ''}`}
                        />
                        {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                    </div>

                    {/* Full Name */}
                    <div className="space-y-1.5">
                        <Label htmlFor="user-fullname" className="text-sm font-medium">
                            Họ và tên <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="user-fullname"
                            autoComplete="name"
                            placeholder="Nguyễn Văn A"
                            value={form.full_name}
                            onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
                            className={`h-10 focus-visible:ring-purple-500 ${errors.full_name ? 'border-red-300' : ''}`}
                        />
                        {errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}
                    </div>

                    {/* Role and Active Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">
                                Vai trò <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={form.role_code}
                                onValueChange={(v) => setForm(f => ({ ...f, role_code: v }))}
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
                                    onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))}
                                />
                                <span className={`text-sm font-medium ${form.is_active ? 'text-green-600' : 'text-gray-400 dark:text-gray-500'}`}>
                                    {form.is_active ? 'Hoạt động' : 'Đã khóa'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <Label htmlFor="user-password" className="text-sm font-medium">
                            {isEdit ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'}
                            {!isEdit && <span className="text-red-500"> *</span>}
                        </Label>
                        <Input
                            id="user-password"
                            type="password"
                            autoComplete="new-password"
                            placeholder={isEdit ? '••••••••' : 'Tối thiểu 8 ký tự…'}
                            value={form.password}
                            onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                            className={`h-10 focus-visible:ring-purple-500 ${errors.password ? 'border-red-300' : ''}`}
                        />
                        {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                    </div>
                </div>

                <DialogFooter className="flex gap-2 sm:justify-end">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 transition-opacity"
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
