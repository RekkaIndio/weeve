"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check } from "lucide-react";

import { useStore } from "@/lib/store";
import { updateUserProfile } from "@/lib/auth";
import { INTEREST_CATEGORIES, type InterestId } from "@/lib/interests";

export default function InterestsPage() {
    const router = useRouter();
    const { currentUser, setCurrentUser } = useStore();
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Initialize from user preferences
    useEffect(() => {
        if (currentUser?.preferences?.interests) {
            setSelectedInterests(currentUser.preferences.interests);
        }
    }, [currentUser?.preferences?.interests]);

    const toggleInterest = async (interestId: InterestId) => {
        if (!currentUser || isSaving) return;

        const isSelected = selectedInterests.includes(interestId);
        const newInterests = isSelected
            ? selectedInterests.filter(id => id !== interestId)
            : [...selectedInterests, interestId];

        // Optimistic update
        setSelectedInterests(newInterests);
        setIsSaving(true);

        try {
            const currentPrefs = currentUser.preferences || {};
            const newPrefs = { ...currentPrefs, interests: newInterests };

            const { error } = await updateUserProfile(currentUser.id, {
                preferences: newPrefs,
            });

            if (error) throw error;

            // Update local store
            setCurrentUser({
                ...currentUser,
                preferences: newPrefs,
            });
        } catch (err) {
            console.error('[Interests] Failed to save:', err);
            // Revert on error
            setSelectedInterests(selectedInterests);
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
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] flex items-center gap-4 border-b border-gray-800">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="font-bold text-lg">Interests</h1>
                    <p className="text-xs text-gray-500">Personalize your feed</p>
                </div>
            </div>

            <div className="p-4">
                {/* Description */}
                <div className="mb-6">
                    <p className="text-gray-400 text-sm">
                        Select topics you're interested in. We'll use these to show you more relevant content in your feed.
                    </p>
                </div>

                {/* Interest Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {INTEREST_CATEGORIES.map((interest) => {
                        const isSelected = selectedInterests.includes(interest.id);
                        return (
                            <button
                                key={interest.id}
                                onClick={() => toggleInterest(interest.id)}
                                disabled={isSaving}
                                className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${isSelected
                                        ? 'border-[var(--interest-color)] bg-[var(--interest-color)]/10'
                                        : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                                    } ${isSaving ? 'opacity-50' : ''}`}
                                style={{ '--interest-color': interest.color } as React.CSSProperties}
                            >
                                {/* Selection indicator */}
                                {isSelected && (
                                    <div
                                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: interest.color }}
                                    >
                                        <Check className="w-3 h-3 text-white" />
                                    </div>
                                )}

                                {/* Content */}
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-2xl">{interest.icon}</span>
                                    <span className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-gray-300'
                                        }`}>
                                        {interest.label}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer hint */}
                <div className="mt-8 text-center">
                    <p className="text-gray-600 text-xs">
                        Your interests are private and only used to improve your experience
                    </p>
                </div>
            </div>
        </div>
    );
}
