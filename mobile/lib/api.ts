// API client for mobile app — mirrors frontend pattern
import { getApiBaseUrl } from '../constants/config';
import { useAuthStore } from './auth-store';

const BASE_URL = getApiBaseUrl();

interface RequestOptions {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
}

async function apiRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { token, tenantId, logout } = useAuthStore.getState();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (tenantId) {
        headers['X-Tenant-ID'] = tenantId;
    }

    const url = `${BASE_URL}/api/v1${endpoint}`;

    const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 401) {
        logout();
        throw new Error('Session expired');
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API Error: ${response.status}`);
    }

    return response.json();
}

// Convenience methods
export const api = {
    get: <T = any>(endpoint: string) => apiRequest<T>(endpoint),

    post: <T = any>(endpoint: string, body: any) =>
        apiRequest<T>(endpoint, { method: 'POST', body }),

    put: <T = any>(endpoint: string, body: any) =>
        apiRequest<T>(endpoint, { method: 'PUT', body }),

    delete: <T = any>(endpoint: string) =>
        apiRequest<T>(endpoint, { method: 'DELETE' }),
};

export default api;
