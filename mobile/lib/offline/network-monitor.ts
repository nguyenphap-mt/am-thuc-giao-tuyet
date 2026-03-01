// Network Monitor — connectivity detection + auto-sync trigger
// Wraps @react-native-community/netinfo for offline-first UX
import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { fullSync } from './sync-engine';

interface NetworkStatus {
    isOnline: boolean;
    isWifi: boolean;
    type: string | null;
    lastOnlineAt: Date | null;
}

/**
 * React hook for network status + auto-sync on reconnect.
 *
 * Usage:
 *   const { isOnline, isWifi, isSyncing } = useNetworkStatus();
 */
export function useNetworkStatus() {
    const [status, setStatus] = useState<NetworkStatus>({
        isOnline: true, // Assume online until proven otherwise
        isWifi: false,
        type: null,
        lastOnlineAt: null,
    });
    const [isSyncing, setIsSyncing] = useState(false);
    const wasOffline = useRef(false);

    const handleSync = useCallback(async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        try {
            await fullSync();
            console.log('[Network] Auto-sync completed after reconnect');
        } catch (error) {
            console.error('[Network] Auto-sync failed:', error);
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing]);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
            const isOnline = state.isConnected === true && state.isInternetReachable !== false;
            const isWifi = state.type === 'wifi';

            setStatus(prev => ({
                isOnline,
                isWifi,
                type: state.type,
                lastOnlineAt: isOnline ? new Date() : prev.lastOnlineAt,
            }));

            // Auto-sync when coming back online from offline
            if (isOnline && wasOffline.current) {
                wasOffline.current = false;
                handleSync();
            }

            if (!isOnline) {
                wasOffline.current = true;
            }
        });

        return () => unsubscribe();
    }, [handleSync]);

    return {
        ...status,
        isSyncing,
        triggerSync: handleSync,
    };
}

/**
 * One-shot check: is the device currently online?
 */
export async function checkIsOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable !== false;
}
