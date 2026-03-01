// Push Notification Service — register/unregister FCM/APNs tokens
// Called automatically from auth-store on login/logout
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';

// Store current token for unregister
let currentPushToken: string | null = null;

// Configure foreground notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

/**
 * Register push token with backend.
 * Called after successful login.
 */
export async function registerPushToken(): Promise<string | null> {
    // Push notifications only work on real devices
    if (!Device.isDevice) {
        console.log('[Push] Skipping — not a real device');
        return null;
    }

    // Check/request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('[Push] Permission not granted');
        return null;
    }

    try {
        // Get Expo push token (unified iOS/Android)
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;
        const platform = Platform.OS; // 'ios' | 'android'

        // Send to backend — matches POST /mobile/devices
        await api.post('/mobile/devices', {
            device_token: token,
            platform,
        });

        currentPushToken = token;
        console.log('[Push] Token registered:', token.substring(0, 20) + '...');
        return token;
    } catch (error) {
        console.error('[Push] Failed to register token:', error);
        return null;
    }
}

/**
 * Unregister push token from backend.
 * Called on logout.
 */
export async function unregisterPushToken(): Promise<void> {
    if (!currentPushToken) return;
    try {
        await api.delete(`/mobile/devices/${encodeURIComponent(currentPushToken)}`);
        currentPushToken = null;
        console.log('[Push] Token unregistered');
    } catch (error) {
        // Non-critical — token will expire naturally
        console.warn('[Push] Failed to unregister token:', error);
    }
}

/**
 * Setup notification response handler for deep linking.
 * Call once on app startup.
 */
export function setupNotificationHandlers(navigate: (path: string) => void): () => void {
    // Handle notification tap — deep link to relevant screen
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;

        if (data?.type === 'ORDER_STATUS' && data?.order_id) {
            navigate(`/orders/${data.order_id}`);
        } else if (data?.type === 'LEAVE_APPROVAL' && data?.leave_id) {
            navigate('/hr/leave');
        } else if (data?.type === 'LOW_STOCK') {
            navigate('/inventory');
        }
    });

    return () => subscription.remove();
}
