'use client';

import { PermissionGate } from '@/components/shared/PermissionGate';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTabPersistence } from '@/hooks/useTabPersistence';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency, formatNumber, cn } from '@/lib/utils';
import {
    useInventoryItems,
    useInventoryStats,
    useInventoryTransactions,
    useInventoryLots,
    useLowStockAlerts,
    useExpiringLots,
    useFifoLots,
    useCreateItem,
    useUpdateItem,
    useDeleteItem,
    useItemTransactions,
    useCreateTransaction,
    useCreateLot,
    useReverseTransaction,
    useAutoReorder,
    useDefaultWarehouse,
    useExportWithLots,
    type InventoryItemData,
    type InventoryTransactionData,
    type InventoryLotData,
    type LowStockItem,
    type ExpiringLot,
    type LowStockResponse,
    type ExpiringLotsResponse,
    type PaginatedItems,
    type FifoLotsResponse,
    type ExportWithLotsResponse,
    type LotAllocation,
    type AutoReorderResult,
} from '@/hooks/use-inventory';
import {
    IconSearch,
    IconPlus,
    IconEdit,
    IconTrash,
    IconPackage,
    IconAlertTriangle,
    IconCheck,
    IconX,
    IconStar,
    IconStarFilled,
    IconRefresh,
    IconDotsVertical,
    IconArrowUp,
    IconArrowDown,
    IconCalendar,
    IconBox,
    IconHistory,
    IconBell,
    IconChartBar,
    IconDownload,
    IconArrowsExchange,
    IconTruckDelivery,
    IconPrinter,
    IconExternalLink,
    IconShoppingCart,
    IconCircleCheck,
    IconInfoCircle,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { ExportDialog } from '@/components/analytics/export-dialog';
import { useReportExport, type ExportFormat, type ExportConfig } from '@/hooks/use-report-export';
import type { ReportSheet, ColumnDef, KpiCard } from '@/lib/excel-report-engine';

// ========== HELPERS ==========

function getStockStatus(currentStock: number | string, minStock: number | string) {
    const cur = Number(currentStock) || 0;
    const min = Number(minStock) || 0;
    if (cur <= 0) return { label: 'Hết', color: 'bg-red-100 text-red-700', severity: 'CRITICAL' as const };
    if (min > 0 && cur <= min) return { label: 'Thấp', color: 'bg-amber-100 text-amber-700', severity: 'WARNING' as const };
    return { label: 'OK', color: 'bg-green-100 text-green-700', severity: 'OK' as const };
}

function getDaysText(days: number | null): string {
    if (days === null) return '—';
    if (days <= 0) return 'Đã hết hạn';
    if (days <= 7) return `${days} ngày`;
    return `${days} ngày`;
}

// ========== MAIN PAGE ==========

const PAGE_SIZE = 50;

const INVENTORY_TABS = ['items', 'analytics', 'transactions', 'lots', 'alerts'] as const;

export default function InventoryPage() {
    const queryClient = useQueryClient();
    const router = useRouter();

    // Tab & search state
    const { activeTab, handleTabChange: setActiveTab } = useTabPersistence(INVENTORY_TABS, 'items');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const offset = (currentPage - 1) * PAGE_SIZE;

    // Selection state
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [starredIds, setStarredIds] = useState<string[]>([]);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    // Detail drawer state
    const [detailItem, setDetailItem] = useState<InventoryItemData | null>(null);

    // Dialog state
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editItem, setEditItem] = useState<InventoryItemData | null>(null);
    const [stockAdjustItem, setStockAdjustItem] = useState<InventoryItemData | null>(null);

    // Form state for Create/Edit
    const [formData, setFormData] = useState({
        sku: '', name: '', category: '', uom: 'kg', min_stock: 0, cost_price: 0, notes: '',
    });

    // Stock Adjust form
    const [adjustType, setAdjustType] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
    const [adjustQty, setAdjustQty] = useState('');
    const [adjustNotes, setAdjustNotes] = useState('');
    const [adjustReason, setAdjustReason] = useState('Sản xuất');  // Export reason
    const [showFifoPreview, setShowFifoPreview] = useState(true);    // FIFO toggle
    const [manualAllocations, setManualAllocations] = useState<Array<{ lot_id: string; quantity: number }>>([]);
    const [lastExportResult, setLastExportResult] = useState<ExportWithLotsResponse | null>(null);  // For print receipt
    const [printTxn, setPrintTxn] = useState<InventoryTransactionData | null>(null);  // Print any txn receipt

    // Export dialog state
    const [exportOpen, setExportOpen] = useState(false);
    const { isExporting, exportData } = useReportExport();

    // Auto-reorder state
    const [showReorderConfirm, setShowReorderConfirm] = useState(false);
    const [lastReorderResult, setLastReorderResult] = useState<AutoReorderResult | null>(null);
    const [reorderedItemIds, setReorderedItemIds] = useState<Set<string>>(new Set());

    // Transaction filter
    const [txnFilter, setTxnFilter] = useState<string>('');
    const [txnPage, setTxnPage] = useState(1);
    const TXN_PAGE_SIZE = 50;
    const txnOffset = (txnPage - 1) * TXN_PAGE_SIZE;

    // Lot management state
    const [lotFilterItem, setLotFilterItem] = useState<string>('all');
    const [lotFilterStatus, setLotFilterStatus] = useState<string>('ACTIVE');
    const [showCreateLot, setShowCreateLot] = useState(false);
    const [fifoQty, setFifoQty] = useState('');
    const [fifoItemId, setFifoItemId] = useState<string>('');
    const [lotForm, setLotForm] = useState({
        item_id: '', lot_number: '', batch_code: '', manufacture_date: '', expiry_date: '',
        initial_quantity: '', unit_cost: '', notes: '',
    });

    // Data hooks
    const { data: stats, isLoading: statsLoading } = useInventoryStats();
    const { data: paginatedData, isLoading: itemsLoading, refetch: refetchItems } = useInventoryItems(search, selectedCategory, PAGE_SIZE, offset);
    const { data: allItemsData } = useInventoryItems(search, selectedCategory); // For analytics computations
    const { data: txnData, isLoading: txnLoading } = useInventoryTransactions(undefined, TXN_PAGE_SIZE, txnOffset);
    const transactions = txnData?.transactions;
    const txnTotal = txnData?.total || 0;
    const txnTotalPages = Math.ceil(txnTotal / TXN_PAGE_SIZE);
    const { data: lots, isLoading: lotsLoading } = useInventoryLots(lotFilterItem === 'all' ? undefined : lotFilterItem, lotFilterStatus);
    const { data: lowStock, isLoading: alertsLoading } = useLowStockAlerts();
    const { data: expiringLots } = useExpiringLots(30);
    const { data: defaultWarehouse } = useDefaultWarehouse();
    const { data: detailTransactions } = useItemTransactions(detailItem?.id);
    const { data: fifoData } = useFifoLots(
        fifoItemId || undefined,
        fifoQty ? parseFloat(fifoQty) : undefined
    );
    // FIFO preview for export dialog
    const { data: exportFifoData } = useFifoLots(
        adjustType === 'EXPORT' && stockAdjustItem ? stockAdjustItem.id : undefined,
        adjustType === 'EXPORT' && adjustQty ? parseFloat(adjustQty) : undefined
    );

    // Mutations
    const createItem = useCreateItem();
    const updateItem = useUpdateItem();
    const deleteItem = useDeleteItem();
    const createTransaction = useCreateTransaction();
    const reverseTransaction = useReverseTransaction();
    const autoReorder = useAutoReorder();
    const createLot = useCreateLot();
    const exportWithLots = useExportWithLots();

    // Paginated values
    const itemsList = useMemo(() => paginatedData?.items || [], [paginatedData]);
    const totalItems = paginatedData?.total || 0;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);
    const allItems = useMemo(() => allItemsData?.items || [], [allItemsData]);

    const transactionsList = useMemo(() => {
        let list = transactions || [];
        if (txnFilter === 'IMPORT') list = list.filter(t => t.transaction_type === 'IMPORT');
        if (txnFilter === 'EXPORT') list = list.filter(t => t.transaction_type === 'EXPORT');
        return list;
    }, [transactions, txnFilter]);
    const lotsList = useMemo(() => lots || [], [lots]);
    const alertsList = useMemo(() => lowStock?.items || [], [lowStock]);

    const categories = useMemo(() => {
        const cats = new Set(allItems.map(i => i.category).filter(Boolean) as string[]);
        return Array.from(cats).sort();
    }, [allItems]);

    // Derived stats (use allItems for accurate global counts)
    const inStock = allItems.filter(i => i.current_stock > i.min_stock).length;
    const lowStockCount = allItems.filter(i => i.current_stock > 0 && i.current_stock <= i.min_stock).length;
    const outOfStock = allItems.filter(i => i.current_stock <= 0).length;
    const totalValue = allItems.reduce((sum, i) => sum + (i.current_stock * (i.cost_price || 0)), 0);

    // Category analytics
    const categoryBreakdown = useMemo(() => {
        const map: Record<string, { count: number; value: number; lowStock: number }> = {};
        allItems.forEach(i => {
            const cat = i.category || 'Chưa phân loại';
            if (!map[cat]) map[cat] = { count: 0, value: 0, lowStock: 0 };
            map[cat].count++;
            map[cat].value += i.current_stock * (i.cost_price || 0);
            if (i.current_stock <= i.min_stock && i.current_stock > 0) map[cat].lowStock++;
        });
        return Object.entries(map).sort((a, b) => b[1].value - a[1].value);
    }, [allItems]);

    // Movement analytics
    const movementStats = useMemo(() => {
        const allTxns = transactions || [];
        const imports = allTxns.filter(t => t.transaction_type === 'IMPORT');
        const exports = allTxns.filter(t => t.transaction_type === 'EXPORT');
        return {
            totalImports: imports.length,
            totalExports: exports.length,
            importQty: imports.reduce((s, t) => s + t.quantity, 0),
            exportQty: exports.reduce((s, t) => s + t.quantity, 0),
        };
    }, [transactions]);

    // Debounce search (FE-4): delay API calls by 300ms
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput);
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const handleSearch = (val: string) => { setSearchInput(val); };
    const handleCategoryFilter = (cat: string) => { setSelectedCategory(cat); setCurrentPage(1); };

    // Handlers
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === itemsList.length) setSelectedIds([]);
        else setSelectedIds(itemsList.map(i => i.id));
    };

    const toggleStar = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setStarredIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const openCreateModal = () => {
        setFormData({ sku: '', name: '', category: '', uom: 'kg', min_stock: 0, cost_price: 0, notes: '' });
        setShowCreateModal(true);
    };

    const openEditModal = (item: InventoryItemData) => {
        setFormData({
            sku: item.sku, name: item.name, category: item.category || '',
            uom: item.uom, min_stock: item.min_stock, cost_price: item.cost_price, notes: item.notes || '',
        });
        setEditItem(item);
    };

    const handleSaveItem = () => {
        if (!formData.name || !formData.sku || !formData.uom) {
            toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }
        if (editItem) {
            updateItem.mutate({ id: editItem.id, ...formData }, {
                onSuccess: () => setEditItem(null),
            });
        } else {
            createItem.mutate(formData, {
                onSuccess: () => setShowCreateModal(false),
            });
        }
    };

    const handleStockAdjust = () => {
        const qty = parseFloat(adjustQty);
        if (!stockAdjustItem || !qty || qty <= 0) {
            toast.error('Vui lòng nhập số lượng hợp lệ');
            return;
        }
        const warehouseId = defaultWarehouse?.id;
        if (!warehouseId) {
            toast.error('Không tìm thấy kho mặc định');
            return;
        }

        if (adjustType === 'EXPORT') {
            // Use export-with-lots endpoint for FIFO/manual lot deduction
            const allocations = !showFifoPreview && manualAllocations.length > 0
                ? manualAllocations.filter(a => a.quantity > 0)
                : undefined;
            exportWithLots.mutate({
                item_id: stockAdjustItem.id,
                warehouse_id: warehouseId,
                quantity: qty,
                reason: adjustReason,
                notes: adjustNotes || undefined,
                lot_allocations: allocations,
            }, {
                onSuccess: (result) => {
                    setLastExportResult(result);
                    setStockAdjustItem(null);
                    setAdjustQty('');
                    setAdjustNotes('');
                    setManualAllocations([]);
                },
            });
        } else {
            // Standard IMPORT flow
            createTransaction.mutate({
                item_id: stockAdjustItem.id,
                warehouse_id: warehouseId,
                transaction_type: 'IMPORT',
                quantity: qty,
                notes: adjustNotes || 'Nhập thủ công',
            }, {
                onSuccess: () => {
                    setStockAdjustItem(null);
                    setAdjustQty('');
                    setAdjustNotes('');
                },
            });
        }
    };

    // ========== PROFESSIONAL EXPORT CONFIG ==========
    const col = (key: string, header: string, opts: Partial<ColumnDef> = {}): ColumnDef => ({
        key, header, format: 'text', ...opts,
    });

    const exportConfig = useMemo((): ExportConfig => {
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const items = allItems.length > 0 ? allItems : itemsList;

        // KPI summary cards
        const kpiCards: KpiCard[] = [
            {
                label: 'TỔNG SẢN PHẨM',
                value: stats?.total_sku ?? items.length,
                format: 'number',
                trend: 0,
                trendLabel: '',
                bgColor: 'E3F2FD',
                valueColor: '1565C0',
                icon: '📦',
            },
            {
                label: 'ĐỦ HÀNG',
                value: inStock,
                format: 'number',
                trend: 0,
                trendLabel: '',
                bgColor: 'E8F5E9',
                valueColor: '1B7D3A',
                icon: '✅',
            },
            {
                label: 'SẮP HẾT / HẾT HÀNG',
                value: (stats?.warning_items ?? lowStockCount) + (stats?.out_of_stock ?? outOfStock),
                format: 'number',
                trend: 0,
                trendLabel: '',
                bgColor: 'FCE4EC',
                valueColor: 'C62828',
                icon: '⚠️',
            },
            {
                label: 'GIÁ TRỊ KHO',
                value: stats?.total_value ?? totalValue,
                format: 'currency',
                trend: 0,
                trendLabel: '',
                bgColor: 'F3E5F5',
                valueColor: '7B1FA2',
                icon: '💰',
            },
        ];

        // Build data rows with status
        const dataRows = items.map(i => {
            const status = getStockStatus(i.current_stock, i.min_stock);
            const statusLabel = status.severity === 'CRITICAL' ? 'Cần theo dõi'
                : status.severity === 'WARNING' ? 'Cần theo dõi'
                    : 'Tốt';
            return {
                sku: i.sku,
                name: i.name,
                category: i.category || 'Chưa phân loại',
                uom: i.uom,
                current_stock: i.current_stock,
                min_stock: i.min_stock,
                cost_price: i.cost_price,
                stock_value: i.current_stock * (i.cost_price || 0),
                latest_purchase_price: i.latest_purchase_price || 0,
                status: statusLabel,
            };
        });

        const sheets: ReportSheet[] = [{
            name: 'Tồn kho',
            title: 'Báo cáo Tồn kho Chi tiết',
            subtitle: `Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}`,
            kpiCards,
            columns: [
                col('sku', 'Mã SKU', { width: 14 }),
                col('name', 'Tên sản phẩm', { width: 28 }),
                col('category', 'Danh mục', { width: 16 }),
                col('uom', 'ĐVT', { width: 8, alignment: 'center' }),
                col('current_stock', 'Tồn kho', { format: 'number', width: 14, summaryFn: 'sum' }),
                col('min_stock', 'Tồn tối thiểu', { format: 'number', width: 14 }),
                col('cost_price', 'Giá vốn', { format: 'currency', width: 18 }),
                col('stock_value', 'Giá trị tồn', { format: 'currency', width: 20, summaryFn: 'sum' }),
                col('status', 'Trạng thái', { format: 'status', width: 16 }),
            ],
            data: dataRows,
            summaryRow: true,
        }];

        return {
            title: 'Báo cáo Tồn kho',
            columns: [
                { key: 'sku', header: 'Mã SKU' },
                { key: 'name', header: 'Tên sản phẩm' },
                { key: 'category', header: 'Danh mục' },
                { key: 'uom', header: 'ĐVT' },
                { key: 'current_stock', header: 'Tồn kho' },
                { key: 'min_stock', header: 'Tồn tối thiểu' },
                { key: 'cost_price', header: 'Giá vốn', format: (v) => formatCurrency(v as number) },
                { key: 'stock_value', header: 'Giá trị tồn', format: (v) => formatCurrency(v as number) },
                { key: 'status', header: 'Trạng thái' },
            ],
            data: dataRows,
            filename: `bao-cao-ton-kho_${today}`,
            sheets,
        };
    }, [allItems, itemsList, stats, inStock, lowStockCount, outOfStock, totalValue]);

    const handleExport = async (format: ExportFormat, filename: string) => {
        const config = { ...exportConfig, filename };
        await exportData(format, config);
    };

    const handleDownloadReceiptPdf = async (txnId: string) => {
        try {
            const { api } = await import('@/lib/api');
            const response = await api.getBlob(`/inventory/transactions/${txnId}/receipt-pdf`);
            const blob = new Blob([response], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `phieu-${txnId.slice(0, 8)}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Tải phiếu thành công');
        } catch (err) {
            toast.error('Không thể tải phiếu PDF');
        }
    };

    const handleCreateLot = () => {
        if (!lotForm.item_id || !lotForm.lot_number || !lotForm.initial_quantity) {
            toast.error('Vui lòng điền đầy đủ thông tin');
            return;
        }
        const warehouseId = defaultWarehouse?.id;
        if (!warehouseId) {
            toast.error('Không tìm thấy kho mặc định');
            return;
        }
        createLot.mutate({
            item_id: lotForm.item_id,
            warehouse_id: warehouseId,
            lot_number: lotForm.lot_number,
            batch_code: lotForm.batch_code || undefined,
            manufacture_date: lotForm.manufacture_date || undefined,
            expiry_date: lotForm.expiry_date || undefined,
            initial_quantity: parseFloat(lotForm.initial_quantity),
            unit_cost: lotForm.unit_cost ? parseFloat(lotForm.unit_cost) : undefined,
            notes: lotForm.notes || undefined,
        }, {
            onSuccess: () => {
                setShowCreateLot(false);
                setLotForm({ item_id: '', lot_number: '', batch_code: '', manufacture_date: '', expiry_date: '', initial_quantity: '', unit_cost: '', notes: '' });
            },
        });
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <motion.div
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Kho hàng</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Quản lý nguyên vật liệu & tồn kho</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExportOpen(true)}
                        className="gap-1.5 border-gray-300 dark:border-gray-600 hover:border-[#c2185b] hover:text-[#c2185b] transition-colors"
                    >
                        <IconDownload className="h-4 w-4" />
                        <span className="hidden sm:inline">Xuất báo cáo</span>
                    </Button>
                    <PermissionGate module="inventory" action="create">
                        <Button
                            className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white"
                            onClick={openCreateModal}
                        >
                            <IconPlus className="mr-2 h-4 w-4" />
                            Thêm mới
                        </Button>
                    </PermissionGate>
                </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
                className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                {statsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)
                ) : (
                    [
                        { label: 'Tổng SP', value: stats?.total_sku ?? itemsList.length, icon: IconPackage, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
                        { label: 'Đủ hàng', value: inStock, icon: IconCheck, bgColor: 'bg-green-50', iconColor: 'text-green-600' },
                        { label: 'Sắp hết', value: stats?.warning_items ?? lowStockCount, icon: IconAlertTriangle, bgColor: 'bg-amber-50', iconColor: 'text-amber-600' },
                        { label: 'Hết hàng', value: stats?.out_of_stock ?? outOfStock, icon: IconX, bgColor: 'bg-red-50', iconColor: 'text-red-600' },
                        { label: 'Giá trị kho', value: formatCurrency(stats?.total_value ?? totalValue), icon: IconBox, bgColor: 'bg-purple-50', iconColor: 'text-purple-600', isValue: true },
                    ].map((stat, i) => (
                        <Card key={i} className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-3 md:p-4">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className={`p-1.5 md:p-2 rounded-lg ${stat.bgColor}`}>
                                        <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.iconColor}`} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                                        <p className={cn('font-bold', stat.isValue ? 'text-sm' : 'text-base md:text-lg')}>{stat.value}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </motion.div>

            {/* Tab Navigation */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
                        <TabsTrigger value="items" className="gap-2">
                            <IconPackage className="h-4 w-4" />
                            <span className="hidden sm:inline">Sản phẩm</span>
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="gap-2">
                            <IconChartBar className="h-4 w-4" />
                            <span className="hidden sm:inline">Phân tích</span>
                        </TabsTrigger>
                        <TabsTrigger value="transactions" className="gap-2">
                            <IconHistory className="h-4 w-4" />
                            <span className="hidden sm:inline">Giao dịch</span>
                        </TabsTrigger>
                        <TabsTrigger value="lots" className="gap-2">
                            <IconBox className="h-4 w-4" />
                            <span className="hidden sm:inline">Lots</span>
                        </TabsTrigger>
                        <TabsTrigger value="alerts" className="gap-2 relative">
                            <IconBell className="h-4 w-4" />
                            <span className="hidden sm:inline">Cảnh báo</span>
                            {alertsList.length > 0 && (
                                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                                    {alertsList.length}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* ========== TAB: ITEMS ========== */}
                    <TabsContent value="items" className="mt-4">
                        <Card className="overflow-hidden">
                            {/* Toolbar */}
                            <div className="flex items-center gap-2 p-2 md:p-3 border-b bg-gray-50 dark:bg-gray-900/50 dark:bg-gray-800/50">
                                <Checkbox
                                    checked={itemsList.length > 0 && selectedIds.length === itemsList.length}
                                    onCheckedChange={toggleSelectAll}
                                    className="ml-1"
                                />
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetchItems()}>
                                    <IconRefresh className="h-4 w-4" />
                                </Button>

                                {/* Category chips */}
                                <div className="hidden md:flex items-center gap-1 flex-wrap">
                                    <Badge
                                        variant={selectedCategory === '' ? 'default' : 'outline'}
                                        className="cursor-pointer text-xs"
                                        onClick={() => handleCategoryFilter('')}
                                    >
                                        Tất cả
                                    </Badge>
                                    {categories.map(cat => (
                                        <Badge
                                            key={cat}
                                            variant={selectedCategory === cat ? 'default' : 'outline'}
                                            className="cursor-pointer text-xs"
                                            onClick={() => handleCategoryFilter(cat === selectedCategory ? '' : cat)}
                                        >
                                            {cat}
                                        </Badge>
                                    ))}
                                </div>

                                <div className="flex-1" />

                                <div className="relative w-full max-w-xs">
                                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                                    <Input
                                        placeholder="Tìm kiếm..."
                                        value={searchInput}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        className="pl-9 h-8 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Item List */}
                            <div className="divide-y">
                                {itemsLoading ? (
                                    <div className="p-4 space-y-2">
                                        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                                    </div>
                                ) : itemsList.length === 0 ? (
                                    <div className="text-center py-16">
                                        <IconPackage className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                                        <p className="mt-4 text-gray-500 dark:text-gray-400">Chưa có dữ liệu</p>
                                        <PermissionGate module="inventory" action="create">
                                            <Button className="mt-4" variant="outline" size="sm" onClick={openCreateModal}>
                                                <IconPlus className="mr-2 h-4 w-4" />
                                                Thêm sản phẩm
                                            </Button>
                                        </PermissionGate>
                                    </div>
                                ) : (
                                    itemsList.map((item) => {
                                        const stockStatus = getStockStatus(item.current_stock, item.min_stock);
                                        return (
                                            <div
                                                key={item.id}
                                                className={cn(
                                                    'flex items-center gap-2 md:gap-4 px-2 md:px-4 py-2 md:py-3',
                                                    'cursor-pointer transition-colors',
                                                    selectedIds.includes(item.id) ? 'bg-blue-50' : 'hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800'
                                                )}
                                                onMouseEnter={() => setHoveredId(item.id)}
                                                onMouseLeave={() => setHoveredId(null)}
                                                onClick={() => setDetailItem(item)}
                                            >
                                                <Checkbox
                                                    checked={selectedIds.includes(item.id)}
                                                    onCheckedChange={() => toggleSelect(item.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />

                                                <button onClick={(e) => toggleStar(item.id, e)} className="p-1 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded">
                                                    {starredIds.includes(item.id) ? (
                                                        <IconStarFilled className="h-4 w-4 text-amber-400" />
                                                    ) : (
                                                        <IconStar className="h-4 w-4 text-gray-400 dark:text-gray-500 hover:text-amber-400" />
                                                    )}
                                                </button>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-4">
                                                    <div className="w-32 md:w-48 truncate">
                                                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{item.name}</span>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500">{item.sku}</p>
                                                    </div>

                                                    <div className="flex-1 min-w-0 flex items-center gap-2">
                                                        <Badge className={`${stockStatus.color} text-xs px-1.5 py-0.5 shrink-0`}>
                                                            {stockStatus.label}
                                                        </Badge>
                                                        <span className="text-sm text-gray-500 dark:text-gray-400 truncate hidden sm:inline">
                                                            {item.category} • {item.uom}
                                                        </span>
                                                    </div>

                                                    {/* Quantity */}
                                                    <div className="text-right shrink-0">
                                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                                                            {formatNumber(item.current_stock)} {item.uom}
                                                        </span>
                                                    </div>

                                                    {/* Price - Desktop only */}
                                                    <div className="w-24 text-right shrink-0 hidden lg:block">
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                                            {formatCurrency(item.latest_purchase_price || item.cost_price)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Hover Actions */}
                                                <div className={cn(
                                                    'flex items-center gap-0.5 shrink-0',
                                                    hoveredId === item.id ? 'opacity-100' : 'opacity-0',
                                                    'transition-opacity'
                                                )}>
                                                    <PermissionGate module="inventory" action="edit">
                                                        <Button
                                                            variant="ghost" size="icon" className="h-7 w-7"
                                                            title="Nhập/Xuất kho"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setStockAdjustItem(item);
                                                                setAdjustType('IMPORT');
                                                                setAdjustQty('0');
                                                                setAdjustNotes('');
                                                            }}
                                                        >
                                                            <IconArrowsExchange className="h-4 w-4 text-blue-600" />
                                                        </Button>
                                                    </PermissionGate>
                                                    <PermissionGate module="inventory" action="edit">
                                                        <Button
                                                            variant="ghost" size="icon" className="h-7 w-7"
                                                            onClick={(e) => { e.stopPropagation(); openEditModal(item); }}
                                                        >
                                                            <IconEdit className="h-4 w-4" />
                                                        </Button>
                                                    </PermissionGate>
                                                    <PermissionGate module="inventory" action="delete">
                                                        <Button
                                                            variant="ghost" size="icon" className="h-7 w-7"
                                                            onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }}
                                                        >
                                                            <IconTrash className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </PermissionGate>
                                                </div>

                                                <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden" onClick={(e) => e.stopPropagation()}>
                                                    <IconDotsVertical className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Footer with Pagination */}
                            <div className="flex items-center justify-between p-3 border-t bg-gray-50 dark:bg-gray-900/50 dark:bg-gray-800/50 text-sm text-gray-500 dark:text-gray-400">
                                <span>
                                    {selectedIds.length > 0 ? `${selectedIds.length} đã chọn` :
                                        `${totalItems} sản phẩm${totalPages > 1 ? ` • Trang ${currentPage}/${totalPages}` : ''}`
                                    }
                                </span>
                                {totalPages > 1 && (
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost" size="sm" className="h-7 px-2 text-xs"
                                            disabled={currentPage <= 1}
                                            onClick={() => setCurrentPage(p => p - 1)}
                                        >
                                            ← Trước
                                        </Button>
                                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                            let pageNum: number;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }
                                            return (
                                                <Button
                                                    key={pageNum}
                                                    variant={currentPage === pageNum ? 'default' : 'ghost'}
                                                    size="sm"
                                                    className={cn('h-7 w-7 p-0 text-xs', currentPage === pageNum && 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white')}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                >
                                                    {pageNum}
                                                </Button>
                                            );
                                        })}
                                        <Button
                                            variant="ghost" size="sm" className="h-7 px-2 text-xs"
                                            disabled={currentPage >= totalPages}
                                            onClick={() => setCurrentPage(p => p + 1)}
                                        >
                                            Sau →
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </TabsContent>

                    {/* ========== TAB: ANALYTICS ========== */}
                    <TabsContent value="analytics" className="mt-4 space-y-4">
                        {/* Alert Summary Banner */}
                        {(() => {
                            const alertCount = (lowStock?.critical_count || 0) + (lowStock?.warning_count || 0) + (lowStock?.low_count || 0);
                            const expiryCount = expiringLots?.total_expiring || 0;
                            const needsAttention = alertCount > 0 || expiryCount > 0;
                            return needsAttention ? (
                                <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-amber-100 rounded-xl">
                                                <IconBell className="h-6 w-6 text-amber-600" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-amber-900">Cần chú ý</h3>
                                                <div className="flex items-center gap-4 mt-1 text-sm">
                                                    {alertCount > 0 && (
                                                        <span className="text-amber-700">
                                                            <span className="font-medium tabular-nums">{alertCount}</span> sản phẩm tồn kho thấp
                                                        </span>
                                                    )}
                                                    {expiryCount > 0 && (
                                                        <span className="text-orange-700">
                                                            <span className="font-medium tabular-nums">{expiryCount}</span> lots sắp hết hạn
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-amber-300 text-amber-800 hover:bg-amber-100"
                                                onClick={() => setActiveTab('alerts')}
                                            >
                                                Xem cảnh báo
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : null;
                        })()}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Stock Distribution - Donut Style */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg">Phân bổ tồn kho</CardTitle>
                                    <CardDescription>Tỷ lệ trạng thái các sản phẩm</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-6">
                                        {/* Donut Ring Visual */}
                                        <div className="relative w-28 h-28 shrink-0">
                                            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                                <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                                                {allItems.length > 0 && (() => {
                                                    const total = allItems.length;
                                                    const greenPct = (inStock / total) * 100;
                                                    const amberPct = (lowStockCount / total) * 100;
                                                    const redPct = (outOfStock / total) * 100;
                                                    const circumference = 2 * Math.PI * 40;
                                                    let offset = 0;
                                                    const segments = [
                                                        { pct: greenPct, color: '#22c55e' },
                                                        { pct: amberPct, color: '#f59e0b' },
                                                        { pct: redPct, color: '#ef4444' },
                                                    ];
                                                    return segments.map((seg, i) => {
                                                        const dash = (seg.pct / 100) * circumference;
                                                        const el = (
                                                            <circle
                                                                key={i}
                                                                cx="50" cy="50" r="40" fill="none"
                                                                stroke={seg.color} strokeWidth="12"
                                                                strokeDasharray={`${dash} ${circumference - dash}`}
                                                                strokeDashoffset={-offset}
                                                                className="transition-all duration-700"
                                                            />
                                                        );
                                                        offset += dash;
                                                        return el;
                                                    });
                                                })()}
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="text-center">
                                                    <p className="text-xl font-bold tabular-nums">{allItems.length}</p>
                                                    <p className="text-[10px] text-gray-500 dark:text-gray-400">SP</p>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Legend */}
                                        <div className="flex-1 space-y-3">
                                            {[
                                                { label: 'Đủ hàng', count: inStock, color: 'bg-green-500', textColor: 'text-green-700' },
                                                { label: 'Sắp hết', count: lowStockCount, color: 'bg-amber-500', textColor: 'text-amber-700' },
                                                { label: 'Hết hàng', count: outOfStock, color: 'bg-red-500', textColor: 'text-red-700' },
                                            ].map((row) => (
                                                <div key={row.label} className="flex items-center gap-3">
                                                    <div className={cn('w-3 h-3 rounded-full', row.color)} />
                                                    <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">{row.label}</span>
                                                    <span className={cn('text-sm font-semibold tabular-nums', row.textColor)}>{row.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Movement Timeline - 7 Day Daily Bars */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg">Biến động 7 ngày</CardTitle>
                                    <CardDescription>Nhập / xuất kho theo ngày</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {(() => {
                                        const allTxns = transactions || [];
                                        const now = new Date();
                                        const days: { date: string; label: string; imports: number; exports: number }[] = [];
                                        for (let i = 6; i >= 0; i--) {
                                            const d = new Date(now);
                                            d.setDate(d.getDate() - i);
                                            const dateStr = d.toISOString().split('T')[0];
                                            const dayTxns = allTxns.filter(t => t.created_at?.startsWith(dateStr));
                                            days.push({
                                                date: dateStr,
                                                label: d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' }),
                                                imports: dayTxns.filter(t => t.transaction_type === 'IMPORT').reduce((s, t) => s + t.quantity, 0),
                                                exports: dayTxns.filter(t => t.transaction_type === 'EXPORT').reduce((s, t) => s + Math.abs(t.quantity), 0),
                                            });
                                        }
                                        const maxVal = Math.max(...days.map(d => Math.max(d.imports, d.exports)), 1);
                                        const hasData = days.some(d => d.imports > 0 || d.exports > 0);

                                        return hasData ? (
                                            <div className="space-y-3">
                                                <div className="flex items-end gap-1 h-32">
                                                    {days.map((day) => (
                                                        <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                                                            {/* Import bar */}
                                                            <div
                                                                className="w-full max-w-[16px] bg-green-400 rounded-t-sm transition-all duration-500"
                                                                style={{ height: `${(day.imports / maxVal) * 100}%`, minHeight: day.imports > 0 ? '4px' : '0' }}
                                                                title={`Nhập: ${formatNumber(day.imports)}`}
                                                            />
                                                            {/* Export bar */}
                                                            <div
                                                                className="w-full max-w-[16px] bg-red-400 rounded-b-sm transition-all duration-500"
                                                                style={{ height: `${(day.exports / maxVal) * 100}%`, minHeight: day.exports > 0 ? '4px' : '0' }}
                                                                title={`Xuất: ${formatNumber(day.exports)}`}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex gap-1">
                                                    {days.map((day) => (
                                                        <div key={day.date} className="flex-1 text-center">
                                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{day.label}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex items-center justify-center gap-4 pt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-400" /> Nhập</span>
                                                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400" /> Xuất</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center py-8 text-gray-400 dark:text-gray-500">
                                                <IconArrowsExchange className="h-10 w-10 mb-2" />
                                                <p className="text-sm">Chưa có biến động trong 7 ngày qua</p>
                                            </div>
                                        );
                                    })()}
                                </CardContent>
                            </Card>

                            {/* Movement Summary */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg">Tổng quan biến động</CardTitle>
                                    <CardDescription>Thống kê nhập/xuất gần đây</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-green-50 rounded-xl text-center">
                                            <IconArrowDown className="mx-auto h-8 w-8 text-green-600 mb-2" />
                                            <p className="text-2xl font-bold text-green-700 tabular-nums">{movementStats.totalImports}</p>
                                            <p className="text-xs text-green-600 mt-1">Lần nhập kho</p>
                                            <p className="text-sm font-medium text-green-700 mt-2 tabular-nums">
                                                {formatNumber(movementStats.importQty)} đvt
                                            </p>
                                        </div>
                                        <div className="p-4 bg-red-50 rounded-xl text-center">
                                            <IconArrowUp className="mx-auto h-8 w-8 text-red-600 mb-2" />
                                            <p className="text-2xl font-bold text-red-700 tabular-nums">{movementStats.totalExports}</p>
                                            <p className="text-xs text-red-600 mt-1">Lần xuất kho</p>
                                            <p className="text-sm font-medium text-red-700 mt-2 tabular-nums">
                                                {formatNumber(movementStats.exportQty)} đvt
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Inventory Value Card */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg">Giá trị tồn kho</CardTitle>
                                    <CardDescription>Tổng giá trị nguyên liệu trong kho</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center py-4">
                                        <p className="text-3xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent tabular-nums">
                                            {formatCurrency(totalValue)}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                            Trên {allItems.length} sản phẩm • {categories.length} danh mục
                                        </p>
                                    </div>
                                    {/* Top 3 highest value items */}
                                    {allItems.length > 0 && (
                                        <div className="mt-4 border-t pt-4">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium uppercase tracking-wide">Top giá trị cao nhất</p>
                                            <div className="space-y-2">
                                                {[...allItems]
                                                    .sort((a, b) => (b.current_stock * (b.cost_price || 0)) - (a.current_stock * (a.cost_price || 0)))
                                                    .slice(0, 3)
                                                    .map((item, idx) => (
                                                        <div key={item.id} className="flex items-center gap-3">
                                                            <span className={cn(
                                                                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white',
                                                                idx === 0 ? 'bg-gradient-to-r from-pink-500 to-purple-500' :
                                                                    idx === 1 ? 'bg-gray-400' : 'bg-gray-300'
                                                            )}>
                                                                {idx + 1}
                                                            </span>
                                                            <span className="flex-1 text-sm truncate">{item.name}</span>
                                                            <span className="text-sm font-medium tabular-nums">{formatCurrency(item.current_stock * (item.cost_price || 0))}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Category Breakdown */}
                            <Card className="lg:col-span-2">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg">Phân tích theo danh mục</CardTitle>
                                    <CardDescription>Giá trị tồn kho & số lượng SP theo nhóm</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {categoryBreakdown.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                                            <IconChartBar className="mx-auto h-10 w-10 mb-2" />
                                            <p>Chưa có dữ liệu phân tích</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {categoryBreakdown.map(([cat, data]) => {
                                                const maxValue = Math.max(...categoryBreakdown.map(([, d]) => d.value), 1);
                                                return (
                                                    <div key={cat} className="flex items-center gap-4">
                                                        <div className="w-32 md:w-40 truncate text-sm font-medium text-gray-700 dark:text-gray-300">{cat}</div>
                                                        <div className="flex-1">
                                                            <div className="h-6 bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 rounded-full overflow-hidden relative">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full transition-all"
                                                                    style={{ width: `${(data.value / maxValue) * 100}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="text-right w-32 shrink-0">
                                                            <span className="text-sm font-medium tabular-nums">{formatCurrency(data.value)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <Badge variant="outline" className="text-xs tabular-nums">{data.count} SP</Badge>
                                                            {data.lowStock > 0 && (
                                                                <Badge variant="destructive" className="text-xs tabular-nums">{data.lowStock} thấp</Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Expiring Lots - Enhanced */}
                            {expiringLots && expiringLots.total_expiring > 0 && (
                                <Card className="lg:col-span-2 border-amber-200">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <IconCalendar className="h-5 w-5 text-amber-500" />
                                                    Lots sắp hết hạn
                                                </CardTitle>
                                                <CardDescription>
                                                    {expiringLots.total_expiring} lots trong 30 ngày tới
                                                    {expiringLots.critical_count > 0 && (
                                                        <Badge variant="destructive" className="ml-2 text-xs tabular-nums">
                                                            {expiringLots.critical_count} nguy cấp
                                                        </Badge>
                                                    )}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="divide-y">
                                            {expiringLots.lots.map((lot: ExpiringLot) => {
                                                const urgencyPct = lot.days_until_expiry !== null
                                                    ? Math.max(0, Math.min(100, (lot.days_until_expiry / 30) * 100))
                                                    : 50;
                                                return (
                                                    <div key={lot.lot_id} className="flex items-center gap-4 py-3">
                                                        <div className={cn(
                                                            'p-2 rounded-lg',
                                                            lot.status === 'CRITICAL' ? 'bg-red-100' : 'bg-amber-100'
                                                        )}>
                                                            <IconCalendar className={cn(
                                                                'h-4 w-4',
                                                                lot.status === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'
                                                            )} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm truncate">{lot.item_name}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">Lot: {lot.lot_number} • SKU: {lot.item_sku}</p>
                                                        </div>
                                                        <div className="w-24 hidden md:block">
                                                            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                                <div
                                                                    className={cn(
                                                                        'h-full rounded-full transition-all',
                                                                        lot.status === 'CRITICAL' ? 'bg-red-500' : 'bg-amber-400'
                                                                    )}
                                                                    style={{ width: `${urgencyPct}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-medium tabular-nums">{formatNumber(lot.remaining_quantity)}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">còn lại</p>
                                                        </div>
                                                        <Badge
                                                            variant={lot.status === 'CRITICAL' ? 'destructive' : 'secondary'}
                                                            className="tabular-nums w-20 justify-center"
                                                        >
                                                            {getDaysText(lot.days_until_expiry)}
                                                        </Badge>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </TabsContent>

                    {/* ========== TAB: TRANSACTIONS ========== */}
                    <TabsContent value="transactions" className="mt-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">Lịch sử nhập/xuất kho</CardTitle>
                                    <div className="flex items-center gap-2">
                                        {['', 'IMPORT', 'EXPORT'].map(type => (
                                            <Badge
                                                key={type || 'all'}
                                                variant={txnFilter === type ? 'default' : 'outline'}
                                                className="cursor-pointer text-xs"
                                                onClick={() => setTxnFilter(type)}
                                            >
                                                {type === '' ? 'Tất cả' : type === 'IMPORT' ? 'Nhập' : 'Xuất'}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {txnLoading ? (
                                    <div className="space-y-2">
                                        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                                    </div>
                                ) : transactionsList.length === 0 ? (
                                    <div className="text-center py-12">
                                        <IconHistory className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                                        <p className="mt-4 text-gray-500 dark:text-gray-400">Chưa có giao dịch</p>
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {transactionsList.map((txn) => (
                                            <div key={txn.id} className="flex items-center gap-4 py-3 group">
                                                <div className={cn(
                                                    'p-2 rounded-lg',
                                                    txn.transaction_type === 'IMPORT' ? 'bg-green-100' : 'bg-red-100'
                                                )}>
                                                    {txn.transaction_type === 'IMPORT' ? (
                                                        <IconArrowDown className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <IconArrowUp className="h-4 w-4 text-red-600" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">
                                                        {txn.item_name || `Item ${txn.item_id.slice(0, 8)}`}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {txn.reference_doc || 'Manual'}
                                                        {txn.notes && ` • ${txn.notes}`}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={cn(
                                                        'font-medium text-sm tabular-nums',
                                                        txn.transaction_type === 'IMPORT' ? 'text-green-600' : 'text-red-600'
                                                    )}>
                                                        {txn.transaction_type === 'IMPORT' ? '+' : '-'}{formatNumber(txn.quantity)}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {new Date(txn.created_at).toLocaleDateString('vi-VN')}
                                                    </p>
                                                </div>
                                                {txn.is_reversed && (
                                                    <Badge variant="outline" className="text-xs text-gray-400 dark:text-gray-500">Đã đảo</Badge>
                                                )}
                                                {!txn.is_reversed && (
                                                    <Button
                                                        variant="ghost" size="sm"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                                        onClick={() => {
                                                            reverseTransaction.mutate({ id: txn.id, reason: 'Đảo giao dịch thủ công' });
                                                        }}
                                                    >
                                                        Đảo
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ========== TAB: LOTS ========== */}
                    <TabsContent value="lots" className="mt-4 space-y-4">
                        {/* Lots Header with Filters */}
                        <Card>
                            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4 flex-wrap">
                                <div>
                                    <CardTitle className="text-lg">Quản lý Lot (FIFO)</CardTitle>
                                    <CardDescription>Theo dõi lô hàng theo thứ tự Nhập trước — Xuất trước</CardDescription>
                                </div>
                                <PermissionGate module="inventory" action="create">
                                    <Button size="sm" onClick={() => setShowCreateLot(true)} className="bg-gradient-to-r from-pink-600 to-purple-700 text-white">
                                        <IconPlus className="mr-2 h-4 w-4" /> Tạo Lot
                                    </Button>
                                </PermissionGate>
                            </CardHeader>
                            <CardContent>
                                {/* Filters */}
                                <div className="flex items-center gap-3 mb-4 flex-wrap">
                                    <Select value={lotFilterItem} onValueChange={setLotFilterItem}>
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder="Tất cả sản phẩm" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tất cả sản phẩm</SelectItem>
                                            {allItems.map(item => (
                                                <SelectItem key={item.id} value={item.id}>{item.name} ({item.sku})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={lotFilterStatus} onValueChange={setLotFilterStatus}>
                                        <SelectTrigger className="w-[150px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                                            <SelectItem value="DEPLETED">Đã hết</SelectItem>
                                            <SelectItem value="EXPIRED">Hết hạn</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Lots Table */}
                                {lotsLoading ? (
                                    <div className="space-y-2">
                                        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                                    </div>
                                ) : lotsList.length === 0 ? (
                                    <div className="text-center py-12">
                                        <IconBox className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                                        <p className="mt-4 text-gray-500 dark:text-gray-400">Chưa có Lot nào</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Nhấn "Tạo Lot" để bắt đầu quản lý lô hàng</p>
                                    </div>
                                ) : (
                                    <div className="border rounded-lg overflow-hidden">
                                        {/* Table Header */}
                                        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400 border-b">
                                            <div className="col-span-2">Lot Number</div>
                                            <div className="col-span-3">Sản phẩm</div>
                                            <div className="col-span-2 text-center">Còn lại / Ban đầu</div>
                                            <div className="col-span-2 text-center">% Còn lại</div>
                                            <div className="col-span-2 text-center">Hạn sử dụng</div>
                                            <div className="col-span-1 text-right">Giá vốn</div>
                                        </div>
                                        {/* Table Body */}
                                        <div className="divide-y">
                                            {lotsList.map((lot) => {
                                                const pctRemaining = lot.initial_quantity > 0 ? (lot.remaining_quantity / lot.initial_quantity) * 100 : 0;
                                                const daysUntilExpiry = lot.expiry_date ? Math.ceil((new Date(lot.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                                                const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7;
                                                const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

                                                return (
                                                    <div
                                                        key={lot.id}
                                                        className={cn(
                                                            "grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 transition-colors cursor-pointer",
                                                            isExpired && "bg-red-50/50",
                                                            isExpiringSoon && !isExpired && "bg-amber-50/50"
                                                        )}
                                                        onClick={() => {
                                                            setFifoItemId(lot.item_id);
                                                        }}
                                                    >
                                                        <div className="col-span-2">
                                                            <p className="font-mono font-medium text-sm">{lot.lot_number}</p>
                                                            {lot.batch_code && <p className="text-[10px] text-gray-400 dark:text-gray-500">{lot.batch_code}</p>}
                                                        </div>
                                                        <div className="col-span-3 min-w-0">
                                                            <p className="truncate font-medium">{lot.item_name || `Item ${lot.item_id.slice(0, 8)}`}</p>
                                                            <p className="text-[10px] text-gray-400 dark:text-gray-500">Nhận: {new Date(lot.received_date).toLocaleDateString('vi-VN')}</p>
                                                        </div>
                                                        <div className="col-span-2 text-center">
                                                            <p className="font-medium tabular-nums">
                                                                {formatNumber(lot.remaining_quantity)}<span className="text-gray-400 dark:text-gray-500"> / {formatNumber(lot.initial_quantity)}</span>
                                                            </p>
                                                        </div>
                                                        <div className="col-span-2 px-2">
                                                            <div className="flex items-center gap-2">
                                                                <Progress
                                                                    value={pctRemaining}
                                                                    className={cn("h-2 flex-1", pctRemaining <= 20 ? "[&>div]:bg-red-500" : pctRemaining <= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-green-500")}
                                                                />
                                                                <span className="text-xs tabular-nums w-10 text-right">{Math.round(pctRemaining)}%</span>
                                                            </div>
                                                        </div>
                                                        <div className="col-span-2 text-center">
                                                            {lot.expiry_date ? (
                                                                <Badge variant="outline" className={cn(
                                                                    "text-xs",
                                                                    isExpired ? "border-red-300 text-red-700 bg-red-50" :
                                                                        isExpiringSoon ? "border-amber-300 text-amber-700 bg-amber-50" :
                                                                            "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                                                                )}>
                                                                    {isExpired ? 'Hết hạn' : isExpiringSoon ? `${daysUntilExpiry}d` : new Date(lot.expiry_date).toLocaleDateString('vi-VN')}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                                                            )}
                                                        </div>
                                                        <div className="col-span-1 text-right">
                                                            <p className="font-medium text-sm tabular-nums">{formatCurrency(lot.unit_cost)}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* FIFO Suggestion Panel */}
                        {fifoItemId && (
                            <Card className="border-indigo-200 bg-indigo-50/30">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <IconArrowsExchange className="h-5 w-5 text-indigo-600" />
                                                Đề xuất FIFO — {allItems.find(i => i.id === fifoItemId)?.name || 'Sản phẩm'}
                                            </CardTitle>
                                            <CardDescription>
                                                Tổng khả dụng: <span className="font-semibold">{formatNumber(fifoData?.total_available || 0)}</span> đvt
                                                {' · '}{fifoData?.lot_count || 0} lot(s)
                                            </CardDescription>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => { setFifoItemId(''); setFifoQty(''); }}>
                                            <IconX className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {/* FIFO Lots Order */}
                                    <div className="space-y-3">
                                        {/* Allocation Input */}
                                        <div className="flex items-end gap-3 p-3 bg-white rounded-lg border">
                                            <div className="flex-1">
                                                <Label className="text-xs text-gray-500 dark:text-gray-400">Số lượng cần xuất</Label>
                                                <Input
                                                    type="number" min={0} step="any"
                                                    value={fifoQty}
                                                    onChange={(e) => setFifoQty(e.target.value)}
                                                    placeholder="Nhập SL để xem phân bổ FIFO"
                                                    className="mt-1"
                                                />
                                            </div>
                                            {fifoData?.allocation && (
                                                <div className="text-right">
                                                    {fifoData.allocation.shortfall > 0 ? (
                                                        <Badge className="bg-red-100 text-red-700">Thiếu {formatNumber(fifoData.allocation.shortfall)}</Badge>
                                                    ) : (
                                                        <Badge className="bg-green-100 text-green-700">Đủ hàng ✓</Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* FIFO Order Table */}
                                        {fifoData && fifoData.lots.length > 0 ? (
                                            <div className="border rounded-lg overflow-hidden bg-white">
                                                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400 border-b">
                                                    <div className="col-span-1 text-center">#</div>
                                                    <div className="col-span-3">Lot Number</div>
                                                    <div className="col-span-2 text-center">Còn lại</div>
                                                    <div className="col-span-2 text-center">Nhập ngày</div>
                                                    <div className="col-span-2 text-center">HSD</div>
                                                    <div className="col-span-2 text-right">Lấy ra</div>
                                                </div>
                                                <div className="divide-y">
                                                    {fifoData.lots.map((lot, idx) => {
                                                        const alloc = fifoData.allocation?.lots_to_use?.find(a => a.lot_id === lot.lot_id);
                                                        return (
                                                            <div key={lot.lot_id} className={cn(
                                                                "grid grid-cols-12 gap-2 px-4 py-2.5 items-center text-sm",
                                                                alloc && "bg-indigo-50"
                                                            )}>
                                                                <div className="col-span-1 text-center">
                                                                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{idx + 1}</span>
                                                                </div>
                                                                <div className="col-span-3">
                                                                    <p className="font-mono font-medium">{lot.lot_number}</p>
                                                                </div>
                                                                <div className="col-span-2 text-center tabular-nums">
                                                                    {formatNumber(lot.remaining_quantity)}
                                                                </div>
                                                                <div className="col-span-2 text-center text-xs text-gray-500 dark:text-gray-400">
                                                                    {new Date(lot.received_date).toLocaleDateString('vi-VN')}
                                                                </div>
                                                                <div className="col-span-2 text-center">
                                                                    {lot.expiry_date ? (
                                                                        <span className="text-xs">{new Date(lot.expiry_date).toLocaleDateString('vi-VN')}</span>
                                                                    ) : '—'}
                                                                </div>
                                                                <div className="col-span-2 text-right">
                                                                    {alloc ? (
                                                                        <span className="font-semibold text-indigo-700 tabular-nums">{formatNumber(alloc.quantity)}</span>
                                                                    ) : (
                                                                        <span className="text-gray-300 dark:text-gray-600">—</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                                                Không có lot FIFO nào cho sản phẩm này
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Create Lot Dialog */}
                        <Dialog open={showCreateLot} onOpenChange={setShowCreateLot}>
                            <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>Tạo Lot mới</DialogTitle>
                                    <DialogDescription>Nhập thông tin lô hàng nhập kho</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-2">
                                    <div>
                                        <Label>Sản phẩm <span className="text-red-500">*</span></Label>
                                        <Select value={lotForm.item_id} onValueChange={(v) => setLotForm(f => ({ ...f, item_id: v }))}>
                                            <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn sản phẩm..." /></SelectTrigger>
                                            <SelectContent>
                                                {allItems.map(item => (
                                                    <SelectItem key={item.id} value={item.id}>{item.name} ({item.sku})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Lot Number <span className="text-red-500">*</span></Label>
                                            <Input className="mt-1" value={lotForm.lot_number} onChange={(e) => setLotForm(f => ({ ...f, lot_number: e.target.value }))} placeholder="VD: LOT-2026-001" />
                                        </div>
                                        <div>
                                            <Label>Batch Code</Label>
                                            <Input className="mt-1" value={lotForm.batch_code} onChange={(e) => setLotForm(f => ({ ...f, batch_code: e.target.value }))} placeholder="Mã lô (tùy chọn)" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Số lượng <span className="text-red-500">*</span></Label>
                                            <Input className="mt-1" type="number" step="any" min={0} value={lotForm.initial_quantity} onChange={(e) => setLotForm(f => ({ ...f, initial_quantity: e.target.value }))} placeholder="0" />
                                        </div>
                                        <div>
                                            <Label>Giá vốn/đvt</Label>
                                            <Input className="mt-1" type="number" step="any" min={0} value={lotForm.unit_cost} onChange={(e) => setLotForm(f => ({ ...f, unit_cost: e.target.value }))} placeholder="0" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Ngày sản xuất</Label>
                                            <Input className="mt-1" type="date" value={lotForm.manufacture_date} onChange={(e) => setLotForm(f => ({ ...f, manufacture_date: e.target.value }))} />
                                        </div>
                                        <div>
                                            <Label>Hạn sử dụng</Label>
                                            <Input className="mt-1" type="date" value={lotForm.expiry_date} onChange={(e) => setLotForm(f => ({ ...f, expiry_date: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Ghi chú</Label>
                                        <Textarea className="mt-1" value={lotForm.notes} onChange={(e) => setLotForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ghi chú thêm..." rows={2} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowCreateLot(false)}>Hủy</Button>
                                    <Button
                                        onClick={handleCreateLot}
                                        disabled={createLot.isPending || !lotForm.item_id || !lotForm.lot_number || !lotForm.initial_quantity}
                                        className="bg-gradient-to-r from-pink-600 to-purple-700 text-white"
                                    >
                                        {createLot.isPending ? 'Đang tạo...' : 'Tạo Lot'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </TabsContent>

                    {/* ========== TAB: ALERTS ========== */}
                    <TabsContent value="alerts" className="mt-4 space-y-4">
                        {/* Success Banner — shown after auto-reorder */}
                        <AnimatePresence>
                            {lastReorderResult && lastReorderResult.success && (
                                <motion.div
                                    initial={{ opacity: 0, y: -12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -12 }}
                                    className="rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-full bg-green-100">
                                            <IconCircleCheck className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-green-800">Đã tạo đơn mua hàng tự động!</p>
                                            <div className="mt-2 grid grid-cols-3 gap-3">
                                                <div className="bg-white/70 rounded-lg p-2.5 text-center">
                                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mã đơn</p>
                                                    <p className="font-bold text-sm text-green-700 mt-0.5">{lastReorderResult.pr_code}</p>
                                                </div>
                                                <div className="bg-white/70 rounded-lg p-2.5 text-center">
                                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sản phẩm</p>
                                                    <p className="font-bold text-sm text-green-700 mt-0.5">{lastReorderResult.items_count} items</p>
                                                </div>
                                                <div className="bg-white/70 rounded-lg p-2.5 text-center">
                                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tổng giá trị</p>
                                                    <p className="font-bold text-sm text-green-700 mt-0.5">{formatCurrency(lastReorderResult.total_amount)}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex gap-2">
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => router.push('/procurement')}
                                                >
                                                    <IconExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                                    Xem Đơn mua hàng
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-green-700 hover:text-green-800"
                                                    onClick={() => setLastReorderResult(null)}
                                                >
                                                    Đóng
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Error Banner — shown when auto-reorder fails */}
                        <AnimatePresence>
                            {lastReorderResult && !lastReorderResult.success && (
                                <motion.div
                                    initial={{ opacity: 0, y: -12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -12 }}
                                    className="rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 p-4"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-full bg-red-100">
                                            <IconInfoCircle className="h-5 w-5 text-red-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-red-800">Không thể tạo đơn mua hàng</p>
                                            <p className="text-sm text-red-600 mt-1">{lastReorderResult.message}</p>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-700 hover:text-red-800 mt-2"
                                                onClick={() => setLastReorderResult(null)}
                                            >
                                                Đóng
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <Card>
                            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">Cảnh báo tồn kho</CardTitle>
                                    {lowStock && (
                                        <CardDescription>
                                            {lowStock.critical_count} nguy cấp • {lowStock.warning_count} cảnh báo • {lowStock.low_count} thấp
                                        </CardDescription>
                                    )}
                                </div>
                                <Button
                                    variant="outline" size="sm"
                                    disabled={alertsList.length === 0 || autoReorder.isPending || alertsList.every(a => reorderedItemIds.has(a.item_id))}
                                    onClick={() => setShowReorderConfirm(true)}
                                >
                                    <IconTruckDelivery className="mr-2 h-4 w-4" />
                                    {autoReorder.isPending ? 'Đang xử lý...' : alertsList.every(a => reorderedItemIds.has(a.item_id)) ? 'Đã yêu cầu tất cả' : 'Tự động đặt hàng'}
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {alertsLoading ? (
                                    <div className="space-y-2">
                                        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                                    </div>
                                ) : alertsList.length === 0 ? (
                                    <div className="text-center py-12">
                                        <IconCheck className="mx-auto h-12 w-12 text-green-300" />
                                        <p className="mt-4 text-gray-500 dark:text-gray-400">Không có cảnh báo nào</p>
                                        <p className="text-sm text-gray-400 dark:text-gray-500">Tất cả sản phẩm đều đủ hàng</p>
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {alertsList.map((alert: LowStockItem) => {
                                            const stockPct = alert.min_stock > 0
                                                ? Math.min(100, (alert.current_stock / alert.min_stock) * 100)
                                                : 0;
                                            return (
                                                <div key={alert.item_id} className="flex items-center gap-4 py-3.5">
                                                    <div className={cn(
                                                        'p-2 rounded-lg shrink-0',
                                                        alert.status === 'CRITICAL' ? 'bg-red-100' :
                                                            alert.status === 'WARNING' ? 'bg-amber-100' : 'bg-yellow-50'
                                                    )}>
                                                        <IconAlertTriangle className={cn(
                                                            'h-4 w-4',
                                                            alert.status === 'CRITICAL' ? 'text-red-600' :
                                                                alert.status === 'WARNING' ? 'text-amber-600' : 'text-yellow-600'
                                                        )} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="font-medium text-sm truncate">{alert.name}</p>
                                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">{alert.sku}</span>
                                                            {reorderedItemIds.has(alert.item_id) && (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 shrink-0">
                                                                    <IconCircleCheck className="h-3 w-3" />
                                                                    Đã yêu cầu MH
                                                                </span>
                                                            )}
                                                        </div>
                                                        {/* Stock Health Mini-Bar */}
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden max-w-[120px]">
                                                                <div
                                                                    className={cn(
                                                                        'h-full rounded-full transition-all',
                                                                        alert.status === 'CRITICAL' ? 'bg-red-500' :
                                                                            alert.status === 'WARNING' ? 'bg-amber-500' : 'bg-yellow-500'
                                                                    )}
                                                                    style={{ width: `${stockPct}%` }}
                                                                />
                                                            </div>
                                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
                                                                {formatNumber(alert.current_stock)} / {formatNumber(alert.min_stock)} {alert.uom}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right hidden sm:block shrink-0">
                                                        <p className="text-sm font-medium text-red-600 tabular-nums">
                                                            Thiếu {formatNumber(alert.shortfall)} {alert.uom}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            Đề xuất: {formatNumber(alert.suggested_order_qty)}
                                                        </p>
                                                    </div>
                                                    {reorderedItemIds.has(alert.item_id) ? (
                                                        <Badge variant="outline" className="shrink-0 border-green-300 text-green-700 bg-green-50">
                                                            Đã đặt hàng
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant={alert.status === 'CRITICAL' ? 'destructive' : 'secondary'} className="shrink-0">
                                                            {alert.status === 'CRITICAL' ? 'Hết hàng' : alert.status === 'WARNING' ? 'Sắp hết' : 'Thấp'}
                                                        </Badge>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* ===== EXPIRING LOTS SECTION (FE-2) ===== */}
                        {expiringLots && expiringLots.total_expiring > 0 && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <IconCalendar className="h-5 w-5 text-amber-600" />
                                        Lots sắp hết hạn
                                        <Badge variant="secondary" className="ml-auto">
                                            {expiringLots.total_expiring} lots
                                        </Badge>
                                    </CardTitle>
                                    <CardDescription>
                                        Các lô hàng sẽ hết hạn trong {expiringLots.threshold_days} ngày tới
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="divide-y">
                                        {expiringLots.lots.map((lot: ExpiringLot) => (
                                            <div key={lot.lot_id} className="flex items-center gap-4 py-3">
                                                <div className={cn(
                                                    'p-2 rounded-lg shrink-0',
                                                    lot.status === 'CRITICAL' ? 'bg-red-100' : 'bg-amber-100'
                                                )}>
                                                    <IconCalendar className={cn(
                                                        'h-4 w-4',
                                                        lot.status === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'
                                                    )} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <p className="font-medium text-sm truncate">{lot.item_name}</p>
                                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">{lot.lot_number}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        Còn lại: {formatNumber(lot.remaining_quantity)} •
                                                        HSD: {lot.expiry_date ? new Date(lot.expiry_date).toLocaleDateString('vi-VN') : '—'}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <Badge variant={lot.status === 'CRITICAL' ? 'destructive' : 'secondary'}>
                                                        {lot.days_until_expiry !== null && lot.days_until_expiry <= 0
                                                            ? 'Đã hết hạn'
                                                            : `${lot.days_until_expiry} ngày`}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Confirmation Dialog */}
                        <Dialog open={showReorderConfirm} onOpenChange={setShowReorderConfirm}>
                            <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <IconShoppingCart className="h-5 w-5 text-purple-600" />
                                        Xác nhận tạo đơn mua hàng tự động
                                    </DialogTitle>
                                    <DialogDescription>
                                        Hệ thống sẽ tự động tạo Purchase Requisition cho các sản phẩm dưới mức tồn kho tối thiểu.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-3 space-y-3">
                                    <div className="bg-purple-50 rounded-lg p-3 text-sm">
                                        <p className="font-medium text-purple-800 mb-2">Danh sách sẽ đặt hàng:</p>
                                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                            {alertsList.filter(a => !reorderedItemIds.has(a.item_id)).map((alert: LowStockItem) => (
                                                <div key={alert.item_id} className="flex justify-between text-purple-700">
                                                    <span className="truncate mr-2">{alert.name}</span>
                                                    <span className="tabular-nums font-medium shrink-0">
                                                        {formatNumber(alert.suggested_order_qty)} {alert.uom}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        {reorderedItemIds.size > 0 && alertsList.some(a => reorderedItemIds.has(a.item_id)) && (
                                            <p className="mt-2 text-xs text-purple-500 italic">
                                                * {alertsList.filter(a => reorderedItemIds.has(a.item_id)).length} sản phẩm đã được yêu cầu trước đó, sẽ không đặt lại.
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 rounded-lg p-3">
                                        <span className="text-gray-600 dark:text-gray-400">Tổng sản phẩm:</span>
                                        <span className="font-semibold">{alertsList.length} items</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 rounded-lg p-3">
                                        <span className="text-gray-600 dark:text-gray-400">Tổng giá trị ước tính:</span>
                                        <span className="font-semibold tabular-nums">
                                            {formatCurrency(alertsList.reduce((sum, a) => sum + (a.suggested_order_qty * (a.last_purchase_price || 0)), 0))}
                                        </span>
                                    </div>
                                </div>
                                <DialogFooter className="gap-2">
                                    <Button variant="outline" onClick={() => setShowReorderConfirm(false)}>Hủy</Button>
                                    <Button
                                        className="bg-gradient-to-r from-pink-600 to-purple-700 text-white"
                                        disabled={autoReorder.isPending}
                                        onClick={() => {
                                            const unorderedIds = alertsList
                                                .filter(a => !reorderedItemIds.has(a.item_id))
                                                .map(a => a.item_id);
                                            autoReorder.mutate({ item_ids: unorderedIds }, {
                                                onSuccess: (result) => {
                                                    setLastReorderResult(result);
                                                    if (result.success) {
                                                        setReorderedItemIds(prev => {
                                                            const next = new Set(prev);
                                                            unorderedIds.forEach(id => next.add(id));
                                                            return next;
                                                        });
                                                    }
                                                    setShowReorderConfirm(false);
                                                },
                                                onError: () => {
                                                    setLastReorderResult({
                                                        success: false,
                                                        pr_id: null,
                                                        pr_code: null,
                                                        items_count: 0,
                                                        total_amount: 0,
                                                        message: 'Không thể kết nối đến server. Vui lòng thử lại.',
                                                    });
                                                    setShowReorderConfirm(false);
                                                },
                                            });
                                        }}
                                    >
                                        <IconTruckDelivery className="mr-2 h-4 w-4" />
                                        {autoReorder.isPending ? 'Đang xử lý...' : 'Xác nhận đặt hàng'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </TabsContent>
                </Tabs>
            </motion.div>

            {/* ========== MODAL: CREATE ITEM ========== */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Thêm sản phẩm mới</DialogTitle>
                        <DialogDescription>Điền thông tin sản phẩm nguyên vật liệu</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="create-name">Tên sản phẩm *</Label>
                                <Input id="create-name" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Bột mì..." />
                            </div>
                            <div>
                                <Label htmlFor="create-sku">Mã SKU *</Label>
                                <Input id="create-sku" value={formData.sku} onChange={(e) => setFormData(p => ({ ...p, sku: e.target.value }))} placeholder="BM-001" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="create-uom">Đơn vị tính *</Label>
                                <Input id="create-uom" value={formData.uom} onChange={(e) => setFormData(p => ({ ...p, uom: e.target.value }))} placeholder="kg, lít, cái..." />
                            </div>
                            <div>
                                <Label htmlFor="create-category">Danh mục</Label>
                                <Input id="create-category" value={formData.category} onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))} placeholder="Bột, Gia vị..." />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="create-min-stock">Tồn kho tối thiểu</Label>
                                <Input id="create-min-stock" type="number" value={formData.min_stock} onChange={(e) => setFormData(p => ({ ...p, min_stock: Number(e.target.value) }))} />
                            </div>
                            <div>
                                <Label htmlFor="create-cost">Giá vốn (đ)</Label>
                                <Input id="create-cost" type="number" value={formData.cost_price} onChange={(e) => setFormData(p => ({ ...p, cost_price: Number(e.target.value) }))} />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="create-notes">Ghi chú</Label>
                            <Textarea id="create-notes" value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowCreateModal(false)}>Hủy</Button>
                        <Button
                            onClick={handleSaveItem}
                            disabled={createItem.isPending}
                            className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white"
                        >
                            {createItem.isPending ? 'Đang lưu...' : 'Thêm sản phẩm'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ========== MODAL: EDIT ITEM ========== */}
            <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa sản phẩm</DialogTitle>
                        <DialogDescription>Cập nhật thông tin {editItem?.name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-name">Tên sản phẩm *</Label>
                                <Input id="edit-name" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div>
                                <Label htmlFor="edit-sku">Mã SKU *</Label>
                                <Input id="edit-sku" value={formData.sku} onChange={(e) => setFormData(p => ({ ...p, sku: e.target.value }))} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-uom">Đơn vị tính *</Label>
                                <Input id="edit-uom" value={formData.uom} onChange={(e) => setFormData(p => ({ ...p, uom: e.target.value }))} />
                            </div>
                            <div>
                                <Label htmlFor="edit-category">Danh mục</Label>
                                <Input id="edit-category" value={formData.category} onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-min-stock">Tồn kho tối thiểu</Label>
                                <Input id="edit-min-stock" type="number" value={formData.min_stock} onChange={(e) => setFormData(p => ({ ...p, min_stock: Number(e.target.value) }))} />
                            </div>
                            <div>
                                <Label htmlFor="edit-cost">Giá vốn (đ)</Label>
                                <Input id="edit-cost" type="number" value={formData.cost_price} onChange={(e) => setFormData(p => ({ ...p, cost_price: Number(e.target.value) }))} />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="edit-notes">Ghi chú</Label>
                            <Textarea id="edit-notes" value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setEditItem(null)}>Hủy</Button>
                        <Button
                            onClick={handleSaveItem}
                            disabled={updateItem.isPending}
                            className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white"
                        >
                            {updateItem.isPending ? 'Đang lưu...' : 'Cập nhật'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ========== MODAL: STOCK ADJUST ========== */}
            <Dialog open={!!stockAdjustItem} onOpenChange={() => setStockAdjustItem(null)}>
                <DialogContent className={adjustType === 'EXPORT' ? 'sm:max-w-lg' : 'sm:max-w-md'}>
                    <DialogHeader>
                        <DialogTitle>{adjustType === 'IMPORT' ? 'Nhập kho' : 'Xuất kho'}</DialogTitle>
                        <DialogDescription>
                            {stockAdjustItem?.name} — Tồn hiện tại: {formatNumber(stockAdjustItem?.current_stock ?? 0)} {stockAdjustItem?.uom}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex gap-2">
                            <Button
                                variant={adjustType === 'IMPORT' ? 'default' : 'outline'}
                                className={adjustType === 'IMPORT' ? 'bg-green-600 hover:bg-green-700' : ''}
                                onClick={() => setAdjustType('IMPORT')}
                            >
                                <IconArrowDown className="mr-2 h-4 w-4" />
                                Nhập kho
                            </Button>
                            <Button
                                variant={adjustType === 'EXPORT' ? 'default' : 'outline'}
                                className={adjustType === 'EXPORT' ? 'bg-red-600 hover:bg-red-700' : ''}
                                onClick={() => setAdjustType('EXPORT')}
                            >
                                <IconArrowUp className="mr-2 h-4 w-4" />
                                Xuất kho
                            </Button>
                        </div>

                        {/* Export Reason */}
                        {adjustType === 'EXPORT' && (
                            <div>
                                <Label>Lý do xuất</Label>
                                <Select value={adjustReason} onValueChange={setAdjustReason}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Sản xuất">Sản xuất</SelectItem>
                                        <SelectItem value="Hao hụt">Hao hụt</SelectItem>
                                        <SelectItem value="Chuyển kho">Chuyển kho</SelectItem>
                                        <SelectItem value="Trả hàng">Trả hàng</SelectItem>
                                        <SelectItem value="Khác">Khác</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div>
                            <Label htmlFor="adjust-qty">Số lượng ({stockAdjustItem?.uom})</Label>
                            <Input
                                id="adjust-qty" type="number" min={0} step="any"
                                value={adjustQty}
                                onChange={(e) => setAdjustQty(e.target.value)}
                                placeholder="0"
                            />
                        </div>

                        {/* FIFO Preview (EXPORT only) */}
                        {adjustType === 'EXPORT' && parseFloat(adjustQty) > 0 && exportFifoData?.allocation && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">Lot sẽ bị trừ (FIFO)</Label>
                                    <button
                                        type="button"
                                        className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                                        onClick={() => {
                                            setShowFifoPreview(!showFifoPreview);
                                            if (showFifoPreview) {
                                                // Switching to manual — pre-fill with FIFO suggestion
                                                const suggested = (exportFifoData.allocation?.lots_to_use ?? []).map((l: any) => ({
                                                    lot_id: l.lot_id,
                                                    quantity: l.quantity_to_use,
                                                }));
                                                setManualAllocations(suggested);
                                            }
                                        }}
                                    >
                                        {showFifoPreview ? '✏️ Chọn lot thủ công' : '🔄 Tự động FIFO'}
                                    </button>
                                </div>

                                {showFifoPreview ? (
                                    /* FIFO Auto Preview */
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-800">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-400 font-medium">Lot</th>
                                                    <th className="px-3 py-2 text-right text-xs text-gray-500 dark:text-gray-400 font-medium">Tồn</th>
                                                    <th className="px-3 py-2 text-right text-xs text-gray-500 dark:text-gray-400 font-medium">Sẽ xuất</th>
                                                    <th className="px-3 py-2 text-right text-xs text-gray-500 dark:text-gray-400 font-medium">Còn lại</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {exportFifoData.allocation.lots_to_use.map((lot: any) => (
                                                    <tr key={lot.lot_id} className="hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800">
                                                        <td className="px-3 py-2 font-mono text-xs">{lot.lot_number}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{formatNumber(lot.available)}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums text-red-600 font-medium">-{formatNumber(lot.quantity_to_use)}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{formatNumber(lot.available - lot.quantity_to_use)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {exportFifoData.allocation.shortfall > 0 && (
                                            <div className="px-3 py-2 bg-red-50 text-red-700 text-xs flex items-center gap-1">
                                                <IconAlertTriangle className="h-3.5 w-3.5" />
                                                Thiếu {formatNumber(exportFifoData.allocation.shortfall)} {stockAdjustItem?.uom}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Manual Lot Selection */
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-800">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-400 font-medium">Lot</th>
                                                    <th className="px-3 py-2 text-right text-xs text-gray-500 dark:text-gray-400 font-medium">Tồn</th>
                                                    <th className="px-3 py-2 text-right text-xs text-gray-500 dark:text-gray-400 font-medium">Xuất</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {exportFifoData.allocation.lots_to_use.map((lot: any, idx: number) => (
                                                    <tr key={lot.lot_id} className="hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800">
                                                        <td className="px-3 py-2 font-mono text-xs">{lot.lot_number}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{formatNumber(lot.available)}</td>
                                                        <td className="px-3 py-1.5 text-right">
                                                            <Input
                                                                type="number" min={0} max={lot.available} step="any"
                                                                className="h-7 w-20 text-right text-sm ml-auto"
                                                                value={manualAllocations[idx]?.quantity || ''}
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    setManualAllocations(prev => {
                                                                        const next = [...prev];
                                                                        next[idx] = { lot_id: lot.lot_id, quantity: val };
                                                                        return next;
                                                                    });
                                                                }}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                                            <span>Tổng phân bổ:</span>
                                            <span className={cn(
                                                'font-medium tabular-nums',
                                                manualAllocations.reduce((s, a) => s + (a?.quantity || 0), 0) === parseFloat(adjustQty)
                                                    ? 'text-green-600' : 'text-red-600'
                                            )}>
                                                {formatNumber(manualAllocations.reduce((s, a) => s + (a?.quantity || 0), 0))} / {adjustQty} {stockAdjustItem?.uom}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <Label htmlFor="adjust-notes">Ghi chú</Label>
                            <Input
                                id="adjust-notes"
                                value={adjustNotes}
                                onChange={(e) => setAdjustNotes(e.target.value)}
                                placeholder="Lý do nhập/xuất..."
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setStockAdjustItem(null)}>Hủy</Button>
                        <Button
                            onClick={handleStockAdjust}
                            disabled={(createTransaction.isPending || exportWithLots.isPending) || !adjustQty || parseFloat(adjustQty) <= 0}
                            className={adjustType === 'IMPORT' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                        >
                            {(createTransaction.isPending || exportWithLots.isPending) ? 'Đang xử lý...' : adjustType === 'IMPORT' ? 'Xác nhận nhập' : 'Xác nhận xuất'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            {/* ========== DETAIL DRAWER ========== */}
            <AnimatePresence>
                {detailItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
                        onClick={() => setDetailItem(null)}
                    >
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                            className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Drawer Header */}
                            <div className="sticky top-0 bg-white border-b z-10 p-4 flex items-center justify-between">
                                <div>
                                    <h2 className="font-semibold text-lg">{detailItem.name}</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{detailItem.sku}</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setDetailItem(null)}>
                                    <IconX className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="p-4 space-y-5">
                                {/* Item Info */}
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: 'Danh mục', value: detailItem.category || '—' },
                                        { label: 'Đơn vị', value: detailItem.uom },
                                        { label: 'Giá vốn', value: formatCurrency(detailItem.cost_price) },
                                        { label: 'Giá mua gần nhất', value: formatCurrency(detailItem.latest_purchase_price || detailItem.cost_price) },
                                        { label: 'Tồn tối thiểu', value: `${formatNumber(detailItem.min_stock)} ${detailItem.uom}` },
                                        { label: 'Tồn hiện tại', value: `${formatNumber(detailItem.current_stock)} ${detailItem.uom}` },
                                    ].map((info) => (
                                        <div key={info.label} className="p-3 bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 rounded-lg">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{info.label}</p>
                                            <p className="font-medium text-sm mt-0.5 tabular-nums">{info.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Stock Health Bar */}
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-600 dark:text-gray-400">Sức khỏe tồn kho</span>
                                        <span className={cn(
                                            'font-medium',
                                            detailItem.current_stock <= 0 ? 'text-red-600' :
                                                detailItem.current_stock <= detailItem.min_stock ? 'text-amber-600' : 'text-green-600'
                                        )}>
                                            {detailItem.current_stock <= 0 ? 'Hết hàng' :
                                                detailItem.current_stock <= detailItem.min_stock ? 'Sắp hết' : 'Đủ hàng'}
                                        </span>
                                    </div>
                                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                'h-full rounded-full transition-all duration-500',
                                                detailItem.current_stock <= 0 ? 'bg-red-500' :
                                                    detailItem.current_stock <= detailItem.min_stock ? 'bg-amber-500' : 'bg-green-500'
                                            )}
                                            style={{
                                                width: `${Math.min(100, detailItem.min_stock > 0
                                                    ? (detailItem.current_stock / (detailItem.min_stock * 2)) * 100
                                                    : detailItem.current_stock > 0 ? 100 : 0
                                                )}%`
                                            }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        <span>0</span>
                                        <span>Min: {formatNumber(detailItem.min_stock)}</span>
                                        <span>Target: {formatNumber(detailItem.min_stock * 2)}</span>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                                        setStockAdjustItem(detailItem);
                                        setAdjustType('IMPORT');
                                        setAdjustQty('');
                                        setAdjustNotes('');
                                    }}>
                                        <IconArrowDown className="mr-1.5 h-3.5 w-3.5 text-green-600" /> Nhập kho
                                    </Button>
                                    <Button size="sm" variant="outline" className="flex-1 border-red-200 text-red-700 hover:bg-red-50" onClick={() => {
                                        setStockAdjustItem(detailItem);
                                        setAdjustType('EXPORT');
                                        setAdjustQty('');
                                        setAdjustNotes('');
                                        setAdjustReason('Sản xuất');
                                        setShowFifoPreview(true);
                                        setManualAllocations([]);
                                    }}>
                                        <IconArrowUp className="mr-1.5 h-3.5 w-3.5 text-red-600" /> Xuất kho
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => {
                                        openEditModal(detailItem);
                                        setDetailItem(null);
                                    }}>
                                        <IconEdit className="mr-1.5 h-3.5 w-3.5" /> Sửa
                                    </Button>
                                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => {
                                        setDeleteId(detailItem.id);
                                        setDetailItem(null);
                                    }}>
                                        <IconTrash className="h-3.5 w-3.5" />
                                    </Button>
                                </div>

                                {/* Recent Transactions */}
                                <div>
                                    <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                                        <IconHistory className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                        Lịch sử giao dịch gần đây
                                    </h3>
                                    {!detailTransactions || detailTransactions.length === 0 ? (
                                        <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">Chưa có giao dịch</p>
                                    ) : (
                                        <div className="divide-y">
                                            {detailTransactions.slice(0, 10).map((txn) => (
                                                <div key={txn.id} className="flex items-center gap-3 py-2.5">
                                                    <div className={cn(
                                                        'p-1.5 rounded-md',
                                                        txn.transaction_type === 'IMPORT' ? 'bg-green-100' : 'bg-red-100'
                                                    )}>
                                                        {txn.transaction_type === 'IMPORT' ? (
                                                            <IconArrowDown className="h-3 w-3 text-green-600" />
                                                        ) : (
                                                            <IconArrowUp className="h-3 w-3 text-red-600" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                                            {txn.reference_doc || 'Manual'}
                                                            {txn.notes && ` • ${txn.notes}`}
                                                        </p>
                                                    </div>
                                                    <div className="text-right flex items-center gap-1.5">
                                                        <div>
                                                            <p className={cn(
                                                                'text-sm font-medium tabular-nums',
                                                                txn.transaction_type === 'IMPORT' ? 'text-green-600' : 'text-red-600'
                                                            )}>
                                                                {txn.transaction_type === 'IMPORT' ? '+' : '-'}{formatNumber(txn.quantity)}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                                                {new Date(txn.created_at).toLocaleDateString('vi-VN')}
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="p-1 rounded hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 dark:text-gray-600 transition-colors"
                                                            onClick={(e) => { e.stopPropagation(); handleDownloadReceiptPdf(txn.id); }}
                                                            title="Tải phiếu PDF"
                                                        >
                                                            <IconPrinter className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Notes */}
                                {detailItem.notes && (
                                    <div className="p-3 bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 rounded-lg">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ghi chú</p>
                                        <p className="text-sm">{detailItem.notes}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa</DialogTitle>
                        <DialogDescription>Bạn có chắc chắn muốn xóa sản phẩm này? Hành động này không thể hoàn tác.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Hủy</Button>
                        <Button
                            variant="destructive"
                            disabled={deleteItem.isPending}
                            onClick={() => deleteId && deleteItem.mutate(deleteId, {
                                onSuccess: () => setDeleteId(null),
                            })}
                        >
                            {deleteItem.isPending ? 'Đang xóa...' : 'Xóa'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Professional Export Dialog */}
            <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                onExport={handleExport}
                defaultFilename={exportConfig.filename}
                title="Xuất báo cáo Tồn kho"
                isExporting={isExporting}
            />
        </div>
    );
}
