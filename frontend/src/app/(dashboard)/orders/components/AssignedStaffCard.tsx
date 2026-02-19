'use client';

import { useState } from 'react';
import {
    IconUsers,
    IconPhone,
    IconBriefcase,
    IconClock,
    IconCurrencyDong,
    IconUserPlus,
    IconChevronRight,
    IconCircleCheck,
    IconClock2,
    IconX,
    IconUser,
    IconEdit,
    IconTrash,
    IconCheck,
    IconArrowRight,
    IconCalendar
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, useReducedMotion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EmployeeProfileModal } from './EmployeeProfileModal';
import { api } from '@/lib/api';

interface StaffAssignment {
    assignment_id: string;
    employee_id: string;
    employee_name: string;
    role: string;
    is_fulltime: boolean;
    hourly_rate: number;
    planned_hours: number;
    actual_hours: number;
    cost: number;
    status: string;
    phone?: string;
    start_time?: string;
    end_time?: string;
}

interface AssignedStaffCardProps {
    orderId: string;
    assignments: StaffAssignment[];
    totalCost: number;
    totalPlannedHours: number;
    totalActualHours: number;
    onSuggestClick: () => void;
    canSuggestStaff: boolean;
    onAssignmentChanged: () => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    CONFIRMED: {
        label: 'Đã xác nhận',
        color: 'text-green-600 bg-green-50',
        icon: <IconCircleCheck className="w-3.5 h-3.5" />
    },
    PENDING: {
        label: 'Đang chờ',
        color: 'text-amber-600 bg-amber-50',
        icon: <IconClock2 className="w-3.5 h-3.5" />
    },
    ASSIGNED: {
        label: 'Đã phân công',
        color: 'text-blue-600 bg-blue-50',
        icon: <IconCircleCheck className="w-3.5 h-3.5" />
    },
    CANCELLED: {
        label: 'Đã hủy',
        color: 'text-red-600 bg-red-50',
        icon: <IconX className="w-3.5 h-3.5" />
    },
    COMPLETED: {
        label: 'Hoàn thành',
        color: 'text-blue-600 bg-blue-50',
        icon: <IconCircleCheck className="w-3.5 h-3.5" />
    }
};

const roleLabels: Record<string, string> = {
    CHEF: 'Đầu bếp',
    WAITER: 'Phục vụ',
    DRIVER: 'Tài xế',
    KITCHEN: 'Bếp',
    CAPTAIN: 'Ca trưởng',
    LEAD: 'Trưởng nhóm',
    STAFF: 'Nhân viên',
    MANAGER: 'Quản lý'
};

function formatTime(isoString?: string): string {
    if (!isoString) return '--:--';
    try {
        const d = new Date(isoString);
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
        return '--:--';
    }
}

function formatDate(isoString?: string): string {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch {
        return '';
    }
}

function extractTimeValue(isoString?: string): string {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
        return '';
    }
}

function extractDateValue(isoString?: string): string {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        return d.toISOString().split('T')[0]; // yyyy-MM-dd for input[type=date]
    } catch {
        return '';
    }
}

export function AssignedStaffCard({
    orderId,
    assignments,
    totalCost,
    totalPlannedHours,
    totalActualHours,
    onSuggestClick,
    canSuggestStaff,
    onAssignmentChanged
}: AssignedStaffCardProps) {
    const [selectedEmployee, setSelectedEmployee] = useState<{
        id: string;
        name: string;
    } | null>(null);

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDate, setEditDate] = useState('');
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');

    // Delete state
    const [deletingStaff, setDeletingStaff] = useState<StaffAssignment | null>(null);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value) + 'đ';
    };

    const getInitials = (name: string) => {
        return name.split(' ').slice(-1)[0]?.charAt(0)?.toUpperCase() || 'N';
    };

    const getAvatarGradient = (index: number) => {
        const gradients = [
            'from-purple-500 to-pink-500',
            'from-blue-500 to-cyan-500',
            'from-green-500 to-emerald-500',
            'from-orange-500 to-red-500',
            'from-indigo-500 to-purple-500',
        ];
        return gradients[index % gradients.length];
    };

    const prefersReducedMotion = useReducedMotion();

    const handleViewProfile = (employeeId: string, employeeName: string) => {
        setSelectedEmployee({ id: employeeId, name: employeeName });
    };

    const startEdit = (staff: StaffAssignment) => {
        setEditingId(staff.assignment_id);
        setEditDate(extractDateValue(staff.start_time) || new Date().toISOString().split('T')[0]);
        setEditStartTime(extractTimeValue(staff.start_time) || '08:00');
        setEditEndTime(extractTimeValue(staff.end_time) || '16:00');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditDate('');
        setEditStartTime('');
        setEditEndTime('');
    };

    // Build ISO datetime from editDate + time string
    const buildDatetime = (timeStr: string): string => {
        const dateStr = editDate || new Date().toISOString().split('T')[0];
        return `${dateStr}T${timeStr}:00`;
    };

    // Calculate hours between two time strings
    const calcHours = (start: string, end: string): number => {
        if (!start || !end) return 0;
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        return diff > 0 ? diff / 60 : 0;
    };

    // PUT /hr/assignments/{id}
    const updateMutation = useMutation({
        mutationFn: async ({ assignmentId, startTime, endTime }: { assignmentId: string; startTime: string; endTime: string }) => {
            return api.put(`/hr/assignments/${assignmentId}`, {
                start_time: buildDatetime(startTime),
                end_time: buildDatetime(endTime),
            });
        },
        onSuccess: () => {
            toast.success('Đã cập nhật giờ phân công');
            cancelEdit();
            onAssignmentChanged();
        },
        onError: () => {
            toast.error('Lỗi khi cập nhật giờ phân công');
        }
    });

    // DELETE /hr/assignments/{id}
    const deleteMutation = useMutation({
        mutationFn: async (assignmentId: string) => {
            return api.delete(`/hr/assignments/${assignmentId}`);
        },
        onSuccess: () => {
            toast.success('Đã hủy phân công nhân viên');
            setDeletingStaff(null);
            onAssignmentChanged();
        },
        onError: () => {
            toast.error('Lỗi khi hủy phân công');
        }
    });

    const editHours = calcHours(editStartTime, editEndTime);

    return (
        <>
            <motion.div
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={prefersReducedMotion ? { duration: 0.1 } : { delay: 0.3 }}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white shadow-sm overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-white shadow-sm">
                            <IconUsers className="w-5 h-5 text-purple-600" aria-hidden="true" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200">NHÂN VIÊN PHÂN CÔNG</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{assignments.length} nhân viên</p>
                        </div>
                    </div>

                    {canSuggestStaff && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onSuggestClick}
                            className="border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300"
                        >
                            <IconUserPlus className="w-4 h-4 mr-1" aria-hidden="true" />
                            Gợi ý nhân viên
                        </Button>
                    )}
                </div>

                {/* Content */}
                <div className="p-4">
                    {assignments.length === 0 ? (
                        /* Empty State */
                        <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                                <IconUser className="w-8 h-8 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 mb-2">Chưa có nhân viên được phân công</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                                Sử dụng chức năng gợi ý để tìm nhân viên phù hợp
                            </p>
                            {canSuggestStaff && (
                                <Button
                                    onClick={onSuggestClick}
                                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                                >
                                    <IconUserPlus className="w-4 h-4 mr-2" aria-hidden="true" />
                                    Gợi ý nhân viên
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Staff List */}
                            <div className="space-y-3">
                                {assignments.map((staff, index) => {
                                    const status = statusConfig[staff.status] || statusConfig.ASSIGNED;
                                    const isEditing = editingId === staff.assignment_id;
                                    const hasTime = staff.start_time && staff.end_time;

                                    return (
                                        <div key={staff.assignment_id || staff.employee_id}>
                                            {/* Staff Row */}
                                            <div
                                                className="group relative flex items-center gap-4 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-purple-200 hover:bg-purple-50/30 transition-all cursor-pointer"
                                                onClick={() => handleViewProfile(staff.employee_id, staff.employee_name)}
                                            >
                                                {/* Avatar */}
                                                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarGradient(index)} flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0`}>
                                                    {getInitials(staff.employee_name)}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                                                            {staff.employee_name}
                                                        </span>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                                                            {status.icon}
                                                            {status.label}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                                        <span className="flex items-center gap-1">
                                                            <IconBriefcase className="w-3.5 h-3.5" />
                                                            {roleLabels[staff.role] || staff.role}
                                                        </span>

                                                        {/* Date + Time Range Display */}
                                                        {hasTime ? (
                                                            <span className="flex items-center gap-1 text-purple-600 font-medium">
                                                                <IconCalendar className="w-3.5 h-3.5" />
                                                                {formatDate(staff.start_time)}
                                                                <IconClock className="w-3.5 h-3.5 ml-1" />
                                                                {formatTime(staff.start_time)}
                                                                <IconArrowRight className="w-3 h-3" />
                                                                {formatTime(staff.end_time)}
                                                                <span className="text-gray-400 font-normal ml-1">
                                                                    ({staff.planned_hours}h)
                                                                </span>
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-amber-500">
                                                                <IconClock className="w-3.5 h-3.5" />
                                                                Chưa có giờ
                                                            </span>
                                                        )}

                                                        <span className="flex items-center gap-1">
                                                            <IconCurrencyDong className="w-3.5 h-3.5" />
                                                            {formatCurrency(staff.cost)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Hover Action Overlay (Gmail-style) */}
                                                <div className="hidden group-hover:flex items-center gap-1 absolute right-3 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 shadow-sm border rounded-md px-1 py-0.5" onClick={(e) => e.stopPropagation()}>
                                                    {staff.phone && (
                                                        <a
                                                            href={`tel:${staff.phone}`}
                                                            className="p-1.5 rounded hover:bg-green-50 text-gray-500 hover:text-green-600 transition-colors"
                                                            title="Gọi điện"
                                                        >
                                                            <IconPhone className="w-3.5 h-3.5" />
                                                        </a>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="p-1.5 rounded hover:bg-purple-50 text-gray-500 hover:text-purple-600 transition-colors"
                                                        title="Sửa giờ phân công"
                                                        onClick={() => startEdit(staff)}
                                                    >
                                                        <IconEdit className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                                                        title="Hủy phân công"
                                                        onClick={() => setDeletingStaff(staff)}
                                                    >
                                                        <IconTrash className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="p-1.5 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
                                                        title="Xem hồ sơ"
                                                        onClick={() => handleViewProfile(staff.employee_id, staff.employee_name)}
                                                    >
                                                        <IconChevronRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Inline Edit Time Picker */}
                                            {isEditing && (
                                                <div className="ml-16 mt-2 p-3 bg-purple-50 rounded-lg border border-purple-100 animate-in slide-in-from-top-2 duration-200">
                                                    <p className="text-xs font-medium text-purple-700 mb-2">Sửa giờ phân công</p>
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <div className="flex items-center gap-2">
                                                            <IconCalendar className="w-4 h-4 text-purple-500" />
                                                            <input
                                                                type="date"
                                                                value={editDate}
                                                                onChange={(e) => setEditDate(e.target.value)}
                                                                className="px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-xs text-gray-500">Từ</label>
                                                            <input
                                                                type="time"
                                                                value={editStartTime}
                                                                onChange={(e) => setEditStartTime(e.target.value)}
                                                                className="px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
                                                            />
                                                        </div>
                                                        <IconArrowRight className="w-4 h-4 text-gray-400" />
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-xs text-gray-500">Đến</label>
                                                            <input
                                                                type="time"
                                                                value={editEndTime}
                                                                onChange={(e) => setEditEndTime(e.target.value)}
                                                                className="px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
                                                            />
                                                        </div>
                                                        {editHours > 0 && (
                                                            <span className="text-xs text-purple-600 font-medium bg-purple-100 px-2 py-1 rounded-full">
                                                                {editHours.toFixed(1)}h ≈ {formatCurrency(staff.hourly_rate * editHours)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-3">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={cancelEdit}
                                                            className="h-7 text-xs"
                                                        >
                                                            Hủy
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => updateMutation.mutate({
                                                                assignmentId: staff.assignment_id,
                                                                startTime: editStartTime,
                                                                endTime: editEndTime,
                                                            })}
                                                            disabled={editHours <= 0 || updateMutation.isPending}
                                                            className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                                                        >
                                                            <IconCheck className="w-3 h-3 mr-1" />
                                                            {updateMutation.isPending ? 'Đang lưu...' : 'Lưu'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Summary Footer */}
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-6 text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <IconUsers className="w-4 h-4" />
                                            <strong className="text-gray-700 dark:text-gray-300">{assignments.length}</strong> nhân viên
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <IconClock className="w-4 h-4" />
                                            <strong className="text-gray-700 dark:text-gray-300">{totalActualHours}</strong>/{totalPlannedHours}h
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-purple-600 font-semibold">
                                        <IconCurrencyDong className="w-4 h-4" />
                                        {formatCurrency(totalCost)}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>

            {/* Employee Profile Modal */}
            <EmployeeProfileModal
                employeeId={selectedEmployee?.id || ''}
                employeeName={selectedEmployee?.name || ''}
                open={!!selectedEmployee}
                onClose={() => setSelectedEmployee(null)}
            />

            {/* Delete Confirmation Modal */}
            {deletingStaff && (
                <Dialog open={!!deletingStaff} onOpenChange={() => setDeletingStaff(null)}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="text-red-600 flex items-center gap-2">
                                <IconTrash className="h-5 w-5" />
                                Hủy phân công
                            </DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-gray-600">
                            Bạn có chắc muốn hủy phân công nhân viên <span className="font-bold">{deletingStaff.employee_name}</span> ({roleLabels[deletingStaff.role] || deletingStaff.role}) không?
                        </p>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => setDeletingStaff(null)}>
                                Không
                            </Button>
                            <Button
                                variant="destructive"
                                disabled={deleteMutation.isPending}
                                onClick={() => deleteMutation.mutate(deletingStaff.assignment_id)}
                            >
                                {deleteMutation.isPending ? 'Đang hủy...' : 'Xác nhận hủy'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

export default AssignedStaffCard;
