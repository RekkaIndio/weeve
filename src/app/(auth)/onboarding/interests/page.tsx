"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
    { id: 'adventure', label: 'Adventure', emoji: '🗺️', color: 'from-orange-500 to-red-500' },
    { id: 'romance', label: 'Romance', emoji: '💕', color: 'from-pink-500 to-rose-500' },
    { id: 'mystery', label: 'Mystery', emoji: '🔍', color: 'from-purple-500 to-indigo-500' },
    { id: 'scifi', label: 'Sci-Fi', emoji: '🚀', color: 'from-blue-500 to-cyan-500' },
    { id: 'comedy', label: 'Comedy', emoji: '😂', color: 'from-yellow-500 to-amber-500' },
    { id: 'drama', label: 'Drama', emoji: '🎭', color: 'from-red-500 to-pink-500' },
    { id: 'horror', label: 'Horror', emoji: '👻', color: 'from-gray-700 to-gray-900' },
    { id: 'fantasy', label: 'Fantasy', emoji: '⚔️', color: 'from-purple-600 to-violet-500' },
    { id: 'slice_of_life', label: 'Slice of Life', emoji: '☕', color: 'from-green-500 to-teal-500' },
    { id: 'inspirational', label: 'Inspirational', emoji: '✨', color: 'from-yellow-400 to-orange-400' },
];

const STORY_LENGTHS = [
    { id: 'quick', label: 'Quick', description: '3-5 parts' },
    { id: 'medium', label: 'Medium', description: '6-10 parts' },
    { id: 'epic', label: 'Epic', description: '10+ parts' },
];

const CONTENT_STYLES = [
    { id: 'serious', label: 'Serious', emoji: '🎓' },
    { id: 'lighthearted', label: 'Lighthearted', emoji: '🌈' },
    { id: 'dark', label: 'Dark', emoji: '🌑' },
    { id: 'mixed', label: 'Mixed', emoji: '🎨' },
];

export default function InterestsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [storyLength, setStoryLength] = useState<string>('medium');
    const [contentStyle, setContentStyle] = useState<string>('mixed');
    const [saving, setSaving] = useState(false);

    const toggleCategory = (categoryId: string) => {
        setSelectedCategories(prev =>
            prev.includes(categoryId)
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId]
        );
    };

    const handleContinue = async () => {
        if (selectedCategories.length === 0 || !user) return;

        setSaving(true);
        try {
            // Save preferences to database
            const { error } = await supabase
                .from('profiles')
                .update({
                    preferences: {
                        categories: selectedCategories,
                        story_length: storyLength,
                        content_style: contentStyle,
                    },
                    onboarding_step: 2,
                })
                .eq('user_id', user.id);

            if (error) throw error;

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
        <div className="min-h-screen bg-black text-white pb-20">
            {/* Header */}
            <div className="p-6 border-b border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#EC1D99]"></div>
                        <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                        <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                    </div>
                    <span className="text-sm text-gray-400">Step 1 of 3</span>
                </div>
                <h1 className="text-3xl font-bold mb-2">What stories excite you?</h1>
                <p className="text-gray-400">Select your favorite genres to personalize your experience</p>
            </div>

            {/* Categories Grid */}
            <div className="p-6">
                <div className="grid grid-cols-2 gap-3 mb-8">
                    {CATEGORIES.map(category => (
                        <button
                            key={category.id}
                            onClick={() => toggleCategory(category.id)}
                            className={`relative p-4 rounded-xl transition-all ${selectedCategories.includes(category.id)
                                    ? 'ring-2 ring-[#EC1D99] scale-95'
                                    : 'ring-1 ring-gray-800 hover:ring-gray-700'
                                }`}
                        >
                            <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${category.color} opacity-20`}></div>
                            <div className="relative">
                                <div className="text-4xl mb-2">{category.emoji}</div>
                                <div className="font-semibold text-sm">{category.label}</div>
                            </div>
                            {selectedCategories.includes(category.id) && (
                                <div className="absolute top-2 right-2 w-6 h-6 bg-[#EC1D99] rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Story Length Preference */}
                <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">Preferred Story Length</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {STORY_LENGTHS.map(length => (
                            <button
                                key={length.id}
                                onClick={() => setStoryLength(length.id)}
                                className={`p-3 rounded-lg transition-all ${storyLength === length.id
                                        ? 'bg-[#EC1D99] text-white'
                                        : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                                    }`}
                            >
                                <div className="font-semibold text-sm">{length.label}</div>
                                <div className="text-xs opacity-75">{length.description}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Style */}
                <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">Content Style</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {CONTENT_STYLES.map(style => (
                            <button
                                key={style.id}
                                onClick={() => setContentStyle(style.id)}
                                className={`p-3 rounded-lg transition-all flex items-center gap-2 ${contentStyle === style.id
                                        ? 'bg-[#EC1D99] text-white'
                                        : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                                    }`}
                            >
                                <span className="text-xl">{style.emoji}</span>
                                <span className="font-semibold text-sm">{style.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 p-6">
                <button
                    onClick={handleContinue}
                    disabled={selectedCategories.length === 0 || saving}
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
