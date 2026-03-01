// Signature Pad component — capture customer signatures
import { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/colors';
import { hapticLight, hapticSuccess } from '../lib/haptics';

interface Props {
    onSave: (signature: string) => void;
    onCancel?: () => void;
}

export default function SignaturePad({ onSave, onCancel }: Props) {
    const [hasDrawn, setHasDrawn] = useState(false);

    const handleClear = () => {
        hapticLight();
        setHasDrawn(false);
    };

    const handleSave = () => {
        hapticSuccess();
        // In a real implementation, this would capture the signature canvas data
        onSave('signature_data_placeholder');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>✍️ Ký tên xác nhận</Text>

            {/* Signature Canvas Placeholder */}
            <View style={styles.canvas}>
                <Text style={styles.canvasPlaceholder}>
                    {hasDrawn ? 'Đã ký' : 'Vui lòng ký vào đây'}
                </Text>
            </View>

            <View style={styles.actions}>
                <Pressable
                    style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.7 }]}
                    onPress={handleClear}
                    accessibilityLabel="Xóa chữ ký"
                    accessibilityRole="button"
                    android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                >
                    <Text style={styles.clearBtnText}>Xóa</Text>
                </Pressable>

                {onCancel && (
                    <Pressable
                        style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
                        onPress={() => { hapticLight(); onCancel(); }}
                        accessibilityLabel="Hủy ký tên"
                        accessibilityRole="button"
                        android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                    >
                        <Text style={styles.cancelBtnText}>Hủy</Text>
                    </Pressable>
                )}

                <Pressable
                    style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
                    onPress={handleSave}
                    accessibilityLabel="Lưu chữ ký"
                    accessibilityRole="button"
                    android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                >
                    <Text style={styles.saveBtnText}>Lưu</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    title: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
    },
    canvas: {
        height: 200,
        backgroundColor: Colors.bgTertiary,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    canvasPlaceholder: {
        fontSize: FontSize.md,
        color: Colors.textTertiary,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.md,
        justifyContent: 'flex-end',
    },
    clearBtn: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.bgTertiary,
    },
    clearBtnText: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    cancelBtn: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.bgTertiary,
    },
    cancelBtnText: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.error,
    },
    saveBtn: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.primary,
    },
    saveBtnText: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: Colors.textInverse,
    },
});
