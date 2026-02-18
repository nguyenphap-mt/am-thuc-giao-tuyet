import { create } from 'zustand';
import { supabase, LOGO_BUCKET, LOGO_PATH, getStoragePublicUrl } from '@/lib/supabase';

interface LogoState {
    logoUrl: string | null;
    isLoading: boolean;
    fetchLogo: () => Promise<void>;
    uploadLogo: (file: File) => Promise<boolean>;
    deleteLogo: () => Promise<boolean>;
}

export const useLogoStore = create<LogoState>()((set) => ({
    logoUrl: null,
    isLoading: false,

    fetchLogo: async () => {
        set({ isLoading: true });
        try {
            // Check if the logo file exists by listing files
            const { data, error } = await supabase.storage
                .from(LOGO_BUCKET)
                .list('', { search: LOGO_PATH });

            if (error || !data || data.length === 0) {
                set({ logoUrl: null, isLoading: false });
                return;
            }

            // File exists — get public URL with cache-busting timestamp
            const publicUrl = getStoragePublicUrl(LOGO_BUCKET, LOGO_PATH);
            set({ logoUrl: `${publicUrl}?t=${Date.now()}`, isLoading: false });
        } catch {
            set({ logoUrl: null, isLoading: false });
        }
    },

    uploadLogo: async (file: File) => {
        set({ isLoading: true });
        try {
            const { error } = await supabase.storage
                .from(LOGO_BUCKET)
                .upload(LOGO_PATH, file, {
                    cacheControl: '3600',
                    upsert: true, // Overwrite existing file
                });

            if (error) {
                console.error('Upload error:', error);
                set({ isLoading: false });
                return false;
            }

            // Get public URL with cache-busting
            const publicUrl = getStoragePublicUrl(LOGO_BUCKET, LOGO_PATH);
            set({ logoUrl: `${publicUrl}?t=${Date.now()}`, isLoading: false });
            return true;
        } catch {
            set({ isLoading: false });
            return false;
        }
    },

    deleteLogo: async () => {
        set({ isLoading: true });
        try {
            const { error } = await supabase.storage
                .from(LOGO_BUCKET)
                .remove([LOGO_PATH]);

            if (error) {
                console.error('Delete error:', error);
                set({ isLoading: false });
                return false;
            }

            set({ logoUrl: null, isLoading: false });
            return true;
        } catch {
            set({ isLoading: false });
            return false;
        }
    },
}));
