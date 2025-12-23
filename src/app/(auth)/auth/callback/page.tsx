"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { NATIVE_GOOGLE_REDIRECT_URI_IOS, NATIVE_GOOGLE_REDIRECT_URI_ANDROID } from '@/lib/auth';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export default function AuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check for OAuth errors in URL params
        const errorParam = searchParams?.get('error');
        const errorDescription = searchParams?.get('error_description');

        if (errorParam) {
            console.error('[Callback] OAuth error:', errorParam, errorDescription);
            setError(errorDescription || 'Authentication failed');
            setTimeout(() => router.push('/login'), 3000);
            return;
        }

        // If we are on iOS/Android browser (not the Capacitor native app), try to open the
        // installed app with the same callback URL so the native app consumes the OAuth code.
        try {
            const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
            const isIos = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
            const isAndroid = /android/i.test(userAgent);
            const isCapacitor = (window as any).Capacitor && typeof (window as any).Capacitor.isNativePlatform === 'function' ? (window as any).Capacitor.isNativePlatform() : false;

            if (!isCapacitor && (isIos || isAndroid)) {
                const scheme = isIos ? NATIVE_GOOGLE_REDIRECT_URI_IOS : NATIVE_GOOGLE_REDIRECT_URI_ANDROID;
                const callbackUrl = `${scheme}${window.location.search}${window.location.hash}`;
                console.info('[Callback] Attempting to open installed app with callback:', callbackUrl);
                // Attempt to open the app deep link. If it fails, the browser stays on the web callback.
                window.location.assign(callbackUrl);
                // If the app did not open within ~1.8s, continue as web flow (no-op)
                const _fallbackTimer = setTimeout(() => {
                    console.info('[Callback] Native app did not open; continuing with web callback');
                }, 1800);
            }
        } catch (err) {
            console.warn('[Callback] Failed to attempt native app open:', err);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
            console.log('[Callback] Auth state change:', event, session?.user?.id);

            if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
                // Successful sign in - actively redirect to feed
                // AuthProvider will handle profile creation and onboarding checks
                if (session?.user) {
                    console.log('[Callback] User signed in, redirecting to /feed');
                    // Use window.location for a full page reload to ensure AuthProvider
                    // picks up the session properly and handles all the login flow
                    window.location.replace('/feed');
                }
            } else if (event === "SIGNED_OUT") {
                // Handle sign out during callback (edge case)
                router.replace("/login");
            }
        });

        // Timeout safety: if no auth change after 10 seconds, redirect to login
        const timeout = setTimeout(() => {
            console.warn('[Callback] Authentication timeout');
            setError('Authentication timed out');
            router.push('/login');
        }, 10000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, [router, searchParams]);

    if (error) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-white">
                <div className="text-red-500 text-6xl mb-4">✕</div>
                <div className="text-center space-y-1">
                    <p className="text-lg font-semibold">Authentication Failed</p>
                    <p className="text-sm text-gray-300">{error}</p>
                    <p className="text-xs text-gray-500 mt-4">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-white">
            <div className="w-12 h-12 border-4 border-[#EC1D99] border-t-transparent rounded-full animate-spin" />
            <div className="text-center space-y-1">
                <p className="text-lg font-semibold">Authenticating with Google</p>
                <p className="text-sm text-gray-300">This will only take a moment...</p>
            </div>
        </div>
    );
}
