/**
 * Per-user preferences hook — replaces per-tenant settings for appearance.
 * API: GET/PUT /users/me/preferences
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface UserPreference {
    key: string;
    value: string;
}

const prefKeys = {
    all: ['users', 'me', 'preferences'] as const,
};

export function useMyPreferences() {
    return useQuery({
        queryKey: prefKeys.all,
        queryFn: () => api.get<UserPreference[]>('/users/me/preferences'),
    });
}

export function useUpdateMyPreferences() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (preferences: Record<string, string>) =>
            api.put('/users/me/preferences', { preferences }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: prefKeys.all });
        },
    });
}
