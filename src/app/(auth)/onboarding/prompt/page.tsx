"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Sparkles, ArrowRight } from "lucide-react";

const ONBOARDING_STORY_ID = "00000000-0000-0000-0000-000000000001"; // UUID for the onboarding story
const ONBOARDING_STORY_TITLE = "Welcome to Weeve";
const ONBOARDING_STORY_PROMPT = "Share your first creative moment with the Weeve community. What story are you excited to tell?";

export default function PromptPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [alreadyJoined, setAlreadyJoined] = useState(false);

    useEffect(() => {
        checkIfAlreadyJoined();
    }, [user]);

    const checkIfAlreadyJoined = async () => {
        if (!user) return;

        try {
            // Check if user is already a participant in the onboarding story
            const { data, error } = await supabase
                .from('story_participants')
                .select('id')
                .eq('story_id', ONBOARDING_STORY_ID)
                .eq('user_id', user.id)
                .maybeSingle();

            if (data) {
                setAlreadyJoined(true);
            }
        } catch (err) {
            console.error('[Prompt] Error checking participation:', err);
        }
    };

    const handleJoinStory = async () => {
        if (!user) return;

        setLoading(true);
        try {
            // Add user as participant to the onboarding story
            const { error: participantError } = await supabase
                .from('story_participants')
                .insert({
                    story_id: ONBOARDING_STORY_ID,
                    user_id: user.id,
                    position: 0, // Position doesn't matter for this open story
                });

            if (participantError && participantError.code !== '23505') {
                // Ignore duplicate key errors (already joined)
                throw participantError;
            }

            // Update onboarding step
            await supabase
                .from('profiles')
                .update({ onboarding_step: 2 })
                .eq('user_id', user.id);

            // Redirect to the story page so they can contribute
            router.push(`/story/${ONBOARDING_STORY_ID}`);
        } catch (err) {
            console.error('[Prompt] Error joining story:', err);
            setLoading(false);
        }
    };

    const handleSkip = async () => {
        if (!user) return;

        try {
            await supabase
                .from('profiles')
                .update({ onboarding_step: 2 })
                .eq('user_id', user.id);

            router.push('/onboarding/follows');
        } catch (err) {
            console.error('[Prompt] Error skipping:', err);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            {/* Header */}
            <div className="p-6 border-b border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#EC1D99]"></div>
                        <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                    </div>
                    <span className="text-sm text-gray-400">Step 1 of 2</span>
                </div>
                <h1 className="text-3xl font-bold mb-2">Learn to Stitch Stories</h1>
                <p className="text-gray-400">Complete your first 3-part story by adding the beginning and end</p>
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

                        {/* Tutorial Explanation */}
                        <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                            <h3 className="text-sm font-semibold text-[#EC1D99] mb-2">📚 How Weeve Works:</h3>
                            <p className="text-sm text-gray-300 leading-relaxed">
                                We've started a story with the <strong>middle part</strong>. Your task is to add:
                            </p>
                            <div className="mt-3 space-y-2 text-sm text-gray-400">
                                <div className="flex items-start gap-2">
                                    <span className="text-[#EC1D99] font-bold">1.</span>
                                    <span><strong>The Beginning</strong> - What led to this moment?</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-purple-400 font-bold">2.</span>
                                    <span className="text-gray-500"><strong>The Middle</strong> - Already filled in! ✓</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-[#EC1D99] font-bold">3.</span>
                                    <span><strong>The Ending</strong> - How does it conclude?</span>
                                </div>
                            </div>
                        </div>

                        {/* Prompt */}
                        <p className="text-center leading-relaxed mb-8 text-gray-300">
                            This is "stitching" - the art of weaving stories together collaboratively!
                        </p>

                        {/* Action Button */}
                        <button
                            onClick={handleJoinStory}
                            disabled={loading || alreadyJoined}
                            className="w-full bg-[#EC1D99] hover:bg-[#d61a88] text-white font-bold py-4 rounded-full transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                'Loading...'
                            ) : alreadyJoined ? (
                                'Continue Tutorial'
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
            <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 p-6">
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
