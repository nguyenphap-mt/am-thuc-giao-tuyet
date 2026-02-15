import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

// API Base Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// BUGFIX: BUG-20260201-004
// Root Cause: API interceptor was reading deprecated 'access_token' key from localStorage,
// but auth-store now uses Zustand persist with 'auth-storage' key.
// Solution: Read token from Zustand persist storage format.

const STORAGE_KEY = 'auth-storage';
const REMEMBER_KEY = 'remember_me';

/**
 * Get auth token from Zustand persist storage.
 * Checks localStorage or sessionStorage based on remember_me preference.
 */
/**
 * Get auth token from Zustand persist storage.
 * Checks localStorage or sessionStorage based on remember_me preference.
 */
function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;

    // 1. Determine which storage to query
    const rememberMe = localStorage.getItem(REMEMBER_KEY) === 'true';
    const storage = rememberMe ? localStorage : sessionStorage;

    // 2. Try getting the raw Zustand storage
    let rawData = storage.getItem(STORAGE_KEY);

    // 3. Fallback: If not finding expected storage, try the other one
    // This handles cases where preference changed but data migrated or wasn't cleaned
    if (!rawData) {
        const fallbackStorage = rememberMe ? sessionStorage : localStorage;
        rawData = fallbackStorage.getItem(STORAGE_KEY);
    }

    if (!rawData) return null;

    try {
        const parsed = JSON.parse(rawData);
        // Zustand persists state under the 'state' key
        return parsed.state?.token || null;
    } catch (e) {
        console.error("Failed to parse auth token", e);
        return null;
    }
}

/**
 * Clear all auth-related storage on logout/unauthorized.
 */
function clearAuthStorage(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * Get tenant ID from Zustand persist storage.
 * Checks localStorage or sessionStorage based on remember_me preference.
 */
function getTenantId(): string | null {
    if (typeof window === 'undefined') return null;

    // 1. Determine which storage to query
    const rememberMe = localStorage.getItem(REMEMBER_KEY) === 'true';
    const storage = rememberMe ? localStorage : sessionStorage;

    // 2. Try getting the raw Zustand storage
    let rawData = storage.getItem(STORAGE_KEY);

    // 3. Fallback: If not finding expected storage, try the other one
    if (!rawData) {
        const fallbackStorage = rememberMe ? sessionStorage : localStorage;
        rawData = fallbackStorage.getItem(STORAGE_KEY);
    }

    if (!rawData) return null;

    try {
        const parsed = JSON.parse(rawData);
        // Zustand persists state under the 'state' key, user has tenant_id
        return parsed.state?.user?.tenant_id?.toString() || null;
    } catch (e) {
        console.error("Failed to parse tenant ID", e);
        return null;
    }
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds
});

// Request interceptor - Attach JWT token and X-Tenant-ID header
// BUGFIX: BUG-20260204-001
// Root Cause: Backend's get_current_tenant dependency requires X-Tenant-ID header
// for multi-tenant context. Missing this header caused 401 Unauthorized errors.
apiClient.interceptors.request.use(
    (config) => {
        const token = getAuthToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add X-Tenant-ID header for multi-tenant support
        const tenantId = getTenantId();
        if (tenantId) {
            config.headers['X-Tenant-ID'] = tenantId;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // Handle 401 Unauthorized - Redirect to login
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                clearAuthStorage();
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Generic API methods
export const api = {
    get: <T>(url: string, config?: AxiosRequestConfig) =>
        apiClient.get<T>(url, config).then(res => res.data),

    post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
        apiClient.post<T>(url, data, config).then(res => res.data),

    put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
        apiClient.put<T>(url, data, config).then(res => res.data),

    patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
        apiClient.patch<T>(url, data, config).then(res => res.data),

    delete: <T>(url: string, config?: AxiosRequestConfig) =>
        apiClient.delete<T>(url, config).then(res => res.data),

    getBlob: (url: string, config?: AxiosRequestConfig) =>
        apiClient.get(url, { ...config, responseType: 'arraybuffer' }).then(res => res.data),
};

export default apiClient;
export { API_BASE_URL };
