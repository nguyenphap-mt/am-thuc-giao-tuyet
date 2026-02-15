'use client';

import { useCallback } from 'react';

/**
 * M2: Hook to announce messages to screen readers via the global aria-live region.
 * Usage: const announce = useAnnounce(); announce('3 items loaded');
 */
export function useAnnounce() {
    return useCallback((message: string) => {
        const el = document.getElementById('app-announcer');
        if (el) {
            el.textContent = '';
            // Reset to trigger re-announcement
            requestAnimationFrame(() => {
                el.textContent = message;
            });
        }
    }, []);
}
