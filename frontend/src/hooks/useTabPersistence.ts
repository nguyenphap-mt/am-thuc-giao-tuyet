'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Custom hook to persist tab state via URL query parameter `?tab=...`.
 * On F5 reload, the active tab is restored from the URL.
 * When the default tab is selected, the `?tab=` param is removed for a clean URL.
 *
 * @param validTabs - Array of valid tab values
 * @param defaultTab - The default tab (shown when no ?tab= param)
 * @returns { activeTab, handleTabChange }
 */
export function useTabPersistence<T extends string>(
    validTabs: readonly T[],
    defaultTab: T,
): {
    activeTab: T;
    handleTabChange: (value: string) => void;
} {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // Read tab from URL, validate, fallback to default
    const tabParam = searchParams.get('tab') as T | null;
    const activeTab = tabParam && validTabs.includes(tabParam) ? tabParam : defaultTab;

    const handleTabChange = useCallback((value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === defaultTab) {
            params.delete('tab');
        } else {
            params.set('tab', value);
        }
        const qs = params.toString();
        router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    }, [searchParams, router, pathname, defaultTab]);

    return { activeTab, handleTabChange };
}
