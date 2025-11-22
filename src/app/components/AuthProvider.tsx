"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { getUserProfile, profileExists } from '@/lib/auth';

interface AuthContextType {
    user: SupabaseUser | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const { setCurrentUser } = useStore();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                handleUserLogin(session.user);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[AuthProvider] Auth event:', event, 'User:', session?.user?.id || 'null');
            setUser(session?.user ?? null);

            if (session?.user) {
                await handleUserLogin(session.user);
            } else {
                // User logged out
                setCurrentUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleUserLogin = async (supabaseUser: SupabaseUser) => {
        try {
            // Always set a default user first to prevent blank pages
            const defaultUser = {
                id: supabaseUser.id,
                name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${supabaseUser.id}`,
                tokens: 100,
            };

            // Set the default user immediately
            setCurrentUser(defaultUser);
            console.log('[AuthProvider] Set default user:', defaultUser);

            // Then try to get profile from database
            const hasProfile = await profileExists(supabaseUser.id);
            console.log('[AuthProvider] Profile exists:', hasProfile);

            if (hasProfile) {
                // Get profile data from Supabase and update
                const profile = await getUserProfile(supabaseUser.id);
                console.log('[AuthProvider] Profile data:', profile);

                if (profile) {
                    // Update with database data
                    const appUser = {
                        id: supabaseUser.id,
                        name: profile.name,
                        avatar: profile.avatar,
                        tokens: profile.tokens,
                        inviteCode: profile.inviteCode,
                    };
                    setCurrentUser(appUser);
                    console.log('[AuthProvider] Updated user with database data:', appUser);
                }

                // Redirect to homepage if on auth pages
                if (pathname === '/login' || pathname === '/signup' || pathname === '/setup') {
                    console.log('[AuthProvider] Redirecting to homepage from:', pathname);
                    setTimeout(() => router.push('/'), 100);
                }
            } else {
                // New user - redirect to setup if not already there
                if (pathname !== '/setup') {
                    console.log('[AuthProvider] Redirecting new user to setup from:', pathname);
                    setTimeout(() => router.push('/setup'), 100);
                }
            }
        } catch (error) {
            console.error('[AuthProvider] Error in auth flow:', error);
            // Even if there's an error, keep the default user we set earlier
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
}
