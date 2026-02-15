'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    IconSearch, IconPlus, IconEdit, IconTrash,
    IconUsers, IconUserCheck, IconUserX, IconShield,
    IconRefresh
} from '@tabler/icons-react';
import { UserModal } from './user-modal';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { UserItem } from '@/types/user';
import { getRoleCode, getRoleName, ROLE_BADGE_COLORS, getAvatarColor } from '@/types/user';
import { useUsers, useUserStats, useRoles, useDeleteUser, type UserFilters } from '@/hooks/use-users';
import { useDebounce } from '@/hooks/use-debounce';

const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.04 } }
};
const itemVariants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

export function UserManagementTab() {
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserItem | null>(null);
    const [deleteUserTarget, setDeleteUserTarget] = useState<UserItem | null>(null);

    // Debounced search for API
    const debouncedSearch = useDebounce(search, 300);

    // React Query hooks
    const filters: UserFilters = useMemo(() => ({
        search: debouncedSearch || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
    }), [debouncedSearch, roleFilter, statusFilter]);

    const { data: users = [], isLoading: loading, refetch: refetchUsers } = useUsers(filters);
    const { data: stats, refetch: refetchStats } = useUserStats();
    const { data: roles = [] } = useRoles();
    const deleteMutation = useDeleteUser();

    const handleCreateUser = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const handleEditUser = (user: UserItem) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleDeleteUser = async () => {
        if (!deleteUserTarget) return;
        deleteMutation.mutate(deleteUserTarget.id, {
            onSuccess: () => {
                setDeleteUserTarget(null);
            },
        });
    };

    const handleUserSaved = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleRefresh = () => {
        refetchUsers();
        refetchStats();
    };

    return (
        <motion.div className="space-y-4" variants={containerVariants} initial="hidden" animate="show">
            {/* Stats Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {!stats ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <Skeleton className="h-4 w-20 mb-2" />
                                <Skeleton className="h-8 w-12" />
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Tổng người dùng</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total || 0}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                        <IconUsers className="h-5 w-5 text-purple-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Đang hoạt động</p>
                                        <p className="text-2xl font-bold text-green-600">{stats.active || 0}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                                        <IconUserCheck className="h-5 w-5 text-green-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Không hoạt động</p>
                                        <p className="text-2xl font-bold text-red-500">{stats.inactive || 0}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                                        <IconUserX className="h-5 w-5 text-red-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Vai trò</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {stats.by_role ? Object.keys(stats.by_role).length : 0}
                                        </p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <IconShield className="h-5 w-5 text-blue-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </motion.div>

            {/* Search + Actions */}
            <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                                <Input
                                    placeholder="Tìm kiếm theo tên hoặc email..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 h-10 focus-visible:ring-purple-500"
                                />
                            </div>
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-full sm:w-[180px] h-10">
                                    <SelectValue placeholder="Tất cả vai trò" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả vai trò</SelectItem>
                                    {roles.map(r => (
                                        <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-[160px] h-10">
                                    <SelectValue placeholder="Tất cả trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                                    <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                                    <SelectItem value="INACTIVE">Đã khóa</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10 shrink-0"
                                    onClick={handleRefresh}
                                >
                                    <IconRefresh className="h-4 w-4" />
                                </Button>
                                <Button
                                    onClick={handleCreateUser}
                                    className="h-10 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 transition-opacity whitespace-nowrap"
                                >
                                    <IconPlus className="mr-2 h-4 w-4" />
                                    Thêm nhân viên
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* User List */}
            <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-4 space-y-3">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-4 p-3">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-48" />
                                        </div>
                                        <Skeleton className="h-6 w-16 rounded-full" />
                                    </div>
                                ))}
                            </div>
                        ) : users.length === 0 ? (
                            <div className="p-12 text-center">
                                <IconUsers className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-500 dark:text-gray-400 font-medium">Không tìm thấy người dùng</p>
                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Thử thay đổi bộ lọc hoặc thêm nhân viên mới</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {/* Table Header */}
                                <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-900/50 dark:bg-gray-800/50 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <div className="col-span-4">Nhân viên</div>
                                    <div className="col-span-2">Vai trò</div>
                                    <div className="col-span-2">Trạng thái</div>
                                    <div className="col-span-2">Ngày tạo</div>
                                    <div className="col-span-2 text-right">Thao tác</div>
                                </div>
                                {/* Table Rows */}
                                {users.map((user) => {
                                    const roleCode = getRoleCode(user.role);
                                    const roleName = getRoleName(user.role);
                                    const initials = user.full_name
                                        ?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
                                    const isActive = user.is_active && (user.status || 'ACTIVE') === 'ACTIVE';

                                    return (
                                        <div
                                            key={user.id}
                                            className="group relative grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 py-3 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 transition-colors items-center"
                                        >
                                            {/* User info */}
                                            <div className="col-span-4 flex items-center gap-3 min-w-0">
                                                <div className={`h-10 w-10 rounded-full shrink-0 flex items-center justify-center text-sm font-bold ${getAvatarColor(user.full_name || user.email)}`}>
                                                    {initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{user.full_name}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                                                </div>
                                            </div>

                                            {/* Role badge */}
                                            <div className="col-span-2">
                                                <Badge className={`text-xs ${ROLE_BADGE_COLORS[roleCode] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                                                    {roleName}
                                                </Badge>
                                            </div>

                                            {/* Status */}
                                            <div className="col-span-2">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-400'}`} />
                                                    <span className={`text-sm ${isActive ? 'text-green-600' : 'text-red-500'}`}>
                                                        {isActive ? 'Hoạt động' : 'Đã khóa'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Created date */}
                                            <div className="col-span-2 text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(user.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            </div>

                                            {/* Actions */}
                                            <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                                                    onClick={() => handleEditUser(user)}
                                                >
                                                    <IconEdit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => setDeleteUserTarget(user)}
                                                >
                                                    <IconTrash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* User Modal */}
            <UserModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                user={editingUser}
                roles={roles}
                onSaved={handleUserSaved}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteUserTarget} onOpenChange={(open) => !open && setDeleteUserTarget(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Xác nhận xóa người dùng</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa <span className="font-semibold">{deleteUserTarget?.full_name}</span>?
                            <br />Hành động này không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:justify-end">
                        <Button variant="outline" onClick={() => setDeleteUserTarget(null)} disabled={deleteMutation.isPending}>
                            Hủy
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteUser}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa người dùng'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
