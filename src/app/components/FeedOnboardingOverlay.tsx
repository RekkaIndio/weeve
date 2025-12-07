"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

interface FeedOnboardingOverlayProps {
    onDismiss: () => void;
}

export default function FeedOnboardingOverlay({ onDismiss }: FeedOnboardingOverlayProps) {
    const [showOverlay, setShowOverlay] = useState(true);

    const handleDismiss = () => {
        setShowOverlay(false);
        setTimeout(onDismiss, 300);
    };

    if (!showOverlay) return null;

    return (
        <>
            {/* Dark overlay */}
            <div
                className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-6"
                onClick={handleDismiss}
            >
                {/* Tutorial card */}
                <div className="bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black border border-[#EC1D99]/30 rounded-2xl p-8 shadow-[0_0_40px_rgba(236,29,153,0.3)] max-w-md w-full pointer-events-auto">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#EC1D99] to-purple-600 rounded-full flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white">Your Story is Ready!</h3>
                    </div>
                    
                    <p className="text-gray-300 mb-6 leading-relaxed text-lg">
                        You'll see your first Weeve story below. Tap on it to open and add your parts!
                    </p>

                    <div className="bg-white/5 rounded-lg p-5 mb-6 border border-white/10">
                        <p className="text-sm text-gray-300 leading-relaxed">
                            <span className="text-[#EC1D99] font-bold text-base">👆 Here's how:</span><br/>
                            <span className="block mt-2">1. Tap the story card below</span>
                            <span className="block mt-1">2. Watch the middle part we added</span>
                            <span className="block mt-1">3. Tap the <strong className="text-white">+ button</strong> to add your weeve</span>
                        </p>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="w-full bg-[#EC1D99] hover:bg-[#d61a88] text-white font-bold py-4 rounded-full transition-all active:scale-95 text-lg"
                    >
                        Let's Go! 🚀
                    </button>
                </div>

                {/* Arrow pointing down to feed */}
                <div className="mt-8 flex flex-col items-center animate-bounce pointer-events-none">
                    <div className="text-[#EC1D99] text-4xl mb-2">↓</div>
                    <p className="text-white font-semibold">Your story is below</p>
                </div>
            </div>

            <style jsx>{`
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce {
                    animation: bounce 2s ease-in-out infinite;
                }
            `}</style>
        </>
    );
}
