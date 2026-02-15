'use client';

import { Employee } from '@/types';
import { EmployeePerformanceCard } from './EmployeePerformanceCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    IconX,
    IconUser,
    IconPhone,
    IconMail,
    IconCalendar,
    IconId,
    IconMapPin,
    IconBuildingBank,
    IconCash,
    IconEdit,
    IconAlertCircle,
    IconClock,
    IconBriefcase,
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmployeeDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
    onEdit?: (employee: Employee) => void;
}

const ROLE_LABELS: Record<string, string> = {
    WAITER: 'Phục vụ',
    CHEF: 'Đầu bếp',
    KITCHEN: 'Nhân viên bếp',
    DRIVER: 'Tài xế',
    LEAD: 'Trưởng nhóm',
    MANAGER: 'Quản lý',
};

const getRoleBadgeColor = (roleType: string) => {
    const colors: Record<string, string> = {
        CHEF: 'bg-red-100 text-red-700 border-red-200',
        KITCHEN: 'bg-orange-100 text-orange-700 border-orange-200',
        WAITER: 'bg-blue-100 text-blue-700 border-blue-200',
        DRIVER: 'bg-purple-100 text-purple-700 border-purple-200',
        LEAD: 'bg-amber-100 text-amber-700 border-amber-200',
        MANAGER: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    };
    return colors[roleType] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
};

const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// Field display component
const InfoField = ({ icon: Icon, label, value, className = '' }: {
    icon: any;
    label: string;
    value: React.ReactNode;
    className?: string;
}) => (
    <div className={`flex items-start gap-3 ${className}`}>
        <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
            <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{value || '—'}</p>
        </div>
    </div>
);

// Section component
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">{title}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {children}
        </div>
    </div>
);

export function EmployeeDetailModal({ open, onOpenChange, employee, onEdit }: EmployeeDetailModalProps) {
    if (!employee) return null;

    const handleEdit = () => {
        if (onEdit && employee) {
            onEdit(employee);
            onOpenChange(false);
        }
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
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                    {employee.full_name?.charAt(0) || 'N'}
                                </div>
                                <div className="text-white">
                                    <h2 className="text-xl font-bold">{employee.full_name}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge className={`${getRoleBadgeColor(employee.role_type)} text-xs`}>
                                            {ROLE_LABELS[employee.role_type] || employee.role_type}
                                        </Badge>
                                        <Badge variant={employee.is_active ? 'default' : 'secondary'} className="text-xs">
                                            {employee.is_active ? 'Đang làm việc' : 'Nghỉ việc'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => onOpenChange(false)}
                                className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                            >
                                <IconX className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Basic Information */}
                            <Section title="Thông tin cơ bản">
                                <InfoField icon={IconPhone} label="Số điện thoại" value={employee.phone} />
                                <InfoField icon={IconMail} label="Email" value={employee.email} />
                                <InfoField icon={IconId} label="CMND/CCCD" value={employee.id_number} />
                                <InfoField icon={IconCalendar} label="Ngày sinh" value={formatDate(employee.date_of_birth)} />
                                <InfoField icon={IconMapPin} label="Địa chỉ" value={employee.address} className="sm:col-span-2" />
                            </Section>

                            {/* Work Information */}
                            <Section title="Thông tin công việc">
                                <InfoField
                                    icon={IconBriefcase}
                                    label="Hình thức"
                                    value={employee.is_fulltime ? 'Toàn thời gian' : 'Bán thời gian'}
                                />
                                <InfoField icon={IconCalendar} label="Ngày vào làm" value={formatDate(employee.joined_date)} />
                                <InfoField icon={IconClock} label="Lương theo giờ" value={formatCurrency(employee.hourly_rate)} />
                                <InfoField icon={IconCash} label="Lương cơ bản" value={formatCurrency(employee.base_salary)} />
                            </Section>

                            {/* Financial Information (Sensitive) */}
                            <Section title="Thông tin tài chính">
                                <InfoField icon={IconBuildingBank} label="Ngân hàng" value={employee.bank_name} />
                                <InfoField icon={IconBuildingBank} label="Số tài khoản" value={employee.bank_account} />
                                <InfoField icon={IconCash} label="Mức lương BH" value={formatCurrency(employee.insurance_salary_base)} />
                                <InfoField icon={IconAlertCircle} label="Liên hệ khẩn cấp" value={employee.emergency_contact} />
                            </Section>

                            {/* Allowances */}
                            {(employee.allowance_meal || employee.allowance_transport || employee.allowance_phone || employee.allowance_other) && (
                                <Section title="Phụ cấp">
                                    <InfoField icon={IconCash} label="Ăn trưa" value={formatCurrency(employee.allowance_meal)} />
                                    <InfoField icon={IconCash} label="Đi lại" value={formatCurrency(employee.allowance_transport)} />
                                    <InfoField icon={IconCash} label="Điện thoại" value={formatCurrency(employee.allowance_phone)} />
                                    <InfoField icon={IconCash} label="Khác" value={formatCurrency(employee.allowance_other)} />
                                </Section>
                            )}

                            {/* Performance Card (GAP-M2) */}
                            <EmployeePerformanceCard
                                employeeId={String(employee.id)}
                                employeeName={employee.full_name}
                                periodDays={30}
                            />

                            {/* Notes */}
                            {employee.notes && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Ghi chú</h4>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">{employee.notes}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50 dark:bg-gray-900">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Đóng
                            </Button>
                            {onEdit && (
                                <Button onClick={handleEdit} className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                                    <IconEdit className="h-4 w-4 mr-2" />
                                    Chỉnh sửa
                                </Button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
