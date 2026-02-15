'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

export interface SparklineDataPoint {
    month: string;
    value: number;
}

export interface SparklineKpiCardProps {
    title: string;
    value: number;
    trend: number;
    icon: React.ElementType;
    bgColor: string;
    iconColor: string;
    accentColor: string;        // Tailwind color for sparkline area (e.g. '#22c55e')
    sparklineData?: SparklineDataPoint[];
    variant?: 'primary' | 'secondary';
    isLoading?: boolean;
    /** For "Chi phí": decreasing trend = good */
    invertTrend?: boolean;
    onClick?: () => void;
}

export function SparklineKpiCard({
    title,
    value,
    trend,
    icon: Icon,
    bgColor,
    iconColor,
    accentColor,
    sparklineData,
    variant = 'primary',
    isLoading = false,
    invertTrend = false,
    onClick,
}: SparklineKpiCardProps) {
    const trendPercent = trend || 0;
    const isPositive = invertTrend ? trendPercent < 0 : trendPercent > 0;
    const TrendIcon = trendPercent >= 0 ? IconTrendingUp : IconTrendingDown;

    if (variant === 'secondary') {
        return (
            <Card
                className="hover:shadow-sm transition-all cursor-pointer group border-gray-200 dark:border-gray-700"
                onClick={onClick}
            >
                <CardContent className="p-3">
                    {isLoading ? <Skeleton className="h-10 w-full animate-pulse" /> : (
                        <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg ${bgColor} group-hover:scale-105 transition-transform shrink-0`}>
                                <Icon className={`h-4 w-4 ${iconColor}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">{title}</p>
                                <p className="text-sm font-bold truncate tabular-nums">{formatCurrency(value)}</p>
                            </div>
                            {trendPercent !== 0 && (
                                <div className={`flex items-center gap-0.5 text-[11px] shrink-0 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                    <TrendIcon className="h-3 w-3" />
                                    <span className="tabular-nums">
                                        {trendPercent > 0 ? '+' : ''}{trendPercent.toFixed(1)}%
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    // === PRIMARY variant ===
    return (
        <Card
            className="hover:shadow-md transition-all cursor-pointer group overflow-hidden"
            onClick={onClick}
        >
            <CardContent className="p-4 md:p-5 relative">
                {isLoading ? <Skeleton className="h-24 w-full animate-pulse" /> : (
                    <div className="space-y-2">
                        {/* Header: Icon + Title + Trend */}
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className={`p-2 rounded-xl ${bgColor} group-hover:scale-110 transition-transform`}>
                                    <Icon className={`h-5 w-5 ${iconColor}`} />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
                                    <p className="text-lg md:text-xl font-bold tabular-nums leading-tight mt-0.5">
                                        {formatCurrency(value)}
                                    </p>
                                </div>
                            </div>
                            {trendPercent !== 0 && (
                                <motion.div
                                    initial={{ opacity: 0, x: 5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isPositive
                                            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }`}
                                >
                                    <TrendIcon className="h-3.5 w-3.5" />
                                    <span className="tabular-nums">
                                        {trendPercent > 0 ? '+' : ''}{trendPercent.toFixed(1)}%
                                    </span>
                                </motion.div>
                            )}
                        </div>

                        {/* Sparkline Area Chart */}
                        {sparklineData && sparklineData.length > 1 && (
                            <div className="h-10 -mx-1 mt-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={sparklineData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id={`sparkGrad-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={accentColor} stopOpacity={0.3} />
                                                <stop offset="100%" stopColor={accentColor} stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke={accentColor}
                                            strokeWidth={1.5}
                                            fill={`url(#sparkGrad-${title.replace(/\s/g, '')})`}
                                            dot={false}
                                            isAnimationActive={true}
                                            animationDuration={800}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Footer: period label */}
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">vs tháng trước</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
