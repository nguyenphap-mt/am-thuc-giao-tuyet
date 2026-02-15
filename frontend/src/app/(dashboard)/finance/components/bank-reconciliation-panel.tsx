'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import {
    IconBuildingBank,
    IconCheck,
    IconX,
    IconAlertTriangle,
    IconFileSpreadsheet,
    IconReceipt,
    IconScale,
    IconClipboardCheck,
    IconLoader2,
} from '@tabler/icons-react';

interface BankReconciliationPanelProps {
    periodId: string;
    periodName: string;
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

interface ReconciliationStep {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    completed: boolean;
}

export function BankReconciliationPanel({
    periodId,
    periodName,
    isOpen,
    onClose,
    onComplete,
}: BankReconciliationPanelProps) {
    const queryClient = useQueryClient();

    const [steps, setSteps] = useState<ReconciliationStep[]>([
        {
            id: 'get_statement',
            name: 'Lấy sao kê ngân hàng',
            description: 'Tải hoặc in sao kê từ ngân hàng (online banking hoặc giấy)',
            icon: <IconFileSpreadsheet className="h-5 w-5" />,
            completed: false,
        },
        {
            id: 'compare_transactions',
            name: 'Đối chiếu giao dịch',
            description: 'So sánh từng giao dịch trên sao kê với bút toán trong hệ thống',
            icon: <IconReceipt className="h-5 w-5" />,
            completed: false,
        },
        {
            id: 'record_adjustments',
            name: 'Ghi nhận chênh lệch',
            description: 'Điều chỉnh các giao dịch thiếu hoặc sai số trong sổ sách',
            icon: <IconScale className="h-5 w-5" />,
            completed: false,
        },
        {
            id: 'confirm_balance',
            name: 'Xác nhận số dư khớp',
            description: 'Xác nhận số dư cuối kỳ trên sao kê = số dư sổ sách',
            icon: <IconClipboardCheck className="h-5 w-5" />,
            completed: false,
        },
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateChecklistMutation = useMutation({
        mutationFn: async () => {
            // Update the bank reconciliation checklist item
            const checklistRes = await api.get<{ items: { id: string; name: string }[] }>(
                `/finance/periods/${periodId}/checklist`
            );

            const bankItem = checklistRes.items.find(
                item => item.name === 'Đối soát ngân hàng'
            );

            if (bankItem) {
                await api.patch(`/finance/periods/${periodId}/checklist/${bankItem.id}`, {
                    is_completed: true,
                    notes: 'Đã hoàn tất đối soát thủ công',
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['period-checklist', periodId] });
            queryClient.invalidateQueries({ queryKey: ['pre-close-validation', periodId] });
            toast.success('Đã xác nhận hoàn tất đối soát ngân hàng');
            onComplete();
            onClose();
        },
        onError: () => {
            toast.error('Không thể cập nhật trạng thái đối soát');
        },
    });

    const toggleStep = (stepId: string) => {
        setSteps(prev =>
            prev.map(step =>
                step.id === stepId ? { ...step, completed: !step.completed } : step
            )
        );
    };

    const allStepsCompleted = steps.every(step => step.completed);
    const completedCount = steps.filter(step => step.completed).length;
    const progressPercent = Math.round((completedCount / steps.length) * 100);

    const handleConfirm = async () => {
        if (!allStepsCompleted) {
            toast.warning('Vui lòng hoàn tất tất cả các bước trước khi xác nhận');
            return;
        }

        setIsSubmitting(true);
        try {
            await updateChecklistMutation.mutateAsync();
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Card className="w-full max-w-lg shadow-2xl">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                <IconBuildingBank className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Đối Soát Ngân Hàng</CardTitle>
                                <CardDescription className="text-sm">
                                    {periodName}
                                </CardDescription>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-8 w-8"
                        >
                            <IconX className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Progress indicator */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Tiến độ đối soát</span>
                            <Badge variant={allStepsCompleted ? 'default' : 'secondary'}>
                                {completedCount}/{steps.length} ({progressPercent}%)
                            </Badge>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-[width] duration-300"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                </CardHeader>

                <hr className="border-gray-200 dark:border-gray-700" />

                <CardContent className="pt-4">
                    {/* Info Alert */}
                    <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                        <IconAlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                        <div className="text-amber-800">
                            <strong>Lưu ý:</strong> Đối soát ngân hàng là bước thủ công.
                            Vui lòng hoàn thành các bước dưới đây và tick xác nhận.
                        </div>
                    </div>

                    {/* Steps checklist */}
                    <div className="space-y-3">
                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                className={`group flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors duration-200 hover:shadow-sm ${step.completed
                                    ? 'border-green-200 bg-green-50'
                                    : 'border-gray-200 dark:border-gray-700 bg-white hover:border-gray-300 dark:border-gray-600'
                                    }`}
                                onClick={() => toggleStep(step.id)}
                            >
                                <div className="mt-0.5">
                                    <Checkbox
                                        checked={step.completed}
                                        onCheckedChange={() => toggleStep(step.id)}
                                        className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                    />
                                </div>
                                <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${step.completed
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    {step.completed ? (
                                        <IconCheck className="h-4 w-4" />
                                    ) : (
                                        step.icon
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div
                                        className={`text-sm font-medium ${step.completed ? 'text-green-700' : 'text-gray-900 dark:text-gray-100'
                                            }`}
                                    >
                                        {index + 1}. {step.name}
                                    </div>
                                    <div
                                        className={`text-xs ${step.completed ? 'text-green-600' : 'text-gray-500 dark:text-gray-400'
                                            }`}
                                    >
                                        {step.description}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={onClose}
                        >
                            Đóng
                        </Button>
                        <Button
                            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
                            onClick={handleConfirm}
                            disabled={!allStepsCompleted || isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang lưu...
                                </>
                            ) : (
                                <>
                                    <IconCheck className="mr-2 h-4 w-4" />
                                    Xác nhận hoàn tất
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
