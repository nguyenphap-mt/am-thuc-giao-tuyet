'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconChevronLeft, IconChevronRight, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';

const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const months = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const today = new Date();
    const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

    return (
        <div className="space-y-4">
            {/* Header */}
            <motion.div
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">Lịch sự kiện</h1>
                    <p className="text-sm text-gray-500">Quản lý lịch tiệc và sự kiện</p>
                </div>
                <Button className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                    <IconPlus className="mr-2 h-4 w-4" />Thêm sự kiện
                </Button>
            </motion.div>

            {/* Calendar */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
                            <IconChevronLeft className="h-4 w-4" />
                        </Button>
                        <CardTitle className="text-base md:text-lg">{months[month]} {year}</CardTitle>
                        <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
                            <IconChevronRight className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-2 md:p-4">
                        {/* Days header */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {daysOfWeek.map((day) => (
                                <div key={day} className="text-center text-xs md:text-sm font-medium text-gray-500 py-1 md:py-2">
                                    {day}
                                </div>
                            ))}
                        </div>
                        {/* Calendar grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {days.map((day, i) => (
                                <motion.div
                                    key={i}
                                    className={`
                                        min-h-[50px] md:min-h-[80px] p-1 md:p-2 border rounded-lg transition-all
                                        ${day ? 'hover:bg-gray-50 hover:shadow-sm cursor-pointer' : ''}
                                        ${day && isToday(day) ? 'bg-purple-50 border-purple-300' : 'border-gray-200'}
                                    `}
                                    whileHover={day ? { scale: 1.02 } : {}}
                                >
                                    {day && (
                                        <span className={`text-xs md:text-sm font-medium ${isToday(day) ? 'text-purple-600' : 'text-gray-700'}`}>
                                            {day}
                                        </span>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
