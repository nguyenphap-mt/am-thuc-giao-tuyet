// MD3 Button Component — Filled, Outlined, Text, Tonal, Elevated variants
// Reference: material.io/components/buttons
import React from 'react';
import { Pressable, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, BorderRadius, Typography, Spacing, Elevation } from '../constants/colors';
import * as Haptics from 'expo-haptics';

type ButtonVariant = 'filled' | 'outlined' | 'text' | 'tonal' | 'elevated';

interface MD3ButtonProps {
    label: string;
    onPress: () => void;
    variant?: ButtonVariant;
    icon?: keyof typeof MaterialIcons.glyphMap;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    size?: 'small' | 'medium' | 'large';
    accessibilityLabel?: string;
}

export function MD3Button({
    label,
    onPress,
    variant = 'filled',
    icon,
    disabled = false,
    loading = false,
    fullWidth = false,
    size = 'medium',
    accessibilityLabel,
}: MD3ButtonProps) {
    const handlePress = () => {
        if (!disabled && !loading) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
        }
    };

    const heights = { small: 34, medium: 40, large: 56 };
    const iconSizes = { small: 16, medium: 18, large: 22 };
    const height = heights[size];
    const iconSize = iconSizes[size];

    const containerStyle = [
        styles.base,
        { height, minWidth: height * 2 },
        styles[variant],
        disabled && styles[`${variant}Disabled` as keyof typeof styles],
        fullWidth && styles.fullWidth,
    ];

    const textColor = disabled
        ? Colors.onSurfaceVariant
        : variant === 'filled' ? Colors.onPrimary
            : variant === 'tonal' ? Colors.onSecondaryContainer
                : Colors.primary;

    return (
        <Pressable
            onPress={handlePress}
            disabled={disabled || loading}
            style={({ pressed }) => [
                ...containerStyle,
                pressed && !disabled && styles[`${variant}Pressed` as keyof typeof styles],
            ]}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel || label}
            accessibilityState={{ disabled, busy: loading }}
            android_ripple={{
                color: variant === 'filled' ? 'rgba(255,255,255,0.2)' : 'rgba(194,24,91,0.12)',
            }}
        >
            {loading ? (
                <ActivityIndicator size="small" color={textColor} />
            ) : (
                <View style={styles.content}>
                    {icon && (
                        <MaterialIcons
                            name={icon}
                            size={iconSize}
                            color={textColor}
                            style={{ marginRight: Spacing.sm }}
                        />
                    )}
                    <Text style={[Typography.labelLarge, { color: textColor }]}>
                        {label}
                    </Text>
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BorderRadius.xl,   // MD3: Full radius buttons
        paddingHorizontal: 24,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fullWidth: {
        width: '100%',
    },

    // Filled
    filled: {
        backgroundColor: Colors.primary,
        elevation: Elevation.level0,
    },
    filledPressed: {
        elevation: Elevation.level1,
    },
    filledDisabled: {
        backgroundColor: Colors.surfaceContainerHighest,
        elevation: Elevation.level0,
    },

    // Outlined
    outlined: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Colors.outline,
    },
    outlinedPressed: {
        backgroundColor: Colors.primaryContainer,
    },
    outlinedDisabled: {
        borderColor: Colors.outlineVariant,
    },

    // Text
    text: {
        backgroundColor: 'transparent',
        paddingHorizontal: 12,
    },
    textPressed: {
        backgroundColor: Colors.primaryContainer,
    },
    textDisabled: {},

    // Tonal
    tonal: {
        backgroundColor: Colors.secondaryContainer,
    },
    tonalPressed: {
        elevation: Elevation.level1,
    },
    tonalDisabled: {
        backgroundColor: Colors.surfaceContainerHighest,
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
    elevatedDisabled: {
        backgroundColor: Colors.surfaceContainerHighest,
        elevation: Elevation.level0,
    },
});
