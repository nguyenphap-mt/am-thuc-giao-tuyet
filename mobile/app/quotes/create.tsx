// Quote Creation Wizard — 3-step container
import { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { hapticLight, hapticWarning } from '../../lib/haptics';
import CustomerStep from './steps/CustomerStep';
import MenuStep from './steps/MenuStep';
import ReviewStep from './steps/ReviewStep';
import { useQuoteDraftStore } from '../../lib/stores/quote-draft';
import ConfirmModal from '../../components/ConfirmModal';

const STEPS = [
    { key: 'customer', label: 'Khách hàng', icon: 'person' as keyof typeof MaterialIcons.glyphMap },
    { key: 'menu', label: 'Chọn món', icon: 'restaurant-menu' as keyof typeof MaterialIcons.glyphMap },
    { key: 'review', label: 'Xem lại', icon: 'check-circle' as keyof typeof MaterialIcons.glyphMap },
];

export default function QuoteCreateScreen() {
    const [currentStep, setCurrentStep] = useState(0);
    const router = useRouter();
    const store = useQuoteDraftStore();
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    const handleCancelPress = useCallback(() => {
        // If user has entered any data, confirm before discarding
        const hasData = store.customer_name.trim() || store.items.length > 0 || store.event_type;
        if (hasData) {
            hapticWarning();
            setShowCancelConfirm(true);
        } else {
            store.reset();
            router.back();
        }
    }, [store, router]);

    const handleConfirmCancel = useCallback(() => {
        setShowCancelConfirm(false);
        store.reset();
        router.back();
    }, [store, router]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen
                options={{
                    title: 'Tạo báo giá',
                    headerLeft: () => (
                        <Pressable
                            onPress={() => { hapticLight(); handleCancelPress(); }}
                            style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
                            accessibilityLabel="Hủy tạo báo giá"
                            accessibilityRole="button"
                            accessibilityHint="Nhấn để hủy và quay lại danh sách"
                        >
                            <Text style={styles.cancelBtnText}>Hủy</Text>
                        </Pressable>
                    ),
                }}
            />

            {/* Step Indicator */}
            <View style={styles.stepBar}>
                {STEPS.map((step, i) => (
                    <View key={step.key} style={styles.stepItem}>
                        <View
                            style={[
                                styles.stepDot,
                                i < currentStep && styles.stepDotDone,
                                i === currentStep && styles.stepDotActive,
                            ]}
                            accessibilityLabel={`Bước ${i + 1}: ${step.label}${i < currentStep ? ', hoàn thành' : i === currentStep ? ', đang thực hiện' : ''}`}
                            accessibilityRole="text"
                        >
                            {i < currentStep ? (
                                <MaterialIcons name="check" size={16} color={Colors.textInverse} />
                            ) : (
                                <MaterialIcons name={step.icon} size={16} color={i === currentStep ? Colors.textInverse : Colors.textTertiary} />
                            )}
                        </View>
                        <Text style={[
                            styles.stepLabel,
                            i === currentStep && styles.stepLabelActive,
                        ]}>
                            {step.label}
                        </Text>
                        {i < STEPS.length - 1 && (
                            <View style={[styles.stepLine, i < currentStep && styles.stepLineDone]} />
                        )}
                    </View>
                ))}
            </View>

            {/* Step Content */}
            {currentStep === 0 && <CustomerStep onNext={() => setCurrentStep(1)} />}
            {currentStep === 1 && <MenuStep onNext={() => setCurrentStep(2)} onBack={() => setCurrentStep(0)} />}
            {currentStep === 2 && <ReviewStep onBack={() => setCurrentStep(1)} />}

            {/* Cancel Confirmation Modal */}
            <ConfirmModal
                visible={showCancelConfirm}
                title="Hủy tạo báo giá?"
                message="Dữ liệu bạn đã nhập sẽ bị mất. Bạn có chắc muốn hủy?"
                confirmText="Hủy báo giá"
                cancelText="Tiếp tục"
                onConfirm={handleConfirmCancel}
                onCancel={() => setShowCancelConfirm(false)}
                variant="danger"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.bgSecondary },
    cancelBtn: { paddingHorizontal: Spacing.sm },
    cancelBtnText: { color: Colors.error, fontSize: FontSize.md, fontWeight: '600' },
    stepBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl,
        backgroundColor: Colors.bgPrimary, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    stepItem: { alignItems: 'center', flex: 1, position: 'relative' },
    stepDot: {
        width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: Colors.border,
        justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bgPrimary,
    },
    stepDotActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
    stepDotDone: { borderColor: Colors.success, backgroundColor: Colors.success },
    stepDotText: { fontSize: 14, color: Colors.textTertiary },
    stepDotTextActive: { color: Colors.textInverse },
    stepLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 4 },
    stepLabelActive: { color: Colors.primary, fontWeight: '700' },
    stepLine: {
        position: 'absolute', top: 18, left: '60%', right: '-40%',
        height: 2, backgroundColor: Colors.border,
    },
    stepLineDone: { backgroundColor: Colors.success },
});
