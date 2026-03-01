// Quick Inventory Transaction — import/export stock
// UX Audit fixes: SafeArea, ConfirmModal, SuccessOverlay, Offline, useCallback, a11y
import { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useInventoryItems, useCreateInventoryTransaction } from '../../lib/hooks/useInventory';
import { hapticLight, hapticMedium, hapticSuccess, hapticError } from '../../lib/haptics';
import ConfirmModal from '../../components/ConfirmModal';
import { useNetworkStatus, OfflineBanner } from '../../components/OfflineBanner';

// Success overlay animation — replaces Alert.alert success
function SuccessOverlay({ visible, message, onDone }: { visible: boolean; message: string; onDone: () => void }) {
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            scaleAnim.setValue(0);
            Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true })
                .start(() => setTimeout(onDone, 1000));
        }
    }, [visible, scaleAnim, onDone]);

    if (!visible) return null;
    return (
        <View style={successStyles.overlay}>
            <Animated.View style={[successStyles.circle, { transform: [{ scale: scaleAnim }] }]}>
                <MaterialIcons name="check" size={48} color="#fff" />
            </Animated.View>
            <Animated.Text style={[successStyles.text, { opacity: scaleAnim }]}>
                {message}
            </Animated.Text>
        </View>
    );
}

const successStyles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.95)',
        justifyContent: 'center', alignItems: 'center', zIndex: 100,
    },
    circle: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.success,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: Colors.success, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
    },
    text: { marginTop: Spacing.lg, fontSize: FontSize.lg, fontWeight: '700', color: Colors.success, textAlign: 'center', paddingHorizontal: Spacing.xl },
});

export default function InventoryTransactionScreen() {
    const router = useRouter();
    const { isConnected } = useNetworkStatus();
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; uom: string } | null>(null);
    const [type, setType] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');

    // Error + offline modals
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const { data: items = [] } = useInventoryItems(search || undefined);
    const createTx = useCreateInventoryTransaction();

    const filteredItems = search.length >= 2
        ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).slice(0, 5)
        : [];

    const handleSubmit = useCallback(() => {
        // Offline guard — H7
        if (!isConnected) {
            hapticError();
            setErrorMessage('Cần kết nối mạng để thực hiện giao dịch');
            setShowError(true);
            return;
        }

        if (!selectedItem) {
            hapticError();
            setErrorMessage('Vui lòng chọn nguyên liệu');
            setShowError(true);
            return;
        }
        const qty = parseFloat(quantity);
        if (!qty || qty <= 0) {
            hapticError();
            setErrorMessage('Số lượng phải lớn hơn 0');
            setShowError(true);
            return;
        }

        hapticMedium();
        createTx.mutate(
            {
                item_id: selectedItem.id,
                type,
                quantity: qty,
                notes: notes || undefined,
            },
            {
                onSuccess: () => {
                    hapticSuccess();
                    setSuccessMessage(
                        `Đã ${type === 'IMPORT' ? 'nhập' : 'xuất'} ${qty} ${selectedItem.uom} ${selectedItem.name}`
                    );
                    setShowSuccess(true);
                },
                onError: (err: any) => {
                    hapticError();
                    setErrorMessage(err.message || 'Không thể tạo phiếu. Vui lòng thử lại.');
                    setShowError(true);
                },
            }
        );
    }, [isConnected, selectedItem, quantity, type, notes, createTx]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{ title: type === 'IMPORT' ? 'Nhập kho' : 'Xuất kho' }} />
            <OfflineBanner />
            <SuccessOverlay
                visible={showSuccess}
                message={successMessage}
                onDone={() => { setShowSuccess(false); router.back(); }}
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.titleRow}>
                        <MaterialIcons name={type === 'IMPORT' ? 'call-received' : 'call-made'} size={24} color={Colors.textPrimary} />
                        <Text style={styles.title}>
                            {type === 'IMPORT' ? 'Nhập kho nhanh' : 'Xuất kho nhanh'}
                        </Text>
                    </View>

                    {/* Type Toggle */}
                    <View style={styles.typeRow}>
                        <Pressable
                            style={({ pressed }) => [styles.typeBtn, type === 'IMPORT' && styles.typeBtnActive, pressed && { opacity: 0.7 }]}
                            onPress={() => { hapticLight(); setType('IMPORT'); }}
                            accessibilityLabel="Nhập kho"
                            accessibilityRole="button"
                            accessibilityState={{ selected: type === 'IMPORT' }}
                            android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                        >
                            <View style={styles.typeBtnRow}>
                                <MaterialIcons name="call-received" size={16} color={type === 'IMPORT' ? Colors.textPrimary : Colors.textSecondary} />
                                <Text style={[styles.typeBtnText, type === 'IMPORT' && styles.typeBtnTextActive]}>
                                    Nhập kho
                                </Text>
                            </View>
                        </Pressable>
                        <Pressable
                            style={({ pressed }) => [styles.typeBtn, type === 'EXPORT' && styles.typeBtnActiveExport, pressed && { opacity: 0.7 }]}
                            onPress={() => { hapticLight(); setType('EXPORT'); }}
                            accessibilityLabel="Xuất kho"
                            accessibilityRole="button"
                            accessibilityState={{ selected: type === 'EXPORT' }}
                            android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                        >
                            <View style={styles.typeBtnRow}>
                                <MaterialIcons name="call-made" size={16} color={type === 'EXPORT' ? Colors.textPrimary : Colors.textSecondary} />
                                <Text style={[styles.typeBtnText, type === 'EXPORT' && styles.typeBtnTextActive]}>
                                    Xuất kho
                                </Text>
                            </View>
                        </Pressable>
                    </View>

                    {/* Item Picker */}
                    <Text style={styles.label}>Nguyên liệu <Text style={styles.required}>*</Text></Text>
                    {selectedItem ? (
                        <Pressable
                            style={({ pressed }) => [styles.selectedItem, pressed && { opacity: 0.7 }]}
                            onPress={() => { setSelectedItem(null); setSearch(''); }}
                            accessibilityLabel={`Đã chọn ${selectedItem.name}, nhấn để đổi`}
                            accessibilityRole="button"
                            android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                        >
                            <View style={styles.selectedRow}>
                                <MaterialIcons name="check-circle" size={16} color={Colors.success} />
                                <Text style={styles.selectedItemText}>{selectedItem.name}</Text>
                            </View>
                            <Text style={styles.changeText}>Đổi</Text>
                        </Pressable>
                    ) : (
                        <>
                            <TextInput
                                style={styles.input}
                                placeholder="Tìm nguyên liệu…"
                                placeholderTextColor={Colors.textTertiary}
                                value={search}
                                onChangeText={setSearch}
                                accessibilityLabel="Tìm nguyên liệu"
                                accessibilityHint="Nhập tối thiểu 2 ký tự để tìm"
                            />
                            {filteredItems.length > 0 && (
                                <View style={styles.dropdown}>
                                    {filteredItems.map((item) => (
                                        <Pressable
                                            key={item.id}
                                            style={({ pressed }) => [styles.dropdownItem, pressed && { backgroundColor: Colors.bgTertiary }]}
                                            onPress={() => {
                                                hapticLight();
                                                setSelectedItem({ id: item.id, name: item.name, uom: item.uom });
                                                setSearch('');
                                            }}
                                            accessibilityLabel={`Chọn ${item.name}, tồn ${item.current_stock} ${item.uom}`}
                                            accessibilityRole="button"
                                            android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                                        >
                                            <Text style={styles.dropdownName}>{item.name}</Text>
                                            <Text style={styles.dropdownStock}>
                                                Tồn: {item.current_stock} {item.uom}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </>
                    )}

                    {/* Quantity */}
                    <Text style={styles.label}>Số lượng <Text style={styles.required}>*</Text>{selectedItem ? ` (${selectedItem.uom})` : ''}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nhập số lượng"
                        placeholderTextColor={Colors.textTertiary}
                        value={quantity}
                        onChangeText={setQuantity}
                        keyboardType="decimal-pad"
                        accessibilityLabel={`Số lượng${selectedItem ? ` (${selectedItem.uom})` : ''}`}
                        accessibilityHint="Nhập số lượng cần nhập hoặc xuất"
                    />

                    {/* Notes */}
                    <Text style={styles.label}>Ghi chú</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Lý do nhập/xuất…"
                        placeholderTextColor={Colors.textTertiary}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        accessibilityLabel="Ghi chú phiếu nhập xuất"
                    />

                    {/* Submit */}
                    <Pressable
                        style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
                        onPress={handleSubmit}
                        disabled={createTx.isPending}
                        accessibilityLabel={type === 'IMPORT' ? 'Xác nhận nhập kho' : 'Xác nhận xuất kho'}
                        accessibilityRole="button"
                        accessibilityHint="Nhấn để xác nhận giao dịch"
                        android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                    >
                        <LinearGradient
                            colors={
                                type === 'IMPORT'
                                    ? [Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]
                                    : [Colors.warning, '#d97706']
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.submitGradient}
                        >
                            <Text style={styles.submitText}>
                                {createTx.isPending
                                    ? 'Đang xử lý…'
                                    : type === 'IMPORT' ? 'Xác nhận nhập kho' : 'Xác nhận xuất kho'}
                            </Text>
                        </LinearGradient>
                    </Pressable>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Error Modal — replaces Alert.alert */}
            <ConfirmModal
                visible={showError}
                title="Lỗi"
                message={errorMessage}
                confirmText="Đã hiểu"
                cancelText="Đóng"
                onConfirm={() => setShowError(false)}
                onCancel={() => setShowError(false)}
                variant="danger"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.bgSecondary },
    container: { flex: 1, backgroundColor: Colors.bgSecondary },
    content: { padding: Spacing.lg, gap: Spacing.md },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, justifyContent: 'center' },
    typeBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title: {
        fontSize: FontSize.xl,
        fontWeight: '800',
        color: Colors.textPrimary,
        textAlign: 'center',
    },
    typeRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    typeBtn: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        backgroundColor: Colors.bgTertiary,
    },
    typeBtnActive: {
        backgroundColor: Colors.primary + '18',
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    typeBtnActiveExport: {
        backgroundColor: Colors.warning + '18',
        borderWidth: 2,
        borderColor: Colors.warning,
    },
    typeBtnText: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    typeBtnTextActive: {
        color: Colors.textPrimary,
    },
    label: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
    },
    required: { color: Colors.error },
    input: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        fontSize: FontSize.md,
        color: Colors.textPrimary,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    selectedItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.success + '40',
    },
    selectedItemText: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    changeText: {
        fontSize: FontSize.sm,
        color: Colors.primary,
        fontWeight: '600',
    },
    dropdown: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    dropdownName: { fontSize: FontSize.md, color: Colors.textPrimary },
    dropdownStock: { fontSize: FontSize.sm, color: Colors.textSecondary, fontVariant: ['tabular-nums'] },
    submitBtn: {
        marginTop: Spacing.md,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    submitGradient: {
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
    },
    submitText: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.textInverse,
    },
});
