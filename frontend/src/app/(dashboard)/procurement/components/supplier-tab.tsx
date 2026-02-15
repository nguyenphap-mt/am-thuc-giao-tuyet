'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Supplier } from '@/types';
import {
    IconSearch, IconPlus, IconEdit, IconTrash, IconBuildingStore,
    IconCheck, IconX, IconStar, IconStarFilled, IconRefresh,
    IconDotsVertical, IconPhone, IconMail, IconWorld,
    IconFileInvoice, IconCreditCard, IconMapPin, IconCategory,
    IconChevronRight, IconChevronLeft, IconExternalLink, IconFilter,
} from '@tabler/icons-react';
import { toast } from 'sonner';

// ============ CONSTANTS ============

const CATEGORIES = [
    { value: 'FOOD', label: 'Thực phẩm' },
    { value: 'BEVERAGE', label: 'Đồ uống' },
    { value: 'EQUIPMENT', label: 'Dụng cụ' },
    { value: 'SERVICE', label: 'Dịch vụ' },
    { value: 'OTHER', label: 'Khác' },
];

const PAYMENT_TERMS = [
    { value: 'IMMEDIATE', label: 'Thanh toán ngay' },
    { value: 'NET15', label: 'NET 15 ngày' },
    { value: 'NET30', label: 'NET 30 ngày' },
    { value: 'NET60', label: 'NET 60 ngày' },
    { value: 'NET90', label: 'NET 90 ngày' },
];

const ACTIVE_FILTERS = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'true', label: 'Hoạt động' },
    { value: 'false', label: 'Ngừng HĐ' },
];

const PO_STATUS_MAP: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Nháp', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
    SENT: { label: 'Đã gửi', color: 'bg-blue-100 text-blue-700' },
    CONFIRMED: { label: 'Xác nhận', color: 'bg-indigo-100 text-indigo-700' },
    RECEIVED: { label: 'Đã nhận', color: 'bg-green-100 text-green-700' },
    PAID: { label: 'Đã TT', color: 'bg-emerald-100 text-emerald-700' },
    CANCELLED: { label: 'Đã hủy', color: 'bg-red-100 text-red-700' },
};

const getCategoryLabel = (val: string) => CATEGORIES.find(c => c.value === val)?.label || val;
const getPaymentTermsLabel = (val: string) => PAYMENT_TERMS.find(p => p.value === val)?.label || val;
const getCategoryColor = (cat: string) => {
    switch (cat) {
        case 'FOOD': return 'bg-orange-100 text-orange-700';
        case 'BEVERAGE': return 'bg-blue-100 text-blue-700';
        case 'EQUIPMENT': return 'bg-purple-100 text-purple-700';
        case 'SERVICE': return 'bg-teal-100 text-teal-700';
        default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
};
const getPoStatus = (status: string) => PO_STATUS_MAP[status] || { label: status, color: 'bg-orange-100 text-orange-700' };

type SupplierStats = {
    total: number;
    active: number;
    inactive: number;
    total_balance: number;
    categories: Record<string, number>;
};

type SupplierListResponse = {
    items: Supplier[];
    total: number;
    skip: number;
    limit: number;
};

type SupplierDetailResponse = {
    supplier: Supplier & { balance: number };
    purchase_orders: Array<{
        id: string;
        code: string;
        status: string;
        total_amount: number;
        paid_amount: number;
        expected_delivery: string | null;
        created_at: string | null;
    }>;
    stats: {
        total_po_count: number;
        total_po_amount: number;
        paid_amount: number;
        outstanding: number;
    };
};

const INITIAL_FORM: Partial<Supplier> = {
    name: '', contact_person: '', phone: '', email: '', address: '',
    tax_id: '', category: 'OTHER', website: '', notes: '',
    is_active: true, payment_terms: 'NET30', bank_account: '', bank_name: '',
};

const PAGE_SIZE = 50;

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    try {
        const date = new Date(d);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch { return '—'; }
};

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}

// ============ MAIN COMPONENT ============

export default function SupplierTab() {
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [starredIds, setStarredIds] = useState<string[]>([]);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [mobileMenuId, setMobileMenuId] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [formOpen, setFormOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Supplier>>(INITIAL_FORM);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [detailId, setDetailId] = useState<string | null>(null);

    const queryClient = useQueryClient();

    useEffect(() => { setPage(0); }, [debouncedSearch, categoryFilter, activeFilter]);

    // ============ QUERIES ============

    const { data: statsData, isLoading: statsLoading } = useQuery<SupplierStats>({
        queryKey: ['supplier-stats'],
        queryFn: () => api.get('/procurement/suppliers/stats'),
    });

    const { data: listData, isLoading, refetch } = useQuery<SupplierListResponse>({
        queryKey: ['suppliers', debouncedSearch, categoryFilter, activeFilter, page],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (debouncedSearch) params.set('search', debouncedSearch);
            if (categoryFilter && categoryFilter !== 'ALL') params.set('category', categoryFilter);
            if (activeFilter && activeFilter !== 'ALL') params.set('is_active', activeFilter);
            params.set('skip', String(page * PAGE_SIZE));
            params.set('limit', String(PAGE_SIZE));
            const qs = params.toString();
            return api.get<SupplierListResponse>(`/procurement/suppliers${qs ? `?${qs}` : ''}`);
        },
    });

    const suppliers = listData?.items || [];
    const totalSuppliers = listData?.total || 0;
    const totalPages = Math.ceil(totalSuppliers / PAGE_SIZE);

    const { data: detailData, isLoading: detailLoading } = useQuery<SupplierDetailResponse>({
        queryKey: ['supplier-detail', detailId],
        queryFn: () => api.get(`/procurement/suppliers/${detailId}`),
        enabled: !!detailId,
    });

    // ============ MUTATIONS ============

    const createMutation = useMutation({
        mutationFn: (data: Partial<Supplier>) => api.post('/procurement/suppliers', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-stats'] });
            toast.success('Thêm NCC thành công');
            closeForm();
        },
        onError: (err: any) => toast.error(err?.response?.data?.detail || 'Không thể tạo NCC'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Supplier> }) =>
            api.put(`/procurement/suppliers/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-stats'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-detail'] });
            toast.success('Cập nhật thành công');
            closeForm();
        },
        onError: (err: any) => toast.error(err?.response?.data?.detail || 'Không thể cập nhật'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/procurement/suppliers/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-stats'] });
            toast.success('Xóa thành công');
            setDeleteId(null);
        },
        onError: () => toast.error('Không thể xóa — NCC có đơn hàng liên kết'),
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            await Promise.all(ids.map(id => api.delete(`/procurement/suppliers/${id}`)));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-stats'] });
            toast.success(`Xóa ${selectedIds.length} NCC thành công`);
            setSelectedIds([]);
            setDeleteId(null);
        },
        onError: () => toast.error('Có lỗi khi xóa — một số NCC có đơn hàng liên kết'),
    });

    // ============ HANDLERS ============

    const closeForm = useCallback(() => {
        setFormOpen(false);
        setFormData(INITIAL_FORM);
        setEditingId(null);
    }, []);

    const openCreate = useCallback(() => {
        setFormData(INITIAL_FORM);
        setEditingId(null);
        setFormOpen(true);
    }, []);

    const openEdit = useCallback((s: Supplier) => {
        setFormData({
            name: s.name, contact_person: s.contact_person || '', phone: s.phone || '',
            email: s.email || '', address: s.address || '', tax_id: s.tax_id || '',
            category: s.category || 'OTHER', website: s.website || '', notes: s.notes || '',
            is_active: s.is_active !== false, payment_terms: s.payment_terms || 'NET30',
            bank_account: s.bank_account || '', bank_name: s.bank_name || '',
        });
        setEditingId(s.id);
        setDetailId(null);
        setTimeout(() => setFormOpen(true), 150);
    }, []);

    const handleSubmit = useCallback(() => {
        if (!formData.name?.trim()) { toast.error('Vui lòng nhập tên NCC'); return; }
        if (formData.name.trim().length > 255) { toast.error('Tên NCC không được quá 255 ký tự'); return; }
        if (formData.email?.trim()) {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(formData.email.trim())) { toast.error('Email không hợp lệ (VD: info@supplier.com)'); return; }
        }
        if (formData.phone?.trim()) {
            const phoneClean = formData.phone.replace(/[\s\-().]/g, '');
            if (!/^\+?\d{8,15}$/.test(phoneClean)) { toast.error('Số điện thoại không hợp lệ (8-15 chữ số)'); return; }
        }
        if (formData.website?.trim()) {
            try { new URL(formData.website.trim().startsWith('http') ? formData.website.trim() : `https://${formData.website.trim()}`); }
            catch { toast.error('Website không hợp lệ (VD: https://supplier.com)'); return; }
        }
        if (editingId) { updateMutation.mutate({ id: editingId, data: formData }); }
        else { createMutation.mutate(formData); }
    }, [formData, editingId, createMutation, updateMutation]);

    const toggleSelect = (id: string) =>
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const toggleSelectAll = () =>
        setSelectedIds(selectedIds.length === suppliers.length ? [] : suppliers.map(s => s.id));

    const toggleStar = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setStarredIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const stats = statsData || { total: 0, active: 0, inactive: 0, total_balance: 0, categories: {} };
    const hasFilters = debouncedSearch || categoryFilter !== 'ALL' || activeFilter !== 'ALL';

    // ============ RENDER ============

    return (
        <div className="space-y-4">
            {/* Stats Cards */}
            <motion.div
                className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            >
                {statsLoading ? (
                    [1, 2, 3, 4].map(i => (
                        <Card key={i}><CardContent className="p-3 md:p-4">
                            <div className="flex items-center gap-2 md:gap-3">
                                <Skeleton className="h-9 w-9 rounded-lg" />
                                <div className="space-y-1.5 flex-1"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-10" /></div>
                            </div>
                        </CardContent></Card>
                    ))
                ) : (
                    [
                        { label: 'Tổng NCC', value: stats.total, icon: IconBuildingStore, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
                        { label: 'Hoạt động', value: stats.active, icon: IconCheck, bgColor: 'bg-green-50', iconColor: 'text-green-600' },
                        { label: 'Ngừng HĐ', value: stats.inactive, icon: IconX, bgColor: 'bg-gray-100 dark:bg-gray-800', iconColor: 'text-gray-600 dark:text-gray-400' },
                        { label: 'Tổng công nợ', value: formatCurrency(stats.total_balance), icon: IconCreditCard, bgColor: 'bg-amber-50', iconColor: 'text-amber-600', isText: true },
                    ].map((stat, i) => (
                        <Card key={i} className="hover:shadow-sm transition-shadow"><CardContent className="p-3 md:p-4">
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className={`p-1.5 md:p-2 rounded-lg ${stat.bgColor}`}>
                                    <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.iconColor}`} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                                    <p className={`font-bold ${'isText' in stat ? 'text-sm' : 'text-base md:text-lg'}`}>{stat.value}</p>
                                </div>
                            </div>
                        </CardContent></Card>
                    ))
                )}
            </motion.div>

            {/* Gmail-style List */}
            <Card className="overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center gap-2 p-2 md:p-3 border-b bg-gray-50 dark:bg-gray-900/50 dark:bg-gray-800/50 flex-wrap">
                    <Checkbox
                        checked={suppliers.length > 0 && selectedIds.length === suppliers.length}
                        onCheckedChange={toggleSelectAll}
                        className="ml-1"
                    />

                    {selectedIds.length > 0 ? (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{selectedIds.length} đã chọn</span>
                            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => setDeleteId('BULK')}>
                                <IconTrash className="h-3.5 w-3.5 mr-1" />Xóa
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedIds([])}>Bỏ chọn</Button>
                        </div>
                    ) : (
                        <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
                                <IconRefresh className="h-4 w-4" />
                            </Button>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue placeholder="Phân loại" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tất cả</SelectItem>
                                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={activeFilter} onValueChange={setActiveFilter}>
                                <SelectTrigger className="h-8 w-[110px] text-xs">
                                    <IconFilter className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ACTIVE_FILTERS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </>
                    )}

                    <div className="flex-1" />
                    <div className="relative w-full max-w-xs sm:w-auto">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <Input placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
                    </div>
                    <Button size="sm" className="h-8 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white" onClick={openCreate}>
                        <IconPlus className="h-4 w-4 mr-1" />Thêm NCC
                    </Button>
                </div>

                {/* Rows */}
                <div className="divide-y">
                    {isLoading ? (
                        <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                    ) : suppliers.length === 0 ? (
                        <div className="text-center py-16">
                            <IconBuildingStore className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                            {hasFilters ? (
                                <>
                                    <p className="mt-4 text-gray-500 dark:text-gray-400">Không tìm thấy NCC phù hợp</p>
                                    <Button variant="outline" className="mt-3" onClick={() => { setSearch(''); setCategoryFilter('ALL'); setActiveFilter('ALL'); }}>
                                        <IconX className="mr-2 h-4 w-4" />Xóa bộ lọc
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <p className="mt-4 text-gray-500 dark:text-gray-400">Chưa có nhà cung cấp</p>
                                    <Button variant="outline" className="mt-3" onClick={openCreate}>
                                        <IconPlus className="mr-2 h-4 w-4" />Thêm NCC đầu tiên
                                    </Button>
                                </>
                            )}
                        </div>
                    ) : (
                        suppliers.map((s) => (
                            <div
                                key={s.id}
                                className={`group flex items-center gap-2 md:gap-4 px-2 md:px-4 py-2 md:py-3 cursor-pointer transition-colors ${selectedIds.includes(s.id) ? 'bg-blue-50' : 'hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900'}`}
                                onMouseEnter={() => setHoveredId(s.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                onClick={() => setDetailId(s.id)}
                            >
                                <Checkbox
                                    checked={selectedIds.includes(s.id)}
                                    onCheckedChange={() => toggleSelect(s.id)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <button onClick={(e) => toggleStar(s.id, e)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 rounded">
                                    {starredIds.includes(s.id) ? <IconStarFilled className="h-4 w-4 text-amber-400" /> : <IconStar className="h-4 w-4 text-gray-400 dark:text-gray-500" />}
                                </button>

                                <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-4">
                                    <div className="w-32 md:w-48 truncate">
                                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{s.name}</span>
                                    </div>
                                    <div className="flex-1 min-w-0 flex items-center gap-2">
                                        <Badge className={`${getCategoryColor(s.category)} text-xs px-1.5 py-0.5 shrink-0 border-0`}>
                                            {getCategoryLabel(s.category)}
                                        </Badge>
                                        <Badge className={`${s.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'} text-xs px-1.5 py-0.5 shrink-0 border-0`}>
                                            {s.is_active !== false ? 'HĐ' : 'Ngừng'}
                                        </Badge>
                                        <span className="text-sm text-gray-500 dark:text-gray-400 truncate hidden sm:inline">{s.contact_person}</span>
                                    </div>
                                    <div className="text-right shrink-0 hidden md:block">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">{s.phone}</span>
                                    </div>
                                </div>

                                {/* Desktop hover actions */}
                                <div className={`flex items-center gap-0.5 shrink-0 ${hoveredId === s.id ? 'opacity-100' : 'opacity-0'} transition-opacity hidden md:flex`}>
                                    {s.phone && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); window.open(`tel:${s.phone}`); }} title="Gọi điện">
                                            <IconPhone className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {s.email && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); window.open(`mailto:${s.email}`); }} title="Gửi email">
                                            <IconMail className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(s); }} title="Sửa">
                                        <IconEdit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }} title="Xóa">
                                        <IconTrash className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                                <IconChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 shrink-0 hidden md:block" />

                                {/* Mobile menu */}
                                <div className="relative md:hidden">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setMobileMenuId(mobileMenuId === s.id ? null : s.id); }}>
                                        <IconDotsVertical className="h-4 w-4" />
                                    </Button>
                                    {mobileMenuId === s.id && (
                                        <div className="absolute right-0 top-8 z-50 bg-white rounded-lg shadow-lg border py-1 min-w-[140px]">
                                            {s.phone && <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900" onClick={(e) => { e.stopPropagation(); window.open(`tel:${s.phone}`); setMobileMenuId(null); }}><IconPhone className="h-4 w-4" />Gọi điện</button>}
                                            {s.email && <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900" onClick={(e) => { e.stopPropagation(); window.open(`mailto:${s.email}`); setMobileMenuId(null); }}><IconMail className="h-4 w-4" />Gửi email</button>}
                                            <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900" onClick={(e) => { e.stopPropagation(); openEdit(s); setMobileMenuId(null); }}><IconEdit className="h-4 w-4" />Chỉnh sửa</button>
                                            <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); setMobileMenuId(null); }}><IconTrash className="h-4 w-4" />Xóa</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination footer */}
                {(suppliers.length > 0 || totalPages > 1) && (
                    <div className="flex items-center justify-between p-3 border-t bg-gray-50 dark:bg-gray-900/50 dark:bg-gray-800/50 text-sm text-gray-500 dark:text-gray-400">
                        <span>{selectedIds.length > 0 ? `${selectedIds.length} đã chọn` : `${totalSuppliers} NCC`}</span>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
                                    <IconChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-xs px-2">{page + 1} / {totalPages}</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}>
                                    <IconChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* ============ CREATE/EDIT FORM DIALOG ============ */}
            <Dialog open={formOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Chỉnh sửa NCC' : 'Thêm nhà cung cấp mới'}</DialogTitle>
                        <DialogDescription>{editingId ? 'Cập nhật thông tin nhà cung cấp' : 'Nhập thông tin nhà cung cấp'}</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="s-name">Tên NCC <span className="text-red-500">*</span></Label>
                                <Input id="s-name" value={formData.name || ''} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="VD: Công ty TNHH Thực phẩm Sạch" />
                            </div>
                            <div className="space-y-2">
                                <Label>Phân loại</Label>
                                <Select value={formData.category || 'OTHER'} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="s-contact">Người liên hệ</Label>
                                <Input id="s-contact" value={formData.contact_person || ''} onChange={e => setFormData(p => ({ ...p, contact_person: e.target.value }))} placeholder="VD: Nguyễn Văn A" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="s-phone">Số điện thoại</Label>
                                <Input id="s-phone" value={formData.phone || ''} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="VD: 0912 345 678" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="s-email">Email</Label>
                                <Input id="s-email" type="email" value={formData.email || ''} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="VD: info@supplier.com" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="s-website">Website</Label>
                                <Input id="s-website" value={formData.website || ''} onChange={e => setFormData(p => ({ ...p, website: e.target.value }))} placeholder="VD: https://supplier.com" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="s-taxid">Mã số thuế</Label>
                                <Input id="s-taxid" value={formData.tax_id || ''} onChange={e => setFormData(p => ({ ...p, tax_id: e.target.value }))} placeholder="VD: 0123456789" />
                            </div>
                            <div className="space-y-2">
                                <Label>Điều khoản thanh toán</Label>
                                <Select value={formData.payment_terms || 'NET30'} onValueChange={v => setFormData(p => ({ ...p, payment_terms: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{PAYMENT_TERMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="s-bank-acc">Số tài khoản ngân hàng</Label>
                                <Input id="s-bank-acc" value={formData.bank_account || ''} onChange={e => setFormData(p => ({ ...p, bank_account: e.target.value }))} placeholder="VD: 1234567890" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="s-bank-name">Ngân hàng</Label>
                                <Input id="s-bank-name" value={formData.bank_name || ''} onChange={e => setFormData(p => ({ ...p, bank_name: e.target.value }))} placeholder="VD: Vietcombank" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="s-address">Địa chỉ</Label>
                            <Textarea id="s-address" value={formData.address || ''} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="VD: 123 Nguyễn Huệ, Q1, TP.HCM" rows={2} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="s-notes">Ghi chú</Label>
                            <Textarea id="s-notes" value={formData.notes || ''} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Ghi chú thêm về nhà cung cấp..." rows={2} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="s-active">Trạng thái hoạt động</Label>
                            <Switch id="s-active" checked={formData.is_active !== false} onCheckedChange={v => setFormData(p => ({ ...p, is_active: v }))} />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={closeForm}>Hủy</Button>
                        <Button className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                            {createMutation.isPending || updateMutation.isPending ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Tạo mới')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DELETE CONFIRMATION ============ */}
            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa</DialogTitle>
                        <DialogDescription>
                            {deleteId === 'BULK'
                                ? `Bạn có chắc chắn muốn xóa ${selectedIds.length} nhà cung cấp đã chọn? Hành động không thể hoàn tác.`
                                : 'Bạn có chắc chắn muốn xóa nhà cung cấp này? Hành động không thể hoàn tác.'
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Hủy</Button>
                        <Button variant="destructive" onClick={() => {
                            if (deleteId === 'BULK') { bulkDeleteMutation.mutate(selectedIds); }
                            else if (deleteId) { deleteMutation.mutate(deleteId); }
                        }} disabled={deleteMutation.isPending || bulkDeleteMutation.isPending}>
                            {deleteMutation.isPending || bulkDeleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DETAIL DRAWER ============ */}
            <Sheet open={!!detailId} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>{detailData?.supplier?.name || 'Chi tiết NCC'}</SheetTitle>
                        <SheetDescription>Thông tin chi tiết và lịch sử giao dịch</SheetDescription>
                    </SheetHeader>

                    {detailLoading ? (
                        <div className="space-y-4 pt-6"><Skeleton className="h-20 w-full" /><Skeleton className="h-40 w-full" /></div>
                    ) : detailData ? (
                        <Tabs defaultValue="info" className="mt-4">
                            <TabsList className="w-full">
                                <TabsTrigger value="info" className="flex-1">Thông tin</TabsTrigger>
                                <TabsTrigger value="orders" className="flex-1">Đơn hàng ({detailData.stats.total_po_count})</TabsTrigger>
                            </TabsList>

                            <TabsContent value="info" className="space-y-4 mt-4">
                                {/* Quick Stats */}
                                <div className="grid grid-cols-2 gap-3">
                                    <Card><CardContent className="p-3"><p className="text-xs text-gray-500 dark:text-gray-400">Tổng PO</p><p className="text-lg font-bold">{detailData.stats.total_po_count}</p></CardContent></Card>
                                    <Card><CardContent className="p-3"><p className="text-xs text-gray-500 dark:text-gray-400">Tổng giá trị</p><p className="text-lg font-bold">{formatCurrency(detailData.stats.total_po_amount)}</p></CardContent></Card>
                                    <Card><CardContent className="p-3"><p className="text-xs text-gray-500 dark:text-gray-400">Đã thanh toán</p><p className="text-lg font-bold text-green-600">{formatCurrency(detailData.stats.paid_amount)}</p></CardContent></Card>
                                    <Card><CardContent className="p-3"><p className="text-xs text-gray-500 dark:text-gray-400">Còn nợ</p><p className="text-lg font-bold text-red-600">{formatCurrency(detailData.stats.outstanding)}</p></CardContent></Card>
                                </div>

                                {/* Contact Info */}
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Thông tin liên hệ</h3>
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-2.5">
                                        {detailData.supplier.contact_person && <div className="flex items-center gap-2 text-sm"><IconBuildingStore className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" /><span>{detailData.supplier.contact_person}</span></div>}
                                        {detailData.supplier.phone && <div className="flex items-center gap-2 text-sm"><IconPhone className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" /><a href={`tel:${detailData.supplier.phone}`} className="text-blue-600 hover:underline">{detailData.supplier.phone}</a></div>}
                                        {detailData.supplier.email && <div className="flex items-center gap-2 text-sm"><IconMail className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" /><a href={`mailto:${detailData.supplier.email}`} className="text-blue-600 hover:underline">{detailData.supplier.email}</a></div>}
                                        {detailData.supplier.website && <div className="flex items-center gap-2 text-sm"><IconWorld className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" /><a href={detailData.supplier.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">{detailData.supplier.website} <IconExternalLink className="h-3 w-3" /></a></div>}
                                        {detailData.supplier.address && <div className="flex items-center gap-2 text-sm"><IconMapPin className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" /><span>{detailData.supplier.address}</span></div>}
                                    </div>
                                </div>

                                {/* Business Info */}
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Thông tin kinh doanh</h3>
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-2.5">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2"><IconCategory className="h-4 w-4" /> Phân loại</span>
                                            <Badge className={`${getCategoryColor(detailData.supplier.category)} border-0`}>{getCategoryLabel(detailData.supplier.category)}</Badge>
                                        </div>
                                        {detailData.supplier.tax_id && <div className="flex items-center justify-between text-sm"><span className="text-gray-500 dark:text-gray-400 flex items-center gap-2"><IconFileInvoice className="h-4 w-4" /> MST</span><span className="font-mono">{detailData.supplier.tax_id}</span></div>}
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2"><IconCreditCard className="h-4 w-4" /> Thanh toán</span>
                                            <span>{getPaymentTermsLabel(detailData.supplier.payment_terms)}</span>
                                        </div>
                                        {detailData.supplier.bank_name && <div className="flex items-center justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Ngân hàng</span><span>{detailData.supplier.bank_name}</span></div>}
                                        {detailData.supplier.bank_account && <div className="flex items-center justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">STK</span><span className="font-mono">{detailData.supplier.bank_account}</span></div>}
                                    </div>
                                </div>

                                {detailData.supplier.notes && (
                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Ghi chú</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">{detailData.supplier.notes}</p>
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                    <Button variant="outline" className="flex-1" onClick={() => {
                                        const s = suppliers.find(x => x.id === detailId);
                                        if (s) openEdit(s);
                                    }}>
                                        <IconEdit className="mr-2 h-4 w-4" /> Chỉnh sửa
                                    </Button>
                                    <Button variant="destructive" size="icon" onClick={() => { setDetailId(null); if (detailId) setDeleteId(detailId); }}>
                                        <IconTrash className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="orders" className="mt-4">
                                {detailData.purchase_orders.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                        <IconFileInvoice className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                                        <p>Chưa có đơn hàng với NCC này</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {detailData.purchase_orders.map((po) => {
                                            const poStatus = getPoStatus(po.status);
                                            return (
                                                <Card key={po.id} className="hover:shadow-sm transition-shadow">
                                                    <CardContent className="p-3">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="font-medium text-sm">{po.code}</p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(po.created_at)}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <Badge className={`border-0 text-xs ${poStatus.color}`}>{poStatus.label}</Badge>
                                                                <p className="text-sm font-semibold mt-1">{formatCurrency(po.total_amount)}</p>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    ) : null}
                </SheetContent>
            </Sheet>
        </div>
    );
}
