"use client";

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { setLatestSession } from '@/lib/auth-session';
import { useStore } from '@/lib/store';
import { getUserProfile, profileExists, NATIVE_GOOGLE_REDIRECT_URI } from '@/lib/auth';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { toast } from 'sonner';

interface AuthContextType {
    user: SupabaseUser | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
});

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/setup', '/brands', '/communities', '/influencers', '/auth/callback'];

const isPublicRoute = (path: string) => PUBLIC_ROUTES.includes(path);

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const { setCurrentUser } = useStore();
    const router = useRouter();

    const handleUserLogin = useCallback(async (supabaseUser: SupabaseUser) => {
        // Force UI update to "wake up" the app
        setLoading(true);

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

            setLoading(false);

            // Always try to fetch latest profile data to ensure sync
            // Race profile check against a timeout to prevent hanging
            let hasProfile = false;
            try {
                const profileCheckPromise = profileExists(supabaseUser.id);
                const timeoutPromise = new Promise<boolean>((resolve) => {
                    setTimeout(() => {
                        console.warn('[AuthProvider] Profile check timed out, defaulting to true to unblock UI');
                        resolve(true); // Default to true (feed) on timeout to unblock user
                    }, 2000);
                });

                hasProfile = await Promise.race([profileCheckPromise, timeoutPromise]);
            } catch (err) {
                console.error('[AuthProvider] Profile check failed:', err);
                hasProfile = true; // Default to true on error
            }

            if (hasProfile) {
                // Get profile data from Supabase and check onboarding status
                const profile = await getUserProfile(supabaseUser.id);
                
                if (profile) {
                    // Update with database data
                    const appUser = {
                        id: supabaseUser.id,
                        name: profile.name,
                        avatar: profile.avatar,
                        tagline: profile.tagline,
                        tokens: profile.tokens,
                        inviteCode: profile.inviteCode,
                    };
                    const storeState = useStore.getState();
                    if (!storeState.profileUpdateInProgress) {
                        setCurrentUser(appUser);
                    }

                    // Check if user needs to complete onboarding
                    const currentPath = window.location.pathname;
                    const needsOnboarding = !profile.completedOnboarding && profile.onboardingStep !== null;
                    
                    if (needsOnboarding && !currentPath.startsWith('/onboarding') && !currentPath.startsWith('/feed') && !currentPath.startsWith('/story')) {
                        // User has profile but hasn't completed onboarding
                        // Allow them to access onboarding routes, feed, and stories during tutorial
                        console.log('[AuthProvider] User needs onboarding, redirecting to /onboarding/prompt');
                        window.location.replace('/onboarding/prompt');
                    } else if (!needsOnboarding && isPublicRoute(currentPath)) {
                        // User completed onboarding, redirect to feed if on auth pages
                        window.location.replace('/feed');
                    }
                }
            } else {
                // New user - redirect to setup if not already there
                const currentPath = window.location.pathname;

                if (currentPath !== '/setup') {
                    window.location.replace('/setup');
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
        let nativeListenerCleanup: (() => void) | undefined;

        if (Capacitor.isNativePlatform()) {
            const nativeListener = App.addListener('appUrlOpen', async ({ url }) => {
                if (!url || !url.startsWith(NATIVE_GOOGLE_REDIRECT_URI)) {
                    return;
                }

                try {
                    const parsed = new URL(url);
                    const errorDescription = parsed.searchParams.get('error_description') ?? parsed.searchParams.get('error');
                    if (errorDescription) {
                        console.error('[AuthProvider] OAuth error from callback:', errorDescription);
                        toast.error(`Google sign-in failed: ${errorDescription}`);
                        return;
                    }

                    // Handle Authorization Code Flow (PKCE)
                    const code = parsed.searchParams.get('code');
                    if (code) {
                        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                        if (exchangeError) {
                            console.error('[AuthProvider] Failed to exchange OAuth code for session:', exchangeError);
                            toast.error(`Login failed: ${exchangeError.message}`);
                        } else {
                            // Explicitly handle login to ensure redirect happens
                            if (data.user) {
                                await handleUserLogin(data.user);
                            }
                        }
                        return;
                    }

                    // Handle Implicit Flow (Tokens in Hash)
                    // The URL might look like: com.weeve.app://auth/callback#access_token=...&refresh_token=...
                    if (url.includes('#')) {
                        const fragment = url.split('#')[1];
                        const params = new URLSearchParams(fragment);
                        const accessToken = params.get('access_token');
                        const refreshToken = params.get('refresh_token');

                        if (accessToken && refreshToken) {
                            const { data, error: sessionError } = await supabase.auth.setSession({
                                access_token: accessToken,
                                refresh_token: refreshToken,
                            });

                            if (sessionError) {
                                console.error('[AuthProvider] Failed to set session from tokens:', sessionError);
                                toast.error(`Login failed: ${sessionError.message}`);
                            } else {
                                // Explicitly handle login to ensure redirect happens
                                if (data.user) {
                                    await handleUserLogin(data.user);
                                }
                            }
                            return;
                        }
                    }

                    console.warn('[AuthProvider] No code or tokens found in callback URL');
                    toast.error('Login failed: Invalid callback URL');

                } catch (error) {
                    console.error('[AuthProvider] Failed to handle OAuth callback URL:', error);
                    toast.error('Login error: Failed to process URL');
                }
            });

            nativeListener.then((handle) => {
                nativeListenerCleanup = () => handle.remove();
            }).catch((error) => {
                console.error('[AuthProvider] Failed to attach native URL listener:', error);
            });
        }

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
            if (nativeListenerCleanup) {
                nativeListenerCleanup();
            }
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
