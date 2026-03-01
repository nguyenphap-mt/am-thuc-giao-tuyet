// WebSocket hook — real-time updates for orders and notifications
import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from './auth-store';

const WS_BASE_URL = 'wss://am-thuc-giao-tuyet-api.onrender.com/ws';

interface WSMessage {
    type: string;
    data: any;
    timestamp: string;
}

export function useWebSocket() {
    const { token, isAuthenticated } = useAuthStore();
    const queryClient = useQueryClient();
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const connect = useCallback(() => {
        if (!isAuthenticated || !token) return;

        try {
            const ws = new WebSocket(`${WS_BASE_URL}?token=${token}`);

            ws.onopen = () => {
                console.log('[WS] Connected');
                setIsConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    const msg: WSMessage = JSON.parse(event.data);
                    handleMessage(msg);
                } catch (e) {
                    console.warn('[WS] Parse error:', e);
                }
            };

            ws.onerror = (error) => {
                console.warn('[WS] Error:', error);
            };

            ws.onclose = () => {
                console.log('[WS] Disconnected');
                setIsConnected(false);
                // Auto-reconnect after 5 seconds
                reconnectTimerRef.current = setTimeout(() => {
                    connect();
                }, 5000);
            };

            wsRef.current = ws;
        } catch (error) {
            console.error('[WS] Connection failed:', error);
        }
    }, [isAuthenticated, token]);

    const handleMessage = useCallback((msg: WSMessage) => {
        switch (msg.type) {
            case 'ORDER_STATUS_CHANGED':
                // Invalidate order queries to refetch
                queryClient.invalidateQueries({ queryKey: ['orders'] });
                queryClient.invalidateQueries({ queryKey: ['order-detail', msg.data?.order_id] });
                queryClient.invalidateQueries({ queryKey: ['today-orders'] });
                queryClient.invalidateQueries({ queryKey: ['pending-actions'] });
                break;

            case 'NEW_NOTIFICATION':
                queryClient.invalidateQueries({ queryKey: ['notifications'] });
                break;

            case 'QUOTE_STATUS_CHANGED':
                queryClient.invalidateQueries({ queryKey: ['quotes'] });
                queryClient.invalidateQueries({ queryKey: ['pending-actions'] });
                queryClient.invalidateQueries({ queryKey: ['approvals'] });
                break;

            case 'SCHEDULE_UPDATED':
                queryClient.invalidateQueries({ queryKey: ['my-schedule'] });
                queryClient.invalidateQueries({ queryKey: ['today-orders'] });
                break;

            case 'INVENTORY_UPDATED':
                queryClient.invalidateQueries({ queryKey: ['inventory'] });
                break;

            default:
                console.log('[WS] Unhandled message type:', msg.type);
        }
    }, [queryClient]);

    const disconnect = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
    }, []);

    // Connect when authenticated, disconnect when not
    useEffect(() => {
        if (isAuthenticated) {
            connect();
        } else {
            disconnect();
        }
        return () => disconnect();
    }, [isAuthenticated]);

    // Handle app state changes (reconnect when app comes to foreground)
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
            if (state === 'active' && isAuthenticated && !isConnected) {
                connect();
            } else if (state === 'background') {
                disconnect();
            }
        });
        return () => subscription.remove();
    }, [isAuthenticated, isConnected]);

    return { isConnected };
}
