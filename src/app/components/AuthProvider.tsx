"use client";

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { setLatestSession } from '@/lib/auth-session';
import { useStore } from '@/lib/store';
import { getUserProfile, NATIVE_GOOGLE_REDIRECT_URI_ANDROID, NATIVE_GOOGLE_REDIRECT_URI_IOS, fetchProfileWithAccessToken, createUserProfile } from '@/lib/auth';
import { processReferralCode } from '@/lib/referral';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { toast } from 'sonner';

interface AuthContextType {
    user: SupabaseUser | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
});

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/setup', '/brands', '/communities', '/influencers', '/auth/callback', '/terms', '/partnership', '/brand-signup'];

const isPublicRoute = (path: string) => PUBLIC_ROUTES.includes(path);

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    // Local state involves ONLY the Supabase User (Auth Layer)
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Zustand store involves the App Profile (Data Layer)
    const { setCurrentUser, currentUser, logoutUser } = useStore();
    const router = useRouter();
    const pathname = usePathname();

    // ---------------------------------------------------------------------------
    // Core Logic: Sync Auth User -> App Profile
    // ---------------------------------------------------------------------------
    const syncProfile = useCallback(async (authUser: SupabaseUser, sessionValues?: { access_token: string }) => {
        try {
            console.log('[AuthProvider] Syncing profile for:', authUser.id);

            // 1. Try to fetch existing profile
            let profile = await getUserProfile(authUser.id);

            // 2. If not found, try fallback fast-fetch (sometimes faster immediately after creation)
            if (!profile && sessionValues?.access_token) {
                const fastProfile = await fetchProfileWithAccessToken(sessionValues.access_token, authUser.id);
                if (fastProfile) {
                    profile = {
                        id: fastProfile.id,
                        email: '', // Not needed in profile usually
                        name: fastProfile.name,
                        avatar: fastProfile.avatar,
                        tagline: fastProfile.tagline,
                        tokens: fastProfile.tokens,
                        isBrand: fastProfile.isBrand,
                        brandWebsite: fastProfile.brandWebsite,
                        brandSubscriptionStatus: fastProfile.brandSubscriptionStatus,
                        // Add other fields as needed mapping from fastProfile
                    } as any;
                }
            }

            // 3. If STILL not found, and we are in a session, we might need to create it (auto-create for OAuth)
            // Note: Email/Password flow usually creates profile at signup. OAuth might not.
            if (!profile) {
                console.log('[AuthProvider] No profile found. Attempting auto-creation/recovery...');
                const candidateName = authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User';
                const candidateAvatar = authUser.user_metadata?.picture || authUser.user_metadata?.avatar;

                const { data: newProfile, error } = await createUserProfile(authUser.id, candidateName, candidateAvatar);

                if (newProfile) {
                    profile = {
                        id: newProfile.user_id,
                        name: newProfile.name,
                        avatar: newProfile.avatar,
                        tagline: newProfile.tagline,
                        tokens: newProfile.tokens,
                        // ... map other fields
                        isBrand: (newProfile as any).is_brand,
                    } as any;

                    // Process referral if applicable
                    try { await processReferralCode(newProfile.user_id); } catch (e) { console.warn('Referral error', e); }
                } else {
                    console.error('[AuthProvider] Failed to auto-create profile:', error);
                }
            }

            // 4. Update Store
            if (profile) {
                // Ensure we map cleanly to the Store User type
                const appUser = {
                    id: authUser.id,
                    name: profile.name,
                    avatar: profile.avatar || authUser.user_metadata?.picture,
                    tagline: profile.tagline,
                    tokens: profile.tokens || 100,
                    inviteCode: profile.inviteCode,
                    isBrand: profile.isBrand,
                    brandWebsite: profile.brandWebsite,
                    brandSubscriptionStatus: profile.brandSubscriptionStatus,
                    completedOnboarding: profile.completedOnboarding ?? false,
                    onboardingStep: (profile.onboardingStep === null) ? undefined : profile.onboardingStep,
                };
                setCurrentUser(appUser);
                return appUser;
            } else {
                // Fallback: Set a temporary user from Auth metadata so the app doesn't crash
                // but implementation might force them to /setup later
                const tempUser = {
                    id: authUser.id,
                    name: authUser.user_metadata?.name || 'User',
                    avatar: authUser.user_metadata?.picture,
                    tokens: 0
                };
                setCurrentUser(tempUser);
                return tempUser;
            }

        } catch (err) {
            console.error('[AuthProvider] Sync Profile Error:', err);
            return null;
        }
    }, [setCurrentUser]);


    // ---------------------------------------------------------------------------
    // Auth Listener
    // ---------------------------------------------------------------------------
    useEffect(() => {
        let mounted = true;
        let initCompleted = false;

        // Helper to clear potentially corrupted session data from localStorage
        const clearCorruptedSessions = () => {
            if (typeof window !== 'undefined' && window.localStorage) {
                try {
                    const keysToRemove: string[] = [];
                    for (let i = 0; i < window.localStorage.length; i++) {
                        const key = window.localStorage.key(i);
                        if (key && (key.includes('supabase') || key.includes('sb-'))) {
                            keysToRemove.push(key);
                        }
                    }
                    if (keysToRemove.length > 0) {
                        console.log('[AuthProvider] Clearing potentially corrupted session keys:', keysToRemove);
                        keysToRemove.forEach(key => window.localStorage.removeItem(key));
                    }
                } catch (e) {
                    console.warn('[AuthProvider] Failed to clear localStorage:', e);
                }
            }
        };

        const initialize = async () => {
            console.log('[AuthProvider] Starting initialization...');
            const initStartTime = Date.now();

            try {
                // 1. Get initial session with timeout protection
                // Reduced to 8s to prevent long waits in production
                console.log('[AuthProvider] Fetching session...');
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise<{ data: { session: null }, error: Error, timedOut: true }>((resolve) => {
                    setTimeout(() => {
                        console.warn('[AuthProvider] getSession timed out after 8 seconds');
                        resolve({ data: { session: null }, error: new Error('Session fetch timed out'), timedOut: true });
                    }, 8000);
                });

                const result = await Promise.race([sessionPromise, timeoutPromise]) as any;
                const session = result?.data?.session;
                const error = result?.error;
                const timedOut = result?.timedOut;

                console.log('[AuthProvider] Session fetch completed in', Date.now() - initStartTime, 'ms, hasSession:', !!session?.user, 'timedOut:', !!timedOut);

                if (error || timedOut) {
                    console.warn('[AuthProvider] Session fetch error/timeout:', error?.message);
                    // Clear potentially corrupted session data that might be causing hangs
                    clearCorruptedSessions();
                }

                if (session?.user) {
                    setUser(session.user);
                    setLatestSession(session);

                    // Perform Profile Sync with shorter timeout (5s)
                    try {
                        console.log('[AuthProvider] Syncing profile...');
                        const syncPromise = syncProfile(session.user, { access_token: session.access_token });
                        const syncTimeout = new Promise<null>((resolve) => {
                            setTimeout(() => {
                                console.warn('[AuthProvider] syncProfile timed out after 5 seconds');
                                resolve(null);
                            }, 5000);
                        });
                        await Promise.race([syncPromise, syncTimeout]);
                        console.log('[AuthProvider] Profile sync completed in', Date.now() - initStartTime, 'ms');
                    } catch (syncErr) {
                        console.warn('[AuthProvider] syncProfile error during init:', syncErr);
                    }
                } else {
                    // No session or timed out
                    console.log('[AuthProvider] No session, clearing user state');
                    setUser(null);
                    setLatestSession(null);
                    logoutUser();

                    // Clear any potentially corrupt session storage
                    if (typeof window !== 'undefined') {
                        try {
                            sessionStorage.removeItem('weeve_oauth_in_progress');
                        } catch (e) { }
                    }
                }
            } catch (initErr) {
                console.error('[AuthProvider] Initialize error:', initErr);
                // Fail gracefully - treat as no session
                setUser(null);
                setLatestSession(null);
                logoutUser();
            } finally {
                initCompleted = true;
                if (mounted) {
                    console.log('[AuthProvider] Initialization complete, total time:', Date.now() - initStartTime, 'ms');
                    setLoading(false);
                }
            }
        };

        // Master timeout: GUARANTEE that loading ends within 12 seconds no matter what
        // This prevents the app from ever getting stuck on the loading screen
        const masterTimeout = setTimeout(() => {
            if (!initCompleted && mounted) {
                console.error('[AuthProvider] MASTER TIMEOUT: Forcing loading to end after 12 seconds');
                setUser(null);
                setLatestSession(null);
                logoutUser();
                setLoading(false);
            }
        }, 12000);

        initialize();

        // 2. Listen for changes - wrapped in try-catch for safety
        let subscription: { unsubscribe: () => void } | null = null;
        try {
            const { data } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
                console.log('[AuthProvider] Auth Change:', event);

                if (!mounted) return;

                if (session?.user) {
                    setUser(session.user);
                    setLatestSession(session);

                    // On SIGN_IN, we might need to sync profile again (with timeout)
                    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                        try {
                            const syncPromise = syncProfile(session.user, { access_token: session.access_token });
                            const syncTimeout = new Promise<null>((resolve) => setTimeout(() => {
                                console.warn('[AuthProvider] onAuthStateChange syncProfile timed out');
                                resolve(null);
                            }, 10000));
                            await Promise.race([syncPromise, syncTimeout]);
                        } catch (syncErr) {
                            console.warn('[AuthProvider] onAuthStateChange syncProfile error:', syncErr);
                        }
                    }

                    // OAuth Redirect Handling (Clean up URL)
                    if (event === 'SIGNED_IN') {
                        // Check if we need to handle specific logic?
                    }

                } else {
                    setUser(null);
                    setLatestSession(null);
                    logoutUser();
                }

                // Clean up OAuth loading state
                if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('weeve_oauth_in_progress');
                }

                setLoading(false);

                // Handle redirects on change
                if (event === 'SIGNED_OUT') {
                    window.location.href = '/login';
                }
            });
            subscription = data.subscription;
        } catch (subscriptionError) {
            console.error('[AuthProvider] Failed to set up auth subscription:', subscriptionError);
        }

        return () => {
            mounted = false;
            clearTimeout(masterTimeout);
            if (subscription) {
                subscription.unsubscribe();
            }
        };
    }, [setCurrentUser, syncProfile, router, logoutUser]);


    // ---------------------------------------------------------------------------
    // Route Protection & Onboarding Logic
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (loading) return;

        const currentPath = pathname || '';

        // If NOT logged in and on a private route -> Login
        if (!user && !isPublicRoute(currentPath)) {
            console.log('[AuthProvider] Protected route, redirecting to login');
            router.replace('/login');
            return;
        }

        // If Logged in...
        if (user && currentUser) {
            const needsOnboarding = !currentUser.completedOnboarding && currentUser.onboardingStep !== 2;

            // If needs onboarding and NOT there -> Go there
            if (needsOnboarding && !currentPath.startsWith('/onboarding') && currentPath !== '/login') {
                // Check local storage dismissal for safety?
                console.log('[AuthProvider] Needs onboarding, redirecting');
                router.replace('/onboarding/welcome');
                return;
            }

            // If fully onboarded and on Public/Auth route -> Go Feed
            if (!needsOnboarding && isPublicRoute(currentPath) && currentPath !== '/auth/callback') {
                console.log('[AuthProvider] Redirecting to feed');
                router.replace('/feed');
                // router.refresh(); // Optional, but helps if feed data is stale
            }
        }
    }, [user, currentUser, loading, pathname, router]);


    // ---------------------------------------------------------------------------
    // Capacitor / Native Handlers
    // ---------------------------------------------------------------------------
    // ---------------------------------------------------------------------------
    // Capacitor / Native Handlers
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        App.addListener('appUrlOpen', async ({ url }) => {
            console.log('[AuthProvider] Deep link:', url);

            // Handle Stripe
            if (url.includes('payment-success')) {
                // Navigate internally
                router.push('/feed?payment=success');
                return;
            }

            // Handle Auth Callbacks
            if (url.includes('auth/callback') || url.includes('code=') || url.includes('access_token=')) {
                // Close browser if open - do this essentially parallel or just await
                Browser.close().catch(() => { });

                try {
                    // Extract fragment/params
                    // If it's a code flow (PKCE)
                    const urlObj = new URL(url);
                    const code = urlObj.searchParams.get('code');
                    const error = urlObj.searchParams.get('error');

                    if (error) {
                        throw new Error(urlObj.searchParams.get('error_description') || error);
                    }

                    if (code) {
                        // Add timeout to code exchange to prevent hanging
                        const exchangePromise = supabase.auth.exchangeCodeForSession(code);
                        const timeoutPromise = new Promise<{ data: { session: null }, error: Error }>((resolve) => {
                            setTimeout(() => {
                                console.warn('[AuthProvider] exchangeCodeForSession timed out after 15 seconds');
                                resolve({ data: { session: null }, error: new Error('Code exchange timed out') });
                            }, 15000);
                        });

                        const result = await Promise.race([exchangePromise, timeoutPromise]);
                        const { data, error } = result as any;

                        if (error) throw error;

                        if (data?.session) {
                            console.log('[AuthProvider] Manual session usage from deep link exchange');

                            // Wrap in timeout to break out of native event loop and ensure React updates flushes
                            setTimeout(async () => {
                                // Force state update immediately
                                setUser(data.session.user);
                                setLatestSession(data.session);
                                if (typeof window !== 'undefined') sessionStorage.removeItem('weeve_oauth_in_progress');

                                // Check profile triggers immediately (with timeout)
                                try {
                                    const syncPromise = syncProfile(data.session.user, { access_token: data.session.access_token });
                                    const syncTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000));
                                    await Promise.race([syncPromise, syncTimeout]);
                                } catch (err) {
                                    console.warn('[AuthProvider] Deep link sync profile error', err);
                                }

                                // FORCE navigation to break any "stuck" UI state
                                console.log('[AuthProvider] Force redirecting to feed');
                                router.push('/feed');
                                router.refresh();
                            }, 50);
                        } else {
                            throw new Error('No session received from code exchange');
                        }
                    }

                    // Implicit flow fallback
                    if (url.includes('#access_token')) {
                        const params = new URLSearchParams(url.split('#')[1]);
                        const access_token = params.get('access_token');
                        const refresh_token = params.get('refresh_token');

                        // Parse error from hash if present
                        const error = params.get('error');
                        if (error) throw new Error(params.get('error_description') || error);

                        if (access_token && refresh_token) {
                            setTimeout(async () => {
                                try {
                                    // Add timeout to setSession
                                    const sessionPromise = supabase.auth.setSession({ access_token, refresh_token });
                                    const timeoutPromise = new Promise<{ data: { session: null }, error: Error }>((resolve) => {
                                        setTimeout(() => {
                                            resolve({ data: { session: null }, error: new Error('setSession timed out') });
                                        }, 15000);
                                    });

                                    const result = await Promise.race([sessionPromise, timeoutPromise]);
                                    const { data, error } = result as any;

                                    if (error) console.error('[AuthProvider] setSession error', error);

                                    if (typeof window !== 'undefined') sessionStorage.removeItem('weeve_oauth_in_progress');

                                    if (data?.session) {
                                        console.log('[AuthProvider] Manual session usage from deep link (implicit)');
                                        setUser(data.session.user);
                                        setLatestSession(data.session);

                                        try {
                                            const syncPromise = syncProfile(data.session.user, { access_token: data.session.access_token });
                                            const syncTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000));
                                            await Promise.race([syncPromise, syncTimeout]);
                                        } catch (err) {
                                            console.warn('[AuthProvider] Deep link sync profile error', err);
                                        }
                                    }

                                    // FORCE navigation
                                    console.log('[AuthProvider] Force redirecting to feed (implicit)');
                                    router.push('/feed');
                                    router.refresh();
                                } catch (innerErr) {
                                    console.error('[AuthProvider] Implicit flow error:', innerErr);
                                    if (typeof window !== 'undefined') sessionStorage.removeItem('weeve_oauth_in_progress');
                                    toast.error('Authentication failed. Please try again.');
                                    router.push('/login');
                                }
                            }, 50);
                        }
                    }
                } catch (e: any) {
                    console.error('Deep link auth error', e);
                    toast.error(`Authentication failed: ${e.message || 'Unknown error'}`);

                    // CRITICAL: Clear the loading flag so Login page stops spinning
                    if (typeof window !== 'undefined') {
                        sessionStorage.removeItem('weeve_oauth_in_progress');
                    }
                }
            }
        });
    }, [router, syncProfile, setUser]);


    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="relative w-24 h-24 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#EC1D99] border-r-[#EC1D99] animate-spin"></div>
                    <img src="/weeve-logo.png" alt="Weeve" className="w-16 h-16 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
}
