// Step 1: Customer & Event Information
import { useState } from 'react';
import {
    View, Text, TextInput, Pressable, ScrollView,
    StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors, FontSize, Spacing, BorderRadius } from '../../../constants/colors';
import { useQuoteDraftStore } from '../../../lib/stores/quote-draft';
import { hapticLight, hapticMedium } from '../../../lib/haptics';

const EVENT_TYPES = [
    'Tiệc cưới', 'Tiệc sinh nhật', 'Tiệc công ty',
    'Tiệc gia đình', 'Buffet', 'Khác',
];

interface Props {
    onNext: () => void;
}

export default function CustomerStep({ onNext }: Props) {
    const store = useQuoteDraftStore();
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!store.customer_name.trim()) newErrors.customer_name = 'Vui lòng nhập tên khách hàng';
        if (!store.event_type) newErrors.event_type = 'Vui lòng chọn loại tiệc';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validate()) {
            hapticMedium();
            onNext();
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.wrapper}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Customer Name */}
                <View style={styles.field}>
                    <Text style={styles.label}>
                        Tên khách hàng <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        style={[styles.input, errors.customer_name && styles.inputError]}
                        value={store.customer_name}
                        onChangeText={(v) => store.setCustomerInfo({ customer_name: v })}
                        placeholder="Nhập tên khách hàng..."
                        placeholderTextColor={Colors.textTertiary}
                        accessibilityLabel="Tên khách hàng"
                    />
                    {errors.customer_name && (
                        <Text style={styles.errorText}>{errors.customer_name}</Text>
                    )}
                </View>

                {/* Phone */}
                <View style={styles.field}>
                    <Text style={styles.label}>Số điện thoại</Text>
                    <TextInput
                        style={styles.input}
                        value={store.customer_phone}
                        onChangeText={(v) => store.setCustomerInfo({ customer_phone: v })}
                        placeholder="0912 345 678"
                        placeholderTextColor={Colors.textTertiary}
                        keyboardType="phone-pad"
                        accessibilityLabel="Số điện thoại khách hàng"
                    />
                </View>

                {/* Email */}
                <View style={styles.field}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        value={store.customer_email}
                        onChangeText={(v) => store.setCustomerInfo({ customer_email: v })}
                        placeholder="email@example.com"
                        placeholderTextColor={Colors.textTertiary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        accessibilityLabel="Email khách hàng"
                    />
                </View>

                {/* Event Type */}
                <View style={styles.field}>
                    <Text style={styles.label}>
                        Loại tiệc <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.chipRow}>
                        {EVENT_TYPES.map((type) => (
                            <Pressable
                                key={type}
                                style={({ pressed }) => [
                                    styles.chip,
                                    store.event_type === type && styles.chipActive,
                                    pressed && { opacity: 0.7 },
                                ]}
                                onPress={() => { hapticLight(); store.setCustomerInfo({ event_type: type }); }}
                                accessibilityLabel={`Loại tiệc ${type}`}
                                accessibilityRole="button"
                                accessibilityState={{ selected: store.event_type === type }}
                                android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                            >
                                <Text style={[styles.chipText, store.event_type === type && styles.chipTextActive]}>
                                    {type}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                    {errors.event_type && (
                        <Text style={styles.errorText}>{errors.event_type}</Text>
                    )}
                </View>

                {/* Event Date */}
                <View style={styles.field}>
                    <Text style={styles.label}>Ngày tổ chức</Text>
                    <TextInput
                        style={styles.input}
                        value={store.event_date}
                        onChangeText={(v) => store.setCustomerInfo({ event_date: v })}
                        placeholder="dd/mm/yyyy"
                        placeholderTextColor={Colors.textTertiary}
                        accessibilityLabel="Ngày tổ chức tiệc"
                    />
                </View>

                {/* Event Time */}
                <View style={styles.field}>
                    <Text style={styles.label}>Giờ phục vụ</Text>
                    <TextInput
                        style={styles.input}
                        value={store.event_time}
                        onChangeText={(v) => store.setCustomerInfo({ event_time: v })}
                        placeholder="17:00"
                        placeholderTextColor={Colors.textTertiary}
                        accessibilityLabel="Giờ phục vụ"
                    />
                </View>

                {/* Address */}
                <View style={styles.field}>
                    <Text style={styles.label}>Địa chỉ</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={store.event_address}
                        onChangeText={(v) => store.setCustomerInfo({ event_address: v })}
                        placeholder="Địa chỉ tổ chức tiệc..."
                        placeholderTextColor={Colors.textTertiary}
                        multiline
                        numberOfLines={2}
                        textAlignVertical="top"
                        accessibilityLabel="Địa chỉ tổ chức"
                    />
                </View>

                {/* Table Count */}
                <View style={styles.row}>
                    <View style={styles.halfField}>
                        <Text style={styles.label}>Số bàn</Text>
                        <TextInput
                            style={styles.input}
                            value={store.table_count ? String(store.table_count) : ''}
                            onChangeText={(v) => store.setCustomerInfo({ table_count: parseInt(v) || 0 })}
                            keyboardType="number-pad"
                            placeholder="0"
                            placeholderTextColor={Colors.textTertiary}
                            accessibilityLabel="Số bàn"
                        />
                    </View>
                    <View style={styles.halfField}>
                        <Text style={styles.label}>Khách/bàn</Text>
                        <TextInput
                            style={styles.input}
                            value={store.guests_per_table ? String(store.guests_per_table) : ''}
                            onChangeText={(v) => store.setCustomerInfo({ guests_per_table: parseInt(v) || 10 })}
                            keyboardType="number-pad"
                            placeholder="10"
                            placeholderTextColor={Colors.textTertiary}
                            accessibilityLabel="Số khách mỗi bàn"
                        />
                    </View>
                </View>

                {/* Notes */}
                <View style={styles.field}>
                    <Text style={styles.label}>Ghi chú</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={store.notes}
                        onChangeText={(v) => store.setCustomerInfo({ notes: v })}
                        placeholder="Yêu cầu đặc biệt, chống chỉ định..."
                        placeholderTextColor={Colors.textTertiary}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        accessibilityLabel="Ghi chú"
                    />
                </View>

                {/* Next Button */}
                <Pressable
                    style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }]}
                    onPress={handleNext}
                    accessibilityLabel="Tiếp tục chọn món"
                    accessibilityRole="button"
                    android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                >
                    <Text style={styles.nextBtnText}>Tiếp tục → Chọn món</Text>
                </Pressable>

                <View style={styles.bottomSpacer} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    wrapper: { flex: 1 },
    container: { flex: 1, backgroundColor: Colors.bgSecondary },
    content: { padding: Spacing.lg, gap: Spacing.md },
    field: { gap: Spacing.xs },
    label: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
    required: { color: Colors.error },
    input: {
        backgroundColor: Colors.bgPrimary,
        borderWidth: 1, borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
        fontSize: FontSize.md, color: Colors.textPrimary,
    },
    inputError: { borderColor: Colors.error },
    textArea: { minHeight: 70 },
    errorText: { fontSize: FontSize.xs, color: Colors.error },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    chip: {
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md, backgroundColor: Colors.bgTertiary,
        borderWidth: 1.5, borderColor: 'transparent',
    },
    chipActive: {
        backgroundColor: Colors.primary + '18', borderColor: Colors.primary,
    },
    chipText: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textSecondary },
    chipTextActive: { color: Colors.primary, fontWeight: '700' },
    row: { flexDirection: 'row', gap: Spacing.md },
    halfField: { flex: 1, gap: Spacing.xs },
    nextBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.lg, borderRadius: BorderRadius.lg,
        alignItems: 'center', marginTop: Spacing.md,
    },
    nextBtnText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textInverse },
    bottomSpacer: { height: 40 },
});
