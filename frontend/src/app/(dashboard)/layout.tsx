'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/stores/auth-store';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

// H1: Lazy-load heavy modals — only loaded when user clicks FAB
const QuickActionFAB = dynamic(() => import('@/components/quick-action').then(m => ({ default: m.QuickActionFAB })), { ssr: false });
const QuickPaymentModal = dynamic(() => import('@/components/quick-action').then(m => ({ default: m.QuickPaymentModal })), { ssr: false });
const QuickExpenseModal = dynamic(() => import('@/components/quick-action').then(m => ({ default: m.QuickExpenseModal })), { ssr: false });

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, checkAuth, isHydrated } = useAuthStore();

    // Mobile sidebar state
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Quick Action Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        // Only redirect if hydration is complete and user is not authenticated
        if (isHydrated && !isAuthenticated && pathname !== '/login') {
            router.push('/login');
        }
    }, [isHydrated, isAuthenticated, pathname, router]);

    if (!isHydrated || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-gray-500 dark:text-gray-400">Đang tải...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 dark:bg-gray-950">
            <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
            <div className="lg:pl-64">
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <main className="p-6" role="main">
                    {children}
                </main>
                {/* M2: Global aria-live region for screen reader announcements */}
                <div aria-live="polite" aria-atomic="true" className="sr-only" id="app-announcer" />
            </div>

            {/* Quick Action FAB - Visible on all dashboard pages */}
            <QuickActionFAB
                onQuickPayment={() => setShowPaymentModal(true)}
                onQuickExpense={() => setShowExpenseModal(true)}
            />

            {/* Quick Payment Modal */}
            <QuickPaymentModal
                open={showPaymentModal}
                onOpenChange={setShowPaymentModal}
            />

            {/* Quick Expense Modal */}
            <QuickExpenseModal
                open={showExpenseModal}
                onOpenChange={setShowExpenseModal}
            />
        </div>
    );
}

