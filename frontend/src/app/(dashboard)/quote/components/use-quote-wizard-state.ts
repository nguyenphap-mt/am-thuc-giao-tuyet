'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMenuItems, useMenuCategories, useSmartMatch } from '@/hooks/use-menu';
import { useQuoteNotePresets } from '@/hooks/use-quote-notes';
import {
    FormData,
    FormErrors,
    INITIAL_FORM_DATA,
    SERVICE_CATEGORY_CODES,
    STAFF_CATEGORY_CODE,
    FURNITURE_CATEGORY_CODE,
    ServiceItem,
    WizardState,
} from './quote-wizard-types';
import { MenuItem } from '@/types';
import type { Category } from '@/hooks/use-menu';

/**
 * Custom hook that encapsulates ALL shared state/logic for the Quote Wizard.
 * Used by both Create and Edit pages. Eliminates ~1600 LOC of duplication.
 */
export function useQuoteWizardState(initialFormData?: FormData): WizardState {
    const router = useRouter();

    // ─── Form State ────────────────────────────────────────────
    const [formData, setFormData] = useState<FormData>(initialFormData || INITIAL_FORM_DATA);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [selectedItemsData, setSelectedItemsData] = useState<MenuItem[]>([]);
    const [selectedServices, setSelectedServices] = useState<Record<string, number>>({});
    const [staffCount, setStaffCount] = useState(0);

    // Step 4: Discount & VAT
    const [discountFurniture, setDiscountFurniture] = useState(0);
    const [discountStaff, setDiscountStaff] = useState(0);
    const [discountOrder, setDiscountOrder] = useState(0);
    const [includeVat, setIncludeVat] = useState(true);
    const [selectedQuoteNote, setSelectedQuoteNote] = useState('');

    // Data hooks
    const { data: notePresets = [], isLoading: notesLoading } = useQuoteNotePresets();
    const { data: menuItems = [], isLoading: menuLoading } = useMenuItems();
    const { data: categories = [], isLoading: categoriesLoading } = useMenuCategories();
    const smartMatchMutation = useSmartMatch();

    // Step 2 states
    const [menuSearchTerm, setMenuSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showBulkPasteDialog, setShowBulkPasteDialog] = useState(false);
    const [bulkPasteText, setBulkPasteText] = useState('');
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

    // Validation
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 5;

    // ─── Computed Values ────────────────────────────────────────
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);

    const foodCategories = useMemo(() => {
        return categories.filter((cat: Category) => (cat.item_type || 'FOOD') !== 'SERVICE');
    }, [categories]);

    const foodCategoryIds = useMemo(() => {
        return new Set(foodCategories.map((cat: Category) => cat.id));
    }, [foodCategories]);

    // ─── Dynamic Service Items (from menu API) ───────────────────
    const serviceCategoryMap = useMemo(() => {
        const map: Record<string, string> = {}; // categoryId -> categoryCode
        categories.forEach((cat: Category) => {
            if ((cat.item_type || 'FOOD') === 'SERVICE') {
                map[cat.id] = cat.code || '';
            }
        });
        return map;
    }, [categories]);

    const serviceItems: ServiceItem[] = useMemo(() => {
        return menuItems
            .filter(item => {
                const catCode = serviceCategoryMap[item.category_id || ''];
                return catCode === FURNITURE_CATEGORY_CODE;
            })
            .map(item => ({
                id: item.id,
                name: item.name,
                pricePerUnit: Number(item.selling_price) || 0,
                unit: (item as any).uom || 'bộ',
                categoryCode: FURNITURE_CATEGORY_CODE,
            }));
    }, [menuItems, serviceCategoryMap]);

    const staffItems: ServiceItem[] = useMemo(() => {
        return menuItems
            .filter(item => {
                const catCode = serviceCategoryMap[item.category_id || ''];
                return catCode === STAFF_CATEGORY_CODE;
            })
            .map(item => ({
                id: item.id,
                name: item.name,
                pricePerUnit: Number(item.selling_price) || 0,
                unit: (item as any).uom || 'người',
                categoryCode: STAFF_CATEGORY_CODE,
            }));
    }, [menuItems, serviceCategoryMap]);

    // Get the first staff item price (fallback 0 if no staff items in menu)
    const staffPricePerUnit = staffItems.length > 0 ? staffItems[0].pricePerUnit : 0;

    const menuTotal = useMemo(() => {
        return selectedItemsData.reduce((total, item) => total + (Number(item.selling_price) || 0), 0);
    }, [selectedItemsData]);

    const tableCount = parseInt(formData.table_count) || 0;
    const menuTotalWithTables = menuTotal * tableCount;

    const profitAnalysis = useMemo(() => {
        const items = selectedItemsData.map(item => {
            const cost = Number(item.cost_price) || 0;
            const sell = Number(item.selling_price) || 0;
            return {
                ...item,
                cost_price: cost,
                selling_price: sell,
                profit: sell - cost,
                profitPercent: cost > 0 ? ((sell - cost) / cost * 100) : 0,
            };
        });

        const perTableCost = items.reduce((sum, item) => sum + item.cost_price, 0);
        const perTableSelling = items.reduce((sum, item) => sum + item.selling_price, 0);
        const perTableProfit = perTableSelling - perTableCost;

        const totalCost = perTableCost * tableCount;
        const totalSelling = perTableSelling * tableCount;
        const totalProfit = totalSelling - totalCost;
        const profitPercent = totalCost > 0 ? (totalProfit / totalCost * 100) : 0;

        return { items, perTableCost, perTableSelling, perTableProfit, totalCost, totalSelling, totalProfit, profitPercent };
    }, [selectedItemsData, tableCount]);

    const furnitureTotal = useMemo(() => {
        let total = 0;
        Object.entries(selectedServices).forEach(([serviceId, quantity]) => {
            const service = serviceItems.find(s => s.id === serviceId);
            if (service) {
                total += service.pricePerUnit * quantity;
            }
        });
        return total;
    }, [selectedServices, serviceItems]);

    const staffTotal = staffCount * staffPricePerUnit;
    const serviceTotal = furnitureTotal + staffTotal;
    const furnitureDiscountAmount = furnitureTotal * (discountFurniture / 100);
    const staffDiscountAmount = staffTotal * (discountStaff / 100);
    const serviceTotalAfterDiscount = furnitureTotal - furnitureDiscountAmount + staffTotal - staffDiscountAmount;
    const subtotalBeforeOrderDiscount = menuTotalWithTables + serviceTotalAfterDiscount;
    const orderDiscountAmount = subtotalBeforeOrderDiscount * (discountOrder / 100);
    const subtotal = subtotalBeforeOrderDiscount - orderDiscountAmount;
    const vatRate = 0.10;
    const vatAmount = includeVat ? subtotal * vatRate : 0;
    const grandTotal = subtotal + vatAmount;

    // Filter menu items by search, category (only food items)
    const filteredMenuItems = useMemo(() => {
        let items = menuItems.filter(item => foodCategoryIds.has(item.category_id || ''));
        if (selectedCategory) {
            items = items.filter(item => item.category_id === selectedCategory);
        }
        if (menuSearchTerm.trim()) {
            const term = menuSearchTerm.toLowerCase();
            items = items.filter(item => item.name.toLowerCase().includes(term));
        }
        return items;
    }, [menuItems, selectedCategory, menuSearchTerm, foodCategoryIds]);

    const groupedMenuItems = useMemo(() => {
        const groups: Record<string, { category: Category; items: MenuItem[] }> = {};
        filteredMenuItems.forEach(item => {
            const category = foodCategories.find((c: Category) => c.id === item.category_id);
            if (category) {
                if (!groups[category.id]) {
                    groups[category.id] = { category, items: [] };
                }
                groups[category.id].items.push(item);
            }
        });
        return Object.values(groups);
    }, [filteredMenuItems, foodCategories]);

    // ─── Validation ─────────────────────────────────────────────
    const validateField = useCallback((name: string, value: string): string => {
        switch (name) {
            case 'customer_name':
                if (!value.trim()) return 'Vui lòng nhập tên khách hàng';
                if (value.trim().length < 2) return 'Tên tối thiểu 2 ký tự';
                return '';
            case 'customer_phone':
                if (!value.trim()) return 'Vui lòng nhập SĐT';
                if (!/^[0-9]{10,11}$/.test(value.replace(/\s/g, ''))) return 'SĐT không hợp lệ (10-11 số)';
                return '';
            case 'customer_email':
                if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email không hợp lệ';
                return '';
            case 'event_date':
                if (!value) return 'Vui lòng chọn ngày sự kiện';
                return '';
            case 'event_time':
                if (!value) return 'Vui lòng chọn giờ sự kiện';
                return '';
            case 'event_address':
                if (!value.trim()) return 'Vui lòng nhập địa chỉ';
                return '';
            case 'table_count':
                if (!value || parseInt(value) < 1) return 'Phải có ít nhất 1 bàn';
                if (parseInt(value) > 200) return 'Tối đa 200 bàn';
                return '';
            case 'event_type':
                if (!value) return 'Vui lòng chọn loại tiệc';
                return '';
            case 'guest_count':
                if (value && parseInt(value) < 10) return 'Tối thiểu 10 khách';
                if (value && parseInt(value) > 2000) return 'Tối đa 2000 khách';
                return '';
            default:
                return '';
        }
    }, []);

    const handleBlur = useCallback((name: string) => {
        setTouched((prev) => ({ ...prev, [name]: true }));
        const error = validateField(name, formData[name as keyof FormData]);
        setErrors((prev) => ({ ...prev, [name]: error }));
    }, [formData, validateField]);

    const handleChange = useCallback((name: string, value: string) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (touched[name]) {
            const error = validateField(name, value);
            setErrors((prev) => ({ ...prev, [name]: error }));
        }
    }, [touched, validateField]);

    const validateStep1 = useCallback((): boolean => {
        const step1Fields = ['customer_name', 'customer_phone', 'event_date', 'event_time', 'event_address', 'table_count', 'event_type'];
        const newErrors: FormErrors = {};
        let isValid = true;

        step1Fields.forEach((field) => {
            const error = validateField(field, formData[field as keyof FormData]);
            if (error) {
                newErrors[field as keyof FormErrors] = error;
                isValid = false;
            }
        });

        setErrors(newErrors);
        setTouched(step1Fields.reduce((acc, field) => ({ ...acc, [field]: true }), {}));
        return isValid;
    }, [formData, validateField]);

    // ─── Navigation ─────────────────────────────────────────────
    const handleNext = useCallback(() => {
        if (currentStep === 1) {
            if (validateStep1()) {
                setCurrentStep(2);
            }
        } else if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        }
    }, [currentStep, totalSteps, validateStep1]);

    const handleBack = useCallback(() => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        } else {
            router.back();
        }
    }, [currentStep, router]);

    // ─── Menu Actions ───────────────────────────────────────────
    const toggleMenuItem = useCallback((item: MenuItem) => {
        if (selectedItems.includes(item.id)) {
            setSelectedItems(prev => prev.filter(id => id !== item.id));
            setSelectedItemsData(prev => prev.filter(i => i.id !== item.id));
        } else {
            setSelectedItems(prev => [...prev, item.id]);
            setSelectedItemsData(prev => [...prev, item]);
        }
    }, [selectedItems]);

    const handleBulkPaste = useCallback(async () => {
        if (!bulkPasteText.trim()) return;

        const lines = bulkPasteText.split('\n')
            .map(line => line.replace(/^\d+\.\s*/, '').trim())
            .filter(line => line.length > 0);

        if (lines.length === 0) return;

        try {
            const results = await smartMatchMutation.mutateAsync(lines);
            results.forEach(result => {
                if (result.matches.length > 0) {
                    const bestMatch = result.matches[0];
                    const fullItem = menuItems.find(item => item.id === bestMatch.id);
                    if (fullItem && !selectedItems.includes(fullItem.id)) {
                        setSelectedItems(prev => [...prev, fullItem.id]);
                        setSelectedItemsData(prev => [...prev, fullItem]);
                    }
                }
            });
            setShowBulkPasteDialog(false);
            setBulkPasteText('');
        } catch (error) {
            console.error('Smart match failed:', error);
        }
    }, [bulkPasteText, smartMatchMutation, menuItems, selectedItems]);

    const updateServiceQuantity = useCallback((serviceId: string, quantity: number) => {
        setSelectedServices(prev => ({
            ...prev,
            [serviceId]: Math.max(0, quantity),
        }));
    }, []);

    // ─── Helpers ────────────────────────────────────────────────
    const inputClasses = useCallback((fieldName: string) =>
        `pl-10 ${errors[fieldName as keyof FormErrors] && touched[fieldName] ? 'border-red-500 focus-visible:ring-red-500' : ''}`,
        [errors, touched]);

    // Build payload for create/update API
    const buildPayload = useCallback((status?: string) => {
        const items = selectedItemsData.map(item => ({
            menu_item_id: item.id,
            item_name: item.name,
            quantity: tableCount,
            unit_price: typeof item.selling_price === 'string' ? parseFloat(item.selling_price) : item.selling_price,
            total_price: (typeof item.selling_price === 'string' ? parseFloat(item.selling_price) : item.selling_price) * tableCount,
        }));

        const services = [
            ...serviceItems.filter(s => (selectedServices[s.id] || 0) > 0).map(s => ({
                service_name: s.name,
                quantity: selectedServices[s.id] || 0,
                unit_price: s.pricePerUnit,
                total_price: (selectedServices[s.id] || 0) * s.pricePerUnit,
            })),
            ...staffItems.filter(() => staffCount > 0).map(s => ({
                service_name: s.name,
                quantity: staffCount,
                unit_price: s.pricePerUnit,
                total_price: staffCount * s.pricePerUnit,
            })),
        ];

        const formattedEventDate = formData.event_date
            ? `${formData.event_date}T${formData.event_time || '00:00'}:00`
            : undefined;

        const combinedNotes = [formData.notes, selectedQuoteNote]
            .filter(Boolean)
            .join('\n');

        return {
            ...formData,
            event_date: formattedEventDate,
            notes: combinedNotes || undefined,
            guest_count: formData.guest_count ? parseInt(formData.guest_count) : 0,
            table_count: parseInt(formData.table_count),
            total_amount: grandTotal,
            staff_count: staffCount,
            discount_furniture_percent: discountFurniture,
            discount_staff_percent: discountStaff,
            discount_total_percent: discountOrder,
            is_vat_inclusive: includeVat,
            vat_rate: includeVat ? 10 : 0,
            vat_amount: vatAmount,
            ...(status ? { status } : {}),
            items,
            services,
        };
    }, [
        selectedItemsData, selectedServices, staffCount, formData,
        tableCount, grandTotal, vatAmount, discountFurniture, discountStaff,
        discountOrder, includeVat, selectedQuoteNote, serviceItems, staffItems,
    ]);

    return {
        formData, setFormData,
        selectedItems, setSelectedItems,
        selectedItemsData, setSelectedItemsData,
        serviceItems, staffItems,
        selectedServices, setSelectedServices,
        staffCount, setStaffCount,
        discountFurniture, setDiscountFurniture,
        discountStaff, setDiscountStaff,
        discountOrder, setDiscountOrder,
        includeVat, setIncludeVat,
        selectedQuoteNote, setSelectedQuoteNote,
        menuSearchTerm, setMenuSearchTerm,
        selectedCategory, setSelectedCategory,
        showBulkPasteDialog, setShowBulkPasteDialog,
        bulkPasteText, setBulkPasteText,
        collapsedCategories, setCollapsedCategories,
        errors, setErrors,
        touched, setTouched,
        currentStep, setCurrentStep,
        today,
        tableCount,
        menuTotal, menuTotalWithTables,
        profitAnalysis,
        furnitureTotal, staffTotal, serviceTotal,
        furnitureDiscountAmount, staffDiscountAmount, serviceTotalAfterDiscount,
        subtotalBeforeOrderDiscount, orderDiscountAmount, subtotal,
        vatAmount, grandTotal,
        menuItems, menuLoading,
        categories, categoriesLoading,
        foodCategories, foodCategoryIds,
        filteredMenuItems, groupedMenuItems,
        notePresets, notesLoading,
        handleChange, handleBlur,
        validateStep1,
        handleNext, handleBack,
        toggleMenuItem, handleBulkPaste,
        updateServiceQuantity,
        inputClasses,
        buildPayload,
    };
}
