'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
    IconNotes,
    IconPlus,
    IconUserCircle,
    IconX,
    IconSend
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';

interface OrderNote {
    id: string;
    order_id: string;
    content: string;
    created_by: string;
    created_at: string;
}

interface OrderNotesProps {
    orderId: string;
    orderCode: string;
    canAddNote?: boolean;
}

export function OrderNotesSection({ orderId, orderCode, canAddNote = true }: OrderNotesProps) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newNote, setNewNote] = useState('');
    const queryClient = useQueryClient();
    const prefersReducedMotion = useReducedMotion();

    // Fetch notes - using mock data for now since API doesn't exist yet
    const { data: notes = [], isLoading } = useQuery({
        queryKey: ['order-notes', orderId],
        queryFn: async () => {
            try {
                return await api.get<OrderNote[]>(`/orders/${orderId}/notes`);
            } catch {
                // API doesn't exist yet, return empty array
                return [];
            }
        },
        enabled: !!orderId,
        retry: false
    });

    // Add note mutation
    const addNoteMutation = useMutation({
        mutationFn: async (content: string) => {
            return await api.post(`/orders/${orderId}/notes`, { content });
        },
        onSuccess: () => {
            toast.success('Đã thêm ghi chú');
            setNewNote('');
            setShowAddForm(false);
            queryClient.invalidateQueries({ queryKey: ['order-notes', orderId] });
        },
        onError: () => {
            toast.error('Không thể thêm ghi chú. Tính năng đang phát triển.');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;
        addNoteMutation.mutate(newNote.trim());
    };

    return (
        <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0.1 } : { delay: 0.45 }}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white shadow-sm overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-amber-50 to-yellow-50">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-white shadow-sm">
                        <IconNotes className="w-5 h-5 text-amber-600" aria-hidden="true" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">GHI CHÚ NỘI BỘ</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{notes.length} ghi chú</p>
                    </div>
                </div>

                {canAddNote && !showAddForm && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddForm(true)}
                        className="border-amber-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300"
                    >
                        <IconPlus className="w-4 h-4 mr-1" aria-hidden="true" />
                        Thêm ghi chú
                    </Button>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Add Note Form */}
                {showAddForm && (
                    <form onSubmit={handleSubmit} className="mb-4 p-3 bg-amber-50 rounded-lg">
                        <label htmlFor="order-note-input" className="sr-only">Ghi chú nội bộ</label>
                        <textarea
                            id="order-note-input"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Nhập ghi chú nội bộ…"
                            className="w-full p-2 border border-amber-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                            rows={3}
                            autoFocus // Intentional: user clicked "Thêm ghi chú" to open form
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setShowAddForm(false);
                                    setNewNote('');
                                }}
                            >
                                <IconX className="w-4 h-4 mr-1" aria-hidden="true" />
                                Hủy
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={!newNote.trim() || addNoteMutation.isPending}
                                className="bg-amber-500 hover:bg-amber-600 text-white"
                            >
                                <IconSend className="w-4 h-4 mr-1" aria-hidden="true" />
                                {addNoteMutation.isPending ? 'Đang lưu…' : 'Lưu'}
                            </Button>
                        </div>
                    </form>
                )}

                {/* Notes List */}
                {notes.length === 0 ? (
                    <div className="text-center py-6">
                        <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                            <IconNotes className="w-6 h-6 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Chưa có ghi chú nào</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Thêm ghi chú để ghi nhớ thông tin quan trọng
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notes.map((note) => (
                            <div
                                key={note.id}
                                className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        <IconUserCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                        {note.created_by}
                                    </span>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        {formatDistanceToNow(new Date(note.created_at), {
                                            addSuffix: true,
                                            locale: vi
                                        })}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{note.content}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default OrderNotesSection;
