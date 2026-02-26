'use client';

import { PermissionGate } from '@/components/shared/PermissionGate';
import { useTabPersistence } from '@/hooks/useTabPersistence';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useReportExport, type ExportFormat, type ExportConfig } from '@/hooks/use-report-export';
import { ExportDialog } from '@/components/analytics/export-dialog';
import type { ReportSheet, KpiCard, ColumnDef } from '@/lib/excel-report-engine';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from '@/components/ui/dialog';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatNumber } from '@/lib/utils';
import {
 IconSearch,
 IconUsers,
 IconTrendingUp,
 IconHeart,
 IconStar,
 IconStarFilled,
 IconRefresh,
 IconDotsVertical,
 IconPhone,
 IconMail,
 IconEdit,
 IconPlus,
 IconTrash,
 IconDownload,
 IconAlertTriangle,
 IconCalendarEvent,
 IconChartBar,
 IconUserPlus,
 IconShieldCheck,
 IconNote,
 IconCake,
 IconSend,
 IconGift,
} from '@tabler/icons-react';
import { CustomerDetailModal } from './customer-detail-modal';
import {
 useCustomers,
 useCrmStats,
 useCreateCustomer,
 useUpdateCustomer,
 useDeleteCustomer,
 useRetentionStats,
 useUpcomingBirthdays,
 useCustomerGrowth,
 useSendCampaign,
 CustomerData,
 CustomerCreateInput,
} from '@/hooks/use-customers';

// ========== CONSTANTS ==========
const loyaltyColors: Record<string, string> = {
 bronze: 'bg-amber-100 text-amber-700',
 silver: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
 gold: 'bg-yellow-100 text-yellow-700',
 platinum: 'bg-accent-100 text-accent-strong',
};

const customerTypeLabels: Record<string, { label: string; color: string }> = {
 VIP: { label: 'VIP', color: 'bg-accent-100 text-accent-strong' },
 LOYAL: { label: 'Thân thiết', color: 'bg-green-100 text-green-700' },
 REGULAR: { label: 'Thông thường', color: 'bg-blue-100 text-blue-700' },
 NEW: { label: 'Mới', color: 'bg-teal-100 text-teal-700' },
 CHURN_RISK: { label: 'Nguy cơ', color: 'bg-orange-100 text-orange-700' },
 LOST: { label: 'Mất', color: 'bg-red-100 text-red-700' },
};

const sourceLabels: Record<string, string> = {
 FACEBOOK: 'Facebook',
 ZALO: 'Zalo',
 GOOGLE: 'Google',
 REFERRAL: 'Giới thiệu',
 WALK_IN: 'Tự đến',
 PHONE: 'Điện thoại',
 OTHER: 'Khác',
};

const emptyForm: CustomerCreateInput & { birthday?: string } = {
 full_name: '',
 phone: '',
 email: '',
 address: '',
 source: '',
 notes: '',
 customer_type: 'REGULAR',
 birthday: '',
};

const CRM_TABS = ['list', 'analytics', 'retention'] as const;

// ========== COMPONENT ==========
export default function CrmPage() {
 // State
 const [search, setSearch] = useState('');
 const [typeFilter, setTypeFilter] = useState<string | undefined>();
 const [selectedIds, setSelectedIds] = useState<string[]>([]);
 const [starredIds, setStarredIds] = useState<string[]>([]);
 const [hoveredId, setHoveredId] = useState<string | null>(null);
 const { activeTab, handleTabChange } = useTabPersistence(CRM_TABS, 'list');

 // Modals
 const [createOpen, setCreateOpen] = useState(false);
 const [editOpen, setEditOpen] = useState(false);
 const [deleteOpen, setDeleteOpen] = useState(false);
 const [editingCustomer, setEditingCustomer] = useState<CustomerData | null>(null);
 const [deletingCustomer, setDeletingCustomer] = useState<CustomerData | null>(null);
 const [formData, setFormData] = useState<CustomerCreateInput & { birthday?: string }>(emptyForm);
 const [exportOpen, setExportOpen] = useState(false);

 // Detail Modal
 const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
 const [modalOpen, setModalOpen] = useState(false);

 // Campaign state
 const [campaignTemplate, setCampaignTemplate] = useState('MISS_YOU');
 const [campaignChannel, setCampaignChannel] = useState('ZALO');

 // Helper to update form fields
 const updateField = <K extends keyof (CustomerCreateInput & { birthday?: string })>(
 field: K,
 value: (CustomerCreateInput & { birthday?: string })[K],
 ) => {
 setFormData(prev => ({ ...prev, [field]: value }));
 };

 // Data
 const { data: customers, isLoading, refetch } = useCustomers(search, typeFilter);
 const { data: stats } = useCrmStats();
 const { data: retention } = useRetentionStats();
 const { data: birthdays } = useUpcomingBirthdays(30);
 const { data: growthData } = useCustomerGrowth(6);
 const createMutation = useCreateCustomer();
 const updateMutation = useUpdateCustomer();
 const deleteMutation = useDeleteCustomer();
 const campaignMutation = useSendCampaign();
 const { isExporting, exportData } = useReportExport();

 const customerList = useMemo(() => customers || [], [customers]);
 const birthdayList = useMemo(() => birthdays || [], [birthdays]);
 const growthStats = useMemo(() => growthData || [], [growthData]);
 const maxGrowth = useMemo(() => Math.max(...growthStats.map(g => g.count), 1), [growthStats]);

 // Handlers
 const openCustomerDetail = (id: string) => {
 setSelectedCustomerId(id);
 setModalOpen(true);
 };

 const handleSendCampaign = async () => {
 const atRiskIds = customerList
 .filter(c => ['CHURN_RISK', 'LOST'].includes(c.customer_type || ''))
 .map(c => c.id);
 if (atRiskIds.length === 0) return;
 await campaignMutation.mutateAsync({
 customer_ids: atRiskIds,
 template_id: campaignTemplate,
 channel: campaignChannel,
 });
 };

 const toggleSelect = (id: string) => {
 setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
 };

 const toggleSelectAll = () => {
 if (selectedIds.length === customerList.length) {
 setSelectedIds([]);
 } else {
 setSelectedIds(customerList.map(c => c.id));
 }
 };

 const toggleStar = (id: string, e: React.MouseEvent) => {
 e.stopPropagation();
 setStarredIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
 };

 const openCreate = () => {
 setFormData(emptyForm);
 setCreateOpen(true);
 };

 const openEdit = (customer: CustomerData, e: React.MouseEvent) => {
 e.stopPropagation();
 setEditingCustomer(customer);
 setFormData({
 full_name: customer.full_name,
 phone: customer.phone || '',
 email: customer.email || '',
 address: customer.address || '',
 source: customer.source || '',
 notes: customer.notes || '',
 customer_type: customer.customer_type || 'REGULAR',
 birthday: (customer as CustomerData & { birthday?: string }).birthday || '',
 });
 setEditOpen(true);
 };

 const openDelete = (customer: CustomerData, e: React.MouseEvent) => {
 e.stopPropagation();
 setDeletingCustomer(customer);
 setDeleteOpen(true);
 };

 const handleCreate = async () => {
 if (!formData.full_name.trim()) return;
 await createMutation.mutateAsync(formData);
 setCreateOpen(false);
 };

 const handleUpdate = async () => {
 if (!editingCustomer || !formData.full_name.trim()) return;
 await updateMutation.mutateAsync({ id: editingCustomer.id, data: formData });
 setEditOpen(false);
 };

 const handleDelete = async () => {
 if (!deletingCustomer) return;
 await deleteMutation.mutateAsync(deletingCustomer.id);
 setDeleteOpen(false);
 };

 const exportCSV = () => {
 // Legacy function kept for reference, replaced by professional export
 setExportOpen(true);
 };

 // ========== PROFESSIONAL EXPORT CONFIG ==========
 const col = (key: string, header: string, opts: Partial<ColumnDef> = {}): ColumnDef => ({
 key, header, format: 'text', ...opts,
 });

 const totalSpent = customerList.reduce((sum, c) => sum + (c.total_spent || 0), 0);

 const crmExportConfig = useMemo((): ExportConfig => {
 const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

 const kpiCards: KpiCard[] = [
 { label: 'TỔNG KHÁCH HÀNG', value: stats?.total_customers || customerList.length, format: 'number', trend: 0, trendLabel: '', bgColor: 'E3F2FD', valueColor: '1565C0', icon: '👥' },
 { label: 'VIP', value: stats?.vip_customers || 0, format: 'number', trend: 0, trendLabel: '', bgColor: 'F3E5F5', valueColor: '7B1FA2', icon: '👑' },
 { label: 'MỚI THÁNG NÀY', value: stats?.new_this_month || 0, format: 'number', trend: 0, trendLabel: '', bgColor: 'E8F5E9', valueColor: '1B7D3A', icon: '🆕' },
 { label: 'TỔNG CHI TIÊU', value: totalSpent, format: 'currency', trend: 0, trendLabel: '', bgColor: 'FFF3E0', valueColor: 'E65100', icon: '💰' },
 ];

 const dataRows = customerList.map(c => ({
 full_name: c.full_name,
 phone: c.phone || '',
 email: c.email || '',
 source: sourceLabels[c.source || ''] || c.source || '',
 customer_type: customerTypeLabels[c.customer_type || '']?.label || c.customer_type || '',
 loyalty_tier: c.loyalty_tier || '',
 loyalty_points: c.loyalty_points || 0,
 order_count: c.order_count || 0,
 total_spent: c.total_spent || 0,
 avg_rating: c.avg_rating || 0,
 }));

 const sheets: ReportSheet[] = [{
 name: 'Khách hàng',
 title: 'Báo cáo Danh sách Khách hàng',
 subtitle: `Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}`,
 kpiCards,
 columns: [
 col('full_name', 'Họ tên', { width: 24 }),
 col('phone', 'SĐT', { width: 14 }),
 col('email', 'Email', { width: 24 }),
 col('source', 'Nguồn', { width: 14 }),
 col('customer_type', 'Loại KH', { format: 'status', width: 14 }),
 col('loyalty_tier', 'Hạng thẻ', { width: 12 }),
 col('loyalty_points', 'Điểm', { format: 'number', width: 10, summaryFn: 'sum' }),
 col('order_count', 'Số đơn', { format: 'number', width: 10, summaryFn: 'sum' }),
 col('total_spent', 'Tổng chi', { format: 'currency', width: 20, summaryFn: 'sum' }),
 col('avg_rating', 'Đánh giá', { format: 'number', width: 10 }),
 ],
 data: dataRows,
 summaryRow: true,
 }];

 return {
 title: 'Báo cáo Khách hàng',
 columns: [
 { key: 'full_name', header: 'Họ tên' },
 { key: 'phone', header: 'SĐT' },
 { key: 'email', header: 'Email' },
 { key: 'source', header: 'Nguồn' },
 { key: 'customer_type', header: 'Loại KH' },
 { key: 'loyalty_tier', header: 'Hạng thẻ' },
 { key: 'order_count', header: 'Số đơn' },
 { key: 'total_spent', header: 'Tổng chi', format: (v) => formatCurrency(v as number) },
 ],
 data: dataRows,
 filename: `bao-cao-khach-hang_${today}`,
 sheets,
 };
 }, [customerList, stats, totalSpent]);

 const handleExport = async (format: ExportFormat, filename: string) => {
 const config = { ...crmExportConfig, filename };
 await exportData(format, config);
 };

 // ========== Stats Cards ==========
 const statCards = [
 { label: 'Tổng KH', value: stats?.total_customers || 0, icon: IconUsers, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
 { label: 'VIP', value: stats?.vip_customers || 0, icon: IconShieldCheck, bgColor: 'bg-accent-50', iconColor: 'text-accent-primary' },
 { label: 'Thân thiết', value: stats?.loyal_customers || 0, icon: IconHeart, bgColor: 'bg-green-50', iconColor: 'text-green-600' },
 { label: 'Mới tháng này', value: stats?.new_this_month || 0, icon: IconUserPlus, bgColor: 'bg-teal-50', iconColor: 'text-teal-600' },
 { label: 'Nguy cơ rời', value: stats?.churn_risk || 0, icon: IconAlertTriangle, bgColor: 'bg-red-50', iconColor: 'text-red-600' },
 ];

 // ========== Type Filter Chips ==========
 const typeChips = [
 { label: 'Tất cả', value: undefined },
 { label: 'VIP', value: 'VIP' },
 { label: 'Thân thiết', value: 'LOYAL' },
 { label: 'Thông thường', value: 'REGULAR' },
 { label: 'Nguy cơ', value: 'CHURN_RISK' },
 { label: 'Mất', value: 'LOST' },
 ];

 // ========== RENDER ==========
 return (
 <>
 <div className="space-y-4">
 {/* Header */}
 <motion.div
 className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 >
 <div>
 <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">CRM - Quản lý khách hàng</h1>
 <p className="text-sm text-gray-500 dark:text-gray-400">Quản lý quan hệ khách hàng</p>
 </div>
 <div className="flex gap-2">
 <Button variant="outline" size="sm" onClick={() => setExportOpen(true)} className="gap-1.5 border-gray-300 hover:border-[#c2185b] hover:text-[#c2185b] transition-colors">
 <IconDownload className="mr-1 h-4 w-4" />
 Xuất báo cáo
 </Button>
 <PermissionGate module="crm" action="create">
 <Button
 className="bg-accent-gradient"
 onClick={openCreate}
 >
 <IconPlus className="mr-2 h-4 w-4" />
 Thêm khách hàng
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
 {statCards.map((stat, i) => (
 <Card key={i} className="hover:shadow-sm transition-shadow">
 <CardContent className="p-3 md:p-4">
 <div className="flex items-center gap-2 md:gap-3">
 <div className={`p-1.5 md:p-2 rounded-lg ${stat.bgColor}`}>
 <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.iconColor}`} />
 </div>
 <div>
 <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
 <p className="text-base md:text-lg font-bold">{formatNumber(stat.value)}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </motion.div>

 {/* Tab Header */}
 <div className="flex items-center gap-1 border-b">
 {[
 { key: 'list' as const, label: 'Danh sách', icon: IconUsers },
 { key: 'analytics' as const, label: 'Phân tích', icon: IconChartBar },
 { key: 'retention' as const, label: 'Giữ chân', icon: IconAlertTriangle },
 ].map(tab => (
 <button
 key={tab.key}
 onClick={() => handleTabChange(tab.key)}
 className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key
 ? 'border-accent-strong text-accent-primary'
 : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300 dark:text-gray-600'
 }`}
 >
 <tab.icon className="h-4 w-4" />
 {tab.label}
 </button>
 ))}
 </div>

 {/* ========== TAB: LIST ========== */}
 {activeTab === 'list' && (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 >
 <Card className="overflow-hidden">
 {/* Toolbar */}
 <div className="flex flex-col md:flex-row md:items-center gap-2 p-2 md:p-3 border-b bg-gray-50 dark:bg-gray-900/50 dark:bg-gray-800/50">
 <div className="flex items-center gap-2">
 <Checkbox
 checked={customerList.length > 0 && selectedIds.length === customerList.length}
 onCheckedChange={toggleSelectAll}
 className="ml-1"
 />
 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
 <IconRefresh className="h-4 w-4" />
 </Button>
 </div>

 {/* Type Chips */}
 <div className="flex gap-1 flex-wrap flex-1">
 {typeChips.map(chip => (
 <button
 key={chip.value || 'all'}
 onClick={() => setTypeFilter(chip.value)}
 className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${typeFilter === chip.value
 ? 'bg-accent-100 text-accent-strong'
 : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700'
 }`}
 >
 {chip.label}
 </button>
 ))}
 </div>

 <div className="relative w-full md:w-64">
 <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
 <Input
 placeholder="Tìm kiếm..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-9 h-8 text-sm"
 />
 </div>
 </div>

 {/* List */}
 <div className="divide-y">
 {isLoading ? (
 <div className="p-4 space-y-2">
 {[1, 2, 3, 4, 5].map((i) => (
 <Skeleton key={i} className="h-16 w-full" />
 ))}
 </div>
 ) : customerList.length === 0 ? (
 <div className="text-center py-16">
 <IconUsers className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
 <p className="mt-4 text-gray-500 dark:text-gray-400">Chưa có khách hàng nào</p>
 <PermissionGate module="crm" action="create">
 <Button className="mt-4" variant="outline" size="sm" onClick={openCreate}>
 <IconPlus className="mr-2 h-4 w-4" />
 Thêm khách hàng
 </Button>
 </PermissionGate>
 </div>
 ) : (
 customerList.map((customer) => (
 <div
 key={customer.id}
 className={`
 flex items-center gap-2 md:gap-4 px-2 md:px-4 py-3 
 cursor-pointer transition-colors
 ${selectedIds.includes(customer.id) ? 'bg-blue-50' : 'hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800'}
 `}
 onMouseEnter={() => setHoveredId(customer.id)}
 onMouseLeave={() => setHoveredId(null)}
 onClick={() => openCustomerDetail(customer.id)}
 >
 <Checkbox
 checked={selectedIds.includes(customer.id)}
 onCheckedChange={() => toggleSelect(customer.id)}
 onClick={(e) => e.stopPropagation()}
 />

 <button onClick={(e) => toggleStar(customer.id, e)} className="p-1 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded">
 {starredIds.includes(customer.id) ? (
 <IconStarFilled className="h-4 w-4 text-amber-400" />
 ) : (
 <IconStar className="h-4 w-4 text-gray-400 dark:text-gray-500 hover:text-amber-400" />
 )}
 </button>

 {/* Avatar */}
 <div className="h-8 w-8 rounded-full bg-accent-gradient-br to-purple-500 flex items-center justify-center text-white font-medium text-sm shrink-0">
 {customer.full_name?.charAt(0) || 'K'}
 </div>

 {/* Content */}
 <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-4">
 <div className="w-28 md:w-40 truncate">
 <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{customer.full_name}</span>
 </div>

 <div className="flex-1 min-w-0 flex items-center gap-2">
 {customer.customer_type && customerTypeLabels[customer.customer_type] && (
 <Badge className={`${customerTypeLabels[customer.customer_type].color} text-xs px-1.5 py-0.5 shrink-0`}>
 {customerTypeLabels[customer.customer_type].label}
 </Badge>
 )}
 {customer.loyalty_tier && (
 <Badge className={`${loyaltyColors[customer.loyalty_tier.toLowerCase()] || 'bg-gray-100 dark:bg-gray-800'} text-xs px-1.5 py-0.5 shrink-0`}>
 {customer.loyalty_tier}
 </Badge>
 )}
 {customer.source && (
 <span className="text-xs text-gray-400 dark:text-gray-500 hidden lg:inline">
 {sourceLabels[customer.source] || customer.source}
 </span>
 )}
 <span className="text-sm text-gray-500 dark:text-gray-400 truncate hidden sm:inline">
 {customer.phone}
 </span>
 </div>

 {/* Orders & Spent */}
 <div className="text-right shrink-0 hidden md:block">
 <span className="text-xs text-gray-500 dark:text-gray-400">{customer.order_count || 0} đơn</span>
 </div>
 <div className="text-right shrink-0">
 <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
 {formatCurrency(customer.total_spent || 0)}
 </span>
 </div>
 </div>

 {/* Actions */}
 <div className={`
 flex items-center gap-0.5 shrink-0
 ${hoveredId === customer.id ? 'opacity-100' : 'opacity-0'}
 transition-opacity
 `}>
 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); }}>
 <IconPhone className="h-4 w-4" />
 </Button>
 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); }}>
 <IconMail className="h-4 w-4" />
 </Button>
 <PermissionGate module="crm" action="edit">
 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => openEdit(customer, e)}>
 <IconEdit className="h-4 w-4" />
 </Button>
 </PermissionGate>
 <PermissionGate module="crm" action="delete">
 <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={(e) => openDelete(customer, e)}>
 <IconTrash className="h-4 w-4" />
 </Button>
 </PermissionGate>
 </div>

 <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden" onClick={(e) => e.stopPropagation()}>
 <IconDotsVertical className="h-4 w-4" />
 </Button>
 </div>
 ))
 )}
 </div>

 {/* Footer */}
 {customerList.length > 0 && (
 <div className="flex items-center justify-between p-3 border-t bg-gray-50 dark:bg-gray-900/50 dark:bg-gray-800/50 text-sm text-gray-500 dark:text-gray-400">
 <span>{selectedIds.length > 0 ? `${selectedIds.length} đã chọn` : `${customerList.length} khách hàng`}</span>
 <span>Trang 1 / 1</span>
 </div>
 )}
 </Card>
 </motion.div>
 )}

 {/* ========== TAB: ANALYTICS ========== */}
 {activeTab === 'analytics' && (
 <motion.div
 className="space-y-4"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 >
 {/* Growth Trend Chart */}
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-base flex items-center gap-2">
 <IconTrendingUp className="h-4 w-4 text-accent-primary" />
 Tăng trưởng khách hàng (6 tháng)
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="flex items-end gap-2 h-32">
 {growthStats.map((g, i) => (
 <div key={i} className="flex-1 flex flex-col items-center gap-1">
 <span className="text-xs font-semibold text-accent-primary">{g.count}</span>
 <div
 className="w-full bg-accent-gradient to-pink-400 rounded-t-md transition-all duration-500"
 style={{ height: `${Math.max((g.count / maxGrowth) * 100, 4)}%` }}
 />
 <span className="text-[10px] text-gray-500 dark:text-gray-400">{g.month.split('/')[0]}</span>
 </div>
 ))}
 </div>
 </CardContent>
 </Card>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Customer Type Distribution */}
 <Card>
 <CardHeader>
 <CardTitle className="text-base">Phân bố loại khách hàng</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-3">
 {Object.entries(customerTypeLabels).map(([type, info]) => {
 const count = customerList.filter(c => c.customer_type === type).length;
 const pct = customerList.length > 0 ? Math.round((count / customerList.length) * 100) : 0;
 return (
 <div key={type} className="flex items-center gap-3">
 <Badge className={`${info.color} text-xs w-24 justify-center`}>{info.label}</Badge>
 <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2.5">
 <div
 className="bg-accent-solid h-2.5 rounded-full transition-all"
 style={{ width: `${pct}%` }}
 />
 </div>
 <span className="text-sm font-medium w-16 text-right">{count} ({pct}%)</span>
 </div>
 );
 })}
 </div>
 </CardContent>
 </Card>

 {/* Top Spenders */}
 <Card>
 <CardHeader>
 <CardTitle className="text-base">Top khách hàng chi tiêu</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-2">
 {[...customerList]
 .sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))
 .slice(0, 5)
 .map((c, i) => (
 <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 cursor-pointer" onClick={() => openCustomerDetail(c.id)}>
 <span className="text-sm font-bold text-gray-400 dark:text-gray-500 w-5">#{i + 1}</span>
 <div className="h-7 w-7 rounded-full bg-accent-gradient-br to-purple-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
 {c.full_name?.charAt(0)}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium truncate">{c.full_name}</p>
 <p className="text-xs text-gray-500 dark:text-gray-400">{c.order_count || 0} đơn hàng</p>
 </div>
 <span className="text-sm font-semibold text-accent-primary">{formatCurrency(c.total_spent || 0)}</span>
 </div>
 ))}
 {customerList.length === 0 && (
 <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Chưa có dữ liệu</p>
 )}
 </div>
 </CardContent>
 </Card>

 {/* Source Distribution */}
 <Card>
 <CardHeader>
 <CardTitle className="text-base">Nguồn khách hàng</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-3">
 {Object.entries(
 customerList.reduce((acc, c) => {
 const src = c.source || 'OTHER';
 acc[src] = (acc[src] || 0) + 1;
 return acc;
 }, {} as Record<string, number>)
 )
 .sort((a, b) => b[1] - a[1])
 .map(([src, count]) => {
 const pct = customerList.length > 0 ? Math.round(((count as number) / customerList.length) * 100) : 0;
 return (
 <div key={src} className="flex items-center gap-3">
 <span className="text-sm w-24 text-gray-600 dark:text-gray-400">{sourceLabels[src] || src}</span>
 <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
 <div className="bg-teal-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
 </div>
 <span className="text-sm font-medium w-16 text-right">{count as number} ({pct}%)</span>
 </div>
 );
 })}
 </div>
 </CardContent>
 </Card>

 {/* Loyalty Tier Distribution */}
 <Card>
 <CardHeader>
 <CardTitle className="text-base">Phân bố Loyalty Tier</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-3">
 {['Platinum', 'Gold', 'Silver', 'Bronze'].map(tier => {
 const count = customerList.filter(c => c.loyalty_tier?.toLowerCase() === tier.toLowerCase()).length;
 const pct = customerList.length > 0 ? Math.round((count / customerList.length) * 100) : 0;
 return (
 <div key={tier} className="flex items-center gap-3">
 <Badge className={`${loyaltyColors[tier.toLowerCase()] || 'bg-gray-100 dark:bg-gray-800'} text-xs w-24 justify-center`}>{tier}</Badge>
 <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2.5">
 <div className="bg-amber-400 h-2.5 rounded-full" style={{ width: `${pct}%` }} />
 </div>
 <span className="text-sm font-medium w-16 text-right">{count} ({pct}%)</span>
 </div>
 );
 })}
 </div>
 </CardContent>
 </Card>
 </div>
 </motion.div>
 )}

 {/* ========== TAB: RETENTION ========== */}
 {activeTab === 'retention' && (
 <motion.div
 className="space-y-4"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 >
 {/* Retention Stats */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <Card className="border-orange-200 bg-orange-50/30">
 <CardContent className="p-4">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-orange-100">
 <IconAlertTriangle className="h-5 w-5 text-orange-600" />
 </div>
 <div>
 <p className="text-xs text-orange-600 font-medium">Nguy cơ rời</p>
 <p className="text-2xl font-bold text-orange-700">{retention?.churn_risk_count || 0}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card className="border-red-200 bg-red-50/30">
 <CardContent className="p-4">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-red-100">
 <IconUsers className="h-5 w-5 text-red-600" />
 </div>
 <div>
 <p className="text-xs text-red-600 font-medium">Đã mất</p>
 <p className="text-2xl font-bold text-red-700">{retention?.lost_count || 0}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card className="border-yellow-200 bg-yellow-50/30">
 <CardContent className="p-4">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-yellow-100">
 <IconTrendingUp className="h-5 w-5 text-yellow-600" />
 </div>
 <div>
 <p className="text-xs text-yellow-600 font-medium">Tổng rủi ro</p>
 <p className="text-2xl font-bold text-yellow-700">{retention?.total_at_risk || 0}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Campaign Send UI */}
 <Card className="border-accent-subtle bg-accent-50">
 <CardHeader className="pb-2">
 <CardTitle className="text-base flex items-center gap-2">
 <IconSend className="h-4 w-4 text-accent-primary" />
 Gửi chiến dịch giữ chân
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
 <div className="flex-1 w-full sm:w-auto">
 <Label className="text-xs text-gray-500 dark:text-gray-400">Mẫu ưu đãi</Label>
 <Select value={campaignTemplate} onValueChange={setCampaignTemplate}>
 <SelectTrigger className="h-9">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="MISS_YOU">💝 We Miss You (Voucher 10%)</SelectItem>
 <SelectItem value="COME_BACK">🎁 Come Back (Tráng miệng miễn phí)</SelectItem>
 <SelectItem value="DISCOUNT">🎫 Mã giảm giá đặc biệt</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="w-full sm:w-36">
 <Label className="text-xs text-gray-500 dark:text-gray-400">Kênh gửi</Label>
 <Select value={campaignChannel} onValueChange={setCampaignChannel}>
 <SelectTrigger className="h-9">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="ZALO">Zalo</SelectItem>
 <SelectItem value="EMAIL">Email</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <Button
 size="sm"
 className="bg-accent-gradient text-white"
 onClick={handleSendCampaign}
 disabled={campaignMutation.isPending || customerList.filter(c => ['CHURN_RISK', 'LOST'].includes(c.customer_type || '')).length === 0}
 >
 <IconSend className="mr-1.5 h-3.5 w-3.5" />
 {campaignMutation.isPending ? 'Đang gửi...' : `Gửi tới ${customerList.filter(c => ['CHURN_RISK', 'LOST'].includes(c.customer_type || '')).length} KH`}
 </Button>
 </div>
 </CardContent>
 </Card>

 {/* At-Risk Customers List */}
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-base">Khách hàng cần chú ý</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-2">
 {customerList
 .filter(c => ['CHURN_RISK', 'LOST'].includes(c.customer_type || ''))
 .map(c => (
 <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 cursor-pointer" onClick={() => openCustomerDetail(c.id)}>
 <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-sm font-medium">
 {c.full_name?.charAt(0)}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium">{c.full_name}</p>
 <p className="text-xs text-gray-500 dark:text-gray-400">{c.phone}</p>
 </div>
 <Badge className={customerTypeLabels[c.customer_type || '']?.color || 'bg-gray-100 dark:bg-gray-800'}>
 {customerTypeLabels[c.customer_type || '']?.label || c.customer_type}
 </Badge>
 <span className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(c.total_spent || 0)}</span>
 </div>
 ))}
 {customerList.filter(c => ['CHURN_RISK', 'LOST'].includes(c.customer_type || '')).length === 0 && (
 <div className="text-center py-8">
 <IconHeart className="mx-auto h-10 w-10 text-green-300" />
 <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Không có khách hàng nào có nguy cơ rời!</p>
 </div>
 )}
 </div>
 </CardContent>
 </Card>

 {/* Birthday Alerts */}
 <Card className="border-pink-200 bg-pink-50/10">
 <CardHeader className="pb-2">
 <CardTitle className="text-base flex items-center gap-2">
 <IconCake className="h-4 w-4 text-pink-500" />
 Sinh nhật sắp tới (30 ngày)
 </CardTitle>
 </CardHeader>
 <CardContent>
 {birthdayList.length > 0 ? (
 <div className="space-y-2">
 {birthdayList.map(b => (
 <div key={b.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-pink-50 cursor-pointer" onClick={() => openCustomerDetail(b.id)}>
 <div className="h-8 w-8 rounded-full bg-accent-gradient-br to-rose-500 flex items-center justify-center text-white text-sm">
 <IconCake className="h-4 w-4" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium">{b.full_name}</p>
 <p className="text-xs text-gray-500 dark:text-gray-400">{b.phone}</p>
 </div>
 <div className="text-right">
 <p className="text-xs text-pink-600 font-medium">
 {b.days_until === 0 ? '🎂 Hôm nay!' : `Còn ${b.days_until} ngày`}
 </p>
 <p className="text-[10px] text-gray-400 dark:text-gray-500">
 {new Date(b.birthday).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
 </p>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="text-center py-6">
 <IconCake className="mx-auto h-8 w-8 text-pink-200" />
 <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">Chưa có sinh nhật nào trong 30 ngày tới</p>
 <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Thêm ngày sinh khi tạo/sửa khách hàng</p>
 </div>
 )}
 </CardContent>
 </Card>
 </motion.div>
 )}
 </div>

 {/* ========== MODALS ========== */}

 {/* Create Modal */}
 <Dialog open={createOpen} onOpenChange={setCreateOpen}>
 <DialogContent className="max-w-lg">
 <DialogHeader>
 <DialogTitle>Thêm khách hàng mới</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div className="grid grid-cols-1 gap-3">
 <div>
 <Label>Họ tên <span className="text-red-500">*</span></Label>
 <Input value={formData.full_name} onChange={e => updateField('full_name', e.target.value)} placeholder="Nhập họ tên" />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <Label>Số điện thoại</Label>
 <Input value={formData.phone} onChange={e => updateField('phone', e.target.value)} placeholder="0912345678" />
 </div>
 <div>
 <Label>Email</Label>
 <Input value={formData.email} onChange={e => updateField('email', e.target.value)} placeholder="email@example.com" />
 </div>
 </div>
 <div>
 <Label>Địa chỉ</Label>
 <Input value={formData.address} onChange={e => updateField('address', e.target.value)} placeholder="Số nhà, đường, quận" />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <Label>Loại khách hàng</Label>
 <Select value={formData.customer_type} onValueChange={v => updateField('customer_type', v)}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="REGULAR">Thông thường</SelectItem>
 <SelectItem value="VIP">VIP</SelectItem>
 <SelectItem value="LOYAL">Thân thiết</SelectItem>
 <SelectItem value="NEW">Mới</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>Nguồn</Label>
 <Select value={formData.source || ''} onValueChange={v => updateField('source', v)}>
 <SelectTrigger><SelectValue placeholder="Chọn nguồn" /></SelectTrigger>
 <SelectContent>
 {Object.entries(sourceLabels).map(([k, v]) => (
 <SelectItem key={k} value={k}>{v}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 <div>
 <Label>Ngày sinh</Label>
 <Input type="date" value={formData.birthday || ''} onChange={e => setFormData(prev => ({ ...prev, birthday: e.target.value }))} />
 </div>
 <div>
 <Label>Ghi chú</Label>
 <Textarea value={formData.notes} onChange={e => updateField('notes', e.target.value)} placeholder="Ghi chú thêm..." rows={2} />
 </div>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setCreateOpen(false)}>Hủy</Button>
 <Button onClick={handleCreate} disabled={createMutation.isPending || !formData.full_name.trim()}>
 {createMutation.isPending ? 'Đang lưu...' : 'Thêm khách hàng'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Edit Modal */}
 <Dialog open={editOpen} onOpenChange={setEditOpen}>
 <DialogContent className="max-w-lg">
 <DialogHeader>
 <DialogTitle>Chỉnh sửa khách hàng</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div className="grid grid-cols-1 gap-3">
 <div>
 <Label>Họ tên <span className="text-red-500">*</span></Label>
 <Input value={formData.full_name} onChange={e => updateField('full_name', e.target.value)} />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <Label>Số điện thoại</Label>
 <Input value={formData.phone} onChange={e => updateField('phone', e.target.value)} />
 </div>
 <div>
 <Label>Email</Label>
 <Input value={formData.email} onChange={e => updateField('email', e.target.value)} />
 </div>
 </div>
 <div>
 <Label>Địa chỉ</Label>
 <Input value={formData.address} onChange={e => updateField('address', e.target.value)} />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <Label>Loại khách hàng</Label>
 <Select value={formData.customer_type} onValueChange={v => updateField('customer_type', v)}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="REGULAR">Thông thường</SelectItem>
 <SelectItem value="VIP">VIP</SelectItem>
 <SelectItem value="LOYAL">Thân thiết</SelectItem>
 <SelectItem value="NEW">Mới</SelectItem>
 <SelectItem value="CHURN_RISK">Nguy cơ</SelectItem>
 <SelectItem value="LOST">Mất</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>Nguồn</Label>
 <Select value={formData.source || ''} onValueChange={v => updateField('source', v)}>
 <SelectTrigger><SelectValue placeholder="Chọn nguồn" /></SelectTrigger>
 <SelectContent>
 {Object.entries(sourceLabels).map(([k, v]) => (
 <SelectItem key={k} value={k}>{v}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 <div>
 <Label>Ngày sinh</Label>
 <Input type="date" value={formData.birthday || ''} onChange={e => setFormData(prev => ({ ...prev, birthday: e.target.value }))} />
 </div>
 <div>
 <Label>Ghi chú</Label>
 <Textarea value={formData.notes} onChange={e => updateField('notes', e.target.value)} rows={2} />
 </div>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setEditOpen(false)}>Hủy</Button>
 <Button onClick={handleUpdate} disabled={updateMutation.isPending || !formData.full_name.trim()}>
 {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Delete Modal */}
 <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
 <DialogContent className="max-w-sm">
 <DialogHeader>
 <DialogTitle className="text-red-600">Xóa khách hàng</DialogTitle>
 </DialogHeader>
 <p className="text-sm text-gray-600 dark:text-gray-400">
 Bạn có chắc chắn muốn xóa khách hàng <strong>{deletingCustomer?.full_name}</strong>? Hành động này không thể hoàn tác.
 </p>
 <DialogFooter>
 <Button variant="outline" onClick={() => setDeleteOpen(false)}>Hủy</Button>
 <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
 {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Customer Detail Modal */}
 <CustomerDetailModal
 customerId={selectedCustomerId}
 open={modalOpen}
 onOpenChange={setModalOpen}
 />

 {/* Professional Export Dialog */}
 <ExportDialog
 open={exportOpen}
 onOpenChange={setExportOpen}
 onExport={handleExport}
 defaultFilename={crmExportConfig.filename}
 title="Xuất báo cáo Khách hàng"
 isExporting={isExporting}
 />
 </>
 );
}
