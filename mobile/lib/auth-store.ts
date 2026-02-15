// Zustand Auth Store — persisted via expo-secure-store (native) or localStorage (web)
import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Platform-aware storage adapter
const storage = {
    async getItem(key: string): Promise<string | null> {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        }
        return SecureStore.getItemAsync(key);
    },
    async setItem(key: string, value: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.setItem(key, value);
            return;
        }
        await SecureStore.setItemAsync(key, value);
    },
    async removeItem(key: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
            return;
        }
        await SecureStore.deleteItemAsync(key);
    },
};

interface User {
    id: string;
    email: string;
    full_name: string;
    role: { code: string; name: string };
    tenant_id: string;
}

interface AuthState {
    token: string | null;
    tenantId: string | null;
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // Actions
    login: (token: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    restoreSession: () => Promise<void>;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    tenantId: null,
    user: null,
    isAuthenticated: false,
    isLoading: true,

    login: async (token: string, user: User) => {
        await storage.setItem(TOKEN_KEY, token);
        await storage.setItem(USER_KEY, JSON.stringify(user));
        set({
            token,
            user,
            tenantId: user.tenant_id,
            isAuthenticated: true,
            isLoading: false,
        });
    },

    logout: async () => {
        await storage.removeItem(TOKEN_KEY);
        await storage.removeItem(USER_KEY);
        set({
            token: null,
            user: null,
            tenantId: null,
            isAuthenticated: false,
            isLoading: false,
        });
    },

    restoreSession: async () => {
        try {
            const token = await storage.getItem(TOKEN_KEY);
            const userJson = await storage.getItem(USER_KEY);

            if (token && userJson) {
                const user = JSON.parse(userJson) as User;
                set({
                    token,
                    user,
                    tenantId: user.tenant_id,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                set({ isLoading: false });
            }
        } catch (error) {
            console.error('Failed to restore session:', error);
            set({ isLoading: false });
        }
    },
}));
