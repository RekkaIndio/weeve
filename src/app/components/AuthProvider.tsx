"use client";

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { setLatestSession } from '@/lib/auth-session';
import { useStore } from '@/lib/store';
import { getUserProfile, NATIVE_GOOGLE_REDIRECT_URI_ANDROID, NATIVE_GOOGLE_REDIRECT_URI_IOS, fetchProfileWithAccessToken, createUserProfile } from '@/lib/auth';
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
        // Ensure the local AuthProvider user state reflects the signed-in user
        setUser(supabaseUser);

        try {
            // Check if we already have this user loaded with full profile data
            const state = useStore.getState();
            if (state.currentUser && state.currentUser.id === supabaseUser.id && state.currentUser.avatar && !state.currentUser.avatar.includes('dicebear')) {
                setLoading(false);
            } else {
                // Only set default user if we don't have valid data yet
                const defaultUser = {
                    id: supabaseUser.id,
                    name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
                    avatar: supabaseUser.user_metadata?.picture || supabaseUser.user_metadata?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${supabaseUser.id}`,
                    tokens: 100,
                };
                setCurrentUser(defaultUser);
                // Ensure user lands on feed immediately while the DB profile is created/propagates
                try {
                    const currentPath = window.location.pathname;
                    // Do not override the user's already visible onboarding/setup flow
                    if (isPublicRoute(currentPath) && !currentPath.startsWith('/setup') && !currentPath.startsWith('/onboarding')) {
                        router.replace('/feed');
                    }
                } catch (err) {
                    console.warn('[AuthProvider] Failed to route to feed after setting default user', err);
                }
            }

            setLoading(false);

            // Always try to fetch latest profile data to ensure sync
            // Use a robust polling strategy to handle transient RLS/replication delays and session propagation
            const fetchProfileWithRetries = async (userId: string, maxAttempts = 6, initialDelayMs = 150) => {
                let attempt = 0;
                let delay = initialDelayMs;
                while (attempt < maxAttempts) {
                    attempt += 1;
                    try {
                        const profile = await getUserProfile(userId);
                        if (profile) {
                            return profile;
                        }
                        console.warn(`[AuthProvider] getUserProfile returned null on attempt ${attempt}`);
                    } catch (err) {
                        console.warn(`[AuthProvider] getUserProfile threw on attempt ${attempt}:`, err);
                    }

                    await new Promise((resolve) => setTimeout(resolve, delay));
                    // Cap delay at 1s for quicker retry cadence
                    delay = Math.min(1000, delay * 1.5);
                }

                // Final fallback: schedule a background poll for longer duration, but return null for now
                try {
                    let backgroundAttempts = 0;
                    const intervalId = setInterval(async () => {
                        backgroundAttempts += 1;
                        try {
                            const profile = await getUserProfile(userId);
                            if (profile) {
                                const appUser = {
                                    id: userId,
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
                                try { if (typeof setupRedirectTimer !== 'undefined') clearTimeout(setupRedirectTimer); } catch { }
                                clearInterval(intervalId);
                            } else if (backgroundAttempts >= 8) {
                                clearInterval(intervalId);
                                console.warn('[AuthProvider] Background poll exhausted without finding a profile');
                            }
                        } catch (err) {
                            console.warn('[AuthProvider] Background poll error:', err);
                            if (backgroundAttempts >= 8) {
                                clearInterval(intervalId);
                            }
                        }
                    }, 1500);
                } catch (bgErr) {
                    console.warn('[AuthProvider] Failed to start background profile poll:', bgErr);
                }

                return null;
            };

            // If a profile isn't discovered within 10s, avoid redirecting to /setup immediately
            // and instead proceed to the feed with the default placeholder so the user isn't bounced
            // to the setup flow while backend processes finish creating the profile row.
            let profileFound = false;
            const setupRedirectTimer = setTimeout(() => {
                if (!profileFound) {
                    const currentPath = window.location.pathname;
                    if (isPublicRoute(currentPath)) {
                        try { router.replace('/feed'); } catch { window.location.replace('/feed'); }
                    }
                }
            }, 10000);

            const profile = await fetchProfileWithRetries(supabaseUser.id);

            if (profile) {
                profileFound = true;
                clearTimeout(setupRedirectTimer);
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
                    // Trigger a fetch of stories with retry logic to handle timing issues
                    const fetchStoriesWithRetry = async (maxAttempts = 3) => {
                        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                            try {
                                await storeState.fetchStories();
                                console.info(`[AuthProvider] fetchStories succeeded on attempt ${attempt}`);
                                return true;
                            } catch (err) {
                                console.warn(`[AuthProvider] fetchStories attempt ${attempt} failed:`, err);
                                if (attempt < maxAttempts) {
                                    await new Promise(r => setTimeout(r, attempt * 500));
                                }
                            }
                        }
                        return false;
                    };
                    fetchStoriesWithRetry().catch(err => console.warn('[AuthProvider] fetchStories retry failed', err));
                }

                // Check if user needs to complete onboarding
                const currentPath = window.location.pathname;
                let needsOnboarding = !profile.completedOnboarding && profile.onboardingStep !== null;
                try {
                    if (typeof window !== 'undefined' && supabaseUser?.id) {
                        const dismissed = !!localStorage.getItem(`weeve_onboarding_overlay_dismissed_${supabaseUser.id}`);
                        if (dismissed) needsOnboarding = false;
                    }
                } catch (err) {
                    // ignore local storage errors and proceed with default behavior
                }

                if (needsOnboarding && !currentPath.startsWith('/onboarding') && !currentPath.startsWith('/feed') && !currentPath.startsWith('/story')) {
                    // User has profile but hasn't completed onboarding
                    // Allow them to access onboarding routes, feed, and stories during tutorial

                    window.location.replace('/onboarding/prompt');
                } else if (!needsOnboarding && isPublicRoute(currentPath)) {
                    // User completed onboarding, redirect to feed if on auth pages
                    window.location.replace('/feed');
                }
            } else {
                // No profile found — do not immediately send the user to setup. We'll show
                // the default placeholder and continue background polling; if profile remains
                // missing after some time, we can guide the user to set up their profile.
                console.warn('[AuthProvider] No profile found after retries; continuing with placeholder user and background poll');
                const currentPath = window.location.pathname;
                if (isPublicRoute(currentPath)) {
                    try { router.replace('/feed'); } catch { window.location.replace('/feed'); }
                }
            }
        } catch (error) {
            console.error('[AuthProvider] Error in auth flow:', error);
            // Don't show toast for background auth errors
        } finally {
            setLoading(false);
        }
    }, [router, setCurrentUser]);

    const attemptFastProfileLoad = async (accessToken: string | undefined, userId: string) => {
        try {
            if (!accessToken) return null;
            const fastProfile = await fetchProfileWithAccessToken(accessToken, userId, 400);
            if (fastProfile) {
                const storeState = useStore.getState();
                if (!storeState.profileUpdateInProgress) {
                    setCurrentUser({
                        id: fastProfile.id,
                        name: fastProfile.name,
                        avatar: fastProfile.avatar,
                        tagline: fastProfile.tagline,
                        tokens: fastProfile.tokens,
                    });
                    try { storeState.fetchStories(); } catch (err) { console.warn('[AuthProvider] fetchStories error after fastProfile fetch', err); }
                }
                return fastProfile;
            }
            return null;
        } catch (err) {
            console.warn('[AuthProvider] attemptFastProfileLoad failed:', err);
            return null;
        }
    };

    const attemptCreateProfileAndSet = async (userId: string, candidateName: string, avatarUrl?: string) => {
        try {
            const { data: createdProfile, error: createErr } = await createUserProfile(userId, candidateName, avatarUrl, undefined, undefined);
            if (createErr) {
                // Try to refresh session if jwt expired
                if (createErr?.message && (createErr.message.includes('jwt expired') || createErr.message.includes('401') || (createErr as any).statusCode === 401)) {
                    try {
                        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                        if (!refreshError && refreshData?.session) {
                            const { data: createdProfileAfterRefresh, error: createErr2 } = await createUserProfile(userId, candidateName, avatarUrl, undefined, undefined);
                            if (!createErr2 && createdProfileAfterRefresh) {
                                const storeState = useStore.getState();
                                if (!storeState.profileUpdateInProgress) {
                                    setCurrentUser({
                                        id: createdProfileAfterRefresh.user_id,
                                        name: createdProfileAfterRefresh.name,
                                        avatar: createdProfileAfterRefresh.avatar ?? avatarUrl,
                                        tagline: createdProfileAfterRefresh.tagline ?? undefined,
                                        tokens: createdProfileAfterRefresh.tokens ?? 100,
                                        inviteCode: createdProfileAfterRefresh.invite_code ?? undefined,
                                        isPrivate: createdProfileAfterRefresh.is_private ?? false,
                                    });
                                }
                                return createdProfileAfterRefresh;
                            }
                        }
                    } catch (refreshErr) {
                        console.warn('[AuthProvider] Session refresh failed during auto-create profile:', refreshErr);
                    }
                }
                console.warn('[AuthProvider] createUserProfile returned error (no retry):', createErr);
                return null;
            }
            if (!createdProfile) return null;
            const storeState = useStore.getState();
            if (!storeState.profileUpdateInProgress) {
                setCurrentUser({
                    id: createdProfile.user_id,
                    name: createdProfile.name,
                    avatar: createdProfile.avatar ?? avatarUrl,
                    tagline: createdProfile.tagline ?? undefined,
                    tokens: createdProfile.tokens ?? 100,
                    inviteCode: createdProfile.invite_code ?? undefined,
                    isPrivate: createdProfile.is_private ?? false,
                });
            }
            return createdProfile;
        } catch (err) {
            console.warn('[AuthProvider] attemptCreateProfileAndSet error:', err);
            return null;
        }
    };

    useEffect(() => {
        let nativeListenerCleanup: (() => void) | undefined;

        if (Capacitor.isNativePlatform()) {
            const processAuthCallbackUrl = async (url?: string) => {
                if (!url || (!url.startsWith(NATIVE_GOOGLE_REDIRECT_URI_ANDROID) && !url.startsWith(NATIVE_GOOGLE_REDIRECT_URI_IOS))) {
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
                        let setterData: any | undefined;
                        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                        if (exchangeError) {
                            console.error('[AuthProvider] Failed to exchange OAuth code for session:', exchangeError);
                            toast.error(`Login failed: ${exchangeError.message}`);
                        } else {
                            if (data) {
                                // Persist session to the Supabase client storage so future getSession calls return the session
                                if (data.session?.access_token && data.session?.refresh_token) {
                                    try {
                                        const setterResult = await supabase.auth.setSession({
                                            access_token: data.session.access_token,
                                            refresh_token: data.session.refresh_token,
                                        });
                                        const setError = (setterResult as any).error;
                                        setterData = (setterResult as any).data;
                                        if (setError) {
                                            console.warn('[AuthProvider] setSession after exchange returned error:', setError);
                                        } else {
                                            if (setterData?.session) setLatestSession(setterData.session);
                                            try {
                                                const { data: verifySession } = await supabase.auth.getSession();
                                            } catch (verifyErr) {
                                                console.warn('[AuthProvider] failed to verify session via getSession after setSession', verifyErr);
                                            }
                                        }
                                    } catch (setSessionErr) {
                                        console.warn('[AuthProvider] Error while persisting session:', setSessionErr);
                                    }
                                }

                                if (data.user) {
                                    setUser(data.user);
                                    // Try fast profile load via REST using the access token from the response
                                    const accessToken = (data.session?.access_token) || (setterData?.session?.access_token);
                                    try {
                                        const existing = await attemptFastProfileLoad(accessToken as string | undefined, data.user.id);
                                        if (!existing) {
                                            // No profile found — attempt to auto-create a profile for UX (will be null if creation fails)
                                            try {
                                                const candidateName = data.user.user_metadata?.name ?? data.user.email?.split('@')[0] ?? 'User';
                                                const createdProfile = await attemptCreateProfileAndSet(data.user.id, candidateName, data.user.user_metadata?.picture);
                                                // try quickly to fetch after create
                                                await attemptFastProfileLoad(accessToken as string | undefined, data.user.id);
                                            } catch (createErr) {
                                                console.warn('[AuthProvider] createUserProfile fallback failed:', createErr);
                                            }
                                        }
                                    } catch (err) { console.warn('[AuthProvider] fastProfileLoad failed', err); }
                                    await handleUserLogin(data.user);
                                    try {
                                        await new Promise(resolve => setTimeout(resolve, 200));
                                        const { data: verify } = await supabase.auth.getSession();
                                        if (verify?.session) {
                                            // Try to use router replace first
                                            try {
                                                router.replace('/feed');
                                            } catch (routerErr) {
                                                console.warn('[AuthProvider] router.replace failed, falling back to location.replace', routerErr);
                                                window.location.replace('/feed');
                                            }
                                        } else {
                                            // session not visible yet, reload as a safe fallback so persisted session is read
                                            console.warn('[AuthProvider] session not visible after setSession; reloading app to persist session');
                                            window.location.replace('/feed');
                                        }
                                    } catch (err) {
                                        console.warn('[AuthProvider] post-login redirect check failed:', err);
                                    }
                                }
                            }
                        }
                        return;
                    }

                    // Handle Implicit Flow (Tokens in Hash)
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
                                if (data) {
                                    if (data.session) setLatestSession(data.session);
                                    try {
                                        const { data: verifySession } = await supabase.auth.getSession();
                                    } catch (verifyErr) {
                                        console.warn('[AuthProvider] failed to verify session after implicit setSession', verifyErr);
                                    }
                                    if (data.user) {
                                        setUser(data.user);
                                        const existing = await attemptFastProfileLoad(data.session?.access_token ?? undefined, data.user.id);
                                        if (!existing) {
                                            try {
                                                const candidateName = data.user.user_metadata?.name ?? data.user.email?.split('@')[0] ?? 'User';
                                                const createdProfile2 = await attemptCreateProfileAndSet(data.user.id, candidateName, data.user.user_metadata?.picture);
                                                await attemptFastProfileLoad(data.session?.access_token ?? undefined, data.user.id);
                                            } catch (createErr) {
                                                console.warn('[AuthProvider] createUserProfile fallback failed:', createErr);
                                            }
                                        }
                                        await handleUserLogin(data.user);
                                        try {
                                            await new Promise(resolve => setTimeout(resolve, 200));
                                            const { data: verify } = await supabase.auth.getSession();
                                            if (verify?.session) {
                                                try { router.replace('/feed'); } catch (routerErr) { window.location.replace('/feed'); }
                                            } else {
                                                console.warn('[AuthProvider] session not visible after implicit setSession; reloading app to persist session');
                                                window.location.replace('/feed');
                                            }
                                        } catch (err) {
                                            console.warn('[AuthProvider] post-login redirect check failed:', err);
                                        }
                                    }
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
            };

            // 1) Process a possible launch URL for cold starts / deep-link starts
            (async () => {
                try {
                    const launchResult = await App.getLaunchUrl();
                    const launchUrl = launchResult?.url;
                    if (launchUrl) {
                        await processAuthCallbackUrl(launchUrl);
                    }
                } catch (err) {
                    console.warn('[AuthProvider] Failed to get launch URL:', err);
                }
            })();

            const nativeListenerPromise = App.addListener('appUrlOpen', async ({ url }) => {
                await processAuthCallbackUrl(url);
            });

            nativeListenerPromise.then((handle) => {
                nativeListenerCleanup = () => handle.remove();
            }).catch((err) => {
                console.warn('[AuthProvider] Failed to attach appUrlOpen listener:', err);
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
                if (session?.user && session.access_token) {
                    try {
                        const existing = await attemptFastProfileLoad(session.access_token, session.user.id);
                        if (!existing && session.user) {
                            const candidateName = session.user.user_metadata?.name ?? session.user.email?.split('@')[0] ?? 'User';
                            try {
                                const createdProfile3 = await attemptCreateProfileAndSet(session.user.id, candidateName, session.user.user_metadata?.picture);
                                await attemptFastProfileLoad(session.access_token, session.user.id);
                            } catch (createErr) {
                                console.warn('[AuthProvider] createUserProfile in initializeSession failed:', createErr);
                            }
                        }
                    } catch (err) { console.warn('[AuthProvider] attemptFastProfileLoad in initializeSession failed', err); }
                }
                console.info('[AuthProvider] Session initialized:', session?.user?.id ? 'User found' : 'No user');

                if (session?.user) {
                    // Profile already loaded in block above, just handle login
                    await handleUserLogin(session.user);
                } else {
                    setLoading(false);
                    // Redirect to login if on a protected route
                    const currentPath = window.location.pathname;
                    if (!isPublicRoute(currentPath)) {
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

        // When app regains focus, try to re-check session and refresh profile
        const handleFocus = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    console.info('[AuthProvider] App focused and session present - re-initializing login flow');
                    await handleUserLogin(session.user);
                }
            } catch (focusErr) {
                console.warn('[AuthProvider] Failed to refresh session on focus:', focusErr);
            }
        };

        const handleVisibilityChange = () => {
            if (!document.hidden) handleFocus();
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('focus', handleFocus);
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
            if (!isMounted) return;

            console.info('[AuthProvider] Auth event:', event, 'User:', session?.user?.id || 'null');
            setUser(session?.user ?? null);
            setLatestSession(session ?? null);

            if (event === 'SIGNED_OUT') {
                console.info('[AuthProvider] User explicitly signed out');
                setCurrentUser(null);
                setLoading(false);
                setLatestSession(null);
                router.push('/login');
                return;
            }

            if (session?.user) {
                try { await attemptFastProfileLoad(session.access_token ?? undefined, session.user.id); } catch (err) { console.warn('[AuthProvider] attemptFastProfileLoad in onAuthStateChange failed', err); }
                await handleUserLogin(session.user);
            } else {
                // User logged out
                console.info('[AuthProvider] User logged out, clearing state');
                setCurrentUser(null);
                setLoading(false);

                // Redirect to login if on a protected route
                const currentPath = window.location.pathname;
                if (!isPublicRoute(currentPath)) {
                    console.info('[AuthProvider] Redirecting to login from:', currentPath);
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
            if (typeof window !== 'undefined') {
                window.removeEventListener('focus', handleFocus);
                document.removeEventListener('visibilitychange', handleVisibilityChange);
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
