// MD3 FAB Component — Standard, Small, Large, Extended variants
// Reference: material.io/components/floating-action-button
import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, BorderRadius, Typography, Spacing, Elevation } from '../constants/colors';
import * as Haptics from 'expo-haptics';

type FABVariant = 'standard' | 'small' | 'large' | 'extended';

interface MD3FABProps {
    icon: keyof typeof MaterialIcons.glyphMap;
    onPress: () => void;
    variant?: FABVariant;
    label?: string;           // Required for 'extended'
    color?: 'primary' | 'secondary' | 'tertiary' | 'surface';
    accessibilityLabel?: string;
}

const COLOR_MAP = {
    primary: { bg: Colors.primaryContainer, fg: Colors.onPrimaryContainer },
    secondary: { bg: Colors.secondaryContainer, fg: Colors.onSecondaryContainer },
    tertiary: { bg: Colors.tertiaryContainer, fg: Colors.onTertiaryContainer },
    surface: { bg: Colors.surfaceContainerHigh, fg: Colors.primary },
};

const SIZE_MAP = {
    small: { size: 40, iconSize: 24, radius: BorderRadius.md },
    standard: { size: 56, iconSize: 24, radius: BorderRadius.lg },
    large: { size: 96, iconSize: 36, radius: BorderRadius.xl },
    extended: { size: 56, iconSize: 24, radius: BorderRadius.lg },
};

export function MD3FAB({
    icon,
    onPress,
    variant = 'standard',
    label,
    color = 'primary',
    accessibilityLabel,
}: MD3FABProps) {
    const colors = COLOR_MAP[color];
    const sizeConfig = SIZE_MAP[variant];

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
    };

    return (
        <Pressable
            onPress={handlePress}
            style={({ pressed }) => [
                styles.base,
                {
                    width: variant === 'extended' ? undefined : sizeConfig.size,
                    height: sizeConfig.size,
                    borderRadius: sizeConfig.radius,
                    backgroundColor: colors.bg,
                },
                pressed && { elevation: Elevation.level4 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel || label || 'Action'}
            android_ripple={{ color: 'rgba(0,0,0,0.12)' }}
        >
            <MaterialIcons name={icon} size={sizeConfig.iconSize} color={colors.fg} />
            {variant === 'extended' && label && (
                <Text style={[Typography.labelLarge, { color: colors.fg, marginLeft: Spacing.md }]}>
                    {label}
                </Text>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: Elevation.level3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        paddingHorizontal: Spacing.lg,
    },
});
