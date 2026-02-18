'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTabPersistence } from '@/hooks/useTabPersistence';
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
    IconMessage, IconBellRinging, IconCalendar,
    IconUsers, IconShieldCheck, IconChartBar,
    IconCrown, IconShoppingCart, IconDatabase,
    IconEdit, IconX, IconArrowRight, IconPhone,
    IconMapPin, IconWorld, IconBrandChrome, IconInfoCircle,
    IconGlobe, IconClock, IconCurrencyDollar, IconCalendarEvent,
    IconCircleCheck, IconVersions,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { UserManagementTab } from './components/user-management-tab';
import { PermissionMatrixTab } from './components/permission-matrix-tab';
import { AppearanceTab } from './components/appearance-tab';
import NotificationSettingsTab from './components/NotificationSettingsTab';
import { NotificationErrorBoundary } from './components/NotificationErrorBoundary';
import {
    useMyTenant, useMyTenantUsage, useMyTenantSettings,
    useUpdateMyTenant, useUpdateMyTenantSettings,
    useUploadTenantLogo, useDeleteTenantLogo,
    Tenant, TenantUsage, TenantSetting, TenantUpdateData,
} from '@/hooks/use-tenants';

const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

// =============================================
// Plan card configurations
// =============================================
const PLAN_CONFIGS: Record<string, { label: string; color: string; gradient: string; features: string[] }> = {
    basic: {
        label: 'Basic', color: '#64748b',
        gradient: 'linear-gradient(135deg, #94a3b8, #64748b)',
        features: ['5 người dùng', '50 đơn hàng/tháng', '100MB lưu trữ', 'Module cơ bản'],
    },
    standard: {
        label: 'Standard', color: '#2563eb',
        gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        features: ['15 người dùng', '200 đơn hàng/tháng', '1GB lưu trữ', '+HR, CRM'],
    },
    premium: {
        label: 'Premium', color: '#7c3aed',
        gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)',
        features: ['50 người dùng', '1.000 đơn hàng/tháng', '10GB lưu trữ', 'Tất cả module'],
    },
    enterprise: {
        label: 'Enterprise', color: '#c2185b',
        gradient: 'linear-gradient(135deg, #c2185b, #7b1fa2)',
        features: ['Không giới hạn người dùng', 'Không giới hạn đơn hàng', '100GB lưu trữ', 'Tùy chỉnh'],
    },
};

// =============================================
// Usage Bar Component
// =============================================
function UsageBar({ label, current, limit, percentage, icon: Icon, color }: {
    label: string; current: number; limit: number; percentage: number;
    icon: React.ComponentType<any>; color: string;
}) {
    const isWarning = percentage >= 80;
    const isDanger = percentage >= 95;
    const barColor = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : color;

    return (
        <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:border-gray-800 transition-shadow hover:shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${barColor}14` }}>
                        <Icon size={18} stroke={1.5} style={{ color: barColor }} />
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color: barColor, background: `${barColor}14` }}>
                    {current.toLocaleString()} / {limit >= 999999 ? '∞' : limit.toLocaleString()}
                </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ background: barColor, width: `${Math.min(percentage, 100)}%` }} />
            </div>
            <div className="mt-1.5 text-xs text-gray-400 dark:text-gray-500 text-right">
                {percentage.toFixed(1)}% sử dụng
                {isDanger && <span className="text-red-500 font-semibold ml-2">⚠ Sắp đầy!</span>}
            </div>
        </div>
    );
}

// =============================================
// Editable Field Component (for Company tab)
// =============================================
function EditableField({ label, value, icon: Icon, onSave, type = 'text' }: {
    label: string; value: string; icon: React.ComponentType<any>;
    onSave: (val: string) => void; type?: string;
}) {
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);

    useEffect(() => { setEditValue(value); }, [value]);

    return (
        <div className="flex items-center gap-3 py-3.5 border-b border-gray-50 dark:border-gray-800">
            <div className="w-9 h-9 rounded-lg bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <Icon size={18} stroke={1.5} className="text-gray-500 dark:text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-0.5">{label}</div>
                {editing ? (
                    <div className="flex items-center gap-2">
                        <input
                            type={type}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            autoComplete="off"
                            className="flex-1 px-2.5 py-1.5 border border-pink-600 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200"
                        />
                        <button
                            onClick={() => { onSave(editValue); setEditing(false); }}
                            className="w-7 h-7 rounded-md bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors"
                            aria-label="Lưu thay đổi"
                        >
                            <IconCheck size={14} />
                        </button>
                        <button
                            onClick={() => { setEditValue(value); setEditing(false); }}
                            className="w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700 transition-colors"
                            aria-label="Hủy thay đổi"
                        >
                            <IconX size={14} />
                        </button>
                    </div>
                ) : (
                    <div
                        className="text-sm text-gray-800 dark:text-gray-200 cursor-pointer flex items-center gap-1.5 group"
                        onClick={() => setEditing(true)}
                    >
                        <span className={value ? '' : 'text-gray-300 dark:text-gray-600'}>{value || 'Chưa cập nhật'}</span>
                        <IconEdit size={14} stroke={1.5} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                )}
            </div>
        </div>
    );
}

// =============================================
// Logo Upload Card Component
// =============================================

/**
 * Resolves a logo_url from DB to a displayable URL.
 * 
 * BUGFIX: BUG-20260218-001 + BUG-20260218-002
 * Old format 1: /uploads/logos/{tenant_id}.png (Cloud Run filesystem, 404 on Vercel)
 * Old format 2: /api/v1/tenants/me/logo?v=... (requires auth, 401 from <img> tag)
 * New format:   /api/v1/tenants/{tenant_id}/logo?v=... (public, no auth needed)
 */
function resolveLogoUrl(logoUrl: string | null, tenantId?: string): string | null {
    if (!logoUrl) return null;
    // New format with tenant_id in path — already correct
    if (logoUrl.match(/\/api\/v1\/tenants\/[a-f0-9-]+\/logo/)) return logoUrl;
    // Old /me/logo format — needs tenant_id to convert to public URL
    if (logoUrl.includes('/tenants/me/logo') && tenantId) {
        return `/api/v1/tenants/${tenantId}/logo?v=${Date.now()}`;
    }
    // Old static path format
    if (logoUrl.startsWith('/uploads/logos/') && tenantId) {
        return `/api/v1/tenants/${tenantId}/logo?v=${Date.now()}`;
    }
    // Absolute URL or other format — pass through
    return logoUrl;
}

function LogoUploadCard({ logoUrl, tenantId }: { logoUrl: string | null; tenantId?: string }) {
    const [dragActive, setDragActive] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const uploadLogo = useUploadTenantLogo();
    const deleteLogo = useDeleteTenantLogo();

    const handleFile = (file: File) => {
        // Validate type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Chỉ chấp nhận PNG, JPG, WEBP, SVG');
            return;
        }
        // Validate size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('File quá lớn. Tối đa 2MB.');
            return;
        }
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);

        // Upload
        uploadLogo.mutate(file, {
            onSuccess: (data) => {
                toast.success('Upload logo thành công!');
                setPreview(null);
            },
            onError: (err: any) => {
                toast.error(err?.response?.data?.detail || 'Lỗi upload logo');
                setPreview(null);
            },
        });
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleDelete = () => {
        deleteLogo.mutate(undefined, {
            onSuccess: () => toast.success('Đã xóa logo'),
            onError: () => toast.error('Lỗi xóa logo'),
        });
    };

    const resolvedLogo = resolveLogoUrl(logoUrl, tenantId);
    const displayUrl = preview || resolvedLogo;

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <IconUpload className="h-5 w-5 text-purple-500" />
                    Logo công ty
                </CardTitle>
                <CardDescription className="text-sm">Upload logo để hiển thị trên báo giá, báo cáo và hệ thống</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-start gap-6">
                    {/* Preview */}
                    {displayUrl ? (
                        <div className="relative group shrink-0">
                            <div className="w-24 h-24 rounded-xl border-2 border-gray-100 dark:border-gray-800 overflow-hidden bg-white shadow-sm flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={displayUrl}
                                    alt="Logo công ty"
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
                            {uploadLogo.isPending && (
                                <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center">
                                    <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                    ) : null}

                    {/* Upload Area + Actions */}
                    <div className="flex-1 space-y-3">
                        {/* Dropzone */}
                        <div
                            className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer
                                ${dragActive ? 'border-purple-400 bg-purple-50' : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 hover:bg-purple-50/50'}`}
                            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={handleDrop}
                            onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
                                input.onchange = (e: any) => {
                                    if (e.target.files?.[0]) handleFile(e.target.files[0]);
                                };
                                input.click();
                            }}
                        >
                            <IconUpload className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {dragActive ? 'Thả ảnh tại đây...' : 'Kéo thả ảnh hoặc click để chọn'}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PNG, JPG, WEBP, SVG • Tối đa 2MB</p>
                        </div>

                        {/* Action buttons */}
                        {logoUrl && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
                                        input.onchange = (e: any) => {
                                            if (e.target.files?.[0]) handleFile(e.target.files[0]);
                                        };
                                        input.click();
                                    }}
                                    disabled={uploadLogo.isPending}
                                >
                                    🔄 Đổi logo
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={handleDelete}
                                    disabled={deleteLogo.isPending}
                                >
                                    🗑 Xóa
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

const VALID_TABS = ['general', 'subscription', 'users', 'permissions', 'system', 'appearance', 'notifications'] as const;
type SettingsTab = typeof VALID_TABS[number];

export default function SettingsPage() {
    const { activeTab, handleTabChange } = useTabPersistence(VALID_TABS, 'general');

    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
    // Notifications state moved to NotificationSettingsTab component (API-backed)

    // Tenant data hooks
    const { data: tenant } = useMyTenant();
    const { data: usage } = useMyTenantUsage();
    const { data: tenantSettings, isLoading: settingsLoading } = useMyTenantSettings();
    const updateTenant = useUpdateMyTenant();
    const updateTenantSettings = useUpdateMyTenantSettings();

    const t = tenant as Tenant | undefined;
    const u = usage as TenantUsage | undefined;
    const s = (tenantSettings || []) as TenantSetting[];
    const planConfig = PLAN_CONFIGS[t?.plan || 'basic'] || PLAN_CONFIGS.basic;

    const [saveMsg, setSaveMsg] = useState('');

    const handleSave = () => {
        toast.success('Đã lưu cài đặt thành công');
    };

    const handleFieldSave = (field: string, value: string) => {
        updateTenant.mutate({ [field]: value } as TenantUpdateData, {
            onSuccess: () => {
                toast.success('Đã lưu thành công!');
            },
        });
    };

    const handleSettingSave = (key: string, value: string) => {
        updateTenantSettings.mutate({ [key]: value }, {
            onSuccess: () => {
                toast.success('Cập nhật cài đặt thành công!');
            },
        });
    };

    return (
        <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Cài đặt</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Cấu hình hệ thống của bạn</p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                    <TabsList className="w-full md:w-auto grid grid-cols-4 sm:grid-cols-7 md:flex bg-gray-100/80 dark:bg-gray-800/80 p-1 rounded-lg">
                        <TabsTrigger value="general" className="text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm">
                            <IconBuilding className="mr-1 md:mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Tổng quan</span>
                        </TabsTrigger>
                        <TabsTrigger value="subscription" className="text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm">
                            <IconChartBar className="mr-1 md:mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Gói dịch vụ</span>
                        </TabsTrigger>
                        <TabsTrigger value="users" className="text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm">
                            <IconUsers className="mr-1 md:mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Người dùng</span>
                        </TabsTrigger>
                        <TabsTrigger value="permissions" className="text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm">
                            <IconShieldCheck className="mr-1 md:mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Phân quyền</span>
                        </TabsTrigger>
                        <TabsTrigger value="system-settings" className="text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm">
                            <IconSettings className="mr-1 md:mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Hệ thống</span>
                        </TabsTrigger>
                        <TabsTrigger value="appearance" className="text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm">
                            <IconPalette className="mr-1 md:mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Giao diện</span>
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm">
                            <IconBell className="mr-1 md:mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Thông báo</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* General Settings — Redesigned */}
                    <TabsContent value="general">
                        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5">
                            {/* Section 1: Brand Identity Card */}
                            <motion.div variants={itemVariants}>
                                <Card className="border-0 shadow-sm overflow-hidden">
                                    <div className="relative p-6 text-white" style={{ background: planConfig.gradient }}>
                                        {/* Decorative circles */}
                                        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10" />
                                        <div className="absolute -bottom-6 right-16 w-20 h-20 rounded-full bg-white/5" />
                                        <div className="absolute top-4 left-[40%] w-12 h-12 rounded-full bg-white/5" />

                                        <div className="relative z-10 flex items-center gap-5">
                                            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold shrink-0 border border-white/20">
                                                {t?.name?.charAt(0)?.toUpperCase() || 'G'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xl font-bold mb-1 truncate">
                                                    {t?.name || 'Ẩm Thực Giao Tuyết'}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 text-sm opacity-90">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm">
                                                        <IconCrown size={12} /> {planConfig.label}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/15">
                                                        <IconVersions size={12} /> v1.0.0
                                                    </span>
                                                    {t?.slug && (
                                                        <span className="text-xs opacity-75">• {t.slug}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <CardContent className="pt-4 pb-2">
                                        <EditableField
                                            label="Tên hệ thống"
                                            value={t?.name || 'Ẩm Thực Giao Tuyết'}
                                            icon={IconBuilding}
                                            onSave={val => handleFieldSave('name', val)}
                                        />
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Section 2: Thông tin doanh nghiệp (merged from Company tab) */}
                            <motion.div variants={itemVariants}>
                                <Card className="border-0 shadow-sm">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <IconBuilding className="h-5 w-5 text-purple-500" />
                                            Thông tin doanh nghiệp
                                        </CardTitle>
                                        <CardDescription className="text-sm">Cập nhật thông tin liên hệ và nhận diện thương hiệu</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-0">
                                        <EditableField label="Tên công ty" value={t?.name || ''} icon={IconBuilding} onSave={val => handleFieldSave('name', val)} />
                                        <EditableField label="Email liên hệ" value={t?.contact_email || ''} icon={IconMail} onSave={val => handleFieldSave('contact_email', val)} type="email" />
                                        <EditableField label="Số điện thoại" value={t?.contact_phone || ''} icon={IconPhone} onSave={val => handleFieldSave('contact_phone', val)} type="tel" />
                                        <EditableField label="Địa chỉ" value={t?.address || ''} icon={IconMapPin} onSave={val => handleFieldSave('address', val)} />
                                        <EditableField label="Tên miền" value={t?.domain || ''} icon={IconWorld} onSave={val => handleFieldSave('domain', val)} />
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Section 2b: Logo Upload */}
                            <motion.div variants={itemVariants}>
                                <LogoUploadCard logoUrl={t?.logo_url || null} tenantId={t?.id} />
                            </motion.div>

                            {/* Section 3: Regional Preferences — Info Cards */}
                            <motion.div variants={itemVariants}>
                                <Card className="border-0 shadow-sm">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <IconGlobe className="h-5 w-5 text-blue-500" />
                                            Khu vực & Định dạng
                                        </CardTitle>
                                        <CardDescription className="text-sm">Cài đặt ngôn ngữ, múi giờ và định dạng hiển thị</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {/* Language Card */}
                                            <div className="group p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 dark:bg-gray-900/50 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-all duration-200">
                                                <div className="flex items-center gap-3 mb-2.5">
                                                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                                                        <IconGlobe size={18} stroke={1.5} className="text-blue-600" />
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Ngôn ngữ</span>
                                                </div>
                                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Tiếng Việt</div>
                                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">vi-VN • Mặc định</div>
                                            </div>

                                            {/* Timezone Card */}
                                            <div className="group p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 dark:bg-gray-900/50 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-all duration-200">
                                                <div className="flex items-center gap-3 mb-2.5">
                                                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                                                        <IconClock size={18} stroke={1.5} className="text-indigo-600" />
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Múi giờ</span>
                                                </div>
                                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">UTC+7</div>
                                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Asia/Ho_Chi_Minh</div>
                                            </div>

                                            {/* Date Format Card */}
                                            <div className="group p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 dark:bg-gray-900/50 hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/20 transition-all duration-200">
                                                <div className="flex items-center gap-3 mb-2.5">
                                                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                                                        <IconCalendarEvent size={18} stroke={1.5} className="text-emerald-600" />
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Định dạng ngày</span>
                                                </div>
                                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">dd/MM/yyyy</div>
                                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Ví dụ: {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                                            </div>

                                            {/* Currency Card */}
                                            <div className="group p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 dark:bg-gray-900/50 hover:border-amber-200 dark:hover:border-amber-800 hover:bg-amber-50/30 dark:hover:bg-amber-900/20 transition-all duration-200">
                                                <div className="flex items-center gap-3 mb-2.5">
                                                    <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                                                        <IconCurrencyDollar size={18} stroke={1.5} className="text-amber-600" />
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tiền tệ</span>
                                                </div>
                                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">VND (₫)</div>
                                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Ví dụ: {(1234567).toLocaleString('vi-VN')}₫</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Section 3: System Status Bar */}
                            <motion.div variants={itemVariants}>
                                <div className="flex flex-wrap items-center gap-4 px-5 py-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-2">
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                                        </span>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Hệ thống hoạt động</span>
                                    </div>
                                    <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                        <IconCrown size={14} stroke={1.5} style={{ color: planConfig.color }} />
                                        <span>Gói {planConfig.label}</span>
                                    </div>
                                    <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                        <IconClock size={14} stroke={1.5} />
                                        <span>Cập nhật: {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </TabsContent>

                    {/* Company tab removed — merged into General/Tổng quan tab above */}

                    {/* Subscription & Usage — Redesigned */}
                    <TabsContent value="subscription">
                        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">

                            {/* ───── Section 1: Pricing Comparison Grid ───── */}
                            <motion.div variants={itemVariants}>
                                <Card className="border-0 shadow-sm">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <IconCrown className="h-5 w-5 text-purple-500" />
                                            So sánh gói dịch vụ
                                        </CardTitle>
                                        <CardDescription className="text-sm">Chọn gói phù hợp với nhu cầu kinh doanh của bạn</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {(() => {
                                            const currentPlan = t?.plan || 'basic';
                                            const plans = [
                                                { key: 'basic', label: 'Basic', price: 'Miễn phí', color: '#64748b', gradient: 'linear-gradient(135deg, #94a3b8, #64748b)', recommended: false, limits: ['5 người dùng', '50 đơn hàng/tháng', '100MB lưu trữ'] },
                                                { key: 'standard', label: 'Standard', price: 'Liên hệ', color: '#2563eb', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', recommended: false, limits: ['15 người dùng', '200 đơn hàng/tháng', '1GB lưu trữ'] },
                                                { key: 'premium', label: 'Premium', price: 'Liên hệ', color: '#7c3aed', gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)', recommended: true, limits: ['50 người dùng', '1.000 đơn hàng/tháng', '10GB lưu trữ'] },
                                                { key: 'enterprise', label: 'Enterprise', price: 'Tùy chỉnh', color: '#c2185b', gradient: 'linear-gradient(135deg, #c2185b, #7b1fa2)', recommended: false, limits: ['Không giới hạn', 'Không giới hạn', '100GB lưu trữ'] },
                                            ];

                                            return (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                    {plans.map((plan) => {
                                                        const isCurrent = plan.key === currentPlan;
                                                        return (
                                                            <div
                                                                key={plan.key}
                                                                className={`relative rounded-2xl border-2 p-5 transition-all duration-300 flex flex-col ${isCurrent
                                                                    ? 'border-purple-400 shadow-lg shadow-purple-100 bg-purple-50/30'
                                                                    : plan.recommended
                                                                        ? 'border-purple-200 hover:border-purple-300 hover:shadow-md bg-white dark:bg-gray-900 dark:border-purple-700 dark:hover:border-purple-600'
                                                                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 hover:shadow-md bg-white dark:bg-gray-900 dark:border-gray-700 dark:hover:border-gray-600'
                                                                    }`}
                                                            >
                                                                {/* Badge */}
                                                                {isCurrent && (
                                                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                                                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 shadow-sm whitespace-nowrap">
                                                                            Gói hiện tại
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {!isCurrent && plan.recommended && (
                                                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                                                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white bg-gradient-to-r from-amber-400 to-orange-500 shadow-sm whitespace-nowrap">
                                                                            Phổ biến nhất
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {/* Plan header */}
                                                                <div className="text-center pt-2 mb-4">
                                                                    <div
                                                                        className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                                                                        style={{ background: plan.gradient }}
                                                                    >
                                                                        <IconCrown size={20} className="text-white" />
                                                                    </div>
                                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{plan.label}</h3>
                                                                    <p className="text-sm font-semibold mt-1" style={{ color: plan.color }}>{plan.price}</p>
                                                                </div>

                                                                {/* Limits */}
                                                                <div className="space-y-2 mb-5 flex-1">
                                                                    {plan.limits.map((limit, i) => (
                                                                        <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                                            <IconCircleCheck size={16} className="text-green-500 shrink-0" />
                                                                            <span>{limit}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* CTA */}
                                                                {isCurrent ? (
                                                                    <Button disabled className="w-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-default text-sm">
                                                                        <IconCheck size={16} className="mr-1.5" /> Gói hiện tại
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        variant="outline"
                                                                        className="w-full text-sm hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 transition-colors"
                                                                        style={{ borderColor: plan.color, color: plan.color }}
                                                                    >
                                                                        Liên hệ nâng cấp
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* ───── Section 2: Feature Comparison Table ───── */}
                            <motion.div variants={itemVariants}>
                                <Card className="border-0 shadow-sm">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <IconVersions className="h-5 w-5 text-indigo-500" />
                                            Chi tiết tính năng theo gói
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {(() => {
                                            const currentPlan = t?.plan || 'basic';
                                            const features = [
                                                { name: 'Quản lý đơn hàng', basic: true, standard: true, premium: true, enterprise: true },
                                                { name: 'Quản lý báo giá', basic: true, standard: true, premium: true, enterprise: true },
                                                { name: 'Quản lý kho hàng', basic: true, standard: true, premium: true, enterprise: true },
                                                { name: 'Quản lý thực đơn', basic: true, standard: true, premium: true, enterprise: true },
                                                { name: 'Mua hàng & Nhà cung cấp', basic: false, standard: true, premium: true, enterprise: true },
                                                { name: 'Quản lý nhân sự (HR)', basic: false, standard: true, premium: true, enterprise: true },
                                                { name: 'CRM & Loyalty', basic: false, standard: true, premium: true, enterprise: true },
                                                { name: 'Lịch trực quan', basic: false, standard: true, premium: true, enterprise: true },
                                                { name: 'Báo cáo & Phân tích nâng cao', basic: false, standard: false, premium: true, enterprise: true },
                                                { name: 'Xuất Excel/PDF chuyên nghiệp', basic: false, standard: false, premium: true, enterprise: true },
                                                { name: 'Tài chính & Kế toán', basic: false, standard: false, premium: true, enterprise: true },
                                                { name: 'API access', basic: false, standard: false, premium: true, enterprise: true },
                                                { name: 'SLA hỗ trợ ưu tiên', basic: false, standard: false, premium: false, enterprise: true },
                                                { name: 'Custom branding', basic: false, standard: false, premium: false, enterprise: true },
                                            ];
                                            const tierKeys: Array<'basic' | 'standard' | 'premium' | 'enterprise'> = ['basic', 'standard', 'premium', 'enterprise'];
                                            const tierLabels: Record<string, string> = { basic: 'Basic', standard: 'Standard', premium: 'Premium', enterprise: 'Enterprise' };

                                            return (
                                                <div className="overflow-x-auto -mx-6">
                                                    <table className="w-full text-sm min-w-[500px]">
                                                        <thead>
                                                            <tr className="border-b border-gray-100 dark:border-gray-800">
                                                                <th className="text-left py-3 px-6 font-semibold text-gray-700 dark:text-gray-300 w-[40%]">Tính năng</th>
                                                                {tierKeys.map(tier => (
                                                                    <th
                                                                        key={tier}
                                                                        className={`text-center py-3 px-2 font-semibold w-[15%] ${tier === currentPlan ? 'text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-900/20' : 'text-gray-600 dark:text-gray-400'
                                                                            }`}
                                                                    >
                                                                        {tierLabels[tier]}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {features.map((feature, idx) => (
                                                                <tr key={idx} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:bg-gray-900/50 dark:bg-gray-800/50 dark:hover:bg-gray-800/50 transition-colors">
                                                                    <td className="py-2.5 px-6 text-gray-700 dark:text-gray-300">{feature.name}</td>
                                                                    {tierKeys.map(tier => (
                                                                        <td
                                                                            key={tier}
                                                                            className={`text-center py-2.5 px-2 ${tier === currentPlan ? 'bg-purple-50/30' : ''}`}
                                                                        >
                                                                            {feature[tier] ? (
                                                                                <IconCircleCheck size={18} className="text-green-500 mx-auto" />
                                                                            ) : (
                                                                                <span className="text-gray-300 dark:text-gray-600">—</span>
                                                                            )}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                        })()}
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* ───── Section 3: Usage Dashboard (Polished) ───── */}
                            <motion.div variants={itemVariants}>
                                <Card className="border-0 shadow-sm">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <IconChartBar className="h-5 w-5 text-emerald-500" />
                                            Mức sử dụng tài nguyên
                                        </CardTitle>
                                        <CardDescription className="text-sm">Theo dõi mức sử dụng so với giới hạn gói hiện tại</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {u && (
                                                <>
                                                    <UsageBar label="Người dùng" current={u.users.current} limit={u.users.limit} percentage={u.users.percentage} icon={IconUsers} color="#3b82f6" />
                                                    <UsageBar label="Đơn hàng tháng này" current={u.orders_this_month?.current || 0} limit={u.orders_this_month?.limit || 0} percentage={u.orders_this_month?.percentage || 0} icon={IconShoppingCart} color="#8b5cf6" />
                                                    <UsageBar label="Dung lượng lưu trữ" current={u.storage?.current || 0} limit={u.storage?.limit || 0} percentage={u.storage?.percentage || 0} icon={IconDatabase} color="#10b981" />
                                                </>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* ───── Section 4: Upgrade CTA ───── */}
                            <motion.div variants={itemVariants}>
                                <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-pink-50 to-indigo-50 dark:from-purple-950/30 dark:via-pink-950/30 dark:to-indigo-950/30 border border-purple-100 dark:border-purple-800 flex items-center justify-between flex-wrap gap-4">
                                    <div>
                                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1 flex items-center gap-2">
                                            <IconCrown size={16} className="text-purple-500" />
                                            Cần thêm tài nguyên?
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Liên hệ để nâng cấp gói dịch vụ và mở khóa tính năng nâng cao.</div>
                                    </div>
                                    <Button className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 transition-opacity text-sm shadow-sm">
                                        Liên hệ nâng cấp <IconArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </motion.div>

                        </motion.div>
                    </TabsContent>

                    {/* User Management Tab */}
                    <TabsContent value="users">
                        <UserManagementTab />
                    </TabsContent>

                    {/* Permission Matrix Tab */}
                    <TabsContent value="permissions">
                        <PermissionMatrixTab />
                    </TabsContent>

                    {/* System Settings — Grouped by category */}
                    <TabsContent value="system-settings">
                        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5">
                            {(() => {
                                // Setting group configurations
                                const SETTING_GROUPS = [
                                    {
                                        id: 'order',
                                        title: 'Đơn hàng & Vận hành',
                                        description: 'Cấu hình tự động hóa khi xử lý đơn hàng',
                                        icon: IconShoppingCart,
                                        color: '#6366f1',
                                        settings: [
                                            { key: 'order.auto_deduct_inventory', label: 'Tự động trừ kho khi hoàn thành đơn', help: 'Trừ nguyên liệu theo recipe mapping khi đơn hoàn thành' },
                                            { key: 'order.auto_create_timesheet', label: 'Tự động tạo bảng chấm công', help: 'Tạo timesheet cho nhân viên được phân công' },
                                            { key: 'order.auto_earn_loyalty', label: 'Tự động cộng điểm tích lũy', help: 'Cộng điểm loyalty cho khách hàng khi đơn hoàn thành' },
                                            { key: 'order.require_deposit', label: 'Yêu cầu đặt cọc trước xác nhận', help: 'Đơn hàng cần thanh toán đặt cọc trước khi xác nhận' },
                                        ]
                                    },
                                    {
                                        id: 'crm',
                                        title: 'Khách hàng & Loyalty',
                                        description: 'Chương trình tích điểm và chăm sóc khách hàng',
                                        icon: IconCrown,
                                        color: '#f59e0b',
                                        settings: [
                                            { key: 'crm.loyalty_enabled', label: 'Bật chương trình tích điểm', help: 'Bật/tắt toàn bộ chương trình loyalty' },
                                            { key: 'crm.loyalty_points_ratio', label: 'Số VND cho 1 điểm', help: 'Tỉ lệ quy đổi: mỗi X VND = 1 điểm loyalty', suffix: 'VND/điểm' },
                                        ]
                                    },
                                    {
                                        id: 'quote',
                                        title: 'Báo giá',
                                        description: 'Cài đặt mặc định cho báo giá',
                                        icon: IconCalendar,
                                        color: '#10b981',
                                        settings: [
                                            { key: 'quote.default_validity_days', label: 'Thời hạn hiệu lực mặc định', help: 'Số ngày hiệu lực tự động áp dụng cho báo giá mới', suffix: 'ngày' },
                                            { key: 'quote.expiring_soon_days', label: 'Ngưỡng cảnh báo sắp hết hạn', help: 'Cảnh báo khi báo giá còn dưới X ngày để hết hạn', suffix: 'ngày' },
                                        ]
                                    },
                                    {
                                        id: 'finance',
                                        title: 'Tài chính',
                                        description: 'Cấu hình kế toán và thanh toán',
                                        icon: IconChartBar,
                                        color: '#ec4899',
                                        settings: [
                                            { key: 'finance.auto_journal_on_payment', label: 'Tự động tạo bút toán khi thanh toán', help: 'Tạo journal entry khi ghi nhận thanh toán' },
                                            { key: 'finance.default_payment_terms', label: 'Số ngày thanh toán mặc định', help: 'Hạn thanh toán mặc định cho đơn hàng mới', suffix: 'ngày' },
                                            { key: 'finance.tax_rate', label: 'Thuế GTGT mặc định', help: 'Tỉ lệ thuế giá trị gia tăng', suffix: '%' },
                                        ]
                                    },
                                    {
                                        id: 'system',
                                        title: 'Hệ thống chung',
                                        description: 'Tự động hóa liên module',
                                        icon: IconDatabase,
                                        color: '#64748b',
                                        settings: [
                                            { key: 'hr.sync_order_assignments', label: 'Đồng bộ phân công nhân viên', help: 'Đồng bộ phân công giữa Order và HR' },
                                            { key: 'inventory.auto_import_from_po', label: 'Tự động nhập kho từ PO', help: 'Import hàng vào kho khi Purchase Order được duyệt' },
                                        ]
                                    }
                                ];

                                const getSettingValue = (key: string) => {
                                    const found = s.find(st => st.key === key);
                                    return found?.value ?? '';
                                };
                                const getSettingType = (key: string) => {
                                    const found = s.find(st => st.key === key);
                                    return found?.type ?? 'STRING';
                                };

                                return settingsLoading ? (
                                    <div className="flex flex-col gap-4">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className="h-36 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                                        ))}
                                    </div>
                                ) : (
                                    SETTING_GROUPS.map(group => {
                                        const GroupIcon = group.icon;
                                        return (
                                            <motion.div key={group.id} variants={itemVariants}>
                                                <Card className="border-0 shadow-sm overflow-hidden">
                                                    {/* Group Header */}
                                                    <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${group.color}14` }}>
                                                            <GroupIcon size={18} stroke={1.5} style={{ color: group.color }} />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{group.title}</div>
                                                            <div className="text-xs text-gray-400 dark:text-gray-500">{group.description}</div>
                                                        </div>
                                                    </div>
                                                    {/* Settings List */}
                                                    <CardContent className="p-0">
                                                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                                            {group.settings.map(setting => {
                                                                const val = getSettingValue(setting.key);
                                                                const type = getSettingType(setting.key);
                                                                const isBool = type === 'BOOLEAN';
                                                                const isOn = val === 'true' || String(val) === 'true';

                                                                return (
                                                                    <div key={setting.key} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:bg-gray-900/60 dark:hover:bg-gray-800/40 transition-colors group/row">
                                                                        <div className="flex-1 min-w-0 mr-4">
                                                                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover/row:text-gray-900 dark:text-gray-100 dark:group-hover/row:text-gray-100 transition-colors">
                                                                                {setting.label}
                                                                            </div>
                                                                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{setting.help}</div>
                                                                        </div>
                                                                        {isBool ? (
                                                                            <button
                                                                                onClick={() => handleSettingSave(setting.key, isOn ? 'false' : 'true')}
                                                                                className="relative w-11 h-6 rounded-full border-none cursor-pointer transition-colors shrink-0"
                                                                                style={{ background: isOn ? '#22c55e' : '#e2e8f0' }}
                                                                            >
                                                                                <div
                                                                                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-[left] duration-200"
                                                                                    style={{ left: isOn ? '22px' : '2px' }}
                                                                                />
                                                                            </button>
                                                                        ) : (
                                                                            <div className="flex items-center gap-2 shrink-0">
                                                                                <input
                                                                                    type="number"
                                                                                    defaultValue={val as string}
                                                                                    onBlur={e => {
                                                                                        const newVal = e.target.value.trim();
                                                                                        if (newVal && newVal !== String(val)) {
                                                                                            handleSettingSave(setting.key, newVal);
                                                                                        }
                                                                                    }}
                                                                                    onKeyDown={e => {
                                                                                        if (e.key === 'Enter') {
                                                                                            (e.target as HTMLInputElement).blur();
                                                                                        }
                                                                                    }}
                                                                                    className="w-24 px-3 py-1.5 text-sm text-right font-mono rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
                                                                                    min={0}
                                                                                />
                                                                                {'suffix' in setting && (
                                                                                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{(setting as Record<string, string>).suffix}</span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        );
                                    })
                                );
                            })()}
                        </motion.div>
                    </TabsContent>

                    {/* Appearance Settings */}
                    <TabsContent value="appearance">
                        <AppearanceTab />
                    </TabsContent>

                    {/* Notification Settings — API-backed, with Error Boundary */}
                    <TabsContent value="notifications">
                        <NotificationErrorBoundary>
                            <NotificationSettingsTab />
                        </NotificationErrorBoundary>
                    </TabsContent>
                </Tabs >
            </motion.div >
        </div >
    );
}
