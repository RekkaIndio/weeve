"use client";

import { useState, useEffect } from "react";
import { ArrowDown, Sparkles } from "lucide-react";

interface OnboardingTutorialOverlayProps {
    onDismiss: () => void;
    targetElementId?: string;
}

export default function OnboardingTutorialOverlay({ onDismiss, targetElementId = "add-weeve-button" }: OnboardingTutorialOverlayProps) {
    const [showOverlay, setShowOverlay] = useState(true);
    const [targetPosition, setTargetPosition] = useState<{ bottom: number; left: number; width: number } | null>(null);

    useEffect(() => {
        // Wait for the button to be rendered, then calculate its position
        const findTarget = () => {
            const button = document.getElementById(targetElementId);
            if (button) {
                const rect = button.getBoundingClientRect();
                setTargetPosition({
                    bottom: window.innerHeight - rect.top,
                    left: rect.left + rect.width / 2,
                    width: rect.width,
                });
            } else {
                // Retry if button not found yet
                setTimeout(findTarget, 100);
            }
        };

        findTarget();
    }, [targetElementId]);

    const handleDismiss = () => {
        setShowOverlay(false);
        setTimeout(onDismiss, 300);
    };

    if (!showOverlay || !targetPosition) return null;

    return (
        <>
            {/* Dark overlay with hole for the button */}
            <div
                className="fixed inset-0 z-[100] pointer-events-none"
                style={{
                    background: `radial-gradient(circle at ${targetPosition.left}px ${window.innerHeight - targetPosition.bottom - 24}px, transparent 0px, transparent 48px, rgba(0, 0, 0, 0.92) 80px)`,
                }}
                onClick={handleDismiss}
            >
                {/* Tutorial content */}
                <div className="absolute pointer-events-auto" style={{ bottom: targetPosition.bottom + 80, left: "50%", transform: "translateX(-50%)" }}>
                    <div className="flex flex-col items-center gap-4 animate-bounce-subtle">
                        {/* Arrow pointing down */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="bg-[#EC1D99] rounded-full p-3 shadow-[0_0_30px_rgba(236,29,153,0.5)]">
                                <ArrowDown className="w-6 h-6 text-white" />
                            </div>
                            <div className="w-0.5 h-8 bg-gradient-to-b from-[#EC1D99] to-transparent"></div>
                        </div>
                    </div>
                </div>

                {/* Instruction card */}
                <div className="absolute pointer-events-auto" style={{ top: "20%", left: "50%", transform: "translateX(-50%)", maxWidth: "90vw" }}>
                    <div className="bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black border border-[#EC1D99]/30 rounded-2xl p-6 shadow-[0_0_40px_rgba(236,29,153,0.3)] max-w-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#EC1D99] to-purple-600 rounded-full flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Add Your First Weeve!</h3>
                        </div>
                        
                        <p className="text-gray-300 mb-4 leading-relaxed">
                            Tap the <span className="text-[#EC1D99] font-semibold">+ button</span> below to add your part to the story. You can add photos, videos, drawings, or text.
                        </p>

                        <div className="bg-white/5 rounded-lg p-4 mb-4 border border-white/10">
                            <p className="text-sm text-gray-400">
                                💡 <strong className="text-white">Pro tip:</strong> Stories are more engaging when each weeve builds on the previous one!
                            </p>
                        </div>

                        <button
                            onClick={handleDismiss}
                            className="w-full bg-[#EC1D99] hover:bg-[#d61a88] text-white font-bold py-3 rounded-full transition-all active:scale-95"
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 2s ease-in-out infinite;
                }
            `}</style>
        </>
    );
}
