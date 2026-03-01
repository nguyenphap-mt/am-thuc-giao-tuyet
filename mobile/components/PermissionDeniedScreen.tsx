// Permission Denied Screen — shown when user navigates to a module without access
// MD3 compliant: uses Typography, Colors, MD3Button
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/colors';
import { MD3Button } from './MD3Button';

interface PermissionDeniedScreenProps {
    moduleName?: string;
}

export function PermissionDeniedScreen({ moduleName }: PermissionDeniedScreenProps) {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.container}>
                <View style={styles.iconWrap}>
                    <MaterialIcons name="lock" size={48} color={Colors.error} />
                </View>
                <Text style={styles.title}>Không có quyền truy cập</Text>
                <Text style={styles.subtitle}>
                    {moduleName
                        ? `Bạn không có quyền truy cập module "${moduleName}". Vui lòng liên hệ quản trị viên để được cấp quyền.`
                        : 'Bạn không có quyền truy cập tính năng này. Vui lòng liên hệ quản trị viên.'}
                </Text>
                <MD3Button
                    label="Về trang chủ"
                    icon="home"
                    onPress={() => router.replace('/(tabs)/home')}
                    variant="filled"
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.bgSecondary,
    },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xxxl,
        gap: Spacing.lg,
    },
    iconWrap: {
        width: 96,
        height: 96,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.errorContainer,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    title: {
        ...Typography.headlineSmall,
        color: Colors.textPrimary,
        textAlign: 'center',
    },
    subtitle: {
        ...Typography.bodyMedium,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
});
