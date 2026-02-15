'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconPlus, IconCash, IconReceipt, IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface FABAction {
    id: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    color?: string;
}

interface FloatingActionButtonProps {
    actions: FABAction[];
    className?: string;
}

export function FloatingActionButton({ actions, className }: FloatingActionButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on Escape key
    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    return (
        <div
            ref={containerRef}
            className={cn(
                "fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3",
                className
            )}
        >
            {/* Action Items */}
            <AnimatePresence>
                {isOpen && actions.map((action, index) => (
                    <motion.div
                        key={action.id}
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            transition: { delay: index * 0.05, duration: 0.2 }
                        }}
                        exit={{
                            opacity: 0,
                            y: 10,
                            scale: 0.8,
                            transition: { duration: 0.15 }
                        }}
                        className="flex items-center gap-2"
                    >
                        {/* Label */}
                        <span className="px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg shadow-lg whitespace-nowrap">
                            {action.label}
                        </span>

                        {/* Action Button */}
                        <button
                            onClick={() => {
                                action.onClick();
                                setIsOpen(false);
                            }}
                            className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center shadow-lg",
                                "transition-all duration-200 hover:scale-105 active:scale-95",
                                "focus:outline-none focus:ring-2 focus:ring-offset-2",
                                "cursor-pointer",
                                action.color || "bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:from-pink-700 hover:to-purple-700 focus:ring-purple-500"
                            )}
                            aria-label={action.label}
                        >
                            {action.icon}
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Main FAB Button */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center shadow-xl",
                    "bg-gradient-to-r from-pink-600 to-purple-600 text-white",
                    "hover:from-pink-700 hover:to-purple-700",
                    "transition-all duration-200 hover:shadow-2xl",
                    "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2",
                    "cursor-pointer"
                )}
                aria-label={isOpen ? "Đóng menu" : "Mở menu hành động nhanh"}
                aria-expanded={isOpen}
                whileTap={{ scale: 0.95 }}
            >
                <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {isOpen ? (
                        <IconX className="w-6 h-6" />
                    ) : (
                        <IconPlus className="w-6 h-6" />
                    )}
                </motion.div>
            </motion.button>
        </div>
    );
}

// Pre-configured FAB for Order/Finance actions
export function QuickActionFAB({
    onQuickPayment,
    onQuickExpense,
}: {
    onQuickPayment: () => void;
    onQuickExpense: () => void;
}) {
    const actions: FABAction[] = [
        {
            id: 'quick-payment',
            label: 'Ghi nhận thanh toán',
            icon: <IconCash className="w-5 h-5" />,
            onClick: onQuickPayment,
            color: 'bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500',
        },
        {
            id: 'quick-expense',
            label: 'Ghi nhận chi tiêu',
            icon: <IconReceipt className="w-5 h-5" />,
            onClick: onQuickExpense,
            color: 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500',
        },
    ];

    return <FloatingActionButton actions={actions} />;
}
