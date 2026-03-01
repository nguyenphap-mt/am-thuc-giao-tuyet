// Create Expense Screen — Quick expense recording with order linking
// MD3: Chips for categories, TextInput for amount, Snackbar for feedback
import React, { useState, useCallback } from 'react';
import {
    View, Text, TextInput, ScrollView, Pressable, StyleSheet, Alert,
    KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/colors';
import { useMyActiveOrders, useCreateOrderExpense, useCreateGeneralExpense, EXPENSE_CATEGORIES } from '../../lib/hooks/useExpense';

// VND formatting helper
function formatVND(value: string): string {
    const num = value.replace(/\D/g, '');
    if (!num) return '';
    return Number(num).toLocaleString('vi-VN');
}

function parseVND(formatted: string): number {
    return Number(formatted.replace(/\D/g, '')) || 0;
}

export default function CreateExpenseScreen() {
    const router = useRouter();
    const { data: activeOrders, isLoading: loadingOrders } = useMyActiveOrders();
    const createOrderExpense = useCreateOrderExpense();
    const createGeneralExpense = useCreateGeneralExpense();

    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [amountText, setAmountText] = useState('');
    const [description, setDescription] = useState('');
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [showOrderPicker, setShowOrderPicker] = useState(false);

    const amount = parseVND(amountText);
    const isValid = selectedCategory && amount > 0;
    const isSaving = createOrderExpense.isPending || createGeneralExpense.isPending;

    const handleAmountChange = (text: string) => {
        setAmountText(formatVND(text));
    };

    const handleSave = useCallback(async () => {
        if (!isValid || isSaving) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            if (selectedOrderId) {
                await createOrderExpense.mutateAsync({
                    orderId: selectedOrderId,
                    data: {
                        category: selectedCategory as any,
                        amount,
                        description: description || undefined,
                    },
                });
            } else {
                await createGeneralExpense.mutateAsync({
                    type: 'PAYMENT',
                    amount,
                    description: description || `Chi phí ${EXPENSE_CATEGORIES.find(c => c.code === selectedCategory)?.label || ''}`,
                    category: selectedCategory,
                });
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Lỗi', err?.message || 'Không thể lưu chi tiêu');
        }
    }, [isValid, isSaving, selectedOrderId, selectedCategory, amount, description, createOrderExpense, createGeneralExpense, router]);

    const selectedOrder = activeOrders?.find(o => o.id === selectedOrderId);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Top App Bar */}
                <View style={styles.topBar}>
                    <Pressable
                        onPress={() => router.back()}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel="Quay lại"
                    >
                        <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
                    </Pressable>
                    <Text style={styles.topBarTitle}>Ghi nhận chi tiêu</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.contentBody}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Category Chips */}
                    <Text style={styles.sectionLabel}>Danh mục</Text>
                    <View style={styles.chipRow}>
                        {EXPENSE_CATEGORIES.map(cat => {
                            const isSelected = selectedCategory === cat.code;
                            return (
                                <Pressable
                                    key={cat.code}
                                    style={[styles.chip, isSelected && styles.chipSelected]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSelectedCategory(cat.code);
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel={cat.label}
                                    accessibilityState={{ selected: isSelected }}
                                    android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                                >
                                    {isSelected && (
                                        <MaterialIcons name="check" size={18} color={Colors.onSecondaryContainer} style={{ marginRight: 4 }} />
                                    )}
                                    <MaterialIcons
                                        name={cat.icon}
                                        size={18}
                                        color={isSelected ? Colors.onSecondaryContainer : Colors.onSurfaceVariant}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text style={[
                                        styles.chipText,
                                        isSelected && { color: Colors.onSecondaryContainer },
                                    ]}>
                                        {cat.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* Amount Input */}
                    <Text style={styles.sectionLabel}>Số tiền (VND)</Text>
                    <View style={styles.amountContainer}>
                        <Text style={styles.currencySymbol}>đ</Text>
                        <TextInput
                            style={styles.amountInput}
                            value={amountText}
                            onChangeText={handleAmountChange}
                            placeholder="0"
                            placeholderTextColor={Colors.outline}
                            keyboardType="numeric"
                            accessibilityLabel="Nhập số tiền"
                        />
                    </View>

                    {/* Description */}
                    <Text style={styles.sectionLabel}>Ghi chú</Text>
                    <TextInput
                        style={styles.textInput}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Mô tả chi tiêu (tùy chọn)"
                        placeholderTextColor={Colors.outline}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        accessibilityLabel="Ghi chú chi tiêu"
                    />

                    {/* Order Linking */}
                    <Text style={styles.sectionLabel}>Liên kết đơn hàng (tùy chọn)</Text>
                    {loadingOrders ? (
                        <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: Spacing.md }} />
                    ) : (
                        <View style={styles.orderList}>
                            {/* No order option */}
                            <Pressable
                                style={[styles.orderItem, !selectedOrderId && styles.orderItemSelected]}
                                onPress={() => setSelectedOrderId(null)}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: !selectedOrderId }}
                                android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                            >
                                <MaterialIcons
                                    name={!selectedOrderId ? 'radio-button-checked' : 'radio-button-unchecked'}
                                    size={20}
                                    color={!selectedOrderId ? Colors.primary : Colors.outline}
                                />
                                <Text style={styles.orderItemText}>Không liên kết đơn hàng</Text>
                            </Pressable>

                            {activeOrders?.map(order => {
                                const isSelected = selectedOrderId === order.id;
                                return (
                                    <Pressable
                                        key={order.id}
                                        style={[styles.orderItem, isSelected && styles.orderItemSelected]}
                                        onPress={() => setSelectedOrderId(order.id)}
                                        accessibilityRole="radio"
                                        accessibilityState={{ selected: isSelected }}
                                        android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                                    >
                                        <MaterialIcons
                                            name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                                            size={20}
                                            color={isSelected ? Colors.primary : Colors.outline}
                                        />
                                        <View style={{ flex: 1, marginLeft: 8 }}>
                                            <Text style={styles.orderCode}>{order.code}</Text>
                                            <Text style={styles.orderCustomer}>{order.customer_name}</Text>
                                        </View>
                                    </Pressable>
                                );
                            })}

                            {(!activeOrders || activeOrders.length === 0) && (
                                <Text style={styles.emptyText}>Không có đơn hàng nào hôm nay</Text>
                            )}
                        </View>
                    )}
                </ScrollView>

                {/* Save Button — Fixed bottom */}
                <View style={styles.bottomBar}>
                    <Pressable
                        style={[styles.saveButton, (!isValid || isSaving) && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={!isValid || isSaving}
                        accessibilityRole="button"
                        accessibilityLabel="Lưu chi tiêu"
                        android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color={Colors.onPrimary} />
                        ) : (
                            <>
                                <MaterialIcons name="save" size={20} color={Colors.onPrimary} style={{ marginRight: 8 }} />
                                <Text style={styles.saveButtonText}>Lưu chi tiêu</Text>
                            </>
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.surface,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.outlineVariant,
    },
    topBarTitle: {
        ...Typography.titleLarge,
        color: Colors.onSurface,
    },
    content: {
        flex: 1,
    },
    contentBody: {
        padding: Spacing.lg,
        paddingBottom: 100,
    },
    sectionLabel: {
        ...Typography.labelLarge,
        color: Colors.onSurfaceVariant,
        marginTop: Spacing.xl,
        marginBottom: Spacing.sm,
    },

    // Category Chips
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 36,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.outline,
        backgroundColor: 'transparent',
    },
    chipSelected: {
        backgroundColor: Colors.secondaryContainer,
        borderColor: 'transparent',
    },
    chipText: {
        ...Typography.labelLarge,
        color: Colors.onSurfaceVariant,
    },

    // Amount
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.outline,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.lg,
        height: 56,
        backgroundColor: Colors.surfaceContainerLowest,
    },
    currencySymbol: {
        ...Typography.headlineSmall,
        color: Colors.primary,
        marginRight: Spacing.sm,
    },
    amountInput: {
        flex: 1,
        ...Typography.headlineSmall,
        color: Colors.onSurface,
    },

    // Text Input
    textInput: {
        borderWidth: 1,
        borderColor: Colors.outline,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        minHeight: 80,
        ...Typography.bodyLarge,
        color: Colors.onSurface,
        backgroundColor: Colors.surfaceContainerLowest,
    },

    // Order List
    orderList: {
        gap: Spacing.xs,
    },
    orderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.sm,
    },
    orderItemSelected: {
        backgroundColor: Colors.primaryContainer,
    },
    orderItemText: {
        ...Typography.bodyMedium,
        color: Colors.onSurface,
        marginLeft: Spacing.sm,
    },
    orderCode: {
        ...Typography.titleSmall,
        color: Colors.onSurface,
    },
    orderCustomer: {
        ...Typography.bodySmall,
        color: Colors.onSurfaceVariant,
    },
    emptyText: {
        ...Typography.bodyMedium,
        color: Colors.outline,
        textAlign: 'center',
        paddingVertical: Spacing.lg,
    },

    // Bottom bar
    bottomBar: {
        padding: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.outlineVariant,
        backgroundColor: Colors.surface,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.primary,
    },
    saveButtonDisabled: {
        backgroundColor: Colors.surfaceContainerHighest,
    },
    saveButtonText: {
        ...Typography.labelLarge,
        color: Colors.onPrimary,
    },
});
