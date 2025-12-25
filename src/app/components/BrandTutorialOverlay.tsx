"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Lock, Users, Calendar, Sparkles, CheckCircle2, Lightbulb } from "lucide-react";

interface BrandTutorialOverlayProps {
    onDismiss?: () => void;
}

export default function BrandTutorialOverlay({ onDismiss }: BrandTutorialOverlayProps) {
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        {
            title: "Welcome to Brand Posts",
            icon: Sparkles,
            iconColor: "from-[#EC1D99] to-purple-600",
            content: (
                <div className="space-y-4">
                    <p className="text-gray-300 leading-relaxed">
                        Brand posts are powerful tools to create engaging, interactive campaigns with your audience on Weeve.
                    </p>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <h4 className="text-white font-semibold mb-3">Two Types of Brand Posts:</h4>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">🎬</span>
                                <div>
                                    <strong className="text-purple-300">Canon Posts</strong>
                                    <p className="text-sm text-gray-400 mt-1">Collaborative stories where you control specific slots</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">🌱</span>
                                <div>
                                    <strong className="text-green-300">Seed Posts</strong>
                                    <p className="text-sm text-gray-400 mt-1">You start the story, your audience completes it</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "Canon Posts Explained",
            icon: Lock,
            iconColor: "from-purple-500 to-purple-700",
            content: (
                <div className="space-y-4">
                    <p className="text-gray-300 leading-relaxed">
                        <strong className="text-white">Canon Posts</strong> let you create collaborative stories where you can lock specific slots to maintain your brand narrative while allowing user contributions.
                    </p>

                    <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/30">
                        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <Lock className="w-4 h-4" />
                            How It Works:
                        </h4>
                        <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
                            <li>Create a story with multiple slots (e.g., 5 slots)</li>
                            <li>Lock the slots you want to control (e.g., slots 1, 3, and 5)</li>
                            <li>Leave other slots open for user contributions</li>
                            <li>Locked slots cannot be changed by anyone but you</li>
                        </ol>
                    </div>

                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-yellow-400" />
                            Use Cases:
                        </h4>
                        <ul className="space-y-1 text-sm text-gray-400">
                            <li>• Product launch stories with brand messaging</li>
                            <li>• Campaigns with specific intro/outro content</li>
                            <li>• Guided narratives with user creativity</li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            title: "Seed Posts Explained",
            icon: Users,
            iconColor: "from-green-500 to-emerald-700",
            content: (
                <div className="space-y-4">
                    <p className="text-gray-300 leading-relaxed">
                        <strong className="text-white">Seed Posts</strong> are brand-initiated stories where you provide the first piece, and your audience builds on it.
                    </p>

                    <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
                        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            How It Works:
                        </h4>
                        <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
                            <li><strong>Slot 0 is always yours</strong> - Automatically locked with your brand content</li>
                            <li>Create additional slots for your audience (minimum 2 total)</li>
                            <li>Users tap "Weeve" and contribute directly to your post</li>
                            <li><strong>One contribution per user</strong> - Each person can weeve once, but can fill multiple available slots</li>
                            <li>Your initial content remains immutable</li>
                        </ol>
                    </div>

                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-yellow-400" />
                            Use Cases:
                        </h4>
                        <ul className="space-y-1 text-sm text-gray-400">
                            <li>• Start a challenge for your community</li>
                            <li>• Launch hashtag campaigns</li>
                            <li>• Crowd-sourced storytelling</li>
                            <li>• User-generated content initiatives</li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            title: "Visibility & Duration",
            icon: Calendar,
            iconColor: "from-blue-500 to-cyan-600",
            content: (
                <div className="space-y-4">
                    <p className="text-gray-300 leading-relaxed">
                        Both Canon and Seed posts include <strong className="text-white">timed visibility</strong> to create urgency and engagement.
                    </p>

                    <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
                        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Visibility Settings:
                        </h4>
                        <div className="space-y-3 text-sm text-gray-300">
                            <div>
                                <strong className="text-white">Set Duration:</strong>
                                <p className="text-gray-400 mt-1">Choose how many days your post remains active (e.g., 7 days, 30 days)</p>
                            </div>
                            <div>
                                <strong className="text-white">After Duration Ends:</strong>
                                <p className="text-gray-400 mt-1">Post automatically completes and becomes archived</p>
                            </div>
                            <div>
                                <strong className="text-white">Creates Urgency:</strong>
                                <p className="text-gray-400 mt-1">Limited time encourages faster participation</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/30">
                        <p className="text-sm text-yellow-200">
                            💡 <strong>Pro Tip:</strong> Shorter durations (7-14 days) often drive higher engagement!
                        </p>
                    </div>
                </div>
            )
        },
        {
            title: "Best Practices",
            icon: CheckCircle2,
            iconColor: "from-[#EC1D99] to-pink-600",
            content: (
                <div className="space-y-4">
                    <p className="text-gray-300 leading-relaxed">
                        Follow these tips to create successful brand campaigns on Weeve:
                    </p>

                    <div className="space-y-3">
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                                <span className="text-lg">🎯</span>
                                Clear Objectives
                            </h4>
                            <p className="text-sm text-gray-400">
                                Define what you want to achieve: brand awareness, UGC, community engagement, or product feedback
                            </p>
                        </div>

                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                                <span className="text-lg">⚖️</span>
                                Balance Control & Creativity
                            </h4>
                            <p className="text-sm text-gray-400">
                                Don't lock too many slots - leave room for authentic user expression
                            </p>
                        </div>

                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                                <span className="text-lg">📢</span>
                                Promote Your Posts
                            </h4>
                            <p className="text-sm text-gray-400">
                                Share your Canon/Seed posts on other platforms to drive participation
                            </p>
                        </div>

                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                                <span className="text-lg">🔄</span>
                                Monitor & Engage
                            </h4>
                            <p className="text-sm text-gray-400">
                                Watch contributions come in and engage with your community
                            </p>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    const currentSlideData = slides[currentSlide];
    const IconComponent = currentSlideData.icon;

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        }
    };

    const handlePrev = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
        }
    };

    const handleComplete = () => {
        if (onDismiss) {
            onDismiss();
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)]">
            <div className="max-w-2xl mx-auto">
                {/* Progress Indicator */}
                <div className="mb-6">
                    <div className="flex gap-2 mb-2">
                        {slides.map((_, idx) => (
                            <div
                                key={idx}
                                className={`flex-1 h-1 rounded-full transition-all ${idx === currentSlide
                                    ? 'bg-[#EC1D99]'
                                    : idx < currentSlide
                                        ? 'bg-[#EC1D99]/50'
                                        : 'bg-gray-700'
                                    }`}
                            />
                        ))}
                    </div>
                    <p className="text-sm text-gray-500 text-center">
                        {currentSlide + 1} of {slides.length}
                    </p>
                </div>

                {/* Tutorial Card */}
                <div className="bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black border border-[#EC1D99]/30 rounded-2xl p-6 shadow-[0_0_40px_rgba(236,29,153,0.3)]">
                    {/* Icon and Title */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className={`w-14 h-14 bg-gradient-to-br ${currentSlideData.iconColor} rounded-full flex items-center justify-center shrink-0`}>
                            <IconComponent className="w-7 h-7 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">{currentSlideData.title}</h2>
                    </div>

                    {/* Content */}
                    <div className="mb-6">
                        {currentSlideData.content}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handlePrev}
                            disabled={currentSlide === 0}
                            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold transition-all ${currentSlide === 0
                                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                : 'bg-white/10 text-white hover:bg-white/20 active:scale-95'
                                }`}
                        >
                            <ChevronLeft className="w-5 h-5" />
                            Previous
                        </button>

                        {currentSlide < slides.length - 1 ? (
                            <button
                                onClick={handleNext}
                                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#EC1D99] to-purple-600 hover:opacity-90 text-white font-bold py-3 rounded-full transition-all active:scale-95"
                            >
                                Next
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        ) : (
                            <button
                                onClick={handleComplete}
                                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#EC1D99] to-purple-600 hover:opacity-90 text-white font-bold py-3 rounded-full transition-all active:scale-95"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                Got it!
                            </button>
                        )}
                    </div>
                </div>

                {/* Quick Reference */}
                <div className="mt-6 bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                    <h3 className="text-sm font-bold text-gray-400 mb-3">Quick Reference:</h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="text-purple-400">🎬</span>
                            <span className="text-gray-400">Canon = Lock specific slots</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-green-400">🌱</span>
                            <span className="text-gray-400">Seed = Brand starts, users finish</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
