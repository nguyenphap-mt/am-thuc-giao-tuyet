'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { IconCalendar, IconLoader2, IconBeach } from '@tabler/icons-react';

interface Employee {
    id: string;
    full_name: string;
}

interface LeaveType {
    id: string;
    code: string;
    name: string;
    days_per_year: number;
}

interface CreateLeaveRequestModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isEmployeeSelfService?: boolean; // NEW: If true, auto-fill current user's employee_id
}

interface LeaveRequestPayload {
    employee_id: string;
    leave_type_code: string;
    start_date: string;
    end_date: string;
    reason: string;
}

export default function CreateLeaveRequestModal({
    open,
    onOpenChange,
    isEmployeeSelfService = false,
}: CreateLeaveRequestModalProps) {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [formData, setFormData] = useState<LeaveRequestPayload>({
        employee_id: '',
        leave_type_code: '',
        start_date: '',
        end_date: '',
        reason: '',
    });

    // [SELF-SERVICE] Fetch current user's employee record
    const { data: currentEmployee } = useQuery({
        queryKey: ['current-employee', user?.email],
        queryFn: async () => {
            const result = await api.get<{ items: Employee[] } | Employee[]>(`/hr/employees?is_active=true&limit=100`);
            const employees = Array.isArray(result) ? result : result.items || [];
            // Find employee matching current user's email
            return employees.find(e =>
                e.full_name?.toLowerCase().includes(user?.full_name?.split(' ').pop()?.toLowerCase() || '')
            ) || employees[0]; // Fallback to first employee if not found
        },
        enabled: open && isEmployeeSelfService,
    });

    // Auto-fill employee_id when in self-service mode
    useEffect(() => {
        if (isEmployeeSelfService && currentEmployee) {
            setFormData(prev => ({ ...prev, employee_id: currentEmployee.id }));
        }
    }, [isEmployeeSelfService, currentEmployee]);

    // Fetch employees for dropdown (HR mode only)
    const { data: employees } = useQuery({
        queryKey: ['employees-for-leave'],
        queryFn: async () => {
            const result = await api.get<{ items: Employee[] } | Employee[]>('/hr/employees?is_active=true&limit=100');
            return Array.isArray(result) ? result : result.items || [];
        },
        enabled: open && !isEmployeeSelfService,
    });

    // Fetch leave types
    const { data: leaveTypes } = useQuery({
        queryKey: ['leave-types'],
        queryFn: async () => {
            return await api.get<LeaveType[]>('/hr/leave/types');
        },
        enabled: open,
    });

    const createMutation = useMutation({
        mutationFn: async (data: LeaveRequestPayload) => {
            return api.post('/hr/leave/requests', data);
        },
        onSuccess: () => {
            toast.success('Tạo đơn nghỉ phép thành công!');
            queryClient.invalidateQueries({ queryKey: ['hr', 'leave'] });
            onOpenChange(false);
            resetForm();
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Không thể tạo đơn nghỉ phép');
        },
    });

    const resetForm = () => {
        setFormData({
            employee_id: '',
            leave_type_code: '',
            start_date: '',
            end_date: '',
            reason: '',
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.employee_id) {
            toast.error('Vui lòng chọn nhân viên');
            return;
        }
        if (!formData.leave_type_code) {
            toast.error('Vui lòng chọn loại nghỉ phép');
            return;
        }
        if (!formData.start_date || !formData.end_date) {
            toast.error('Vui lòng chọn ngày bắt đầu và kết thúc');
            return;
        }
        if (new Date(formData.start_date) > new Date(formData.end_date)) {
            toast.error('Ngày kết thúc phải sau ngày bắt đầu');
            return;
        }

        createMutation.mutate(formData);
    };

    const handleChange = (field: keyof LeaveRequestPayload, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <IconBeach className="h-5 w-5 text-blue-600" />
                        Tạo đơn nghỉ phép
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Employee Selection */}
                    <div className="space-y-2">
                        <Label>Nhân viên <span className="text-red-500">*</span></Label>
                        {isEmployeeSelfService ? (
                            /* Self-Service Mode: Show current user's info (read-only) */
                            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md border">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-medium">
                                        {user?.full_name?.charAt(0) || 'N'}
                                    </div>
                                    <div>
                                        <p className="font-medium">{user?.full_name || currentEmployee?.full_name || 'Nhân viên'}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* HR Mode: Show dropdown to select any employee */
                            <Select
                                value={formData.employee_id}
                                onValueChange={(value) => handleChange('employee_id', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn nhân viên..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {(employees || []).map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            {emp.full_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* Leave Type Selection */}
                    <div className="space-y-2">
                        <Label>Loại nghỉ phép <span className="text-red-500">*</span></Label>
                        <Select
                            value={formData.leave_type_code}
                            onValueChange={(value) => handleChange('leave_type_code', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn loại nghỉ phép..." />
                            </SelectTrigger>
                            <SelectContent>
                                {(leaveTypes || []).map((type) => (
                                    <SelectItem key={type.id} value={type.code}>
                                        {type.name} ({type.days_per_year} ngày/năm)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                                <IconCalendar className="h-4 w-4" />
                                Từ ngày <span className="text-red-500">*</span>
                            </Label>
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => handleChange('start_date', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                                <IconCalendar className="h-4 w-4" />
                                Đến ngày <span className="text-red-500">*</span>
                            </Label>
                            <input
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => handleChange('end_date', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="space-y-2">
                        <Label>Lý do</Label>
                        <Textarea
                            value={formData.reason}
                            onChange={(e) => handleChange('reason', e.target.value)}
                            placeholder="Nhập lý do nghỉ phép..."
                            rows={3}
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={createMutation.isPending}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"
                        >
                            {createMutation.isPending ? (
                                <>
                                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : (
                                'Tạo đơn nghỉ phép'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
