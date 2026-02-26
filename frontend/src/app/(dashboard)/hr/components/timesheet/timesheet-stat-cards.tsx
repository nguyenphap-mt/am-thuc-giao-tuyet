'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
 IconUsers,
 IconLogin,
 IconHourglass,
 IconLogout,
} from '@tabler/icons-react';

interface TimesheetStatCardsProps {
 totalEmployees: number;
 checkedIn: number;
 notCheckedIn: number;
 checkedOut: number;
 isToday: boolean;
 overtimeTotal?: number;
 lateCount?: number;
}

export function TimesheetStatCards({
 totalEmployees,
 checkedIn,
 notCheckedIn,
 checkedOut,
 isToday,
 overtimeTotal = 0,
 lateCount = 0,
}: TimesheetStatCardsProps) {
 const attendanceRate = totalEmployees > 0 ? (checkedIn / totalEmployees) * 100 : 0;
 const checkoutRate = totalEmployees > 0 ? (checkedOut / totalEmployees) * 100 : 0;

 const cards = [
 {
 label: 'Tổng nhân viên',
 value: totalEmployees,
 icon: IconUsers,
 gradient: 'from-blue-500/10 to-blue-600/5',
 iconBg: 'bg-blue-100 text-blue-600',
 ringColor: 'stroke-blue-500',
 ringPercent: 100,
 },
 {
 label: 'Đã vào',
 value: checkedIn,
 icon: IconLogin,
 gradient: 'from-emerald-500/10 to-emerald-600/5',
 iconBg: 'bg-emerald-100 text-emerald-600',
 ringColor: 'stroke-emerald-500',
 ringPercent: attendanceRate,
 showLive: isToday,
 },
 {
 label: 'Chưa vào',
 value: notCheckedIn,
 icon: IconHourglass,
 gradient: 'from-amber-500/10 to-amber-600/5',
 iconBg: 'bg-amber-100 text-amber-600',
 ringColor: 'stroke-amber-500',
 ringPercent: totalEmployees > 0 ? (notCheckedIn / totalEmployees) * 100 : 0,
 },
 {
 label: 'Đã ra',
 value: checkedOut,
 icon: IconLogout,
 gradient: 'from-purple-500/10 to-purple-600/5',
 iconBg: 'bg-accent-100 text-accent-primary',
 ringColor: 'stroke-purple-500',
 ringPercent: checkoutRate,
 },
 ];

 return (
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 {cards.map((card) => (
 <Card
 key={card.label}
 className={`relative overflow-hidden border-0 shadow-sm bg-gradient-to-br ${card.gradient}`}
 >
 <CardContent className="p-4">
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
 {card.label}
 </p>
 <div className="flex items-baseline gap-2 mt-1">
 <p className="text-2xl font-bold text-gray-900">{card.value}</p>
 {card.showLive && (
 <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
 <span className="relative flex h-2 w-2">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
 </span>
 LIVE
 </span>
 )}
 </div>
 {totalEmployees > 0 && card.label !== 'Tổng nhân viên' && (
 <p className="text-xs text-gray-400 mt-0.5">
 {card.ringPercent.toFixed(0)}% tổng
 </p>
 )}
 {card.label === 'Tổng nhân viên' && overtimeTotal > 0 && (
 <p className="text-xs text-amber-600 font-medium mt-0.5 flex items-center gap-1">
 ⚠️ {overtimeTotal.toFixed(1)}h OT
 </p>
 )}
 {card.label === 'Đã vào' && lateCount > 0 && (
 <p className="text-xs text-red-600 font-medium mt-0.5">
 🟠 {lateCount} trễ giờ
 </p>
 )}
 </div>
 {/* Mini progress ring */}
 <div className="relative h-12 w-12 shrink-0">
 <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
 <circle
 cx="18"
 cy="18"
 r="14"
 fill="none"
 className="stroke-gray-200"
 strokeWidth="3"
 />
 <circle
 cx="18"
 cy="18"
 r="14"
 fill="none"
 className={card.ringColor}
 strokeWidth="3"
 strokeDasharray={`${(card.ringPercent / 100) * 87.96} 87.96`}
 strokeLinecap="round"
 style={{ transition: 'stroke-dasharray 0.6s ease' }}
 />
 </svg>
 <div className="absolute inset-0 flex items-center justify-center">
 <card.icon className="h-4 w-4 text-gray-400" />
 </div>
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 );
}
