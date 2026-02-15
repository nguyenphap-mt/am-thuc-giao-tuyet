'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ColumnConfig {
    id: string;
    minWidth: number;
    defaultWidth: number;
    maxWidth?: number;
}

interface ResizeState {
    columnId: string | null;
    startX: number;
    startWidth: number;
}

export function useResizableColumns(
    storageKey: string,
    columns: ColumnConfig[]
) {
    // Initialize widths from localStorage or defaults
    const [widths, setWidths] = useState<Record<string, number>>(() => {
        if (typeof window === 'undefined') {
            // SSR - return defaults
            return columns.reduce((acc, col) => {
                acc[col.id] = col.defaultWidth;
                return acc;
            }, {} as Record<string, number>);
        }

        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge saved with defaults (in case new columns added)
                return columns.reduce((acc, col) => {
                    acc[col.id] = parsed[col.id] ?? col.defaultWidth;
                    return acc;
                }, {} as Record<string, number>);
            }
        } catch (e) {
            console.warn('Failed to load column widths from localStorage:', e);
        }

        return columns.reduce((acc, col) => {
            acc[col.id] = col.defaultWidth;
            return acc;
        }, {} as Record<string, number>);
    });

    const resizeState = useRef<ResizeState>({
        columnId: null,
        startX: 0,
        startWidth: 0,
    });

    const columnsRef = useRef(columns);
    columnsRef.current = columns;

    // Save to localStorage whenever widths change
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(storageKey, JSON.stringify(widths));
            } catch (e) {
                console.warn('Failed to save column widths to localStorage:', e);
            }
        }
    }, [widths, storageKey]);

    // Start resize operation
    const startResize = useCallback((columnId: string, startX: number) => {
        resizeState.current = {
            columnId,
            startX,
            startWidth: widths[columnId] || 100,
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!resizeState.current.columnId) return;

            const delta = e.clientX - resizeState.current.startX;
            const newWidth = resizeState.current.startWidth + delta;

            // Find column config for min/max constraints
            const colConfig = columnsRef.current.find(c => c.id === resizeState.current.columnId);
            if (!colConfig) return;

            const clampedWidth = Math.max(
                colConfig.minWidth,
                Math.min(newWidth, colConfig.maxWidth || 600)
            );

            setWidths(prev => ({
                ...prev,
                [resizeState.current.columnId!]: clampedWidth,
            }));
        };

        const handleMouseUp = () => {
            resizeState.current.columnId = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [widths]);

    // Reset to defaults
    const resetToDefaults = useCallback(() => {
        const defaults = columns.reduce((acc, col) => {
            acc[col.id] = col.defaultWidth;
            return acc;
        }, {} as Record<string, number>);
        setWidths(defaults);
    }, [columns]);

    // Get width for a specific column
    const getWidth = useCallback((columnId: string): number => {
        return widths[columnId] || 100;
    }, [widths]);

    return {
        widths,
        getWidth,
        startResize,
        resetToDefaults,
    };
}
