// My Payroll — personal salary view
// Compliant: SafeAreaView, Skeleton, OfflineBanner, useCallback, a11y
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    RefreshControl,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import {
    usePayrollPeriods,
    usePayrollItems,
    useMyPayrollPeriods,
    useMyPayrollItem,
    useMyEmployee,
    useEmployeeList,
    type PayrollPeriod,
    type PayrollItem,
} from '../../lib/hooks/useHR';
import { useAuthStore } from '../../lib/auth-store';
import { OfflineBanner } from '../../components/OfflineBanner';

const MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

const PERIOD_STATUS: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Nháp', color: Colors.textTertiary },
    CALCULATED: { label: 'Đã tính', color: Colors.info },
    APPROVED: { label: 'Đã duyệt', color: Colors.success },
    PAID: { label: 'Đã trả', color: Colors.primary },
};

function formatVND(amount: number): string {
    return amount.toLocaleString('vi-VN') + 'đ';
}

// Skeleton
function PayrollSkeleton() {
    const fadeAnim = useRef(new Animated.Value(0.3)).current;
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 0.3, duration: 750, useNativeDriver: true }),
        ])).start();
    }, [fadeAnim]);
    const B = ({ w, h, s }: { w: number | string; h: number; s?: any }) => (
        <Animated.View style={[{ width: w as any, height: h, borderRadius: 4, backgroundColor: Colors.bgTertiary, opacity: fadeAnim }, s]} />
    );
    return (
        <View style={{ padding: Spacing.lg, gap: Spacing.md }}>
            <B w="100%" h={44} s={{ borderRadius: BorderRadius.md }} />
            <B w="100%" h={120} s={{ borderRadius: BorderRadius.lg }} />
            {[1, 2, 3, 4].map(i => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm }}>
                    <B w="40%" h={14} />
                    <B w="25%" h={14} />
                </View>
            ))}
        </View>
    );
}

// Salary breakdown row
function SalaryRow({ label, amount, bold, color }: { label: string; amount: number; bold?: boolean; color?: string }) {
    return (
        <View style={styles.salaryRow} accessibilityLabel={`${label}: ${formatVND(amount)}`} accessibilityRole="text">
            <Text style={[styles.salaryLabel, bold && { fontWeight: '700' }]}>{label}</Text>
            <Text style={[styles.salaryAmount, bold && { fontWeight: '800' }, color ? { color } : null]}>
                {formatVND(amount)}
            </Text>
        </View>
    );
}

export default function MyPayrollScreen() {
    const { user } = useAuthStore();
    const isManager = MANAGER_ROLES.includes(user?.role?.code || '');
    const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
    const [showPeriodPicker, setShowPeriodPicker] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [showEmployeePicker, setShowEmployeePicker] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const { data: myEmployee } = useMyEmployee(user?.id);
    const { data: employees = [] } = useEmployeeList();

    // Admin viewing another employee → admin endpoint; else → self-service
    const isViewingOther = isManager && !!selectedEmployeeId;

    // Self-service (all roles)
    const selfPeriodsQuery = useMyPayrollPeriods();
    // Admin (requires hr:view_payroll)
    const adminPeriodsQuery = usePayrollPeriods();
    const periodsQuery = isViewingOther ? adminPeriodsQuery : selfPeriodsQuery;
    const periods = periodsQuery.data || [];
    const loadingPeriods = periodsQuery.isLoading;
    const refetchPeriods = periodsQuery.refetch;

    // Self-service: my item for a period
    const selfItemQuery = useMyPayrollItem(!isViewingOther ? (selectedPeriodId || undefined) : undefined);
    // Admin: all items for a period
    const adminItemsQuery = usePayrollItems(isViewingOther ? (selectedPeriodId || undefined) : undefined);
    const refetchItems = isViewingOther ? adminItemsQuery.refetch : selfItemQuery.refetch;
    const loadingItems = isViewingOther ? adminItemsQuery.isLoading : selfItemQuery.isLoading;

    // Auto-select latest period
    useEffect(() => {
        if (periods.length > 0 && !selectedPeriodId) {
            setSelectedPeriodId(periods[0].id);
        }
    }, [periods, selectedPeriodId]);

    const effectiveEmployeeId = isManager && selectedEmployeeId
        ? selectedEmployeeId
        : myEmployee?.id;

    const selectedEmployeeName = isViewingOther
        ? employees.find(e => e.id === selectedEmployeeId)?.full_name || 'NV'
        : myEmployee?.full_name || user?.full_name || 'Tôi';

    // Find my payroll item
    const myItem = useMemo(() => {
        if (isViewingOther) {
            // Admin viewing other: search in full items list
            const items = adminItemsQuery.data || [];
            if (!effectiveEmployeeId || items.length === 0) return null;
            return items.find(i => i.employee_id === effectiveEmployeeId) || null;
        } else {
            // Self-service: directly returns my item
            return selfItemQuery.data || null;
        }
    }, [isViewingOther, adminItemsQuery.data, selfItemQuery.data, effectiveEmployeeId]);

    const selectedPeriod = periods.find(p => p.id === selectedPeriodId);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetchPeriods(), refetchItems()]);
        setRefreshing(false);
    }, [refetchPeriods, refetchItems]);

    const isLoading = loadingPeriods || loadingItems;

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <OfflineBanner />

            {isLoading && !refreshing ? (
                <PayrollSkeleton />
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                >
                    {/* Period Picker */}
                    <Pressable style={styles.periodPicker}
                        onPress={() => setShowPeriodPicker(!showPeriodPicker)}
                        accessibilityLabel={`Kỳ lương: ${selectedPeriod?.period_name || 'Chọn kỳ'}`}
                        accessibilityRole="button"
                        android_ripple={{ color: 'rgba(0,0,0,0.06)' }}>
                        <MaterialIcons name="date-range" size={18} color={Colors.primary} />
                        <Text style={styles.periodPickerText}>{selectedPeriod?.period_name || 'Chọn kỳ lương'}</Text>
                        {selectedPeriod ? (
                            <View style={[styles.periodStatusBadge, { backgroundColor: (PERIOD_STATUS[selectedPeriod.status]?.color || Colors.textTertiary) + '18' }]}>
                                <Text style={[styles.periodStatusText, { color: PERIOD_STATUS[selectedPeriod.status]?.color || Colors.textTertiary }]}>
                                    {PERIOD_STATUS[selectedPeriod.status]?.label || selectedPeriod.status}
                                </Text>
                            </View>
                        ) : null}
                        <MaterialIcons name={showPeriodPicker ? 'expand-less' : 'expand-more'} size={20} color={Colors.textSecondary} />
                    </Pressable>

                    {showPeriodPicker ? (
                        <View style={styles.dropdown}>
                            {periods.map(p => (
                                <Pressable key={p.id} style={styles.dropdownOption}
                                    onPress={() => { setSelectedPeriodId(p.id); setShowPeriodPicker(false); }}
                                    android_ripple={{ color: 'rgba(0,0,0,0.06)' }}>
                                    <Text style={[styles.dropdownOptionText, selectedPeriodId === p.id && styles.dropdownActive]}>
                                        {p.period_name}
                                    </Text>
                                    <Text style={styles.dropdownStatusText}>
                                        {PERIOD_STATUS[p.status]?.label || p.status}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    ) : null}

                    {/* Admin: Employee selector */}
                    {isManager ? (
                        <Pressable style={styles.employeePicker}
                            onPress={() => setShowEmployeePicker(!showEmployeePicker)}
                            accessibilityLabel={`Đang xem: ${selectedEmployeeName}`}
                            accessibilityRole="button"
                            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}>
                            <MaterialIcons name="person" size={18} color={Colors.primary} />
                            <Text style={styles.employeePickerText}>{selectedEmployeeName}</Text>
                            <MaterialIcons name={showEmployeePicker ? 'expand-less' : 'expand-more'} size={20} color={Colors.textSecondary} />
                        </Pressable>
                    ) : null}

                    {showEmployeePicker && isManager ? (
                        <View style={styles.dropdown}>
                            <Pressable style={styles.dropdownOption}
                                onPress={() => { setSelectedEmployeeId(null); setShowEmployeePicker(false); }}
                                android_ripple={{ color: 'rgba(0,0,0,0.06)' }}>
                                <Text style={[styles.dropdownOptionText, !selectedEmployeeId && styles.dropdownActive]}>
                                    📌 Tôi ({myEmployee?.full_name || user?.full_name})
                                </Text>
                            </Pressable>
                            {employees.filter(e => e.is_active).map(emp => (
                                <Pressable key={emp.id} style={styles.dropdownOption}
                                    onPress={() => { setSelectedEmployeeId(emp.id); setShowEmployeePicker(false); }}
                                    android_ripple={{ color: 'rgba(0,0,0,0.06)' }}>
                                    <Text style={[styles.dropdownOptionText, selectedEmployeeId === emp.id && styles.dropdownActive]}>
                                        {emp.full_name}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    ) : null}

                    {/* No data */}
                    {!myItem && !isLoading ? (
                        <View style={styles.empty}>
                            <MaterialIcons name="payments" size={48} color={Colors.textTertiary} />
                            <Text style={styles.emptyTitle}>Chưa có bảng lương</Text>
                            <Text style={styles.emptyText}>
                                {periods.length === 0 ? 'Chưa có kỳ lương nào' : 'Chưa có dữ liệu lương cho kỳ này'}
                            </Text>
                        </View>
                    ) : null}

                    {/* Salary Summary Card */}
                    {myItem ? (
                        <>
                            <LinearGradient
                                colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.summaryCard}
                            >
                                <Text style={styles.summaryLabel}>Thực lãnh</Text>
                                <Text style={styles.summaryAmount}
                                    accessibilityLabel={`Thực lãnh: ${formatVND(myItem.net_salary)}`}>
                                    {formatVND(myItem.net_salary)}
                                </Text>
                                <View style={styles.summaryRow}>
                                    <View style={styles.summaryCol}>
                                        <Text style={styles.summarySubLabel}>Tổng thu nhập</Text>
                                        <Text style={styles.summarySubAmount}>{formatVND(myItem.gross_salary)}</Text>
                                    </View>
                                    <View style={styles.summaryCol}>
                                        <Text style={styles.summarySubLabel}>Khấu trừ</Text>
                                        <Text style={styles.summarySubAmount}>{formatVND(myItem.total_deductions)}</Text>
                                    </View>
                                </View>
                            </LinearGradient>

                            {/* Detail Breakdown */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>📊 Thu nhập</Text>
                                <SalaryRow label="Lương cơ bản" amount={myItem.base_salary} />
                                <SalaryRow label="Giờ làm việc" amount={myItem.regular_pay} />
                                {myItem.overtime_pay > 0 ? <SalaryRow label="Tăng ca" amount={myItem.overtime_pay} color={Colors.warning} /> : null}
                                {myItem.allowance_meal > 0 ? <SalaryRow label="Phụ cấp ăn" amount={myItem.allowance_meal} /> : null}
                                {myItem.allowance_transport > 0 ? <SalaryRow label="Phụ cấp đi lại" amount={myItem.allowance_transport} /> : null}
                                {myItem.bonus > 0 ? <SalaryRow label="Thưởng" amount={myItem.bonus} color={Colors.success} /> : null}
                                <SalaryRow label="Tổng thu nhập" amount={myItem.gross_salary} bold />
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>📉 Khấu trừ</Text>
                                {myItem.deduction_social_ins > 0 ? <SalaryRow label="BHXH" amount={myItem.deduction_social_ins} /> : null}
                                {myItem.deduction_health_ins > 0 ? <SalaryRow label="BHYT" amount={myItem.deduction_health_ins} /> : null}
                                {myItem.deduction_unemployment > 0 ? <SalaryRow label="BHTN" amount={myItem.deduction_unemployment} /> : null}
                                {myItem.deduction_advance > 0 ? <SalaryRow label="Tạm ứng" amount={myItem.deduction_advance} color={Colors.error} /> : null}
                                {myItem.deduction_other > 0 ? <SalaryRow label="Khác" amount={myItem.deduction_other} /> : null}
                                <SalaryRow label="Tổng khấu trừ" amount={myItem.total_deductions} bold color={Colors.error} />
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>📋 Thông tin</Text>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Ngày công</Text>
                                    <Text style={styles.infoValue}>{myItem.working_days} ngày</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Giờ thường</Text>
                                    <Text style={styles.infoValue}>{myItem.regular_hours.toFixed(1)}h</Text>
                                </View>
                                {myItem.overtime_hours > 0 ? (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Tăng ca</Text>
                                        <Text style={[styles.infoValue, { color: Colors.warning }]}>{myItem.overtime_hours.toFixed(1)}h</Text>
                                    </View>
                                ) : null}
                            </View>
                        </>
                    ) : null}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.bgSecondary },
    scrollView: { flex: 1 },
    scrollContent: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
    // Pickers
    periodPicker: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        borderWidth: 1, borderColor: Colors.border,
    },
    periodPickerText: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.primary },
    periodStatusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
    periodStatusText: { fontSize: FontSize.xs, fontWeight: '600' },
    employeePicker: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        borderWidth: 1, borderColor: Colors.border,
    },
    employeePickerText: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.primary },
    dropdown: {
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.md,
        borderWidth: 1, borderColor: Colors.border, maxHeight: 200, overflow: 'hidden',
    },
    dropdownOption: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    dropdownOptionText: { fontSize: FontSize.md, color: Colors.textPrimary },
    dropdownActive: { color: Colors.primary, fontWeight: '700' },
    dropdownStatusText: { fontSize: FontSize.xs, color: Colors.textSecondary },
    // Summary
    summaryCard: {
        borderRadius: BorderRadius.xl, padding: Spacing.xxl, alignItems: 'center', gap: Spacing.sm,
    },
    summaryLabel: { fontSize: FontSize.md, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
    summaryAmount: { fontSize: 32, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'] },
    summaryRow: { flexDirection: 'row', gap: Spacing.xxl, marginTop: Spacing.md },
    summaryCol: { alignItems: 'center' },
    summarySubLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' },
    summarySubAmount: { fontSize: FontSize.lg, fontWeight: '700', color: '#fff', fontVariant: ['tabular-nums'] },
    // Sections
    section: {
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        padding: Spacing.lg, gap: Spacing.xs,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.xs },
    salaryRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    salaryLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
    salaryAmount: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
    infoRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: Spacing.xs,
    },
    infoLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
    infoValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
    empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
    emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
});
