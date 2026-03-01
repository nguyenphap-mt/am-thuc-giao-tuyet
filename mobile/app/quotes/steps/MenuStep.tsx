// Step 2: Menu Item Picker
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, Pressable, FlatList,
    StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../../../constants/colors';
import { useQuoteDraftStore, type QuoteItemDraft } from '../../../lib/stores/quote-draft';
import { useMenuItems } from '../../../lib/hooks/useMenuItems';
import { hapticLight, hapticMedium, hapticWarning } from '../../../lib/haptics';

interface Props {
    onNext: () => void;
    onBack: () => void;
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency', currency: 'VND', maximumFractionDigits: 0,
    }).format(amount);
}

export default function MenuStep({ onNext, onBack }: Props) {
    const store = useQuoteDraftStore();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const { data: menuItems = [] } = useMenuItems();
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Search debounce (300ms)
    const handleSearchChange = useCallback((text: string) => {
        setSearch(text);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setDebouncedSearch(text);
        }, 300);
    }, []);

    // Cleanup debounce timer
    useEffect(() => {
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, []);

    // Memoize filtered items for performance
    const filteredItems = useMemo(() => {
        if (!debouncedSearch.trim()) return menuItems;
        const q = debouncedSearch.toLowerCase();
        return menuItems.filter((item: any) =>
            item.name?.toLowerCase().includes(q) ||
            item.category?.toLowerCase().includes(q)
        );
    }, [menuItems, debouncedSearch]);

    // Memoize subtotal
    const subtotal = useMemo(() =>
        store.items.reduce((sum, item) => sum + item.total_price, 0),
        [store.items]
    );

    const addMenuItem = useCallback((menuItem: any) => {
        hapticLight();
        const newItem: QuoteItemDraft = {
            menu_item_id: menuItem.id,
            item_name: menuItem.name,
            description: menuItem.description,
            uom: menuItem.uom || 'phần',
            quantity: store.table_count || 1,
            unit_price: menuItem.price || 0,
            total_price: (store.table_count || 1) * (menuItem.price || 0),
            category: menuItem.category,
        };
        store.addItem(newItem);
    }, [store]);

    const handleNext = useCallback(() => {
        if (store.items.length === 0) return;
        hapticMedium();
        onNext();
    }, [store.items.length, onNext]);

    const renderMenuItem = useCallback(({ item }: { item: any }) => {
        const isAdded = store.items.some((i) => i.menu_item_id === item.id);
        return (
            <Pressable
                style={({ pressed }) => [styles.menuCard, pressed && { opacity: 0.85 }]}
                onPress={() => !isAdded && addMenuItem(item)}
                disabled={isAdded}
                accessibilityLabel={`${item.name}${isAdded ? ', đã thêm' : ''}, giá ${formatCurrency(item.price || 0)}`}
                accessibilityRole="button"
                accessibilityHint={isAdded ? undefined : 'Nhấn để thêm vào báo giá'}
                android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
            >
                <View style={styles.menuInfo}>
                    <Text style={styles.menuName} numberOfLines={1}>{item.name}</Text>
                    {item.category && <Text style={styles.menuCategory}>{item.category}</Text>}
                </View>
                <View style={styles.menuRight}>
                    <Text style={styles.menuPrice}>{formatCurrency(item.price || 0)}</Text>
                    {isAdded ? (
                        <View style={styles.addedBadge}>
                            <MaterialIcons name="check" size={12} color={Colors.textTertiary} />
                            <Text style={styles.addedLabel}>Đã thêm</Text>
                        </View>
                    ) : (
                        <View style={styles.addBadge}>
                            <MaterialIcons name="add" size={12} color={Colors.success} />
                            <Text style={styles.addLabel}>Thêm</Text>
                        </View>
                    )}
                </View>
            </Pressable>
        );
    }, [store.items, addMenuItem]);

    const keyExtractor = useCallback((item: any) => item.id, []);

    return (
        <KeyboardAvoidingView
            style={styles.wrapper}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.container}>
                {/* Search */}
                <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={handleSearchChange}
                    placeholder="Tìm món ăn…"
                    placeholderTextColor={Colors.textTertiary}
                    accessibilityLabel="Tìm kiếm món ăn"
                    accessibilityHint="Nhập tên hoặc danh mục để lọc"
                />

                {/* Selected Items Summary */}
                {store.items.length > 0 && (
                    <View style={styles.selectedSummary}>
                        <Text style={styles.selectedTitle}>
                            Đã chọn: {store.items.length} món
                        </Text>
                        {store.items.map((item, index) => (
                            <View key={index} style={styles.selectedRow}>
                                <Text style={styles.selectedName} numberOfLines={1}>{item.item_name}</Text>
                                <Text style={styles.selectedQty}>x{item.quantity}</Text>
                                <Pressable
                                    onPress={() => { hapticWarning(); store.removeItem(index); }}
                                    style={({ pressed }) => [styles.removeBtnWrap, pressed && { opacity: 0.6 }]}
                                    accessibilityLabel={`Xóa ${item.item_name}`}
                                    accessibilityRole="button"
                                    accessibilityHint="Nhấn để xóa món khỏi danh sách"
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <MaterialIcons name="close" size={16} color={Colors.error} />
                                </Pressable>
                            </View>
                        ))}
                        <Text style={styles.selectedSubtotal}>
                            Tạm tính: {formatCurrency(subtotal)}
                        </Text>
                    </View>
                )}

                {/* Menu Items List */}
                <FlatList
                    data={filteredItems}
                    keyExtractor={keyExtractor}
                    renderItem={renderMenuItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MaterialIcons
                                name={search ? 'search-off' : 'restaurant-menu'}
                                size={48}
                                color={Colors.textTertiary}
                            />
                            <Text style={styles.emptyText}>
                                {search ? 'Không tìm thấy món ăn' : 'Chưa có thực đơn'}
                            </Text>
                        </View>
                    }
                />

                {/* Navigation */}
                <View style={styles.navRow}>
                    <Pressable
                        style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
                        onPress={() => { hapticLight(); onBack(); }}
                        accessibilityLabel="Quay lại bước trước"
                        accessibilityRole="button"
                        android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                    >
                        <Text style={styles.backBtnText}>← Quay lại</Text>
                    </Pressable>
                    <Pressable
                        style={({ pressed }) => [
                            styles.nextBtn,
                            store.items.length === 0 && styles.nextBtnDisabled,
                            pressed && { opacity: 0.85 },
                        ]}
                        onPress={handleNext}
                        disabled={store.items.length === 0}
                        accessibilityLabel="Tiếp tục xem lại báo giá"
                        accessibilityRole="button"
                        android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                    >
                        <Text style={styles.nextBtnText}>Tiếp tục →</Text>
                    </Pressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    wrapper: { flex: 1 },
    container: { flex: 1, backgroundColor: Colors.bgSecondary },
    searchInput: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        fontSize: FontSize.md, color: Colors.textPrimary,
        margin: Spacing.lg, marginBottom: 0,
        borderWidth: 1, borderColor: Colors.border,
    },
    selectedSummary: {
        margin: Spacing.lg, marginBottom: 0, padding: Spacing.md,
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.md,
        borderWidth: 1, borderColor: Colors.primary + '30',
    },
    selectedTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.xs },
    selectedRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingVertical: 4,
    },
    selectedName: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary },
    selectedQty: { fontSize: FontSize.sm, color: Colors.textSecondary, fontVariant: ['tabular-nums'] },
    removeBtnWrap: {
        padding: Spacing.xs,
    },
    selectedSubtotal: {
        fontSize: FontSize.md, fontWeight: '700', color: Colors.primary,
        textAlign: 'right', marginTop: Spacing.xs, fontVariant: ['tabular-nums'],
    },
    list: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.sm },
    menuCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.md,
        padding: Spacing.md, gap: Spacing.md,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    },
    menuInfo: { flex: 1, gap: 2 },
    menuName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
    menuCategory: { fontSize: FontSize.xs, color: Colors.textTertiary },
    menuRight: { alignItems: 'flex-end', gap: 4 },
    menuPrice: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary, fontVariant: ['tabular-nums'] },
    addBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    addLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.success },
    addedBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    addedLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textTertiary },
    empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
    emptyText: { fontSize: FontSize.md, color: Colors.textSecondary },
    navRow: {
        flexDirection: 'row', gap: Spacing.md,
        padding: Spacing.lg, backgroundColor: Colors.bgPrimary,
        borderTopWidth: 1, borderTopColor: Colors.borderLight,
    },
    backBtn: {
        flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
        alignItems: 'center', backgroundColor: Colors.bgTertiary,
    },
    backBtnText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary },
    nextBtn: {
        flex: 2, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
        alignItems: 'center', backgroundColor: Colors.primary,
    },
    nextBtnDisabled: { backgroundColor: Colors.textTertiary },
    nextBtnText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textInverse },
});
