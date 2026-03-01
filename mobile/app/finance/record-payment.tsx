// Record Payment Screen — Quick payment for orders
// MD3: Order card, payment summary, method chips, amount input
import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, TextInput, ScrollView, Pressable, StyleSheet,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/colors';
import { useMyActiveOrders, useCreateOrderPayment, PAYMENT_METHODS, OrderPaymentCreate } from '../../lib/hooks/useExpense';

// VND formatting helper
function formatVND(value: string): string {
    const num = value.replace(/\D/g, '');
    if (!num) return '';
    return Number(num).toLocaleString('vi-VN');
}

function parseVND(formatted: string): number {
    return Number(formatted.replace(/\D/g, '')) || 0;
}

function displayVND(num: number): string {
    return num.toLocaleString('vi-VN') + ' đ';
}

export default function RecordPaymentScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ orderId?: string }>();
    const { data: activeOrders, isLoading: loadingOrders } = useMyActiveOrders();
    const createPayment = useCreateOrderPayment();

    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(params.orderId || null);
    const [amountText, setAmountText] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<OrderPaymentCreate['payment_method']>('TRANSFER');
    const [referenceNo, setReferenceNo] = useState('');

    const amount = parseVND(amountText);
    const selectedOrder = activeOrders?.find(o => o.id === selectedOrderId);
    const isValid = selectedOrderId && amount > 0 && paymentMethod;
    const isSaving = createPayment.isPending;

    // Auto-set orderId from params
    useEffect(() => {
        if (params.orderId) setSelectedOrderId(params.orderId);
    }, [params.orderId]);

    const handleAmountChange = (text: string) => {
        setAmountText(formatVND(text));
    };

    const handleSave = useCallback(async () => {
        if (!isValid || isSaving || !selectedOrderId) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            await createPayment.mutateAsync({
                orderId: selectedOrderId,
                data: {
                    amount,
                    payment_method: paymentMethod,
                    reference_no: referenceNo || undefined,
                },
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Lỗi', err?.message || 'Không thể ghi nhận thanh toán');
        }
    }, [isValid, isSaving, selectedOrderId, amount, paymentMethod, referenceNo, createPayment, router]);

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
                    <Text style={styles.topBarTitle}>Ghi nhận thanh toán</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.contentBody}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Order Selector */}
                    <Text style={styles.sectionLabel}>Chọn đơn hàng</Text>
                    {loadingOrders ? (
                        <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: Spacing.lg }} />
                    ) : (
                        <View style={styles.orderList}>
                            {activeOrders?.map(order => {
                                const isSelected = selectedOrderId === order.id;
                                return (
                                    <Pressable
                                        key={order.id}
                                        style={[styles.orderCard, isSelected && styles.orderCardSelected]}
                                        onPress={() => setSelectedOrderId(order.id)}
                                        accessibilityRole="radio"
                                        accessibilityState={{ selected: isSelected }}
                                        android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                                    >
                                        <View style={styles.orderCardLeft}>
                                            <MaterialIcons
                                                name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                                                size={22}
                                                color={isSelected ? Colors.primary : Colors.outline}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.orderCode}>{order.code}</Text>
                                            <Text style={styles.orderCustomer}>{order.customer_name}</Text>
                                            {order.event_location && (
                                                <Text style={styles.orderLocation}>
                                                    <MaterialIcons name="location-on" size={12} color={Colors.outline} /> {order.event_location}
                                                </Text>
                                            )}
                                        </View>
                                    </Pressable>
                                );
                            })}

                            {(!activeOrders || activeOrders.length === 0) && (
                                <View style={styles.emptyBox}>
                                    <MaterialIcons name="receipt-long" size={40} color={Colors.outlineVariant} />
                                    <Text style={styles.emptyText}>Không có đơn hàng nào hôm nay</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Amount Input */}
                    <Text style={styles.sectionLabel}>Số tiền thanh toán (VND)</Text>
                    <View style={styles.amountContainer}>
                        <Text style={styles.currencySymbol}>đ</Text>
                        <TextInput
                            style={styles.amountInput}
                            value={amountText}
                            onChangeText={handleAmountChange}
                            placeholder="0"
                            placeholderTextColor={Colors.outline}
                            keyboardType="numeric"
                            accessibilityLabel="Nhập số tiền thanh toán"
                        />
                    </View>

                    {/* Payment Method */}
                    <Text style={styles.sectionLabel}>Phương thức thanh toán</Text>
                    <View style={styles.methodRow}>
                        {PAYMENT_METHODS.map(method => {
                            const isSelected = paymentMethod === method.code;
                            return (
                                <Pressable
                                    key={method.code}
                                    style={[styles.methodCard, isSelected && styles.methodCardSelected]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setPaymentMethod(method.code);
                                    }}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: isSelected }}
                                    android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                                >
                                    <MaterialIcons
                                        name={method.icon}
                                        size={28}
                                        color={isSelected ? Colors.primary : Colors.onSurfaceVariant}
                                    />
                                    <Text style={[
                                        styles.methodLabel,
                                        isSelected && { color: Colors.primary, fontWeight: '600' },
                                    ]}>
                                        {method.label}
                                    </Text>
                                    {isSelected && (
                                        <View style={styles.checkBadge}>
                                            <MaterialIcons name="check" size={14} color={Colors.onPrimary} />
                                        </View>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* Reference Number */}
                    <Text style={styles.sectionLabel}>Mã tham chiếu (tùy chọn)</Text>
                    <TextInput
                        style={styles.textInput}
                        value={referenceNo}
                        onChangeText={setReferenceNo}
                        placeholder="VD: VCB123456, biên lai..."
                        placeholderTextColor={Colors.outline}
                        accessibilityLabel="Mã tham chiếu giao dịch"
                    />
                </ScrollView>

                {/* Save Button — Fixed bottom */}
                <View style={styles.bottomBar}>
                    <Pressable
                        style={[styles.saveButton, (!isValid || isSaving) && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={!isValid || isSaving}
                        accessibilityRole="button"
                        accessibilityLabel="Xác nhận thanh toán"
                        android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color={Colors.onPrimary} />
                        ) : (
                            <>
                                <MaterialIcons name="check-circle" size={20} color={Colors.onPrimary} style={{ marginRight: 8 }} />
                                <Text style={styles.saveButtonText}>Xác nhận thanh toán</Text>
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

    // Order List
    orderList: {
        gap: Spacing.sm,
    },
    orderCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.outlineVariant,
        backgroundColor: Colors.surface,
    },
    orderCardSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primaryContainer,
    },
    orderCardLeft: {
        marginRight: Spacing.md,
    },
    orderCode: {
        ...Typography.titleSmall,
        color: Colors.onSurface,
    },
    orderCustomer: {
        ...Typography.bodyMedium,
        color: Colors.onSurfaceVariant,
        marginTop: 2,
    },
    orderLocation: {
        ...Typography.bodySmall,
        color: Colors.outline,
        marginTop: 2,
    },
    emptyBox: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
        gap: Spacing.sm,
    },
    emptyText: {
        ...Typography.bodyMedium,
        color: Colors.outline,
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

    // Payment Methods
    methodRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    methodCard: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.outlineVariant,
        backgroundColor: Colors.surface,
        position: 'relative',
    },
    methodCardSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primaryContainer,
    },
    methodLabel: {
        ...Typography.labelMedium,
        color: Colors.onSurfaceVariant,
        marginTop: Spacing.xs,
    },
    checkBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Text Input
    textInput: {
        borderWidth: 1,
        borderColor: Colors.outline,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        ...Typography.bodyLarge,
        color: Colors.onSurface,
        backgroundColor: Colors.surfaceContainerLowest,
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
