"use client";

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { setLatestSession } from '@/lib/auth-session';
import { useStore } from '@/lib/store';
import { getUserProfile, profileExists } from '@/lib/auth';
import { toast } from 'sonner';

interface AuthContextType {
    user: SupabaseUser | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
});

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/setup', '/brands', '/communities', '/influencers'];

const isPublicRoute = (path: string) => PUBLIC_ROUTES.includes(path);

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const { setCurrentUser } = useStore();
    const router = useRouter();

    const handleUserLogin = useCallback(async (supabaseUser: SupabaseUser) => {
        try {
            // Check if we already have this user loaded with full profile data
            const state = useStore.getState();
            if (state.currentUser && state.currentUser.id === supabaseUser.id && state.currentUser.avatar && !state.currentUser.avatar.includes('dicebear')) {
                console.log('[AuthProvider] User already loaded with profile data, skipping default set');
                setLoading(false);
            } else {
                // Only set default user if we don't have valid data yet
                const defaultUser = {
                    id: supabaseUser.id,
                    name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${supabaseUser.id}`,
                    tokens: 100,
                };
                setCurrentUser(defaultUser);
                console.log('[AuthProvider] Set default user:', defaultUser);
            }

            setLoading(false);

            // Always try to fetch latest profile data to ensure sync
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
                } else {
                    console.error('[AuthProvider] Failed to load profile data despite profileExists=true');
                    // Don't show error toast here to avoid spamming user if it's a background refresh
                }

                // Redirect to homepage if on auth pages
                const currentPath = window.location.pathname;
                if (isPublicRoute(currentPath)) {
                    console.log('[AuthProvider] Redirecting to feed from:', currentPath);
                    router.push('/feed');
                }
            } else {
                // New user - redirect to setup if not already there
                const currentPath = window.location.pathname;
                if (currentPath !== '/setup') {
                    console.log('[AuthProvider] Redirecting new user to setup from:', currentPath);
                    router.push('/setup');
                }
            }
        } catch (error) {
            console.error('[AuthProvider] Error in auth flow:', error);
            // Don't show toast for background auth errors
        } finally {
            setLoading(false);
        }
    }, [router, setCurrentUser]);

    useEffect(() => {
        let isMounted = true;

        const initializeSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (!isMounted) return;

                if (error) throw error;

                setUser(session?.user ?? null);
                setLatestSession(session ?? null);
                console.log('[AuthProvider] Session initialized:', session?.user?.id ? 'User found' : 'No user');

                if (session?.user) {
                    await handleUserLogin(session.user);
                } else {
                    setLoading(false);
                    // Redirect to login if on a protected route
                    const currentPath = window.location.pathname;
                    if (!isPublicRoute(currentPath)) {
                        console.log('[AuthProvider] No session, redirecting to login from:', currentPath);
                        router.push('/login');
                    }
                }
            } catch (error) {
                console.error('[AuthProvider] Failed to initialize session:', error);
                if (!isMounted) return;

                // Only clear user if we are sure it's an auth error, not a network error
                // But for now, to be safe and avoid "mock content" flashes, we might want to keep the persisted user
                // and just let the background refresh handle it.
                // However, if the token is truly invalid, we should log out.

                // For now, let's NOT clear the user immediately on error, just stop loading.
                // The onAuthStateChange will eventually catch an invalid session.
                setLoading(false);
            }
        };

        initializeSession();

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;

            console.log('[AuthProvider] Auth event:', event, 'User:', session?.user?.id || 'null');
            setUser(session?.user ?? null);
            setLatestSession(session ?? null);

            if (event === 'SIGNED_OUT') {
                console.log('[AuthProvider] User explicitly signed out');
                setCurrentUser(null);
                setLoading(false);
                setLatestSession(null);
                router.push('/login');
                return;
            }

            if (session?.user) {
                await handleUserLogin(session.user);
            } else {
                // User logged out
                console.log('[AuthProvider] User logged out, clearing state');
                setCurrentUser(null);
                setLoading(false);

                // Redirect to login if on a protected route
                const currentPath = window.location.pathname;
                if (!isPublicRoute(currentPath)) {
                    console.log('[AuthProvider] Redirecting to login from:', currentPath);
                    router.push('/login');
                }
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [handleUserLogin, router, setCurrentUser]);

    // Show loading spinner while checking auth
    if (loading) {
        return (
            <AuthContext.Provider value={{ user, loading }}>
                <div className="min-h-screen bg-black flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-[#EC1D99] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-400 text-sm">Loading...</p>
                    </div>
                </div>
            </AuthContext.Provider>
        );
    }

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
}
