/**
 * System Settings Configuration
 * Defines all setting groups, validation rules, and dependency maps
 * for the System Settings tab.
 */
import {
    IconShoppingCart,
    IconCrown,
    IconCalendar,
    IconChartBar,
    IconDatabase,
} from '@tabler/icons-react';

// =============================================
// Types
// =============================================
export interface SettingConfig {
    key: string;
    label: string;
    help: string;
    type?: 'BOOLEAN' | 'NUMBER' | 'STRING';
    suffix?: string;
    min?: number;
    max?: number;
    defaultValue: string;
    dependsOn?: string;
    showWhen?: string;
}

export interface SettingGroupConfig {
    id: string;
    title: string;
    description: string;
    icon: typeof IconShoppingCart;
    color: string;
    settings: SettingConfig[];
}

// =============================================
// Setting Groups
// =============================================
export const SETTING_GROUPS: SettingGroupConfig[] = [
    {
        id: 'order',
        title: 'Đơn hàng & Vận hành',
        description: 'Cấu hình tự động hóa khi xử lý đơn hàng',
        icon: IconShoppingCart,
        color: '#6366f1',
        settings: [
            {
                key: 'order.auto_deduct_inventory',
                label: 'Tự động trừ kho khi hoàn thành đơn',
                help: 'Trừ nguyên liệu theo recipe mapping khi đơn hoàn thành',
                defaultValue: 'true',
            },
            {
                key: 'order.auto_create_timesheet',
                label: 'Tự động tạo bảng chấm công',
                help: 'Tạo timesheet cho nhân viên được phân công',
                defaultValue: 'true',
            },
            {
                key: 'order.auto_earn_loyalty',
                label: 'Tự động cộng điểm tích lũy',
                help: 'Cộng điểm loyalty cho khách hàng khi đơn hoàn thành',
                dependsOn: 'crm.loyalty_enabled',
                showWhen: 'true',
                defaultValue: 'true',
            },
            {
                key: 'order.require_deposit',
                label: 'Yêu cầu đặt cọc trước xác nhận',
                help: 'Đơn hàng cần thanh toán đặt cọc trước khi xác nhận',
                defaultValue: 'false',
            },
            {
                key: 'order.min_order_amount',
                label: 'Giá trị đơn hàng tối thiểu',
                help: 'Đơn hàng dưới giá trị này sẽ không được tạo',
                suffix: 'VND',
                min: 0,
                max: 999999999,
                defaultValue: '0',
            },
            {
                key: 'order.default_lead_time_days',
                label: 'Thời gian chuẩn bị mặc định',
                help: 'Thời gian tối thiểu từ khi đặt đến khi phục vụ',
                suffix: 'ngày',
                min: 1,
                max: 30,
                defaultValue: '3',
            },
        ],
    },
    {
        id: 'crm',
        title: 'Khách hàng & Loyalty',
        description: 'Chương trình tích điểm và chăm sóc khách hàng',
        icon: IconCrown,
        color: '#f59e0b',
        settings: [
            {
                key: 'crm.loyalty_enabled',
                label: 'Bật chương trình tích điểm',
                help: 'Bật/tắt toàn bộ chương trình loyalty',
                defaultValue: 'true',
            },
            {
                key: 'crm.loyalty_points_ratio',
                label: 'Số VND cho 1 điểm',
                help: 'Tỉ lệ quy đổi: mỗi X VND = 1 điểm loyalty',
                suffix: 'VND/điểm',
                min: 1000,
                max: 1000000,
                defaultValue: '10000',
                dependsOn: 'crm.loyalty_enabled',
                showWhen: 'true',
            },
        ],
    },
    {
        id: 'quote',
        title: 'Báo giá',
        description: 'Cài đặt mặc định cho báo giá',
        icon: IconCalendar,
        color: '#10b981',
        settings: [
            {
                key: 'quote.default_validity_days',
                label: 'Thời hạn hiệu lực mặc định',
                help: 'Số ngày hiệu lực tự động áp dụng cho báo giá mới',
                suffix: 'ngày',
                min: 1,
                max: 365,
                defaultValue: '30',
            },
            {
                key: 'quote.expiring_soon_days',
                label: 'Ngưỡng cảnh báo sắp hết hạn',
                help: 'Cảnh báo khi báo giá còn dưới X ngày để hết hạn',
                suffix: 'ngày',
                min: 1,
                max: 30,
                defaultValue: '7',
            },
        ],
    },
    {
        id: 'finance',
        title: 'Tài chính',
        description: 'Cấu hình kế toán và thanh toán',
        icon: IconChartBar,
        color: '#ec4899',
        settings: [
            {
                key: 'finance.auto_journal_on_payment',
                label: 'Tự động tạo bút toán khi thanh toán',
                help: 'Tạo journal entry khi ghi nhận thanh toán',
                defaultValue: 'true',
            },
            {
                key: 'finance.default_payment_terms',
                label: 'Số ngày thanh toán mặc định',
                help: 'Hạn thanh toán mặc định cho đơn hàng mới',
                suffix: 'ngày',
                min: 0,
                max: 365,
                defaultValue: '30',
            },
            {
                key: 'finance.tax_rate',
                label: 'Thuế GTGT mặc định',
                help: 'Tỉ lệ thuế giá trị gia tăng',
                suffix: '%',
                min: 0,
                max: 100,
                defaultValue: '10',
            },
            {
                key: 'finance.default_service_charge',
                label: 'Phí dịch vụ mặc định',
                help: 'Phí dịch vụ áp dụng cho đơn hàng, tính theo % tổng giá trị',
                suffix: '%',
                min: 0,
                max: 50,
                defaultValue: '0',
            },
        ],
    },
    {
        id: 'system',
        title: 'Hệ thống chung',
        description: 'Tự động hóa liên module',
        icon: IconDatabase,
        color: '#64748b',
        settings: [
            {
                key: 'hr.sync_order_assignments',
                label: 'Đồng bộ phân công nhân viên',
                help: 'Đồng bộ phân công giữa Order và HR',
                defaultValue: 'true',
            },
            {
                key: 'inventory.auto_import_from_po',
                label: 'Tự động nhập kho từ PO',
                help: 'Import hàng vào kho khi Purchase Order được duyệt',
                defaultValue: 'true',
            },
        ],
    },
];

// =============================================
// Validation helpers
// =============================================

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validate a numeric setting value against its config rules
 */
export function validateSetting(
    config: SettingConfig,
    value: string
): ValidationResult {
    if (config.min === undefined && config.max === undefined) {
        return { valid: true };
    }

    const num = Number(value);
    if (isNaN(num)) {
        return { valid: false, error: 'Giá trị phải là số' };
    }

    if (config.min !== undefined && num < config.min) {
        return {
            valid: false,
            error: `Giá trị tối thiểu là ${config.min.toLocaleString('vi-VN')}`,
        };
    }

    if (config.max !== undefined && num > config.max) {
        return {
            valid: false,
            error: `Giá trị tối đa là ${config.max.toLocaleString('vi-VN')}`,
        };
    }

    return { valid: true };
}

/**
 * Check if a setting should be visible based on its dependency
 */
export function isSettingEnabled(
    config: SettingConfig,
    allSettings: Array<{ key: string; value: string }>
): boolean {
    if (!config.dependsOn) return true;

    const parent = allSettings.find((s) => s.key === config.dependsOn);
    if (!parent) return true; // If parent not found, show by default

    return String(parent.value) === config.showWhen;
}
