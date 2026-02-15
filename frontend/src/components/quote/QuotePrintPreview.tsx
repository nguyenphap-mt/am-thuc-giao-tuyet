'use client';

import { forwardRef } from 'react';
import Image from 'next/image';
import { formatCurrency, formatDate } from '@/lib/utils';
import { MenuItem, User } from '@/types';

// Event type labels
const EVENT_TYPE_LABELS: Record<string, string> = {
    wedding: 'Tiệc cưới',
    birthday: 'Tiệc sinh nhật',
    corporate: 'Tiệc công ty',
    anniversary: 'Tiệc kỷ niệm',
    funeral: 'Tiệc tang',
    housewarming: 'Tiệc tân gia',
    other: 'Khác',
};

// Service definition
interface ServiceItem {
    id: string;
    name: string;
    pricePerUnit: number;
    unit: string;
    quantity: number;
}

export interface QuotePrintData {
    // Customer Info
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    event_address: string;

    // Event Details
    event_type: string;
    event_date: string;
    event_time: string;
    table_count: number;
    guest_count?: number;

    // Menu Items (processed with selling_price as number)
    menuItems: Array<{
        id: string;
        name: string;
        selling_price: number;
    }>;

    // Services
    services: ServiceItem[];
    staffCount: number;
    staffPricePerUnit: number;

    // Pricing
    menuTotalPerTable: number;
    menuTotalWithTables: number;
    serviceTotal: number;
    furnitureDiscountAmount: number;
    staffDiscountAmount: number;
    orderDiscountAmount: number;
    subtotal: number;
    includeVat: boolean;
    vatAmount: number;
    grandTotal: number;

    // Notes
    notes?: string;

    // Staff Info
    staff?: {
        full_name: string;
        email: string;
    };
}

interface QuotePrintPreviewProps {
    data: QuotePrintData;
    onPrint?: () => void;
    tenantLogoUrl?: string | null;
}

const COLOR_PALETTE = {
    white: '#ffffff',
    black: '#000000',
    purple700: '#7e22ce',
    purple600: '#9333ea',
    purple500: '#a855f7',
    purple300: '#d8b4fe',
    purple200: '#e9d5ff',
    purple50: '#faf5ff',
    gray900: '#111827',
    gray700: '#374151',
    gray600: '#4b5563',
    gray500: '#6b7280',
    gray400: '#9ca3af',
    gray200: '#e5e7eb',
    gray100: '#f3f4f6',
    gray50: '#f9fafb',
    green700: '#15803d',
    green600: '#16a34a',
    yellow700: '#a16207',
    yellow200: '#fef08a',
    yellow50: '#fefce8',
    red600: '#dc2626',
    pink500: '#ec4899',
    pink100: '#fce7f3',
    purple100: '#f3e8ff',
};

// ... (previous interfaces remain same)

const QuotePrintPreview = forwardRef<HTMLDivElement, QuotePrintPreviewProps>(
    ({ data, onPrint, tenantLogoUrl }, ref) => {
        const pricePerTable = data.table_count > 0
            ? Math.round(data.grandTotal / data.table_count)
            : 0;

        const today = formatDate(new Date());

        const cssOverrides = `
            .quote-print-preview, .quote-print-preview * {
                box-sizing: border-box;
            }
            .quote-print-preview {
                --background: #ffffff;
                --foreground: #020817;
                --card: #ffffff;
                --card-foreground: #020817;
                --popover: #ffffff;
                --popover-foreground: #020817;
                --primary: #0f172a;
                --primary-foreground: #f8fafc;
                --secondary: #f1f5f9;
                --secondary-foreground: #0f172a;
                --muted: #f1f5f9;
                --muted-foreground: #64748b;
                --accent: #f1f5f9;
                --accent-foreground: #0f172a;
                --destructive: #ef4444;
                --destructive-foreground: #f8fafc;
                --border: #e2e8f0;
                --input: #e2e8f0;
                --ring: #0f172a;
                --radius: 0.5rem;
                --chart-1: #e76e50;
                --chart-2: #2a9d8f;
                --chart-3: #264653;
                --chart-4: #f4a261;
                --chart-5: #e9c46a;
            }
            .quote-print-preview * {
                border-color: #e2e8f0;
            }
        `;

        const styles = {
            container: {
                boxSizing: 'border-box' as const,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                width: '210mm',
                minHeight: '297mm',
                padding: '15mm',
                backgroundColor: COLOR_PALETTE.white,
                color: COLOR_PALETTE.gray900,
                margin: '0 auto',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // Manual shadow
            },
            header: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '1rem',
                marginBottom: '1.5rem',
                borderBottom: `2px solid ${COLOR_PALETTE.purple600}`,
            },
            headerRight: {
                textAlign: 'right' as const,
            },
            title: {
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: COLOR_PALETTE.purple700,
                whiteSpace: 'nowrap' as const,
                margin: 0,
            },
            subtitle: {
                fontSize: '0.875rem',
                color: COLOR_PALETTE.gray500,
                margin: 0,
            },
            grid2Col: {
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1.5rem',
                marginBottom: '1.5rem',
            },
            card: {
                border: `1px solid ${COLOR_PALETTE.gray200}`,
                borderRadius: '0.5rem',
                padding: '1rem',
                backgroundColor: COLOR_PALETTE.gray50,
            },
            sectionTitle: {
                fontWeight: 600,
                marginBottom: '0.75rem',
                textTransform: 'uppercase' as const,
                fontSize: '0.875rem',
                letterSpacing: '0.025em',
                color: COLOR_PALETTE.purple700,
                marginTop: 0,
            },
            dl: {
                fontSize: '0.875rem',
                margin: 0,
            },
            row: {
                display: 'flex',
                marginBottom: '0.5rem',
            },
            dt: {
                width: '8rem',
                flexShrink: 0,
                color: COLOR_PALETTE.gray500,
                fontWeight: 400,
            },
            dd: {
                fontWeight: 500,
                margin: 0,
                flex: 1,
            },
            table: {
                width: '100%',
                fontSize: '0.875rem',
                borderCollapse: 'collapse' as const,
            },
            th: {
                padding: '0.5rem 0.75rem',
                textAlign: 'left' as const,
                backgroundColor: COLOR_PALETTE.purple50,
                borderTop: `1px solid ${COLOR_PALETTE.purple200}`,
                borderBottom: `1px solid ${COLOR_PALETTE.purple200}`,
                fontWeight: 600,
            },
            td: {
                padding: '0.5rem 0.75rem',
                borderBottom: `1px solid ${COLOR_PALETTE.gray100}`,
            },
            footerRow: {
                backgroundColor: COLOR_PALETTE.purple50,
                borderTop: `2px solid ${COLOR_PALETTE.purple200}`,
                fontWeight: 600,
                color: COLOR_PALETTE.purple700,
            },
            summaryBox: {
                marginBottom: '1.5rem',
                border: `1px solid ${COLOR_PALETTE.gray200}`,
                borderRadius: '0.5rem',
                overflow: 'hidden',
            },
            summaryHeader: {
                background: `linear-gradient(to right, ${COLOR_PALETTE.purple600}, ${COLOR_PALETTE.pink500})`,
                color: COLOR_PALETTE.white,
                padding: '0.5rem 1rem',
            },
            summaryContent: {
                padding: '1rem',
            },
            summaryRow: {
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
            },
            highlightBox: {
                marginBottom: '1.5rem',
                border: `2px solid ${COLOR_PALETTE.purple300}`,
                borderRadius: '0.5rem',
                padding: '1rem',
                textAlign: 'center' as const,
                background: `linear-gradient(to right, ${COLOR_PALETTE.purple100}, ${COLOR_PALETTE.pink100})`,
            },
            noteBox: {
                marginBottom: '1.5rem',
                border: `1px solid ${COLOR_PALETTE.yellow200}`,
                borderRadius: '0.5rem',
                padding: '1rem',
                backgroundColor: COLOR_PALETTE.yellow50,
            },
            footer: {
                borderTop: `2px solid ${COLOR_PALETTE.gray200}`,
                paddingTop: '1rem',
                marginTop: '1.5rem',
            },
            footerFlex: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
            },
        };

        return (
            <div ref={ref} style={styles.container} className="quote-print-preview">
                <style dangerouslySetInnerHTML={{ __html: cssOverrides }} />
                {/* Header with Logo */}
                <div style={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={tenantLogoUrl || "/Logo.png"}
                            alt="Giao Tuyết Logo"
                            width={120}
                            height={60}
                            style={{ objectFit: 'contain', display: 'block' }}
                        />
                    </div>
                    <div style={styles.headerRight}>
                        <h1 style={styles.title}>BÁO GIÁ DỊCH VỤ</h1>
                        <p style={styles.subtitle}>Ngày lập: {today}</p>
                    </div>
                </div>

                {/* Customer Info & Event Details - 2 columns */}
                <div style={styles.grid2Col}>
                    {/* Customer Info */}
                    <div style={styles.card}>
                        <h2 style={styles.sectionTitle}>Thông tin khách hàng</h2>
                        <dl style={styles.dl}>
                            <div style={styles.row}>
                                <dt style={styles.dt}>Họ tên:</dt>
                                <dd style={styles.dd}>{data.customer_name}</dd>
                            </div>
                            <div style={styles.row}>
                                <dt style={styles.dt}>Điện thoại:</dt>
                                <dd style={styles.dd}>{data.customer_phone}</dd>
                            </div>
                            {data.customer_email && (
                                <div style={styles.row}>
                                    <dt style={styles.dt}>Email:</dt>
                                    <dd style={{ ...styles.dd, fontWeight: 400 }}>{data.customer_email}</dd>
                                </div>
                            )}
                            <div style={styles.row}>
                                <dt style={styles.dt}>Địa điểm:</dt>
                                <dd style={{ ...styles.dd, fontWeight: 400 }}>{data.event_address}</dd>
                            </div>
                        </dl>
                    </div>

                    {/* Event Details */}
                    <div style={styles.card}>
                        <h2 style={styles.sectionTitle}>Chi tiết sự kiện</h2>
                        <dl style={styles.dl}>
                            <div style={styles.row}>
                                <dt style={styles.dt}>Loại tiệc:</dt>
                                <dd style={styles.dd}>
                                    {EVENT_TYPE_LABELS[data.event_type] || data.event_type}
                                </dd>
                            </div>
                            <div style={styles.row}>
                                <dt style={styles.dt}>Ngày tiệc:</dt>
                                <dd style={styles.dd}>
                                    {data.event_date ? formatDate(data.event_date) : '-'}
                                </dd>
                            </div>
                            <div style={styles.row}>
                                <dt style={styles.dt}>Giờ:</dt>
                                <dd style={styles.dd}>{data.event_time || '-'}</dd>
                            </div>
                            <div style={styles.row}>
                                <dt style={styles.dt}>Số bàn:</dt>
                                <dd style={{ ...styles.dd, color: COLOR_PALETTE.purple600 }}>{data.table_count} bàn</dd>
                            </div>
                        </dl>
                    </div>
                </div>

                {/* Menu Items Table */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h2 style={styles.sectionTitle}>Thực đơn ({data.menuItems.length} món)</h2>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ ...styles.th, width: '3rem' }}>STT</th>
                                <th style={styles.th}>Tên món</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.menuItems.map((item, idx) => (
                                <tr key={item.id}>
                                    <td style={{ ...styles.td, color: COLOR_PALETTE.gray500 }}>{idx + 1}</td>
                                    <td style={styles.td}>{item.name}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={styles.footerRow}>
                                <td colSpan={2} style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>
                                    Tổng thực đơn / bàn: {formatCurrency(data.menuTotalPerTable)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Services Table */}
                {(data.services.length > 0 || data.staffCount > 0) && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h2 style={styles.sectionTitle}>Dịch vụ đi kèm</h2>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Dịch vụ</th>
                                    <th style={{ ...styles.th, textAlign: 'center', width: '6rem' }}>Số lượng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.services.map((service) => (
                                    <tr key={service.id}>
                                        <td style={styles.td}>{service.name}</td>
                                        <td style={{ ...styles.td, textAlign: 'center' }}>
                                            {service.quantity} {service.unit}
                                        </td>
                                    </tr>
                                ))}
                                {data.staffCount > 0 && (
                                    <tr>
                                        <td style={styles.td}>Nhân viên phục vụ</td>
                                        <td style={{ ...styles.td, textAlign: 'center' }}>{data.staffCount} người</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr style={styles.footerRow}>
                                    <td colSpan={2} style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>
                                        Tổng dịch vụ: {formatCurrency(data.serviceTotal)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                {/* Pricing Summary */}
                <div style={styles.summaryBox}>
                    <div style={styles.summaryHeader}>
                        <h2 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                            Tổng hợp chi phí
                        </h2>
                    </div>
                    <div style={styles.summaryContent}>
                        <dl style={styles.dl}>
                            <div style={styles.summaryRow}>
                                <dt>Thực đơn ({data.table_count} bàn):</dt>
                                <dd style={{ fontWeight: 500 }}>{formatCurrency(data.menuTotalWithTables)}</dd>
                            </div>
                            {data.serviceTotal > 0 && (
                                <div style={styles.summaryRow}>
                                    <dt>Dịch vụ đi kèm:</dt>
                                    <dd style={{ fontWeight: 500 }}>{formatCurrency(data.serviceTotal)}</dd>
                                </div>
                            )}
                            {(data.furnitureDiscountAmount > 0 || data.staffDiscountAmount > 0 || data.orderDiscountAmount > 0) && (
                                <div style={{ ...styles.summaryRow, color: COLOR_PALETTE.green600 }}>
                                    <dt>Giảm giá:</dt>
                                    <dd style={{ fontWeight: 500 }}>
                                        -{formatCurrency(data.furnitureDiscountAmount + data.staffDiscountAmount + data.orderDiscountAmount)}
                                    </dd>
                                </div>
                            )}
                            <div style={{ ...styles.summaryRow, borderTop: `1px solid ${COLOR_PALETTE.gray200}`, paddingTop: '0.5rem' }}>
                                <dt>Tạm tính:</dt>
                                <dd style={{ fontWeight: 500 }}>{formatCurrency(data.subtotal)}</dd>
                            </div>
                            {data.includeVat && data.vatAmount > 0 && (
                                <div style={styles.summaryRow}>
                                    <dt>VAT (10%):</dt>
                                    <dd style={{ fontWeight: 500 }}>{formatCurrency(data.vatAmount)}</dd>
                                </div>
                            )}
                            {/* Grand Total */}
                            <div style={{ ...styles.summaryRow, borderTop: `2px solid ${COLOR_PALETTE.purple300}`, paddingTop: '0.75rem', fontSize: '1.125rem', fontWeight: 700, alignItems: 'center' }}>
                                <dt style={{ color: COLOR_PALETTE.purple700 }}>TỔNG CỘNG:</dt>
                                <dd style={{ color: COLOR_PALETTE.purple700 }}>{formatCurrency(data.grandTotal)}</dd>
                            </div>
                        </dl>
                    </div>
                </div>

                {/* Price Per Table Highlight Box */}
                <div style={styles.highlightBox}>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: COLOR_PALETTE.gray600 }}>Đơn giá mỗi bàn tiệc</p>
                    <p style={{ margin: 0, fontSize: '1.875rem', fontWeight: 700, color: COLOR_PALETTE.purple700 }}>{formatCurrency(pricePerTable)}/bàn</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: COLOR_PALETTE.gray500 }}>
                        (Tổng: {formatCurrency(data.grandTotal)} cho {data.table_count} bàn)
                    </p>
                </div>

                {/* Notes Section */}
                {data.notes && (
                    <div style={styles.noteBox}>
                        <h2 style={{ ...styles.sectionTitle, color: COLOR_PALETTE.yellow700, marginBottom: '0.5rem' }}>
                            Ghi chú
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: COLOR_PALETTE.gray700, whiteSpace: 'pre-wrap' }}>{data.notes}</p>
                    </div>
                )}

                {/* Footer - Staff Info */}
                <div style={styles.footer}>
                    <div style={styles.footerFlex}>
                        <div style={{ fontSize: '0.875rem', color: COLOR_PALETTE.gray500 }}>
                            <p style={{ margin: '0 0 0.25rem 0', fontWeight: 500, color: COLOR_PALETTE.gray700 }}>Nhân viên báo giá:</p>
                            {data.staff ? (
                                <>
                                    <p style={{ margin: 0 }}>{data.staff.full_name}</p>
                                    <p style={{ margin: 0 }}>{data.staff.email}</p>
                                </>
                            ) : (
                                <p style={{ margin: 0, fontStyle: 'italic' }}>-</p>
                            )}
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.875rem', color: COLOR_PALETTE.gray500 }}>
                            <p style={{ margin: 0 }}>Trân trọng cảm ơn Quý khách!</p>
                            <p style={{ margin: '0.25rem 0 0 0', fontWeight: 500, color: COLOR_PALETTE.purple600 }}>GIAO TUYẾT - Dịch vụ nấu tiệc tại nhà</p>
                        </div>
                    </div>
                </div>

                {/* Print-only styles - Kept for backup/native print support */}
                <style jsx global>{`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .quote-print-preview,
                        .quote-print-preview * {
                            visibility: visible;
                        }
                        .quote-print-preview {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 210mm !important;
                            padding: 15mm !important;
                            margin: 0 !important;
                            box-shadow: none !important;
                        }
                        @page {
                            size: A4;
                            margin: 10mm;
                        }
                    }
                `}</style>
            </div>
        );
    }
);

QuotePrintPreview.displayName = 'QuotePrintPreview';

export default QuotePrintPreview;
