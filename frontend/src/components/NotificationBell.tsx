'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
    IconBell,
    IconBellFilled,
    IconCheck,
    IconX,
    IconCalendar,
    IconCircleCheck,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface Notification {
    id: string;
    title: string;
    message: string | null;
    type: string;
    reference_type: string | null;
    reference_id: string | null;
    is_read: boolean;
    created_at: string;
}

export default function NotificationBell() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    // Get unread count
    const { data: countData } = useQuery({
        queryKey: ['notifications-count'],
        queryFn: async () => {
            return await api.get<{ unread_count: number }>('/hr/notifications/count');
        },
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    // Get notifications list
    const { data: notifications, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            return await api.get<Notification[]>('/hr/notifications?limit=10');
        },
        enabled: isOpen,
    });

    // Mark as read mutation
    const markReadMutation = useMutation({
        mutationFn: async (notificationId: string) => {
            return await api.put(`/hr/notifications/${notificationId}/read`, {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
        },
    });

    // Mark all as read mutation
    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            return await api.put('/hr/notifications/read-all', {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
        },
    });

    const unreadCount = countData?.unread_count || 0;

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'LEAVE_APPROVED':
                return <IconCheck className="h-4 w-4 text-green-600" />;
            case 'LEAVE_REJECTED':
                return <IconX className="h-4 w-4 text-red-600" />;
            default:
                return <IconCalendar className="h-4 w-4 text-blue-600" />;
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) return 'Vừa xong';
            if (diffMins < 60) return `${diffMins} phút trước`;
            if (diffHours < 24) return `${diffHours} giờ trước`;
            if (diffDays < 7) return `${diffDays} ngày trước`;
            return date.toLocaleDateString('vi-VN');
        } catch {
            return dateStr;
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        // Mark as read first
        if (!notification.is_read) {
            markReadMutation.mutate(notification.id);
        }

        // Navigate based on reference type
        if (notification.reference_type === 'leave_request') {
            router.push('/hr?tab=leave');
        }

        setIsOpen(false);
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9"
                    aria-label="Thông báo"
                >
                    {unreadCount > 0 ? (
                        <IconBellFilled className="h-5 w-5 text-purple-600" />
                    ) : (
                        <IconBell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    )}

                    {/* Unread badge */}
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-1 text-[10px] font-bold text-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b">
                    <span className="font-semibold text-sm">Thông báo</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-purple-600 hover:text-purple-700"
                            onClick={() => markAllReadMutation.mutate()}
                            disabled={markAllReadMutation.isPending}
                        >
                            <IconCircleCheck className="h-3.5 w-3.5 mr-1" />
                            Đánh dấu đã đọc
                        </Button>
                    )}
                </div>

                {/* Notification list */}
                <div className="max-h-80 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-3 space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex gap-3">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <div className="flex-1 space-y-1">
                                        <Skeleton className="h-3 w-full" />
                                        <Skeleton className="h-3 w-2/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : !notifications || notifications.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">
                            <IconBell className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                            <p className="text-sm">Không có thông báo</p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={`flex items-start gap-3 p-3 cursor-pointer ${!notification.is_read ? 'bg-purple-50/50 dark:bg-purple-900/20' : ''
                                    }`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                {/* Icon */}
                                <div className={`flex-shrink-0 p-2 rounded-full ${notification.type === 'LEAVE_APPROVED' ? 'bg-green-100' :
                                    notification.type === 'LEAVE_REJECTED' ? 'bg-red-100' :
                                        'bg-blue-100'
                                    }`}>
                                    {getNotificationIcon(notification.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={`text-sm truncate ${!notification.is_read ? 'font-medium' : ''
                                            }`}>
                                            {notification.title}
                                        </p>
                                        {!notification.is_read && (
                                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-purple-500 mt-1" />
                                        )}
                                    </div>
                                    {notification.message && (
                                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                            {notification.message}
                                        </p>
                                    )}
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        {formatTimeAgo(notification.created_at)}
                                    </p>
                                </div>
                            </DropdownMenuItem>
                        ))
                    )}
                </div>

                {/* Footer */}
                {notifications && notifications.length > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <div className="p-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-xs text-purple-600 hover:text-purple-700"
                                onClick={() => {
                                    router.push('/hr?tab=leave');
                                    setIsOpen(false);
                                }}
                            >
                                Xem tất cả
                            </Button>
                        </div>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
