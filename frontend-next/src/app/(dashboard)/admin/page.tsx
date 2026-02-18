'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User } from '@/types';
import { UserFormModal } from './components/user-form-modal';
import {
    IconSearch, IconPlus, IconEdit, IconTrash, IconShield, IconUsers,
    IconUserCheck, IconUserOff, IconRefresh, IconDotsVertical,
    IconMail, IconChevronRight, IconAlertTriangle
} from '@tabler/icons-react';
import { toast } from 'sonner';

const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.03 } }
};
const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function AdminPage() {
    const [search, setSearch] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const queryClient = useQueryClient();

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['admin-users', search],
        queryFn: () => api.get<{ items: User[]; total: number }>(`/admin/users?search=${search}`),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/admin/users/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast.success('Xóa người dùng thành công');
            setDeleteId(null);
        },
        onError: () => toast.error('Không thể xóa người dùng'),
    });

    const users = data?.items || [];
    const total = data?.total || 0;
    const activeUsers = users.filter(u => u.is_active).length;
    const inactiveUsers = users.filter(u => !u.is_active).length;

    const getInitials = (name: string) => name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === users.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(users.map(u => u.id));
        }
    };

    // Stats data
    const stats = [
        { label: 'Tổng người dùng', value: total, icon: IconUsers, color: 'text-purple-500', bg: 'bg-purple-50' },
        { label: 'Đang hoạt động', value: activeUsers, icon: IconUserCheck, color: 'text-green-500', bg: 'bg-green-50' },
        { label: 'Đã khóa', value: inactiveUsers, icon: IconUserOff, color: 'text-red-500', bg: 'bg-red-50' },
    ];

    const roles = [
        { name: 'Super Admin', count: 1, permissions: 'Toàn quyền hệ thống', color: 'bg-purple-500' },
        { name: 'Admin', count: 2, permissions: 'Quản lý người dùng, cài đặt', color: 'bg-blue-500' },
        { name: 'Manager', count: 5, permissions: 'Quản lý đơn hàng, khách hàng', color: 'bg-green-500' },
        { name: 'Staff', count: 10, permissions: 'Xem và tạo đơn hàng', color: 'bg-gray-500' },
    ];

    return (
        <div className="space-y-4">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">Quản trị hệ thống</h1>
                    <p className="text-sm text-gray-500">Quản lý người dùng và phân quyền</p>
                </div>
                <Button
                    onClick={() => refetch()}
                    variant="outline"
                    size="sm"
                    className="w-fit"
                >
                    <IconRefresh className="mr-2 h-4 w-4" />
                    Làm mới
                </Button>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
                className="grid grid-cols-3 gap-3"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                {stats.map((stat, index) => (
                    <motion.div key={index} variants={itemVariants}>
                        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-3 md:p-4">
                                <div className="flex items-center gap-3">
                                    <div className={`h-10 w-10 md:h-12 md:w-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                                        <stat.icon className={`h-5 w-5 md:h-6 md:w-6 ${stat.color}`} />
                                    </div>
                                    <div>
                                        <p className="text-lg md:text-2xl font-bold text-gray-900">{stat.value}</p>
                                        <p className="text-xs md:text-sm text-gray-500">{stat.label}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Tabs defaultValue="users" className="space-y-4">
                    <TabsList className="w-full md:w-auto grid grid-cols-2 md:flex bg-gray-100/80 p-1 rounded-lg">
                        <TabsTrigger value="users" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <IconUsers className="mr-1 md:mr-2 h-4 w-4" />
                            Người dùng
                        </TabsTrigger>
                        <TabsTrigger value="roles" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <IconShield className="mr-1 md:mr-2 h-4 w-4" />
                            Vai trò
                        </TabsTrigger>
                    </TabsList>

                    {/* Users Tab */}
                    <TabsContent value="users" className="space-y-4">
                        {/* Search and Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-between">
                            <div className="relative flex-1 max-w-md">
                                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Tìm kiếm người dùng..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 h-10 focus-visible:ring-purple-500"
                                />
                            </div>
                            <Button className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 transition-opacity" onClick={() => setShowAddModal(true)}>
                                <IconPlus className="mr-2 h-4 w-4" />
                                Thêm người dùng
                            </Button>
                        </div>

                        {/* Bulk Actions */}
                        {selectedIds.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200"
                            >
                                <span className="text-sm font-medium text-purple-700">
                                    Đã chọn {selectedIds.length} người dùng
                                </span>
                                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                    <IconTrash className="mr-1 h-4 w-4" />
                                    Xóa
                                </Button>
                                <Button variant="outline" size="sm">
                                    <IconMail className="mr-1 h-4 w-4" />
                                    Gửi email
                                </Button>
                            </motion.div>
                        )}

                        {/* Users List */}
                        <Card className="border-0 shadow-sm overflow-hidden">
                            <CardContent className="p-0">
                                {isLoading ? (
                                    <div className="p-4 space-y-3">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <Skeleton className="h-10 w-10 rounded-full" />
                                                <div className="flex-1 space-y-2">
                                                    <Skeleton className="h-4 w-1/3" />
                                                    <Skeleton className="h-3 w-1/4" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : users.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <IconUsers className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                        <p className="text-gray-500">Chưa có người dùng nào</p>
                                    </div>
                                ) : (
                                    <motion.div
                                        variants={containerVariants}
                                        initial="hidden"
                                        animate="show"
                                    >
                                        {/* Header Row */}
                                        <div className="hidden md:flex items-center gap-3 px-4 py-3 bg-gray-50 border-b text-sm font-medium text-gray-500">
                                            <Checkbox
                                                checked={selectedIds.length === users.length && users.length > 0}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                            <div className="flex-1">Người dùng</div>
                                            <div className="w-24 text-center">Vai trò</div>
                                            <div className="w-24 text-center">Trạng thái</div>
                                            <div className="w-20"></div>
                                        </div>

                                        {/* User Rows */}
                                        {users.map((user: User) => (
                                            <motion.div
                                                key={user.id}
                                                variants={itemVariants}
                                                onMouseEnter={() => setHoveredId(user.id)}
                                                onMouseLeave={() => setHoveredId(null)}
                                                className={`flex items-center gap-3 px-4 py-3 border-b last:border-b-0 transition-colors cursor-pointer ${selectedIds.includes(user.id) ? 'bg-purple-50' :
                                                    hoveredId === user.id ? 'bg-gray-50' : ''
                                                    }`}
                                            >
                                                <Checkbox
                                                    checked={selectedIds.includes(user.id)}
                                                    onCheckedChange={() => toggleSelect(user.id)}
                                                />

                                                {/* User Info */}
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-sm font-medium">
                                                            {getInitials(user.full_name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-gray-900 truncate">{user.full_name}</p>
                                                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                                                    </div>
                                                </div>

                                                {/* Role Badge */}
                                                <div className="hidden md:block w-24 text-center">
                                                    <Badge variant="outline" className="font-normal">
                                                        {user.role}
                                                    </Badge>
                                                </div>

                                                {/* Status Badge */}
                                                <div className="hidden md:block w-24 text-center">
                                                    <Badge className={user.is_active
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-100'
                                                    }>
                                                        {user.is_active ? 'Hoạt động' : 'Đã khóa'}
                                                    </Badge>
                                                </div>

                                                {/* Actions */}
                                                <div className="w-20 flex items-center justify-end gap-1">
                                                    {hoveredId === user.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, x: 10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            className="flex gap-1"
                                                        >
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <IconEdit className="h-4 w-4 text-gray-500" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => setDeleteId(user.id)}
                                                            >
                                                                <IconTrash className="h-4 w-4 text-red-500" />
                                                            </Button>
                                                        </motion.div>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden">
                                                        <IconDotsVertical className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Roles Tab */}
                    <TabsContent value="roles" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-medium text-gray-900">Danh sách vai trò</h3>
                                <p className="text-sm text-gray-500">Quản lý vai trò và phân quyền trong hệ thống</p>
                            </div>
                            <Button className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 transition-opacity">
                                <IconPlus className="mr-2 h-4 w-4" />
                                Thêm vai trò
                            </Button>
                        </div>

                        <motion.div
                            className="grid gap-3"
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                        >
                            {roles.map((role, index) => (
                                <motion.div key={index} variants={itemVariants}>
                                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`h-12 w-12 rounded-xl ${role.color} flex items-center justify-center`}>
                                                        <IconShield className="h-6 w-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold text-gray-900">{role.name}</h4>
                                                            <Badge variant="outline" className="text-xs">
                                                                {role.count} người
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-gray-500">{role.permissions}</p>
                                                    </div>
                                                </div>
                                                <IconChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    </TabsContent>
                </Tabs>
            </motion.div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
                            <IconAlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                        <DialogTitle className="text-center">Xác nhận xóa người dùng</DialogTitle>
                        <DialogDescription className="text-center">
                            Bạn có chắc chắn muốn xóa người dùng này? Hành động này không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:justify-center">
                        <Button variant="outline" onClick={() => setDeleteId(null)}>
                            Hủy
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa người dùng'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <UserFormModal open={showAddModal} onClose={() => setShowAddModal(false)} />
        </div>
    );
}
