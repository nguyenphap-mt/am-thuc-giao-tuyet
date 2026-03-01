// Push Notification Service — register, handle, and route notifications
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import api from './api';

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Register for push notifications and return the Expo Push Token.
 * On physical devices, requests permission and obtains token.
 * On simulators/web, returns null gracefully.
 */
export async function registerForPushNotifications(): Promise<string | null> {
    // Push only works on physical devices
    if (!Device.isDevice) {
        console.log('[Push] Not a physical device, skipping registration');
        return null;
    }

    // Check existing permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('[Push] Permission not granted');
        return null;
    }

    // Get Expo Push Token
    try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: projectId || undefined,
        });
        const token = tokenData.data;
        console.log('[Push] Token:', token);
        return token;
    } catch (error) {
        console.error('[Push] Failed to get token:', error);
        return null;
    }
}

/**
 * Send push token to backend for server-side push
 */
export async function savePushTokenToServer(token: string): Promise<void> {
    try {
        await api.post('/mobile/devices', {
            device_token: token,
            platform: Platform.OS,
            device_name: Device.deviceName || 'unknown',
        });
        console.log('[Push] Token saved to server');
    } catch (error) {
        console.error('[Push] Failed to save token:', error);
    }
}

/**
 * Set up Android notification channel (required for Android 8+)
 */
export async function setupAndroidChannel(): Promise<void> {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Thông báo chung',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#c2185b',
            sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('orders', {
            name: 'Đơn hàng',
            importance: Notifications.AndroidImportance.HIGH,
            sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('approvals', {
            name: 'Phê duyệt',
            importance: Notifications.AndroidImportance.MAX,
            sound: 'default',
        });
    }
}

/**
 * Parse notification data and return a deep link route
 */
export function getNotificationRoute(notification: Notifications.Notification): string | null {
    const data = notification.request.content.data;
    if (!data) return null;

    switch (data.type) {
        case 'ORDER_ASSIGNED':
        case 'ORDER_STATUS_CHANGED':
            return data.order_id ? `/orders/${data.order_id}` : '/orders';
        case 'QUOTE_PENDING':
            return data.quote_id ? `/quotes/${data.quote_id}` : '/approvals';
        case 'LEAVE_APPROVED':
        case 'LEAVE_REJECTED':
            return '/hr/timesheet';
        case 'SCHEDULE_CHANGE':
            return data.order_id ? `/event/${data.order_id}` : '/(tabs)/schedule';
        default:
            return '/(tabs)/notifications';
    }
}
