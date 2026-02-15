'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, cn } from '@/lib/utils';
import { IconStar, IconPuzzle, IconHorse, IconPaw, IconTrendingUp } from '@tabler/icons-react';
import type { MenuEngineeringItem, TopSellerItem, CategoryBreakdownItem } from '@/hooks/use-menu';

interface MenuEngineeringData {
    items: MenuEngineeringItem[];
    avg_food_cost: number;
    avg_selling_price: number;
    quadrants: { star: number; puzzle: number; workhorse: number; dog: number };
}

interface MenuAnalyticsProps {
    engineeringData: MenuEngineeringData | undefined;
    topSellers: TopSellerItem[];
    categoryBreakdown: CategoryBreakdownItem[];
}

const QUADRANTS = [
    { key: 'star' as const, icon: IconStar, label: 'Ngôi sao', desc: 'Lợi nhuận cao, phổ biến', insight: 'Giữ vững, đẩy mạnh marketing', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', iconColor: 'text-amber-500', insightBg: 'bg-amber-100/60 text-amber-600' },
    { key: 'puzzle' as const, icon: IconPuzzle, label: 'Tiềm năng', desc: 'Lợi nhuận cao, ít bán', insight: 'Tăng quảng bá, thử giảm giá', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', iconColor: 'text-blue-500', insightBg: 'bg-blue-100/60 text-blue-600' },
    { key: 'workhorse' as const, icon: IconHorse, label: 'Bền bỉ', desc: 'Lợi nhuận thấp, phổ biến', insight: 'Tối ưu nguyên liệu, giảm chi phí', bg: 'bg-green-50 border-green-200', text: 'text-green-700', iconColor: 'text-green-500', insightBg: 'bg-green-100/60 text-green-600' },
    { key: 'dog' as const, icon: IconPaw, label: 'Cân nhắc', desc: 'Lợi nhuận thấp, ít bán', insight: 'Xem xét loại bỏ hoặc đổi mới', bg: 'bg-gray-50 border-gray-200', text: 'text-gray-600', iconColor: 'text-gray-400', insightBg: 'bg-gray-100 text-gray-500' },
];

const QUADRANT_STYLES: Record<string, string> = {
    star: 'bg-amber-50 text-amber-700 border-amber-200',
    puzzle: 'bg-blue-50 text-blue-700 border-blue-200',
    workhorse: 'bg-green-50 text-green-700 border-green-200',
    dog: 'bg-gray-50 text-gray-600 border-gray-200',
};

const QUADRANT_ICONS: Record<string, typeof IconStar> = {
    star: IconStar,
    puzzle: IconPuzzle,
    workhorse: IconHorse,
    dog: IconPaw,
};

export function MenuAnalytics({ engineeringData, topSellers, categoryBreakdown }: MenuAnalyticsProps) {
    return (
        <div className="space-y-4">
            {/* Quadrant Summary Cards */}
            {engineeringData && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {QUADRANTS.map((q, i) => (
                        <Card key={i} className={`border ${q.bg} hover:shadow-md transition-shadow`}>
                            <CardContent className="p-3">
                                <div className="flex items-center gap-2">
                                    <q.icon className={`h-5 w-5 ${q.iconColor}`} />
                                    <p className={`text-sm font-bold ${q.text}`}>{q.label}</p>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">{q.desc}</p>
                                <p className={`text-xl font-bold mt-1 tabular-nums ${q.text}`}>{engineeringData.quadrants[q.key]}</p>
                                {engineeringData.quadrants[q.key] > 0 && <p className={`text-[10px] mt-1.5 px-1.5 py-0.5 rounded-full inline-block ${q.insightBg}`}><IconTrendingUp className="inline h-3 w-3 mr-0.5 -mt-px" />{q.insight}</p>}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Menu Engineering Matrix */}
                <Card className="overflow-hidden">
                    <div className="p-3 border-b bg-gray-50/80">
                        <span className="text-sm font-medium text-gray-700">Ma trận Menu Engineering</span>
                        {engineeringData && (
                            <span className="text-xs text-gray-400 ml-2">Food Cost TB: {engineeringData.avg_food_cost}% • Giá TB: {formatCurrency(engineeringData.avg_selling_price)}</span>
                        )}
                    </div>
                    <div className="divide-y max-h-80 overflow-y-auto">
                        {engineeringData?.items.map(item => {
                            const QuadrantIcon = QUADRANT_ICONS[item.quadrant] || IconStar;
                            return (
                                <div key={item.id} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50/50 transition-colors">
                                    <QuadrantIcon className={`h-4 w-4 shrink-0 ${QUADRANTS.find(q => q.key === item.quadrant)?.iconColor || 'text-gray-400'}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="truncate font-medium text-gray-900">{item.name}</p>
                                        <p className="text-xs text-gray-400">{item.category_name}</p>
                                    </div>
                                    <span className={cn('text-xs px-1.5 py-0.5 rounded border', QUADRANT_STYLES[item.quadrant])}>
                                        FC {item.food_cost_pct}%
                                    </span>
                                    <span className="text-sm font-medium text-gray-700 w-24 text-right tabular-nums">{formatCurrency(item.selling_price)}</span>
                                </div>
                            );
                        })}
                        {!engineeringData && <div className="p-4"><Skeleton className="h-48 w-full" /></div>}
                    </div>
                </Card>

                {/* Top 10 Sellers */}
                <Card className="overflow-hidden">
                    <div className="p-3 border-b bg-gray-50/80">
                        <span className="text-sm font-medium text-gray-700">Top 10 bán chạy</span>
                    </div>
                    <div className="divide-y">
                        {topSellers.map((item, idx) => (
                            <div key={item.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50/50 transition-colors">
                                <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                                    idx < 3 ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : 'bg-gray-100 text-gray-600'
                                )}>{item.rank}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                                    <p className="text-xs text-gray-400">{item.category_name}</p>
                                </div>
                                <span className={cn('text-xs px-1.5 py-0.5 rounded',
                                    item.food_cost_pct <= 30 ? 'bg-green-50 text-green-700' : item.food_cost_pct <= 40 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                                )}>{item.food_cost_pct}%</span>
                                <span className="text-sm font-medium text-gray-700 w-24 text-right tabular-nums">{formatCurrency(item.selling_price)}</span>
                            </div>
                        ))}
                        {topSellers.length === 0 && <div className="p-4"><Skeleton className="h-40 w-full" /></div>}
                    </div>
                </Card>
            </div>

            {/* Category Breakdown */}
            <Card className="overflow-hidden">
                <div className="p-3 border-b bg-gray-50/80">
                    <span className="text-sm font-medium text-gray-700">Phân tích theo danh mục</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
                    {categoryBreakdown.map(cat => {
                        const maxRevenue = Math.max(...categoryBreakdown.map(c => c.total_revenue_potential), 1);
                        const barWidth = (cat.total_revenue_potential / maxRevenue) * 100;
                        return (
                            <div key={cat.category_id} className="p-3 rounded-lg border bg-gray-50/60 hover:bg-white hover:shadow-sm transition-all cursor-default">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-900">{cat.category_name}</p>
                                    <Badge variant="secondary" className="text-xs">{cat.item_count} món</Badge>
                                </div>
                                <div className="mt-2 space-y-1">
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>Giá TB: {formatCurrency(cat.avg_selling_price)}</span>
                                        <span className={cn(
                                            cat.avg_food_cost_pct <= 30 ? 'text-green-600' : cat.avg_food_cost_pct <= 40 ? 'text-amber-600' : 'text-red-600'
                                        )}>FC: {cat.avg_food_cost_pct}%</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full transition-all" style={{ width: `${barWidth}%` }} />
                                    </div>
                                    <p className="text-xs text-gray-400 text-right tabular-nums">Tổng: {formatCurrency(cat.total_revenue_potential)}</p>
                                </div>
                            </div>
                        );
                    })}
                    {categoryBreakdown.length === 0 && <div className="col-span-3 p-4"><Skeleton className="h-24 w-full" /></div>}
                </div>
            </Card>
        </div>
    );
}
