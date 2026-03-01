// MD3 Chip Component — Assist, Filter, Input, Suggestion variants
// Reference: material.io/components/chips
import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, BorderRadius, Typography, Spacing } from '../constants/colors';

type ChipVariant = 'assist' | 'filter' | 'input' | 'suggestion';

interface MD3ChipProps {
    label: string;
    variant?: ChipVariant;
    icon?: keyof typeof MaterialIcons.glyphMap;
    selected?: boolean;
    onPress?: () => void;
    onClose?: () => void;
    disabled?: boolean;
}

export function MD3Chip({
    label,
    variant = 'assist',
    icon,
    selected = false,
    onPress,
    onClose,
    disabled = false,
}: MD3ChipProps) {
    const isFilter = variant === 'filter';
    const showCheckmark = isFilter && selected;

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [
                styles.base,
                selected ? styles.selected : styles.unselected,
                disabled && styles.disabled,
                pressed && !disabled && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected, disabled }}
            android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
        >
            {showCheckmark && (
                <MaterialIcons name="check" size={18} color={Colors.onSecondaryContainer} style={{ marginRight: 4 }} />
            )}
            {icon && !showCheckmark && (
                <MaterialIcons
                    name={icon}
                    size={18}
                    color={selected ? Colors.onSecondaryContainer : Colors.onSurfaceVariant}
                    style={{ marginRight: 4 }}
                />
            )}
            <Text style={[
                Typography.labelLarge,
                { color: selected ? Colors.onSecondaryContainer : Colors.onSurfaceVariant },
                disabled && { color: Colors.outline },
            ]}>
                {label}
            </Text>
            {onClose && variant === 'input' && (
                <Pressable
                    onPress={onClose}
                    hitSlop={8}
                    style={{ marginLeft: 4 }}
                    accessibilityLabel={`Xóa ${label}`}
                    accessibilityRole="button"
                >
                    <MaterialIcons name="close" size={16} color={Colors.onSurfaceVariant} />
                </Pressable>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 32,                    // MD3: 32dp
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.sm, // MD3: 8dp
    },
    unselected: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Colors.outline,
    },
    selected: {
        backgroundColor: Colors.secondaryContainer,
        borderWidth: 0,
    },
    disabled: {
        opacity: 0.38,
    },
    pressed: {
        opacity: 0.8,
    },
});
