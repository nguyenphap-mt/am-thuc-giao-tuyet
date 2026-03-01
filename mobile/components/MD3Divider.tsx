// MD3 Divider — Full-width and Inset variants
// Reference: material.io/components/divider
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../constants/colors';

interface MD3DividerProps {
    inset?: boolean;           // Left-inset (16dp)
    insetRight?: boolean;      // Both sides inset
}

export function MD3Divider({ inset = false, insetRight = false }: MD3DividerProps) {
    return (
        <View
            style={[
                styles.divider,
                inset && { marginLeft: Spacing.lg },
                insetRight && { marginRight: Spacing.lg },
            ]}
            accessibilityRole="none"
        />
    );
}

const styles = StyleSheet.create({
    divider: {
        height: 1,
        backgroundColor: Colors.outlineVariant,
    },
});
