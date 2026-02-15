'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    IconUser, IconPhone, IconMail, IconCalendar, IconMapPin,
    IconUsers, IconCategory, IconNotes, IconClock, IconTable,
} from '@tabler/icons-react';
import { WizardState, EVENT_TYPES } from './quote-wizard-types';

interface Props {
    state: WizardState;
}

export function StepCustomerInfo({ state }: Props) {
    const { formData, handleChange, handleBlur, inputClasses, errors, touched, today } = state;

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Thông tin liên hệ
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer Name */}
                    <div className="space-y-2">
                        <Label htmlFor="customer_name">Tên khách hàng <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <IconUser className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <Input id="customer_name" autoComplete="name" placeholder="Nguyễn Văn A"
                                value={formData.customer_name}
                                onChange={(e) => handleChange('customer_name', e.target.value)}
                                onBlur={() => handleBlur('customer_name')}
                                className={inputClasses('customer_name')} />
                        </div>
                        {errors.customer_name && touched.customer_name && (
                            <p className="text-sm text-red-500">{errors.customer_name}</p>
                        )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                        <Label htmlFor="customer_phone">Số điện thoại <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <IconPhone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <Input id="customer_phone" autoComplete="tel" inputMode="numeric" placeholder="0901234567"
                                value={formData.customer_phone}
                                onChange={(e) => handleChange('customer_phone', e.target.value)}
                                onBlur={() => handleBlur('customer_phone')}
                                className={inputClasses('customer_phone')} />
                        </div>
                        {errors.customer_phone && touched.customer_phone && (
                            <p className="text-sm text-red-500">{errors.customer_phone}</p>
                        )}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <Label htmlFor="customer_email">Email <span className="text-gray-400 dark:text-gray-500">(không bắt buộc)</span></Label>
                        <div className="relative">
                            <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <Input id="customer_email" type="email" autoComplete="email" placeholder="email@example.com"
                                value={formData.customer_email}
                                onChange={(e) => handleChange('customer_email', e.target.value)}
                                onBlur={() => handleBlur('customer_email')}
                                className={inputClasses('customer_email')} />
                        </div>
                        {errors.customer_email && touched.customer_email && (
                            <p className="text-sm text-red-500">{errors.customer_email}</p>
                        )}
                    </div>

                    {/* Event Type */}
                    <div className="space-y-2">
                        <Label htmlFor="event_type">Loại tiệc <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <IconCategory className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 z-10" />
                            <Select value={formData.event_type} onValueChange={(val) => handleChange('event_type', val)}>
                                <SelectTrigger className="pl-10">
                                    <SelectValue placeholder="Chọn loại tiệc" />
                                </SelectTrigger>
                                <SelectContent>
                                    {EVENT_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {errors.event_type && touched.event_type && (
                            <p className="text-sm text-red-500">{errors.event_type}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Chi tiết sự kiện
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Event Date */}
                    <div className="space-y-2">
                        <Label htmlFor="event_date">Ngày sự kiện <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <IconCalendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <Input id="event_date" type="date" min={today}
                                value={formData.event_date}
                                onChange={(e) => handleChange('event_date', e.target.value)}
                                onBlur={() => handleBlur('event_date')}
                                className={inputClasses('event_date')} />
                        </div>
                        {errors.event_date && touched.event_date && (
                            <p className="text-sm text-red-500">{errors.event_date}</p>
                        )}
                    </div>

                    {/* Event Time */}
                    <div className="space-y-2">
                        <Label htmlFor="event_time">Giờ sự kiện <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <IconClock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <Input id="event_time" type="time"
                                value={formData.event_time}
                                onChange={(e) => handleChange('event_time', e.target.value)}
                                onBlur={() => handleBlur('event_time')}
                                className={inputClasses('event_time')} />
                        </div>
                        {errors.event_time && touched.event_time && (
                            <p className="text-sm text-red-500">{errors.event_time}</p>
                        )}
                    </div>

                    {/* Table Count */}
                    <div className="space-y-2">
                        <Label htmlFor="table_count">Số bàn <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <IconTable className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <Input id="table_count" type="number" inputMode="numeric" min="1" max="200" placeholder="10"
                                value={formData.table_count}
                                onChange={(e) => handleChange('table_count', e.target.value)}
                                onBlur={() => handleBlur('table_count')}
                                className={inputClasses('table_count')} />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Báo giá tính theo số bàn</p>
                        {errors.table_count && touched.table_count && (
                            <p className="text-sm text-red-500">{errors.table_count}</p>
                        )}
                    </div>

                    {/* Guest Count */}
                    <div className="space-y-2">
                        <Label htmlFor="guest_count">
                            Số lượng khách <span className="text-gray-400 dark:text-gray-500">(không bắt buộc)</span>
                        </Label>
                        <div className="relative">
                            <IconUsers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <Input id="guest_count" type="number" inputMode="numeric" min="10" max="2000" placeholder="50"
                                value={formData.guest_count}
                                onChange={(e) => handleChange('guest_count', e.target.value)}
                                onBlur={() => handleBlur('guest_count')}
                                className={inputClasses('guest_count')} />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Ước tính từ 10 đến 2000 khách</p>
                        {errors.guest_count && touched.guest_count && (
                            <p className="text-sm text-red-500">{errors.guest_count}</p>
                        )}
                    </div>

                    {/* Event Location */}
                    <div className="space-y-2">
                        <Label htmlFor="event_address">Địa điểm tổ chức <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <IconMapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <Input id="event_address" autoComplete="street-address" placeholder="Nhập địa chỉ tổ chức tiệc"
                                value={formData.event_address}
                                onChange={(e) => handleChange('event_address', e.target.value)}
                                onBlur={() => handleBlur('event_address')}
                                className={inputClasses('event_address')} />
                        </div>
                        {errors.event_address && touched.event_address && (
                            <p className="text-sm text-red-500">{errors.event_address}</p>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="notes">
                            Ghi chú / Yêu cầu đặc biệt{' '}
                            <span className="text-gray-400 dark:text-gray-500">(không bắt buộc)</span>
                        </Label>
                        <div className="relative">
                            <IconNotes className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <Textarea id="notes"
                                placeholder="Nhập ghi chú hoặc yêu cầu đặc biệt về thực đơn, dị ứng thực phẩm, v.v..."
                                value={formData.notes}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                className="pl-10 min-h-[100px] resize-none"
                                rows={3} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
