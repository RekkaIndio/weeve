import React from 'react';

interface AestheticFallbackProps {
    className?: string;
    showLogo?: boolean;
}

export default function AestheticFallback({ className = "", showLogo = true }: AestheticFallbackProps) {
    return (
        <div className={`relative w-full h-full bg-gray-900 overflow-hidden ${className}`}>
            {/* Weaving Lines Animation */}
            <svg className="absolute inset-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="fallback-grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
                        <stop offset="50%" stopColor="#a855f7" stopOpacity="1" />
                        <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="fallback-grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ec4899" stopOpacity="0" />
                        <stop offset="50%" stopColor="#6366f1" stopOpacity="1" />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Line 1 */}
                <path
                    d="M-100,30 Q 50,60 200,30 T 500,30 T 800,30 T 1100,30"
                    fill="none"
                    stroke="url(#fallback-grad1)"
                    strokeWidth="2"
                    className="animate-weave-1"
                />

                {/* Line 2 */}
                <path
                    d="M-100,50 Q 50,20 200,50 T 500,50 T 800,50 T 1100,50"
                    fill="none"
                    stroke="url(#fallback-grad2)"
                    strokeWidth="2"
                    className="animate-weave-2"
                />

                {/* Line 3 */}
                <path
                    d="M-100,70 Q 50,100 200,70 T 500,70 T 800,70 T 1100,70"
                    fill="none"
                    stroke="url(#fallback-grad1)"
                    strokeWidth="2"
                    className="animate-weave-3"
                />
            </svg>

            {/* Weeve Logo in Top Right */}
            {showLogo && (
                <div className="absolute top-2 right-2 z-10">
                    <img
                        src="/weeve-logo.png"
                        alt="Weeve"
                        className="w-8 h-8 object-contain opacity-60"
                    />
                </div>
            )}

            <style jsx>{`
                @keyframes weave {
                    0% { transform: translateX(-100%) translateY(0); }
                    50% { transform: translateX(0%) translateY(10px); }
                    100% { transform: translateX(100%) translateY(0); }
                }

                .animate-weave-1 {
                    animation: weave 8s linear infinite;
                    transform-origin: center;
                }
                .animate-weave-2 {
                    animation: weave 12s linear infinite;
                    animation-delay: -4s;
                    transform-origin: center;
                }
                .animate-weave-3 {
                    animation: weave 10s linear infinite;
                    animation-delay: -2s;
                    transform-origin: center;
                }
            `}</style>
        </div>
    );
}
