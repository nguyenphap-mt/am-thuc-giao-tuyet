'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Employee } from '@/types';
import {
    IconSearch,
    IconPlus,
    IconUsers,
    IconClock,
    IconCash,
    IconStar,
    IconStarFilled,
    IconRefresh,
    IconDotsVertical,
    IconEdit,
    IconPhone,
    IconMail,
} from '@tabler/icons-react';

export default function HrPage() {
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [starredIds, setStarredIds] = useState<number[]>([]);
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['employees', search],
        queryFn: () => api.get<{ items: Employee[]; total: number }>(`/hr/employees?search=${search}`),
    });

    const employees = data?.items || [];
    const stats = {
        total: data?.total || 0,
        active: employees.filter((e: Employee) => e.is_active).length,
        inactive: employees.filter((e: Employee) => !e.is_active).length,
    };

    const toggleSelect = (id: number) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const toggleSelectAll = () => setSelectedIds(selectedIds.length === employees.length ? [] : employees.map((e: Employee) => e.id));
    const toggleStar = (id: number, e: React.MouseEvent) => { e.stopPropagation(); setStarredIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };

    return (
        <div className="space-y-4">
            <motion.div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">Nhân sự</h1>
                    <p className="text-sm text-gray-500">Quản lý nhân viên</p>
                </div>
                <Button className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                    <IconPlus className="mr-2 h-4 w-4" />Thêm nhân viên
                </Button>
            </motion.div>

            <motion.div className="grid grid-cols-3 gap-2 md:gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                {[
                    { label: 'Tổng NV', value: stats.total, icon: IconUsers, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
                    { label: 'Đang làm', value: stats.active, icon: IconClock, bgColor: 'bg-green-50', iconColor: 'text-green-600' },
                    { label: 'Lương tháng', value: '--', icon: IconCash, bgColor: 'bg-purple-50', iconColor: 'text-purple-600' },
                ].map((stat, i) => (
                    <Card key={i} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-3 md:p-4">
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className={`p-1.5 md:p-2 rounded-lg ${stat.bgColor}`}>
                                    <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.iconColor}`} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">{stat.label}</p>
                                    <p className="text-base md:text-lg font-bold">{stat.value}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Tabs defaultValue="employees" className="space-y-4">
                    <TabsList className="w-full md:w-auto flex overflow-x-auto">
                        <TabsTrigger value="employees" className="text-xs md:text-sm">Nhân viên</TabsTrigger>
                        <TabsTrigger value="timesheets" className="text-xs md:text-sm">Chấm công</TabsTrigger>
                        <TabsTrigger value="payroll" className="text-xs md:text-sm">Lương</TabsTrigger>
                        <TabsTrigger value="leave" className="text-xs md:text-sm">Nghỉ phép</TabsTrigger>
                    </TabsList>

                    <TabsContent value="employees">
                        <Card className="overflow-hidden">
                            <div className="flex items-center gap-2 p-2 md:p-3 border-b bg-gray-50/50">
                                <Checkbox checked={employees.length > 0 && selectedIds.length === employees.length} onCheckedChange={toggleSelectAll} className="ml-1" />
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}><IconRefresh className="h-4 w-4" /></Button>
                                <div className="flex-1" />
                                <div className="relative w-full max-w-xs">
                                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
                                </div>
                            </div>

                            <div className="divide-y">
                                {isLoading ? (
                                    <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                                ) : employees.length === 0 ? (
                                    <div className="text-center py-16">
                                        <IconUsers className="mx-auto h-12 w-12 text-gray-300" />
                                        <p className="mt-4 text-gray-500">Chưa có nhân viên</p>
                                    </div>
                                ) : (
                                    employees.map((emp: Employee) => (
                                        <div
                                            key={emp.id}
                                            className={`flex items-center gap-2 md:gap-4 px-2 md:px-4 py-2 md:py-3 cursor-pointer transition-colors ${selectedIds.includes(emp.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                            onMouseEnter={() => setHoveredId(emp.id)}
                                            onMouseLeave={() => setHoveredId(null)}
                                            onClick={() => toggleSelect(emp.id)}
                                        >
                                            <Checkbox checked={selectedIds.includes(emp.id)} onCheckedChange={() => toggleSelect(emp.id)} onClick={(e) => e.stopPropagation()} />
                                            <button onClick={(e) => toggleStar(emp.id, e)} className="p-1 hover:bg-gray-100 rounded">
                                                {starredIds.includes(emp.id) ? <IconStarFilled className="h-4 w-4 text-amber-400" /> : <IconStar className="h-4 w-4 text-gray-400" />}
                                            </button>

                                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-medium text-sm shrink-0">
                                                {emp.full_name?.charAt(0) || 'N'}
                                            </div>

                                            <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-4">
                                                <div className="w-28 md:w-40 truncate">
                                                    <span className="font-medium text-sm text-gray-900">{emp.full_name}</span>
                                                </div>
                                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                                    <Badge className={`${emp.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'} text-xs px-1.5 py-0.5 shrink-0`}>
                                                        {emp.is_active ? 'HĐ' : 'Nghỉ'}
                                                    </Badge>
                                                    <span className="text-sm text-gray-500 truncate hidden sm:inline">{emp.position}</span>
                                                </div>
                                                <div className="text-right shrink-0 hidden md:block">
                                                    <span className="text-sm text-gray-500">{emp.department}</span>
                                                </div>
                                            </div>

                                            <div className={`flex items-center gap-0.5 shrink-0 ${hoveredId === emp.id ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}><IconPhone className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}><IconMail className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}><IconEdit className="h-4 w-4" /></Button>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden" onClick={(e) => e.stopPropagation()}><IconDotsVertical className="h-4 w-4" /></Button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {employees.length > 0 && (
                                <div className="flex items-center justify-between p-3 border-t bg-gray-50/50 text-sm text-gray-500">
                                    <span>{selectedIds.length > 0 ? `${selectedIds.length} đã chọn` : `${employees.length} NV`}</span>
                                </div>
                            )}
                        </Card>
                    </TabsContent>
                    <TabsContent value="timesheets"><Card><CardContent className="py-12 text-center text-gray-500"><IconClock className="mx-auto h-12 w-12 text-gray-300 mb-4" />Chấm công</CardContent></Card></TabsContent>
                    <TabsContent value="payroll"><Card><CardContent className="py-12 text-center text-gray-500"><IconCash className="mx-auto h-12 w-12 text-gray-300 mb-4" />Bảng lương</CardContent></Card></TabsContent>
                    <TabsContent value="leave"><Card><CardContent className="py-12 text-center text-gray-500"><IconUsers className="mx-auto h-12 w-12 text-gray-300 mb-4" />Nghỉ phép</CardContent></Card></TabsContent>
                </Tabs>
            </motion.div>
        </div>
    );
}
