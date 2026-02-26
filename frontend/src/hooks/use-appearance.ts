'use client';

import { useTheme } from 'next-themes';
import { useCallback, useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { useMyPreferences, useUpdateMyPreferences } from './use-user-preferences';
import { useMyTenantSettings } from './use-tenants'; // fallback for first-time users

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

// Gradient palette for each accent color (from → via → to)
// Each color gets a harmonious 3-stop gradient
const ACCENT_GRADIENT_MAP: Record<string, { from: string; via: string; to: string; activeText: string; activeTextDark: string; iconColor: string; iconColorDark: string }> = {
    '#e11d48': { from: '#f43f5e', via: '#ec4899', to: '#ef4444', activeText: '#be123c', activeTextDark: '#fda4af', iconColor: '#e11d48', iconColorDark: '#fb7185' },
    '#7c3aed': { from: '#ec4899', via: '#a855f7', to: '#6366f1', activeText: '#7c3aed', activeTextDark: '#c4b5fd', iconColor: '#8b5cf6', iconColorDark: '#a78bfa' },
    '#4f46e5': { from: '#a855f7', via: '#6366f1', to: '#3b82f6', activeText: '#4338ca', activeTextDark: '#a5b4fc', iconColor: '#6366f1', iconColorDark: '#818cf8' },
    '#2563eb': { from: '#3b82f6', via: '#0ea5e9', to: '#06b6d4', activeText: '#1d4ed8', activeTextDark: '#93c5fd', iconColor: '#2563eb', iconColorDark: '#60a5fa' },
    '#0d9488': { from: '#14b8a6', via: '#10b981', to: '#22c55e', activeText: '#0f766e', activeTextDark: '#5eead4', iconColor: '#0d9488', iconColorDark: '#2dd4bf' },
    '#16a34a': { from: '#10b981', via: '#22c55e', to: '#84cc16', activeText: '#15803d', activeTextDark: '#86efac', iconColor: '#16a34a', iconColorDark: '#4ade80' },
    '#d97706': { from: '#eab308', via: '#f59e0b', to: '#f97316', activeText: '#b45309', activeTextDark: '#fcd34d', iconColor: '#d97706', iconColorDark: '#fbbf24' },
    '#ea580c': { from: '#f97316', via: '#ef4444', to: '#ec4899', activeText: '#c2410c', activeTextDark: '#fdba74', iconColor: '#ea580c', iconColorDark: '#fb923c' },
};

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

// Convert hex to HSL string for CSS
function hexToHSL(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Apply CSS variables + data attributes to :root
function applyAppearance(state: AppearanceState) {
    const root = document.documentElement;

    // --- Accent color system ---
    const accent = state.accentColor;
    const gradient = ACCENT_GRADIENT_MAP[accent] || ACCENT_GRADIENT_MAP['#7c3aed'];

    // Base accent
    root.style.setProperty('--app-accent', accent);
    root.style.setProperty('--app-accent-light', accent + '1a'); // 10% opacity

    // Gradient stops (consumed by .bg-accent-gradient etc.)
    root.style.setProperty('--accent-from', gradient.from);
    root.style.setProperty('--accent-via', gradient.via);
    root.style.setProperty('--accent-to', gradient.to);

    // Subtle gradient stops (10% opacity for active backgrounds)
    root.style.setProperty('--accent-from-10', gradient.from + '1a');
    root.style.setProperty('--accent-via-10', gradient.via + '1a');
    root.style.setProperty('--accent-to-10', gradient.to + '1a');

    // Active text colors (for sidebar active items, etc.)
    root.style.setProperty('--accent-active-text', gradient.activeText);
    root.style.setProperty('--accent-active-text-dark', gradient.activeTextDark);
    root.style.setProperty('--accent-icon', gradient.iconColor);
    root.style.setProperty('--accent-icon-dark', gradient.iconColorDark);

    // Override shadcn --primary with accent HSL
    const hsl = hexToHSL(accent);
    root.style.setProperty('--primary', hsl);
    root.style.setProperty('--sidebar-primary', hsl);
    root.style.setProperty('--ring', hsl);

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

    // Backend API hooks — user prefs (authoritative) + tenant settings (fallback)
    const { data: userPrefs } = useMyPreferences();
    const { data: tenantSettings } = useMyTenantSettings(); // fallback only
    const updatePrefs = useUpdateMyPreferences();

    // Load from localStorage immediately on mount (fast)
    useEffect(() => {
        setMounted(true);
        const stored = loadFromStorage();
        setState(stored);
        applyAppearance(stored);
    }, []);

    // Sync from backend API when available
    // Priority: userPrefs → tenantSettings (fallback) → DEFAULT_STATE
    useEffect(() => {
        if (apiSyncedRef.current) return;
        // Wait for user prefs query to resolve (even if empty)
        if (userPrefs === undefined) return;

        const apiState: Partial<AppearanceState> = {};
        let hasUserData = false;
        let themeFromApi: string | null = null;

        // 1. Try user preferences first (per-user)
        if (userPrefs && userPrefs.length > 0) {
            for (const pref of userPrefs) {
                if (pref.key === 'appearance.accent_color' && pref.value) {
                    apiState.accentColor = pref.value;
                    hasUserData = true;
                }
                if (pref.key === 'appearance.font_size' && pref.value) {
                    apiState.fontSize = pref.value as FontSize;
                    hasUserData = true;
                }
                if (pref.key === 'appearance.density' && pref.value) {
                    apiState.density = pref.value as Density;
                    hasUserData = true;
                }
                if (pref.key === 'appearance.theme' && pref.value) {
                    themeFromApi = pref.value;
                    hasUserData = true;
                }
            }
        }

        // 2. Fallback to tenant settings if user has no prefs yet
        if (!hasUserData && tenantSettings && tenantSettings.length > 0) {
            for (const setting of tenantSettings) {
                if (setting.key === 'appearance.accent_color' && setting.value) {
                    apiState.accentColor = setting.value;
                    hasUserData = true;
                }
                if (setting.key === 'appearance.font_size' && setting.value) {
                    apiState.fontSize = setting.value as FontSize;
                    hasUserData = true;
                }
                if (setting.key === 'appearance.density' && setting.value) {
                    apiState.density = setting.value as Density;
                    hasUserData = true;
                }
                if (setting.key === 'appearance.theme' && setting.value) {
                    themeFromApi = setting.value;
                    hasUserData = true;
                }
            }
        }

        if (themeFromApi) {
            setTheme(themeFromApi);
        }

        if (hasUserData) {
            const merged = { ...DEFAULT_STATE, ...apiState };
            setState(merged);
            applyAppearance(merged);
            saveToStorage(merged);
        }

        apiSyncedRef.current = true;
    }, [userPrefs, tenantSettings, setTheme]);

    // P3: Use ref to avoid stale closure for theme value
    const themeRef = useRef(theme);
    useEffect(() => { themeRef.current = theme; }, [theme]);

    // Debounced API save — batches rapid clicks into single mutation
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Helper: save both localStorage + API (with debounce)
    const persistSettings = useCallback((newState: AppearanceState, themeValue?: string) => {
        // Instant: save to localStorage for immediate persistence
        saveToStorage(newState);

        // Debounced: batch API calls (500ms) — save to per-user preferences
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            const preferences: Record<string, string> = {
                'appearance.accent_color': newState.accentColor,
                'appearance.font_size': newState.fontSize,
                'appearance.density': newState.density,
                'appearance.theme': themeValue || themeRef.current || 'light',
            };
            // P2: Error handling for API save failures
            updatePrefs.mutate(preferences, {
                onError: () => {
                    toast.error('Không thể lưu cài đặt. Vui lòng thử lại.');
                },
            });
        }, 500);
    }, [updatePrefs]); // P3: removed `theme` from deps, using themeRef instead

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
        const preferences: Record<string, string> = {
            'appearance.accent_color': DEFAULT_STATE.accentColor,
            'appearance.font_size': DEFAULT_STATE.fontSize,
            'appearance.density': DEFAULT_STATE.density,
            'appearance.theme': 'light',
        };
        // P2: Error handling for reset API call
        updatePrefs.mutate(preferences, {
            onError: () => {
                toast.error('Không thể lưu cài đặt. Vui lòng thử lại.');
            },
        });
    }, [setTheme, updatePrefs]);

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
