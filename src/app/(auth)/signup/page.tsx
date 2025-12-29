"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp, signInWithGoogle } from "@/lib/auth";
import { Eye, EyeOff, Check, X } from "lucide-react";

export default function SignUpPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);


    const [acceptTerms, setAcceptTerms] = useState(false);

    // DOB State
    const [dobDay, setDobDay] = useState("");
    const [dobMonth, setDobMonth] = useState("");
    const [dobYear, setDobYear] = useState("");

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

            // AuthProvider will redirect to /setup for new users

        } catch (error) {
            console.error('[Signup] Error:', error);
            const message = error instanceof Error ? error.message : null;
            setError(message || "Failed to create account");
        } finally {
            setLoading(false);
        }
    };

    // ... [OMITTED Google Auth Code which is commented out in original] ...

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
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-green-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-teal-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
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

                    {/* [Inputs OMITTED as they are unchanged] */}

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
                            I agree to Weeve's <a href="/terms" className="text-teal-400 hover:text-teal-300 underline">Terms of Service</a> and <a href="/partnership" className="text-teal-400 hover:text-teal-300 underline">Partnership Agreement</a>.
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
