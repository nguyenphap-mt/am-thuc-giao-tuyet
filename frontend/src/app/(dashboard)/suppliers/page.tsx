'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect: /suppliers → /procurement?tab=suppliers
 * 
 * Supplier management has been integrated into the Procurement module.
 * This page exists only for backward compatibility — any bookmarks or
 * links pointing to /suppliers will be automatically redirected.
 */
export default function SuppliersRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/procurement?tab=suppliers');
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto" />
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Đang chuyển hướng đến Mua hàng → Nhà cung cấp...</p>
            </div>
        </div>
    );
}
