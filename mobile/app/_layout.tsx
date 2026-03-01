// Root Layout — wraps entire app with providers + push notifications + offline banner
import { useEffect, useRef } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { queryClient } from '../lib/query-client';
import { useAuthStore } from '../lib/auth-store';
import { Colors } from '../constants/colors';
import {
    registerForPushNotifications,
    savePushTokenToServer,
    setupAndroidChannel,
    getNotificationRoute,
} from '../lib/push-notifications';
import { OfflineBanner } from '../components/OfflineBanner';

function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuthStore();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!isAuthenticated && !inAuthGroup) {
            router.replace('/(auth)/login');
        } else if (isAuthenticated && inAuthGroup) {
            router.replace('/(tabs)/home');
        }
    }, [isAuthenticated, isLoading, segments]);

    if (isLoading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return <>{children}</>;
}

export default function RootLayout() {
    const { restoreSession, isAuthenticated } = useAuthStore();
    const router = useRouter();
    const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);

    useEffect(() => {
        restoreSession();
    }, []);

    // F5: Push notification setup — only when authenticated
    useEffect(() => {
        if (!isAuthenticated) return;

        // Setup Android channels
        setupAndroidChannel();

        // Register for push and save token
        (async () => {
            const token = await registerForPushNotifications();
            if (token) {
                await savePushTokenToServer(token);
            }
        })();

        // Handle notification taps (when user clicks a push notification)
        notificationResponseListener.current =
            Notifications.addNotificationResponseReceivedListener(response => {
                const route = getNotificationRoute(response.notification);
                if (route) {
                    // Small delay to ensure navigation is ready
                    setTimeout(() => {
                        router.push(route as any);
                    }, 500);
                }
            });

        return () => {
            if (notificationResponseListener.current) {
                notificationResponseListener.current.remove();
            }
        };
    }, [isAuthenticated]);

    return (
        <QueryClientProvider client={queryClient}>
            <StatusBar style="dark" />
            <AuthGuard>
                <OfflineBanner />
                <Slot />
            </AuthGuard>
        </QueryClientProvider>
    );
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.bgPrimary,
    },
});
