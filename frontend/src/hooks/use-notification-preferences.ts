'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// ============ TYPES ============

export interface ChannelSettings {
    email: boolean;
    push: boolean;
    sms: boolean;
    inapp: boolean;
}

export interface NotificationPreferenceItem {
    type: string;
    category: string;
    label: string;
    description: string;
    channels: { inapp: boolean; email: boolean };
}

export interface NotificationSettingsPayload {
    email_frequency: string;
    quiet_hours_enabled: boolean;
    quiet_hours_start: string;
    quiet_hours_end: string;
}

export interface NotificationPreferencesData {
    channels: ChannelSettings;
    preferences: NotificationPreferenceItem[];
    settings: NotificationSettingsPayload;
    categories: Record<string, string>;
}

// ============ HOOK ============

export function useNotificationPreferences() {
    const queryClient = useQueryClient();
    const queryKey = ['notification-preferences'];

    // Fetch all preferences
    const { data, isLoading, error } = useQuery<NotificationPreferencesData>({
        queryKey,
        queryFn: async () => {
            return await api.get<NotificationPreferencesData>('/notifications/preferences');
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Toggle individual preference (optimistic)
    const togglePreference = useMutation({
        mutationFn: async ({
            type,
            channel,
            enabled,
        }: {
            type: string;
            channel: 'inapp' | 'email';
            enabled: boolean;
        }) => {
            return await api.put(`/notifications/preferences/${type}/${channel}`, { enabled });
        },
        onMutate: async ({ type, channel, enabled }) => {
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<NotificationPreferencesData>(queryKey);

            if (previous) {
                const updated = {
                    ...previous,
                    preferences: previous.preferences.map((p) =>
                        p.type === type
                            ? {
                                ...p,
                                channels: { ...p.channels, [channel]: enabled },
                            }
                            : p,
                    ),
                };
                queryClient.setQueryData(queryKey, updated);
            }

            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKey, context.previous);
            }
            toast.error('Lỗi cập nhật. Vui lòng thử lại.');
        },
        onSuccess: () => {
            toast.success('Đã cập nhật tuỳ chọn thông báo');
        },
    });

    // Update channel settings
    const updateChannels = useMutation({
        mutationFn: async (channels: Partial<ChannelSettings>) => {
            const current = queryClient.getQueryData<NotificationPreferencesData>(queryKey);
            const merged = { ...current?.channels, ...channels } as ChannelSettings;
            return await api.put('/notifications/preferences/bulk', {
                channels: merged,
            });
        },
        onMutate: async (channels) => {
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<NotificationPreferencesData>(queryKey);

            if (previous) {
                queryClient.setQueryData(queryKey, {
                    ...previous,
                    channels: { ...previous.channels, ...channels },
                });
            }
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKey, context.previous);
            }
            toast.error('Lỗi cập nhật kênh. Vui lòng thử lại.');
        },
        onSuccess: () => {
            toast.success('Đã cập nhật kênh thông báo');
        },
    });

    // Update schedule/frequency settings
    const updateSettings = useMutation({
        mutationFn: async (settings: Partial<NotificationSettingsPayload>) => {
            const current = queryClient.getQueryData<NotificationPreferencesData>(queryKey);
            const merged = { ...current?.settings, ...settings } as NotificationSettingsPayload;
            return await api.put('/notifications/preferences/bulk', {
                settings: merged,
            });
        },
        onMutate: async (settings) => {
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<NotificationPreferencesData>(queryKey);

            if (previous) {
                queryClient.setQueryData(queryKey, {
                    ...previous,
                    settings: { ...previous.settings, ...settings },
                });
            }
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKey, context.previous);
            }
            toast.error('Lỗi cập nhật. Vui lòng thử lại.');
        },
        onSuccess: () => {
            toast.success('Đã cập nhật cài đặt');
        },
    });

    // Reset all preferences to defaults (P5)
    const resetPreferences = useMutation({
        mutationFn: async () => {
            return await api.delete('/notifications/preferences/reset');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            toast.success('Đã đặt lại thông báo về mặc định');
        },
        onError: () => {
            toast.error('Lỗi đặt lại. Vui lòng thử lại.');
        },
    });

    return {
        data,
        isLoading,
        error,
        togglePreference,
        updateChannels,
        updateSettings,
        resetPreferences,
    };
}
