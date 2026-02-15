'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
    IconSettings, IconBuilding, IconPalette, IconBell,
    IconSun, IconMoon, IconCheck, IconUpload, IconMail,
    IconMessage, IconBellRinging, IconCalendar
} from '@tabler/icons-react';
import { toast } from 'sonner';

const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function SettingsPage() {
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        sms: false,
        orders: true,
        events: true,
        marketing: false
    });

    const handleSave = () => {
        toast.success('Đã lưu cài đặt thành công');
    };

    return (
        <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Cài đặt</h1>
                <p className="text-sm text-gray-500">Cấu hình hệ thống của bạn</p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Tabs defaultValue="general" className="space-y-4">
                    <TabsList className="w-full md:w-auto grid grid-cols-4 md:flex bg-gray-100/80 p-1 rounded-lg">
                        <TabsTrigger value="general" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <IconSettings className="mr-1 md:mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Chung</span>
                        </TabsTrigger>
                        <TabsTrigger value="company" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <IconBuilding className="mr-1 md:mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Công ty</span>
                        </TabsTrigger>
                        <TabsTrigger value="appearance" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <IconPalette className="mr-1 md:mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Giao diện</span>
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <IconBell className="mr-1 md:mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Thông báo</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* General Settings */}
                    <TabsContent value="general">
                        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
                            <motion.div variants={itemVariants}>
                                <Card className="border-0 shadow-sm">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <IconSettings className="h-5 w-5 text-purple-500" />
                                            Cài đặt chung
                                        </CardTitle>
                                        <CardDescription className="text-sm">Cấu hình cơ bản của hệ thống</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Tên hệ thống</Label>
                                                <Input defaultValue="Ẩm Thực Giao Tuyết" className="h-10 focus-visible:ring-purple-500" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Ngôn ngữ</Label>
                                                <Input defaultValue="Tiếng Việt" disabled className="h-10 bg-gray-50" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Múi giờ</Label>
                                                <Input defaultValue="Asia/Ho_Chi_Minh (UTC+7)" disabled className="h-10 bg-gray-50" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Định dạng ngày</Label>
                                                <Input defaultValue="dd/MM/yyyy" disabled className="h-10 bg-gray-50" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Định dạng tiền tệ</Label>
                                                <Input defaultValue="VND (₫)" disabled className="h-10 bg-gray-50" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Phiên bản</Label>
                                                <Input defaultValue="v1.0.0" disabled className="h-10 bg-gray-50" />
                                            </div>
                                        </div>
                                        <Button onClick={handleSave} className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 transition-opacity">
                                            <IconCheck className="mr-2 h-4 w-4" />
                                            Lưu cài đặt
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </motion.div>
                    </TabsContent>

                    {/* Company Settings */}
                    <TabsContent value="company">
                        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
                            <motion.div variants={itemVariants}>
                                <Card className="border-0 shadow-sm">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <IconBuilding className="h-5 w-5 text-purple-500" />
                                            Thông tin công ty
                                        </CardTitle>
                                        <CardDescription className="text-sm">Cập nhật thông tin doanh nghiệp</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Logo Upload */}
                                        <div className="flex items-center gap-4 p-4 border-2 border-dashed rounded-lg hover:border-purple-300 transition-colors">
                                            <div className="h-16 w-16 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                                                <span className="text-white font-bold text-xl">GT</span>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-medium">Logo công ty</h4>
                                                <p className="text-sm text-gray-500">PNG, JPG tối đa 2MB</p>
                                            </div>
                                            <Button variant="outline" size="sm">
                                                <IconUpload className="mr-2 h-4 w-4" />
                                                Tải lên
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Tên công ty</Label>
                                                <Input defaultValue="Ẩm Thực Giao Tuyết" className="h-10 focus-visible:ring-purple-500" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Mã số thuế</Label>
                                                <Input placeholder="Nhập MST..." className="h-10 focus-visible:ring-purple-500" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Số điện thoại</Label>
                                                <Input placeholder="Nhập SĐT..." className="h-10 focus-visible:ring-purple-500" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Email</Label>
                                                <Input placeholder="contact@giatuyet.com" className="h-10 focus-visible:ring-purple-500" />
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <Label className="text-sm font-medium">Địa chỉ</Label>
                                                <Input placeholder="Nhập địa chỉ công ty..." className="h-10 focus-visible:ring-purple-500" />
                                            </div>
                                        </div>
                                        <Button onClick={handleSave} className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 transition-opacity">
                                            <IconCheck className="mr-2 h-4 w-4" />
                                            Lưu thông tin
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </motion.div>
                    </TabsContent>

                    {/* Appearance Settings */}
                    <TabsContent value="appearance">
                        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
                            <motion.div variants={itemVariants}>
                                <Card className="border-0 shadow-sm">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <IconPalette className="h-5 w-5 text-purple-500" />
                                            Giao diện
                                        </CardTitle>
                                        <CardDescription className="text-sm">Tùy chỉnh giao diện ứng dụng</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Theme Selection */}
                                        <div>
                                            <Label className="text-sm font-medium mb-3 block">Chế độ hiển thị</Label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {[
                                                    { value: 'light', icon: IconSun, label: 'Sáng' },
                                                    { value: 'dark', icon: IconMoon, label: 'Tối' },
                                                    { value: 'system', icon: IconSettings, label: 'Hệ thống' }
                                                ].map((option) => (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => setTheme(option.value as typeof theme)}
                                                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme === option.value
                                                                ? 'border-purple-500 bg-purple-50'
                                                                : 'border-gray-200 hover:border-gray-300'
                                                            }`}
                                                    >
                                                        <option.icon className={`h-6 w-6 ${theme === option.value ? 'text-purple-500' : 'text-gray-400'}`} />
                                                        <span className={`text-sm font-medium ${theme === option.value ? 'text-purple-700' : 'text-gray-600'}`}>
                                                            {option.label}
                                                        </span>
                                                        {theme === option.value && (
                                                            <motion.div
                                                                initial={{ scale: 0 }}
                                                                animate={{ scale: 1 }}
                                                                className="absolute -top-1 -right-1"
                                                            >
                                                                <div className="h-5 w-5 bg-purple-500 rounded-full flex items-center justify-center">
                                                                    <IconCheck className="h-3 w-3 text-white" />
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Color Theme */}
                                        <div>
                                            <Label className="text-sm font-medium mb-3 block">Màu chủ đạo</Label>
                                            <div className="flex gap-2">
                                                {['#c2185b', '#7b1fa2', '#512da8', '#1976d2', '#00897b', '#ef6c00'].map((color) => (
                                                    <button
                                                        key={color}
                                                        className="h-10 w-10 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <Button onClick={handleSave} className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 transition-opacity">
                                            <IconCheck className="mr-2 h-4 w-4" />
                                            Áp dụng
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </motion.div>
                    </TabsContent>

                    {/* Notification Settings */}
                    <TabsContent value="notifications">
                        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
                            <motion.div variants={itemVariants}>
                                <Card className="border-0 shadow-sm">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <IconBell className="h-5 w-5 text-purple-500" />
                                            Phương thức nhận thông báo
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                        <IconMail className="h-5 w-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">Email</p>
                                                        <p className="text-sm text-gray-500">Nhận thông báo qua email</p>
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={notifications.email}
                                                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email: checked }))}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                                        <IconBellRinging className="h-5 w-5 text-purple-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">Push notification</p>
                                                        <p className="text-sm text-gray-500">Thông báo trên trình duyệt</p>
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={notifications.push}
                                                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, push: checked }))}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                                        <IconMessage className="h-5 w-5 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">SMS</p>
                                                        <p className="text-sm text-gray-500">Nhận tin nhắn SMS</p>
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={notifications.sms}
                                                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, sms: checked }))}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div variants={itemVariants}>
                                <Card className="border-0 shadow-sm">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Loại thông báo</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                            <div>
                                                <p className="font-medium">Đơn hàng mới</p>
                                                <p className="text-sm text-gray-500">Khi có đơn hàng mới được tạo</p>
                                            </div>
                                            <Switch
                                                checked={notifications.orders}
                                                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, orders: checked }))}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                            <div>
                                                <p className="font-medium">Sự kiện sắp tới</p>
                                                <p className="text-sm text-gray-500">Nhắc nhở các sự kiện trong ngày</p>
                                            </div>
                                            <Switch
                                                checked={notifications.events}
                                                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, events: checked }))}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                            <div>
                                                <p className="font-medium">Tin tức & cập nhật</p>
                                                <p className="text-sm text-gray-500">Thông tin khuyến mãi và tính năng mới</p>
                                            </div>
                                            <Switch
                                                checked={notifications.marketing}
                                                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, marketing: checked }))}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <Button onClick={handleSave} className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 transition-opacity">
                                <IconCheck className="mr-2 h-4 w-4" />
                                Lưu cài đặt thông báo
                            </Button>
                        </motion.div>
                    </TabsContent>
                </Tabs>
            </motion.div>
        </div>
    );
}
