'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
    IconPlayerPause,
    IconCheck,
    IconAlertTriangle,
    IconX
} from '@tabler/icons-react';

interface StatusConfirmationModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
    action: 'hold' | 'complete' | 'resume';
}

const actionConfig = {
    hold: {
        title: 'Tạm hoãn đơn hàng?',
        description: 'Đơn hàng sẽ được tạm dừng. Bạn có thể tiếp tục xử lý sau.',
        icon: IconPlayerPause,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        confirmLabel: 'Tạm hoãn',
        confirmClass: 'bg-amber-500 hover:bg-amber-600 text-white',
        warning: 'Nhân viên đã phân công sẽ không nhận được thông báo về tiến độ.',
    },
    complete: {
        title: 'Hoàn thành đơn hàng?',
        description: 'Xác nhận đơn hàng đã được phục vụ thành công.',
        icon: IconCheck,
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        confirmLabel: 'Hoàn thành đơn',
        confirmClass: 'bg-green-500 hover:bg-green-600 text-white',
        warning: null,
        checkItems: [
            'Tiệc đã được phục vụ hoàn tất',
            'Chất lượng món ăn đạt yêu cầu',
            'Khách hàng hài lòng'
        ]
    },
    resume: {
        title: 'Tiếp tục đơn hàng?',
        description: 'Đơn hàng sẽ được kích hoạt lại và tiếp tục xử lý.',
        icon: IconCheck,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        confirmLabel: 'Tiếp tục',
        confirmClass: 'bg-blue-500 hover:bg-blue-600 text-white',
        warning: null,
    },
};

export function StatusConfirmationModal({
    open,
    onClose,
    onConfirm,
    isLoading,
    action
}: StatusConfirmationModalProps) {
    const config = actionConfig[action];
    const Icon = config.icon;
    const prefersReducedMotion = useReducedMotion();

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

                    {/* Modal */}
                    <motion.div
                        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
                        transition={prefersReducedMotion ? { duration: 0.1 } : { type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-2xl z-50 overflow-hidden overscroll-contain"
                    >
                        {/* Header */}
                        <div className="flex items-start gap-4 p-6 pb-4">
                            <div className={`p-3 rounded-full ${config.iconBg}`}>
                                <Icon className={`h-6 w-6 ${config.iconColor}`} aria-hidden="true" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    {config.title}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {config.description}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                aria-label="Đóng"
                                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 dark:text-gray-600 dark:text-gray-400 transition-colors"
                            >
                                <IconX className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="px-6 pb-4">
                            {/* Warning */}
                            {config.warning && (
                                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                                    <IconAlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-amber-700">{config.warning}</span>
                                </div>
                            )}

                            {/* Check Items (for complete action) */}
                            {'checkItems' in config && config.checkItems && (
                                <div className="space-y-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm font-medium text-green-800">Xác nhận các điều kiện:</p>
                                    <ul className="space-y-1.5">
                                        {config.checkItems.map((item: string, index: number) => (
                                            <li key={index} className="flex items-center gap-2 text-sm text-green-700">
                                                <IconCheck className="h-4 w-4 text-green-500" aria-hidden="true" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                disabled={isLoading}
                            >
                                Hủy
                            </Button>
                            <Button
                                onClick={onConfirm}
                                disabled={isLoading}
                                className={config.confirmClass}
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                        Đang xử lý…
                                    </span>
                                ) : (
                                    <>
                                        <Icon className="h-4 w-4 mr-1" aria-hidden="true" />
                                        {config.confirmLabel}
                                    </>
                                )}
                            </Button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default StatusConfirmationModal;
