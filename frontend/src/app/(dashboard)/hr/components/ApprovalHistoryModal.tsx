'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    IconCheck,
    IconX,
    IconClock,
    IconSend,
} from '@tabler/icons-react';

interface ApprovalHistoryItem {
    id: string;
    action: string;
    action_by_name: string | null;
    action_at: string;
    comment: string | null;
    previous_status: string | null;
    new_status: string;
}

interface ApprovalHistoryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requestId: string | null;
    employeeName?: string;
}

export default function ApprovalHistoryModal({
    open,
    onOpenChange,
    requestId,
    employeeName,
}: ApprovalHistoryModalProps) {
    const { data: history, isLoading } = useQuery({
        queryKey: ['leave-history', requestId],
        queryFn: async () => {
            if (!requestId) return [];
            return await api.get<ApprovalHistoryItem[]>(`/hr/leave/requests/${requestId}/history`);
        },
        enabled: !!requestId && open,
    });

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'APPROVED':
                return <IconCheck className="h-5 w-5 text-green-600" />;
            case 'REJECTED':
                return <IconX className="h-5 w-5 text-red-600" />;
            case 'SUBMITTED':
                return <IconSend className="h-5 w-5 text-blue-600" />;
            default:
                return <IconClock className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
        }
    };

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'APPROVED':
                return <Badge className="bg-green-100 text-green-700">Đã duyệt</Badge>;
            case 'REJECTED':
                return <Badge className="bg-red-100 text-red-700">Từ chối</Badge>;
            case 'SUBMITTED':
                return <Badge className="bg-blue-100 text-blue-700">Đã gửi</Badge>;
            case 'CANCELLED':
                return <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">Đã hủy</Badge>;
            default:
                return <Badge className="bg-amber-100 text-amber-700">{action}</Badge>;
        }
    };

    const formatDateTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <IconClock className="h-5 w-5" />
                        Lịch sử phê duyệt
                        {employeeName && (
                            <span className="text-gray-500 dark:text-gray-400 font-normal text-sm">
                                - {employeeName}
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex gap-4">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : !history || history.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <IconClock className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                            <p>Chưa có lịch sử phê duyệt</p>
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

                            {/* Timeline items */}
                            <div className="space-y-6">
                                {history.map((item, index) => (
                                    <div key={item.id} className="relative flex gap-4">
                                        {/* Icon circle */}
                                        <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 ${item.action === 'APPROVED' ? 'bg-green-50 border-green-200' :
                                                item.action === 'REJECTED' ? 'bg-red-50 border-red-200' :
                                                    item.action === 'SUBMITTED' ? 'bg-blue-50 border-blue-200' :
                                                        'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                                            }`}>
                                            {getActionIcon(item.action)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 pb-6">
                                            <div className="flex items-center gap-2 mb-1">
                                                {getActionBadge(item.action)}
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatDateTime(item.action_at)}
                                                </span>
                                            </div>

                                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                                {item.action_by_name ? (
                                                    <>
                                                        Bởi <span className="font-medium">{item.action_by_name}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-gray-500 dark:text-gray-400">Hệ thống</span>
                                                )}
                                            </p>

                                            {item.comment && (
                                                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-600 dark:text-gray-400 border-l-2 border-gray-300 dark:border-gray-600">
                                                    {item.comment}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
