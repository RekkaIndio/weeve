"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserProfile } from "@/lib/firestore";
import { useAuth } from "@/app/components/AuthProvider";

export default function SetupPage() {
    const router = useRouter();
    const { user } = useAuth();

    const [displayName, setDisplayName] = useState(user?.displayName || "");
    const [avatar, setAvatar] = useState(user?.photoURL || "");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleComplete = async () => {
        if (!displayName.trim()) {
            setError("Please enter your name");
            return;
        }

        if (!user) {
            setError("No user found");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // Update Firebase Auth profile
            await updateProfile(user, {
                displayName: displayName.trim(),
                photoURL: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
            });

            // Create user profile in Firestore
            await createUserProfile(
                user.uid,
                displayName.trim(),
                user.email,
                avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`
            );

            // Redirect to homepage
            router.push("/");
        } catch (err: any) {
            setError(err.message || "Failed to complete profile setup");
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -inset-[10px] opacity-30">
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
                </div>
            </div>

            {/* Setup Form */}
            <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center">
                <div className="mb-6">
                    <img
                        src="/weeve-logo.png"
                        alt="Weeve Logo"
                        className="w-24 h-24 object-contain"
                    />
                </div>
                <h1 className="mb-4 text-center text-4xl font-bold text-white">
                    Complete Your Profile
                </h1>
                <p className="mb-8 text-center text-gray-400">
                    Just a few more details to get you started
                </p>

                <div className="w-full space-y-4">
                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Avatar Preview */}
                    <div className="flex justify-center mb-4">
                        <img
                            src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`}
                            alt="Avatar Preview"
                            className="w-24 h-24 rounded-full border-4 border-white/20"
                        />
                    </div>

                    <input
                        type="text"
                        className="w-full rounded-lg bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                        placeholder="Your display name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleComplete()}
                        disabled={loading}
                    />

                    <input
                        type="text"
                        className="w-full rounded-lg bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                        placeholder="Avatar URL (optional)"
                        value={avatar}
                        onChange={(e) => setAvatar(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleComplete()}
                        disabled={loading}
                    />

                    <div className="p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-300">Starting Balance</span>
                            <div className="flex items-center gap-2 text-yellow-400 font-bold">
                                <span>🪙</span>
                                <span>100 tokens</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleComplete}
                        disabled={loading}
                        className="w-full rounded-lg bg-white text-black py-4 font-bold text-lg transition-all hover:bg-gray-100 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Setting up..." : "Complete Setup"}
                    </button>
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
            `}</style>
        </div>
    );
}
