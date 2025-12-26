"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp, checkDisplayNameAvailability, checkBrandWebsiteAvailability } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { Building2, Globe, Mail, Lock, ArrowRight, CheckCircle2, Eye, EyeOff, X, Loader2, AlertCircle, Check } from "lucide-react";
import { BLOCKED_DOMAINS } from "@/lib/blocked-domains";

export default function BrandSignUpPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [brandName, setBrandName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [websiteUrl, setWebsiteUrl] = useState("");
    const [acceptTerms, setAcceptTerms] = useState(false);

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<1 | 2>(1); // Step 1: Brand info, Step 2: Account credentials
    const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
    const [faviconLoading, setFaviconLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Validation State
    const [checkingBrandName, setCheckingBrandName] = useState(false);
    const [brandNameAvailable, setBrandNameAvailable] = useState<boolean | null>(null);
    const [checkingWebsite, setCheckingWebsite] = useState(false);
    const [websiteAvailable, setWebsiteAvailable] = useState<boolean | null>(null);

    // Store ref code from URL parameter
    useEffect(() => {
        const ref = searchParams?.get('ref');
        if (ref) {
            localStorage.setItem('weeve_invite_code', ref);
        }
    }, [searchParams]);

    const validateWebsiteUrl = (url: string): boolean => {
        try {
            // Add protocol if missing
            let testUrl = url;
            if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
                testUrl = 'https://' + testUrl;
            }
            new URL(testUrl);
            return true;
        } catch {
            return false;
        }
    };

    const normalizeWebsiteUrl = (url: string): string => {
        let normalized = url.trim();
        if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
            normalized = 'https://' + normalized;
        }
        return normalized;
    };

    // Extract domain from URL for favicon fetching
    const extractDomain = (url: string): string | null => {
        try {
            const normalized = normalizeWebsiteUrl(url);
            const urlObj = new URL(normalized);
            return urlObj.hostname;
        } catch {
            return null;
        }
    };

    // Check Brand Name Availability
    useEffect(() => {
        const trimmedName = brandName.trim();
        if (!trimmedName) {
            setBrandNameAvailable(null);
            return;
        }

        const checkName = async () => {
            setCheckingBrandName(true);
            try {
                const { available, error } = await checkDisplayNameAvailability(trimmedName);
                if (error) throw error;
                setBrandNameAvailable(available);
            } catch (err) {
                console.error('Error checking brand name:', err);
                setBrandNameAvailable(null);
            } finally {
                setCheckingBrandName(false);
            }
        };

        const timeoutId = setTimeout(checkName, 500);
        return () => clearTimeout(timeoutId);
    }, [brandName]);

    // Check Website Availability
    useEffect(() => {
        const trimmedUrl = websiteUrl.trim();
        // Basic length check to avoid checking empty/short inputs
        if (trimmedUrl.length < 4) {
            setWebsiteAvailable(null);
            return;
        }

        const checkWebsite = async () => {
            setCheckingWebsite(true);
            try {
                const { available, error } = await checkBrandWebsiteAvailability(trimmedUrl);
                if (error) throw error;
                setWebsiteAvailable(available);
            } catch (err) {
                console.error('Error checking website:', err);
                setWebsiteAvailable(null);
            } finally {
                setCheckingWebsite(false);
            }
        };

        const timeoutId = setTimeout(checkWebsite, 500);
        return () => clearTimeout(timeoutId);
    }, [websiteUrl]);

    // Debounced favicon fetch when website URL changes
    useEffect(() => {
        const domain = extractDomain(websiteUrl);
        if (!domain || websiteUrl.trim().length < 4) {
            setFaviconUrl(null);
            return;
        }

        setFaviconLoading(true);
        const timeoutId = setTimeout(() => {
            // Use Google's favicon service - reliable and handles most sites
            const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

            // Test if the favicon loads
            const img = new Image();
            img.onload = () => {
                setFaviconUrl(googleFaviconUrl);
                setFaviconLoading(false);
            };
            img.onerror = () => {
                // Fallback: try direct favicon.ico
                const directFaviconUrl = `https://${domain}/favicon.ico`;
                const fallbackImg = new Image();
                fallbackImg.onload = () => {
                    setFaviconUrl(directFaviconUrl);
                    setFaviconLoading(false);
                };
                fallbackImg.onerror = () => {
                    setFaviconUrl(null);
                    setFaviconLoading(false);
                };
                fallbackImg.src = directFaviconUrl;
            };
            img.src = googleFaviconUrl;
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [websiteUrl]);

    const passwordCriteria = [
        { label: "At least 8 characters", met: password.length >= 8 },
        { label: "At least one lowercase letter", met: /[a-z]/.test(password) },
        { label: "At least one uppercase letter", met: /[A-Z]/.test(password) },
        { label: "At least one number", met: /[0-9]/.test(password) },
        { label: "At least one special character", met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
    ];

    const isPasswordValid = passwordCriteria.every(c => c.met);



    const isBusinessEmail = (email: string): boolean => {
        const emailLower = email.toLowerCase().trim();
        const domain = emailLower.split('@')[1];
        if (!domain) return false;
        return !BLOCKED_DOMAINS.includes(domain);
    };

    const handleStep1Submit = () => {
        if (!brandName.trim()) {
            setError("Please enter your brand name");
            return;
        }
        if (!websiteUrl.trim()) {
            setError("Please enter your website URL");
            return;
        }
        if (!validateWebsiteUrl(websiteUrl)) {
            setError("Please enter a valid website URL");
            return;
        }

        // Validation Checks
        if (checkingBrandName || checkingWebsite) {
            // Silently wait or show global loading? 
            // For now, let's just return to prevent moving forward while checking
            return;
        }

        if (brandNameAvailable === false) {
            setError("Brand name is already taken");
            return;
        }

        if (websiteAvailable === false) {
            setError("Website is already registered");
            return;
        }

        setError("");
        setStep(2);
    };

    const handleBrandSignUp = async () => {
        if (!email || !password) {
            setError("Please fill in all fields");
            return;
        }

        // Validate business email (no consumer domains)
        if (!isBusinessEmail(email)) {
            setError("Brand accounts require a business email address. Personal emails (Gmail, Hotmail, Yahoo, etc.) are not allowed.");
            return;
        }

        // Validate password using our criteria
        if (!isPasswordValid) {
            setError("Please verify that your password meets all requirements");
            return;
        }

        if (!acceptTerms) {
            setError("Please accept the brand terms of service");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // 1. Create the auth user
            const { user, error: authError } = await signUp(email, password, brandName);

            if (authError) throw authError;
            if (!user) throw new Error('Signup failed');

            // 2. Create brand profile with ALL brand fields in a single atomic operation
            const normalizedUrl = normalizeWebsiteUrl(websiteUrl);
            const inviteCode = `${brandName.toUpperCase().slice(0, 3)}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    user_id: user.id,
                    name: brandName,
                    avatar: faviconUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
                    tokens: 100,
                    invite_code: inviteCode,
                    onboarding_step: 1,
                    completed_onboarding: false,
                    // Brand-specific fields
                    is_brand: true,
                    brand_website: normalizedUrl,
                    brand_verified: false,
                    brand_subscription_status: 'none',
                }, { onConflict: 'user_id' });

            if (profileError) {
                console.error('[BrandSignup] Failed to create brand profile:', profileError);

                // Handle duplicate name error specifically
                if (profileError.message?.includes('unique_display_name') || profileError.code === '23505') {
                    // Sign out since we can't complete the profile
                    await supabase.auth.signOut();
                    throw new Error(`The brand name "${brandName}" is already taken. Please choose another.`);
                }

                // For other errors, throw them
                throw profileError;
            }

            console.log('[BrandSignup] Brand account created successfully, redirecting...');

            // 3. Manually update store to prevent race conditions with AuthProvider
            // AuthProvider might have synced a "default" profile if it beat us to the DB.
            // We overwrite it here with the correct brand data to ensure the UI is perfect.
            useStore.getState().setCurrentUser({
                id: user.id,
                name: brandName,
                avatar: faviconUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
                tagline: undefined,
                tokens: 100,
                inviteCode: inviteCode,
                isBrand: true,
                brandWebsite: normalizedUrl,
                brandSubscriptionStatus: 'none',
                completedOnboarding: false,
                onboardingStep: 1,
            });

            // 4. Brand profile is complete - skip setup page and go directly to onboarding
            // The profile already has name, avatar, and all brand fields set
            router.push('/onboarding/welcome');

        } catch (error) {
            console.error('[BrandSignup] Error:', error);
            const message = error instanceof Error ? error.message : null;
            setError(message || "Failed to create brand account");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
            {/* Animated Background - Brand themed (purple/pink gradient) */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -inset-[10px] opacity-30">
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-[#EC1D99] rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
                </div>
            </div>

            {/* Brand Signup Form */}
            <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center">
                <div className="mb-6 flex items-center gap-3">
                    <img
                        src="/weeve-logo.png"
                        alt="Weeve Logo"
                        className="w-16 h-16 object-contain"
                    />
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#EC1D99]/20 to-purple-500/20 rounded-full border border-[#EC1D99]/30">
                        <Building2 className="w-4 h-4 text-[#EC1D99]" />
                        <span className="text-sm font-medium text-white">Brand Account</span>
                    </div>
                </div>

                <h1 className="mb-2 text-center text-3xl font-bold text-white">
                    {step === 1 ? "Create Brand Account" : "Account Credentials"}
                </h1>
                <p className="mb-8 text-center text-gray-400 text-sm">
                    {step === 1
                        ? "Set up your brand presence on Weeve with Canon and Seed posts"
                        : "Secure your brand account with email and password"
                    }
                </p>

                {/* Progress Steps */}
                <div className="flex items-center gap-3 mb-8">
                    <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#EC1D99]' : 'text-gray-500'}`}>
                        {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">1</div>}
                        <span className="text-sm font-medium">Brand Info</span>
                    </div>
                    <div className="w-8 h-0.5 bg-gray-700" />
                    <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#EC1D99]' : 'text-gray-500'}`}>
                        <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">2</div>
                        <span className="text-sm font-medium">Credentials</span>
                    </div>
                </div>

                <div className="w-full space-y-4">
                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {step === 1 ? (
                        <>
                            {/* Brand Name - Show favicon if available */}
                            <div className="space-y-1">
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                                        {faviconUrl ? (
                                            <img
                                                src={faviconUrl}
                                                alt="Brand favicon"
                                                className="w-6 h-6 rounded object-contain"
                                            />
                                        ) : faviconLoading ? (
                                            <div className="w-6 h-6 rounded bg-gray-600 animate-pulse" />
                                        ) : (
                                            <Building2 className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        className={`w-full rounded-lg bg-white/10 border pl-12 pr-10 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${brandNameAvailable === false
                                            ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500'
                                            : brandNameAvailable === true
                                                ? 'border-green-500/50 focus:ring-green-500/50 focus:border-green-500'
                                                : 'border-white/20 focus:ring-[#EC1D99]/50 focus:border-[#EC1D99]'
                                            }`}
                                        placeholder="Brand Name"
                                        value={brandName}
                                        onChange={(e) => setBrandName(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleStep1Submit()}
                                    />
                                    {/* Brand Name Status Icon */}
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                                        {brandName && (
                                            checkingBrandName ? (
                                                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                                            ) : brandNameAvailable === true ? (
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            ) : brandNameAvailable === false ? (
                                                <X className="w-5 h-5 text-red-500" />
                                            ) : null
                                        )}
                                    </div>
                                </div>
                                {brandNameAvailable === false && (
                                    <p className="text-xs text-red-400 ml-1">
                                        This brand name is already taken. Please choose another.
                                    </p>
                                )}
                            </div>

                            {/* Website URL with https:// prefix - always visible */}
                            <div className="space-y-1">
                                <div className="relative">
                                    {/* Always show https:// prefix with z-10 to stay above input */}
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10 pointer-events-none">
                                        {faviconUrl ? (
                                            <img
                                                src={faviconUrl}
                                                alt="Website favicon"
                                                className="w-5 h-5 rounded object-contain"
                                            />
                                        ) : faviconLoading ? (
                                            <div className="w-5 h-5 rounded bg-gray-600 animate-pulse" />
                                        ) : null}
                                        <span className="text-sm text-gray-400 font-mono">https://</span>
                                    </div>
                                    <input
                                        type="text"
                                        className={`w-full rounded-lg bg-white/10 border py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${faviconUrl || faviconLoading ? 'pl-[130px]' : 'pl-[90px]'} pr-10 ${websiteAvailable === false
                                            ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500'
                                            : websiteAvailable === true
                                                ? 'border-green-500/50 focus:ring-green-500/50 focus:border-green-500'
                                                : 'border-white/20 focus:ring-[#EC1D99]/50 focus:border-[#EC1D99]'
                                            }`}
                                        placeholder="yourbrand.com"
                                        value={websiteUrl}
                                        onChange={(e) => {
                                            // Strip https:// or http:// if user pastes full URL
                                            let value = e.target.value;
                                            value = value.replace(/^https?:\/\//i, '');
                                            setWebsiteUrl(value);
                                        }}
                                        onKeyPress={(e) => e.key === 'Enter' && handleStep1Submit()}
                                    />
                                    {/* Website Status Icon */}
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                                        {websiteUrl && (
                                            checkingWebsite ? (
                                                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                                            ) : websiteAvailable === true ? (
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            ) : websiteAvailable === false ? (
                                                <X className="w-5 h-5 text-red-500" />
                                            ) : faviconUrl ? (
                                                // If we have favicon (valid site) but waiting on DB check
                                                // Show nothing until DB check is done
                                                null
                                            ) : null
                                        )}
                                    </div>
                                </div>
                                {websiteAvailable === false && (
                                    <p className="text-xs text-red-400 ml-1">
                                        This website is already registered. Please login instead.
                                    </p>
                                )}
                            </div>

                            {/* Brand Features Preview */}
                            <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-3">
                                <h3 className="text-sm font-semibold text-white">Brand Features Include:</h3>
                                <div className="space-y-2 text-sm text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🎬</span>
                                        <span><strong className="text-white">Canon Posts</strong> - Set immutable story slots</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🌱</span>
                                        <span><strong className="text-white">Seed Posts</strong> - Start stories for your audience</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">📊</span>
                                        <span><strong className="text-white">Analytics</strong> - Track engagement </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleStep1Submit}
                                disabled={checkingBrandName || checkingWebsite || brandNameAvailable === false || websiteAvailable === false}
                                className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#EC1D99] to-purple-600 text-white py-4 font-bold text-lg transition-all hover:opacity-90 active:scale-95 shadow-lg shadow-[#EC1D99]/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                            >
                                {checkingBrandName || checkingWebsite ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Checking...
                                    </>
                                ) : (
                                    <>
                                        Continue
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Email */}
                            <div className="space-y-1">
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                                        <Mail className={`w-5 h-5 ${email && !isBusinessEmail(email) ? 'text-red-400' : 'text-gray-400'}`} />
                                    </div>
                                    <input
                                        type="email"
                                        className={`w-full rounded-lg bg-white/10 border pl-12 pr-6 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${email && !isBusinessEmail(email)
                                            ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500'
                                            : 'border-white/20 focus:ring-[#EC1D99]/50 focus:border-[#EC1D99]'
                                            }`}
                                        placeholder="Business Email (e.g., you@company.com)"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleBrandSignUp()}
                                        disabled={loading}
                                    />
                                    {/* Show warning icon if personal email detected */}
                                    {email && !isBusinessEmail(email) && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                                            <span className="text-red-400 text-lg">⚠️</span>
                                        </div>
                                    )}
                                </div>
                                <p className={`text-xs ml-1 ${email && !isBusinessEmail(email) ? 'text-red-400' : 'text-gray-500'}`}>
                                    {email && !isBusinessEmail(email)
                                        ? '⚠️ Personal emails are not accepted. Please use a business email.'
                                        : 'Personal emails (Gmail, Hotmail, etc.) are not accepted'}
                                </p>
                            </div>

                            {/* Password */}
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                                    <Lock className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="w-full rounded-lg bg-white/10 border border-white/20 pl-12 pr-12 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#EC1D99]/50 focus:border-[#EC1D99] transition-all"
                                    placeholder="Password (8+ chars, uppercase, number, special)"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleBrandSignUp()}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-white transition-colors"
                                    tabIndex={-1}
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



                            {/* Terms Checkbox */}
                            <label className="flex items-start gap-3 cursor-pointer p-3 bg-white/5 rounded-lg border border-white/10">
                                <input
                                    type="checkbox"
                                    checked={acceptTerms}
                                    onChange={(e) => setAcceptTerms(e.target.checked)}
                                    className="mt-1 w-4 h-4 rounded border-gray-600 text-[#EC1D99] focus:ring-[#EC1D99] focus:ring-offset-0 bg-transparent"
                                    disabled={loading}
                                />
                                <span className="text-sm text-gray-400">
                                    I agree to Weeve's <a href="/terms" className="text-[#EC1D99] underline">Terms of Service</a> and <a href="/partnership" className="text-[#EC1D99] underline">Partnership Agreement</a>, including content guidelines for brand posts.
                                </span>
                            </label>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(1)}
                                    disabled={loading}
                                    className="flex-1 rounded-lg bg-white/10 border border-white/20 text-white py-4 font-semibold transition-all hover:bg-white/20 disabled:opacity-50"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleBrandSignUp}
                                    disabled={loading}
                                    className="flex-[2] flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#EC1D99] to-purple-600 text-white py-4 font-bold text-lg transition-all hover:opacity-90 active:scale-95 shadow-lg shadow-[#EC1D99]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? "Creating account..." : "Create Brand Account"}
                                </button>
                            </div>
                        </>
                    )}

                    <p className="mt-6 text-center text-sm text-gray-400">
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            className="text-[#EC1D99] font-semibold underline hover:text-pink-400 transition-colors"
                        >
                            Log in
                        </Link>
                    </p>

                    <p className="text-center text-sm text-gray-500">
                        Looking for a personal account?{" "}
                        <Link
                            href="/signup"
                            className="text-white font-medium underline hover:text-gray-300 transition-colors"
                        >
                            Sign up here
                        </Link>
                    </p>
                </div>
            </div >

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
            `}</style>
        </div >
    );
}
