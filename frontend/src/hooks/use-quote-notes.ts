'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Interface for Quote Note Preset
 * @description Represents a predefined note that can be selected when creating quotes
 */
export interface QuoteNotePreset {
    id: string;
    content: string;
    created_at: string;
}

/**
 * Hook to fetch all quote note presets
 * @returns Query result with list of note presets from database
 */
export const useQuoteNotePresets = () => {
    return useQuery<QuoteNotePreset[]>({
        queryKey: ['quote-note-presets'],
        queryFn: async () => {
            return api.get<QuoteNotePreset[]>('/quotes/notes/presets');
        },
        staleTime: 1000 * 60 * 5, // 5 minutes - notes don't change often
    });
};

/**
 * Hook to create a new quote note preset
 * @returns Mutation function to create a new preset
 */
export const useCreateNotePreset = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (content: string) => {
            return api.post<QuoteNotePreset>('/quotes/notes/presets', { content });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quote-note-presets'] });
        },
    });
};

/**
 * Hook to delete a quote note preset (super_admin only)
 * @returns Mutation function to delete a preset by ID
 */
export const useDeleteNotePreset = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (noteId: string) => {
            await api.delete(`/quotes/notes/presets/${noteId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quote-note-presets'] });
        },
    });
};
