"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp, signInWithGoogle, signInWithApple } from "@/lib/auth";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { Capacitor } from "@capacitor/core";

export default function SignUpPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [isAndroid, setIsAndroid] = useState(false);
    useEffect(() => {
        setIsAndroid(Capacitor.getPlatform() === 'android');
    }, []);
    const [acceptTerms, setAcceptTerms] = useState(false);

    // DOB State
    const [dobDay, setDobDay] = useState("");
    const [dobMonth, setDobMonth] = useState("");
    const [dobYear, setDobYear] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(() => {
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
        // Prefetch feed for faster navigation after signup
        router.prefetch('/feed');
    }, [searchParams, router]);

    const passwordCriteria = [
        { label: "At least 8 characters", met: password.length >= 8 },
        { label: "At least one lowercase letter", met: /[a-z]/.test(password) },
        { label: "At least one uppercase letter", met: /[A-Z]/.test(password) },
        { label: "At least one number", met: /[0-9]/.test(password) },
        { label: "At least one special character", met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
    ];

    const isPasswordValid = passwordCriteria.every(c => c.met);

    const handleEmailSignUp = async () => {
        if (!email || !password || !confirmPassword || !dobDay || !dobMonth || !dobYear) {
            setError("Please fill in all fields");
            return;
        }

        // Validate Age (16+)
        const birthDate = new Date(`${dobYear}-${dobMonth}-${dobDay}`);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        if (age < 16) {
            setError("You must be at least 16 years old to sign up.");
            return;
        }

        // Validate password using our criteria
        if (!isPasswordValid) {
            setError("Please verify that your password meets all requirements");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (!acceptTerms) {
            setError("Please accept the Terms of Service to continue.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const formattedDob = `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`;
            const { user, error: authError } = await signUp(email, password, undefined, formattedDob);

            if (authError) throw authError;
            if (!user) throw new Error('Signup failed');

            // Fallback: If AuthProvider doesn't redirect within 3 seconds, force navigate
            setTimeout(() => {
                const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
                if (currentPath === '/login' || currentPath === '/signup') {
                    router.push('/setup-profile');
                }
            }, 3000);

        } catch (error) {
            console.error('[Signup] Error:', error);
            const message = error instanceof Error ? error.message : null;
            setError(message || "Failed to sign up");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        setError("");
        setSocialLoading("google");
        sessionStorage.setItem('weeve_oauth_in_progress', 'true');

        try {
            const { error: authError } = await signInWithGoogle();
            if (authError) throw authError;
        } catch (error) {
            console.error('[Signup] Google sign-up error:', error);
            setSocialLoading(null);
            sessionStorage.removeItem('weeve_oauth_in_progress');
            const message = error instanceof Error ? error.message : null;
            setError(message || "Failed to sign up with Google");
        }
    };

    const handleAppleSignUp = async () => {
        setSocialLoading("apple");
        setError("");

        try {
            const { error } = await signInWithApple();
            if (error) {
                setSocialLoading(null);
                setError(error.message);
            }
        } catch (err) {
            setSocialLoading(null);
            setError("An unexpected error occurred");
        }
    };

    // Safety timeout for OAuth loading state
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        if (socialLoading === "google" || socialLoading === "apple") {
            timeoutId = setTimeout(() => {
                console.warn('[Signup] OAuth timeout - clearing loading state');
                setSocialLoading(null);
                sessionStorage.removeItem('weeve_oauth_in_progress');
                setError("Signup timed out. Please try again.");
            }, 30000);
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [socialLoading]);


    const [isIosChrome, setIsIosChrome] = useState(false);
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


    if (socialLoading === "google" || socialLoading === "apple") {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
                <div className="flex flex-col items-center gap-4">
                    <img
                        src="/weeve-logo.png"
                        alt="Weeve Logo"
                        className="w-20 h-20 object-contain"
                    />
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <p className="text-white text-lg">Creating your account...</p>
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
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                            <stop offset="50%" stopColor="#06b6d4" stopOpacity="1" />
                            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0" />
                            <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
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

            {/* Signup Form */}
            <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center">
                <div className="mb-6">
                    <img
                        src="/weeve-logo.png"
                        alt="Weeve Logo"
                        className="w-24 h-24 object-contain"
                    />
                </div>
                <h1 className="mb-8 text-center text-4xl font-bold text-white">
                    Create Your Account
                </h1>

                <div className="space-y-4">
                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Social Logins */}
                    <div className="w-full flex gap-3">
                        <button
                            onClick={handleGoogleSignUp}
                            disabled={loading || socialLoading === "google"}
                            className="flex-1 flex items-center justify-center rounded-lg bg-white/10 backdrop-blur-md border border-white/20 py-3 text-white transition-all hover:bg-white/20 disabled:opacity-60 disabled:cursor-not-allowed"
                            aria-label="Sign up with Google"
                        >
                            {socialLoading === "google" ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                            )}
                        </button>

                        {!isAndroid && (
                            <button
                                onClick={handleAppleSignUp}
                                disabled={loading || socialLoading === "apple"}
                                className="flex-1 flex items-center justify-center rounded-lg bg-white text-black py-3 transition-all hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                aria-label="Sign up with Apple"
                            >
                                {socialLoading === "apple" ? (
                                    <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-6 h-6 mb-0.5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.45-1.02 3.65-.95 1.87.11 3.03 1.18 3.85 2.12-3.16 1.88-2.58 5.75.96 7.42-.76 1.8-1.57 3.06-2.67 3.64M12.03 7.25c-.25-2.19 2.01-3.66 4.09-3.82.35 2.47-2.08 4.08-4.09 3.82z" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-white/20"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">Or continue with email</span>
                        <div className="flex-grow border-t border-white/20"></div>
                    </div>

                    <input
                        type="email"
                        className="w-full rounded-lg bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleEmailSignUp()}
                        disabled={loading}
                    />
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            className="w-full rounded-lg bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all pr-12"
                            placeholder="Password (8+ chars, number, uppercase, special char)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleEmailSignUp()}
                            disabled={loading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Password Criteria Checklist */}
                    {password && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            {passwordCriteria.map((criterion, index) => (
                                <div key={index} className={`flex items-center gap-1.5 ${criterion.met ? 'text-green-400' : 'text-gray-400'}`}>
                                    {criterion.met ? (
                                        <Check className="w-3 h-3" />
                                    ) : (
                                        <div className="w-3 h-3 rounded-full border border-gray-500" />
                                    )}
                                    <span>{criterion.label}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="relative">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            className="w-full rounded-lg bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all pr-12"
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleEmailSignUp()}
                            disabled={loading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-white transition-colors"
                        >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Date of Birth Selection */}
                    <div className="space-y-2">
                        <label className="text-sm text-gray-300 ml-1">Date of Birth</label>
                        <div className="grid grid-cols-3 gap-2">
                            <select
                                value={dobMonth}
                                onChange={(e) => setDobMonth(e.target.value)}
                                className="w-full rounded-lg bg-white/10 backdrop-blur-md border border-white/20 px-3 py-4 text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all appearance-none cursor-pointer"
                                disabled={loading}
                            >
                                <option value="" className="text-black">Month</option>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m} className="text-black">
                                        {new Date(0, m - 1).toLocaleString('default', { month: 'short' })}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="number"
                                placeholder="Day"
                                min="1"
                                max="31"
                                value={dobDay}
                                onChange={(e) => setDobDay(e.target.value)}
                                className="w-full rounded-lg bg-white/10 backdrop-blur-md border border-white/20 px-4 py-4 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all text-center"
                                disabled={loading}
                            />
                            <input
                                type="number"
                                placeholder="Year"
                                min="1900"
                                max={new Date().getFullYear()}
                                value={dobYear}
                                onChange={(e) => setDobYear(e.target.value)}
                                className="w-full rounded-lg bg-white/10 backdrop-blur-md border border-white/20 px-4 py-4 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all text-center"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Terms Checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer p-3 bg-white/5 rounded-lg border border-white/10 mt-4">
                        <input
                            type="checkbox"
                            checked={acceptTerms}
                            onChange={(e) => setAcceptTerms(e.target.checked)}
                            className="mt-1 w-4 h-4 rounded border-gray-600 text-teal-500 focus:ring-teal-500 focus:ring-offset-0 bg-transparent"
                            disabled={loading}
                        />
                        <span className="text-sm text-gray-300">
                            I agree to Weeve's <a href="/terms" className="text-teal-400 hover:text-teal-300 underline">Terms of Service</a>.
                        </span>
                    </label>

                    <button
                        onClick={handleEmailSignUp}
                        disabled={loading}
                        className="w-full rounded-lg bg-white text-black py-4 font-bold text-lg transition-all hover:bg-gray-100 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Creating account..." : "Sign Up"}
                    </button>


                    <p className="mt-6 text-center text-sm text-gray-300">
                        Already have an account?{" "}
                        <a
                            href="/login"
                            className="text-white font-semibold underline hover:text-gray-200 transition-colors"
                        >
                            Log in
                        </a>
                    </p>

                    {/* <p className="mt-4 text-center text-sm text-gray-400">
                        Are you a brand?{" "}
                        <a
                            href="/brand-signup"
                            className="text-[#EC1D99] font-semibold underline hover:text-pink-400 transition-colors"
                        >
                            Create a Brand Account
                        </a>
                    </p> */}
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
