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
    IconUser
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { motion, useReducedMotion } from 'framer-motion';
import { EmployeeProfileModal } from './EmployeeProfileModal';

interface StaffAssignment {
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
}

interface AssignedStaffCardProps {
    assignments: StaffAssignment[];
    totalCost: number;
    totalPlannedHours: number;
    totalActualHours: number;
    onSuggestClick: () => void;
    canSuggestStaff: boolean;
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

export function AssignedStaffCard({
    assignments,
    totalCost,
    totalPlannedHours,
    totalActualHours,
    onSuggestClick,
    canSuggestStaff
}: AssignedStaffCardProps) {
    // State for employee profile modal
    const [selectedEmployee, setSelectedEmployee] = useState<{
        id: string;
        name: string;
    } | null>(null);

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
                                    const status = statusConfig[staff.status] || statusConfig.PENDING;

                                    return (
                                        <div
                                            key={staff.employee_id}
                                            className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-purple-200 hover:bg-purple-50/30 transition-all group cursor-pointer"
                                            onClick={() => handleViewProfile(staff.employee_id, staff.employee_name)}
                                        >
                                            {/* Avatar */}
                                            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarGradient(index)} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
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
                                                    <span className="flex items-center gap-1">
                                                        <IconClock className="w-3.5 h-3.5" />
                                                        {staff.actual_hours}/{staff.planned_hours}h
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <IconCurrencyDong className="w-3.5 h-3.5" />
                                                        {formatCurrency(staff.cost)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Quick Actions */}
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {staff.phone && (
                                                    <a
                                                        href={`tel:${staff.phone}`}
                                                        className="p-2 rounded-full hover:bg-green-100 text-green-600 transition-colors"
                                                        title="Gọi điện"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <IconPhone className="w-4 h-4" />
                                                    </a>
                                                )}
                                                <button
                                                    type="button"
                                                    className="p-2 rounded-full hover:bg-blue-100 text-blue-600 transition-colors"
                                                    title="Xem hồ sơ"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewProfile(staff.employee_id, staff.employee_name);
                                                    }}
                                                >
                                                    <IconChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
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
        </>
    );
}

export default AssignedStaffCard;
