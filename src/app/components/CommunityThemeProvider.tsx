'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';

interface CommunityTheme {
    name: string;
    logo_url: string | null;
    primary_color: string;
    accent_color: string;
}

/**
 * Fetches and applies community branding (colors, logo) based on the current user's community.
 * This component should be placed at the app layout level to apply theming globally.
 */
export default function CommunityThemeProvider({ children }: { children: React.ReactNode }) {
    const currentUser = useStore((state) => state.currentUser);
    const [theme, setTheme] = useState<CommunityTheme | null>(null);

    useEffect(() => {
        if (!currentUser?.communityId) {
            // Reset to default theme
            applyDefaultTheme();
            return;
        }

        // Skip fetching for default Weeve community (use default colors)
        const defaultCommunityId = '00000000-0000-0000-0000-000000000001';
        if (currentUser.communityId === defaultCommunityId) {
            applyDefaultTheme();
            return;
        }

        fetchCommunityTheme(currentUser.communityId);
    }, [currentUser?.communityId]);

    const applyDefaultTheme = () => {
        document.documentElement.style.setProperty('--primary', '#EC1D99');
        document.documentElement.style.setProperty('--accent', '#06B6D4');
        setTheme(null);
    };

    const fetchCommunityTheme = async (communityId: string) => {
        try {
            const { data, error } = await supabase
                .from('communities')
                .select('name, logo_url, primary_color, accent_color')
                .eq('id', communityId)
                .single();

            if (error || !data) {
                console.warn('[CommunityThemeProvider] Failed to fetch theme:', error);
                applyDefaultTheme();
                return;
            }

            // Apply CSS variables
            document.documentElement.style.setProperty('--primary', data.primary_color || '#EC1D99');
            document.documentElement.style.setProperty('--accent', data.accent_color || '#06B6D4');

            setTheme(data);
        } catch (err) {
            console.error('[CommunityThemeProvider] Error:', err);
            applyDefaultTheme();
        }
    };

    return <>{children}</>;
}

/**
 * Hook to access the current community theme
 */
export function useCommunityTheme() {
    const currentUser = useStore((state) => state.currentUser);
    const [theme, setTheme] = useState<CommunityTheme | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentUser?.communityId) {
            setIsLoading(false);
            return;
        }

        const defaultCommunityId = '00000000-0000-0000-0000-000000000001';
        if (currentUser.communityId === defaultCommunityId) {
            setIsLoading(false);
            return;
        }

        supabase
            .from('communities')
            .select('name, logo_url, primary_color, accent_color')
            .eq('id', currentUser.communityId)
            .single()
            .then(({ data }: { data: CommunityTheme | null }) => {
                if (data) setTheme(data);
                setIsLoading(false);
            });
    }, [currentUser?.communityId]);

    return { theme, isLoading };
}
