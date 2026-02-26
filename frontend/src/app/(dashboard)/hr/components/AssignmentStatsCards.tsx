'use client';

import {
 IconClipboardCheck,
 IconUserCheck,
 IconCircleCheck,
 IconCircleX,
} from '@tabler/icons-react';

interface StatsData {
 total: number;
 assigned: number;
 confirmed: number;
 completed: number;
 cancelled?: number;
}

interface AssignmentStatsCardsProps {
 stats: StatsData;
 onStatClick: (status: string) => void;
 selectedStatus: string;
}

const STAT_CARDS = [
 { key: 'all', label: 'Tổng', icon: IconClipboardCheck, gradient: 'from-blue-400', getValue: (s: StatsData) => s.total },
 { key: 'ASSIGNED', label: 'Đã phân công', icon: IconUserCheck, gradient: 'from-amber-400 to-orange-500', getValue: (s: StatsData) => s.assigned },
 { key: 'CONFIRMED', label: 'Đã xác nhận', icon: IconCircleCheck, gradient: 'from-green-400 to-emerald-500', getValue: (s: StatsData) => s.confirmed },
 { key: 'COMPLETED', label: 'Hoàn thành', icon: IconCircleX, gradient: 'from-gray-400 to-slate-500', getValue: (s: StatsData) => s.completed },
 { key: 'CANCELLED', label: 'Đã hủy', icon: IconCircleX, gradient: 'from-red-300 to-rose-400', getValue: (s: StatsData) => s.cancelled || 0, muted: true },
];


export default function AssignmentStatsCards({ stats, onStatClick, selectedStatus }: AssignmentStatsCardsProps) {
 return (
 <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
 {STAT_CARDS.map(({ key, label, icon: Icon, gradient, getValue, muted }) => {
 const isActive = selectedStatus === key;
 return (
 <button
 key={key}
 onClick={() => onStatClick(key)}
 className={`
 relative group rounded-xl border p-3 text-left transition-all duration-200
 hover:shadow-md hover:-translate-y-0.5 cursor-pointer
 ${isActive
 ? 'border-accent-medium bg-accent-50 shadow-sm ring-1 ring-accent-light'
 : 'border-gray-200 bg-white hover:border-gray-300'
 }
 `}
 >
 {/* Active indicator */}
 {isActive && (
 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px w-8 h-0.5 bg-accent-gradient-2stop rounded-full" />
 )}

 <div className="flex items-center justify-between">
 <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-sm`}>
 <Icon className="h-4 w-4" />
 </div>
 <span className="text-xl font-bold text-gray-900 tabular-nums">
 {getValue(stats)}
 </span>
 </div>
 <p className={`text-xs mt-1.5 font-medium ${isActive ? 'text-accent-strong' : 'text-gray-500'}`}>
 {label}
 </p>
 </button>
 );
 })}
 </div>
 );
}
