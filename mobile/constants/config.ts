// App configuration
export const Config = {
    // API Base URL - Change to your backend URL
    API_BASE_URL: __DEV__ ? 'http://10.0.2.2:8000' : 'https://api.giaotuyet.com',

    // For iOS simulator, use localhost
    // For Android emulator, use 10.0.2.2 (maps to host machine's localhost)
    // For physical device, use your LAN IP
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
    if (!__DEV__) return Config.API_BASE_URL;
    if (Platform.OS === 'web') return 'http://localhost:8000';
    return Platform.OS === 'ios' ? Config.API_BASE_URL_IOS : Config.API_BASE_URL_ANDROID;
}
