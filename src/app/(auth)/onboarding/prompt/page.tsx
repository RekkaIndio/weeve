"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { createOnboardingStory, getOnboardingStoryId } from "@/lib/onboarding";
import { useStore } from "@/lib/store";
import { Sparkles, ArrowRight } from "lucide-react";

const ONBOARDING_STORY_TITLE = "Your First Weeve Story";
const ONBOARDING_STORY_PROMPT = "Complete this 3-part story! We've added the middle - you add the beginning and ending.";

export default function PromptPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { fetchStories } = useStore();
    const [loading, setLoading] = useState(false);
    const [alreadyJoined, setAlreadyJoined] = useState(false);

    useEffect(() => {
        checkIfAlreadyJoined();
    }, [user]);

    const checkIfAlreadyJoined = async () => {
        if (!user) return;

        try {
            // Check if user already has an onboarding story
            const storyId = await getOnboardingStoryId(user.id);
            if (storyId) {
                setAlreadyJoined(true);
            }
        } catch (err) {
            console.error('[Prompt] Error checking onboarding story:', err);
        }
    };

    const handleJoinStory = async () => {
        if (!user) return;

        setLoading(true);

        // Safety timeout: if navigation doesn't happen within 10s, force redirect
        const safetyTimeout = setTimeout(() => {
            console.warn('[Prompt] Safety timeout triggered - forcing navigation to feed');
            window.location.replace('/feed');
        }, 10000);

        try {
            // Check if user already has an onboarding story
            let storyId = await getOnboardingStoryId(user.id);

            if (storyId) {
                // Story exists - update it to fix mode and current_turn_user_id
                await supabase
                    .from('stories')
                    .update({
                        mode: 'invite',
                        current_turn_user_id: user.id,
                    })
                    .eq('id', storyId);

                // Fetch stories to reload with updated data
                await fetchStories();
            } else {
                // Create a new personalized onboarding story for this user
                const { storyId: newStoryId, error: createError } = await createOnboardingStory(user.id);
                if (createError) throw createError;
                if (!newStoryId) throw new Error('Failed to create onboarding story');
                storyId = newStoryId;

                // Fetch stories to load the new story into the store
                await fetchStories();
            }

            // Update onboarding step
            await supabase
                .from('profiles')
                .update({ onboarding_step: 2 })
                .eq('user_id', user.id);

            clearTimeout(safetyTimeout);

            // Redirect to feed where they'll see the story and tutorial overlay
            // Use hard navigation to ensure proper state refresh
            try {
                router.push('/feed');
                // Fallback after short delay if router.push doesn't trigger navigation
                setTimeout(() => {
                    window.location.replace('/feed');
                }, 500);
            } catch (navErr) {
                console.warn('[Prompt] router.push failed, using fallback:', navErr);
                window.location.replace('/feed');
            }
        } catch (err) {
            console.error('[Prompt] Error creating onboarding story:', err);
            clearTimeout(safetyTimeout);
            setLoading(false);
        }
    };

    const handleSkip = async () => {
        if (!user) return;

        try {
            // Mark onboarding as complete so tutorial never reappears
            await supabase
                .from('profiles')
                .update({
                    onboarding_step: null,
                    completed_onboarding: true
                })
                .eq('user_id', user.id);

            try { if (typeof window !== 'undefined' && user?.id) { localStorage.setItem('weeve_onboarding_overlay_dismissed_' + user.id, 'true'); localStorage.setItem('weeve_onboarding_story_overlay_dismissed_' + user.id, 'true'); } } catch (err) { }

            // Use hard navigation with fallback to ensure we navigate
            try {
                router.push('/onboarding/follows');
                // Fallback after short delay
                setTimeout(() => {
                    window.location.replace('/onboarding/follows');
                }, 500);
            } catch (navErr) {
                console.warn('[Prompt] router.push failed, using fallback:', navErr);
                window.location.replace('/onboarding/follows');
            }
        } catch (err) {
            console.error('[Prompt] Error skipping:', err);
            // Even on error, try to navigate away
            window.location.replace('/onboarding/follows');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            {/* Header */}
            <div className="p-6 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] border-b border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#EC1D99]"></div>
                        <div className="w-2 h-2 rounded-full bg-[#EC1D99]"></div>
                    </div>
                    <span className="text-sm text-gray-400">Step 2 of 2</span>
                </div>
                <h1 className="text-3xl font-bold mb-2">Try It Yourself!</h1>
                <p className="text-gray-400">Complete a 3-part story by adding the beginning and end</p>
            </div>

            {/* Tutorial Card */}
            <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-full max-w-md">
                    {/* Tutorial Story Card */}
                    <div className="bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black border border-white/10 rounded-2xl p-8 shadow-2xl">
                        {/* Icon */}
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-[#EC1D99] to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                                <Sparkles className="w-10 h-10 text-white" />
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl font-bold text-center mb-4 text-white">
                            {ONBOARDING_STORY_TITLE}
                        </h2>

                        {/* Quick Instructions */}
                        <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                            <h3 className="text-sm font-semibold text-[#EC1D99] mb-2">🎯 Your Mission:</h3>
                            <p className="text-sm text-gray-300 leading-relaxed">
                                We've started a story with the <strong>middle part</strong>. Tap the <strong className="text-white">+ button</strong> to add the beginning and ending!
                            </p>
                        </div>

                        {/* Prompt */}
                        <p className="text-center leading-relaxed mb-8 text-gray-300">
                            Let's practice by adding your first weeve to our welcome story! 🎉
                        </p>

                        {/* Action Button */}
                        <button
                            onClick={handleJoinStory}
                            disabled={loading}
                            className="w-full bg-[#EC1D99] hover:bg-[#d61a88] text-white font-bold py-4 rounded-full transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                'Loading...'
                            ) : alreadyJoined ? (
                                <>
                                    <span>Continue Tutorial</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            ) : (
                                <>
                                    <span>Start Tutorial</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>

                        {/* Info Text */}
                        <p className="text-xs text-center text-gray-500 mt-4">
                            You'll add photos, videos, or text to create Parts 1 & 3
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 p-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]">
                <button
                    onClick={handleSkip}
                    className="w-full text-gray-400 hover:text-white transition-colors text-sm"
                >
                    Skip tutorial for now
                </button>
            </div>
        </div>
    );
}
