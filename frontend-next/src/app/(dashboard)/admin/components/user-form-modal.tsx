'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { IconLoader2 } from '@tabler/icons-react';
import { toast } from 'sonner';

interface UserFormData {
    full_name: string;
    email: string;
    password: string;
    role: string;
}

const INITIAL_FORM: UserFormData = {
    full_name: '',
    email: '',
    password: '',
    role: 'staff',
};

const SYSTEM_ROLES = [
    { value: 'staff', label: 'Nhân viên (Staff)' },
    { value: 'manager', label: 'Quản lý (Manager)' },
    { value: 'admin', label: 'Admin' },
    { value: 'viewer', label: 'Xem báo cáo (Viewer)' },
];

interface UserFormModalProps {
    open: boolean;
    onClose: () => void;
}

export function UserFormModal({ open, onClose }: UserFormModalProps) {
    const [form, setForm] = useState<UserFormData>({ ...INITIAL_FORM });
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: (payload: UserFormData) => api.post('/auth/register', payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast.success('Thêm người dùng thành công!');
            handleClose();
        },
        onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
            const msg = err?.response?.data?.detail || 'Không thể thêm người dùng';
            toast.error(msg);
        },
    });

    const handleClose = () => {
        setForm({ ...INITIAL_FORM });
        onClose();
    };

    const handleSubmit = () => {
        if (!form.full_name.trim()) { toast.error('Vui lòng nhập họ tên'); return; }
        if (!form.email.trim()) { toast.error('Vui lòng nhập email'); return; }
        if (form.password.length < 8) { toast.error('Mật khẩu phải ít nhất 8 ký tự'); return; }
        createMutation.mutate(form);
    };

    const updateField = <K extends keyof UserFormData>(key: K, value: UserFormData[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Thêm người dùng mới</DialogTitle>
                    <DialogDescription>Tạo tài khoản đăng nhập hệ thống</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div>
                        <Label htmlFor="user_name">Họ tên <span className="text-red-500">*</span></Label>
                        <Input id="user_name" value={form.full_name} onChange={(e) => updateField('full_name', e.target.value)} placeholder="Nguyễn Văn A" className="mt-1" />
                    </div>
                    <div>
                        <Label htmlFor="user_email">Email <span className="text-red-500">*</span></Label>
                        <Input id="user_email" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="email@giatuyet.com" className="mt-1" />
                    </div>
                    <div>
                        <Label htmlFor="user_password">Mật khẩu <span className="text-red-500">*</span></Label>
                        <Input id="user_password" type="password" value={form.password} onChange={(e) => updateField('password', e.target.value)} placeholder="Tối thiểu 8 ký tự" className="mt-1" />
                    </div>
                    <div>
                        <Label>Vai trò <span className="text-red-500">*</span></Label>
                        <Select value={form.role} onValueChange={(v) => updateField('role', v)}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {SYSTEM_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={handleClose}>Hủy</Button>
                    <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90">
                        {createMutation.isPending && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {createMutation.isPending ? 'Đang tạo...' : 'Thêm người dùng'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
