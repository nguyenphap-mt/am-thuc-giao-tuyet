'use client';

import { cn } from '@/lib/utils';
import {
    IconClock,
    IconCheck,
    IconTruck,
    IconCreditCard,
    IconX,
} from '@tabler/icons-react';

interface OrderStatusStepperProps {
    currentStatus: string;
}

const steps = [
    { key: 'PENDING', label: 'Chờ xử lý', icon: IconClock },
    { key: 'CONFIRMED', label: 'Đã xác nhận', icon: IconCheck },
    { key: 'IN_PROGRESS', label: 'Đang thực hiện', icon: IconTruck },
    { key: 'COMPLETED', label: 'Hoàn thành', icon: IconCheck },
    { key: 'PAID', label: 'Đã thanh toán', icon: IconCreditCard },
];

const statusOrder: Record<string, number> = {
    'PENDING': 0,
    'CONFIRMED': 1,
    'IN_PROGRESS': 2,
    'ON_HOLD': 2, // Same level as IN_PROGRESS
    'COMPLETED': 3,
    'PAID': 4,
    'CANCELLED': -1,
};

export function OrderStatusStepper({ currentStatus }: OrderStatusStepperProps) {
    const currentStep = statusOrder[currentStatus] ?? 0;
    const isCancelled = currentStatus === 'CANCELLED';
    const isOnHold = currentStatus === 'ON_HOLD';

    if (isCancelled) {
        return (
            <div className="flex items-center justify-center py-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full">
                    <IconX className="h-5 w-5" />
                    <span className="font-medium">Đơn hàng đã bị hủy</span>
                </div>
            </div>
        );
    }

    return (
        <div className="py-4">
            {/* Desktop View */}
            <div className="hidden sm:flex items-center justify-between">
                {steps.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;
                    const Icon = step.icon;

                    return (
                        <div key={step.key} className="flex-1 flex items-center">
                            {/* Step */}
                            <div className="flex flex-col items-center">
                                <div
                                    className={cn(
                                        'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                                        isCompleted && 'bg-gradient-to-r from-pink-500 to-purple-500 text-white',
                                        isCurrent && !isOnHold && 'bg-gradient-to-r from-pink-500 to-purple-500 text-white ring-4 ring-pink-100',
                                        isCurrent && isOnHold && 'bg-orange-500 text-white ring-4 ring-orange-100',
                                        !isCompleted && !isCurrent && 'bg-gray-100 text-gray-400'
                                    )}
                                >
                                    {isCompleted ? (
                                        <IconCheck className="h-5 w-5" />
                                    ) : (
                                        <Icon className="h-5 w-5" />
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        'mt-2 text-xs font-medium text-center',
                                        (isCompleted || isCurrent) ? 'text-gray-900' : 'text-gray-400'
                                    )}
                                >
                                    {isCurrent && isOnHold ? 'Tạm hoãn' : step.label}
                                </span>
                            </div>

                            {/* Connector */}
                            {index < steps.length - 1 && (
                                <div className="flex-1 mx-2">
                                    <div
                                        className={cn(
                                            'h-1 rounded-full transition-all duration-300',
                                            index < currentStep
                                                ? 'bg-gradient-to-r from-pink-500 to-purple-500'
                                                : 'bg-gray-200'
                                        )}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Mobile View */}
            <div className="sm:hidden space-y-3">
                {steps.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;
                    const Icon = step.icon;

                    return (
                        <div key={step.key} className="flex items-center gap-3">
                            <div
                                className={cn(
                                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                                    isCompleted && 'bg-gradient-to-r from-pink-500 to-purple-500 text-white',
                                    isCurrent && !isOnHold && 'bg-gradient-to-r from-pink-500 to-purple-500 text-white',
                                    isCurrent && isOnHold && 'bg-orange-500 text-white',
                                    !isCompleted && !isCurrent && 'bg-gray-100 text-gray-400'
                                )}
                            >
                                {isCompleted ? (
                                    <IconCheck className="h-4 w-4" />
                                ) : (
                                    <Icon className="h-4 w-4" />
                                )}
                            </div>
                            <span
                                className={cn(
                                    'text-sm font-medium',
                                    (isCompleted || isCurrent) ? 'text-gray-900' : 'text-gray-400'
                                )}
                            >
                                {isCurrent && isOnHold ? 'Tạm hoãn' : step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
