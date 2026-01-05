"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera, X, CheckCircle, XCircle, Loader } from "lucide-react";
import { useStore } from "@/lib/store";
import { updateUserProfile, checkDisplayNameAvailability } from "@/lib/auth";
import { uploadMedia } from "@/lib/camera";

import ImageCropper from "@/app/components/ImageCropper";

export default function EditProfilePage() {
    const router = useRouter();
    const { currentUser, setCurrentUser } = useStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [name, setName] = useState(currentUser?.name || "");
    const [tagline, setTagline] = useState(currentUser?.tagline || "");
    const [avatar, setAvatar] = useState(currentUser?.avatar || "");
    const [interactionCost, setInteractionCost] = useState(currentUser?.interactionCost?.toString() || "");
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);

    // Name availability checking
    const [nameAvailability, setNameAvailability] = useState<{
        available: boolean | null;
        loading: boolean;
    }>({ available: null, loading: false });
    const [nameCheckTimeout, setNameCheckTimeout] = useState<NodeJS.Timeout | null>(null);

    // Calculate if name can be changed (14 day cooldown)
    const canChangeName = !currentUser?.lastNameChangeAt ||
        (new Date().getTime() - new Date(currentUser.lastNameChangeAt).getTime()) >= 14 * 24 * 60 * 60 * 1000;

    const daysUntilNameChange = currentUser?.lastNameChangeAt
        ? Math.ceil((14 * 24 * 60 * 60 * 1000 - (new Date().getTime() - new Date(currentUser.lastNameChangeAt).getTime())) / (24 * 60 * 60 * 1000))
        : 0;

    // Debounced name availability check
    const checkNameAvailability = useCallback(async (nameToCheck: string) => {
        if (!nameToCheck.trim()) {
            setNameAvailability({ available: null, loading: false });
            return;
        }

        if (nameToCheck === currentUser?.name) {
            setNameAvailability({ available: null, loading: false });
            return;
        }

        setNameAvailability({ available: null, loading: true });

        try {
            const { available, error } = await checkDisplayNameAvailability(nameToCheck, currentUser?.id);
            if (error) throw error;
            setNameAvailability({ available, loading: false });
        } catch (error) {
            console.error('[EditProfile] Name availability check error:', error);
            setNameAvailability({ available: null, loading: false });
        }
    }, [currentUser?.id, currentUser?.name]);

    // Debounce name checking
    useEffect(() => {
        if (nameCheckTimeout) {
            clearTimeout(nameCheckTimeout);
        }

        const timeout = setTimeout(() => {
            checkNameAvailability(name);
        }, 500); // 500ms debounce

        setNameCheckTimeout(timeout);

        return () => {
            clearTimeout(timeout);
        };
    }, [name, checkNameAvailability]);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;

        if (!file.type.startsWith('image/')) {
            console.error('Please select an image file');
            return;
        }

        const reader = new FileReader();
        reader.addEventListener('load', () => {
            setTempImageSrc(reader.result as string);
        });
        reader.readAsDataURL(file);

        // Reset input so the same file can be selected again
        e.target.value = '';
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        setTempImageSrc(null);
        setIsUploading(true);

        try {
            const file = new File([croppedBlob], `avatar_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const result = await uploadMedia(file, 'image');
            if (result.url) {
                setAvatar(result.url);
                // toast removed
            } else {
                throw new Error('Failed to upload avatar');
            }
        } catch (error) {
            console.error('Avatar upload error:', error);
            console.error('Failed to upload avatar');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!currentUser) return;

        if (!name.trim()) {
            console.error('Name cannot be empty');
            return;
        }

        setIsSaving(true);

        // Check name availability if it's changed
        if (name.trim() !== currentUser.name) {
            // Check cooldown period
            if (!canChangeName) {
                setIsSaving(false);
                return;
            }

            if (nameAvailability.available === false) {
                setIsSaving(false);
                return;
            }
            if (nameAvailability.available === null && !nameAvailability.loading) {
                // If we haven't checked availability yet, do a final check
                const { available, error } = await checkDisplayNameAvailability(name.trim(), currentUser.id);
                if (error) {
                    setIsSaving(false);
                    console.error('Failed to verify name availability');
                    return;
                }
                if (!available) {
                    setIsSaving(false);
                    return;
                }
            }
        }
        try {
            const { error } = await updateUserProfile(currentUser.id, {
                name: name.trim(),
                tagline: tagline.trim() || null,
                avatar: avatar || null,

                interactionCost: null, // Feature removed
            });

            if (error) {
                const errorMessage = (error.message || String(error)).toLowerCase();
                const errorCode = (error as any).code?.toLowerCase() || '';
                const errorHint = (error as any).hint?.toLowerCase() || '';
                const errorDetails = (error as any).details?.toLowerCase() || '';

                const allErrorText = `${errorMessage} ${errorCode} ${errorHint} ${errorDetails}`;

                // Check for name-related errors
                if (allErrorText.includes('display name') ||
                    allErrorText.includes('unique') ||
                    allErrorText.includes('duplicate') ||
                    allErrorText.includes('already exists') ||
                    errorCode === '23505') {
                    setIsSaving(false);
                    return;
                }

                // Check for cooldown errors
                if (allErrorText.includes('name can only be changed') ||
                    allErrorText.includes('14 days') ||
                    allErrorText.includes('cooldown') ||
                    allErrorText.includes('once every')) {
                    setIsSaving(false);
                    return;
                }

                setIsSaving(false);
                console.error('Failed to update profile');
                return;
            }

            // Update local state
            setCurrentUser({
                ...currentUser,
                name: name.trim(),
                tagline: tagline.trim() || undefined,
                avatar: avatar || undefined,

                interactionCost: undefined, // Feature removed
            });

            setIsSaving(false);
            // toast removed
            router.back();
        } catch (err: any) {
            console.error('🔴 CAUGHT ERROR IN NEW CODE:', err);
            console.error('Error type:', typeof err);
            console.error('Error keys:', err ? Object.keys(err) : 'null');

            // Get all possible error text sources
            const errorMessage = (err?.message || err?.error?.message || String(err)).toLowerCase();
            const errorCode = (err?.code || err?.error?.code || '').toLowerCase();
            const errorHint = (err?.hint || err?.error?.hint || '').toLowerCase();
            const errorDetails = (err?.details || err?.error?.details || '').toLowerCase();

            // Log for debugging
            console.log('Checking error text:', { errorMessage, errorCode, errorHint, errorDetails });

            const allErrorText = `${errorMessage} ${errorCode} ${errorHint} ${errorDetails}`;

            // Check for cooldown errors - more permissive matching
            if (errorMessage.includes('name can only be changed') ||
                errorMessage.includes('14 days') ||
                errorMessage.includes('once every 14 days') ||
                allErrorText.includes('14 days') ||
                allErrorText.includes('cooldown') ||
                allErrorText.includes('once every')) {
                console.log('Detected cooldown error - silently returning');
                setIsSaving(false);
                return;
            }

            // Check for name-related errors
            if (errorMessage.includes('display name already exists') ||
                errorMessage.includes('unique') ||
                errorMessage.includes('duplicate') ||
                errorMessage.includes('already exists') ||
                errorCode === '23505' ||
                allErrorText.includes('display name')) {
                console.log('Detected duplicate name error - silently returning');
                setIsSaving(false);
                return;
            }

            console.log('Unhandled error - showing toast');
            setIsSaving(false);
            console.error('Failed to update profile');
        }
    };



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
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] flex items-center border-b border-gray-800">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg">Edit Profile</h1>
            </div>

            <div className="p-6 space-y-6">
                {/* Avatar Section */}
                <div className="flex flex-col items-center">
                    <div className="relative">
                        <img
                            src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`}
                            alt={name}
                            className="w-28 h-28 rounded-full border-4 border-gray-800 object-cover"
                        />
                        <button
                            onClick={handleAvatarClick}
                            disabled={isUploading}
                            className="absolute bottom-0 right-0 bg-[#EC1D99] p-2.5 rounded-full border-2 border-black hover:bg-[#EC1D99]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Camera className="w-5 h-5 text-white" />
                            )}
                        </button>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <p className="text-xs text-gray-500 mt-3">
                        Click to upload a new profile picture
                    </p>
                </div>

                {/* Form Fields */}
                <div className="max-w-md mx-auto space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Display Name
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={50}
                                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EC1D99] transition-colors pr-10"
                                placeholder="Your Name"
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                {nameAvailability.loading ? (
                                    <Loader className="w-5 h-5 text-gray-500 animate-spin" />
                                ) : nameAvailability.available === true ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : nameAvailability.available === false ? (
                                    <XCircle className="w-5 h-5 text-red-500" />
                                ) : null}
                            </div>
                        </div>
                        <div className="mt-1.5 space-y-1">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-600">
                                    {name.length}/50 characters
                                </p>
                                {name.trim() && name !== currentUser?.name && (
                                    <div className="flex items-center gap-1.5">
                                        {nameAvailability.loading && (
                                            <p className="text-xs text-gray-400">Checking...</p>
                                        )}
                                        {nameAvailability.available === true && (
                                            <p className="text-xs text-green-400 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> Available
                                            </p>
                                        )}
                                        {nameAvailability.available === false && (
                                            <p className="text-xs text-red-400 flex items-center gap-1">
                                                <XCircle className="w-3 h-3" /> Already taken
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                            {!canChangeName && name !== currentUser?.name && (
                                <p className="text-xs text-amber-400">
                                    ⚠️ You can change your name in {daysUntilNameChange} day{daysUntilNameChange !== 1 ? 's' : ''}
                                </p>
                            )}
                            <p className="text-xs text-gray-600">
                                Display names must be unique and can only be changed once every 14 days
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Username
                        </label>
                        <div className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-gray-500">
                            @{currentUser.name.toLowerCase().replace(/\s+/g, '_')}
                        </div>
                        <p className="text-xs text-gray-600 mt-1.5">
                            Username is generated from your display name
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Tagline
                        </label>
                        <textarea
                            value={tagline}
                            onChange={(e) => setTagline(e.target.value)}
                            maxLength={150}
                            rows={3}
                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EC1D99] transition-colors resize-none"
                            placeholder="Tell us about yourself... 🌟"
                        />
                        <p className="text-xs text-gray-600 mt-1.5">
                            {tagline.length}/150 characters
                        </p>
                    </div>



                    <div className="pt-4 flex gap-3">
                        <button
                            onClick={() => router.back()}
                            className="flex-1 bg-gray-800 text-white font-bold py-3 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || isUploading}
                            className={`flex-1 ${isSaving || isUploading
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-[#EC1D99] hover:bg-[#EC1D99]/90'
                                } text-white font-bold py-3 rounded-lg transition-colors`}
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>

            {tempImageSrc && (
                <ImageCropper
                    imageSrc={tempImageSrc}
                    onCropComplete={handleCropComplete}
                    onCancel={() => setTempImageSrc(null)}
                    aspect={1}
                />
            )}
        </div>
    );
}
