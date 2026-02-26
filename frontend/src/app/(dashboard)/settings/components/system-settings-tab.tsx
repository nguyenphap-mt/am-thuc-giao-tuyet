'use client';

import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { IconInfoCircle } from '@tabler/icons-react';
import { toast } from 'sonner';
import {
    SETTING_GROUPS,
    type SettingConfig,
    validateSetting,
    isSettingEnabled,
} from '../lib/system-settings-config';

// =============================================
// Types
// =============================================
interface TenantSetting {
    key: string;
    value: string;
    type: string;
    description?: string;
}

interface SystemSettingsTabProps {
    settings: TenantSetting[];
    settingsLoading: boolean;
    onSettingSave: (key: string, value: string) => void;
}

// =============================================
// Animations
// =============================================
const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
};

// =============================================
// Sub-components
// =============================================

/** Boolean toggle switch */
function SettingToggle({
    isOn,
    onChange,
    disabled,
}: {
    isOn: boolean;
    onChange: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={onChange}
            disabled={disabled}
            className="relative w-11 h-6 rounded-full border-none cursor-pointer transition-colors shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: isOn ? '#22c55e' : '#e2e8f0' }}
            aria-label={isOn ? 'Tắt' : 'Bật'}
        >
            <div
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-[left] duration-200"
                style={{ left: isOn ? '22px' : '2px' }}
            />
        </button>
    );
}

/** Numeric input with validation */
function SettingNumberInput({
    config,
    value,
    onSave,
    disabled,
}: {
    config: SettingConfig;
    value: string;
    onSave: (val: string) => void;
    disabled?: boolean;
}) {
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleBlur = useCallback(
        (e: React.FocusEvent<HTMLInputElement>) => {
            const newVal = e.target.value.trim();
            if (!newVal || newVal === String(value)) {
                setError(null);
                return;
            }

            const validation = validateSetting(config, newVal);
            if (!validation.valid) {
                setError(validation.error || 'Giá trị không hợp lệ');
                // Keep focus on the input for correction
                return;
            }

            setError(null);
            onSave(newVal);
        },
        [config, value, onSave]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
            }
            if (e.key === 'Escape') {
                if (inputRef.current) {
                    inputRef.current.value = String(value);
                }
                setError(null);
            }
        },
        [value]
    );

    return (
        <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-2">
                <input
                    ref={inputRef}
                    type="number"
                    defaultValue={value}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    className={`w-24 px-3 py-1.5 text-sm text-right font-mono rounded-lg border bg-white dark:bg-gray-800 dark:text-gray-200 outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50 ${error
                            ? 'border-red-400 focus:ring-2 focus:ring-red-200 focus:border-red-400'
                            : 'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-accent/20 focus:border-accent-medium'
                        }`}
                    min={config.min}
                    max={config.max}
                />
                {config.suffix && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {config.suffix}
                    </span>
                )}
            </div>
            {error && (
                <span className="text-xs text-red-500 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                    {error}
                </span>
            )}
        </div>
    );
}

/** Tooltip for setting description */
function InfoTooltip({ text }: { text: string }) {
    return (
        <span className="relative group/tooltip inline-flex ml-1">
            <IconInfoCircle
                size={14}
                className="text-gray-300 dark:text-gray-600 group-hover/tooltip:text-gray-500 dark:group-hover/tooltip:text-gray-400 transition-colors cursor-help"
            />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs text-white bg-gray-800 dark:bg-gray-700 rounded-lg shadow-lg whitespace-normal max-w-[240px] text-center opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 pointer-events-none z-50">
                {text}
                <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-800 dark:border-t-gray-700" />
            </span>
        </span>
    );
}

// =============================================
// Main Component
// =============================================
export function SystemSettingsTab({
    settings,
    settingsLoading,
    onSettingSave,
}: SystemSettingsTabProps) {
    // Track previous values for undo functionality
    const previousValuesRef = useRef<Map<string, string>>(new Map());

    /** Get setting value from API data, falling back to config default */
    const getSettingValue = useCallback(
        (key: string, defaultValue: string): string => {
            const found = settings.find((s) => s.key === key);
            return found?.value ?? defaultValue;
        },
        [settings]
    );

    /** Get setting type from API data */
    const getSettingType = useCallback(
        (key: string): string => {
            const found = settings.find((s) => s.key === key);
            return found?.type ?? 'STRING';
        },
        [settings]
    );

    /** Handle setting save with undo toast */
    const handleSave = useCallback(
        (config: SettingConfig, newValue: string) => {
            const currentValue = getSettingValue(config.key, config.defaultValue);
            previousValuesRef.current.set(config.key, currentValue);

            // Save and show undo toast
            onSettingSave(config.key, newValue);

            const displayValue =
                config.suffix
                    ? `${newValue} ${config.suffix}`
                    : newValue === 'true'
                        ? 'Bật'
                        : newValue === 'false'
                            ? 'Tắt'
                            : newValue;

            toast.success(`Đã cập nhật "${config.label}"`, {
                description: `→ ${displayValue}`,
                action: {
                    label: 'Hoàn tác',
                    onClick: () => {
                        const prevVal = previousValuesRef.current.get(config.key);
                        if (prevVal !== undefined) {
                            onSettingSave(config.key, prevVal);
                            toast.info('Đã hoàn tác thay đổi');
                        }
                    },
                },
                duration: 5000,
            });
        },
        [getSettingValue, onSettingSave]
    );

    /** Build flat settings array for dependency checking */
    const settingsForDependencyCheck = settings.map((s) => ({
        key: s.key,
        value: s.value,
    }));

    // =============================================
    // Loading skeleton
    // =============================================
    if (settingsLoading) {
        return (
            <div className="flex flex-col gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className="h-36 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
                    />
                ))}
            </div>
        );
    }

    // =============================================
    // Render
    // =============================================
    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-5"
        >
            {SETTING_GROUPS.map((group) => {
                const GroupIcon = group.icon;

                return (
                    <motion.div key={group.id} variants={itemVariants}>
                        <Card className="border-0 shadow-sm overflow-hidden">
                            {/* Group Header */}
                            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                                <div
                                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                                    style={{ background: `${group.color}14` }}
                                >
                                    <GroupIcon
                                        size={18}
                                        stroke={1.5}
                                        style={{ color: group.color }}
                                    />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                        {group.title}
                                    </div>
                                    <div className="text-xs text-gray-400 dark:text-gray-500">
                                        {group.description}
                                    </div>
                                </div>
                            </div>

                            {/* Settings List */}
                            <CardContent className="p-0">
                                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {group.settings.map((settingConfig) => {
                                        const val = getSettingValue(
                                            settingConfig.key,
                                            settingConfig.defaultValue
                                        );
                                        const type = getSettingType(settingConfig.key);
                                        const isBool =
                                            type === 'BOOLEAN' ||
                                            (!settingConfig.suffix &&
                                                !settingConfig.min &&
                                                (val === 'true' || val === 'false'));
                                        const isOn =
                                            val === 'true' || String(val) === 'true';

                                        // Progressive disclosure: check dependency
                                        const enabled = isSettingEnabled(
                                            settingConfig,
                                            settingsForDependencyCheck
                                        );

                                        return (
                                            <div
                                                key={settingConfig.key}
                                                className={`flex items-center justify-between px-5 py-3.5 transition-all duration-200 group/row ${enabled
                                                        ? 'hover:bg-gray-50 dark:bg-gray-900/60 dark:hover:bg-gray-800/40'
                                                        : 'opacity-40 pointer-events-none'
                                                    }`}
                                            >
                                                <div className="flex-1 min-w-0 mr-4">
                                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover/row:text-gray-900 dark:group-hover/row:text-gray-100 transition-colors flex items-center">
                                                        {settingConfig.label}
                                                        <InfoTooltip text={settingConfig.help} />
                                                    </div>
                                                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                        {settingConfig.help}
                                                    </div>
                                                    {/* Progressive disclosure hint */}
                                                    {!enabled && settingConfig.dependsOn && (
                                                        <div className="text-xs text-amber-500 mt-1 italic">
                                                            Bật &quot;
                                                            {SETTING_GROUPS.flatMap((g) => g.settings).find(
                                                                (s) => s.key === settingConfig.dependsOn
                                                            )?.label || settingConfig.dependsOn}
                                                            &quot; trước
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Control */}
                                                {isBool ? (
                                                    <SettingToggle
                                                        isOn={isOn}
                                                        onChange={() =>
                                                            handleSave(
                                                                settingConfig,
                                                                isOn ? 'false' : 'true'
                                                            )
                                                        }
                                                        disabled={!enabled}
                                                    />
                                                ) : (
                                                    <SettingNumberInput
                                                        config={settingConfig}
                                                        value={val as string}
                                                        onSave={(newVal) =>
                                                            handleSave(settingConfig, newVal)
                                                        }
                                                        disabled={!enabled}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                );
            })}
        </motion.div>
    );
}
