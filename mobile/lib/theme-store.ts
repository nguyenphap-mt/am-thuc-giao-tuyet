// Theme Store — Light / Dark / System theme management
import { create } from 'zustand';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
    mode: ThemeMode;
    isDark: boolean;
    setMode: (mode: ThemeMode) => void;
    restore: () => Promise<void>;
}

const THEME_KEY = '@theme_mode';

function resolveIsDark(mode: ThemeMode): boolean {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    // System follows device color scheme
    return Appearance.getColorScheme() === 'dark';
}

export const useThemeStore = create<ThemeState>((set) => ({
    mode: 'light',
    isDark: false,

    setMode: async (mode: ThemeMode) => {
        set({ mode, isDark: resolveIsDark(mode) });
        await AsyncStorage.setItem(THEME_KEY, mode);
    },

    restore: async () => {
        try {
            const stored = await AsyncStorage.getItem(THEME_KEY) as ThemeMode | null;
            if (stored) {
                set({ mode: stored, isDark: resolveIsDark(stored) });
            }
        } catch { }
    },
}));

// Dark mode color palette
export const DarkColors = {
    bgPrimary: '#1a1a2e',
    bgSecondary: '#16213e',
    bgTertiary: '#0f3460',
    textPrimary: '#f5f5f5',
    textSecondary: '#a1a1aa',
    textTertiary: '#71717a',
    textInverse: '#1a1a2e',
    border: '#334155',
    borderLight: '#1e293b',
    primary: '#e91e8c',
    gradientStart: '#e91e8c',
    gradientMid: '#9c27b0',
    gradientEnd: '#673ab7',
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
};

// Get colors based on isDark flag
export function getThemeColors(isDark: boolean) {
    if (!isDark) {
        // Return existing light colors (from constants/colors.ts)
        return null; // Caller uses default Colors
    }
    return DarkColors;
}
