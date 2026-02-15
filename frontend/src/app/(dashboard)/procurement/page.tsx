'use client';



import { PermissionGate } from '@/components/shared/PermissionGate';



import { useState, useEffect, useMemo } from 'react';

import { motion } from 'framer-motion';

import { useReportExport, type ExportFormat, type ExportConfig } from '@/hooks/use-report-export';

import { ExportDialog } from '@/components/analytics/export-dialog';

import type { ReportSheet, KpiCard, ColumnDef } from '@/lib/excel-report-engine';

import { useRouter } from 'next/navigation';

import { useTabPersistence } from '@/hooks/useTabPersistence';

import { Button } from '@/components/ui/button';

import { Card, CardContent } from '@/components/ui/card';

import { Input } from '@/components/ui/input';

import { Badge } from '@/components/ui/badge';

import { Skeleton } from '@/components/ui/skeleton';

import { Checkbox } from '@/components/ui/checkbox';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Label } from '@/components/ui/label';

import { Textarea } from '@/components/ui/textarea';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import {

    IconSearch, IconPlus, IconEdit, IconTrash, IconShoppingCart, IconFileInvoice,

    IconChartBar, IconRefresh, IconStar, IconStarFilled,

    IconCheck, IconX, IconClock, IconTruck, IconCash, IconClipboardList,

    IconArrowRight, IconEye, IconSend, IconPackage, IconUsers, IconPhone, IconMapPin,

    IconDownload,

} from '@tabler/icons-react';

import { toast } from 'sonner';

import {

    usePurchaseOrders, useCreatePO, useUpdatePOStatus, useDeletePO,

    usePurchaseRequisitions, useCreatePR, useApprovePR, useRejectPR, useConvertPRtoPO, useDeletePR,

    useProcurementStats, useSuppliers,

    PurchaseOrder, PurchaseRequisition, Supplier,

} from '@/hooks/use-procurement';

import SupplierTab from './components/supplier-tab';

import CreatePOModal from './components/create-po-modal';

import CreatePRModal from './components/create-pr-modal';

import PRDetailDrawer from './components/pr-detail-drawer';



// ========== STATUS HELPERS ==========



const PO_STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; icon: React.ElementType }> = {

    'DRAFT': { label: 'Nháp', color: 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700', dot: 'bg-gray-400', icon: IconEdit },

    'SENT': { label: 'Đã gửi', color: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-500', icon: IconSend },

    'RECEIVED': { label: 'Đã nhận', color: 'bg-green-50 text-green-700 border border-green-200', dot: 'bg-green-500', icon: IconPackage },

    'PAID': { label: 'Đã TT', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500', icon: IconCash },

};



const PR_STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {

    'PENDING': { label: 'Chờ duyệt', color: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500' },

    'APPROVED': { label: 'Đã duyệt', color: 'bg-green-50 text-green-700 border border-green-200', dot: 'bg-green-500' },

    'REJECTED': { label: 'Từ chối', color: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-500' },

    'CONVERTED': { label: 'Đã chuyển PO', color: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-500' },

};



const PR_PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {

    'LOW': { label: 'Thấp', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },

    'NORMAL': { label: 'Bình thường', color: 'bg-blue-100 text-blue-600' },

    'HIGH': { label: 'Cao', color: 'bg-orange-100 text-orange-600' },

    'URGENT': { label: 'Khẩn cấp', color: 'bg-red-100 text-red-600' },

};



function formatCurrency(amount: number) {

    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

}



function formatDate(dateStr?: string) {

    if (!dateStr) return '—';

    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

}



// ========== MAIN PAGE ==========



const PROCUREMENT_TABS = ['orders', 'requisitions', 'suppliers', 'analytics'] as const;



export default function ProcurementPage() {

    const router = useRouter();

    const { activeTab, handleTabChange: setActiveTab } = useTabPersistence(PROCUREMENT_TABS, 'orders');

    const [search, setSearch] = useState('');

    const [statusFilter, setStatusFilter] = useState<string>('');

    const [exportOpen, setExportOpen] = useState(false);

    const { isExporting, exportData } = useReportExport();

    const [prStatusFilter, setPrStatusFilter] = useState<string>('');



    // PO State

    const [showCreatePO, setShowCreatePO] = useState(false);

    const [deletePOId, setDeletePOId] = useState<string | null>(null);

    const [hoveredPOId, setHoveredPOId] = useState<string | null>(null);

    const [selectedPOs, setSelectedPOs] = useState<string[]>([]);

    const [starredPOs, setStarredPOs] = useState<string[]>([]);



    // PR State

    const [showCreatePR, setShowCreatePR] = useState(false);

    const [deletePRId, setDeletePRId] = useState<string | null>(null);

    const [hoveredPRId, setHoveredPRId] = useState<string | null>(null);

    const [convertPRId, setConvertPRId] = useState<string | null>(null);

    const [convertSupplierId, setConvertSupplierId] = useState('');

    const [selectedPRId, setSelectedPRId] = useState<string | null>(null);



    // Supplier data (for PO creation & PR conversion dropdowns only)



    // Data

    const { data: stats, isLoading: statsLoading } = useProcurementStats();

    const { data: orders, isLoading: ordersLoading, refetch: refetchOrders } = usePurchaseOrders(statusFilter || undefined);

    const { data: requisitions, isLoading: prsLoading, refetch: refetchPRs } = usePurchaseRequisitions(prStatusFilter || undefined);

    const { data: suppliers, isLoading: suppliersLoading, refetch: refetchSuppliers } = useSuppliers();



    // Mutations

    const createPO = useCreatePO();

    const updatePOStatus = useUpdatePOStatus();

    const deletePOMut = useDeletePO();

    const createPR = useCreatePR();

    const approvePR = useApprovePR();

    const rejectPR = useRejectPR();

    const convertPRtoPO = useConvertPRtoPO();

    const deletePRMut = useDeletePR();

    // Filter POs by search (H3: memoized)

    const filteredOrders = useMemo(() => (orders || []).filter(o =>

        !search || o.code?.toLowerCase().includes(search.toLowerCase()) ||

        o.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||

        o.note?.toLowerCase().includes(search.toLowerCase())

    ), [orders, search]);



    // Filter PRs by search (H3: memoized)

    const filteredPRs = useMemo(() => (requisitions || []).filter(pr =>

        !search || pr.code?.toLowerCase().includes(search.toLowerCase()) ||

        pr.title?.toLowerCase().includes(search.toLowerCase())

    ), [requisitions, search]);



    const togglePOSelect = (id: string) => setSelectedPOs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const togglePOStar = (id: string, e: React.MouseEvent) => { e.stopPropagation(); setStarredPOs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };



    // ========== STATUS FILTER BAR (H3: memoized) ==========

    const statusFilters = useMemo(() => [

        { value: '', label: 'Tất cả', count: stats?.total_orders || 0 },

        { value: 'DRAFT', label: 'Nháp', count: stats?.draft_count || 0 },

        { value: 'SENT', label: 'Đã gửi', count: stats?.sent_count || 0 },

        { value: 'RECEIVED', label: 'Đã nhận', count: stats?.received_count || 0 },

        { value: 'PAID', label: 'Đã TT', count: stats?.paid_count || 0 },

    ], [stats]);



    // ========== PROFESSIONAL EXPORT CONFIG ==========

    const colDef = (key: string, header: string, opts: Partial<ColumnDef> = {}): ColumnDef => ({

        key, header, format: 'text', ...opts,

    });



    const procExportConfig = useMemo((): ExportConfig => {

        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');



        const kpiCards: KpiCard[] = [

            { label: 'TỔNG ĐƠN MUA', value: stats?.total_orders || 0, format: 'number', trend: 0, trendLabel: '', bgColor: 'E3F2FD', valueColor: '1565C0', icon: '🛒' },

            { label: 'TỔNG GIÁ TRỊ', value: stats?.total_amount || 0, format: 'currency', trend: 0, trendLabel: '', bgColor: 'E8F5E9', valueColor: '1B7D3A', icon: '💰' },

            { label: 'CHỜ DUYỆT (PR)', value: stats?.pending_prs || 0, format: 'number', trend: 0, trendLabel: '', bgColor: 'FFF3E0', valueColor: 'E65100', icon: '⏳' },

            { label: 'NHÀ CUNG CẤP', value: stats?.supplier_count || 0, format: 'number', trend: 0, trendLabel: '', bgColor: 'F3E5F5', valueColor: '7B1FA2', icon: '🚚' },

        ];



        const allOrders = orders || [];

        const dataRows = allOrders.map(o => {

            const statusCfg = PO_STATUS_CONFIG[o.status] || PO_STATUS_CONFIG['DRAFT'];

            return {

                code: o.code || '',

                supplier_name: o.supplier?.name || 'Chưa chọn NCC',

                total_amount: o.total_amount || 0,

                status: statusCfg.label,

                created_at: formatDate(o.created_at),

                expected_delivery: formatDate(o.expected_delivery),

                note: o.note || '',

            };

        });



        const sheets: ReportSheet[] = [{

            name: 'Đơn mua hàng',

            title: 'Báo cáo Đơn mua hàng',

            subtitle: `Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}`,

            kpiCards,

            columns: [

                colDef('code', 'Mã PO', { width: 14 }),

                colDef('supplier_name', 'Nhà cung cấp', { width: 24 }),

                colDef('total_amount', 'Giá trị', { format: 'currency', width: 20, summaryFn: 'sum' }),

                colDef('status', 'Trạng thái', { format: 'status', width: 14 }),

                colDef('created_at', 'Ngày tạo', { width: 14 }),

                colDef('expected_delivery', 'Ngày giao DK', { width: 14 }),

                colDef('note', 'Ghi chú', { width: 24 }),

            ],

            data: dataRows,

            summaryRow: true,

        }];



        return {

            title: 'Báo cáo Mua hàng',

            columns: [

                { key: 'code', header: 'Mã PO' },

                { key: 'supplier_name', header: 'Nhà cung cấp' },

                { key: 'total_amount', header: 'Giá trị', format: (v) => formatCurrency(v as number) },

                { key: 'status', header: 'Trạng thái' },

                { key: 'created_at', header: 'Ngày tạo' },

                { key: 'expected_delivery', header: 'Ngày giao DK' },

                { key: 'note', header: 'Ghi chú' },

            ],

            data: dataRows,

            filename: `bao-cao-mua-hang_${today}`,

            sheets,

        };

    }, [orders, stats]);



    const handleProcExport = async (format: ExportFormat, filename: string) => {

        const config = { ...procExportConfig, filename };

        await exportData(format, config);

    };



    return (

        <div className="space-y-4">

            {/* Header */}

            <motion.div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>

                <div>

                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Mua hàng</h1>

                    <p className="text-sm text-gray-500 dark:text-gray-400">Quản lý đơn mua hàng, yêu cầu mua & phân tích</p>

                </div>

                <div className="flex gap-2">

                    <Button

                        variant="outline"

                        size="sm"

                        onClick={() => setExportOpen(true)}

                        className="gap-1.5 border-gray-300 hover:border-[#c2185b] hover:text-[#c2185b] transition-colors"

                    >

                        <IconDownload className="h-4 w-4" />

                        <span className="hidden sm:inline">Xuất báo cáo</span>

                    </Button>

                    {activeTab === 'orders' && (

                        <PermissionGate module="procurement" action="create">

                            <Button className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white" onClick={() => setShowCreatePO(true)}>

                                <IconPlus className="mr-2 h-4 w-4" />Tạo đơn mua

                            </Button>

                        </PermissionGate>

                    )}

                    {activeTab === 'requisitions' && (

                        <PermissionGate module="procurement" action="create">

                            <Button className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white" onClick={() => setShowCreatePR(true)}>

                                <IconPlus className="mr-2 h-4 w-4" />Tạo yêu cầu

                            </Button>

                        </PermissionGate>

                    )}

                </div>

            </motion.div>



            {/* Stats Cards  */}

            <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>

                {[

                    { label: 'Tổng đơn mua', value: stats?.total_orders || 0, icon: IconShoppingCart, gradient: 'from-blue-500 to-blue-600', ring: 'ring-blue-200', bgGlow: 'shadow-blue-100' },

                    { label: 'Tổng giá trị', value: formatCurrency(stats?.total_amount || 0), icon: IconCash, gradient: 'from-emerald-500 to-emerald-600', ring: 'ring-emerald-200', bgGlow: 'shadow-emerald-100' },

                    { label: 'Chờ duyệt (PR)', value: stats?.pending_prs || 0, icon: IconClock, gradient: 'from-amber-500 to-orange-500', ring: 'ring-amber-200', bgGlow: 'shadow-amber-100' },

                    { label: 'Nhà cung cấp', value: stats?.supplier_count || 0, icon: IconTruck, gradient: 'from-purple-500 to-indigo-500', ring: 'ring-purple-200', bgGlow: 'shadow-purple-100' },

                ].map((stat, i) => (

                    <motion.div key={i} whileHover={{ scale: 1.02 }} transition={{ duration: 0.15 }}>

                        <Card className={`hover:shadow-md transition-all duration-200 ${stat.bgGlow}`}>

                            <CardContent className="p-3 md:p-4">

                                <div className="flex items-center gap-2 md:gap-3">

                                    <div className={`p-2 md:p-2.5 rounded-xl bg-gradient-to-br ${stat.gradient} ring-2 ${stat.ring} ring-offset-1`}>

                                        <stat.icon className="h-4 w-4 md:h-5 md:w-5 text-white" />

                                    </div>

                                    <div className="min-w-0">

                                        <p className="text-[11px] md:text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider truncate">{stat.label}</p>

                                        <p className="text-sm md:text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</p>

                                    </div>

                                </div>

                            </CardContent>

                        </Card>

                    </motion.div>

                ))}

            </motion.div>



            {/* Tabs */}

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

                    <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">

                        <TabsTrigger value="orders" className="gap-2"><IconShoppingCart className="h-4 w-4" /><span className="hidden sm:inline">Đơn mua hàng</span></TabsTrigger>

                        <TabsTrigger value="requisitions" className="gap-2"><IconClipboardList className="h-4 w-4" /><span className="hidden sm:inline">Yêu cầu mua</span></TabsTrigger>

                        <TabsTrigger value="suppliers" className="gap-2"><IconUsers className="h-4 w-4" /><span className="hidden sm:inline">Nhà cung cấp</span></TabsTrigger>

                        <TabsTrigger value="analytics" className="gap-2"><IconChartBar className="h-4 w-4" /><span className="hidden sm:inline">Phân tích</span></TabsTrigger>

                    </TabsList>



                    {/* ========== TAB 1: PURCHASE ORDERS ========== */}

                    <TabsContent value="orders" className="mt-4">

                        {/* Status Filter Bar */}

                        <div className="flex flex-wrap gap-1.5 mb-3">

                            {statusFilters.map(f => (

                                <button key={f.value} onClick={() => setStatusFilter(f.value)}

                                    className={`px-3 py-1 text-xs rounded-full transition-all ${statusFilter === f.value ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700'}`}>

                                    {f.label} ({f.count})

                                </button>

                            ))}

                        </div>



                        <Card className="overflow-hidden">

                            {/* Toolbar */}

                            <div className="flex items-center gap-2 p-2 md:p-3 border-b bg-gray-50 dark:bg-gray-900/50 dark:bg-gray-800/50">

                                <Checkbox

                                    checked={filteredOrders.length > 0 && selectedPOs.length === filteredOrders.length}

                                    onCheckedChange={() => setSelectedPOs(selectedPOs.length === filteredOrders.length ? [] : filteredOrders.map(o => o.id))}

                                    className="ml-1"

                                />

                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetchOrders()}><IconRefresh className="h-4 w-4" /></Button>

                                <div className="flex-1" />

                                <div className="relative w-full max-w-xs">

                                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />

                                    <Input placeholder="Tìm theo mã PO, NCC..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />

                                </div>

                            </div>



                            {/* PO List */}

                            <div className="divide-y">

                                {ordersLoading ? (

                                    <div className="p-4 space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>

                                ) : filteredOrders.length === 0 ? (

                                    <div className="text-center py-16">

                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 mb-4">

                                            <IconShoppingCart className="h-8 w-8 text-blue-400" />

                                        </div>

                                        <p className="text-gray-500 dark:text-gray-400 font-medium">Chưa có đơn mua hàng</p>

                                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Tạo đơn mua hàng đầu tiên để bắt đầu quản lý</p>

                                        <PermissionGate module="procurement" action="create">

                                            <Button className="mt-4 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white" onClick={() => setShowCreatePO(true)}><IconPlus className="mr-2 h-4 w-4" />Tạo đơn đầu tiên</Button>

                                        </PermissionGate>

                                    </div>

                                ) : filteredOrders.map((order: PurchaseOrder) => {

                                    const statusCfg = PO_STATUS_CONFIG[order.status] || PO_STATUS_CONFIG['DRAFT'];

                                    return (

                                        <div key={order.id}

                                            className={`flex items-center gap-2 md:gap-4 px-2 md:px-4 py-2 md:py-3 cursor-pointer transition-colors ${selectedPOs.includes(order.id) ? 'bg-blue-50' : 'hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800'}`}

                                            onMouseEnter={() => setHoveredPOId(order.id)}

                                            onMouseLeave={() => setHoveredPOId(null)}

                                            onClick={() => router.push(`/procurement/${order.id}`)}

                                        >

                                            <Checkbox checked={selectedPOs.includes(order.id)} onCheckedChange={() => togglePOSelect(order.id)} onClick={e => e.stopPropagation()} />

                                            <button onClick={e => togglePOStar(order.id, e)} className="p-1 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded">

                                                {starredPOs.includes(order.id) ? <IconStarFilled className="h-4 w-4 text-amber-400" /> : <IconStar className="h-4 w-4 text-gray-400 dark:text-gray-500" />}

                                            </button>



                                            <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-4">

                                                <div className="w-24 md:w-32 shrink-0">

                                                    <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{order.code}</span>

                                                </div>

                                                <div className="flex-1 min-w-0 flex items-center gap-2">

                                                    <Badge className={`${statusCfg.color} text-xs px-1.5 py-0.5 shrink-0 gap-1`}><span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />{statusCfg.label}</Badge>

                                                    <span className="text-sm text-gray-500 dark:text-gray-400 truncate hidden sm:inline">{order.supplier?.name || 'Chưa chọn NCC'}</span>

                                                </div>

                                                <div className="text-right shrink-0 hidden md:block">

                                                    <span className="text-sm font-medium tabular-nums">{formatCurrency(order.total_amount || 0)}</span>

                                                </div>

                                                <div className="text-right shrink-0 hidden lg:block w-24">

                                                    <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(order.created_at)}</span>

                                                </div>

                                            </div>



                                            {/* Hover actions */}

                                            <div className={`flex items-center gap-0.5 shrink-0 ${hoveredPOId === order.id ? 'opacity-100' : 'opacity-0'} transition-opacity`}>

                                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Xem chi tiết" onClick={e => { e.stopPropagation(); router.push(`/procurement/${order.id}`); }}><IconEye className="h-4 w-4" /></Button>

                                                {order.status === 'DRAFT' && (

                                                    <PermissionGate module="procurement" action="edit">

                                                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Gửi đơn" onClick={e => { e.stopPropagation(); updatePOStatus.mutate({ id: order.id, status: 'SENT' }); }}><IconSend className="h-4 w-4 text-blue-500" /></Button>

                                                    </PermissionGate>

                                                )}

                                                <PermissionGate module="procurement" action="delete">

                                                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Xóa" onClick={e => { e.stopPropagation(); setDeletePOId(order.id); }}><IconTrash className="h-4 w-4 text-red-500" /></Button>

                                                </PermissionGate>

                                            </div>

                                        </div>

                                    );

                                })}

                            </div>



                            {filteredOrders.length > 0 && (

                                <div className="flex items-center justify-between p-3 border-t bg-gray-50 dark:bg-gray-900/50 dark:bg-gray-800/50 text-sm text-gray-500 dark:text-gray-400">

                                    <span>{selectedPOs.length > 0 ? `${selectedPOs.length} đã chọn` : `${filteredOrders.length} đơn mua`}</span>

                                </div>

                            )}

                        </Card>

                    </TabsContent>



                    {/* ========== TAB 2: PURCHASE REQUISITIONS ========== */}

                    <TabsContent value="requisitions" className="mt-4">

                        {/* PR Status Filter Bar */}

                        <div className="flex flex-wrap gap-1.5 mb-3">

                            {[

                                { value: '', label: 'Tất cả' },

                                { value: 'PENDING', label: 'Chờ duyệt' },

                                { value: 'APPROVED', label: 'Đã duyệt' },

                                { value: 'REJECTED', label: 'Từ chối' },

                                { value: 'CONVERTED', label: 'Đã chuyển PO' },

                            ].map(f => (

                                <button key={f.value} onClick={() => setPrStatusFilter(f.value)}

                                    className={`px-3 py-1 text-xs rounded-full transition-all ${prStatusFilter === f.value ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700'}`}>

                                    {f.label}

                                </button>

                            ))}

                        </div>

                        <Card className="overflow-hidden">

                            <div className="flex items-center gap-2 p-2 md:p-3 border-b bg-gray-50 dark:bg-gray-900/50 dark:bg-gray-800/50">

                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetchPRs()}><IconRefresh className="h-4 w-4" /></Button>

                                <div className="flex-1" />

                                <div className="relative w-full max-w-xs">

                                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />

                                    <Input placeholder="Tìm theo mã PR, tiêu đề..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />

                                </div>

                            </div>



                            <div className="divide-y">

                                {prsLoading ? (

                                    <div className="p-4 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>

                                ) : filteredPRs.length === 0 ? (

                                    <div className="text-center py-16">

                                        <IconClipboardList className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />

                                        <p className="mt-4 text-gray-500 dark:text-gray-400">Chưa có yêu cầu mua hàng</p>

                                        <PermissionGate module="procurement" action="create">

                                            <Button className="mt-4" variant="outline" onClick={() => setShowCreatePR(true)}><IconPlus className="mr-2 h-4 w-4" />Tạo yêu cầu đầu tiên</Button>

                                        </PermissionGate>

                                    </div>

                                ) : filteredPRs.map((pr: PurchaseRequisition) => {

                                    const statusCfg = PR_STATUS_CONFIG[pr.status] || PR_STATUS_CONFIG['PENDING'];

                                    const priorityCfg = PR_PRIORITY_CONFIG[pr.priority] || PR_PRIORITY_CONFIG['NORMAL'];

                                    return (

                                        <div key={pr.id}

                                            className="flex items-center gap-2 md:gap-4 px-2 md:px-4 py-2 md:py-3 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 transition-colors cursor-pointer"

                                            onClick={() => setSelectedPRId(pr.id)}

                                            onMouseEnter={() => setHoveredPRId(pr.id)}

                                            onMouseLeave={() => setHoveredPRId(null)}

                                        >

                                            <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-4">

                                                <div className="w-28 md:w-36 shrink-0">

                                                    <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{pr.code}</span>

                                                </div>

                                                <div className="flex-1 min-w-0 flex items-center gap-2">

                                                    <Badge className={`${statusCfg.color} text-xs px-1.5 py-0.5 shrink-0`}>{statusCfg.label}</Badge>

                                                    <Badge className={`${priorityCfg.color} text-xs px-1.5 py-0.5 shrink-0`}>{priorityCfg.label}</Badge>

                                                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{pr.title}</span>

                                                </div>

                                                <div className="text-right shrink-0 hidden md:block">

                                                    <span className="text-sm font-medium tabular-nums">{formatCurrency(pr.total_amount || 0)}</span>

                                                </div>

                                                <div className="text-right shrink-0 hidden lg:block w-24">

                                                    <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(pr.created_at)}</span>

                                                </div>

                                            </div>



                                            {/* Hover actions */}

                                            <div className={`flex items-center gap-0.5 shrink-0 ${hoveredPRId === pr.id ? 'opacity-100' : 'opacity-0'} transition-opacity`}>

                                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Xem chi tiết" onClick={(e) => { e.stopPropagation(); setSelectedPRId(pr.id); }}><IconEye className="h-4 w-4 text-gray-500 dark:text-gray-400" /></Button>

                                                {pr.status === 'PENDING' && (

                                                    <PermissionGate module="procurement" action="approve">

                                                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Duyệt" onClick={(e) => { e.stopPropagation(); approvePR.mutate(pr.id); }}><IconCheck className="h-4 w-4 text-green-500" /></Button>

                                                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Từ chối" onClick={(e) => { e.stopPropagation(); rejectPR.mutate(pr.id); }}><IconX className="h-4 w-4 text-red-500" /></Button>

                                                    </PermissionGate>

                                                )}

                                                {(pr.status === 'APPROVED' || pr.status === 'PENDING') && (

                                                    <PermissionGate module="procurement" action="convert">

                                                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Chuyển thành PO" onClick={(e) => { e.stopPropagation(); setConvertPRId(pr.id); setConvertSupplierId(''); }}><IconArrowRight className="h-4 w-4 text-blue-500" /></Button>

                                                    </PermissionGate>

                                                )}

                                                {pr.status !== 'CONVERTED' && (

                                                    <PermissionGate module="procurement" action="delete">

                                                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Xóa" onClick={(e) => { e.stopPropagation(); setDeletePRId(pr.id); }}><IconTrash className="h-4 w-4 text-red-500" /></Button>

                                                    </PermissionGate>

                                                )}

                                            </div>

                                        </div>

                                    );

                                })}

                            </div>



                            {filteredPRs.length > 0 && (

                                <div className="flex items-center justify-between p-3 border-t bg-gray-50 dark:bg-gray-900/50 dark:bg-gray-800/50 text-sm text-gray-500 dark:text-gray-400">

                                    <span>{filteredPRs.length} yêu cầu</span>

                                </div>

                            )}

                        </Card>

                    </TabsContent>



                    {/* ========== TAB 3: SUPPLIERS (Full-featured component) ========== */}

                    <TabsContent value="suppliers" className="mt-4">

                        <SupplierTab />

                    </TabsContent>



                    {/* ========== TAB 4: ANALYTICS ========== */}

                    <TabsContent value="analytics" className="mt-4 space-y-4">

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                            {/* Order Breakdown */}

                            <Card>

                                <CardContent className="p-4 md:p-6">

                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Phân bổ đơn mua theo trạng thái</h3>

                                    <div className="space-y-3">

                                        {[

                                            { label: 'Nháp', count: stats?.draft_count || 0, color: 'bg-gray-400' },

                                            { label: 'Đã gửi', count: stats?.sent_count || 0, color: 'bg-blue-500' },

                                            { label: 'Đã nhận', count: stats?.received_count || 0, color: 'bg-green-500' },

                                            { label: 'Đã thanh toán', count: stats?.paid_count || 0, color: 'bg-emerald-500' },

                                        ].map(item => {

                                            const total = stats?.total_orders || 1;

                                            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;

                                            return (

                                                <div key={item.label}>

                                                    <div className="flex justify-between text-sm mb-1">

                                                        <span className="text-gray-600 dark:text-gray-400">{item.label}</span>

                                                        <span className="font-medium tabular-nums">{item.count} ({pct}%)</span>

                                                    </div>

                                                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">

                                                        <div className={`${item.color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />

                                                    </div>

                                                </div>

                                            );

                                        })}

                                    </div>

                                </CardContent>

                            </Card>



                            {/* Financial Summary */}

                            <Card>

                                <CardContent className="p-4 md:p-6">

                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Tổng quan tài chính</h3>

                                    <div className="space-y-4">

                                        <div>

                                            <p className="text-xs text-gray-500 dark:text-gray-400">Tổng giá trị đơn mua</p>

                                            <p className="text-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent tabular-nums">{formatCurrency(stats?.total_amount || 0)}</p>

                                        </div>

                                        <div className="grid grid-cols-2 gap-3">

                                            <div className="p-3 bg-green-50 rounded-lg">

                                                <p className="text-xs text-green-600">Đã thanh toán</p>

                                                <p className="text-sm font-bold text-green-700 tabular-nums">{formatCurrency(stats?.total_paid || 0)}</p>

                                            </div>

                                            <div className="p-3 bg-amber-50 rounded-lg">

                                                <p className="text-xs text-amber-600">Còn nợ</p>

                                                <p className="text-sm font-bold text-amber-700 tabular-nums">{formatCurrency((stats?.total_amount || 0) - (stats?.total_paid || 0))}</p>

                                            </div>

                                        </div>

                                    </div>

                                </CardContent>

                            </Card>



                            {/* PR Summary */}

                            <Card>

                                <CardContent className="p-4 md:p-6">

                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Yêu cầu mua hàng</h3>

                                    <div className="space-y-4">

                                        <div className="text-center">

                                            <p className="text-4xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{stats?.total_requisitions || 0}</p>

                                            <p className="text-xs text-gray-500 dark:text-gray-400">Tổng yêu cầu</p>

                                        </div>

                                        <div className="grid grid-cols-2 gap-3">

                                            <div className="p-3 bg-amber-50 rounded-lg text-center">

                                                <p className="text-lg font-bold text-amber-700 tabular-nums">{stats?.pending_prs || 0}</p>

                                                <p className="text-xs text-amber-600">Chờ duyệt</p>

                                            </div>

                                            <div className="p-3 bg-green-50 rounded-lg text-center">

                                                <p className="text-lg font-bold text-green-700 tabular-nums">{stats?.approved_prs || 0}</p>

                                                <p className="text-xs text-green-600">Đã duyệt</p>

                                            </div>

                                        </div>

                                    </div>

                                </CardContent>

                            </Card>

                        </div>

                    </TabsContent>

                </Tabs>

            </motion.div>



            {/* ========== MODALS ========== */}



            {/* Create PO Modal */}

            <CreatePOModal open={showCreatePO} onClose={() => setShowCreatePO(false)} suppliers={suppliers || []} onSubmit={(data) => { createPO.mutate(data); setShowCreatePO(false); }} />



            {/* Create PR Modal */}

            <CreatePRModal open={showCreatePR} onClose={() => setShowCreatePR(false)} onSubmit={(data) => { createPR.mutate(data); setShowCreatePR(false); }} />



            {/* Delete PO Confirm */}

            <Dialog open={!!deletePOId} onOpenChange={() => setDeletePOId(null)}>

                <DialogContent className="sm:max-w-md">

                    <DialogHeader><DialogTitle>Xác nhận xóa đơn mua</DialogTitle><DialogDescription>Bạn có chắc chắn muốn xóa đơn mua này? Hành động này không thể hoàn tác.</DialogDescription></DialogHeader>

                    <DialogFooter className="gap-2">

                        <Button variant="outline" onClick={() => setDeletePOId(null)}>Hủy</Button>

                        <Button variant="destructive" onClick={() => { if (deletePOId) { deletePOMut.mutate(deletePOId); setDeletePOId(null); } }}>Xóa</Button>

                    </DialogFooter>

                </DialogContent>

            </Dialog>



            {/* Delete PR Confirm */}

            <Dialog open={!!deletePRId} onOpenChange={() => setDeletePRId(null)}>

                <DialogContent className="sm:max-w-md">

                    <DialogHeader><DialogTitle>Xác nhận xóa yêu cầu</DialogTitle><DialogDescription>Bạn có chắc chắn muốn xóa yêu cầu mua hàng này?</DialogDescription></DialogHeader>

                    <DialogFooter className="gap-2">

                        <Button variant="outline" onClick={() => setDeletePRId(null)}>Hủy</Button>

                        <Button variant="destructive" onClick={() => { if (deletePRId) { deletePRMut.mutate(deletePRId); setDeletePRId(null); } }}>Xóa</Button>

                    </DialogFooter>

                </DialogContent>

            </Dialog>



            {/* Convert PR to PO Modal */}

            <Dialog open={!!convertPRId} onOpenChange={() => setConvertPRId(null)}>

                <DialogContent className="sm:max-w-md">

                    <DialogHeader><DialogTitle>Chuyển thành đơn mua hàng</DialogTitle><DialogDescription>Chọn nhà cung cấp để tạo đơn mua từ yêu cầu này.</DialogDescription></DialogHeader>

                    <div className="py-4">

                        <Label>Nhà cung cấp</Label>

                        <Select value={convertSupplierId} onValueChange={setConvertSupplierId}>

                            <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn NCC (hoặc để trống)" /></SelectTrigger>

                            <SelectContent>

                                {(suppliers || []).map((s: Supplier) => (

                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>

                                ))}

                            </SelectContent>

                        </Select>

                    </div>

                    <DialogFooter className="gap-2">

                        <Button variant="outline" onClick={() => setConvertPRId(null)}>Hủy</Button>

                        <Button className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white" onClick={() => {

                            if (convertPRId) {

                                convertPRtoPO.mutate({ id: convertPRId, supplier_id: convertSupplierId || undefined });

                                setConvertPRId(null);

                            }

                        }}>Chuyển đổi</Button>

                    </DialogFooter>

                </DialogContent>

            </Dialog>



            {/* Supplier modals are now self-contained in SupplierTab component */}



            {/* PR Detail Drawer */}

            <PRDetailDrawer

                pr={selectedPRId ? (requisitions || []).find(r => r.id === selectedPRId) || null : null}

                open={!!selectedPRId}

                onClose={() => setSelectedPRId(null)}

                onApprove={(id) => { approvePR.mutate(id); setSelectedPRId(null); }}

                onReject={(id) => { rejectPR.mutate(id); setSelectedPRId(null); }}

                onConvert={(id) => { setSelectedPRId(null); setConvertPRId(id); setConvertSupplierId(''); }}

                onDelete={(id) => { setSelectedPRId(null); setDeletePRId(id); }}

            />



            {/* Professional Export Dialog */}

            <ExportDialog

                open={exportOpen}

                onOpenChange={setExportOpen}

                onExport={handleProcExport}

                defaultFilename={procExportConfig.filename}

                title="Xuất báo cáo Mua hàng"

                isExporting={isExporting}

            />

        </div>

    );

}

