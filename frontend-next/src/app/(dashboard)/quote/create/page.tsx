'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateQuote } from '@/hooks/use-quotes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IconArrowLeft, IconLoader2 } from '@tabler/icons-react';

export default function QuoteCreatePage() {
    const router = useRouter();
    const createMutation = useCreateQuote();

    const [formData, setFormData] = useState({
        customer_name: '',
        customer_phone: '',
        event_date: '',
        event_location: '',
        guest_count: 0,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData as any, {
            onSuccess: () => router.push('/quote'),
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <IconArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tạo báo giá mới</h1>
                    <p className="text-gray-500">Điền thông tin để tạo báo giá</p>
                </div>
            </div>

            {/* Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Thông tin khách hàng</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="customer_name">Tên khách hàng *</Label>
                                <Input
                                    id="customer_name"
                                    value={formData.customer_name}
                                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="customer_phone">Số điện thoại *</Label>
                                <Input
                                    id="customer_phone"
                                    value={formData.customer_phone}
                                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="event_date">Ngày sự kiện *</Label>
                                <Input
                                    id="event_date"
                                    type="date"
                                    value={formData.event_date}
                                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="guest_count">Số lượng khách *</Label>
                                <Input
                                    id="guest_count"
                                    type="number"
                                    min="1"
                                    value={formData.guest_count}
                                    onChange={(e) => setFormData({ ...formData, guest_count: parseInt(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="event_location">Địa điểm tổ chức *</Label>
                                <Input
                                    id="event_location"
                                    value={formData.event_location}
                                    onChange={(e) => setFormData({ ...formData, event_location: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-4">
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                Hủy
                            </Button>
                            <Button
                                type="submit"
                                className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? (
                                    <>
                                        <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Đang tạo...
                                    </>
                                ) : (
                                    'Tạo báo giá'
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
