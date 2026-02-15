import { useAuthStore } from './auth-store';
import { act } from 'react';

// Mock localStorage and sessionStorage
const localStorageMock = (function () {
    let store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => { store[key] = value.toString(); }),
        removeItem: jest.fn((key: string) => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; }),
        store
    };
})();

const sessionStorageMock = (function () {
    let store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => { store[key] = value.toString(); }),
        removeItem: jest.fn((key: string) => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; })
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

describe('AuthStore - Remember Me Logic', () => {
    beforeEach(() => {
        localStorageMock.clear();
        sessionStorageMock.clear();
        useAuthStore.getState().logout();
    });

    it('should use localStorage when rememberMe is true', async () => {
        const { login } = useAuthStore.getState();

        // Mock API login success handled in component/store (omitted here for unit logic check)
        // This test simulates the logic flow specifically for storage choice

        // Simulating the store's internal set behavior being triggered
        // In real integration test we'd mock the API call.
        // Here we direct check the storage adapter logic which we can access via logic inference
        // OR better, we look at where the previous Step 7 identified the issue.
    });
});
