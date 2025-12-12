"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createUserProfile } from "@/lib/auth";
import { useAuth } from "@/app/components/AuthProvider";
import { capturePhoto } from "@/lib/camera";
import { supabase } from "@/lib/supabase";
import { Camera, Check, X, Loader2 } from "lucide-react";

export default function SetupPage() {
    const router = useRouter();
    const { user } = useAuth();

    const [displayName, setDisplayName] = useState(user?.user_metadata?.name || "");
    const [avatar, setAvatar] = useState("");
    const [uploadedAvatarFile, setUploadedAvatarFile] = useState<File | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [checkingUsername, setCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

    // Check username availability with debounce
    useEffect(() => {
        const trimmedName = displayName.trim();

        if (!trimmedName) {
            setUsernameAvailable(null);
            return;
        }

        // Validate username format (alphanumeric and underscore only)
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(trimmedName)) {
            setUsernameAvailable(false);
            return;
        }

        const checkUsername = async () => {
            setCheckingUsername(true);
            try {
                // Use exact match with case-insensitive comparison
                const { data, error } = await supabase
                    .from('profiles')
                    .select('user_id')
                    .eq('name', trimmedName)
                    .maybeSingle();

                if (error && error.code !== 'PGRST116') {
                    // PGRST116 is "no rows returned" which is fine
                    throw error;
                }

                setUsernameAvailable(!data);
            } catch (err) {
                console.error('[Setup] Error checking username:', err);
                setUsernameAvailable(null);
            } finally {
                setCheckingUsername(false);
            }
        };

        const timeoutId = setTimeout(checkUsername, 500);
        return () => clearTimeout(timeoutId);
    }, [displayName]);

    const handleAvatarClick = () => {
        setShowAvatarPicker(true);
    };

    const handleMediaSelect = async (source: 'camera' | 'gallery') => {
        setShowAvatarPicker(false);
        try {
            const file = await capturePhoto(source);
            if (file) {
                setUploadedAvatarFile(file);
                // Create preview URL
                const previewUrl = URL.createObjectURL(file);
                setAvatar(previewUrl);
            }
        } catch (error) {
            console.error('Error capturing photo:', error);
            setError('Failed to capture photo');
        }
    };

    const uploadAvatarToStorage = async (file: File, userId: string): Promise<string | null> => {
        try {
            setUploadingAvatar(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}-${Date.now()}.${fileExt}`;
            const filePath = `user-avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, {
                    upsert: true,
                    cacheControl: '3600',
                    contentType: file.type,
                });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            return urlData.publicUrl;
        } catch (err) {
            console.error('[Setup] Avatar upload error:', err);
            throw err;
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleComplete = async () => {
        if (!displayName.trim()) {
            setError("Please enter a username");
            return;
        }

        if (usernameAvailable === false) {
            setError("This username is already taken");
            return;
        }

        if (!user) {
            setError("No user found");
            return;
        }

        setLoading(true);
        setError("");

        try {
            let finalAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;

            // Upload avatar if a file was selected
            if (uploadedAvatarFile) {
                const uploadedUrl = await uploadAvatarToStorage(uploadedAvatarFile, user.id);
                if (uploadedUrl) {
                    finalAvatar = uploadedUrl;
                }
            }

            const referrerCode = localStorage.getItem('weeve_invite_code') || undefined;

            const { error: profileError } = await createUserProfile(
                user.id,
                displayName.trim(),
                finalAvatar,
                undefined, // inviteCode (auto-generated)
                referrerCode,
                user.user_metadata?.date_of_birth
            );

            // Clear invite code
            if (referrerCode) {
                localStorage.removeItem('weeve_invite_code');
            }

            if (profileError) throw profileError;

            // Redirect to onboarding story tutorial
            router.push("/onboarding/prompt");
        } catch (err: any) {
            console.error('[Setup] Error:', err);
            setError(err.message || "Failed to complete profile setup");
            setLoading(false);
        }
    };

    const getUsernameStatusIcon = () => {
        if (!displayName.trim()) return null;
        if (checkingUsername) return <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />;
        if (usernameAvailable === true) return <Check className="w-5 h-5 text-green-500" />;
        if (usernameAvailable === false) return <X className="w-5 h-5 text-red-500" />;
        return null;
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

                    {/* Avatar Upload */}
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div
                                onClick={handleAvatarClick}
                                className="relative w-32 h-32 rounded-full border-4 border-white/20 overflow-hidden cursor-pointer group"
                            >
                                <img
                                    src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
                                    alt="Avatar Preview"
                                    className="w-full h-full object-cover"
                                />
                                {uploadingAvatar && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                                    </div>
                                )}
                                {!uploadingAvatar && (
                                    <>
                                        {/* Always visible camera icon */}
                                        <div className="absolute bottom-0 right-0 bg-[#EC1D99] p-2.5 rounded-full border-2 border-black group-hover:scale-110 transition-transform">
                                            <Camera className="w-5 h-5 text-white" />
                                        </div>
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-sm font-medium text-white">Change Photo</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Username Input with @ prefix */}
                    <div className="relative">
                        <div className="flex items-center w-full rounded-lg bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4">
                            <span className="text-white text-lg mr-1">@</span>
                            <input
                                type="text"
                                className="flex-1 bg-transparent text-white placeholder-gray-300 focus:outline-none"
                                placeholder="username"
                                value={displayName}
                                onChange={(e) => {
                                    // Only allow alphanumeric and underscore, no spaces
                                    const sanitized = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                                    setDisplayName(sanitized);
                                }}
                                onKeyPress={(e) => e.key === 'Enter' && handleComplete()}
                                disabled={loading}
                            />
                            <div className="ml-2">
                                {getUsernameStatusIcon()}
                            </div>
                        </div>
                        {displayName.trim() && !/^[a-zA-Z0-9_]+$/.test(displayName.trim()) && (
                            <p className="mt-1 text-xs text-red-400 ml-1">Username can only contain letters, numbers, and underscores</p>
                        )}
                        {displayName.trim() && /^[a-zA-Z0-9_]+$/.test(displayName.trim()) && usernameAvailable === false && (
                            <p className="mt-1 text-xs text-red-400 ml-1">This username is already taken</p>
                        )}
                        {displayName.trim() && /^[a-zA-Z0-9_]+$/.test(displayName.trim()) && usernameAvailable === true && (
                            <p className="mt-1 text-xs text-green-400 ml-1">Username available!</p>
                        )}
                    </div>

                    <button
                        onClick={handleComplete}
                        disabled={loading || uploadingAvatar || usernameAvailable === false || !displayName.trim()}
                        className="w-full rounded-lg bg-white text-black py-4 font-bold text-lg transition-all hover:bg-gray-100 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading || uploadingAvatar ? "Setting up..." : "Complete Setup"}
                    </button>
                </div>
            </div>

            {/* Avatar Picker Modal */}
            {showAvatarPicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
                    <div className="bg-gray-900 rounded-lg p-6 w-full max-w-sm mx-4">
                        <h3 className="text-xl font-bold text-white mb-4">Choose Photo Source</h3>
                        <div className="space-y-3">
                            <button
                                onClick={() => handleMediaSelect('camera')}
                                className="w-full flex items-center gap-3 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition-colors"
                            >
                                <Camera className="w-5 h-5" />
                                <span>Take Photo</span>
                            </button>
                            <button
                                onClick={() => handleMediaSelect('gallery')}
                                className="w-full flex items-center gap-3 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>Choose from Gallery</span>
                            </button>
                            <button
                                onClick={() => setShowAvatarPicker(false)}
                                className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
