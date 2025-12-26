"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signInWithGoogle } from "@/lib/auth";
import { useAuth } from "@/app/components/AuthProvider";
import { supabase } from '@/lib/supabase';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const { user } = useAuth(); // Get auth state to prevent flash

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState<"google" | null>(() => {
        // Check if OAuth was in progress (persisted in sessionStorage)
        if (typeof window !== 'undefined' && sessionStorage.getItem('weeve_oauth_in_progress')) {
            return "google";
        }
        return null;
    });

    // Store ref code from URL parameter
    useEffect(() => {
        const ref = searchParams?.get('ref');
        if (ref) {
            localStorage.setItem('weeve_invite_code', ref);
        }
    }, [searchParams]);

    const [isIosChrome, setIsIosChrome] = useState(false);

    // Auth state changes are handled by AuthProvider which will redirect to /feed
    useEffect(() => {
        // Safety timeout: If we are stuck in "Signing you in..." for more than 15 seconds, reset it.
        // This handles cases where the deep link never comes back or fails silently.
        let timeoutId: NodeJS.Timeout;

        if (socialLoading === "google") {
            const startTime = Date.now();
            // check if we have a timestamp stored? For now just simple timeout from mount/update

            timeoutId = setTimeout(() => {
                console.warn('[Login] OAuth timeout - clearing loading state');
                setSocialLoading(null);
                sessionStorage.removeItem('weeve_oauth_in_progress');
                setError("Login timed out. Please try again.");
            }, 30000); // 30 seconds timeout
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [socialLoading]);

    useEffect(() => {
        try {
            const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
            const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
            const isChrome = /CriOS|Chrome/.test(ua);
            setIsIosChrome(isiOS && isChrome);
        } catch (err) {
            setIsIosChrome(false);
        }
    }, []);

    const handleEmailLogin = async () => {
        if (!email || !password) {
            setError("Please fill in all fields");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const { user, session, error: authError } = await signIn(email, password);

            if (authError) throw authError;
            if (!user) throw new Error('Login failed');



            // Manually set the session if needed, though supabase client usually handles this
            if (session) {
                const { error: sessionError } = await supabase.auth.setSession(session);
                if (sessionError) console.error('[Login] Error setting session:', sessionError);
            }

            // AuthProvider will handle redirect to /feed once session is detected
            // router.push('/feed'); 

        } catch (error) {
            console.error('[Login] Error:', error);
            const message = error instanceof Error ? error.message : null;
            setError(message || "Failed to log in");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError("");
        setSocialLoading("google");
        // Persist loading state so it survives component remounts
        sessionStorage.setItem('weeve_oauth_in_progress', 'true');

        try {
            const { error: authError } = await signInWithGoogle();
            if (authError) throw authError;
        } catch (error) {
            console.error('[Login] Google sign-in error:', error);
            setSocialLoading(null);
            sessionStorage.removeItem('weeve_oauth_in_progress');
            const message = error instanceof Error ? error.message : null;
            setError(message || "Failed to sign in with Google");
        }
    };

    // Show loading screen while OAuth is in progress
    if (socialLoading === "google") {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
                <div className="flex flex-col items-center gap-4">
                    <img
                        src="/weeve-logo.png"
                        alt="Weeve Logo"
                        className="w-20 h-20 object-contain"
                    />
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <p className="text-white text-lg">Signing you in...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -inset-[10px] opacity-30">
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
                </div>

                {/* Weaving Lines Animation */}
                <svg className="absolute inset-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
                            <stop offset="50%" stopColor="#a855f7" stopOpacity="1" />
                            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ec4899" stopOpacity="0" />
                            <stop offset="50%" stopColor="#6366f1" stopOpacity="1" />
                            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Line 1 */}
                    <path
                        d="M-100,50 Q 50,100 200,50 T 500,50 T 800,50 T 1100,50"
                        fill="none"
                        stroke="url(#grad1)"
                        strokeWidth="2"
                        className="animate-weave-1"
                    />

                    {/* Line 2 */}
                    <path
                        d="M-100,80 Q 50,30 200,80 T 500,80 T 800,80 T 1100,80"
                        fill="none"
                        stroke="url(#grad2)"
                        strokeWidth="2"
                        className="animate-weave-2"
                    />

                    {/* Line 3 */}
                    <path
                        d="M-100,20 Q 50,70 200,20 T 500,20 T 800,20 T 1100,20"
                        fill="none"
                        stroke="url(#grad1)"
                        strokeWidth="2"
                        className="animate-weave-3"
                    />
                </svg>
            </div>

            {/* Login Form */}
            <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center">
                <div className="mb-6">
                    <img
                        src="/weeve-logo.png"
                        alt="Weeve Logo"
                        className="w-24 h-24 object-contain"
                    />
                </div>
                <h1 className="mb-8 text-center text-4xl font-bold text-white">
                    Welcome Back
                </h1>

                <div className="space-y-4">
                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Social Logins */}
                    {/* <div className="w-full">
                        {isIosChrome && (
                            <div className="mb-2 p-3 rounded-lg bg-yellow-900/20 border border-yellow-700 text-yellow-100 text-sm">
                                Tip: On iOS browsers other than Safari (e.g., Chrome), OAuth flows might not open the app. Try Safari or install the Weeve app for the best experience.
                            </div>
                        )}
                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading || socialLoading === "google"}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 py-3 text-white transition-all hover:bg-white/20 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            {socialLoading === "google" ? "Redirecting..." : "Google"}
                        </button>
                    </div>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-white/20"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">Or continue with email</span>
                        <div className="flex-grow border-t border-white/20"></div>
                    </div> */}

                    <input
                        type="email"
                        className="w-full rounded-lg bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleEmailLogin()}
                        disabled={loading}
                    />
                    <input
                        type="password"
                        className="w-full rounded-lg bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleEmailLogin()}
                        disabled={loading}
                    />

                    <button
                        onClick={handleEmailLogin}
                        disabled={loading}
                        className="w-full rounded-lg bg-white text-black py-4 font-bold text-lg transition-all hover:bg-gray-100 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Logging in..." : "Log In"}
                    </button>

                    <p className="mt-6 text-center text-sm text-gray-300">
                        No account?{" "}
                        <a
                            href={searchParams?.get('ref') ? `/signup?ref=${searchParams.get('ref')}` : "/signup"}
                            className="text-white font-semibold underline hover:text-gray-200 transition-colors"
                        >
                            Sign up
                        </a>
                    </p>
                </div>
            </div>

            <style jsx>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }

                @keyframes weave {
                    0% { transform: translateX(-100%) translateY(0); }
                    50% { transform: translateX(0%) translateY(10px); }
                    100% { transform: translateX(100%) translateY(0); }
                }

                .animate-weave-1 {
                    animation: weave 8s linear infinite;
                    transform-origin: center;
                }
                .animate-weave-2 {
                    animation: weave 12s linear infinite;
                    animation-delay: -4s;
                    transform-origin: center;
                }
                 .animate-weave-3 {
                    animation: weave 10s linear infinite;
                    animation-delay: -2s;
                    transform-origin: center;
                }
            `}</style>
        </div>
    );
}
