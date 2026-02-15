'use client';

import { useTheme } from 'next-themes';
import { useCallback, useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { useMyTenantSettings, useUpdateMyTenantSettings } from './use-tenants';

// Accent color palette with display names
export const ACCENT_COLORS = [
    { value: '#e11d48', label: 'Hồng đậm', name: 'rose' },
    { value: '#7c3aed', label: 'Tím', name: 'purple' },
    { value: '#4f46e5', label: 'Chàm', name: 'indigo' },
    { value: '#2563eb', label: 'Xanh dương', name: 'blue' },
    { value: '#0d9488', label: 'Xanh lục lam', name: 'teal' },
    { value: '#16a34a', label: 'Xanh lá', name: 'green' },
    { value: '#d97706', label: 'Hổ phách', name: 'amber' },
    { value: '#ea580c', label: 'Cam', name: 'orange' },
] as const;

export const FONT_SIZES = [
    { value: 'small', label: 'Nhỏ', bodyPx: 13, secondaryPx: 11 },
    { value: 'default', label: 'Mặc định', bodyPx: 14, secondaryPx: 12 },
    { value: 'large', label: 'Lớn', bodyPx: 16, secondaryPx: 14 },
] as const;

export const DENSITIES = [
    { value: 'compact', label: 'Thu gọn', scale: 0.85, description: 'Nhiều thông tin hơn trên màn hình' },
    { value: 'default', label: 'Mặc định', scale: 1.0, description: 'Cân bằng giữa nội dung và khoảng trống' },
    { value: 'comfortable', label: 'Thoáng', scale: 1.15, description: 'Dễ đọc, ít mỏi mắt' },
] as const;

export type FontSize = typeof FONT_SIZES[number]['value'];
export type Density = typeof DENSITIES[number]['value'];

const STORAGE_KEY = 'app-appearance';

interface AppearanceState {
    accentColor: string;
    fontSize: FontSize;
    density: Density;
}

const DEFAULT_STATE: AppearanceState = {
    accentColor: '#7c3aed',
    fontSize: 'default',
    density: 'default',
};

// Apply CSS variables + data attributes to :root
function applyAppearance(state: AppearanceState) {
    const root = document.documentElement;

    // Accent color
    root.style.setProperty('--app-accent', state.accentColor);
    root.style.setProperty('--app-accent-light', state.accentColor + '1a'); // 10% opacity

    // Font size — CSS variable + data attribute for selector targeting
    const fontConfig = FONT_SIZES.find(f => f.value === state.fontSize) || FONT_SIZES[1];
    root.style.setProperty('--app-font-body', `${fontConfig.bodyPx}px`);
    root.style.setProperty('--app-font-secondary', `${fontConfig.secondaryPx}px`);
    root.setAttribute('data-font-size', state.fontSize);

    // Density — CSS variable + data attribute for selector targeting
    const densityConfig = DENSITIES.find(d => d.value === state.density) || DENSITIES[1];
    root.style.setProperty('--app-density', `${densityConfig.scale}`);
    root.setAttribute('data-density', state.density);
}

function loadFromStorage(): AppearanceState {
    if (typeof window === 'undefined') return DEFAULT_STATE;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return { ...DEFAULT_STATE, ...parsed };
        }
    } catch {
        // ignore
    }
    return DEFAULT_STATE;
}

function saveToStorage(state: AppearanceState) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // ignore
    }
}

export function useAppearance() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [state, setState] = useState<AppearanceState>(DEFAULT_STATE);
    const apiSyncedRef = useRef(false);

    // Backend API hooks
    const { data: tenantSettings } = useMyTenantSettings();
    const updateSettings = useUpdateMyTenantSettings();

    // Load from localStorage immediately on mount (fast)
    useEffect(() => {
        setMounted(true);
        const stored = loadFromStorage();
        setState(stored);
        applyAppearance(stored);
    }, []);

    // Sync from backend API when available (authoritative source)
    useEffect(() => {
        if (!tenantSettings || apiSyncedRef.current) return;

        const apiState: Partial<AppearanceState> = {};
        let hasApiData = false;

        for (const setting of tenantSettings) {
            if (setting.key === 'appearance.accent_color' && setting.value) {
                apiState.accentColor = setting.value;
                hasApiData = true;
            }
            if (setting.key === 'appearance.font_size' && setting.value) {
                apiState.fontSize = setting.value as FontSize;
                hasApiData = true;
            }
            if (setting.key === 'appearance.density' && setting.value) {
                apiState.density = setting.value as Density;
                hasApiData = true;
            }
            if (setting.key === 'appearance.theme' && setting.value) {
                setTheme(setting.value);
                hasApiData = true;
            }
        }

        if (hasApiData) {
            const merged = { ...DEFAULT_STATE, ...apiState };
            setState(merged);
            applyAppearance(merged);
            saveToStorage(merged);
        }

        apiSyncedRef.current = true;
    }, [tenantSettings, setTheme]);

    // P3: Use ref to avoid stale closure for theme value
    const themeRef = useRef(theme);
    useEffect(() => { themeRef.current = theme; }, [theme]);

    // Debounced API save — batches rapid clicks into single mutation
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Helper: save both localStorage + API (with debounce)
    const persistSettings = useCallback((newState: AppearanceState, themeValue?: string) => {
        // Instant: save to localStorage for immediate persistence
        saveToStorage(newState);

        // Debounced: batch API calls (500ms)
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            const settings: Record<string, string> = {
                'appearance.accent_color': newState.accentColor,
                'appearance.font_size': newState.fontSize,
                'appearance.density': newState.density,
                'appearance.theme': themeValue || themeRef.current || 'light',
            };
            // P2: Error handling for API save failures
            updateSettings.mutate(settings, {
                onError: () => {
                    toast.error('Không thể lưu cài đặt. Vui lòng thử lại.');
                },
            });
        }, 500);
    }, [updateSettings]); // P3: removed `theme` from deps, using themeRef instead

    const setAccentColor = useCallback((color: string) => {
        setState(prev => {
            const next = { ...prev, accentColor: color };
            applyAppearance(next);
            persistSettings(next);
            return next;
        });
    }, [persistSettings]);

    const setFontSize = useCallback((size: FontSize) => {
        setState(prev => {
            const next = { ...prev, fontSize: size };
            applyAppearance(next);
            persistSettings(next);
            return next;
        });
    }, [persistSettings]);

    const setDensity = useCallback((density: Density) => {
        setState(prev => {
            const next = { ...prev, density };
            applyAppearance(next);
            persistSettings(next);
            return next;
        });
    }, [persistSettings]);

    // Wrap setTheme to also persist to API
    const setThemeAndPersist = useCallback((newTheme: string) => {
        setTheme(newTheme);
        persistSettings(state, newTheme);
    }, [setTheme, persistSettings, state]);

    const resetAll = useCallback(() => {
        setState(DEFAULT_STATE);
        applyAppearance(DEFAULT_STATE);
        saveToStorage(DEFAULT_STATE);
        setTheme('light');
        const settings: Record<string, string> = {
            'appearance.accent_color': DEFAULT_STATE.accentColor,
            'appearance.font_size': DEFAULT_STATE.fontSize,
            'appearance.density': DEFAULT_STATE.density,
            'appearance.theme': 'light',
        };
        // P2: Error handling for reset API call
        updateSettings.mutate(settings, {
            onError: () => {
                toast.error('Không thể lưu cài đặt. Vui lòng thử lại.');
            },
        });
    }, [setTheme, updateSettings]);

    return {
        // Theme (from next-themes)
        theme: theme || 'light',
        resolvedTheme: resolvedTheme || 'light',
        setTheme: setThemeAndPersist,
        // Accent color
        accentColor: state.accentColor,
        setAccentColor,
        // Font size
        fontSize: state.fontSize,
        setFontSize,
        // Density
        density: state.density,
        setDensity,
        // Utilities
        mounted,
        resetAll,
    };
}
