// Zustand store for quote draft — persists across wizard steps
import { create } from 'zustand';

export interface QuoteItemDraft {
    menu_item_id?: string;
    item_name: string;
    description?: string;
    uom?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    note?: string;
    category?: string;
}

interface QuoteDraftState {
    // Step 1: Customer & Event
    customer_id?: string;
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    event_type: string;
    event_date: string;
    event_time: string;
    event_address: string;
    table_count: number;
    guests_per_table: number;
    notes: string;

    // Step 2: Items
    items: QuoteItemDraft[];

    // Step 3: Pricing
    discount_total_percent: number;
    is_vat_inclusive: boolean;
    vat_rate: number;
    valid_until: string;

    // Computed
    subtotal: number;
    discount_amount: number;
    vat_amount: number;
    total_amount: number;

    // Actions
    setCustomerInfo: (info: Partial<QuoteDraftState>) => void;
    addItem: (item: QuoteItemDraft) => void;
    removeItem: (index: number) => void;
    updateItemQuantity: (index: number, qty: number) => void;
    updateItemPrice: (index: number, price: number) => void;
    setPricing: (pricing: Partial<QuoteDraftState>) => void;
    recalculate: () => void;
    reset: () => void;
}

const INITIAL_STATE = {
    customer_id: undefined,
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    event_type: '',
    event_date: '',
    event_time: '',
    event_address: '',
    table_count: 0,
    guests_per_table: 10,
    notes: '',
    items: [] as QuoteItemDraft[],
    discount_total_percent: 0,
    is_vat_inclusive: false,
    vat_rate: 10,
    valid_until: '',
    subtotal: 0,
    discount_amount: 0,
    vat_amount: 0,
    total_amount: 0,
};

function calculateTotals(state: Pick<QuoteDraftState, 'items' | 'discount_total_percent' | 'is_vat_inclusive' | 'vat_rate'>) {
    const subtotal = state.items.reduce((sum, item) => sum + item.total_price, 0);
    const discount_amount = subtotal * (state.discount_total_percent / 100);
    const afterDiscount = subtotal - discount_amount;
    const vat_amount = state.is_vat_inclusive ? afterDiscount * (state.vat_rate / 100) : 0;
    const total_amount = afterDiscount + vat_amount;
    return { subtotal, discount_amount, vat_amount, total_amount };
}

export const useQuoteDraftStore = create<QuoteDraftState>((set, get) => ({
    ...INITIAL_STATE,

    setCustomerInfo: (info) => set((s) => ({ ...s, ...info })),

    addItem: (item) =>
        set((s) => {
            const items = [...s.items, { ...item, total_price: item.quantity * item.unit_price }];
            return { ...s, items, ...calculateTotals({ ...s, items }) };
        }),

    removeItem: (index) =>
        set((s) => {
            const items = s.items.filter((_, i) => i !== index);
            return { ...s, items, ...calculateTotals({ ...s, items }) };
        }),

    updateItemQuantity: (index, qty) =>
        set((s) => {
            const items = s.items.map((item, i) =>
                i === index ? { ...item, quantity: qty, total_price: qty * item.unit_price } : item
            );
            return { ...s, items, ...calculateTotals({ ...s, items }) };
        }),

    updateItemPrice: (index, price) =>
        set((s) => {
            const items = s.items.map((item, i) =>
                i === index ? { ...item, unit_price: price, total_price: item.quantity * price } : item
            );
            return { ...s, items, ...calculateTotals({ ...s, items }) };
        }),

    setPricing: (pricing) =>
        set((s) => {
            const next = { ...s, ...pricing };
            return { ...next, ...calculateTotals(next) };
        }),

    recalculate: () => set((s) => ({ ...s, ...calculateTotals(s) })),

    reset: () => set(INITIAL_STATE),
}));
