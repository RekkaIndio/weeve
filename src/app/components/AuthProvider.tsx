"use client";

import { createContext, useCallback, useContext, useEffect, useState, useRef } from 'react';
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

interface AuthContextType {
    user: SupabaseUser | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
});

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/setup', '/brands', '/communities', '/influencers', '/auth/callback', '/terms', '/privacy', '/contact', '/help', '/partnership', '/brand-signup', '/forgot-password', '/reset-password'];

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
                // Note: profile.avatar already has a dicebear fallback from getUserProfile,
                // so we don't need to fallback to authUser.user_metadata?.picture here
                const appUser = {
                    id: authUser.id,
                    name: profile.name,
                    avatar: profile.avatar,
                    tagline: profile.tagline,
                    tokens: profile.tokens || 100,
                    inviteCode: profile.inviteCode,
                    isBrand: profile.isBrand,
                    brandWebsite: profile.brandWebsite,
                    brandSubscriptionStatus: profile.brandSubscriptionStatus,
                    completedOnboarding: profile.completedOnboarding ?? false,
                    onboardingStep: (profile.onboardingStep === null) ? undefined : profile.onboardingStep,
                    website: (profile.preferences as any)?.website,
                    preferences: profile.preferences,
                    tags: profile.tags || [],
                    communityId: profile.communityId,
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
                    tokens: 0,
                    completedOnboarding: false,
                    onboardingStep: 0
                };
                setCurrentUser(tempUser);
                return tempUser;
            }

        } catch (err) {
            console.error('[AuthProvider] Sync Profile Error:', err);
            // Fallback: Set a temporary user so the app doesn't crash or get stuck on login
            const tempUser = {
                id: authUser.id,
                name: authUser.user_metadata?.name || 'User',
                avatar: authUser.user_metadata?.picture,
                tokens: 0,
                completedOnboarding: false,
                onboardingStep: 0
            };
            setCurrentUser(tempUser);
            return tempUser;
        }
    }, [setCurrentUser]);


    // ---------------------------------------------------------------------------
    // Auth Listener
    // ---------------------------------------------------------------------------
    useEffect(() => {
        let mounted = true;
        let initCompleted = false;

        const initialize = async () => {
            try {
                // 1. Get initial session with retry logic (Web & Native)
                // Sometimes localStorage/Preferences isn't ready immediately, or there's a race condition
                let session = null;
                const maxAttempts = 3; // Always retry a few times to be safe

                for (let attempt = 0; attempt < maxAttempts; attempt++) {
                    const result = await supabase.auth.getSession();
                    session = result.data?.session;

                    if (session) {
                        console.log(`[AuthProvider] Session found on attempt ${attempt + 1}`);
                        break;
                    }

                    // Wait and retry if no session found
                    if (attempt < maxAttempts - 1) {
                        console.log(`[AuthProvider] No session on attempt ${attempt + 1}, retrying...`);
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                }

                if (session?.user) {
                    // OPTIMISTIC LOGIN: Set state immediately
                    setUser(session.user);
                    setLatestSession(session);

                    // Check if we already have a persisted user with the correct ID
                    const existingUser = useStore.getState().currentUser;
                    const isReturningUser = existingUser && existingUser.id === session.user.id; // Check ID match

                    if (isReturningUser) {
                        // --------------------------------------------------------
                        // A. RETURNING USER: Optimistic Load (Instant)
                        // --------------------------------------------------------
                        console.log('[AuthProvider] Returning user detected, loading optimistically.');

                        // Create minimal temp user to unblock routing immediately
                        const optimisticUser = {
                            id: session.user.id,
                            name: existingUser.name || session.user.user_metadata?.name || 'User',
                            avatar: existingUser.avatar || session.user.user_metadata?.picture,
                            tokens: existingUser.tokens || 0,
                            completedOnboarding: existingUser.completedOnboarding ?? false,
                            onboardingStep: existingUser.onboardingStep,
                        };

                        // Update store if needed (though usually persisted)
                        setCurrentUser(optimisticUser as any);

                        // Release UI Block immediately
                        setLoading(false);

                        // BACKGROUND Sync: Fetch full profile to get updates
                        syncProfile(session.user, { access_token: session.access_token }).catch((err: any) => {
                            console.warn('[AuthProvider] Background sync failed:', err);
                        });

                    } else {
                        // --------------------------------------------------------
                        // B. FRESH LOGIN / NEW USER: Blocking Load (Wait for Profile)
                        // --------------------------------------------------------
                        console.log('[AuthProvider] Fresh login detected, waiting for profile sync...');

                        // We MUST await this so we know if they need onboarding (Step 0)
                        try {
                            await syncProfile(session.user, { access_token: session.access_token });
                        } catch (err) {
                            console.warn('[AuthProvider] Initial sync failed:', err);
                            // Even if it fails, we let it proceed, but hopefully syncProfile returned a temp user
                        }

                        // Release UI Block ONLY after we have the profile data
                        setLoading(false);
                    }
                } else {
                    // No session
                    console.log('[AuthProvider] No session found');
                    setUser(null);
                    setLatestSession(null);
                    logoutUser();
                    setLoading(false);
                }
            } catch (initErr) {
                console.error('[AuthProvider] Initialize error:', initErr);
                setUser(null);
                setLatestSession(null);
                logoutUser();
                setLoading(false);
            } finally {
                initCompleted = true;
                if (mounted && loading) {
                    // extra safety: if we didn't set loading false above
                    // but we might have set it in the if block. 
                    // If we did, React handles the duplicate set.
                    // If we didn't (error path), we do it here.
                }
            }
        };

        // Master timeout: GUARANTEE that loading ends within 12 seconds no matter what
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
                if (!mounted) return;

                console.log(`[AuthProvider] Auth State Change: ${event}`, {
                    hasSession: !!session,
                    userId: session?.user?.id,
                    expiresAt: session?.expires_at
                });

                if (session?.user) {
                    setUser(session.user);
                    setLatestSession(session);

                    // On SIGN_IN or session restore, we might need to sync profile
                    const shouldSyncAndRedirect = event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'PASSWORD_RECOVERY' || event === 'INITIAL_SESSION';

                    if (shouldSyncAndRedirect) {

                        // Handle Password Recovery Event explicitly
                        if (event === 'PASSWORD_RECOVERY') {
                            router.push('/reset-password');
                            return;
                        }

                        // OPTIMISTIC: Update UI first
                        // Using useStore.getState() to avoid stale closure issues
                        const storeState = useStore.getState();

                        // Preserve existing avatar if we have a persisted user with the same ID
                        // This prevents the intermittent avatar disappearing bug
                        const preserveAvatar = storeState.currentUser?.id === session.user.id
                            ? storeState.currentUser.avatar
                            : undefined;

                        const optimisticUser = {
                            id: session.user.id,
                            name: session.user.user_metadata?.name || 'User',
                            avatar: preserveAvatar || session.user.user_metadata?.picture,
                            tokens: 0,
                            completedOnboarding: true // Assume true
                        };

                        // Only set optimistic user if store is empty
                        if (!storeState.currentUser) {
                            setCurrentUser(optimisticUser as any);
                        }

                        // Background Sync
                        syncProfile(session.user, { access_token: session.access_token }).catch((err: any) => {
                            console.warn('[AuthProvider] Background sync error:', err);
                        });

                        // Explicit Navigation check - redirect to feed if on login or other public routes
                        // On iOS INITIAL_SESSION fires instead of SIGNED_IN, so we handle both
                        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                            // Only redirect if currently on a public/auth route to avoid unnecessary navigation
                            const currentPath = window.location.pathname;

                            // Check if strict login page to ensure we redirect
                            const isStrictAuthPage = currentPath === '/login' || currentPath === '/signup' || currentPath === '/forgot-password';

                            if ((isPublicRoute(currentPath) && currentPath !== '/reset-password') || currentPath === '/auth/callback' || isStrictAuthPage) {
                                // Prevent duplicate redirects (event can fire multiple times)
                                const redirectKey = 'weeve_auth_redirecting';
                                if (sessionStorage.getItem(redirectKey)) {
                                    console.log('[AuthProvider] Redirect already in progress, skipping');
                                    return;
                                }
                                sessionStorage.setItem(redirectKey, 'true');

                                // Set login timestamp for grace period (Use localStorage for persistence across reloads)
                                if (typeof window !== 'undefined') {
                                    localStorage.setItem('weeve_last_login_timestamp', Date.now().toString());
                                }

                                console.log(`[AuthProvider] Processing redirect after ${event} event from ${currentPath}`);

                                // Clean up the key after navigation (short timeout)
                                setTimeout(() => sessionStorage.removeItem(redirectKey), 2000);

                                // IMPORTANT: Wait for sync to complete so we have the correct onboarding step
                                // The optimistic update above (lines 259-270) only sets defaults, which might be wrong for a new user
                                try {
                                    const syncedUser = await syncProfile(session.user, { access_token: session.access_token });

                                    // Determine redirect destination based on REAL profile data
                                    let destination = '/feed';

                                    if (syncedUser) {
                                        if (!syncedUser.completedOnboarding) {
                                            if (syncedUser.onboardingStep === 0 || syncedUser.onboardingStep == null) {
                                                destination = '/setup';
                                            } else if (syncedUser.onboardingStep === 1) {
                                                destination = '/onboarding/welcome';
                                            }
                                        }
                                    } else {
                                        // If sync failed returning null, fallback to setup is safer than feed
                                        // because it usually means profile creation might be needed
                                        console.warn('[AuthProvider] Sync returned null, defaulting to /setup');
                                        destination = '/setup';
                                    }

                                    console.log(`[AuthProvider] Redirecting to ${destination}`);
                                    router.replace(destination);

                                } catch (err) {
                                    console.error('[AuthProvider] Sync failed during redirect logic:', err);
                                    // Fallback to feed if everything fails, but this might be risky
                                    router.replace('/feed');
                                }
                            }
                        }

                    }

                    // OAuth Redirect Handling (Clean up URL)
                    if (event === 'SIGNED_IN') {
                        // Check if we need to handle specific logic?
                    }

                } else {
                    console.warn('[AuthProvider] Auth State Change: NO SESSION (Logging out)');
                    setUser(null);
                    setLatestSession(null);
                    logoutUser();
                }

                // Clean up OAuth loading state
                if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('weeve_oauth_in_progress');
                }

                // Only unlock UI for significant events that modify flow or when we are sure
                // preventing TOKEN_REFRESHED from disabling loading ensures initial sync isn't interrupted
                if (event !== 'TOKEN_REFRESHED') {
                    setLoading(false);
                }

                // Handle redirects on change
                if (event === 'SIGNED_OUT') {
                    console.log('[AuthProvider] SIGNED_OUT event received, redirecting to login');
                    // For logout, full refresh is safer to clear memory
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
    // iOS App Resume Session Validation
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        let cleanup: (() => void) | undefined;

        const setupAppStateListener = async () => {
            try {
                const listener = await App.addListener('appStateChange', async (state) => {
                    if (state.isActive) {
                        console.log('[AuthProvider] iOS: App resumed - validating session...');

                        // Small delay for Preferences to sync after resume
                        await new Promise(resolve => setTimeout(resolve, 200));

                        try {
                            const { data: { session } } = await supabase.auth.getSession();

                            if (session?.user) {
                                // Session valid - update state
                                setUser(session.user);
                                setLatestSession(session);

                                // Proactively refresh if token is nearing expiry (< 5 min)
                                if (session.expires_at) {
                                    const expiresInMs = (session.expires_at * 1000) - Date.now();
                                    if (expiresInMs < 5 * 60 * 1000) {
                                        console.log('[AuthProvider] iOS: Token expiring soon, refreshing...');
                                        const { data: refreshData } = await supabase.auth.refreshSession();
                                        if (refreshData?.session) {
                                            setUser(refreshData.session.user);
                                            setLatestSession(refreshData.session);
                                        }
                                    }
                                }
                            } else {
                                // No session found - try refresh before giving up
                                const currentUser = useStore.getState().currentUser;
                                if (currentUser) {
                                    console.log('[AuthProvider] iOS: No session on resume but had user, attempting refresh...');
                                    const { data: refreshData } = await supabase.auth.refreshSession();
                                    if (refreshData?.session) {
                                        setUser(refreshData.session.user);
                                        setLatestSession(refreshData.session);
                                        console.log('[AuthProvider] iOS: Session recovered via refresh');
                                    } else {
                                        // Session truly gone - log out cleanly
                                        console.warn('[AuthProvider] iOS: Session lost on resume - logging out');
                                        setUser(null);
                                        setLatestSession(null);
                                        logoutUser();
                                    }
                                }
                            }
                        } catch (err) {
                            console.warn('[AuthProvider] iOS: App resume session check failed:', err);
                        }
                    }
                });

                cleanup = () => listener.remove();
                console.log('[AuthProvider] iOS: App state listener attached for session validation');
            } catch (error) {
                console.warn('[AuthProvider] iOS: Failed to set up app state listener:', error);
            }
        };

        setupAppStateListener();

        return () => {
            if (cleanup) cleanup();
        };
    }, [logoutUser]);


    // ---------------------------------------------------------------------------
    // Route Protection & Onboarding Logic
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (loading) return;

        const currentPath = pathname || '';
        console.log('[AuthProvider] Route Check:', {
            hasUser: !!user,
            hasCurrentUser: !!currentUser,
            path: currentPath,
            isPublic: isPublicRoute(currentPath)
        });

        // If NOT logged in and on a private route -> Login
        if (!user && !isPublicRoute(currentPath)) {
            router.replace('/login');
            return;
        }

        // If Logged in...
        if (user && currentUser) {
            // Step 0: Profile just created, needs username/avatar selection
            // Step 1: Setup complete, needs welcome carousel and follows
            // Step 2: Created onboarding story, may see tutorial on story page
            // null/undefined + completedOnboarding: true = fully onboarded
            const onboardingStep = currentUser.onboardingStep;
            const isCompleted = currentUser.completedOnboarding;

            // If step 0 (just created profile), go to /setup for username/avatar
            if (!isCompleted && onboardingStep === 0 && currentPath !== '/setup') {
                router.replace('/setup');
                return;
            }

            // If step 1 (setup complete), go to welcome carousel
            if (!isCompleted && onboardingStep === 1 && !currentPath.startsWith('/onboarding') && currentPath !== '/login') {
                router.replace('/onboarding/welcome');
                return;
            }

            // If fully onboarded and on Public/Auth route -> Go Feed
            if (isCompleted && isPublicRoute(currentPath) && currentPath !== '/auth/callback' && currentPath !== '/reset-password') {
                // FAILSAFE: Check if we are in a recovery flow that landed on a wrong public route (like homepage)
                if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('type=recovery')) {
                    console.log('[AuthProvider] Detected recovery hash on public route, redirecting to /reset-password');
                    router.replace(`/reset-password${window.location.hash}`);
                    return;
                }

                router.replace('/feed');
                // router.refresh(); // Optional, but helps if feed data is stale
            }
        }
    }, [user, currentUser, loading, pathname, router]);


    // ---------------------------------------------------------------------------
    // Capacitor / Native Handlers
    // ---------------------------------------------------------------------------

    // Lock to prevent handling duplicate appUrlOpen events (common on iOS)
    const isProcessingDeepLink = useRef(false);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        let listenerHandle: Promise<any>;

        const setupListener = () => {
            listenerHandle = App.addListener('appUrlOpen', async ({ url }: { url: string }) => {
                if (isProcessingDeepLink.current) {
                    console.log('[AuthProvider] Already processing a deep link, ignoring duplicate.');
                    return;
                }
                // Handle Password Reset - navigate within the app
                if (url.includes('reset-password')) {
                    isProcessingDeepLink.current = true;
                    try {
                        const urlObj = new URL(url);
                        const code = urlObj.searchParams.get('code');
                        if (code) {
                            router.push(`/reset-password?code=${code}`);
                        } else {
                            router.push('/reset-password');
                        }
                    } finally {
                        setTimeout(() => { isProcessingDeepLink.current = false; }, 2000); // Small cooldown
                    }
                    return;
                }

                // Handle payment success
                if (url.includes('payment-success')) {
                    isProcessingDeepLink.current = true;
                    try {
                        // Navigate internally
                        router.push('/feed?payment=success');
                    } finally {
                        setTimeout(() => { isProcessingDeepLink.current = false; }, 2000); // Small cooldown
                    }
                    return;
                }

                // Handle Auth Callbacks
                if (url.includes('auth/callback') || url.includes('code=') || url.includes('access_token=')) {
                    isProcessingDeepLink.current = true;
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
                                    router.push('/feed');
                                    router.refresh();

                                    // Reset lock after a delay to ensuring we don't process rebounds
                                    setTimeout(() => { isProcessingDeepLink.current = false; }, 5000);
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
                            const type = params.get('type');

                            // Parse error from hash if present
                            const error = params.get('error');
                            if (error) throw new Error(params.get('error_description') || error);

                            if (access_token && refresh_token) {
                                setTimeout(async () => {
                                    try {
                                        // Add timeout to setSession - Reduced to 4s to prevent long delays
                                        const sessionPromise = supabase.auth.setSession({ access_token, refresh_token });
                                        const timeoutPromise = new Promise<{ data: { session: null }, error: Error }>((resolve) => {
                                            setTimeout(() => {
                                                resolve({ data: { session: null }, error: new Error('setSession timed out') });
                                            }, 4000); // 4 second max wait
                                        });

                                        const result = await Promise.race([sessionPromise, timeoutPromise]);
                                        const { data, error } = result as any;

                                        if (error) {
                                            console.warn('[AuthProvider] setSession error/timeout:', error);
                                            // Fallback: Check if session was set despite the error/timeout
                                            // Sometimes the socket hangs but the local storage was updated
                                            const { data: checkData } = await supabase.auth.getSession();
                                            if (checkData.session) {
                                                console.log('[AuthProvider] Recovered session despite setSession error');
                                                // Proceed as if successful using checkData
                                                setUser(checkData.session.user);
                                                setLatestSession(checkData.session);

                                                if (typeof window !== 'undefined') sessionStorage.removeItem('weeve_oauth_in_progress');

                                                try {
                                                    const syncPromise = syncProfile(checkData.session.user, { access_token: checkData.session.access_token });
                                                    const syncTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
                                                    await Promise.race([syncPromise, syncTimeout]);
                                                } catch (err) {
                                                    console.warn('[AuthProvider] Deep link sync profile error', err);
                                                }

                                                setLoading(false);
                                                router.push('/feed');
                                                router.refresh();
                                                setTimeout(() => { isProcessingDeepLink.current = false; }, 2000);
                                                return; // DONE
                                            }

                                            // If really failed:
                                            throw error;
                                        }

                                        if (typeof window !== 'undefined') sessionStorage.removeItem('weeve_oauth_in_progress');

                                        if (data?.session) {
                                            setUser(data.session.user);
                                            setLatestSession(data.session);

                                            // Handle Password Recovery - Redirect correctly
                                            if (type === 'recovery') {
                                                router.push('/reset-password');
                                                setTimeout(() => { isProcessingDeepLink.current = false; }, 2000);
                                                return;
                                            }

                                            try {
                                                const syncPromise = syncProfile(data.session.user, { access_token: data.session.access_token });
                                                const syncTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000));
                                                await Promise.race([syncPromise, syncTimeout]);
                                            } catch (err) {
                                                console.warn('[AuthProvider] Deep link sync profile error', err);
                                            }
                                        }

                                        // FORCE navigation
                                        router.push('/feed');
                                        router.refresh();
                                        setTimeout(() => { isProcessingDeepLink.current = false; }, 5000);
                                    } catch (innerErr) {
                                        console.error('[AuthProvider] Implicit flow error:', innerErr);

                                        // Final recovery attempt in catch block
                                        try {
                                            const { data: fwData } = await supabase.auth.getSession();
                                            if (fwData?.session?.user) {
                                                console.log('[AuthProvider] Caught error but session exists - recovering.');
                                                setUser(fwData.session.user);
                                                setLatestSession(fwData.session);
                                                if (typeof window !== 'undefined') sessionStorage.removeItem('weeve_oauth_in_progress');

                                                syncProfile(fwData.session.user, { access_token: fwData.session.access_token }).catch(() => { });

                                                setLoading(false);
                                                router.push('/feed');
                                                router.refresh();
                                                setTimeout(() => { isProcessingDeepLink.current = false; }, 2000);
                                                return;
                                            }
                                        } catch (recErr) { /* ignore */ }

                                        isProcessingDeepLink.current = false; // Reset lock on error

                                        if (typeof window !== 'undefined') sessionStorage.removeItem('weeve_oauth_in_progress');
                                        console.error('Authentication failed. Please try again.');
                                        router.push('/login');
                                    }
                                }, 50);
                            }
                        }
                    } catch (e: any) {
                        console.error('Deep link auth error:', e);

                        // Fallback: Check if we actually HAVE a session despite the error
                        // This handles race conditions where onAuthStateChange might have beaten us
                        try {
                            const { data: { session: fallbackSession } } = await supabase.auth.getSession();
                            if (fallbackSession?.user) {
                                console.log('[AuthProvider] Recovered from deep link error - Session exists!');

                                // FORCE SUCCESS
                                setUser(fallbackSession.user);
                                setLatestSession(fallbackSession);
                                if (typeof window !== 'undefined') sessionStorage.removeItem('weeve_oauth_in_progress');

                                // Sync profile just in case
                                syncProfile(fallbackSession.user, { access_token: fallbackSession.access_token }).catch(() => { });

                                // Redirect to feed
                                router.push('/feed');
                                router.refresh();

                                setTimeout(() => { isProcessingDeepLink.current = false; }, 5000);
                                return;
                            }
                        } catch (recoveryErr) {
                            console.warn('[AuthProvider] Failed to recover session:', recoveryErr);
                        }

                        // Unlock on true failure
                        isProcessingDeepLink.current = false;

                        // CRITICAL: Clear the loading flag so Login page stops spinning
                        if (typeof window !== 'undefined') {
                            sessionStorage.removeItem('weeve_oauth_in_progress');
                        }

                        // Force navigation to login to reset state and show error
                        // We use window.location.href to ensure a full refresh/state reset
                        const errorMessage = encodeURIComponent(e.message || 'Authentication failed');
                        window.location.href = `/login?error=${errorMessage}`;
                    }
                }
            });
        };

        setupListener();

        return () => {
            if (listenerHandle) {
                listenerHandle.then(handle => {
                    if (handle && handle.remove) {
                        handle.remove();
                    } else if ((App as any).removeListener) {
                        (App as any).removeListener('appUrlOpen', setupListener);
                    }
                }).catch(err => console.error('Error removing listener', err));
            }
        };
    }, [router, syncProfile, setUser]);


    // ---------------------------------------------------------------------------
    // Session Recovery Polling (Grace Period)
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (!loading && !user) {
            const lastLoginStr = typeof window !== 'undefined' ? localStorage.getItem('weeve_last_login_timestamp') : null;
            const lastLogin = lastLoginStr ? parseInt(lastLoginStr) : 0;
            const timeSinceLogin = Date.now() - lastLogin;
            const isRecentLogin = timeSinceLogin < 10000; // 10 seconds grace

            if (isRecentLogin) {
                let pollCount = 0;
                const interval = setInterval(async () => {
                    pollCount++;
                    const { data } = await supabase.auth.getSession();
                    if (data.session?.user) {
                        setUser(data.session.user);
                        setLatestSession(data.session);
                    }
                    if (pollCount >= 12) {
                        clearInterval(interval);
                    }
                }, 800);
                return () => clearInterval(interval);
            }
        }
    }, [user, loading]);

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    // Calculate redirect need synchronously to prevent flashing content
    let isRedirecting = false;
    const currentPath = pathname || '';

    if (!loading) {
        // 1. Not logged in + Private route
        if (!user && !isPublicRoute(currentPath)) {
            // Check for recent login to prevent race conditions (Grace Period)
            const lastLoginStr = typeof window !== 'undefined' ? localStorage.getItem('weeve_last_login_timestamp') : null;
            const lastLogin = lastLoginStr ? parseInt(lastLoginStr) : 0;
            const isRecentLogin = Date.now() - lastLogin < 10000; // 10 seconds grace

            if (isRecentLogin) {
                // Don't redirect yet, keep loading/waiting
                // effectively treat as loading
            } else {
                isRedirecting = true;
            }
        }

        // 2. Logged in logic
        if (user && !currentUser) {
            // We used to block here with isRedirecting = true, caused infinite spinner if profile sync failed
            // Now we allow fallthrough; components should handle missing profile gracefully or route protection will redirect
        }

        if (user && currentUser) {
            const onboardingStep = currentUser.onboardingStep;
            const isCompleted = currentUser.completedOnboarding;

            // Step 0 -> /setup
            if (!isCompleted && onboardingStep === 0 && currentPath !== '/setup') {
                isRedirecting = true;
            }

            // Step 1 -> /onboarding/welcome
            if (!isCompleted && onboardingStep === 1 && !currentPath.startsWith('/onboarding') && currentPath !== '/login') {
                isRedirecting = true;
            }

            // Completed -> /feed (if on public route)
            if (isCompleted && isPublicRoute(currentPath) && currentPath !== '/auth/callback' && currentPath !== '/reset-password') {
                // Check recovery hash (client-side only logic handled in effect, but we assume redirect if not recovery)
                // We can't check window.location.hash safely during SSR, so we might flash briefly only in that edge case
                // But for normal login -> feed redirect, this blocks the flash
                isRedirecting = true;
            }

            // 3. Logged in + strictly auth pages (Login/Signup)
            // Always block render because we will redirect somewhere
            if (currentPath === '/login' || currentPath === '/signup') {
                isRedirecting = true;
            }
        }
    }

    if (loading || isRedirecting) {
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
