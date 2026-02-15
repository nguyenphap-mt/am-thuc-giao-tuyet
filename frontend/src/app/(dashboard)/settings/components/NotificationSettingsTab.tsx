'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
    IconBell, IconMail,
    IconShoppingCart, IconPackage, IconUsers, IconCash,
    IconSettings, IconClock, IconMoon, IconCheck, IconRefresh,
} from '@tabler/icons-react';
import { useNotificationPreferences } from '@/hooks/use-notification-preferences';

const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

// Category icons
// L2: Fix type to use React.ComponentType
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    orders: IconShoppingCart,
    inventory: IconPackage,
    hr: IconUsers,
    finance: IconCash,
    system: IconSettings,
};

// Channel icons & config — only show available channels (L1: hide Push/SMS until ready)
const CHANNELS = [
    { key: 'inapp' as const, label: 'In-App', desc: 'Thông báo trong ứng dụng', icon: IconBell, color: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600' },
    { key: 'email' as const, label: 'Email', desc: 'Nhận thông báo qua email', icon: IconMail, color: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600' },
];

export default function NotificationSettingsTab() {
    const { data, isLoading, togglePreference, updateChannels, updateSettings, resetPreferences } = useNotificationPreferences();

    // P3: Local state + debounce for quiet hours time inputs
    const [localStart, setLocalStart] = useState('');
    const [localEnd, setLocalEnd] = useState('');
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Sync local state when data loads
    useEffect(() => {
        if (data?.settings) {
            setLocalStart(data.settings.quiet_hours_start);
            setLocalEnd(data.settings.quiet_hours_end);
        }
    }, [data?.settings?.quiet_hours_start, data?.settings?.quiet_hours_end]);

    const debouncedUpdateTime = useCallback((field: string, value: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            updateSettings.mutate({ [field]: value });
        }, 500);
    }, [updateSettings]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="rounded-xl overflow-hidden">
                        <Skeleton className="h-48 w-full" />
                    </div>
                ))}
            </div>
        );
    }

    if (!data) return null;

    const { channels, preferences, settings, categories } = data;

    // Group preferences by category
    const grouped: Record<string, typeof preferences> = {};
    for (const pref of preferences) {
        if (!grouped[pref.category]) grouped[pref.category] = [];
        grouped[pref.category].push(pref);
    }

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
            {/* Card 1: Channel Management */}
            <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <IconBell className="h-5 w-5 text-purple-500" />
                            Phương thức nhận thông báo
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 pt-0">
                        {CHANNELS.map(ch => {
                            const ChIcon = ch.icon;
                            const isEnabled = channels[ch.key];
                            return (
                                <div key={ch.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-10 w-10 rounded-full ${ch.color} flex items-center justify-center`}>
                                            <ChIcon className={`h-5 w-5 ${ch.iconColor}`} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{ch.label}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{ch.desc}</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={isEnabled}
                                        onCheckedChange={(checked) => {
                                            updateChannels.mutate({ [ch.key]: checked });
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Card 2: Notification Type Preferences (Category-grouped) */}
            <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <IconCheck className="h-5 w-5 text-green-500" />
                            Loại thông báo
                        </CardTitle>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Bật/tắt từng loại thông báo cho mỗi kênh
                        </p>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {Object.entries(grouped).map(([catKey, catPrefs]) => {
                            const CatIcon = CATEGORY_ICONS[catKey] || IconBell;
                            const catLabel = categories[catKey] || catKey;

                            return (
                                <div key={catKey} className="mb-4 last:mb-0">
                                    {/* Category Header */}
                                    <div className="flex items-center gap-2 px-3 py-2 mb-1">
                                        <CatIcon className="h-4 w-4 text-gray-400" />
                                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {catLabel}
                                        </span>
                                    </div>

                                    {/* Type rows */}
                                    <div className="space-y-0.5">
                                        {catPrefs.map(pref => (
                                            <div
                                                key={pref.type}
                                                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                                            >
                                                <div className="flex-1 min-w-0 mr-4">
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        {pref.label}
                                                    </p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                        {pref.description}
                                                    </p>
                                                </div>

                                                {/* Channel toggles — M2: visual disabled state */}
                                                <div className="flex items-center gap-4 shrink-0">
                                                    {/* In-App toggle */}
                                                    <div className={`flex flex-col items-center gap-1 ${!channels.inapp ? 'opacity-40' : ''}`}>
                                                        <span className="text-[10px] text-gray-400 font-medium">In-App</span>
                                                        <Switch
                                                            checked={pref.channels.inapp}
                                                            disabled={!channels.inapp}
                                                            aria-label={`In-App thông báo cho ${pref.label}`}
                                                            onCheckedChange={(checked) =>
                                                                togglePreference.mutate({
                                                                    type: pref.type,
                                                                    channel: 'inapp',
                                                                    enabled: checked,
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    {/* Email toggle */}
                                                    <div className={`flex flex-col items-center gap-1 ${!channels.email ? 'opacity-40' : ''}`}>
                                                        <span className="text-[10px] text-gray-400 font-medium">Email</span>
                                                        <Switch
                                                            checked={pref.channels.email}
                                                            disabled={!channels.email}
                                                            aria-label={`Email thông báo cho ${pref.label}`}
                                                            onCheckedChange={(checked) =>
                                                                togglePreference.mutate({
                                                                    type: pref.type,
                                                                    channel: 'email',
                                                                    enabled: checked,
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Card 3: Schedule & Frequency */}
            <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <IconClock className="h-5 w-5 text-blue-500" />
                            Lịch trình & Tần suất
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                        {/* Email frequency */}
                        <div className="px-3">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tần suất email</p>
                            <div className="flex gap-3">
                                {[
                                    { value: 'IMMEDIATE', label: 'Ngay lập tức', desc: 'Nhận email mỗi khi có thông báo' },
                                    { value: 'DAILY_DIGEST', label: 'Tóm tắt hàng ngày', desc: 'Nhận 1 email tổng hợp lúc 8:00' },
                                ].map(opt => {
                                    const isActive = settings.email_frequency === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => updateSettings.mutate({ email_frequency: opt.value })}
                                            className={`flex-1 p-3 rounded-xl border-2 text-left transition-all ${isActive
                                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-400'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div
                                                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isActive
                                                        ? 'border-purple-500 bg-purple-500'
                                                        : 'border-gray-300 dark:border-gray-600'
                                                        }`}
                                                >
                                                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                </div>
                                                <span className={`text-sm font-medium ${isActive ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {opt.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 pl-6">
                                                {opt.desc}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Quiet hours */}
                        <div className="px-3 pt-2">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                        <IconMoon className="h-5 w-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Giờ yên tĩnh</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Không nhận thông báo trong khoảng thời gian này
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    checked={settings.quiet_hours_enabled}
                                    onCheckedChange={(checked) =>
                                        updateSettings.mutate({ quiet_hours_enabled: checked })
                                    }
                                />
                            </div>

                            {settings.quiet_hours_enabled && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex items-center gap-3 pl-13 ml-[52px]"
                                >
                                    <div className="flex items-center gap-2">
                                        <label htmlFor="quiet-start" className="text-xs text-gray-500">Từ</label>
                                        <input
                                            id="quiet-start"
                                            type="time"
                                            value={localStart}
                                            aria-label="Giờ bắt đầu yên tĩnh"
                                            onChange={(e) => {
                                                setLocalStart(e.target.value);
                                                debouncedUpdateTime('quiet_hours_start', e.target.value);
                                            }}
                                            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                                        />
                                    </div>
                                    <span className="text-gray-400">→</span>
                                    <div className="flex items-center gap-2">
                                        <label htmlFor="quiet-end" className="text-xs text-gray-500">Đến</label>
                                        <input
                                            id="quiet-end"
                                            type="time"
                                            value={localEnd}
                                            aria-label="Giờ kết thúc yên tĩnh"
                                            onChange={(e) => {
                                                setLocalEnd(e.target.value);
                                                debouncedUpdateTime('quiet_hours_end', e.target.value);
                                            }}
                                            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {settings.quiet_hours_enabled && (
                                <p className="text-[11px] text-gray-400 mt-2 ml-[52px]">
                                    ⚠️ Cảnh báo bảo mật luôn được gửi bất kể giờ yên tĩnh
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* P5: Reset to defaults button */}
            <motion.div variants={itemVariants} className="flex justify-end">
                <button
                    onClick={() => resetPreferences.mutate()}
                    disabled={resetPreferences.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                >
                    <IconRefresh className={`h-4 w-4 ${resetPreferences.isPending ? 'animate-spin' : ''}`} />
                    Đặt lại mặc định
                </button>
            </motion.div>
        </motion.div>
    );
}
