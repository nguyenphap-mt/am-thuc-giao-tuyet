// MD3 Snackbar — Single-line / Multi-line with optional action
// Reference: material.io/components/snackbar
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Dimensions } from 'react-native';
import { Colors, BorderRadius, Typography, Spacing, Motion } from '../constants/colors';

interface MD3SnackbarProps {
    message: string;
    visible: boolean;
    onDismiss: () => void;
    action?: { label: string; onPress: () => void };
    duration?: number;
}

export function MD3Snackbar({
    message,
    visible,
    onDismiss,
    action,
    duration = 4000,
}: MD3SnackbarProps) {
    const translateY = useRef(new Animated.Value(80)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: Motion.durationMedium2,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: Motion.durationMedium1,
                    useNativeDriver: true,
                }),
            ]).start();

            const timer = setTimeout(onDismiss, duration);
            return () => clearTimeout(timer);
        } else {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 80,
                    duration: Motion.durationShort4,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: Motion.durationShort3,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, duration, onDismiss, translateY, opacity]);

    if (!visible) return null;

    return (
        <Animated.View
            style={[styles.container, { transform: [{ translateY }], opacity }]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
        >
            <Text style={styles.message} numberOfLines={2}>
                {message}
            </Text>
            {action && (
                <Pressable
                    onPress={() => { action.onPress(); onDismiss(); }}
                    style={styles.actionButton}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                >
                    <Text style={styles.actionLabel}>{action.label}</Text>
                </Pressable>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 96,              // Above nav bar (80dp + 16dp padding)
        left: Spacing.lg,
        right: Spacing.lg,
        backgroundColor: Colors.inverseSurface,
        borderRadius: BorderRadius.xs,
        paddingVertical: 14,
        paddingHorizontal: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    message: {
        ...Typography.bodyMedium,
        color: Colors.inverseOnSurface,
        flex: 1,
    },
    actionButton: {
        marginLeft: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
    },
    actionLabel: {
        ...Typography.labelLarge,
        color: Colors.inversePrimary,
    },
});
