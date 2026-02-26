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
import { IconCalendar, IconLoader2, IconBeach, IconAlertTriangle } from '@tabler/icons-react';

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
    is_half_day?: boolean;
    half_day_period?: 'MORNING' | 'AFTERNOON';
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
        is_half_day: false,
        half_day_period: undefined,
    });

    // Overlap detection: fetch approved requests
    interface ApprovedRequest { start_date: string; end_date: string; leave_type_name: string; }
    const { data: approvedRequests } = useQuery({
        queryKey: ['leave-approved', isEmployeeSelfService],
        queryFn: async () => {
            const endpoint = isEmployeeSelfService ? '/hr/leave/self/my-requests' : '/hr/leave/my-requests';
            const all = await api.get<any[]>(endpoint);
            return (all || []).filter((r: any) => r.status === 'APPROVED') as ApprovedRequest[];
        },
        enabled: open,
    });

    // Compute overlap warnings
    const overlapWarnings = (() => {
        if (!formData.start_date || !approvedRequests?.length) return [];
        const reqStart = new Date(formData.start_date);
        const reqEnd = formData.end_date ? new Date(formData.end_date) : reqStart;
        return approvedRequests.filter(r => {
            const aStart = new Date(r.start_date);
            const aEnd = new Date(r.end_date);
            return reqStart <= aEnd && reqEnd >= aStart;
        });
    })();

    // [SELF-SERVICE] Use current user info from auth store (no HR-only API call needed)
    // BUGFIX: BUG-20260226-004 — was calling /hr/employees which returns 403 for non-HR users
    const currentEmployeeId = isEmployeeSelfService ? String(user?.id || '') : '';
    const currentEmployeeName = isEmployeeSelfService ? (user?.full_name || user?.email || '') : '';

    // Auto-fill employee_id when in self-service mode
    useEffect(() => {
        if (isEmployeeSelfService && currentEmployeeId) {
            setFormData(prev => {
                if (prev.employee_id === currentEmployeeId) return prev; // Prevent re-render
                return { ...prev, employee_id: currentEmployeeId };
            });
        }
    }, [isEmployeeSelfService, currentEmployeeId]);

    // Fetch employees for dropdown (HR mode only)
    const { data: employees } = useQuery({
        queryKey: ['employees-for-leave'],
        queryFn: async () => {
            const result = await api.get<{ items: Employee[] } | Employee[]>('/hr/employees?is_active=true&limit=100');
            return Array.isArray(result) ? result : result.items || [];
        },
        enabled: open && !isEmployeeSelfService,
    });

    // Fetch leave types — use self-service for non-HR users
    const { data: leaveTypes } = useQuery({
        queryKey: ['leave-types', isEmployeeSelfService],
        queryFn: async () => {
            const endpoint = isEmployeeSelfService ? '/hr/leave/self/types' : '/hr/leave/types';
            return await api.get<LeaveType[]>(endpoint);
        },
        enabled: open,
    });

    const createMutation = useMutation({
        mutationFn: async (data: LeaveRequestPayload) => {
            if (isEmployeeSelfService) {
                // Self-service: POST without employee_id
                const { employee_id, ...selfPayload } = data;
                return api.post('/hr/leave/self/my-requests', selfPayload);
            }
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
            is_half_day: false,
            half_day_period: undefined,
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
                                    <div className="h-10 w-10 rounded-full bg-accent-gradient-br to-purple-500 flex items-center justify-center text-white font-medium">
                                        {user?.full_name?.charAt(0) || 'N'}
                                    </div>
                                    <div>
                                        <p className="font-medium">{user?.full_name || currentEmployeeName || 'Nhân viên'}</p>
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
                                onChange={(e) => {
                                    handleChange('start_date', e.target.value);
                                    if (formData.is_half_day) handleChange('end_date', e.target.value);
                                }}
                                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent"
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
                                disabled={formData.is_half_day}
                                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {/* Half-day Toggle */}
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50/50">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.is_half_day || false}
                                onChange={(e) => {
                                    const halfDay = e.target.checked;
                                    setFormData(prev => ({
                                        ...prev,
                                        is_half_day: halfDay,
                                        half_day_period: halfDay ? 'MORNING' : undefined,
                                        end_date: halfDay ? prev.start_date : prev.end_date,
                                    }));
                                }}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                        </label>
                        <span className="text-sm font-medium text-gray-700">
                            Nghỉ nửa ngày (0.5 ngày)
                        </span>
                        {formData.is_half_day && (
                            <div className="flex gap-2 ml-auto">
                                <label className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${formData.half_day_period === 'MORNING'
                                    ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="half_day_period"
                                        value="MORNING"
                                        checked={formData.half_day_period === 'MORNING'}
                                        onChange={() => setFormData(prev => ({ ...prev, half_day_period: 'MORNING' }))}
                                        className="sr-only"
                                    />
                                    Buổi sáng
                                </label>
                                <label className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${formData.half_day_period === 'AFTERNOON'
                                    ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="half_day_period"
                                        value="AFTERNOON"
                                        checked={formData.half_day_period === 'AFTERNOON'}
                                        onChange={() => setFormData(prev => ({ ...prev, half_day_period: 'AFTERNOON' }))}
                                        className="sr-only"
                                    />
                                    Buổi chiều
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Overlap Warning */}
                    {overlapWarnings.length > 0 && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                            <IconAlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-700">
                                <p className="font-medium">⚠️ Trùng lịch nghỉ phép!</p>
                                {overlapWarnings.map((r, i) => (
                                    <p key={i} className="text-xs mt-0.5">
                                        Bạn đã có đơn nghỉ &quot;{r.leave_type_name}&quot; từ {new Date(r.start_date).toLocaleDateString('vi-VN')} đến {new Date(r.end_date).toLocaleDateString('vi-VN')}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}

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
                            className="bg-accent-gradient"
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
