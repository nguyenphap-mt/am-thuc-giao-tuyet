'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    IconX,
    IconUser,
    IconPhone,
    IconMail,
    IconBriefcase,
    IconCalendar,
    IconClock,
    IconStar,
    IconCash
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface EmployeeProfileModalProps {
    employeeId: string;
    employeeName: string;
    open: boolean;
    onClose: () => void;
}

interface EmployeeDetails {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    role_type: string;
    is_fulltime: boolean;
    hourly_rate: number;
    join_date: string | null;
    status: string;
}

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

export function EmployeeProfileModal({
    employeeId,
    employeeName,
    open,
    onClose
}: EmployeeProfileModalProps) {
    // Fetch employee details
    const { data: employee, isLoading, error } = useQuery({
        queryKey: ['employee-detail', employeeId],
        queryFn: () => api.get<EmployeeDetails>(`/hr/employees/${employeeId}`),
        enabled: open && !!employeeId,
    });
    const prefersReducedMotion = useReducedMotion();

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value) + 'đ';
    };

    const getInitials = (name: string) => {
        return name.split(' ').slice(-1)[0]?.charAt(0)?.toUpperCase() || 'N';
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50"
                        onClick={onClose}
                    />

                    {/* Drawer from Right */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={prefersReducedMotion ? { duration: 0.1 } : { type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto overscroll-contain"
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 z-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Hồ sơ nhân viên</h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClose}
                                    aria-label="Đóng hồ sơ"
                                    className="text-white hover:bg-white/20"
                                >
                                    <IconX className="h-5 w-5" aria-hidden="true" />
                                </Button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            {isLoading ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="w-16 h-16 rounded-full" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-6 w-32" />
                                            <Skeleton className="h-4 w-24" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-20" />
                                    <Skeleton className="h-20" />
                                </div>
                            ) : error ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
                                        <IconUser className="w-8 h-8 text-red-400" aria-hidden="true" />
                                    </div>
                                    <p className="text-red-500">Không thể tải thông tin nhân viên</p>
                                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Vui lòng thử lại sau</p>
                                </div>
                            ) : employee ? (
                                <div className="space-y-6">
                                    {/* Profile Header */}
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                            {getInitials(employee.full_name)}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                                                {employee.full_name}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge className={employee.is_fulltime
                                                    ? 'bg-blue-100 text-blue-600'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                                }>
                                                    {employee.is_fulltime ? 'Toàn thời gian' : 'Bán thời gian'}
                                                </Badge>
                                                <Badge className={employee.status === 'ACTIVE'
                                                    ? 'bg-green-100 text-green-600'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                                }>
                                                    {employee.status === 'ACTIVE' ? 'Đang làm việc' : employee.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact Info */}
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Thông tin liên hệ</h4>

                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-green-100">
                                                <IconPhone className="w-4 h-4 text-green-600" aria-hidden="true" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Số điện thoại</p>
                                                {employee.phone ? (
                                                    <a
                                                        href={`tel:${employee.phone}`}
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        {employee.phone}
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-500">Chưa cập nhật</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-100">
                                                <IconMail className="w-4 h-4 text-blue-600" aria-hidden="true" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                                                {employee.email ? (
                                                    <a
                                                        href={`mailto:${employee.email}`}
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        {employee.email}
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-500">Chưa cập nhật</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Work Info */}
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Thông tin công việc</h4>

                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-purple-100">
                                                <IconBriefcase className="w-4 h-4 text-purple-600" aria-hidden="true" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Vị trí</p>
                                                <p className="font-medium text-gray-800 dark:text-gray-200">
                                                    {roleLabels[employee.role_type] || employee.role_type}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-amber-100">
                                                <IconCash className="w-4 h-4 text-amber-600" aria-hidden="true" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Lương theo giờ</p>
                                                <p className="font-medium text-gray-800 dark:text-gray-200">
                                                    {formatCurrency(employee.hourly_rate)}/giờ
                                                </p>
                                            </div>
                                        </div>

                                        {employee.join_date && (
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-indigo-100">
                                                    <IconCalendar className="w-4 h-4 text-indigo-600" aria-hidden="true" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Ngày vào làm</p>
                                                    <p className="font-medium text-gray-800 dark:text-gray-200">
                                                        {new Date(employee.join_date).toLocaleDateString('vi-VN')}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="flex gap-2">
                                        {employee.phone && (
                                            <a
                                                href={`tel:${employee.phone}`}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                            >
                                                <IconPhone className="w-4 h-4" aria-hidden="true" />
                                                Gọi điện
                                            </a>
                                        )}
                                        {employee.email && (
                                            <a
                                                href={`mailto:${employee.email}`}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                            >
                                                <IconMail className="w-4 h-4" aria-hidden="true" />
                                                Email
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 dark:text-gray-400">Không có thông tin</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default EmployeeProfileModal;
