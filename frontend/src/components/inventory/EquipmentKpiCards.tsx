'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/utils';
import {
 IconTool,
 IconArrowUp,
 IconX,
 IconClockHour4,
 IconPackage,
} from '@tabler/icons-react';
import { type EquipmentStats } from '@/hooks/use-inventory';

interface EquipmentKpiCardsProps {
 stats: EquipmentStats | undefined;
 isLoading: boolean;
}

const KPI_CONFIG = [
 { key: 'total_equipment_types' as const, label: 'Loại dụng cụ', icon: IconTool, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
 { key: 'total_in_stock' as const, label: 'Trong kho', icon: IconPackage, bgColor: 'bg-green-50', iconColor: 'text-green-600' },
 { key: 'total_checked_out' as const, label: 'Đang mượn', icon: IconArrowUp, bgColor: 'bg-amber-50', iconColor: 'text-amber-600' },
 { key: 'total_damaged_month' as const, label: 'Hư hỏng (tháng)', icon: IconX, bgColor: 'bg-red-50', iconColor: 'text-red-600' },
 { key: 'overdue_count' as const, label: 'Quá hạn', icon: IconClockHour4, bgColor: 'bg-accent-50', iconColor: 'text-accent-primary' },
];

export function EquipmentKpiCards({ stats, isLoading }: EquipmentKpiCardsProps) {
 if (isLoading) {
 return (
 <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-3">
 {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
 </div>
 );
 }

 return (
 <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-3">
 {KPI_CONFIG.map((stat) => (
 <Card key={stat.key} className="shadow-sm hover:shadow-md transition-shadow duration-200">
 <CardContent className="p-3 md:p-4">
 <div className="flex items-center gap-2 md:gap-3">
 <div className={`p-1.5 md:p-2 rounded-lg ${stat.bgColor}`}>
 <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.iconColor}`} />
 </div>
 <div>
 <p className="text-xs text-gray-500">{stat.label}</p>
 <p className="text-base md:text-lg font-bold tabular-nums">
 {formatNumber(stats?.[stat.key] ?? 0)}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 );
}
