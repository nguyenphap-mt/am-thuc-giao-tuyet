// Network status hook + OfflineBanner component
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/colors';

/**
 * Hook to monitor network connectivity
 */
export function useNetworkStatus() {
    const [isConnected, setIsConnected] = useState(true);
    const [connectionType, setConnectionType] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected ?? true);
            setConnectionType(state.type);
        });
        return () => unsubscribe();
    }, []);

    return { isConnected, connectionType };
}

/**
 * Banner shown when device is offline
 */
export function OfflineBanner() {
    const { isConnected } = useNetworkStatus();
    const [fadeAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: isConnected ? 0 : 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isConnected, fadeAnim]);

    if (isConnected) return null;

    return (
        <Animated.View style={[styles.banner, { opacity: fadeAnim }]}>
            <MaterialIcons name="wifi-off" size={16} color={Colors.warning} />
            <Text style={styles.bannerText}>
                Không có kết nối mạng — dữ liệu sẽ được đồng bộ khi online
            </Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.warning + '20',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.warning + '40',
    },
    bannerIcon: {
        fontSize: 14,
    },
    bannerText: {
        fontSize: FontSize.xs,
        color: Colors.warning,
        fontWeight: '600',
        flex: 1,
    },
});
