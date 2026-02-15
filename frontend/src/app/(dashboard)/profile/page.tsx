'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTabPersistence } from '@/hooks/useTabPersistence';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
    IconCamera, IconMail, IconShield, IconPhone, IconUser,
    IconLock, IconKey, IconDevices, IconHistory, IconCheck,
    IconAlertTriangle, IconFingerprint, IconLoader2,
    IconLogin, IconLogout, IconFileText, IconShoppingCart,
    IconUserPlus, IconUserMinus, IconUserCheck, IconUserOff,
    IconSettings, IconEye, IconEyeOff, IconCircleCheck, IconCircle
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

// Activity log type from backend
interface ActivityLog {
    id: string;
    action: string;
    entity_type?: string;
    entity_id?: string;
    extra_data?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
}

// Action label mapping
const ACTION_LABELS: Record<string, string> = {
    LOGIN: 'Đăng nhập',
    LOGOUT: 'Đăng xuất',
    LOGIN_FAILED: 'Đăng nhập thất bại',
    PASSWORD_CHANGED: 'Đổi mật khẩu',
    CREATE_USER: 'Tạo người dùng',
    UPDATE_USER: 'Cập nhật hồ sơ',
    DELETE_USER: 'Xóa người dùng',
    ACTIVATE_USER: 'Kích hoạt tài khoản',
    DEACTIVATE_USER: 'Vô hiệu hóa tài khoản',
    UPDATE_PERMISSIONS: 'Cập nhật phân quyền',
    ASSIGN_ROLE: 'Gán vai trò',
    CREATE_ORDER: 'Tạo đơn hàng',
    UPDATE_ORDER: 'Cập nhật đơn hàng',
    CANCEL_ORDER: 'Hủy đơn hàng',
    COMPLETE_ORDER: 'Hoàn thành đơn hàng',
    CREATE_QUOTE: 'Tạo báo giá',
    APPROVE_QUOTE: 'Duyệt báo giá',
    CONVERT_QUOTE: 'Chuyển đổi báo giá'
};

// Action-specific icon mapping
const ACTION_ICONS: Record<string, typeof IconHistory> = {
    LOGIN: IconLogin,
    LOGOUT: IconLogout,
    LOGIN_FAILED: IconAlertTriangle,
    PASSWORD_CHANGED: IconKey,
    CREATE_USER: IconUserPlus,
    UPDATE_USER: IconUser,
    DELETE_USER: IconUserMinus,
    ACTIVATE_USER: IconUserCheck,
    DEACTIVATE_USER: IconUserOff,
    UPDATE_PERMISSIONS: IconSettings,
    ASSIGN_ROLE: IconShield,
    CREATE_ORDER: IconShoppingCart,
    UPDATE_ORDER: IconShoppingCart,
    CANCEL_ORDER: IconAlertTriangle,
    COMPLETE_ORDER: IconCheck,
    CREATE_QUOTE: IconFileText,
    APPROVE_QUOTE: IconCheck,
    CONVERT_QUOTE: IconFileText,
};

// Field name to Vietnamese label mapping
const FIELD_LABELS: Record<string, string> = {
    full_name: 'Họ và tên',
    phone_number: 'Số điện thoại',
    email: 'Email',
    role: 'Vai trò',
    is_active: 'Trạng thái',
};

// Format activity detail from extra_data
function formatActivityDetail(activity: ActivityLog): string | null {
    const data = activity.extra_data;
    if (!data) return null;

    // New format: { changes: { field_name: { from, to } } }
    if (data.changes && typeof data.changes === 'object') {
        const parts: string[] = [];
        for (const [field, change] of Object.entries(data.changes as Record<string, { from?: string; to?: string }>)) {
            const label = FIELD_LABELS[field] || field;
            const from = change.from || '(trống)';
            const to = change.to || '(trống)';
            parts.push(`${label}: ${from} → ${to}`);
        }
        return parts.length > 0 ? parts.join(' • ') : null;
    }

    // Legacy format: { updated_fields: ['full_name', 'phone_number'] }
    if (Array.isArray(data.updated_fields)) {
        const labels = (data.updated_fields as string[]).map(f => FIELD_LABELS[f] || f);
        return `Đã thay đổi: ${labels.join(', ')}`;
    }

    // CREATE_USER format: { email, role }
    if (data.email) {
        return `Email: ${data.email}${data.role ? ` • Vai trò: ${data.role}` : ''}`;
    }

    return null;
}

// Password strength calculator
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score: 1, label: 'Yếu', color: 'bg-red-500' };
    if (score <= 4) return { score: 2, label: 'Trung bình', color: 'bg-amber-500' };
    return { score: 3, label: 'Mạnh', color: 'bg-green-500' };
}

// Parse user agent
function parseDevice(ua?: string): string {
    if (!ua) return 'Không xác định';
    let browser = 'Trình duyệt';
    let os = '';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('iPhone')) os = 'iPhone';
    else if (ua.includes('Android')) os = 'Android';
    return `${browser}${os ? ` - ${os}` : ''}`;
}

// Time ago
function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHr < 24) return `${diffHr} giờ trước`;
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const PROFILE_TABS = ['profile', 'security', 'activity', 'sessions'] as const;

export default function ProfilePage() {
    const { activeTab, handleTabChange } = useTabPersistence(PROFILE_TABS, 'profile');
    const { user } = useAuthStore();
    // Password visibility toggles (SEC-01)
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Profile form state
    const [profileForm, setProfileForm] = useState({
        full_name: '',
        phone_number: '',
    });
    const [savingProfile, setSavingProfile] = useState(false);

    // Password form state
    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    });
    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

    // Activity state
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);

    // Session state
    interface LoginSession {
        id: string;
        ip_address: string | null;
        device_info: string | null;
        is_active: boolean;
        last_activity: string | null;
        expires_at: string | null;
        created_at: string | null;
    }
    const [sessions, setSessions] = useState<LoginSession[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);

    // Init profile form from user data
    useEffect(() => {
        if (user) {
            setProfileForm({
                full_name: user.full_name || '',
                phone_number: (user as any).phone_number || '',
            });
        }
    }, [user]);

    const getInitials = (name: string) => name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

    // Save profile + refresh auth store
    const handleSaveProfile = async () => {
        if (!profileForm.full_name.trim()) {
            toast.error('Họ và tên không được để trống');
            return;
        }
        try {
            setSavingProfile(true);
            const updated = await api.put('/users/me/profile', {
                full_name: profileForm.full_name.trim(),
                phone_number: profileForm.phone_number.trim() || null,
            });
            // Update auth store so header and sidebar reflect changes immediately
            if (updated && user) {
                const updatedUser = {
                    ...user,
                    full_name: profileForm.full_name.trim(),
                    phone_number: profileForm.phone_number.trim() || null,
                };
                useAuthStore.setState({ user: updatedUser });
                // Sync form with latest data
                setProfileForm({
                    full_name: updatedUser.full_name || '',
                    phone_number: updatedUser.phone_number || '',
                });
            }
            toast.success('Đã cập nhật thông tin thành công');
        } catch (err: any) {
            const msg = err?.response?.data?.detail || 'Không thể cập nhật thông tin';
            toast.error(msg);
        } finally {
            setSavingProfile(false);
        }
    };

    // Password strength (memoized)
    const passwordStrength = useMemo(
        () => getPasswordStrength(passwordForm.new_password),
        [passwordForm.new_password]
    );

    // Interactive requirements checklist (SEC-02)
    const passwordRequirements = useMemo(() => [
        { label: 'Tối thiểu 8 ký tự', met: passwordForm.new_password.length >= 8 },
        { label: 'Chứa chữ hoa (A-Z)', met: /[A-Z]/.test(passwordForm.new_password) },
        { label: 'Chứa chữ thường (a-z)', met: /[a-z]/.test(passwordForm.new_password) },
        { label: 'Chứa số (0-9)', met: /[0-9]/.test(passwordForm.new_password) },
        { label: 'Khác mật khẩu hiện tại', met: passwordForm.new_password.length > 0 && passwordForm.new_password !== passwordForm.current_password },
    ], [passwordForm.new_password, passwordForm.current_password]);

    // onBlur validation for a single field (SEC-04)
    const validateField = (field: 'current' | 'new' | 'confirm') => {
        const errs = { ...passwordErrors };
        if (field === 'current') {
            if (!passwordForm.current_password) errs.current = 'Vui lòng nhập mật khẩu hiện tại';
            else delete errs.current;
        }
        if (field === 'new') {
            if (!passwordForm.new_password) errs.new = 'Vui lòng nhập mật khẩu mới';
            else if (passwordForm.new_password.length < 8) errs.new = 'Mật khẩu tối thiểu 8 ký tự';
            else if (!/[A-Z]/.test(passwordForm.new_password)) errs.new = 'Phải chứa ít nhất 1 chữ hoa';
            else if (!/[a-z]/.test(passwordForm.new_password)) errs.new = 'Phải chứa ít nhất 1 chữ thường';
            else if (!/[0-9]/.test(passwordForm.new_password)) errs.new = 'Phải chứa ít nhất 1 số';
            else if (passwordForm.new_password === passwordForm.current_password) errs.new = 'Mật khẩu mới phải khác mật khẩu hiện tại';
            else delete errs.new;
        }
        if (field === 'confirm') {
            if (!passwordForm.confirm_password) errs.confirm = 'Vui lòng xác nhận mật khẩu mới';
            else if (passwordForm.new_password !== passwordForm.confirm_password) errs.confirm = 'Mật khẩu xác nhận không khớp';
            else delete errs.confirm;
        }
        setPasswordErrors(errs);
    };

    // Enter key handler (SEC-09)
    const handlePasswordKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); handleChangePassword(); }
    };

    // Validate & change password (synced with displayed requirements)
    const validatePassword = (): boolean => {
        const errs: Record<string, string> = {};
        if (!passwordForm.current_password) errs.current = 'Vui lòng nhập mật khẩu hiện tại';
        if (!passwordForm.new_password) {
            errs.new = 'Vui lòng nhập mật khẩu mới';
        } else {
            if (passwordForm.new_password.length < 8) errs.new = 'Mật khẩu tối thiểu 8 ký tự';
            else if (!/[A-Z]/.test(passwordForm.new_password)) errs.new = 'Phải chứa ít nhất 1 chữ hoa';
            else if (!/[a-z]/.test(passwordForm.new_password)) errs.new = 'Phải chứa ít nhất 1 chữ thường';
            else if (!/[0-9]/.test(passwordForm.new_password)) errs.new = 'Phải chứa ít nhất 1 số';
        }
        if (!passwordForm.confirm_password) errs.confirm = 'Vui lòng xác nhận mật khẩu mới';
        else if (passwordForm.new_password !== passwordForm.confirm_password) errs.confirm = 'Mật khẩu xác nhận không khớp';
        if (passwordForm.current_password === passwordForm.new_password && passwordForm.new_password) errs.new = 'Mật khẩu mới phải khác mật khẩu hiện tại';
        setPasswordErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleChangePassword = async () => {
        if (!validatePassword()) return;
        try {
            setSavingPassword(true);
            await api.post('/users/me/change-password', {
                current_password: passwordForm.current_password,
                new_password: passwordForm.new_password,
                confirm_password: passwordForm.confirm_password,
            });
            toast.success('Mật khẩu đã được thay đổi thành công');
            setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
            setPasswordErrors({});
            // Reset visibility toggles too (SEC-05)
            setShowCurrentPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
        } catch (err: any) {
            const detail = err?.response?.data?.detail;
            if (typeof detail === 'string') {
                toast.error(detail);
            } else if (Array.isArray(detail)) {
                // Pydantic validation errors
                const msgs = detail.map((d: any) => d.msg || d.message).join(', ');
                toast.error(msgs);
            } else {
                toast.error('Không thể đổi mật khẩu');
            }
        } finally {
            setSavingPassword(false);
        }
    };

    // Fetch activity log
    const fetchActivities = useCallback(async () => {
        try {
            setLoadingActivities(true);
            const data = await api.get<ActivityLog[]>('/users/me/activity?limit=50');
            setActivities(data);
        } catch (err) {
            console.error('Failed to fetch activities:', err);
        } finally {
            setLoadingActivities(false);
        }
    }, []);

    const fetchSessions = useCallback(async () => {
        setLoadingSessions(true);
        try {
            const data = await api.get<LoginSession[]>('/users/me/sessions');
            setSessions(data);
        } catch (err) {
            console.error('Failed to fetch sessions:', err);
        } finally {
            setLoadingSessions(false);
        }
    }, []);

    // Auto-fetch when tab is restored from URL (fixes A-01, SS-01)
    useEffect(() => {
        if (activeTab === 'activity' && activities.length === 0) fetchActivities();
        if (activeTab === 'sessions' && sessions.length === 0) fetchSessions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    return (
        <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Trang cá nhân</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Quản lý thông tin và bảo mật tài khoản</p>
            </motion.div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                <TabsList className="w-full md:w-auto grid grid-cols-4 md:flex bg-gray-100 dark:bg-gray-800/80 p-1 rounded-lg">
                    <TabsTrigger value="profile" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <IconUser className="mr-1 md:mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Hồ sơ</span>
                    </TabsTrigger>
                    <TabsTrigger value="security" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <IconShield className="mr-1 md:mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Bảo mật</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="activity"
                        className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                        <IconHistory className="mr-1 md:mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Hoạt động</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="sessions"
                        className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                        <IconDevices className="mr-1 md:mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Phiên đăng nhập</span>
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
                                            disabled
                                            title="Tính năng đang phát triển"
                                            className="absolute bottom-1 right-1 rounded-full h-10 w-10 bg-white border-2 border-purple-500 shadow-lg hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <IconCamera className="h-4 w-4 text-purple-600" />
                                        </Button>
                                    </div>
                                    <h2 className="mt-4 text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{profileForm.full_name || user?.full_name || 'Người dùng'}</h2>
                                    <Badge className="mt-2 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white">
                                        {typeof user?.role === 'object' ? (user.role as any)?.name : user?.role || 'User'}
                                    </Badge>

                                    <div className="mt-6 w-full space-y-3">
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                                            <IconMail className="h-5 w-5 text-gray-400 dark:text-gray-500 shrink-0" />
                                            <span className="text-sm truncate text-gray-600 dark:text-gray-400">{user?.email || '—'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                                            <IconPhone className="h-5 w-5 text-gray-400 dark:text-gray-500 shrink-0" />
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {profileForm.phone_number || 'Chưa cập nhật'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
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
                                            <Label className="text-sm font-medium">
                                                Họ và tên <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                value={profileForm.full_name}
                                                onChange={(e) => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
                                                className="h-10 focus-visible:ring-purple-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Email</Label>
                                            <Input defaultValue={user?.email} disabled className="h-10 bg-gray-50 dark:bg-gray-800" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Số điện thoại</Label>
                                            <Input
                                                placeholder="Nhập số điện thoại..."
                                                value={profileForm.phone_number}
                                                onChange={(e) => setProfileForm(f => ({ ...f, phone_number: e.target.value }))}
                                                className="h-10 focus-visible:ring-purple-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Vai trò</Label>
                                            <Input
                                                defaultValue={typeof user?.role === 'object' ? (user.role as any)?.name : user?.role}
                                                disabled
                                                className="h-10 bg-gray-50 dark:bg-gray-800"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleSaveProfile}
                                        disabled={savingProfile}
                                        className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 transition-opacity"
                                    >
                                        {savingProfile ? (
                                            <><IconLoader2 className="mr-2 h-4 w-4 animate-spin" /> Đang lưu...</>
                                        ) : (
                                            <><IconCheck className="mr-2 h-4 w-4" /> Cập nhật thông tin</>
                                        )}
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
                                    <div className="space-y-4">
                                        {/* Current password */}
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Mật khẩu hiện tại</Label>
                                            <div className="relative">
                                                <Input
                                                    type={showCurrentPassword ? 'text' : 'password'}
                                                    placeholder="••••••••"
                                                    value={passwordForm.current_password}
                                                    onChange={(e) => setPasswordForm(f => ({ ...f, current_password: e.target.value }))}
                                                    onBlur={() => validateField('current')}
                                                    onKeyDown={handlePasswordKeyDown}
                                                    className={`h-10 pr-10 focus-visible:ring-purple-500 ${passwordErrors.current ? 'border-red-300' : ''}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                    aria-label={showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                                >
                                                    {showCurrentPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                            {passwordErrors.current && <p className="text-xs text-red-500">{passwordErrors.current}</p>}
                                        </div>

                                        {/* New password */}
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Mật khẩu mới</Label>
                                            <div className="relative">
                                                <Input
                                                    type={showNewPassword ? 'text' : 'password'}
                                                    placeholder="Tối thiểu 8 ký tự"
                                                    value={passwordForm.new_password}
                                                    onChange={(e) => setPasswordForm(f => ({ ...f, new_password: e.target.value }))}
                                                    onBlur={() => validateField('new')}
                                                    onKeyDown={handlePasswordKeyDown}
                                                    className={`h-10 pr-10 focus-visible:ring-purple-500 ${passwordErrors.new ? 'border-red-300' : ''}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                    aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                                >
                                                    {showNewPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                            {passwordErrors.new && <p className="text-xs text-red-500">{passwordErrors.new}</p>}
                                            {/* Password strength meter with animation (SEC-08) */}
                                            {passwordForm.new_password && (
                                                <div className="space-y-1">
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3].map((level) => (
                                                            <div
                                                                key={level}
                                                                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${level <= passwordStrength.score
                                                                    ? passwordStrength.color
                                                                    : 'bg-gray-200'
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <p className={`text-xs transition-colors duration-200 ${passwordStrength.score === 1 ? 'text-red-500' :
                                                        passwordStrength.score === 2 ? 'text-amber-500' : 'text-green-500'
                                                        }`}>
                                                        {passwordStrength.label}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Confirm password */}
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Xác nhận mật khẩu</Label>
                                            <div className="relative">
                                                <Input
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    placeholder="••••••••"
                                                    value={passwordForm.confirm_password}
                                                    onChange={(e) => setPasswordForm(f => ({ ...f, confirm_password: e.target.value }))}
                                                    onBlur={() => validateField('confirm')}
                                                    onKeyDown={handlePasswordKeyDown}
                                                    className={`h-10 pr-10 focus-visible:ring-purple-500 ${passwordErrors.confirm ? 'border-red-300' : ''}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                    aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                                >
                                                    {showConfirmPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                            {passwordErrors.confirm && <p className="text-xs text-red-500">{passwordErrors.confirm}</p>}
                                        </div>
                                    </div>

                                    {/* Interactive requirements checklist (SEC-02) */}
                                    {passwordForm.new_password && (
                                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Yêu cầu mật khẩu:</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                                {passwordRequirements.map((req, i) => (
                                                    <div key={i} className="flex items-center gap-2">
                                                        {req.met ? (
                                                            <IconCircleCheck className="h-4 w-4 text-green-500 shrink-0" />
                                                        ) : (
                                                            <IconCircle className="h-4 w-4 text-gray-300 shrink-0" />
                                                        )}
                                                        <span className={`text-xs transition-colors duration-200 ${req.met ? 'text-green-600' : 'text-gray-500'}`}>
                                                            {req.label}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleChangePassword}
                                        disabled={savingPassword}
                                        className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 transition-opacity"
                                    >
                                        {savingPassword ? (
                                            <><IconLoader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xử lý...</>
                                        ) : (
                                            <><IconKey className="mr-2 h-4 w-4" /> Đổi mật khẩu</>
                                        )}
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
                                    <div className="flex items-center justify-between p-4 rounded-lg bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-purple-100 dark:bg-purple-900/30">
                                                <IconShield className="h-6 w-6 text-purple-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium">Xác thực qua ứng dụng</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    Google Authenticator hoặc Authy — bảo vệ tài khoản tốt hơn
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs text-purple-500 border-purple-200">Sắp ra mắt</Badge>
                                            <Switch checked={false} disabled />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Quick link to Sessions tab */}
                        <motion.div variants={itemVariants}>
                            <Card className="border-0 shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                                <IconDevices className="h-5 w-5 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">Phiên đăng nhập</p>
                                                <p className="text-sm text-gray-500">Quản lý các thiết bị đang đăng nhập</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {sessions.length > 0 && (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                                    {sessions.length} phiên
                                                </Badge>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleTabChange('sessions')}
                                            >
                                                Xem tất cả →
                                            </Button>
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
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <IconHistory className="h-5 w-5 text-purple-500" />
                                                Lịch sử hoạt động
                                            </CardTitle>
                                            <CardDescription className="text-sm">Các hoạt động gần đây trên tài khoản của bạn</CardDescription>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={fetchActivities}
                                            disabled={loadingActivities}
                                        >
                                            {loadingActivities ? (
                                                <IconLoader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                'Làm mới'
                                            )}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {loadingActivities ? (
                                        <div className="space-y-3">
                                            {[...Array(5)].map((_, i) => (
                                                <Skeleton key={i} className="h-16 w-full" />
                                            ))}
                                        </div>
                                    ) : activities.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                                            <IconHistory className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                            <p className="text-sm">Chưa có hoạt động nào được ghi nhận</p>
                                            <p className="text-xs mt-1">Các hoạt động sẽ hiển thị ở đây khi bạn thao tác trên hệ thống</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {activities.map((activity) => (
                                                <div
                                                    key={activity.id}
                                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 transition-colors border border-gray-100 dark:border-gray-800"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {(() => {
                                                            const ActionIcon = ACTION_ICONS[activity.action] || IconHistory;
                                                            const bgColor = activity.action === 'LOGIN' ? 'bg-green-100' :
                                                                activity.action === 'LOGIN_FAILED' ? 'bg-red-100' :
                                                                    activity.action === 'PASSWORD_CHANGED' ? 'bg-amber-100' :
                                                                        activity.action.includes('DELETE') || activity.action.includes('CANCEL') ? 'bg-red-100' :
                                                                            activity.action.includes('CREATE') ? 'bg-blue-100' :
                                                                                'bg-purple-100';
                                                            const iconColor = activity.action === 'LOGIN' ? 'text-green-600' :
                                                                activity.action === 'LOGIN_FAILED' ? 'text-red-600' :
                                                                    activity.action === 'PASSWORD_CHANGED' ? 'text-amber-600' :
                                                                        activity.action.includes('DELETE') || activity.action.includes('CANCEL') ? 'text-red-600' :
                                                                            activity.action.includes('CREATE') ? 'text-blue-600' :
                                                                                'text-purple-600';
                                                            return (
                                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${bgColor}`}>
                                                                    <ActionIcon className={`h-5 w-5 ${iconColor}`} />
                                                                </div>
                                                            );
                                                        })()}
                                                        <div>
                                                            <p className="font-medium text-sm">
                                                                {ACTION_LABELS[activity.action] || activity.action}
                                                            </p>
                                                            {formatActivityDetail(activity) && (
                                                                <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                                                                    {formatActivityDetail(activity)}
                                                                </p>
                                                            )}
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                {parseDevice(activity.user_agent)}
                                                                {activity.ip_address ? ` • ${activity.ip_address}` : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                                        {timeAgo(activity.created_at)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                </TabsContent>

                {/* Login Sessions Tab */}
                <TabsContent value="sessions">
                    <motion.div variants={containerVariants} initial="hidden" animate="show">
                        <motion.div variants={itemVariants}>
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <IconDevices className="h-5 w-5 text-purple-500" />
                                                Lịch sử đăng nhập
                                            </CardTitle>
                                            <CardDescription className="text-sm">Các phiên đăng nhập gần đây của bạn</CardDescription>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={fetchSessions} disabled={loadingSessions}>
                                            {loadingSessions ? (
                                                <IconLoader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                'Làm mới'
                                            )}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {loadingSessions ? (
                                        <div className="space-y-3">
                                            {[...Array(5)].map((_, i) => (
                                                <Skeleton key={i} className="h-16 w-full" />
                                            ))}
                                        </div>
                                    ) : sessions.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                                            <IconDevices className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                            <p className="text-sm">Chưa có phiên đăng nhập nào được ghi nhận</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {sessions.map((session) => (
                                                <div
                                                    key={session.id}
                                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 transition-colors border border-gray-100 dark:border-gray-800"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${session.is_active ? 'bg-green-100' : 'bg-gray-100 dark:bg-gray-800'
                                                            }`}>
                                                            <IconDevices className={`h-5 w-5 ${session.is_active ? 'text-green-600' : 'text-gray-400 dark:text-gray-500'
                                                                }`} />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm flex items-center gap-2">
                                                                {parseDevice(session.device_info || undefined)}
                                                                {session.is_active && (
                                                                    <Badge className="text-[10px] py-0 bg-green-100 text-green-700 hover:bg-green-100">
                                                                        Đang hoạt động
                                                                    </Badge>
                                                                )}
                                                            </p>
                                                            <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                                                                Đăng nhập: {session.created_at ? new Date(session.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                                                {session.last_activity && ` • Hoạt động cuối: ${timeAgo(session.last_activity)}`}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                IP: {session.ip_address || 'Không xác định'}
                                                                {session.expires_at && ` • Hết hạn: ${new Date(session.expires_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                                        {session.created_at ? timeAgo(session.created_at) : ''}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
