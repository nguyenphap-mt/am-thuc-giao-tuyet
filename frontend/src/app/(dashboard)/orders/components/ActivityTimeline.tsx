'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    IconHistory,
    IconUserCircle,
    IconCheck,
    IconPlus,
    IconPlayerPause,
    IconPlayerPlay,
    IconCash,
    IconTruck,
    IconAlertCircle,
    IconChevronDown,
    IconChevronUp
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';

interface ActivityItem {
    id: string;
    type: 'STATUS_CHANGE' | 'STAFF_ASSIGNED' | 'PAYMENT_ADDED' | 'EXPENSE_ADDED' | 'NOTE_ADDED' | 'ORDER_CREATED';
    description: string;
    actor: string;
    timestamp: string;
    details?: string;
}

interface ActivityTimelineProps {
    orderCode: string;
    orderCreatedAt: string;
    orderStatus: string;
    orderCreatedBy?: string;
    staffAssignments?: { employee_name: string; assigned_at: string }[];
    payments?: { amount: number; created_at: string }[];
    maxItems?: number;
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    STATUS_CHANGE: {
        icon: <IconCheck className="w-4 h-4" aria-hidden="true" />,
        color: 'bg-blue-100 text-blue-600'
    },
    STAFF_ASSIGNED: {
        icon: <IconPlus className="w-4 h-4" aria-hidden="true" />,
        color: 'bg-purple-100 text-purple-600'
    },
    PAYMENT_ADDED: {
        icon: <IconCash className="w-4 h-4" aria-hidden="true" />,
        color: 'bg-green-100 text-green-600'
    },
    EXPENSE_ADDED: {
        icon: <IconTruck className="w-4 h-4" aria-hidden="true" />,
        color: 'bg-orange-100 text-orange-600'
    },
    NOTE_ADDED: {
        icon: <IconAlertCircle className="w-4 h-4" aria-hidden="true" />,
        color: 'bg-yellow-100 text-yellow-600'
    },
    ORDER_CREATED: {
        icon: <IconCheck className="w-4 h-4" aria-hidden="true" />,
        color: 'bg-emerald-100 text-emerald-600'
    }
};

export function ActivityTimeline({
    orderCode,
    orderCreatedAt,
    orderStatus,
    orderCreatedBy = 'Hệ thống',
    staffAssignments = [],
    payments = [],
    maxItems = 5
}: ActivityTimelineProps) {
    const [expanded, setExpanded] = useState(false);
    const prefersReducedMotion = useReducedMotion();

    // Build activity list from available data
    const activities: ActivityItem[] = [];

    // Order created
    activities.push({
        id: 'created',
        type: 'ORDER_CREATED',
        description: `Tạo đơn hàng ${orderCode}`,
        actor: orderCreatedBy,
        timestamp: orderCreatedAt
    });

    // Staff assignments
    staffAssignments.forEach((staff, idx) => {
        activities.push({
            id: `staff-${idx}`,
            type: 'STAFF_ASSIGNED',
            description: `Phân công nhân viên: ${staff.employee_name}`,
            actor: 'Hệ thống',
            timestamp: staff.assigned_at
        });
    });

    // Payments
    payments.forEach((payment, idx) => {
        activities.push({
            id: `payment-${idx}`,
            type: 'PAYMENT_ADDED',
            description: `Thanh toán: ${new Intl.NumberFormat('vi-VN').format(payment.amount)}đ`,
            actor: 'Kế toán',
            timestamp: payment.created_at
        });
    });

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const displayActivities = expanded ? activities : activities.slice(0, maxItems);

    if (activities.length === 0) {
        return null;
    }

    return (
        <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0.1 } : { delay: 0.4 }}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white shadow-sm overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-white shadow-sm">
                        <IconHistory className="w-5 h-5 text-blue-600" aria-hidden="true" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">LỊCH SỬ HOẠT ĐỘNG</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{activities.length} hoạt động</p>
                    </div>
                </div>
            </div>

            {/* Timeline Content */}
            <div className="p-4">
                <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

                    {/* Timeline items */}
                    <div className="space-y-4">
                        {displayActivities.map((activity, index) => {
                            const config = typeConfig[activity.type] || typeConfig.ORDER_CREATED;

                            return (
                                <div key={activity.id} className="relative flex gap-4 pl-10">
                                    {/* Icon */}
                                    <div className={`absolute left-1.5 w-6 h-6 rounded-full flex items-center justify-center ${config.color} ring-4 ring-white`}>
                                        {config.icon}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-gray-800 dark:text-gray-200">{activity.description}</p>
                                            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">
                                                {formatDistanceToNow(new Date(activity.timestamp), {
                                                    addSuffix: true,
                                                    locale: vi
                                                })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                                            <IconUserCircle className="w-3 h-3" aria-hidden="true" />
                                            {activity.actor}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Show more/less */}
                {activities.length > maxItems && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpanded(!expanded)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                            {expanded ? (
                                <>
                                    <IconChevronUp className="w-4 h-4 mr-1" aria-hidden="true" />
                                    Thu gọn
                                </>
                            ) : (
                                <>
                                    <IconChevronDown className="w-4 h-4 mr-1" aria-hidden="true" />
                                    Xem tất cả ({activities.length} hoạt động)
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default ActivityTimeline;
