"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[Callback] Auth event:', event);

            if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
                // Successful sign in
                // We let AuthProvider handle the redirect to /feed or /setup
                // based on whether the user has a profile or not.
                console.log('[Callback] Session established, waiting for AuthProvider to redirect...');
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
