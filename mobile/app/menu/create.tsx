// Create Menu Item — form with validation
import { useState, useCallback } from 'react';
import {
    View, Text, TextInput, Pressable, ScrollView,
    StyleSheet, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useCreateMenuItem, useMenuCategories } from '../../lib/hooks/useMenuItems';
import { hapticLight, hapticMedium, hapticSuccess, hapticError, hapticWarning } from '../../lib/haptics';
import ConfirmModal from '../../components/ConfirmModal';
import { useNetworkStatus, OfflineBanner } from '../../components/OfflineBanner';

// Success overlay animation
function SuccessOverlay({ visible, onDone }: { visible: boolean; onDone: () => void }) {
    const [scaleAnim] = useState(new Animated.Value(0));
    if (visible) {
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true })
            .start(() => setTimeout(onDone, 800));
    }
    if (!visible) return null;
    return (
        <View style={successStyles.overlay}>
            <Animated.View style={[successStyles.circle, { transform: [{ scale: scaleAnim }] }]}>
                <MaterialIcons name="check" size={48} color="#fff" />
            </Animated.View>
            <Animated.Text style={[successStyles.text, { opacity: scaleAnim }]}>
                Đã thêm món ăn thành công!
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
    text: { marginTop: Spacing.lg, fontSize: FontSize.lg, fontWeight: '700', color: Colors.success },
});

export default function CreateMenuItemScreen() {
    const router = useRouter();
    const { data: categories = [] } = useMenuCategories();
    const createItem = useCreateMenuItem();
    const { isConnected } = useNetworkStatus();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [sellPrice, setSellPrice] = useState('');
    const [uom, setUom] = useState('phần');
    const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showSuccess, setShowSuccess] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    const hasData = name.trim() || description.trim() || costPrice || sellPrice || categoryId;

    const validate = useCallback((): boolean => {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = 'Vui lòng nhập tên món';
        if (!sellPrice || parseFloat(sellPrice) <= 0) e.sellPrice = 'Giá bán phải > 0';
        setErrors(e);
        return Object.keys(e).length === 0;
    }, [name, sellPrice]);

    const handleSubmit = useCallback(async () => {
        if (!validate()) return;
        if (!isConnected) {
            hapticError();
            setErrors({ offline: 'Cần kết nối mạng để tạo món ăn' });
            return;
        }
        hapticMedium();
        try {
            await createItem.mutateAsync({
                name: name.trim(),
                description: description.trim() || undefined,
                cost_price: parseFloat(costPrice) || 0,
                selling_price: parseFloat(sellPrice) || 0,
                uom: uom || 'phần',
                category_id: categoryId,
            });
            hapticSuccess();
            setShowSuccess(true);
        } catch {
            hapticError();
            setErrors({ submit: 'Không thể tạo món ăn. Vui lòng thử lại.' });
        }
    }, [validate, isConnected, name, description, costPrice, sellPrice, uom, categoryId, createItem]);

    const handleCancel = useCallback(() => {
        if (hasData) {
            hapticWarning();
            setShowCancelConfirm(true);
        } else {
            router.back();
        }
    }, [hasData, router]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{
                title: 'Thêm món mới',
                headerLeft: () => (
                    <Pressable onPress={handleCancel} style={({ pressed }) => [{ paddingHorizontal: Spacing.sm }, pressed && { opacity: 0.7 }]}
                        accessibilityLabel="Hủy thêm món" accessibilityRole="button"
                        accessibilityHint="Nhấn để hủy và quay lại">
                        <Text style={styles.cancelText}>Hủy</Text>
                    </Pressable>
                ),
            }} />
            <OfflineBanner />
            <SuccessOverlay visible={showSuccess} onDone={() => router.back()} />

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView
                    style={styles.container} contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
                >
                    {/* Name */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Tên món <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={[styles.input, errors.name && styles.inputError]}
                            value={name} onChangeText={setName}
                            placeholder="Ví dụ: Gà nướng mật ong…"
                            placeholderTextColor={Colors.textTertiary}
                            accessibilityLabel="Tên món ăn"
                        />
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                    </View>

                    {/* Category */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Danh mục</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.chipRow} keyboardShouldPersistTaps="handled">
                            {categories.map((cat) => (
                                <Pressable key={cat.id}
                                    style={({ pressed }) => [styles.chip, categoryId === cat.id && styles.chipActive, pressed && { opacity: 0.7 }]}
                                    onPress={() => { hapticLight(); setCategoryId(categoryId === cat.id ? undefined : cat.id); }}
                                    accessibilityLabel={`Danh mục ${cat.name}`}
                                    accessibilityState={{ selected: categoryId === cat.id }}
                                    android_ripple={{ color: 'rgba(0,0,0,0.08)' }}>
                                    <Text style={[styles.chipText, categoryId === cat.id && styles.chipTextActive]}>{cat.name}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Prices */}
                    <View style={styles.row}>
                        <View style={styles.halfField}>
                            <Text style={styles.label}>Giá bán (VND) <Text style={styles.required}>*</Text></Text>
                            <TextInput
                                style={[styles.input, errors.sellPrice && styles.inputError]}
                                value={sellPrice} onChangeText={setSellPrice}
                                keyboardType="number-pad" placeholder="150000"
                                placeholderTextColor={Colors.textTertiary}
                                accessibilityLabel="Giá bán"
                            />
                            {errors.sellPrice && <Text style={styles.errorText}>{errors.sellPrice}</Text>}
                        </View>
                        <View style={styles.halfField}>
                            <Text style={styles.label}>Giá vốn (VND)</Text>
                            <TextInput
                                style={styles.input} value={costPrice} onChangeText={setCostPrice}
                                keyboardType="number-pad" placeholder="50000"
                                placeholderTextColor={Colors.textTertiary}
                                accessibilityLabel="Giá vốn"
                            />
                        </View>
                    </View>

                    {/* UOM */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Đơn vị tính</Text>
                        <TextInput
                            style={styles.input} value={uom} onChangeText={setUom}
                            placeholder="phần" placeholderTextColor={Colors.textTertiary}
                            accessibilityLabel="Đơn vị tính"
                        />
                    </View>

                    {/* Description */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Mô tả</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]} value={description}
                            onChangeText={setDescription} placeholder="Mô tả món ăn…"
                            placeholderTextColor={Colors.textTertiary}
                            multiline numberOfLines={3} textAlignVertical="top"
                            accessibilityLabel="Mô tả món ăn"
                        />
                    </View>

                    {/* Error messages */}
                    {(errors.offline || errors.submit) && (
                        <View style={styles.errorBanner}>
                            <MaterialIcons name="error" size={16} color={Colors.error} />
                            <Text style={styles.errorBannerText}>{errors.offline || errors.submit}</Text>
                        </View>
                    )}

                    {/* Submit */}
                    <Pressable
                        style={({ pressed }) => [styles.submitWrapper, pressed && { opacity: 0.85 }]}
                        onPress={handleSubmit} disabled={createItem.isPending}
                        accessibilityLabel="Thêm món ăn" accessibilityRole="button"
                        accessibilityHint="Nhấn để tạo món ăn mới"
                        android_ripple={{ color: 'rgba(255,255,255,0.2)' }}>
                        <LinearGradient
                            colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGradient}>
                            <Text style={styles.submitText}>
                                {createItem.isPending ? 'Đang tạo…' : 'Thêm món ăn'}
                            </Text>
                        </LinearGradient>
                    </Pressable>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Cancel Confirmation */}
            <ConfirmModal
                visible={showCancelConfirm}
                title="Hủy thêm món?"
                message="Dữ liệu bạn đã nhập sẽ bị mất. Bạn có chắc muốn hủy?"
                confirmText="Hủy"
                cancelText="Tiếp tục"
                onConfirm={() => { setShowCancelConfirm(false); router.back(); }}
                onCancel={() => setShowCancelConfirm(false)}
                variant="danger"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.bgSecondary },
    cancelText: { color: Colors.error, fontSize: FontSize.md, fontWeight: '600' },
    container: { flex: 1, backgroundColor: Colors.bgSecondary },
    content: { padding: Spacing.lg, gap: Spacing.md },
    field: { gap: Spacing.xs },
    label: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
    required: { color: Colors.error },
    input: {
        backgroundColor: Colors.bgPrimary, borderWidth: 1, borderColor: Colors.border,
        borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
        fontSize: FontSize.md, color: Colors.textPrimary,
    },
    inputError: { borderColor: Colors.error },
    textArea: { minHeight: 80 },
    errorText: { fontSize: FontSize.xs, color: Colors.error },
    row: { flexDirection: 'row', gap: Spacing.md },
    halfField: { flex: 1, gap: Spacing.xs },
    chipRow: { gap: Spacing.sm, paddingVertical: Spacing.xs },
    chip: {
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md, backgroundColor: Colors.bgTertiary,
        borderWidth: 1.5, borderColor: 'transparent',
    },
    chipActive: { backgroundColor: Colors.primary + '18', borderColor: Colors.primary },
    chipText: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textSecondary },
    chipTextActive: { color: Colors.primary, fontWeight: '700' },
    errorBanner: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.error + '10', borderRadius: BorderRadius.md,
        padding: Spacing.md,
    },
    errorBannerText: { fontSize: FontSize.sm, color: Colors.error, flex: 1 },
    submitWrapper: {
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    submitGradient: {
        paddingVertical: Spacing.lg, borderRadius: BorderRadius.lg, alignItems: 'center',
    },
    submitText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textInverse },
});
