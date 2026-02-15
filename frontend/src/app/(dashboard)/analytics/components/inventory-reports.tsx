'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useInventoryReport } from '@/hooks/use-analytics';
import { IconPackage, IconAlertTriangle, IconClock, IconTrendingDown } from '@tabler/icons-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export function InventoryReports() {
    const { data: report, isLoading } = useInventoryReport();

    const summaryCards = [
        { title: 'Giá trị tồn kho', value: report?.total_value || 0, icon: IconPackage, color: 'text-teal-600', bg: 'bg-teal-50', format: 'currency' },
        { title: 'Tổng SKU', value: report?.total_sku || 0, icon: IconPackage, color: 'text-sky-600', bg: 'bg-sky-50', format: 'number' },
        { title: 'Sắp hết', value: report?.warning_items || 0, icon: IconAlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', format: 'number' },
        { title: 'Hết hàng', value: report?.out_of_stock || 0, icon: IconTrendingDown, color: 'text-red-600', bg: 'bg-red-50', format: 'number' },
    ];

    const movementData = report?.movements?.map(m => ({
        name: m.period,
        'Nhập kho': m.imports_value,
        'Xuất kho': m.exports_value,
    })) || [];

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                {summaryCards.map((card, i) => (
                    <Card key={i} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-3 md:p-4">
                            {isLoading ? <Skeleton className="h-12 w-full" /> : (
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg ${card.bg}`}>
                                        <card.icon className={`h-4 w-4 ${card.color}`} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{card.title}</p>
                                        <p className="text-sm font-bold tabular-nums">
                                            {card.format === 'currency' ? formatCurrency(card.value) : formatNumber(card.value)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Stock Movement Chart */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Biến động nhập/xuất kho</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <Skeleton className="h-[300px] w-full" />
                    ) : movementData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={movementData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                                <Legend />
                                <Bar dataKey="Nhập kho" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Xuất kho" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-gray-400 dark:text-gray-500">
                            Chưa có dữ liệu biến động kho
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Two columns: Top Consumed + Expiring */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Consumed */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Top nguyên liệu tiêu thụ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
                            <div className="space-y-2">
                                {report?.top_consumed?.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-5">{i + 1}</span>
                                            <span className="text-sm truncate">{item.item_name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <span className="text-sm font-semibold tabular-nums">{formatNumber(item.quantity_used)}</span>
                                            <span className="text-xs text-gray-400 dark:text-gray-500">{item.unit}</span>
                                        </div>
                                    </div>
                                ))}
                                {(!report?.top_consumed || report.top_consumed.length === 0) && (
                                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Chưa có dữ liệu</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Expiring Lots */}
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Lô hàng sắp hết hạn</CardTitle>
                            <Badge variant="outline" className="text-[10px]">
                                <IconClock className="h-3 w-3 mr-1" />
                                30 ngày tới
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
                            <div className="space-y-2">
                                {report?.expiring_lots?.map((lot, i) => (
                                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                                        <div className="min-w-0">
                                            <p className="text-sm truncate">{lot.item_name}</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">Lô: {lot.lot_number} • SL: {lot.quantity}</p>
                                        </div>
                                        <Badge
                                            variant={lot.days_until_expiry <= 7 ? 'destructive' : 'secondary'}
                                            className="text-[10px] shrink-0"
                                        >
                                            {lot.days_until_expiry <= 0 ? 'Đã hết hạn' : `${lot.days_until_expiry} ngày`}
                                        </Badge>
                                    </div>
                                ))}
                                {(!report?.expiring_lots || report.expiring_lots.length === 0) && (
                                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Không có lô sắp hết hạn</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
