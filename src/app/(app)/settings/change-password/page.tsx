"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Eye, EyeOff, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function ChangePasswordPage() {
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    // Null = loading, true = google-only, false = not google-only
    const [isGoogleOnly, setIsGoogleOnly] = useState<boolean | null>(null);

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

    const validatePassword = (password: string): string | null => {
        if (password.length < 8) {
            return "Password must be at least 8 characters long";
        }
        if (!/[A-Z]/.test(password)) {
            return "Password must contain at least one uppercase letter";
        }
        if (!/[a-z]/.test(password)) {
            return "Password must contain at least one lowercase letter";
        }
        if (!/[0-9]/.test(password)) {
            return "Password must contain at least one number";
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Prevent submission if Google-only
        if (isGoogleOnly) {
            toast.error("Password is managed via Google for this account");
            return;
        }

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error("Please fill in all fields");
            return;
        }

        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            toast.error(passwordError);
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        if (currentPassword === newPassword) {
            toast.error("New password must be different from current password");
            return;
        }

        setIsUpdating(true);

        try {
            // Get current user's email
            const { data: userData, error: getUserError } = await supabase.auth.getUser();
            if (getUserError || !userData.user?.email) {
                throw new Error("Unable to get user information");
            }

            // Verify current password by attempting to sign in with it
            const { error: verifyError } = await supabase.auth.signInWithPassword({
                email: userData.user.email,
                password: currentPassword,
            });

            if (verifyError) {
                // If sign-in fails, the current password is wrong
                if (verifyError.message.includes("Invalid login credentials")) {
                    throw new Error("Current password is incorrect");
                }
                throw new Error("Unable to verify current password");
            }

            // Update password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) throw updateError;

            toast.success("Password updated successfully");

            // Clear form
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            // Navigate back after a short delay
            setTimeout(() => {
                router.back();
            }, 1500);
        } catch (error: any) {
            console.error("Password update error:", error);
            toast.error(error.message || "Failed to update password");
        } finally {
            setIsUpdating(false);
        }
    };

    const getPasswordStrength = (password: string): { strength: string; color: string; width: string } => {
        if (!password) return { strength: "", color: "", width: "0%" };

        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        if (score <= 2) return { strength: "Weak", color: "bg-red-500", width: "33%" };
        if (score <= 4) return { strength: "Medium", color: "bg-yellow-500", width: "66%" };
        return { strength: "Strong", color: "bg-green-500", width: "100%" };
    };

    const passwordStrength = getPasswordStrength(newPassword);

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
                <h1 className="font-bold text-lg">Change Password</h1>
            </div>

            <div className="p-6">
                <div className="max-w-md mx-auto">
                    {isGoogleOnly === null ? (
                        <div className="text-gray-500">Loading...</div>
                    ) : isGoogleOnly ? (
                        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <Lock className="w-5 h-5 text-[#EC1D99] flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-sm mb-1">Password managed by Google</h3>
                                    <p className="text-xs text-gray-400">Your password is managed by Google. Manage it at <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-[#EC1D99] underline">Google Account</a></p>
                                </div>
                            </div>

                            <div className="mt-4">
                                <button onClick={() => router.back()} className="w-full bg-gray-800 text-white font-bold py-3 rounded-lg hover:bg-gray-700 transition-colors">Back</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Info Box */}
                            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <Lock className="w-5 h-5 text-[#EC1D99] flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-sm mb-1">Password Requirements</h3>
                                        <ul className="text-xs text-gray-400 space-y-1">
                                            <li>• At least 8 characters long</li>
                                            <li>• Contains uppercase and lowercase letters</li>
                                            <li>• Contains at least one number</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Current Password */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Current Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showCurrent ? "text" : "password"}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:border-[#EC1D99] transition-colors"
                                            placeholder="Enter current password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrent(!showCurrent)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                        >
                                            {showCurrent ? (
                                                <EyeOff className="w-5 h-5" />
                                            ) : (
                                                <Eye className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* New Password */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showNew ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:border-[#EC1D99] transition-colors"
                                            placeholder="Enter new password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNew(!showNew)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                        >
                                            {showNew ? (
                                                <EyeOff className="w-5 h-5" />
                                            ) : (
                                                <Eye className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                    {newPassword && (
                                        <div className="mt-2">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="text-gray-500">Password Strength</span>
                                                <span className={passwordStrength.strength === "Strong" ? "text-green-500" : passwordStrength.strength === "Medium" ? "text-yellow-500" : "text-red-500"}>
                                                    {passwordStrength.strength}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className={`h-full ${passwordStrength.color} transition-all duration-300`}
                                                    style={{ width: passwordStrength.width }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Confirm New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirm ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:border-[#EC1D99] transition-colors"
                                            placeholder="Confirm new password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                        >
                                            {showConfirm ? (
                                                <EyeOff className="w-5 h-5" />
                                            ) : (
                                                <Eye className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                    {confirmPassword && newPassword !== confirmPassword && (
                                        <p className="text-xs text-red-500 mt-1.5">
                                            Passwords do not match
                                        </p>
                                    )}
                                </div>

                                {/* Buttons */}
                                <div className="space-y-3 pt-4">
                                    <button
                                        type="submit"
                                        disabled={isUpdating || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                                        className={`w-full ${isUpdating || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword
                                            ? 'bg-gray-600 cursor-not-allowed'
                                            : 'bg-[#EC1D99] hover:bg-[#EC1D99]/90'
                                            } text-white font-bold py-3 rounded-lg transition-colors`}
                                    >
                                        {isUpdating ? 'Updating Password...' : 'Update Password'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => router.back()}
                                        className="w-full bg-gray-800 text-white font-bold py-3 rounded-lg hover:bg-gray-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
