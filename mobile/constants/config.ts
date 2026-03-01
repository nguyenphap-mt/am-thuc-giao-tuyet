// App configuration
export const Config = {
    // API Base URL — Render.com backend
    API_BASE_URL: 'https://am-thuc-api-b9so.onrender.com',

    // Fallback for local development (emulators)
    API_BASE_URL_IOS: 'http://localhost:8000',
    API_BASE_URL_ANDROID: 'http://10.0.2.2:8000',

    // App settings
    APP_NAME: 'Ẩm Thực Giao Tuyết',
    APP_VERSION: '1.0.0',

    // Sync interval (ms)
    SYNC_INTERVAL: 5 * 60 * 1000, // 5 minutes

    // Session timeout
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours

    // Tenant ID (hardcoded for now, should come from login)
    DEFAULT_TENANT_ID: '',
};

// Get platform-appropriate API URL
import { Platform } from 'react-native';

export function getApiBaseUrl(): string {
    // Always use Render backend (works on all platforms via HTTPS)
    return Config.API_BASE_URL;
}
