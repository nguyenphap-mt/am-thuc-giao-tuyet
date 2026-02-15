'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    IconUser,
    IconPhone,
    IconMail,
    IconMapPin,
    IconCoin,
    IconTrophy,
    IconHistory,
    IconCalendarEvent,
    IconSend,
    IconNote,
    IconSettings,
    IconStarFilled,
    IconDeviceFloppy,
    IconBriefcase,
    IconHash,
    IconClock,
} from '@tabler/icons-react';

// ========== TYPES ==========

interface CustomerDetailModalProps {
    customerId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface LoyaltySummary {
    customer_id: string;
    points: number;
    tier: {
        name: string;
        color: string;
        icon: string;
        discount_percent: number;
        benefits: string[];
    };
    next_tier: {
        name: string;
        min_points: number;
        points_needed: number;
    } | null;
}

interface Interaction {
    id: string;
    type: string;
    content?: string;
    sentiment?: string;
    created_at: string;
}

interface Customer {
    id: string;
    full_name: string;
    phone?: string;
    email?: string;
    address?: string;
    source?: string;
    notes?: string;
    customer_type?: string;
    loyalty_tier?: string;
    loyalty_points?: number;
    preferences?: Record<string, unknown>;
    total_spent?: number;
    order_count?: number;
    last_order_at?: string;
    created_at?: string;
    updated_at?: string;
}

interface LiveStats {
    total_orders: number;
    total_spent: number;
    last_order_at?: string;
    total_quotes: number;
    rejected_quotes: number;
}

// ========== CONSTANTS ==========

const loyaltyColors: Record<string, string> = {
    bronze: 'bg-amber-100 text-amber-700 border-amber-300',
    silver: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-400',
    gold: 'bg-yellow-100 text-yellow-700 border-yellow-500',
    platinum: 'bg-purple-100 text-purple-700 border-purple-400',
};

const customerTypeLabels: Record<string, { label: string; color: string }> = {
    VIP: { label: 'VIP', color: 'bg-purple-100 text-purple-700' },
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
    QUOTE: 'Báo giá',
    ORDER: 'Đơn hàng',
    OTHER: 'Khác',
};

const interactionIcons: Record<string, string> = {
    CALL: '📞',
    EMAIL: '✉️',
    ZALO: '💬',
    MEETING: '🤝',
    NOTE: '📝',
    FACEBOOK: '👍',
    QUOTE_SENT: '📋',
    QUOTE_CREATED: '📋',
    ORDER_PLACED: '📦',
    ORDER_CONFIRMED: '✅',
};

const interactionTypeLabels: Record<string, string> = {
    CALL: 'Cuộc gọi',
    EMAIL: 'Email',
    ZALO: 'Zalo',
    MEETING: 'Cuộc họp',
    NOTE: 'Ghi chú',
    FACEBOOK: 'Facebook',
    QUOTE_SENT: 'Gửi báo giá',
    QUOTE_CREATED: 'Tạo báo giá',
    ORDER_PLACED: 'Đặt đơn',
    ORDER_CONFIRMED: 'Xác nhận đơn',
};

// Common dietary preferences for Vietnamese catering context
const PREF_OPTIONS = [
    { key: 'vegetarian', label: 'Chay' },
    { key: 'no_pork', label: 'Không thịt heo' },
    { key: 'no_beef', label: 'Không thịt bò' },
    { key: 'no_seafood', label: 'Không hải sản' },
    { key: 'no_spicy', label: 'Không cay' },
    { key: 'halal', label: 'Halal' },
    { key: 'no_alcohol', label: 'Không rượu bia' },
];

// ========== COMPONENT ==========

export function CustomerDetailModal({ customerId, open, onOpenChange }: CustomerDetailModalProps) {
    const queryClient = useQueryClient();

    // Note creation state
    const [noteType, setNoteType] = useState('NOTE');
    const [noteContent, setNoteContent] = useState('');

    // Preferences editing state
    const [editingPrefs, setEditingPrefs] = useState(false);
    const [prefsData, setPrefsData] = useState<Record<string, unknown>>({});

    // Fetch customer details
    const { data: customer, isLoading: customerLoading } = useQuery({
        queryKey: ['customer', customerId],
        queryFn: () => api.get<Customer>(`/crm/customers/${customerId}`),
        enabled: !!customerId && open,
    });

    // Fetch live stats from orders/quotes
    const { data: liveStats } = useQuery({
        queryKey: ['customer-live-stats', customerId],
        queryFn: () => api.get<LiveStats>(`/crm/customers/${customerId}/live-stats`),
        enabled: !!customerId && open,
    });

    // Fetch loyalty summary
    const { data: loyalty, isLoading: loyaltyLoading } = useQuery({
        queryKey: ['customer-loyalty', customerId],
        queryFn: async () => {
            try {
                return await api.get<LoyaltySummary>(`/api/v1/customers/${customerId}/loyalty`);
            } catch {
                return null;
            }
        },
        enabled: !!customerId && open,
    });

    // Fetch interactions
    const { data: interactions, isLoading: interactionsLoading } = useQuery({
        queryKey: ['customer-interactions', customerId],
        queryFn: async () => {
            try {
                return await api.get<Interaction[]>(`/crm/customers/${customerId}/interactions?limit=30`);
            } catch {
                return [];
            }
        },
        enabled: !!customerId && open,
    });

    // Create interaction mutation
    const createInteractionMutation = useMutation({
        mutationFn: (data: { type: string; content?: string }) =>
            api.post(`/crm/customers/${customerId}/interactions`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customer-interactions', customerId] });
            setNoteContent('');
            setNoteType('NOTE');
            toast.success('Đã thêm ghi chú');
        },
        onError: () => toast.error('Lỗi khi thêm ghi chú'),
    });

    // Update preferences mutation
    const updatePrefsMutation = useMutation({
        mutationFn: (prefs: Record<string, unknown>) =>
            api.put(`/crm/customers/${customerId}`, { full_name: customer?.full_name, preferences: prefs }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
            setEditingPrefs(false);
            toast.success('Đã cập nhật sở thích');
        },
        onError: () => toast.error('Lỗi khi cập nhật'),
    });

    const handleSendNote = () => {
        if (!noteContent.trim()) return;
        createInteractionMutation.mutate({ type: noteType, content: noteContent });
    };

    const startEditPrefs = () => {
        setPrefsData(customer?.preferences || {});
        setEditingPrefs(true);
    };

    const togglePref = (key: string) => {
        setPrefsData(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const savePrefs = () => {
        updatePrefsMutation.mutate(prefsData);
    };

    if (!customerId) return null;

    // Use live stats if available, else fall back to customer model
    const totalOrders = liveStats?.total_orders ?? customer?.order_count ?? 0;
    const totalSpent = liveStats?.total_spent ?? customer?.total_spent ?? 0;
    const totalQuotes = liveStats?.total_quotes ?? 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {customer?.full_name?.charAt(0) || 'K'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-lg font-semibold truncate">{customer?.full_name || 'Khách hàng'}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {customer?.customer_type && customerTypeLabels[customer.customer_type] && (
                                    <Badge className={`${customerTypeLabels[customer.customer_type].color} text-xs`}>
                                        {customerTypeLabels[customer.customer_type].label}
                                    </Badge>
                                )}
                                {customer?.loyalty_tier && (
                                    <Badge className={`${loyaltyColors[customer.loyalty_tier.toLowerCase()] || ''} text-xs`}>
                                        {customer.loyalty_tier}
                                    </Badge>
                                )}
                                {customer?.source && (
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        via {sourceLabels[customer.source] || customer.source}
                                    </span>
                                )}
                            </div>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                {/* Quick Stats Bar */}
                <div className="grid grid-cols-4 gap-2 mt-2">
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                        <p className="text-lg font-bold text-blue-700">{formatNumber(totalOrders)}</p>
                        <p className="text-[10px] text-blue-500">Đơn hàng</p>
                    </div>
                    <div className="text-center p-2 bg-pink-50 rounded-lg">
                        <p className="text-lg font-bold text-pink-700">{formatCurrency(totalSpent)}</p>
                        <p className="text-[10px] text-pink-500">Tổng chi</p>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded-lg">
                        <p className="text-lg font-bold text-purple-700">{formatNumber(totalQuotes)}</p>
                        <p className="text-[10px] text-purple-500">Báo giá</p>
                    </div>
                    <div className="text-center p-2 bg-amber-50 rounded-lg">
                        <p className="text-lg font-bold text-amber-700">{formatNumber(customer?.loyalty_points || 0)}</p>
                        <p className="text-[10px] text-amber-500">Điểm</p>
                    </div>
                </div>

                <Tabs defaultValue="info" className="mt-3">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="info" className="text-xs">
                            <IconUser className="h-3.5 w-3.5 mr-1" />
                            Thông tin
                        </TabsTrigger>
                        <TabsTrigger value="loyalty" className="text-xs">
                            <IconCoin className="h-3.5 w-3.5 mr-1" />
                            Điểm thưởng
                        </TabsTrigger>
                        <TabsTrigger value="history" className="text-xs">
                            <IconHistory className="h-3.5 w-3.5 mr-1" />
                            Hành trình
                        </TabsTrigger>
                        <TabsTrigger value="preferences" className="text-xs">
                            <IconSettings className="h-3.5 w-3.5 mr-1" />
                            Sở thích
                        </TabsTrigger>
                    </TabsList>

                    {/* ========== INFO TAB ========== */}
                    <TabsContent value="info" className="mt-3">
                        {customerLoading ? (
                            <div className="space-y-3">
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        ) : customer ? (
                            <div className="space-y-3">
                                {/* Contact Card */}
                                <Card>
                                    <CardHeader className="pb-1.5">
                                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Liên hệ</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2.5 pb-3">
                                        {customer.phone && (
                                            <div className="flex items-center gap-2.5">
                                                <IconPhone className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                                                <a href={`tel:${customer.phone}`} className="text-sm text-blue-600 hover:underline">{customer.phone}</a>
                                            </div>
                                        )}
                                        {customer.email && (
                                            <div className="flex items-center gap-2.5">
                                                <IconMail className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                                                <a href={`mailto:${customer.email}`} className="text-sm text-blue-600 hover:underline">{customer.email}</a>
                                            </div>
                                        )}
                                        {customer.address && (
                                            <div className="flex items-center gap-2.5">
                                                <IconMapPin className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                                                <span className="text-sm">{customer.address}</span>
                                            </div>
                                        )}
                                        {customer.source && (
                                            <div className="flex items-center gap-2.5">
                                                <IconBriefcase className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                                    Nguồn: {sourceLabels[customer.source] || customer.source}
                                                </span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Notes */}
                                {customer.notes && (
                                    <Card>
                                        <CardHeader className="pb-1.5">
                                            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Ghi chú</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pb-3">
                                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{customer.notes}</p>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Metadata */}
                                <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 px-1">
                                    <div className="flex items-center gap-1">
                                        <IconCalendarEvent className="h-3 w-3" />
                                        Tạo: {customer.created_at ? new Date(customer.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                                    </div>
                                    {customer.last_order_at && (
                                        <div className="flex items-center gap-1">
                                            <IconClock className="h-3 w-3" />
                                            Đơn cuối: {new Date(customer.last_order_at).toLocaleDateString('vi-VN')}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                        <IconHash className="h-3 w-3" />
                                        ID: {customer.id.substring(0, 8)}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 dark:text-gray-400 py-8">Không tìm thấy dữ liệu</p>
                        )}
                    </TabsContent>

                    {/* ========== LOYALTY TAB ========== */}
                    <TabsContent value="loyalty" className="mt-3">
                        {loyaltyLoading ? (
                            <div className="space-y-3">
                                <Skeleton className="h-32 w-full" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                        ) : loyalty ? (
                            <div className="space-y-3">
                                {/* Current Tier Card */}
                                <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Hạng thành viên</p>
                                                <p className="text-2xl font-bold" style={{ color: loyalty.tier.color }}>
                                                    {loyalty.tier.name}
                                                </p>
                                            </div>
                                            <IconTrophy className="h-10 w-10" style={{ color: loyalty.tier.color }} />
                                        </div>
                                        <div className="mt-3 flex items-center gap-3">
                                            <div className="bg-white rounded-lg px-3 py-1.5 shadow-sm">
                                                <p className="text-2xl font-bold text-purple-600">
                                                    {formatNumber(loyalty.points)}
                                                </p>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400">điểm tích lũy</p>
                                            </div>
                                            <div className="bg-white rounded-lg px-3 py-1.5 shadow-sm">
                                                <p className="text-xl font-bold text-green-600">
                                                    {loyalty.tier.discount_percent}%
                                                </p>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400">giảm giá</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Next Tier Progress */}
                                {loyalty.next_tier && (
                                    <Card>
                                        <CardContent className="p-4">
                                            <div className="flex justify-between text-sm mb-2">
                                                <span>Tiến độ đến <strong>{loyalty.next_tier.name}</strong></span>
                                                <span className="font-medium">{loyalty.points}/{loyalty.next_tier.min_points}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                                <div
                                                    className="bg-gradient-to-r from-pink-500 to-purple-500 h-2.5 rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.min((loyalty.points / loyalty.next_tier.min_points) * 100, 100)}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                                Còn {formatNumber(loyalty.next_tier.points_needed)} điểm nữa
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Benefits */}
                                {loyalty.tier.benefits?.length > 0 && (
                                    <Card>
                                        <CardHeader className="pb-1">
                                            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Quyền lợi</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pb-3">
                                            <ul className="space-y-1">
                                                {loyalty.tier.benefits.map((benefit, i) => (
                                                    <li key={i} className="flex items-center gap-2 text-sm">
                                                        <IconStarFilled className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                                        {benefit}
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        ) : (
                            // Fallback: show points from customer model
                            <div className="space-y-3">
                                <Card className="border border-purple-200 bg-purple-50/50">
                                    <CardContent className="p-5 text-center">
                                        <IconCoin className="h-10 w-10 mx-auto text-purple-400" />
                                        <p className="text-3xl font-bold text-purple-600 mt-2">
                                            {formatNumber(customer?.loyalty_points || 0)}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">điểm tích lũy</p>
                                        {customer?.loyalty_tier && (
                                            <Badge className={`${loyaltyColors[customer.loyalty_tier.toLowerCase()] || 'bg-gray-100 dark:bg-gray-800'} mt-2`}>
                                                {customer.loyalty_tier}
                                            </Badge>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </TabsContent>

                    {/* ========== HISTORY TAB (with inline note creation) ========== */}
                    <TabsContent value="history" className="mt-3">
                        {/* Inline Note Creation Form */}
                        <Card className="mb-3 border-dashed border-purple-200 bg-purple-50/30">
                            <CardContent className="p-3">
                                <div className="flex items-start gap-2">
                                    <Select value={noteType} onValueChange={setNoteType}>
                                        <SelectTrigger className="w-28 h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="NOTE">📝 Ghi chú</SelectItem>
                                            <SelectItem value="CALL">📞 Gọi điện</SelectItem>
                                            <SelectItem value="EMAIL">✉️ Email</SelectItem>
                                            <SelectItem value="ZALO">💬 Zalo</SelectItem>
                                            <SelectItem value="MEETING">🤝 Gặp mặt</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Textarea
                                        value={noteContent}
                                        onChange={(e) => setNoteContent(e.target.value)}
                                        placeholder="Thêm ghi chú hoặc tương tác..."
                                        className="min-h-[60px] text-sm resize-none flex-1"
                                        rows={2}
                                    />
                                    <Button
                                        size="icon"
                                        className="h-8 w-8 bg-purple-600 hover:bg-purple-700 shrink-0"
                                        disabled={!noteContent.trim() || createInteractionMutation.isPending}
                                        onClick={handleSendNote}
                                    >
                                        <IconSend className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Interaction Timeline */}
                        {interactionsLoading ? (
                            <div className="space-y-3">
                                <Skeleton className="h-14 w-full" />
                                <Skeleton className="h-14 w-full" />
                                <Skeleton className="h-14 w-full" />
                            </div>
                        ) : interactions && interactions.length > 0 ? (
                            <div className="relative">
                                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                                <div className="space-y-3">
                                    {interactions.map((interaction) => (
                                        <div key={interaction.id} className="relative pl-10">
                                            <div className="absolute left-2 w-5 h-5 rounded-full bg-purple-100 border-2 border-purple-500 flex items-center justify-center">
                                                <div className="w-2 h-2 rounded-full bg-purple-500" />
                                            </div>
                                            <Card className="hover:shadow-sm transition-shadow">
                                                <CardContent className="p-2.5">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm">
                                                                {interactionIcons[interaction.type] || '📌'}{' '}
                                                                {interactionTypeLabels[interaction.type] || interaction.type}
                                                            </p>
                                                            {interaction.content && (
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 whitespace-pre-wrap">
                                                                    {interaction.content}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 shrink-0 ml-2">
                                                            <IconCalendarEvent className="h-3 w-3" />
                                                            {new Date(interaction.created_at).toLocaleDateString('vi-VN')}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <IconHistory className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600" />
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Chưa có lịch sử tương tác</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">Thêm ghi chú bên trên để bắt đầu</p>
                            </div>
                        )}
                    </TabsContent>

                    {/* ========== PREFERENCES TAB ========== */}
                    <TabsContent value="preferences" className="mt-3">
                        <Card>
                            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    {editingPrefs ? 'Chỉnh sửa sở thích' : 'Sở thích ẩm thực'}
                                </CardTitle>
                                {!editingPrefs ? (
                                    <Button variant="outline" size="sm" onClick={startEditPrefs} className="h-7 text-xs">
                                        <IconNote className="h-3.5 w-3.5 mr-1" />
                                        Sửa
                                    </Button>
                                ) : (
                                    <div className="flex gap-1">
                                        <Button variant="outline" size="sm" onClick={() => setEditingPrefs(false)} className="h-7 text-xs">
                                            Hủy
                                        </Button>
                                        <Button size="sm" onClick={savePrefs} disabled={updatePrefsMutation.isPending} className="h-7 text-xs">
                                            <IconDeviceFloppy className="h-3.5 w-3.5 mr-1" />
                                            Lưu
                                        </Button>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent>
                                {editingPrefs ? (
                                    <div className="space-y-3">
                                        <div>
                                            <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">Kiêng cữ / Ưa thích</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {PREF_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.key}
                                                        onClick={() => togglePref(opt.key)}
                                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${prefsData[opt.key]
                                                                ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
                                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Ghi chú thêm</Label>
                                            <Textarea
                                                value={(prefsData['extra_notes'] as string) || ''}
                                                onChange={(e) => setPrefsData(prev => ({ ...prev, extra_notes: e.target.value }))}
                                                placeholder="VD: Dị ứng đậu phộng, thích vị ngọt nhẹ..."
                                                rows={2}
                                                className="text-sm"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {/* Display current preferences */}
                                        {customer?.preferences && Object.keys(customer.preferences).length > 0 ? (
                                            <>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {PREF_OPTIONS
                                                        .filter(opt => customer.preferences?.[opt.key])
                                                        .map(opt => (
                                                            <Badge key={opt.key} className="bg-purple-100 text-purple-700 text-xs">
                                                                {opt.label}
                                                            </Badge>
                                                        ))
                                                    }
                                                </div>
                                                {customer.preferences['extra_notes'] && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                                                        {String(customer.preferences['extra_notes'])}
                                                    </p>
                                                )}
                                                {PREF_OPTIONS.filter(opt => customer.preferences?.[opt.key]).length === 0 &&
                                                    !customer.preferences['extra_notes'] && (
                                                        <div className="text-center py-4">
                                                            <IconSettings className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600" />
                                                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Chưa có sở thích nào</p>
                                                        </div>
                                                    )}
                                            </>
                                        ) : (
                                            <div className="text-center py-6">
                                                <IconSettings className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600" />
                                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Chưa cập nhật sở thích</p>
                                                <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={startEditPrefs}>
                                                    Thêm sở thích
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Customer notes from profile */}
                        {customer?.notes && (
                            <Card className="mt-3">
                                <CardHeader className="pb-1">
                                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Ghi chú nội bộ</CardTitle>
                                </CardHeader>
                                <CardContent className="pb-3">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{customer.notes}</p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
