// Reusable Confirmation Modal — replaces native Alert.alert()
// Per frontend rules §6.1: MUST use custom modal, NOT window.confirm() or Alert.alert()
import {
    View,
    Text,
    Pressable,
    Modal,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/colors';
import { hapticLight, hapticMedium, hapticHeavy } from '../lib/haptics';

interface ConfirmModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    variant?: 'default' | 'danger';
}

export default function ConfirmModal({
    visible,
    title,
    message,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    onConfirm,
    onCancel,
    isLoading = false,
    variant = 'default',
}: ConfirmModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Title */}
                    <Text style={styles.title}>{title}</Text>

                    {/* Message */}
                    <Text style={styles.message}>{message}</Text>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <Pressable
                            style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.7 }]}
                            onPress={() => { hapticLight(); onCancel(); }}
                            disabled={isLoading}
                            accessibilityLabel={cancelText}
                            accessibilityRole="button"
                            android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                        >
                            <Text style={styles.cancelText}>{cancelText}</Text>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [styles.confirmButton, pressed && { opacity: 0.8 }]}
                            onPress={() => { variant === 'danger' ? hapticHeavy() : hapticMedium(); onConfirm(); }}
                            disabled={isLoading}
                            accessibilityLabel={confirmText}
                            accessibilityRole="button"
                            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                        >
                            {variant === 'danger' ? (
                                <View style={styles.dangerGradient}>
                                    {isLoading ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.confirmText}>{confirmText}</Text>
                                    )}
                                </View>
                            ) : (
                                <LinearGradient
                                    colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.gradientButton}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.confirmText}>{confirmText}</Text>
                                    )}
                                </LinearGradient>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    container: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        width: '100%',
        maxWidth: 340,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
    },
    title: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
        textAlign: 'center',
    },
    message: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.bgTertiary,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    confirmButton: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    gradientButton: {
        paddingVertical: Spacing.md,
        alignItems: 'center',
        borderRadius: BorderRadius.lg,
    },
    dangerGradient: {
        paddingVertical: Spacing.md,
        alignItems: 'center',
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.error,
    },
    confirmText: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: '#ffffff',
    },
});
