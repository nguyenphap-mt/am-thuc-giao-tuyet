// Token management utilities
const TOKEN_KEY = 'access_token';
const USER_KEY = 'user';

export interface User {
    id: number;
    email: string;
    full_name: string;
    role: string;
    tenant_id: number;
    is_active: boolean;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: User;
}

// Get stored token
export function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
}

// Set token
export function setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
}

// Remove token
export function removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
}

// Get stored user
export function getUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
        return JSON.parse(userStr) as User;
    } catch {
        return null;
    }
}

// Set user
export function setUser(user: User): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Remove user
export function removeUser(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(USER_KEY);
}

// Clear all auth data
export function clearAuth(): void {
    removeToken();
    removeUser();
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
    return !!getToken();
}
