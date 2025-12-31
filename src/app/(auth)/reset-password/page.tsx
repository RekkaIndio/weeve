"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [initializingSession, setInitializingSession] = useState(true);

    // Exchange the PKCE code for a session on mount
    useEffect(() => {
        const initSession = async () => {
            try {
                // Check for code in URL (PKCE flow from Supabase recovery)
                const code = searchParams?.get('code');

                if (code) {
                    console.log('[ResetPassword] Exchanging code for session...');
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

                    if (error) {
                        console.error('[ResetPassword] Code exchange error:', error);
                        setError('This password reset link has expired or is invalid. Please request a new one.');
                        setInitializingSession(false);
                        return;
                    }

                    if (data?.session) {
                        console.log('[ResetPassword] Session established');
                        setSessionReady(true);
                    }
                } else {
                    // No code - check if there's an existing session (e.g., from hash fragment)
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                        setSessionReady(true);
                    } else {
                        setError('No valid password reset token found. Please request a new reset link.');
                    }
                }
            } catch (err: any) {
                console.error('[ResetPassword] Init error:', err);
                setError('Failed to initialize password reset. Please try again.');
            } finally {
                setInitializingSession(false);
            }
        };

        initSession();

        // Also listen for PASSWORD_RECOVERY event (for hash-based tokens)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string) => {
            if (event === "PASSWORD_RECOVERY") {
                console.log('[ResetPassword] PASSWORD_RECOVERY event received');
                setSessionReady(true);
                setInitializingSession(false);
                setError("");
            }
        });

        return () => subscription.unsubscribe();
    }, [searchParams]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const { error } = await supabase.auth.updateUser({ password });

            if (error) throw error;

            setSuccess(true);

            // Redirect to login after a delay
            setTimeout(() => {
                router.push("/login");
            }, 3000);

        } catch (err: any) {
            console.error("Error updating password:", err);
            setError(err.message || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            {/* Animated Background - Reusing the style from login */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -inset-[10px] opacity-30">
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
                </div>
            </div>

            <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-8">
                {initializingSession ? (
                    <div className="text-center py-8">
                        <Loader2 className="w-10 h-10 text-[#EC1D99] animate-spin mx-auto mb-4" />
                        <p className="text-gray-400">Verifying reset link...</p>
                    </div>
                ) : success ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-3">Password Updated</h2>
                        <p className="text-gray-400 mb-8">
                            Your password has been successfully reset. Redirecting to login...
                        </p>
                    </div>
                ) : !sessionReady && error ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-3">Link Expired</h2>
                        <p className="text-gray-400 mb-6">{error}</p>
                        <button
                            onClick={() => router.push('/forgot-password')}
                            className="px-6 py-3 bg-gradient-to-r from-[#EC1D99] to-purple-600 text-white font-bold rounded-xl transition-all"
                        >
                            Request New Link
                        </button>
                    </div>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold mb-6 text-center">Set New Password</h1>

                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="New Password"
                                    required
                                    className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#EC1D99] transition-colors pr-10"
                                    disabled={loading || !sessionReady}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            <div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm New Password"
                                    required
                                    className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#EC1D99] transition-colors"
                                    disabled={loading || !sessionReady}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !sessionReady}
                                className="w-full px-6 py-3 bg-gradient-to-r from-[#EC1D99] to-purple-600 hover:from-[#EC1D99]/90 hover:to-purple-600/90 text-white font-bold rounded-xl transition-all shadow-[0_0_30px_rgba(236,29,153,0.3)] disabled:opacity-50"
                            >
                                {loading ? "Updating..." : "Update Password"}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
