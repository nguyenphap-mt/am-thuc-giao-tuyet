'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import {
    IconX,
    IconUserPlus,
    IconLoader2,
    IconCheck,
    IconAlertTriangle,
    IconFilter,
    IconUser,
    IconPhone,
    IconClock,
    IconStar,
    IconBriefcase
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';

interface StaffSuggestion {
    employee_id: string;
    employee_name: string;
    role_type: string;
    phone: string | null;
    is_fulltime: boolean;
    hourly_rate: number;
    current_workload: number;
    is_available: boolean;
    score: number;
    conflict_reason: string | null;
}

interface SuggestStaffResponse {
    order_id: string;
    order_code: string;
    event_date: string | null;
    required_roles: string[];
    suggestions: StaffSuggestion[];
    total_available: number;
}

interface Props {
    orderId: string;
    orderCode: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAssigned?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
    WAITER: 'Phục vụ',
    CHEF: 'Đầu bếp',
    KITCHEN: 'Nhân viên bếp',
    DRIVER: 'Tài xế',
    LEAD: 'Trưởng nhóm',
    MANAGER: 'Quản lý',
    STAFF: 'Nhân viên',
    CAPTAIN: 'Ca trưởng'
};

export function StaffSuggestionModal({ orderId, orderCode, open, onOpenChange, onAssigned }: Props) {
    const [roleFilter, setRoleFilter] = useState<string>('');
    const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
    const queryClient = useQueryClient();
    const prefersReducedMotion = useReducedMotion();

    const { data, isLoading, error } = useQuery<SuggestStaffResponse>({
        queryKey: ['staff-suggestions', orderId, roleFilter],
        queryFn: async () => {
            const params = new URLSearchParams({ limit: '15' });
            if (roleFilter) params.append('role_filter', roleFilter);
            return await api.get(`/orders/${orderId}/suggest-staff?${params}`);
        },
        enabled: open && !!orderId,
        staleTime: 2 * 60 * 1000 // 2 minutes
    });

    const assignMutation = useMutation({
        mutationFn: async (employeeId: string) => {
            return api.post(`/hr/assignments`, {
                event_id: orderId,
                employee_id: employeeId,
                role: null,
                notes: 'Phân công từ gợi ý tự động'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff-suggestions', orderId] });
            queryClient.invalidateQueries({ queryKey: ['order-staff', orderId] });
            toast.success('Đã phân công nhân viên');
            if (onAssigned) onAssigned();
        },
        onError: () => {
            toast.error('Lỗi khi phân công nhân viên');
        }
    });

    const handleAssign = (employeeId: string) => {
        assignMutation.mutate(employeeId);
    };

    const handleAssignSelected = async () => {
        for (const empId of selectedStaff) {
            await assignMutation.mutateAsync(empId);
        }
        setSelectedStaff(new Set());
    };

    const toggleSelect = (empId: string) => {
        const newSet = new Set(selectedStaff);
        if (newSet.has(empId)) {
            newSet.delete(empId);
        } else {
            newSet.add(empId);
        }
        setSelectedStaff(newSet);
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-100';
        if (score >= 60) return 'text-blue-600 bg-blue-100';
        if (score >= 40) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/50"
                        onClick={() => onOpenChange(false)}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
                        transition={prefersReducedMotion ? { duration: 0.1 } : { duration: 0.2 }}
                        className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col overscroll-contain"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-blue-500 to-purple-600">
                            <div className="text-white">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <IconUserPlus className="w-5 h-5" aria-hidden="true" />
                                    Gợi ý nhân viên
                                </h2>
                                <p className="text-sm text-white/80">Đơn hàng {orderCode}</p>
                            </div>
                            <button
                                onClick={() => onOpenChange(false)}
                                aria-label="Đóng"
                                className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                            >
                                <IconX className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>

                        {/* Filter Bar */}
                        <div className="p-4 border-b bg-gray-50 dark:bg-gray-900 flex items-center gap-3">
                            <IconFilter className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="text-sm border rounded-lg px-3 py-1.5 bg-white"
                            >
                                <option value="">Tất cả vai trò</option>
                                <option value="WAITER">Phục vụ</option>
                                <option value="CHEF">Đầu bếp</option>
                                <option value="KITCHEN">Nhân viên bếp</option>
                                <option value="DRIVER">Tài xế</option>
                                <option value="CAPTAIN">Ca trưởng</option>
                            </select>
                            {data && (
                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
                                    {data.total_available} nhân viên sẵn sàng
                                </span>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {isLoading && (
                                <div className="flex items-center justify-center py-12">
                                    <IconLoader2 className="w-8 h-8 text-purple-500 animate-spin" aria-hidden="true" />
                                </div>
                            )}

                            {error && (
                                <div className="text-center py-12 text-red-500">
                                    <IconAlertTriangle className="w-12 h-12 mx-auto mb-3" aria-hidden="true" />
                                    <p>Không thể tải danh sách gợi ý</p>
                                </div>
                            )}

                            {data && data.suggestions.length === 0 && (
                                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                    <IconUser className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Không có nhân viên phù hợp</p>
                                </div>
                            )}

                            {data && data.suggestions.length > 0 && (
                                <div className="space-y-3">
                                    {data.suggestions.map((staff, index) => (
                                        <div
                                            key={staff.employee_id}
                                            className={`
                        rounded-lg border p-4 transition-[border-color,background-color,opacity] duration-200 cursor-pointer
                        ${selectedStaff.has(staff.employee_id) ? 'border-purple-400 bg-purple-50' : 'border-gray-200 dark:border-gray-700 hover:border-purple-200 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800'}
                        ${!staff.is_available ? 'opacity-60' : ''}
                      `}
                                            onClick={() => staff.is_available && toggleSelect(staff.employee_id)}
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Checkbox */}
                                                <div className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5
                          ${selectedStaff.has(staff.employee_id) ? 'bg-purple-500 border-purple-500' : 'border-gray-300 dark:border-gray-600'}
                          ${!staff.is_available ? 'opacity-50 cursor-not-allowed' : ''}
                        `}>
                                                    {selectedStaff.has(staff.employee_id) && (
                                                        <IconCheck className="w-3 h-3 text-white" />
                                                    )}
                                                </div>

                                                {/* Avatar */}
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                                                    {staff.employee_name.charAt(0)}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-gray-800 dark:text-gray-200">{staff.employee_name}</span>
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getScoreColor(staff.score)}`}>
                                                            {staff.score} điểm
                                                        </span>
                                                        {index === 0 && staff.is_available && (
                                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 flex items-center gap-1">
                                                                <IconStar className="w-3 h-3" /> Gợi ý
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                        <span className="flex items-center gap-1">
                                                            <IconBriefcase className="w-3 h-3" />
                                                            {ROLE_LABELS[staff.role_type] || staff.role_type}
                                                        </span>
                                                        {staff.phone && (
                                                            <span className="flex items-center gap-1">
                                                                <IconPhone className="w-3 h-3" />
                                                                {staff.phone}
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1">
                                                            <IconClock className="w-3 h-3" />
                                                            {staff.current_workload} đơn/tuần
                                                        </span>
                                                    </div>
                                                    {staff.conflict_reason && (
                                                        <p className="mt-1 text-xs text-orange-600 flex items-center gap-1">
                                                            <IconAlertTriangle className="w-3 h-3" />
                                                            {staff.conflict_reason}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Quick Assign Button */}
                                                {staff.is_available && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAssign(staff.employee_id);
                                                        }}
                                                        disabled={assignMutation.isPending}
                                                        className="shrink-0"
                                                    >
                                                        <IconUserPlus className="w-4 h-4 mr-1" />
                                                        Phân công
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between p-4 border-t bg-gray-50 dark:bg-gray-900">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {selectedStaff.size > 0 ? `Đã chọn ${selectedStaff.size} nhân viên` : 'Chọn nhân viên để phân công'}
                            </span>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => onOpenChange(false)}>
                                    Đóng
                                </Button>
                                {selectedStaff.size > 0 && (
                                    <Button
                                        onClick={handleAssignSelected}
                                        disabled={assignMutation.isPending}
                                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                                    >
                                        {assignMutation.isPending ? (
                                            <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <IconUserPlus className="w-4 h-4 mr-2" />
                                        )}
                                        Phân công ({selectedStaff.size})
                                    </Button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default StaffSuggestionModal;
