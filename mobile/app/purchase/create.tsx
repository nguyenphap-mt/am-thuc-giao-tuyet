// Quick Create Purchase Requisition Form
import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useCreatePR } from '../../lib/hooks/usePurchase';
import { hapticLight, hapticMedium, hapticWarning } from '../../lib/haptics';

interface LineItem {
    item_name: string;
    quantity: string;
    uom: string;
    estimated_unit_price: string;
}

const PRIORITIES = [
    { value: 'LOW', label: 'Thấp', color: Colors.textTertiary },
    { value: 'NORMAL', label: 'Bình thường', color: Colors.info },
    { value: 'HIGH', label: 'Cao', color: Colors.warning },
    { value: 'URGENT', label: 'Khẩn cấp', color: Colors.error },
];

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}

export default function CreatePRScreen() {
    const router = useRouter();
    const createPR = useCreatePR();

    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('NORMAL');
    const [notes, setNotes] = useState('');
    const [lines, setLines] = useState<LineItem[]>([
        { item_name: '', quantity: '1', uom: 'kg', estimated_unit_price: '0' },
    ]);

    const addLine = () => {
        setLines([...lines, { item_name: '', quantity: '1', uom: 'kg', estimated_unit_price: '0' }]);
    };

    const removeLine = (index: number) => {
        if (lines.length <= 1) return;
        setLines(lines.filter((_, i) => i !== index));
    };

    const updateLine = (index: number, field: keyof LineItem, value: string) => {
        const updated = [...lines];
        updated[index] = { ...updated[index], [field]: value };
        setLines(updated);
    };

    const getLineTotal = (line: LineItem): number => {
        return (parseFloat(line.quantity) || 0) * (parseFloat(line.estimated_unit_price) || 0);
    };

    const grandTotal = lines.reduce((sum, line) => sum + getLineTotal(line), 0);

    const handleSubmit = async () => {
        // Validate
        if (!title.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề yêu cầu');
            return;
        }
        const validLines = lines.filter((l) => l.item_name.trim());
        if (validLines.length === 0) {
            Alert.alert('Lỗi', 'Vui lòng thêm ít nhất 1 mặt hàng');
            return;
        }

        try {
            await createPR.mutateAsync({
                title: title.trim(),
                priority,
                notes: notes.trim() || undefined,
                lines: validLines.map((l) => ({
                    item_name: l.item_name.trim(),
                    quantity: parseFloat(l.quantity) || 1,
                    uom: l.uom || 'kg',
                    estimated_unit_price: parseFloat(l.estimated_unit_price) || 0,
                })),
            });
            Alert.alert('Thành công', 'Đã tạo yêu cầu mua hàng', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (error: any) {
            Alert.alert('Lỗi', error?.message || 'Không thể tạo yêu cầu');
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.flex1}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Title */}
                <View style={styles.field}>
                    <Text style={styles.label}>
                        Tiêu đề <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="VD: Mua nguyên liệu tiệc thứ 7..."
                        placeholderTextColor={Colors.textTertiary}
                    />
                </View>

                {/* Priority */}
                <View style={styles.field}>
                    <Text style={styles.label}>Mức ưu tiên</Text>
                    <View style={styles.priorityRow}>
                        {PRIORITIES.map((p) => (
                            <Pressable
                                key={p.value}
                                style={({ pressed }) => [
                                    styles.priorityChip,
                                    priority === p.value && {
                                        backgroundColor: p.color + '20',
                                        borderColor: p.color,
                                    },
                                    pressed && { opacity: 0.7 },
                                ]}
                                onPress={() => { hapticLight(); setPriority(p.value); }}
                                accessibilityLabel={`Mức ưu tiên ${p.label}`}
                                accessibilityRole="button"
                                accessibilityState={{ selected: priority === p.value }}
                                android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                            >
                                <Text
                                    style={[
                                        styles.priorityChipText,
                                        priority === p.value && { color: p.color, fontWeight: '700' },
                                    ]}
                                >
                                    {p.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Line Items */}
                <View style={styles.field}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.label}>Mặt hàng</Text>
                        <Pressable
                            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
                            onPress={() => { hapticLight(); addLine(); }}
                            accessibilityLabel="Thêm mặt hàng mới"
                            accessibilityRole="button"
                            android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                        >
                            <Text style={styles.addBtnText}>＋ Thêm</Text>
                        </Pressable>
                    </View>

                    {lines.map((line, i) => (
                        <View key={i} style={styles.lineCard}>
                            <View style={styles.lineHeader}>
                                <Text style={styles.lineNumber}>#{i + 1}</Text>
                                {lines.length > 1 && (
                                    <Pressable
                                        onPress={() => { hapticWarning(); removeLine(i); }}
                                        accessibilityLabel={`Xóa mặt hàng ${i + 1}`}
                                        accessibilityRole="button"
                                        style={({ pressed }) => pressed && { opacity: 0.6 }}
                                    >
                                        <Text style={styles.removeBtnText}>✕</Text>
                                    </Pressable>
                                )}
                            </View>

                            <TextInput
                                style={styles.input}
                                value={line.item_name}
                                onChangeText={(v) => updateLine(i, 'item_name', v)}
                                placeholder="Tên mặt hàng..."
                                placeholderTextColor={Colors.textTertiary}
                            />

                            <View style={styles.lineRow}>
                                <View style={styles.lineField}>
                                    <Text style={styles.lineLabel}>SL</Text>
                                    <TextInput
                                        style={[styles.input, styles.inputSmall]}
                                        value={line.quantity}
                                        onChangeText={(v) => updateLine(i, 'quantity', v)}
                                        keyboardType="numeric"
                                        selectTextOnFocus
                                    />
                                </View>
                                <View style={styles.lineField}>
                                    <Text style={styles.lineLabel}>ĐVT</Text>
                                    <TextInput
                                        style={[styles.input, styles.inputSmall]}
                                        value={line.uom}
                                        onChangeText={(v) => updateLine(i, 'uom', v)}
                                    />
                                </View>
                                <View style={[styles.lineField, { flex: 1.5 }]}>
                                    <Text style={styles.lineLabel}>Đơn giá (₫)</Text>
                                    <TextInput
                                        style={[styles.input, styles.inputSmall]}
                                        value={line.estimated_unit_price}
                                        onChangeText={(v) => updateLine(i, 'estimated_unit_price', v)}
                                        keyboardType="numeric"
                                        selectTextOnFocus
                                    />
                                </View>
                            </View>

                            <Text style={styles.lineTotal}>
                                Thành tiền: {formatCurrency(getLineTotal(line))}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Notes */}
                <View style={styles.field}>
                    <Text style={styles.label}>Ghi chú</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Ghi chú thêm..."
                        placeholderTextColor={Colors.textTertiary}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />
                </View>

                {/* Grand Total */}
                <View style={styles.totalCard}>
                    <Text style={styles.totalLabel}>Tổng cộng</Text>
                    <Text style={styles.totalAmount}>{formatCurrency(grandTotal)}</Text>
                </View>

                {/* Submit */}
                <Pressable
                    style={({ pressed }) => pressed && { opacity: 0.85 }}
                    onPress={() => { hapticMedium(); handleSubmit(); }}
                    disabled={createPR.isPending}
                    accessibilityLabel="Tạo yêu cầu mua hàng"
                    accessibilityRole="button"
                    android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                >
                    <LinearGradient
                        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.submitBtn}
                    >
                        <Text style={styles.submitText}>
                            {createPR.isPending ? 'Đang tạo…' : 'Tạo yêu cầu mua hàng'}
                        </Text>
                    </LinearGradient>
                </Pressable>

                <View style={styles.bottomSpacer} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bgSecondary,
    },
    content: {
        padding: Spacing.lg,
        gap: Spacing.lg,
    },
    field: {
        gap: Spacing.sm,
    },
    label: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    required: {
        color: Colors.error,
    },
    input: {
        backgroundColor: Colors.bgPrimary,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        fontSize: FontSize.md,
        color: Colors.textPrimary,
    },
    textArea: {
        minHeight: 80,
    },
    inputSmall: {
        paddingVertical: Spacing.sm,
        fontSize: FontSize.sm,
    },
    // Priority
    priorityRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    priorityChip: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.bgTertiary,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    priorityChipText: {
        fontSize: FontSize.sm,
        fontWeight: '500',
        color: Colors.textSecondary,
    },
    // Section header
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    addBtn: {
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm,
    },
    addBtnText: {
        color: Colors.primary,
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
    // Line items
    lineCard: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    lineHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lineNumber: {
        fontSize: FontSize.xs,
        fontWeight: '700',
        color: Colors.primary,
    },
    removeBtnText: {
        fontSize: FontSize.lg,
        color: Colors.error,
        fontWeight: '600',
        paddingHorizontal: Spacing.xs,
    },
    lineRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    lineField: {
        flex: 1,
        gap: 2,
    },
    lineLabel: {
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    lineTotal: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: Colors.primary,
        textAlign: 'right',
        fontVariant: ['tabular-nums'],
    },
    // Total
    totalCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    totalLabel: {
        fontSize: FontSize.lg,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    totalAmount: {
        fontSize: FontSize.xxl,
        fontWeight: '800',
        color: Colors.primary,
        fontVariant: ['tabular-nums'],
    },
    // Submit
    submitBtn: {
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
    },
    submitText: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.textInverse,
    },
    bottomSpacer: { height: 40 },
    flex1: { flex: 1 },
});
