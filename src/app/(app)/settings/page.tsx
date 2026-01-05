"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, User, Bell, Lock, HelpCircle, LogOut, ChevronRight, Trash2, Sparkles, BarChart3, Receipt, DollarSign, Ban, IdCard, KeyRound, TrendingUp, BookOpen, Scroll, AlertTriangle } from "lucide-react";

import { useStore } from "@/lib/store";
import { signOut, updateUserProfile } from "@/lib/auth";
import { setLatestSession } from "@/lib/auth-session";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
    const router = useRouter();
    const { currentUser, logoutUser, setCurrentUser } = useStore();
    const [isPrivate, setIsPrivate] = useState(currentUser?.isPrivate || false);
    const [isUpdating, setIsUpdating] = useState(false);

    // Null = loading, true = google-only, false = not google-only
    const [isGoogleOnly, setIsGoogleOnly] = useState<boolean | null>(null);

    const [monetizationEnabled, setMonetizationEnabled] = useState(true);

    useEffect(() => {
        if (currentUser?.preferences?.monetization_enabled !== undefined) {
            setMonetizationEnabled(currentUser.preferences.monetization_enabled);
        } else {
            // Default to true if not set
            setMonetizationEnabled(true);
        }
    }, [currentUser?.preferences]);

    const handleMonetizationToggle = async () => {
        if (!currentUser || isUpdating) return;

        setIsUpdating(true);
        const newValue = !monetizationEnabled;

        try {
            // Merge with existing preferences
            const currentPrefs = currentUser.preferences || {};
            const newPrefs = { ...currentPrefs, monetization_enabled: newValue };

            const { error } = await updateUserProfile(currentUser.id, {
                preferences: newPrefs,
                isInfluencer: newValue
            });
            if (error) throw error;

            setMonetizationEnabled(newValue);
            // Update local store optimistically
            setCurrentUser({
                ...currentUser,
                preferences: newPrefs,
                isInfluencer: newValue
            });

            if (!newValue) {
                // toast removed
            } else {
                // toast removed
            }
        } catch (err) {
            console.error('[Settings] Failed to update monetization preference:', err);
            console.error("Failed to update settings");
        } finally {
            setIsUpdating(false);
        }
    };

    useEffect(() => {
        (async () => {
            try {
                const { data: userData } = await supabase.auth.getUser();
                const user = (userData as any)?.user;
                const isGoogle = !!(user?.identities && user.identities.length > 0 && user.identities.every((i: any) => i.provider === 'google'));
                setIsGoogleOnly(isGoogle);
            } catch (err) {
                setIsGoogleOnly(false);
            }
        })();
    }, []);

    const handlePrivacyToggle = async () => {
        if (!currentUser || isUpdating) return;

        setIsUpdating(true);
        const newValue = !isPrivate;

        try {
            const { error } = await updateUserProfile(currentUser.id, { isPrivate: newValue });
            if (error) throw error;

            setIsPrivate(newValue);
            setCurrentUser({ ...currentUser, isPrivate: newValue });
        } catch (err) {
            console.error('[Settings] Failed to update privacy:', err);
        } finally {
            setIsUpdating(false);
        }
    };

    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        // Prevent double-taps
        if (isLoggingOut) return;
        setIsLoggingOut(true);

        try {
            console.log('[Settings] Logging out...');

            // Race between signOut and a timeout - don't let signOut hang forever
            const signOutPromise = signOut();
            const timeoutPromise = new Promise<{ error: Error }>((resolve) => {
                setTimeout(() => {
                    resolve({ error: new Error('Signout timed out after 3 seconds') });
                }, 3000);
            });

            const result = await Promise.race([signOutPromise, timeoutPromise]);

            if (result.error) {
                console.warn('[Settings] Signout issue:', result.error.message);
                // Continue with logout anyway - we'll clear local state
            } else {
                console.log('[Settings] Signout successful');
            }
        } catch (err) {
            console.error('[Settings] Unexpected logout error:', err);
        }

        // ALWAYS clear local state and redirect, even if signOut failed/timed out
        console.log('[Settings] Clearing local state and redirecting to login');
        logoutUser();
        setLatestSession(null); // Clear cached session

        // Clear any cached session state
        try {
            await supabase.auth.signOut({ scope: 'local' });
        } catch (e) {
            // Ignore errors from local signout
        }

        // Force navigation with window.location for reliability on native
        window.location.replace('/login');
    };

    const sections = [
        {
            title: "Account",
            items: [
                { label: "Edit Profile", icon: User, action: () => router.push('/settings/edit-profile') },
                // HIDDEN: Monetization features temporarily disabled
                // { label: "Monetization Features", icon: DollarSign, toggle: true, toggleValue: monetizationEnabled, onToggle: handleMonetizationToggle },
                { label: "Analytics", icon: BarChart3, action: () => router.push('/settings/analytics') },
                { label: "Change Password", icon: KeyRound, action: () => router.push('/settings/change-password') },
            ]
        },
        {
            title: "Notifications",
            items: [
                { label: "Notification Preferences", icon: Bell, action: () => router.push('/settings/notifications') },
            ]
        },
        {
            title: "Privacy",
            items: [
                { label: "Account Information", icon: IdCard, action: () => router.push('/settings/account') },
                { label: "Account Privacy", icon: Lock, toggle: true, description: "When enabled, only approved friends can see your profile and stories" },
                { label: "Blocked Users", icon: Ban, action: () => router.push('/settings/blocked-users') },
            ]
        },
        ...(currentUser?.isBrand ? [{
            title: "Brand",
            items: [
                { label: "Brand Analytics", icon: TrendingUp, action: () => router.push('/analytics') },
                { label: "Transaction History", icon: Receipt, action: () => router.push('/settings/transaction-history') },
            ]
        }] : []),
        {
            title: "Community",
            items: [
                { label: "Weeve World", icon: Sparkles, action: () => router.push('/settings/world-map'), toggle: false }, // Explicit toggle: false to satisfy TS if needed, or just let it default
            ]
        },
        {
            title: "Support",
            items: [
                { label: "How Weeve Works", icon: BookOpen, action: () => router.push('/onboarding/welcome') },
                ...(currentUser?.isBrand ? [{ label: "How Canon & Seed Work", icon: Scroll, action: () => router.push('/settings/brand-tutorial') }] : []),
                { label: "Help Center", icon: HelpCircle, action: () => router.push('/settings/help-center') },
                { label: "Report a Problem", icon: AlertTriangle, action: () => router.push('/settings/report-problem') },
            ]
        }
    ];

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pb-8">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] flex items-center gap-4 border-b border-gray-800">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg">Settings</h1>
            </div>

            <div className="p-4 space-y-6">
                {/* Profile Preview */}
                <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-xl">
                    <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-16 h-16 rounded-full border-2 border-gray-700"
                    />
                    <div>
                        <h2 className="font-bold text-lg">{currentUser.name}</h2>
                        <p className="text-sm text-gray-400">@{currentUser.name.toLowerCase().replace(' ', '_')}</p>
                    </div>
                </div>

                {sections.map((section, idx) => (
                    <div key={idx}>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-2">
                            {section.title}
                        </h3>
                        <div className="bg-gray-900 rounded-xl overflow-hidden">
                            {section.items.filter(item => !(isGoogleOnly && item.label === 'Change Password')).map((item: any, itemIdx) => (
                                <div
                                    key={itemIdx}
                                    className={`flex items-center justify-between p-4 ${itemIdx !== section.items.length - 1 ? 'border-b border-gray-800' : ''
                                        } ${item.action ? 'cursor-pointer hover:bg-gray-800 transition-colors' : ''}`}
                                    onClick={item.action}
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="p-2 rounded-full bg-gray-800 text-gray-400 flex-shrink-0">
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="font-medium">{item.label}</span>
                                            {item.description && (
                                                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                                            )}
                                        </div>
                                    </div>

                                    {item.toggle ? (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (item.onToggle) {
                                                    item.onToggle();
                                                } else if (item.label === "Account Privacy") {
                                                    handlePrivacyToggle();
                                                }
                                            }}
                                            disabled={(isUpdating && item.label === "Account Privacy") || (isUpdating && item.label === "Monetization Features")}
                                            className={`relative w-12 h-6 transition duration-200 ease-in-out rounded-full overflow-hidden ${item.label === "Account Privacy" ? (isPrivate ? 'bg-[#EC1D99]' : 'bg-gray-700') :
                                                item.label === "Monetization Features" ? (monetizationEnabled ? 'bg-[#EC1D99]' : 'bg-gray-700') :
                                                    'bg-gray-700'
                                                } ${isUpdating && (item.label === "Account Privacy" || item.label === "Monetization Features") ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            <span className={`absolute top-1 ${item.label === "Account Privacy" ? (isPrivate ? 'left-7' : 'left-1') :
                                                item.label === "Monetization Features" ? (monetizationEnabled ? 'left-7' : 'left-1') :
                                                    'left-1'
                                                } bg-white w-4 h-4 rounded-full transition-all duration-200`}></span>
                                        </button>
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-gray-600" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className={`w-full p-4 bg-gray-900 rounded-xl flex items-center justify-center gap-2 text-red-500 font-bold transition-colors mt-8 ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'}`}
                >
                    {isLoggingOut ? (
                        <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <LogOut className="w-5 h-5" />
                    )}
                    {isLoggingOut ? 'Logging out...' : 'Log Out'}
                </button>

                <div className="text-center text-xs text-gray-600 mt-8 pb-8">
                    Weeve v1.0.0
                </div>
            </div>
        </div>
    );
}

