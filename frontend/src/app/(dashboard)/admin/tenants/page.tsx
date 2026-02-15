'use client';

import { useState, useMemo } from 'react';
import {
    IconBuilding,
    IconCheck,
    IconClock,
    IconSearch,
    IconPlus,
    IconEdit,
    IconTrash,
    IconPlayerPlay,
    IconPlayerPause,
    IconMail,
    IconPhone,
    IconWorld,
    IconMapPin,
    IconCalendar,
    IconRefresh,
    IconX,
    IconChevronLeft,
    IconChevronRight,
    IconUsers,
} from '@tabler/icons-react';
import {
    useTenants,
    useTenantStats,
    useCreateTenant,
    useUpdateTenant,
    useUpdateTenantStatus,
    useDeleteTenant,
    useTenantUsage,
    Tenant,
    TenantCreateData,
    TenantUpdateData,
    TenantFilters,
} from '@/hooks/use-tenants';
import { useDebounce } from '@/hooks/use-debounce';

// =============================================
// Constants & Helpers
// =============================================

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: 'Hoạt động', color: '#16a34a', bg: '#f0fdf4' },
    trial: { label: 'Dùng thử', color: '#ca8a04', bg: '#fefce8' },
    suspended: { label: 'Tạm ngưng', color: '#dc2626', bg: '#fef2f2' },
    cancelled: { label: 'Đã hủy', color: '#6b7280', bg: '#f3f4f6' },
};

const PLAN_CONFIG: Record<string, { label: string; color: string }> = {
    basic: { label: 'Basic', color: '#6b7280' },
    standard: { label: 'Standard', color: '#2563eb' },
    premium: { label: 'Premium', color: '#7c3aed' },
    enterprise: { label: 'Enterprise', color: '#c2185b' },
};

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return '—';
    }
}

// =============================================
// Stat Cards
// =============================================

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: React.ElementType; color: string }) {
    return (
        <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
        }}>
            <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: `${color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Icon size={24} color={color} stroke={1.5} />
            </div>
            <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.2 }}>{value}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{title}</div>
            </div>
        </div>
    );
}

// =============================================
// Status Badge
// =============================================

function StatusBadge({ status }: { status: string }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            color: config.color, background: config.bg,
        }}>
            <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: config.color,
            }} />
            {config.label}
        </span>
    );
}

// =============================================
// Plan Badge
// =============================================

function PlanBadge({ plan }: { plan: string }) {
    const config = PLAN_CONFIG[plan] || PLAN_CONFIG.basic;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            color: config.color, background: `${config.color}12`,
            textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
            {config.label}
        </span>
    );
}

// =============================================
// Tenant Form Modal
// =============================================

function TenantModal({
    isOpen, onClose, tenant, onSave, isSaving,
}: {
    isOpen: boolean;
    onClose: () => void;
    tenant: Tenant | null;
    onSave: (data: TenantCreateData | TenantUpdateData) => void;
    isSaving: boolean;
}) {
    const [formData, setFormData] = useState<Record<string, string>>({});

    useMemo(() => {
        if (isOpen) {
            setFormData({
                name: tenant?.name || '',
                slug: tenant?.slug || '',
                plan: tenant?.plan || 'basic',
                domain: tenant?.domain || '',
                contact_email: tenant?.contact_email || '',
                contact_phone: tenant?.contact_phone || '',
                address: tenant?.address || '',
            });
        }
    }, [isOpen, tenant]);

    if (!isOpen) return null;

    const isEdit = !!tenant;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data: Record<string, any> = {};
        Object.entries(formData).forEach(([key, value]) => {
            if (value) data[key] = value;
        });
        onSave(data);
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        }} onClick={onClose}>
            <div style={{
                background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560,
                padding: 0, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                animation: 'slideUp 0.2s ease-out',
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px', borderBottom: '1px solid #e5e7eb',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
                            {isEdit ? 'Chỉnh sửa Tenant' : 'Tạo Tenant mới'}
                        </h2>
                        <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
                            {isEdit ? 'Cập nhật thông tin' : 'Thêm tenant mới vào hệ thống'}
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        width: 32, height: 32, borderRadius: 8, border: 'none',
                        background: '#f3f4f6', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                    }}>
                        <IconX size={16} color="#6b7280" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Tên Tenant *</label>
                            <input
                                value={formData.name || ''}
                                onChange={e => handleChange('name', e.target.value)}
                                placeholder="Ẩm Thực ABC"
                                required
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Slug</label>
                            <input
                                value={formData.slug || ''}
                                onChange={e => handleChange('slug', e.target.value)}
                                placeholder="am-thuc-abc"
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Gói dịch vụ</label>
                            <select
                                value={formData.plan || 'basic'}
                                onChange={e => handleChange('plan', e.target.value)}
                                style={inputStyle}
                            >
                                <option value="basic">Basic</option>
                                <option value="standard">Standard</option>
                                <option value="premium">Premium</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Email liên hệ</label>
                            <input
                                value={formData.contact_email || ''}
                                onChange={e => handleChange('contact_email', e.target.value)}
                                placeholder="admin@example.com"
                                type="email"
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Số điện thoại</label>
                            <input
                                value={formData.contact_phone || ''}
                                onChange={e => handleChange('contact_phone', e.target.value)}
                                placeholder="0901234567"
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Domain</label>
                            <input
                                value={formData.domain || ''}
                                onChange={e => handleChange('domain', e.target.value)}
                                placeholder="example.com"
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Địa chỉ</label>
                            <input
                                value={formData.address || ''}
                                onChange={e => handleChange('address', e.target.value)}
                                placeholder="123 Nguyễn Huệ, Q.1, TP.HCM"
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{
                        display: 'flex', justifyContent: 'flex-end', gap: 12,
                        marginTop: 24, paddingTop: 20, borderTop: '1px solid #f3f4f6',
                    }}>
                        <button type="button" onClick={onClose} style={{
                            padding: '10px 20px', borderRadius: 10, border: '1px solid #e5e7eb',
                            background: '#fff', color: '#374151', fontSize: 14, fontWeight: 500,
                            cursor: 'pointer',
                        }}>
                            Hủy
                        </button>
                        <button type="submit" disabled={isSaving} style={{
                            padding: '10px 24px', borderRadius: 10, border: 'none',
                            background: 'linear-gradient(135deg, #c2185b, #7b1fa2)',
                            color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                            opacity: isSaving ? 0.7 : 1,
                        }}>
                            {isSaving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo Tenant'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600, color: '#374151',
    marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1px solid #e5e7eb', fontSize: 14, color: '#1a1a2e',
    outline: 'none', transition: 'border-color 0.15s',
    background: '#fafbfc', boxSizing: 'border-box',
};

// =============================================
// Tenant Detail Drawer
// =============================================

function TenantDetailDrawer({
    tenant, isOpen, onClose
}: {
    tenant: Tenant | null;
    isOpen: boolean;
    onClose: () => void;
}) {
    const { data: usage } = useTenantUsage(tenant?.id || '');

    if (!isOpen || !tenant) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
            background: '#fff', boxShadow: '-8px 0 30px rgba(0,0,0,0.1)',
            zIndex: 999, overflowY: 'auto', animation: 'slideInRight 0.2s ease-out',
        }}>
            {/* Header */}
            <div style={{
                padding: '20px 24px', borderBottom: '1px solid #e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #c2185b10, #7b1fa210)',
            }}>
                <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
                        {tenant.name}
                    </h3>
                    <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
                        {tenant.slug}
                    </p>
                </div>
                <button onClick={onClose} style={{
                    width: 32, height: 32, borderRadius: 8, border: 'none',
                    background: '#fff', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}>
                    <IconX size={16} />
                </button>
            </div>

            <div style={{ padding: 24 }}>
                {/* Status & Plan */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                    <StatusBadge status={tenant.status} />
                    <PlanBadge plan={tenant.plan} />
                </div>

                {/* Info Section */}
                <div style={{ marginBottom: 24 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>
                        Thông tin liên hệ
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <InfoRow icon={IconMail} label="Email" value={tenant.contact_email} />
                        <InfoRow icon={IconPhone} label="Điện thoại" value={tenant.contact_phone} />
                        <InfoRow icon={IconWorld} label="Domain" value={tenant.domain} />
                        <InfoRow icon={IconMapPin} label="Địa chỉ" value={tenant.address} />
                    </div>
                </div>

                {/* Usage */}
                {usage && (
                    <div style={{ marginBottom: 24 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>
                            Mức sử dụng
                        </h4>
                        <div style={{
                            background: '#f8fafc', borderRadius: 12, padding: 16,
                            border: '1px solid #e2e8f0',
                        }}>
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 13, color: '#475569' }}>Người dùng</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>
                                        {usage.users.current}/{usage.users.limit}
                                    </span>
                                </div>
                                <div style={{
                                    height: 6, background: '#e2e8f0', borderRadius: 3,
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        height: '100%', borderRadius: 3,
                                        width: `${Math.min(usage.users.percentage, 100)}%`,
                                        background: usage.users.percentage > 80
                                            ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                                            : 'linear-gradient(90deg, #c2185b, #7b1fa2)',
                                        transition: 'width 0.5s ease',
                                    }} />
                                </div>
                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                                    {usage.users.percentage}% đã sử dụng
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Plan Details */}
                {tenant.plan_details && Object.keys(tenant.plan_details).length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>
                            Chi tiết gói dịch vụ
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {tenant.plan_details.max_users && (
                                <PlanDetailRow label="Người dùng tối đa" value={`${tenant.plan_details.max_users}`} />
                            )}
                            {tenant.plan_details.max_orders_per_month && (
                                <PlanDetailRow label="Đơn hàng/tháng" value={`${tenant.plan_details.max_orders_per_month}`} />
                            )}
                            {tenant.plan_details.storage_mb && (
                                <PlanDetailRow label="Lưu trữ" value={`${tenant.plan_details.storage_mb} MB`} />
                            )}
                        </div>
                    </div>
                )}

                {/* Dates */}
                <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>
                        Lịch sử
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <InfoRow icon={IconCalendar} label="Ngày tạo" value={formatDate(tenant.created_at)} />
                        <InfoRow icon={IconRefresh} label="Cập nhật cuối" value={formatDate(tenant.updated_at)} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon size={16} color="#94a3b8" stroke={1.5} />
            <span style={{ fontSize: 13, color: '#64748b', minWidth: 90 }}>{label}</span>
            <span style={{ fontSize: 13, color: '#1a1a2e', fontWeight: 500 }}>{value || '—'}</span>
        </div>
    );
}

function PlanDetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '8px 12px', background: '#f8fafc', borderRadius: 8,
            border: '1px solid #f1f5f9',
        }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{value}</span>
        </div>
    );
}

// =============================================
// Confirm Modal
// =============================================

function ConfirmModal({
    isOpen, title, message, confirmLabel, confirmColor, onConfirm, onCancel
}: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    confirmColor: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    if (!isOpen) return null;
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1001,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        }} onClick={onCancel}>
            <div style={{
                background: '#fff', borderRadius: 16, padding: 24, maxWidth: 400,
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }} onClick={e => e.stopPropagation()}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' }}>{title}</h3>
                <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 20px' }}>{message}</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button onClick={onCancel} style={{
                        padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
                        background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer',
                    }}>
                        Hủy
                    </button>
                    <button onClick={onConfirm} style={{
                        padding: '8px 16px', borderRadius: 8, border: 'none',
                        background: confirmColor, color: '#fff', fontSize: 13,
                        fontWeight: 600, cursor: 'pointer',
                    }}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================
// Main Page
// =============================================

export default function TenantManagementPage() {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [planFilter, setPlanFilter] = useState('');
    const [page, setPage] = useState(1);
    const debouncedSearch = useDebounce(search, 300);

    const filters: TenantFilters = {
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        plan: planFilter || undefined,
        page,
        limit: 20,
    };

    const { data, isLoading } = useTenants(filters);
    const { data: stats } = useTenantStats();
    const createMutation = useCreateTenant();
    const updateMutation = useUpdateTenant();
    const statusMutation = useUpdateTenantStatus();
    const deleteMutation = useDeleteTenant();

    const [showModal, setShowModal] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [showDrawer, setShowDrawer] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{
        type: 'suspend' | 'activate' | 'delete';
        tenant: Tenant;
    } | null>(null);

    const tenants = data?.tenants || [];
    const total = data?.total || 0;
    const totalPages = Math.ceil(total / 20);

    const handleSave = (formData: TenantCreateData | TenantUpdateData) => {
        if (editingTenant) {
            updateMutation.mutate(
                { id: editingTenant.id, data: formData as TenantUpdateData },
                {
                    onSuccess: () => {
                        setShowModal(false);
                        setEditingTenant(null);
                    },
                }
            );
        } else {
            createMutation.mutate(formData as TenantCreateData, {
                onSuccess: () => {
                    setShowModal(false);
                },
            });
        }
    };

    const handleConfirmAction = () => {
        if (!confirmAction) return;

        if (confirmAction.type === 'delete') {
            deleteMutation.mutate(confirmAction.tenant.id, {
                onSuccess: () => setConfirmAction(null),
            });
        } else {
            const newStatus = confirmAction.type === 'suspend' ? 'suspended' : 'active';
            statusMutation.mutate(
                { id: confirmAction.tenant.id, status: newStatus },
                { onSuccess: () => setConfirmAction(null) }
            );
        }
    };

    return (
        <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
            {/* Page Header */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: 'linear-gradient(135deg, #c2185b, #7b1fa2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <IconBuilding size={22} color="#fff" stroke={1.5} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>
                            Quản lý Tenant
                        </h1>
                        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                            Quản lý các tổ chức trong hệ thống
                        </p>
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                <StatCard title="Tổng Tenants" value={stats?.total || 0} icon={IconUsers} color="#c2185b" />
                <StatCard title="Hoạt động" value={stats?.active || 0} icon={IconCheck} color="#16a34a" />
                <StatCard title="Dùng thử" value={stats?.trial || 0} icon={IconClock} color="#ca8a04" />
                <StatCard title="Tạm ngưng" value={stats?.suspended || 0} icon={IconPlayerPause} color="#dc2626" />
            </div>

            {/* Toolbar */}
            <div style={{
                background: '#fff', borderRadius: 12, padding: '16px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 16, flexWrap: 'wrap', gap: 12,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
                        <div style={{
                            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                        }}>
                            <IconSearch size={16} color="#94a3b8" stroke={1.5} />
                        </div>
                        <input
                            type="text"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Tìm kiếm tenant..."
                            style={{
                                width: '100%', padding: '8px 14px 8px 38px', borderRadius: 8,
                                border: '1px solid #e5e7eb', fontSize: 13, outline: 'none',
                                background: '#fafbfc', boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                        style={{
                            padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
                            fontSize: 13, color: '#374151', background: '#fafbfc',
                            cursor: 'pointer', outline: 'none',
                        }}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="active">Hoạt động</option>
                        <option value="trial">Dùng thử</option>
                        <option value="suspended">Tạm ngưng</option>
                        <option value="cancelled">Đã hủy</option>
                    </select>

                    {/* Plan Filter */}
                    <select
                        value={planFilter}
                        onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
                        style={{
                            padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
                            fontSize: 13, color: '#374151', background: '#fafbfc',
                            cursor: 'pointer', outline: 'none',
                        }}
                    >
                        <option value="">Tất cả gói</option>
                        <option value="basic">Basic</option>
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                        <option value="enterprise">Enterprise</option>
                    </select>
                </div>

                <button
                    onClick={() => { setEditingTenant(null); setShowModal(true); }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 20px', borderRadius: 10, border: 'none',
                        background: 'linear-gradient(135deg, #c2185b, #7b1fa2)',
                        color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(194,24,91,0.3)',
                    }}
                >
                    <IconPlus size={18} stroke={2} />
                    Tạo Tenant
                </button>
            </div>

            {/* Table */}
            <div style={{
                background: '#fff', borderRadius: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                border: '1px solid #e5e7eb', overflow: 'hidden',
            }}>
                {isLoading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} style={{
                                    height: 48, background: '#f3f4f6', borderRadius: 8,
                                    width: '100%', animation: 'pulse 1.5s infinite',
                                }} />
                            ))}
                        </div>
                    </div>
                ) : tenants.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center' }}>
                        <IconBuilding size={48} color="#d1d5db" stroke={1} style={{ marginBottom: 12 }} />
                        <p style={{ fontSize: 15, color: '#6b7280', margin: 0 }}>Chưa có tenant nào</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                                <th style={thStyle}>Tenant</th>
                                <th style={thStyle}>Gói</th>
                                <th style={thStyle}>Trạng thái</th>
                                <th style={thStyle}>Liên hệ</th>
                                <th style={thStyle}>Ngày tạo</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tenants.map((tenant) => (
                                <tr
                                    key={tenant.id}
                                    style={{
                                        borderBottom: '1px solid #f3f4f6',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s',
                                    }}
                                    onClick={() => { setSelectedTenant(tenant); setShowDrawer(true); }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#fafbfc')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{
                                                width: 40, height: 40, borderRadius: 10,
                                                background: 'linear-gradient(135deg, #c2185b15, #7b1fa215)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 16, fontWeight: 700, color: '#7b1fa2',
                                            }}>
                                                {tenant.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{tenant.name}</div>
                                                <div style={{ fontSize: 12, color: '#94a3b8' }}>{tenant.slug}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={tdStyle}><PlanBadge plan={tenant.plan} /></td>
                                    <td style={tdStyle}><StatusBadge status={tenant.status} /></td>
                                    <td style={tdStyle}>
                                        <div style={{ fontSize: 13, color: '#475569' }}>
                                            {tenant.contact_email || '—'}
                                        </div>
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{ fontSize: 13, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                                            {formatDate(tenant.created_at)}
                                        </span>
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}
                                            onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => { setEditingTenant(tenant); setShowModal(true); }}
                                                style={actionBtnStyle}
                                                title="Chỉnh sửa"
                                            >
                                                <IconEdit size={16} stroke={1.5} />
                                            </button>
                                            {tenant.status === 'active' ? (
                                                <button
                                                    onClick={() => setConfirmAction({ type: 'suspend', tenant })}
                                                    style={{ ...actionBtnStyle, color: '#ca8a04' }}
                                                    title="Tạm ngưng"
                                                >
                                                    <IconPlayerPause size={16} stroke={1.5} />
                                                </button>
                                            ) : tenant.status === 'suspended' ? (
                                                <button
                                                    onClick={() => setConfirmAction({ type: 'activate', tenant })}
                                                    style={{ ...actionBtnStyle, color: '#16a34a' }}
                                                    title="Kích hoạt"
                                                >
                                                    <IconPlayerPlay size={16} stroke={1.5} />
                                                </button>
                                            ) : null}
                                            <button
                                                onClick={() => setConfirmAction({ type: 'delete', tenant })}
                                                style={{ ...actionBtnStyle, color: '#ef4444' }}
                                                title="Xóa"
                                            >
                                                <IconTrash size={16} stroke={1.5} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{
                        padding: '12px 20px', borderTop: '1px solid #e5e7eb',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>
                            Hiển thị {tenants.length} / {total} tenants
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                style={pageBtnStyle}
                            >
                                <IconChevronLeft size={18} />
                            </button>
                            <span style={{ padding: '6px 12px', fontSize: 13, color: '#374151' }}>
                                Trang {page}/{totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                style={pageBtnStyle}
                            >
                                <IconChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <TenantModal
                isOpen={showModal}
                onClose={() => { setShowModal(false); setEditingTenant(null); }}
                tenant={editingTenant}
                onSave={handleSave}
                isSaving={createMutation.isPending || updateMutation.isPending}
            />

            <TenantDetailDrawer
                tenant={selectedTenant}
                isOpen={showDrawer}
                onClose={() => { setShowDrawer(false); setSelectedTenant(null); }}
            />

            <ConfirmModal
                isOpen={!!confirmAction}
                title={
                    confirmAction?.type === 'delete' ? 'Xác nhận xóa' :
                        confirmAction?.type === 'suspend' ? 'Xác nhận tạm ngưng' :
                            'Xác nhận kích hoạt'
                }
                message={
                    confirmAction?.type === 'delete'
                        ? `Bạn có chắc muốn xóa tenant "${confirmAction?.tenant.name}"? Thao tác này sẽ hủy tenant.`
                        : confirmAction?.type === 'suspend'
                            ? `Bạn có chắc muốn tạm ngưng tenant "${confirmAction?.tenant.name}"? Người dùng sẽ không thể đăng nhập.`
                            : `Kích hoạt lại tenant "${confirmAction?.tenant.name}"?`
                }
                confirmLabel={
                    confirmAction?.type === 'delete' ? 'Xóa' :
                        confirmAction?.type === 'suspend' ? 'Tạm ngưng' : 'Kích hoạt'
                }
                confirmColor={
                    confirmAction?.type === 'delete' ? '#ef4444' :
                        confirmAction?.type === 'suspend' ? '#ca8a04' : '#16a34a'
                }
                onConfirm={handleConfirmAction}
                onCancel={() => setConfirmAction(null)}
            />

            {/* Inline CSS Animations */}
            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    padding: '12px 16px', textAlign: 'left', fontSize: 12,
    fontWeight: 600, color: '#64748b', textTransform: 'uppercase',
    letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
    padding: '14px 16px', fontSize: 14,
};

const actionBtnStyle: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 8, border: 'none',
    background: 'transparent', color: '#6b7280', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s',
};

const pageBtnStyle: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 8,
    border: '1px solid #e5e7eb', background: '#fff',
    cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
};
