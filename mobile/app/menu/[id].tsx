// Menu Item Detail — view, edit, toggle active, delete
import { useState, useCallback, useMemo } from 'react';
import {
    View, Text, ScrollView, Pressable, TextInput,
    StyleSheet, RefreshControl, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import {
    useMenuItemDetail, useUpdateMenuItem, useDeleteMenuItem,
    useToggleMenuItemActive, useMenuCategories,
} from '../../lib/hooks/useMenuItems';
import { hapticLight, hapticMedium, hapticWarning, hapticSuccess, hapticError } from '../../lib/haptics';
import ConfirmModal from '../../components/ConfirmModal';
import { useNetworkStatus, OfflineBanner } from '../../components/OfflineBanner';
import { useAuthStore } from '../../lib/auth-store';

function formatCurrency(amount: number | undefined): string {
    if (!amount) return '0đ';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency', currency: 'VND', maximumFractionDigits: 0,
    }).format(amount);
}

// Skeleton loader
function DetailSkeleton() {
    const [fadeAnim] = useState(new Animated.Value(0.3));
    useState(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 0.3, duration: 750, useNativeDriver: true }),
        ])).start();
    });
    const Block = ({ w, h, s }: { w: number | string; h: number; s?: any }) => (
        <Animated.View style={[{ width: w, height: h, borderRadius: 4, backgroundColor: Colors.bgTertiary, opacity: fadeAnim }, s]} />
    );
    return (
        <View style={styles.content}>
            <View style={styles.section}><Block w="60%" h={24} /><Block w="30%" h={16} s={{ marginTop: 8 }} /><Block w="50%" h={20} s={{ marginTop: 8 }} /></View>
            <View style={styles.section}><Block w="40%" h={18} /><Block w="100%" h={16} s={{ marginTop: 8 }} /><Block w="80%" h={16} s={{ marginTop: 4 }} /></View>
            <View style={styles.section}><Block w="100%" h={48} /></View>
        </View>
    );
}

export default function MenuItemDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuthStore();
    const { data: item, isLoading, refetch } = useMenuItemDetail(id);
    const { data: categories = [] } = useMenuCategories();
    const updateItem = useUpdateMenuItem();
    const deleteItem = useDeleteMenuItem();
    const toggleActive = useToggleMenuItemActive();
    const { isConnected } = useNetworkStatus();

    const [editing, setEditing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showOfflineError, setShowOfflineError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Edit form state
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editCostPrice, setEditCostPrice] = useState('');
    const [editSellPrice, setEditSellPrice] = useState('');
    const [editUom, setEditUom] = useState('');
    const [editCategoryId, setEditCategoryId] = useState<string | undefined>(undefined);

    const isManager = user?.role?.code === 'SUPER_ADMIN' || user?.role?.code === 'ADMIN' || user?.role?.code === 'MANAGER';

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const startEditing = useCallback(() => {
        if (!item) return;
        setEditName(item.name);
        setEditDesc(item.description || '');
        setEditCostPrice(String(item.cost_price || 0));
        setEditSellPrice(String(item.selling_price || 0));
        setEditUom(item.uom || 'phần');
        setEditCategoryId(item.category_id || undefined);
        setEditing(true);
    }, [item]);

    const handleSave = useCallback(async () => {
        if (!item || !isConnected) {
            hapticError(); setShowOfflineError(true); return;
        }
        if (!editName.trim()) return;
        hapticMedium();
        try {
            await updateItem.mutateAsync({
                id: item.id,
                name: editName.trim(),
                description: editDesc.trim() || undefined,
                cost_price: parseFloat(editCostPrice) || 0,
                selling_price: parseFloat(editSellPrice) || 0,
                uom: editUom || 'phần',
                category_id: editCategoryId,
            });
            hapticSuccess();
            setEditing(false);
        } catch {
            hapticError();
        }
    }, [item, isConnected, editName, editDesc, editCostPrice, editSellPrice, editUom, editCategoryId, updateItem]);

    const handleToggleActive = useCallback(() => {
        if (!item || !isConnected) { hapticError(); setShowOfflineError(true); return; }
        hapticWarning();
        toggleActive.mutate(item.id);
    }, [item, isConnected, toggleActive]);

    const handleDelete = useCallback(async () => {
        if (!item || !isConnected) { hapticError(); setShowOfflineError(true); return; }
        try {
            await deleteItem.mutateAsync(item.id);
            hapticSuccess();
            router.back();
        } catch {
            hapticError();
        }
    }, [item, isConnected, deleteItem, router]);

    const profitMargin = useMemo(() => {
        if (!item?.selling_price || !item?.cost_price || item.selling_price === 0) return null;
        const margin = ((item.selling_price - item.cost_price) / item.selling_price) * 100;
        return margin;
    }, [item?.selling_price, item?.cost_price]);

    if (isLoading || !item) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <Stack.Screen options={{ title: 'Chi tiết món' }} />
                <OfflineBanner />
                <ScrollView style={styles.container}><DetailSkeleton /></ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{
                title: editing ? 'Chỉnh sửa' : item.name,
                headerRight: () => isManager && !editing ? (
                    <Pressable onPress={startEditing} hitSlop={8}
                        accessibilityLabel="Chỉnh sửa " accessibilityRole="button">
                        <MaterialIcons name="edit" size={22} color={Colors.primary} />
                    </Pressable>
                ) : null,
            }} />
            <OfflineBanner />

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView
                    style={styles.container} contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                            tintColor={Colors.primary} colors={[Colors.primary]} />
                    }
                >
                    {/* Status */}
                    <View style={[styles.statusBanner, { backgroundColor: item.is_active ? Colors.success + '18' : Colors.textTertiary + '18' }]}>
                        <MaterialIcons name={item.is_active ? 'check-circle' : 'pause-circle-filled'} size={22} color={item.is_active ? Colors.success : Colors.textTertiary} />
                        <Text style={[styles.statusText, { color: item.is_active ? Colors.success : Colors.textTertiary }]}>
                            {item.is_active ? 'Đang bán' : 'Tạm ngưng bán'}
                        </Text>
                    </View>

                    {editing ? (
                        /* ===== EDIT MODE ===== */
                        <>
                            <View style={styles.section}>
                                <Text style={styles.label}>Tên món <Text style={styles.required}>*</Text></Text>
                                <TextInput style={styles.input} value={editName}
                                    onChangeText={setEditName} placeholder="Tên món ăn"
                                    placeholderTextColor={Colors.textTertiary}
                                    accessibilityLabel="Tên món ăn" />

                                <Text style={styles.label}>Danh mục</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.chipRowEdit} keyboardShouldPersistTaps="handled">
                                    {categories.map((cat) => (
                                        <Pressable key={cat.id}
                                            style={({ pressed }) => [styles.chipSmall, editCategoryId === cat.id && styles.chipSmallActive, pressed && { opacity: 0.7 }]}
                                            onPress={() => { hapticLight(); setEditCategoryId(editCategoryId === cat.id ? undefined : cat.id); }}
                                            accessibilityState={{ selected: editCategoryId === cat.id }}
                                            android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                                        >
                                            <Text style={[styles.chipSmallText, editCategoryId === cat.id && styles.chipSmallTextActive]}>{cat.name}</Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>

                                <View style={styles.row}>
                                    <View style={styles.halfField}>
                                        <Text style={styles.label}>Giá bán (VND)</Text>
                                        <TextInput style={styles.input} value={editSellPrice}
                                            onChangeText={setEditSellPrice} keyboardType="number-pad"
                                            placeholderTextColor={Colors.textTertiary}
                                            accessibilityLabel="Giá bán" />
                                    </View>
                                    <View style={styles.halfField}>
                                        <Text style={styles.label}>Giá vốn (VND)</Text>
                                        <TextInput style={styles.input} value={editCostPrice}
                                            onChangeText={setEditCostPrice} keyboardType="number-pad"
                                            placeholderTextColor={Colors.textTertiary}
                                            accessibilityLabel="Giá vốn" />
                                    </View>
                                </View>

                                <Text style={styles.label}>ĐVT</Text>
                                <TextInput style={styles.input} value={editUom}
                                    onChangeText={setEditUom} placeholder="phần"
                                    placeholderTextColor={Colors.textTertiary}
                                    accessibilityLabel="Đơn vị tính" />

                                <Text style={styles.label}>Mô tả</Text>
                                <TextInput style={[styles.input, styles.textArea]} value={editDesc}
                                    onChangeText={setEditDesc} placeholder="Mô tả món ăn…"
                                    placeholderTextColor={Colors.textTertiary}
                                    multiline numberOfLines={3} textAlignVertical="top"
                                    accessibilityLabel="Mô tả món ăn" />
                            </View>

                            {/* Save / Cancel */}
                            <View style={styles.editActions}>
                                <Pressable style={({ pressed }) => [styles.cancelEditBtn, pressed && { opacity: 0.7 }]}
                                    onPress={() => setEditing(false)} accessibilityLabel="Hủy chỉnh sửa" accessibilityRole="button"
                                    android_ripple={{ color: 'rgba(0,0,0,0.08)' }}>
                                    <Text style={styles.cancelEditText}>Hủy</Text>
                                </Pressable>
                                <Pressable style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
                                    onPress={handleSave} disabled={updateItem.isPending || !editName.trim()}
                                    accessibilityLabel="Lưu thay đổi" accessibilityRole="button"
                                    android_ripple={{ color: 'rgba(255,255,255,0.2)' }}>
                                    <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtnGradient}>
                                        <Text style={styles.saveBtnText}>{updateItem.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}</Text>
                                    </LinearGradient>
                                </Pressable>
                            </View>
                        </>
                    ) : (
                        /* ===== VIEW MODE ===== */
                        <>
                            {/* Info */}
                            <View style={styles.section}>
                                <Text style={styles.itemName}>{item.name}</Text>
                                {item.category_name && (
                                    <View style={styles.infoRow}>
                                        <MaterialIcons name="category" size={14} color={Colors.textSecondary} />
                                        <Text style={styles.infoText}>{item.category_name}</Text>
                                    </View>
                                )}
                                {item.uom && (
                                    <View style={styles.infoRow}>
                                        <MaterialIcons name="straighten" size={14} color={Colors.textSecondary} />
                                        <Text style={styles.infoText}>ĐVT: {item.uom}</Text>
                                    </View>
                                )}
                                {item.description && (
                                    <Text style={styles.descText}>{item.description}</Text>
                                )}
                            </View>

                            {/* Pricing */}
                            <View style={styles.section}>
                                <View style={styles.sectionTitleRow}>
                                    <MaterialIcons name="payments" size={18} color={Colors.textPrimary} />
                                    <Text style={styles.sectionTitle}>Giá</Text>
                                </View>
                                <View style={styles.priceCard}>
                                    <View style={styles.priceItem}>
                                        <Text style={styles.priceLabel}>Giá bán</Text>
                                        <Text style={styles.priceValue}>{formatCurrency(item.selling_price)}</Text>
                                    </View>
                                    <View style={styles.priceDivider} />
                                    <View style={styles.priceItem}>
                                        <Text style={styles.priceLabel}>Giá vốn</Text>
                                        <Text style={[styles.priceValue, { color: Colors.textSecondary }]}>{formatCurrency(item.cost_price)}</Text>
                                    </View>
                                </View>
                                {profitMargin != null && (
                                    <View style={[styles.marginBadge, { backgroundColor: profitMargin >= 30 ? Colors.success + '18' : Colors.warning + '18' }]}>
                                        <MaterialIcons name="trending-up" size={14}
                                            color={profitMargin >= 30 ? Colors.success : Colors.warning} />
                                        <Text style={[styles.marginText, { color: profitMargin >= 30 ? Colors.success : Colors.warning }]}>
                                            Biên lợi nhuận: {profitMargin.toFixed(1)}%
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Actions */}
                            {isManager && (
                                <View style={styles.section}>
                                    <Pressable style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
                                        onPress={handleToggleActive}
                                        accessibilityLabel={item.is_active ? 'Tạm ngưng bán' : 'Mở bán lại'}
                                        accessibilityRole="button" android_ripple={{ color: 'rgba(0,0,0,0.06)' }}>
                                        <MaterialIcons name={item.is_active ? 'pause-circle' : 'play-circle'} size={22}
                                            color={item.is_active ? Colors.warning : Colors.success} />
                                        <Text style={styles.actionText}>{item.is_active ? 'Tạm ngưng bán' : 'Mở bán lại'}</Text>
                                    </Pressable>
                                    <Pressable style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
                                        onPress={() => { hapticWarning(); setShowDeleteConfirm(true); }}
                                        accessibilityLabel="Xóa món ăn" accessibilityRole="button"
                                        accessibilityHint="Nhấn để xóa món ăn vĩnh viễn"
                                        android_ripple={{ color: 'rgba(0,0,0,0.06)' }}>
                                        <MaterialIcons name="delete" size={22} color={Colors.error} />
                                        <Text style={[styles.actionText, { color: Colors.error }]}>Xóa món ăn</Text>
                                    </Pressable>
                                </View>
                            )}
                        </>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Delete Confirm */}
            <ConfirmModal
                visible={showDeleteConfirm}
                title="Xóa món ăn?"
                message={`Bạn có chắc muốn xóa "${item.name}"? Hành động này không thể hoàn tác.`}
                confirmText="Xóa"
                cancelText="Hủy"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                isLoading={deleteItem.isPending}
                variant="danger"
            />

            {/* Offline Error */}
            <ConfirmModal
                visible={showOfflineError}
                title="Không có kết nối"
                message="Cần kết nối mạng để thực hiện thao tác. Vui lòng kiểm tra kết nối."
                confirmText="Đã hiểu"
                cancelText="Đóng"
                onConfirm={() => setShowOfflineError(false)}
                onCancel={() => setShowOfflineError(false)}
                variant="danger"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.bgSecondary },
    container: { flex: 1, backgroundColor: Colors.bgSecondary },
    content: { padding: Spacing.lg, gap: Spacing.md },
    statusBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.lg,
    },
    statusText: { fontSize: FontSize.md, fontWeight: '700' },
    section: {
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        padding: Spacing.lg, gap: Spacing.sm,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
    itemName: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoText: { fontSize: FontSize.sm, color: Colors.textSecondary },
    descText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22, marginTop: Spacing.xs },
    priceCard: {
        flexDirection: 'row', backgroundColor: Colors.bgTertiary,
        borderRadius: BorderRadius.md, overflow: 'hidden',
    },
    priceItem: { flex: 1, padding: Spacing.md, alignItems: 'center', gap: 4 },
    priceLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '500' },
    priceValue: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary, fontVariant: ['tabular-nums'] },
    priceDivider: { width: 1, backgroundColor: Colors.border },
    marginBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        padding: Spacing.sm, borderRadius: BorderRadius.sm, alignSelf: 'flex-start',
    },
    marginText: { fontSize: FontSize.sm, fontWeight: '600', fontVariant: ['tabular-nums'] },
    actionRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    actionText: { fontSize: FontSize.md, fontWeight: '500', color: Colors.textPrimary },
    // Edit mode
    label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
    required: { color: Colors.error },
    input: {
        backgroundColor: Colors.bgSecondary, borderWidth: 1, borderColor: Colors.border,
        borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
        fontSize: FontSize.md, color: Colors.textPrimary,
    },
    textArea: { minHeight: 80 },
    row: { flexDirection: 'row', gap: Spacing.md },
    halfField: { flex: 1, gap: Spacing.xs },
    chipRowEdit: { gap: Spacing.sm, paddingVertical: Spacing.xs },
    chipSmall: {
        paddingHorizontal: Spacing.sm, paddingVertical: 6,
        borderRadius: BorderRadius.sm, backgroundColor: Colors.bgTertiary,
        borderWidth: 1.5, borderColor: 'transparent',
    },
    chipSmallActive: { backgroundColor: Colors.primary + '18', borderColor: Colors.primary },
    chipSmallText: { fontSize: FontSize.xs, fontWeight: '500', color: Colors.textSecondary },
    chipSmallTextActive: { color: Colors.primary, fontWeight: '700' },
    editActions: { flexDirection: 'row', gap: Spacing.md },
    cancelEditBtn: {
        flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
        alignItems: 'center', backgroundColor: Colors.bgTertiary,
    },
    cancelEditText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary },
    saveBtn: { flex: 2 },
    saveBtnGradient: {
        paddingVertical: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center',
    },
    saveBtnText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textInverse },
});
