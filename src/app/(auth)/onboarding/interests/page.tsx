"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { INTEREST_CATEGORIES } from "@/lib/interests";
import { Check } from "lucide-react";

export default function InterestsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const toggleInterest = (interestId: string) => {
        setSelectedInterests(prev =>
            prev.includes(interestId)
                ? prev.filter(id => id !== interestId)
                : [...prev, interestId]
        );
    };

    const handleContinue = async () => {
        if (!user) return;
        // Allow continuing with empty selection if they wish, or enforce min selection?
        // UI disables button if empty, so enforcing at least 1 via UI.

        setSaving(true);
        try {
            // Get current preferences to merge
            const { data: profile } = await supabase
                .from('profiles')
                .select('preferences')
                .eq('user_id', user.id)
                .single();

            const currentPrefs = profile?.preferences || {};

            // Save preferences to database
            const { error } = await supabase
                .from('profiles')
                .update({
                    preferences: {
                        ...currentPrefs,
                        interests: selectedInterests, // Use 'interests' key to match Settings page
                    },
                    onboarding_step: 2,
                })
                .eq('user_id', user.id);

            if (error) throw error;

            console.log('[Interests] Preferences saved successfully');

            // Navigate to next step
            router.push('/onboarding/prompt');
        } catch (err) {
            console.error('[Interests] Error saving preferences:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleSkip = async () => {
        if (!user) return;

        try {
            // Mark as skipped
            await supabase
                .from('profiles')
                .update({ onboarding_step: 2 })
                .eq('user_id', user.id);

            router.push('/onboarding/prompt');
        } catch (err) {
            console.error('[Interests] Error skipping:', err);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Header */}
            <div className="p-6 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] border-b border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#EC1D99]"></div>
                        <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                        <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                    </div>
                    <span className="text-sm text-gray-400">Step 1 of 3</span>
                </div>
                <h1 className="text-3xl font-bold mb-2">What interests you?</h1>
                <p className="text-gray-400">Select topics to personalize your feed</p>
            </div>

            {/* Interest Grid */}
            <div className="p-6">
                <div className="grid grid-cols-2 gap-3">
                    {INTEREST_CATEGORIES.map((interest) => {
                        const isSelected = selectedInterests.includes(interest.id);
                        return (
                            <button
                                key={interest.id}
                                onClick={() => toggleInterest(interest.id)}
                                className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${isSelected
                                    ? 'border-[var(--interest-color)] bg-[var(--interest-color)]/10'
                                    : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                                    }`}
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
                                    <span className="text-3xl">{interest.icon}</span>
                                    <span className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-gray-300'
                                        }`}>
                                        {interest.label}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 p-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] bg-black/80 backdrop-blur-md">
                <button
                    onClick={handleContinue}
                    disabled={selectedInterests.length === 0 || saving}
                    className="w-full bg-white text-black font-bold py-4 rounded-lg mb-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-gray-100 active:scale-95"
                >
                    {saving ? 'Saving...' : 'Continue'}
                </button>
                <button
                    onClick={handleSkip}
                    className="w-full text-gray-400 hover:text-white transition-colors text-sm"
                >
                    Skip for now
                </button>
            </div>
        </div>
    );
}
