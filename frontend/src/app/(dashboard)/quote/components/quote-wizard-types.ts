'use client';

import {
    IconUser,
    IconToolsKitchen2,
    IconBuildingStore,
    IconFileText,
    IconSend,
} from '@tabler/icons-react';
import { MenuItem } from '@/types';

// ─── Constants ────────────────────────────────────────────────
export const EVENT_TYPES = [
    { value: 'wedding', label: 'Tiệc cưới' },
    { value: 'birthday', label: 'Tiệc sinh nhật' },
    { value: 'corporate', label: 'Tiệc công ty' },
    { value: 'anniversary', label: 'Tiệc kỷ niệm' },
    { value: 'funeral', label: 'Tiệc tang' },
    { value: 'housewarming', label: 'Tiệc tân gia' },
    { value: 'other', label: 'Khác' },
];

// Service category codes used to filter menu items into service vs food
export const SERVICE_CATEGORY_CODES = ['BAN', 'NV'];
export const STAFF_CATEGORY_CODE = 'NV';
export const FURNITURE_CATEGORY_CODE = 'BAN';

// Dynamic service item shape (derived from menu items at runtime)
export interface ServiceItem {
    id: string;
    name: string;
    pricePerUnit: number;
    unit: string;
    categoryCode: string;
}

export const WIZARD_STEPS = [
    { id: 1, title: 'Thông tin KH', icon: IconUser },
    { id: 2, title: 'Chọn Món', icon: IconToolsKitchen2 },
    { id: 3, title: 'Dịch Vụ', icon: IconBuildingStore },
    { id: 4, title: 'Xem Lại', icon: IconFileText },
    { id: 5, title: 'Gửi Duyệt', icon: IconSend },
];



export const STEP_DESCRIPTIONS: Record<number, string> = {
    1: 'Thông tin liên hệ và chi tiết sự kiện',
    2: 'Chọn món ăn cho thực đơn',
    3: 'Thêm dịch vụ bàn ghế, nhân viên',
    4: 'Xem lại thông tin và giá cả',
    5: 'Xác nhận và gửi báo giá',
};

// ─── Types ────────────────────────────────────────────────────
export interface FormData {
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    event_date: string;
    event_time: string;
    event_address: string;
    guest_count: string;
    table_count: string;
    event_type: string;
    notes: string;
}

export interface FormErrors {
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
    event_date?: string;
    event_time?: string;
    event_address?: string;
    guest_count?: string;
    table_count?: string;
    event_type?: string;
}

export const INITIAL_FORM_DATA: FormData = {
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    event_date: '',
    event_time: '',
    event_address: '',
    guest_count: '',
    table_count: '',
    event_type: '',
    notes: '',
};

export interface ProfitAnalysis {
    items: (MenuItem & { profit: number; profitPercent: number })[];
    perTableCost: number;
    perTableSelling: number;
    perTableProfit: number;
    totalCost: number;
    totalSelling: number;
    totalProfit: number;
    profitPercent: number;
}

export interface WizardState {
    // Form data
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;

    // Menu selection
    selectedItems: string[];
    setSelectedItems: React.Dispatch<React.SetStateAction<string[]>>;
    selectedItemsData: MenuItem[];
    setSelectedItemsData: React.Dispatch<React.SetStateAction<MenuItem[]>>;

    // Services (dynamic from menu)
    serviceItems: ServiceItem[];           // BAN category items
    staffItems: ServiceItem[];             // NV category items
    selectedServices: Record<string, number>;
    setSelectedServices: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    staffCount: number;
    setStaffCount: React.Dispatch<React.SetStateAction<number>>;

    // Discounts & VAT
    discountFurniture: number;
    setDiscountFurniture: React.Dispatch<React.SetStateAction<number>>;
    discountStaff: number;
    setDiscountStaff: React.Dispatch<React.SetStateAction<number>>;
    discountOrder: number;
    setDiscountOrder: React.Dispatch<React.SetStateAction<number>>;
    includeVat: boolean;
    setIncludeVat: React.Dispatch<React.SetStateAction<boolean>>;
    selectedQuoteNote: string;
    setSelectedQuoteNote: React.Dispatch<React.SetStateAction<string>>;

    // Step 2 state
    menuSearchTerm: string;
    setMenuSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    selectedCategory: string | null;
    setSelectedCategory: React.Dispatch<React.SetStateAction<string | null>>;
    showBulkPasteDialog: boolean;
    setShowBulkPasteDialog: React.Dispatch<React.SetStateAction<boolean>>;
    bulkPasteText: string;
    setBulkPasteText: React.Dispatch<React.SetStateAction<string>>;
    collapsedCategories: Set<string>;
    setCollapsedCategories: React.Dispatch<React.SetStateAction<Set<string>>>;

    // Validation
    errors: FormErrors;
    setErrors: React.Dispatch<React.SetStateAction<FormErrors>>;
    touched: Record<string, boolean>;
    setTouched: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;

    // Step control
    currentStep: number;
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>;

    // Computed values
    today: string;
    tableCount: number;
    menuTotal: number;
    menuTotalWithTables: number;
    profitAnalysis: ProfitAnalysis;
    furnitureTotal: number;
    staffTotal: number;
    serviceTotal: number;
    furnitureDiscountAmount: number;
    staffDiscountAmount: number;
    serviceTotalAfterDiscount: number;
    subtotalBeforeOrderDiscount: number;
    orderDiscountAmount: number;
    subtotal: number;
    vatAmount: number;
    grandTotal: number;

    // Data hooks
    menuItems: MenuItem[];
    menuLoading: boolean;
    categories: any[];
    categoriesLoading: boolean;
    foodCategories: any[];
    foodCategoryIds: Set<string>;
    filteredMenuItems: MenuItem[];
    groupedMenuItems: { category: any; items: MenuItem[] }[];
    notePresets: any[];
    notesLoading: boolean;

    // Actions
    handleChange: (name: string, value: string) => void;
    handleBlur: (name: string) => void;
    validateStep1: () => boolean;
    handleNext: () => void;
    handleBack: () => void;
    toggleMenuItem: (item: MenuItem) => void;
    handleBulkPaste: () => Promise<void>;
    updateServiceQuantity: (serviceId: string, quantity: number) => void;
    inputClasses: (fieldName: string) => string;
    buildPayload: (status?: string) => any;
}

export type WizardMode = 'create' | 'edit';
