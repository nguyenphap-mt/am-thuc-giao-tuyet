// MD3 Card Component — Filled, Outlined, Elevated variants
// Reference: material.io/components/cards
import React from 'react';
import { Pressable, View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Elevation, Spacing } from '../constants/colors';

type CardVariant = 'filled' | 'outlined' | 'elevated';

interface MD3CardProps {
    children: React.ReactNode;
    variant?: CardVariant;
    onPress?: () => void;
    style?: ViewStyle;
    accessibilityLabel?: string;
}

export function MD3Card({
    children,
    variant = 'filled',
    onPress,
    style,
    accessibilityLabel,
}: MD3CardProps) {
    const cardStyle = [styles.base, styles[variant], style];

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [
                    ...cardStyle,
                    pressed && styles[`${variant}Pressed` as keyof typeof styles],
                ]}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
            >
                {children}
            </Pressable>
        );
    }

    return (
        <View style={cardStyle} accessibilityLabel={accessibilityLabel}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: BorderRadius.md,  // MD3: 12dp
        padding: Spacing.lg,
        overflow: 'hidden',
    },

    // Filled — default
    filled: {
        backgroundColor: Colors.surfaceContainerHighest,
    },
    filledPressed: {
        opacity: 0.92,
    },

    // Outlined
    outlined: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.outlineVariant,
    },
    outlinedPressed: {
        backgroundColor: Colors.surfaceContainerLow,
    },

    // Elevated
    elevated: {
        backgroundColor: Colors.surfaceContainerLow,
        elevation: Elevation.level1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    elevatedPressed: {
        elevation: Elevation.level2,
    },
});
