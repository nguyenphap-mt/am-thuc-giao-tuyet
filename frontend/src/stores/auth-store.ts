import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage, PersistOptions } from 'zustand/middleware';
import { api } from '@/lib/api';
import { User } from '@/types';

// BUGFIX: BUG-20260201-003
// Root Cause: Zustand persist middleware used its own 'auth-storage' key in localStorage,
// completely bypassing our conditional localStorage vs sessionStorage logic.
// Solution: Implement custom storage adapter that respects "Remember Me" preference.

interface LoginCredentials {
    email: string;
    password: string;
    rememberMe?: boolean;
}

interface AuthResponse {
    access_token: string;
    token_type: string;
    user: User;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    error: string | null;
    rememberMe: boolean;
    isHydrated: boolean;
    login: (credentials: LoginCredentials) => Promise<boolean>;
    logout: () => void;
    checkAuth: () => void;
    clearError: () => void;
}

const STORAGE_KEY = 'auth-storage';
const REMEMBER_KEY = 'remember_me';

/**
 * Check if user chose to be remembered.
 * This is stored in localStorage since we need to read it on fresh page load
 * BEFORE we know which storage to use.
 */
function getRememberPreference(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(REMEMBER_KEY) === 'true';
}

/**
 * Set the remember preference in localStorage.
 */
function setRememberPreference(remember: boolean): void {
    if (typeof window === 'undefined') return;
    if (remember) {
        localStorage.setItem(REMEMBER_KEY, 'true');
    } else {
        localStorage.removeItem(REMEMBER_KEY);
    }
}

/**
 * Get the appropriate storage based on remember preference.
 */
function getActiveStorage(): Storage {
    if (typeof window === 'undefined') {
        // SSR fallback - return a no-op storage
        return {
            getItem: () => null,
            setItem: () => { },
            removeItem: () => { },
            length: 0,
            clear: () => { },
            key: () => null,
        };
    }
    return getRememberPreference() ? localStorage : sessionStorage;
}

/**
 * Custom storage adapter for Zustand that switches between
 * localStorage (persistent) and sessionStorage (session-only)
 * based on the "Remember Me" preference.
 */
const customPersistStorage = {
    getItem: (name: string): string | null => {
        if (typeof window === 'undefined') return null;

        // On page load, check remember preference first
        const storage = getActiveStorage();
        const value = storage.getItem(name);

        // If nothing in the preferred storage, also check the other one
        // This handles edge cases where user changes preference
        if (!value) {
            const otherStorage = getRememberPreference() ? sessionStorage : localStorage;
            return otherStorage.getItem(name);
        }

        return value;
    },

    setItem: (name: string, value: string): void => {
        if (typeof window === 'undefined') return;

        const storage = getActiveStorage();
        storage.setItem(name, value);

        // Clean up the other storage to prevent stale data
        const otherStorage = getRememberPreference() ? sessionStorage : localStorage;
        otherStorage.removeItem(name);
    },

    removeItem: (name: string): void => {
        if (typeof window === 'undefined') return;

        // Remove from both storages to ensure clean logout
        localStorage.removeItem(name);
        sessionStorage.removeItem(name);
    },
};

// Type for the persist middleware
type AuthPersist = (
    config: StateCreator<AuthState>,
    options: PersistOptions<AuthState, Partial<AuthState>>
) => StateCreator<AuthState>;

export const useAuthStore = create<AuthState>()(
    (persist as AuthPersist)(
        (set, get) => ({
            user: null,
            token: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
            rememberMe: getRememberPreference(),
            isHydrated: false, // Initial hydration state

            login: async (credentials: LoginCredentials) => {
                set({ isLoading: true, error: null });
                try {
                    const formData = new URLSearchParams();
                    formData.append('username', credentials.email);
                    formData.append('password', credentials.password);

                    const response = await api.post<AuthResponse>('/auth/login', formData, {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                    });

                    const rememberMe = credentials.rememberMe ?? false;

                    // CRITICAL: Set remember preference BEFORE updating state
                    // This ensures Zustand persist uses the correct storage
                    setRememberPreference(rememberMe);

                    set({
                        user: response.user,
                        token: response.access_token,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                        rememberMe: rememberMe,
                    });

                    return true;
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : 'Đăng nhập thất bại';
                    set({
                        isLoading: false,
                        error: message,
                        isAuthenticated: false,
                    });
                    return false;
                }
            },

            logout: () => {
                // Clear remember preference on logout
                setRememberPreference(false);

                // Clear storage for both localStorage and sessionStorage
                localStorage.removeItem(STORAGE_KEY);
                sessionStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(REMEMBER_KEY);

                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    error: null,
                    rememberMe: false,
                });
            },

            clearError: () => {
                set({ error: null });
            },

            checkAuth: () => {
                const state = get();

                // If we already have auth data in state, use it
                if (state.token && state.user) {
                    set({ isAuthenticated: true });
                    return;
                }

                // Otherwise, set unauthenticated
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                });
            },
        }),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => customPersistStorage),
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
                rememberMe: state.rememberMe,
            }),
            // Called when hydrating from storage
            onRehydrateStorage: () => (state) => {
                // When hydration finishes, set isHydrated to true
                if (state) {
                    state.rememberMe = getRememberPreference();
                    state.isHydrated = true;
                }
            },
        }
    )
);
