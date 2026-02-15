'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    IconCamera, IconMail, IconShield, IconPhone, IconUser,
    IconLock, IconKey, IconDevices, IconHistory, IconCheck,
    IconAlertTriangle, IconFingerprint
} from '@tabler/icons-react';
import { toast } from 'sonner';

const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function ProfilePage() {
    const { user } = useAuthStore();
    const [twoFactor, setTwoFactor] = useState(false);

    const getInitials = (name: string) => name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

    const handleSave = () => {
        toast.success('Đã cập nhật thông tin thành công');
    };

    const handlePasswordChange = () => {
        toast.success('Mật khẩu đã được thay đổi');
    };

    const recentActivities = [
        { id: 1, action: 'Đăng nhập', device: 'Chrome - Windows', time: '5 phút trước', ip: '192.168.1.100' },
        { id: 2, action: 'Cập nhật hồ sơ', device: 'Chrome - Windows', time: '2 giờ trước', ip: '192.168.1.100' },
        { id: 3, action: 'Đăng nhập', device: 'Safari - iPhone', time: 'Hôm qua', ip: '192.168.1.105' },
    ];

    return (
        <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Trang cá nhân</h1>
                <p className="text-sm text-gray-500">Quản lý thông tin và bảo mật tài khoản</p>
            </motion.div>

            <Tabs defaultValue="profile" className="space-y-4">
                <TabsList className="w-full md:w-auto grid grid-cols-3 md:flex bg-gray-100/80 p-1 rounded-lg">
                    <TabsTrigger value="profile" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <IconUser className="mr-1 md:mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Hồ sơ</span>
                    </TabsTrigger>
                    <TabsTrigger value="security" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <IconShield className="mr-1 md:mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Bảo mật</span>
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <IconHistory className="mr-1 md:mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Hoạt động</span>
                    </TabsTrigger>
                </TabsList>

                {/* Profile Tab */}
                <TabsContent value="profile">
                    <motion.div
                        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                    >
                        {/* Avatar Card */}
                        <motion.div variants={itemVariants}>
                            <Card className="border-0 shadow-sm h-full">
                                <CardContent className="p-6 flex flex-col items-center">
                                    <div className="relative group">
                                        <Avatar className="h-28 w-28 md:h-36 md:w-36 transition-transform group-hover:scale-105">
                                            <AvatarFallback className="text-3xl md:text-4xl bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 text-white font-bold">
                                                {user?.full_name ? getInitials(user.full_name) : 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <Button
                                            size="icon"
                                            className="absolute bottom-1 right-1 rounded-full h-10 w-10 bg-white border-2 border-purple-500 shadow-lg hover:bg-purple-50 transition-all"
                                        >
                                            <IconCamera className="h-4 w-4 text-purple-600" />
                                        </Button>
                                    </div>
                                    <h2 className="mt-4 text-xl md:text-2xl font-bold text-gray-900">{user?.full_name || 'Người dùng'}</h2>
                                    <Badge className="mt-2 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white">
                                        {user?.role || 'User'}
                                    </Badge>

                                    <div className="mt-6 w-full space-y-3">
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                                            <IconMail className="h-5 w-5 text-gray-400 shrink-0" />
                                            <span className="text-sm truncate text-gray-600">{user?.email || 'email@example.com'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                                            <IconPhone className="h-5 w-5 text-gray-400 shrink-0" />
                                            <span className="text-sm text-gray-600">Chưa cập nhật</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                                            <IconShield className="h-5 w-5 text-green-500 shrink-0" />
                                            <span className="text-sm text-green-600 font-medium">Tài khoản đã xác thực</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Info Card */}
                        <motion.div variants={itemVariants} className="lg:col-span-2">
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <IconUser className="h-5 w-5 text-purple-500" />
                                        Thông tin cá nhân
                                    </CardTitle>
                                    <CardDescription className="text-sm">Cập nhật thông tin hồ sơ của bạn</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Họ và tên</Label>
                                            <Input defaultValue={user?.full_name} className="h-10 focus-visible:ring-purple-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Email</Label>
                                            <Input defaultValue={user?.email} disabled className="h-10 bg-gray-50" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Số điện thoại</Label>
                                            <Input placeholder="Nhập số điện thoại..." className="h-10 focus-visible:ring-purple-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Vai trò</Label>
                                            <Input defaultValue={user?.role} disabled className="h-10 bg-gray-50" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Ngày sinh</Label>
                                            <Input type="date" className="h-10 focus-visible:ring-purple-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Giới tính</Label>
                                            <Input placeholder="Nam / Nữ / Khác" className="h-10 focus-visible:ring-purple-500" />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-sm font-medium">Địa chỉ</Label>
                                            <Input placeholder="Nhập địa chỉ..." className="h-10 focus-visible:ring-purple-500" />
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleSave}
                                        className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 transition-opacity"
                                    >
                                        <IconCheck className="mr-2 h-4 w-4" />
                                        Cập nhật thông tin
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security">
                    <motion.div
                        className="space-y-4"
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                    >
                        {/* Change Password */}
                        <motion.div variants={itemVariants}>
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <IconLock className="h-5 w-5 text-purple-500" />
                                        Đổi mật khẩu
                                    </CardTitle>
                                    <CardDescription className="text-sm">Cập nhật mật khẩu đăng nhập</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Mật khẩu hiện tại</Label>
                                            <Input type="password" placeholder="••••••••" className="h-10 focus-visible:ring-purple-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Mật khẩu mới</Label>
                                            <Input type="password" placeholder="••••••••" className="h-10 focus-visible:ring-purple-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Xác nhận mật khẩu</Label>
                                            <Input type="password" placeholder="••••••••" className="h-10 focus-visible:ring-purple-500" />
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                                        <div className="flex gap-2">
                                            <IconAlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                                            <div className="text-sm text-amber-700">
                                                <p className="font-medium">Yêu cầu mật khẩu:</p>
                                                <ul className="mt-1 list-disc list-inside text-amber-600">
                                                    <li>Tối thiểu 8 ký tự</li>
                                                    <li>Chứa chữ hoa, chữ thường và số</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handlePasswordChange}
                                        className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 transition-opacity"
                                    >
                                        <IconKey className="mr-2 h-4 w-4" />
                                        Đổi mật khẩu
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Two Factor Auth */}
                        <motion.div variants={itemVariants}>
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <IconFingerprint className="h-5 w-5 text-purple-500" />
                                        Xác thực 2 lớp (2FA)
                                    </CardTitle>
                                    <CardDescription className="text-sm">Tăng cường bảo mật tài khoản</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between p-4 rounded-lg border-2 border-dashed hover:border-purple-300 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${twoFactor ? 'bg-green-100' : 'bg-gray-100'}`}>
                                                <IconShield className={`h-6 w-6 ${twoFactor ? 'text-green-600' : 'text-gray-400'}`} />
                                            </div>
                                            <div>
                                                <p className="font-medium">Xác thực qua ứng dụng</p>
                                                <p className="text-sm text-gray-500">
                                                    {twoFactor ? 'Đã bật - Tài khoản được bảo vệ' : 'Sử dụng Google Authenticator hoặc Authy'}
                                                </p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={twoFactor}
                                            onCheckedChange={setTwoFactor}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Active Sessions */}
                        <motion.div variants={itemVariants}>
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <IconDevices className="h-5 w-5 text-purple-500" />
                                                Phiên đăng nhập
                                            </CardTitle>
                                            <CardDescription className="text-sm">Các thiết bị đang đăng nhập</CardDescription>
                                        </div>
                                        <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                            Đăng xuất tất cả
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                                    <IconDevices className="h-5 w-5 text-green-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-green-700">Thiết bị hiện tại</p>
                                                    <p className="text-sm text-green-600">Chrome - Windows • 192.168.1.100</p>
                                                </div>
                                            </div>
                                            <Badge className="bg-green-500">Đang hoạt động</Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                    >
                        <motion.div variants={itemVariants}>
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <IconHistory className="h-5 w-5 text-purple-500" />
                                        Lịch sử hoạt động
                                    </CardTitle>
                                    <CardDescription className="text-sm">Các hoạt động gần đây trên tài khoản</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {recentActivities.map((activity) => (
                                            <div
                                                key={activity.id}
                                                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                                        <IconHistory className="h-5 w-5 text-purple-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{activity.action}</p>
                                                        <p className="text-sm text-gray-500">{activity.device} • {activity.ip}</p>
                                                    </div>
                                                </div>
                                                <span className="text-sm text-gray-400">{activity.time}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
