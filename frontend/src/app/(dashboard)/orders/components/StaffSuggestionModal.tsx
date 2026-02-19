'use client';

import { useState, useMemo, useEffect } from 'react';
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
    IconBriefcase,
    IconCalendar,
    IconArrowRight
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
    event_time: string | null; // HH:mm format
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

/**
 * Add hours to a time string in HH:mm format 
 */
function addHoursToTime(time: string, hours: number): string {
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = (h + hours) * 60 + m;
    const newH = Math.min(23, Math.floor(totalMinutes / 60));
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/**
 * Calculate hours between two time strings
 */
function calcHours(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return Math.max(0, diff / 60);
}

export function StaffSuggestionModal({ orderId, orderCode, open, onOpenChange, onAssigned }: Props) {
    const [roleFilter, setRoleFilter] = useState<string>('');
    const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
    // Time picker state for individual quick-assign
    const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
    const [individualStartTime, setIndividualStartTime] = useState('08:00');
    const [individualEndTime, setIndividualEndTime] = useState('16:00');
    // Date picker state (defaults to order event_date)
    const [assignDate, setAssignDate] = useState<string>('');
    // Time picker state for bulk assign
    const [bulkStartTime, setBulkStartTime] = useState('08:00');
    const [bulkEndTime, setBulkEndTime] = useState('16:00');
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

    // Pre-fill times from order event_time
    const defaultStartTime = useMemo(() => {
        if (data?.event_time) return data.event_time;
        return '08:00';
    }, [data?.event_time]);

    const defaultEndTime = useMemo(() => {
        if (data?.event_time) return addHoursToTime(data.event_time, 8);
        return '16:00';
    }, [data?.event_time]);

    // Default date from order event_date (yyyy-MM-dd for input[type=date])
    const defaultAssignDate = useMemo(() => {
        if (!data?.event_date) return '';
        try {
            const date = new Date(data.event_date);
            return date.toISOString().split('T')[0]; // yyyy-MM-dd
        } catch {
            return '';
        }
    }, [data?.event_date]);

    // Initialize assignDate when data loads
    useEffect(() => {
        if (defaultAssignDate && !assignDate) {
            setAssignDate(defaultAssignDate);
        }
    }, [defaultAssignDate]);

    // Format event_date for display in header
    const formattedEventDate = useMemo(() => {
        if (!data?.event_date) return null;
        try {
            const date = new Date(data.event_date);
            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
            return data.event_date;
        }
    }, [data?.event_date]);

    // Format assignDate for display (dd/MM/yyyy)
    const formattedAssignDate = useMemo(() => {
        if (!assignDate) return null;
        try {
            const date = new Date(assignDate + 'T00:00:00');
            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
            return assignDate;
        }
    }, [assignDate]);

    /**
     * Build ISO datetime from assignDate + time string
     */
    function buildDatetime(time: string): string | undefined {
        const dateStr = assignDate || defaultAssignDate;
        if (!dateStr) return undefined;
        try {
            const date = new Date(dateStr + 'T00:00:00');
            const [h, m] = time.split(':').map(Number);
            date.setHours(h, m, 0, 0);
            return date.toISOString();
        } catch {
            return undefined;
        }
    }

    const assignMutation = useMutation({
        mutationFn: async ({ employeeId, startTime, endTime }: { employeeId: string; startTime: string; endTime: string }) => {
            return api.post(`/hr/assignments`, {
                event_id: orderId,
                employee_id: employeeId,
                role: null,
                start_time: buildDatetime(startTime),
                end_time: buildDatetime(endTime),
                notes: 'Phân công từ gợi ý tự động'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff-suggestions', orderId] });
            queryClient.invalidateQueries({ queryKey: ['order-staff', orderId] });
            queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
            toast.success('Đã phân công nhân viên');
            if (onAssigned) onAssigned();
        },
        onError: (err: any) => {
            const detail = err?.response?.data?.detail || err?.message || 'Lỗi không xác định';
            if (detail.includes('conflicting')) {
                toast.error('Nhân viên đã có lịch phân công trùng giờ');
            } else {
                toast.error('Lỗi khi phân công nhân viên');
            }
        }
    });

    const handleOpenTimePicker = (employeeId: string) => {
        if (expandedStaffId === employeeId) {
            setExpandedStaffId(null);
            return;
        }
        setExpandedStaffId(employeeId);
        setIndividualStartTime(defaultStartTime);
        setIndividualEndTime(defaultEndTime);
    };

    const handleConfirmAssign = (employeeId: string) => {
        assignMutation.mutate({
            employeeId,
            startTime: individualStartTime,
            endTime: individualEndTime
        });
        setExpandedStaffId(null);
    };

    const handleAssignSelected = async () => {
        for (const empId of selectedStaff) {
            await assignMutation.mutateAsync({
                employeeId: empId,
                startTime: bulkStartTime,
                endTime: bulkEndTime
            });
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
        // Initialize bulk times from defaults
        if (newSet.size === 1) {
            setBulkStartTime(defaultStartTime);
            setBulkEndTime(defaultEndTime);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-100';
        if (score >= 60) return 'text-blue-600 bg-blue-100';
        if (score >= 40) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const individualHours = calcHours(individualStartTime, individualEndTime);
    const bulkHours = calcHours(bulkStartTime, bulkEndTime);

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
                                <p className="text-sm text-white/80">
                                    Đơn hàng {orderCode}
                                    {formattedEventDate && (
                                        <span className="ml-2">
                                            <IconCalendar className="w-3.5 h-3.5 inline mr-1" />
                                            {formattedEventDate}
                                        </span>
                                    )}
                                </p>
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
                        <div className="p-4 border-b bg-gray-50 flex items-center gap-3">
                            <IconFilter className="w-4 h-4 text-gray-500" aria-hidden="true" />
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
                                <span className="text-sm text-gray-500 ml-auto">
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
                                <div className="text-center py-12 text-gray-500">
                                    <IconUser className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Không có nhân viên phù hợp</p>
                                </div>
                            )}

                            {data && data.suggestions.length > 0 && (
                                <div className="space-y-3">
                                    {data.suggestions.map((staff, index) => (
                                        <div key={staff.employee_id}>
                                            {/* Staff Card */}
                                            <div
                                                className={`
                                                    rounded-lg border p-4 transition-[border-color,background-color,opacity] duration-200 cursor-pointer
                                                    ${selectedStaff.has(staff.employee_id) ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'}
                                                    ${!staff.is_available ? 'opacity-60' : ''}
                                                    ${expandedStaffId === staff.employee_id ? 'rounded-b-none border-b-0' : ''}
                                                `}
                                                onClick={() => staff.is_available && toggleSelect(staff.employee_id)}
                                            >
                                                <div className="flex items-start gap-4">
                                                    {/* Checkbox */}
                                                    <div className={`
                                                        w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5
                                                        ${selectedStaff.has(staff.employee_id) ? 'bg-purple-500 border-purple-500' : 'border-gray-300'}
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
                                                            <span className="font-medium text-gray-800">{staff.employee_name}</span>
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getScoreColor(staff.score)}`}>
                                                                {staff.score} điểm
                                                            </span>
                                                            {index === 0 && staff.is_available && (
                                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 flex items-center gap-1">
                                                                    <IconStar className="w-3 h-3" /> Gợi ý
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
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
                                                            variant={expandedStaffId === staff.employee_id ? 'default' : 'outline'}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenTimePicker(staff.employee_id);
                                                            }}
                                                            disabled={assignMutation.isPending}
                                                            className={`shrink-0 ${expandedStaffId === staff.employee_id ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
                                                        >
                                                            <IconUserPlus className="w-4 h-4 mr-1" />
                                                            Phân công
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Inline Time Picker — appears below the card */}
                                            <AnimatePresence>
                                                {expandedStaffId === staff.employee_id && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="border border-t-0 border-purple-300 bg-purple-50/50 rounded-b-lg p-4">
                                                            <div className="flex items-center gap-3 flex-wrap">
                                                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                                    <IconCalendar className="w-4 h-4 text-purple-500" />
                                                                    <input
                                                                        type="date"
                                                                        value={assignDate}
                                                                        onChange={(e) => setAssignDate(e.target.value)}
                                                                        className="border border-purple-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <IconClock className="w-4 h-4 text-purple-500" />
                                                                    <label className="text-sm text-gray-600">Từ</label>
                                                                    <input
                                                                        type="time"
                                                                        value={individualStartTime}
                                                                        onChange={(e) => setIndividualStartTime(e.target.value)}
                                                                        className="border border-purple-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none"
                                                                        step="900"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                    <IconArrowRight className="w-4 h-4 text-gray-400" />
                                                                    <label className="text-sm text-gray-600">đến</label>
                                                                    <input
                                                                        type="time"
                                                                        value={individualEndTime}
                                                                        onChange={(e) => setIndividualEndTime(e.target.value)}
                                                                        className="border border-purple-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none"
                                                                        step="900"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                </div>

                                                                <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${individualHours > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {individualHours > 0 ? `${individualHours}h` : 'Giờ không hợp lệ'}
                                                                </span>

                                                                <div className="flex gap-2 ml-auto">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setExpandedStaffId(null);
                                                                        }}
                                                                        className="text-gray-500 hover:text-gray-700"
                                                                    >
                                                                        Hủy
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleConfirmAssign(staff.employee_id);
                                                                        }}
                                                                        disabled={assignMutation.isPending || individualHours <= 0}
                                                                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                                                                    >
                                                                        {assignMutation.isPending ? (
                                                                            <IconLoader2 className="w-4 h-4 mr-1 animate-spin" />
                                                                        ) : (
                                                                            <IconCheck className="w-4 h-4 mr-1" />
                                                                        )}
                                                                        Xác nhận
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            {staff.hourly_rate > 0 && individualHours > 0 && (
                                                                <p className="text-xs text-gray-500 mt-2">
                                                                    Chi phí ước tính: <span className="font-medium text-purple-600">{new Intl.NumberFormat('vi-VN').format(staff.hourly_rate * individualHours)}đ</span>
                                                                    <span className="text-gray-400 ml-1">({new Intl.NumberFormat('vi-VN').format(staff.hourly_rate)}đ/h × {individualHours}h)</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t bg-gray-50">
                            {/* Bulk time picker when staff are selected */}
                            {selectedStaff.size > 0 && (
                                <div className="px-4 pt-3 pb-2 border-b border-gray-100">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-sm font-medium text-gray-700">
                                            Giờ phân công:
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <IconCalendar className="w-4 h-4 text-gray-400" />
                                            <input
                                                type="date"
                                                value={assignDate}
                                                onChange={(e) => setAssignDate(e.target.value)}
                                                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none"
                                            />
                                            <input
                                                type="time"
                                                value={bulkStartTime}
                                                onChange={(e) => setBulkStartTime(e.target.value)}
                                                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none"
                                                step="900"
                                            />
                                            <IconArrowRight className="w-4 h-4 text-gray-400" />
                                            <input
                                                type="time"
                                                value={bulkEndTime}
                                                onChange={(e) => setBulkEndTime(e.target.value)}
                                                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none"
                                                step="900"
                                            />
                                            <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${bulkHours > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {bulkHours > 0 ? `${bulkHours}h` : 'Không hợp lệ'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between p-4">
                                <span className="text-sm text-gray-500">
                                    {selectedStaff.size > 0 ? `Đã chọn ${selectedStaff.size} nhân viên` : 'Chọn nhân viên để phân công'}
                                </span>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                                        Đóng
                                    </Button>
                                    {selectedStaff.size > 0 && (
                                        <Button
                                            onClick={handleAssignSelected}
                                            disabled={assignMutation.isPending || bulkHours <= 0}
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
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default StaffSuggestionModal;
