// Quick Inventory Transaction — import/export stock
import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useInventoryItems, useCreateInventoryTransaction } from '../../lib/hooks/useInventory';

export default function InventoryTransactionScreen() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; uom: string } | null>(null);
    const [type, setType] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');

    const { data: items = [] } = useInventoryItems(search || undefined);
    const createTx = useCreateInventoryTransaction();

    const filteredItems = search.length >= 2
        ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).slice(0, 5)
        : [];

    const handleSubmit = () => {
        if (!selectedItem) {
            Alert.alert('Lỗi', 'Vui lòng chọn nguyên liệu');
            return;
        }
        const qty = parseFloat(quantity);
        if (!qty || qty <= 0) {
            Alert.alert('Lỗi', 'Số lượng phải lớn hơn 0');
            return;
        }

        createTx.mutate(
            {
                item_id: selectedItem.id,
                type,
                quantity: qty,
                notes: notes || undefined,
            },
            {
                onSuccess: () => {
                    Alert.alert(
                        'Thành công',
                        `Đã ${type === 'IMPORT' ? 'nhập' : 'xuất'} ${qty} ${selectedItem.uom} ${selectedItem.name}`,
                        [{ text: 'OK', onPress: () => router.back() }]
                    );
                },
                onError: (err: any) => {
                    Alert.alert('Lỗi', err.message || 'Không thể tạo phiếu');
                },
            }
        );
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <Text style={styles.title}>
                    {type === 'IMPORT' ? '📥 Nhập kho nhanh' : '📤 Xuất kho nhanh'}
                </Text>

                {/* Type Toggle */}
                <View style={styles.typeRow}>
                    <TouchableOpacity
                        style={[styles.typeBtn, type === 'IMPORT' && styles.typeBtnActive]}
                        onPress={() => setType('IMPORT')}
                    >
                        <Text style={[styles.typeBtnText, type === 'IMPORT' && styles.typeBtnTextActive]}>
                            📥 Nhập kho
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.typeBtn, type === 'EXPORT' && styles.typeBtnActiveExport]}
                        onPress={() => setType('EXPORT')}
                    >
                        <Text style={[styles.typeBtnText, type === 'EXPORT' && styles.typeBtnTextActive]}>
                            📤 Xuất kho
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Item Picker */}
                <Text style={styles.label}>Nguyên liệu *</Text>
                {selectedItem ? (
                    <TouchableOpacity
                        style={styles.selectedItem}
                        onPress={() => { setSelectedItem(null); setSearch(''); }}
                    >
                        <Text style={styles.selectedItemText}>✅ {selectedItem.name}</Text>
                        <Text style={styles.changeText}>Đổi</Text>
                    </TouchableOpacity>
                ) : (
                    <>
                        <TextInput
                            style={styles.input}
                            placeholder="Tìm nguyên liệu..."
                            placeholderTextColor={Colors.textTertiary}
                            value={search}
                            onChangeText={setSearch}
                        />
                        {filteredItems.length > 0 && (
                            <View style={styles.dropdown}>
                                {filteredItems.map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.dropdownItem}
                                        onPress={() => {
                                            setSelectedItem({ id: item.id, name: item.name, uom: item.uom });
                                            setSearch('');
                                        }}
                                    >
                                        <Text style={styles.dropdownName}>{item.name}</Text>
                                        <Text style={styles.dropdownStock}>
                                            Tồn: {item.current_stock} {item.uom}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </>
                )}

                {/* Quantity */}
                <Text style={styles.label}>Số lượng *{selectedItem ? ` (${selectedItem.uom})` : ''}</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Nhập số lượng"
                    placeholderTextColor={Colors.textTertiary}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="decimal-pad"
                />

                {/* Notes */}
                <Text style={styles.label}>Ghi chú</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Lý do nhập/xuất..."
                    placeholderTextColor={Colors.textTertiary}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                />

                {/* Submit */}
                <TouchableOpacity
                    style={styles.submitBtn}
                    activeOpacity={0.8}
                    onPress={handleSubmit}
                    disabled={createTx.isPending}
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
                                ? 'Đang xử lý...'
                                : type === 'IMPORT' ? '📥 Xác nhận nhập kho' : '📤 Xác nhận xuất kho'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bgSecondary },
    content: { padding: Spacing.lg, gap: Spacing.md },
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
