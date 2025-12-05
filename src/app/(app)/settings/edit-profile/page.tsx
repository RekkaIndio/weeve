"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { updateUserProfile } from "@/lib/auth";
import { uploadMedia } from "@/lib/camera";
import { toast } from "sonner";

export default function EditProfilePage() {
    const router = useRouter();
    const { currentUser, setCurrentUser } = useStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [name, setName] = useState(currentUser?.name || "");
    const [tagline, setTagline] = useState(currentUser?.tagline || "");
    const [avatar, setAvatar] = useState(currentUser?.avatar || "");
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        setIsUploading(true);
        try {
            const result = await uploadMedia(file, 'image');
            if (result.url) {
                setAvatar(result.url);
                toast.success('Avatar uploaded successfully');
            } else {
                throw new Error('Failed to upload avatar');
            }
        } catch (error) {
            console.error('Avatar upload error:', error);
            toast.error('Failed to upload avatar');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!currentUser) return;

        if (!name.trim()) {
            toast.error('Name cannot be empty');
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await updateUserProfile(currentUser.id, {
                name: name.trim(),
                tagline: tagline.trim() || null,
                avatar: avatar || null,
            });

            if (error) throw error;

            // Update local state
            setCurrentUser({
                ...currentUser,
                name: name.trim(),
                tagline: tagline.trim() || undefined,
                avatar: avatar || undefined,
            });

            toast.success('Profile updated successfully');
            router.back();
        } catch (error) {
            console.error('Profile update error:', error);
            toast.error('Failed to update profile');
        } finally {
            setIsSaving(false);
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
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-gray-800">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="font-bold text-lg">Edit Profile</h1>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving || isUploading}
                    className={`${
                        isSaving || isUploading
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-[#EC1D99] hover:bg-[#EC1D99]/90'
                    } text-white font-bold px-6 py-2 rounded-lg transition-colors`}
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
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
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={50}
                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EC1D99] transition-colors"
                            placeholder="Your Name"
                        />
                        <p className="text-xs text-gray-600 mt-1.5">
                            {name.length}/50 characters
                        </p>
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

                    <div className="pt-4">
                        <button
                            onClick={() => router.back()}
                            className="w-full bg-gray-800 text-white font-bold py-3 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
