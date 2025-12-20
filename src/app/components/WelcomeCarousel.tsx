"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronRight, Sparkles, Users, GitBranch, RotateCcw } from "lucide-react";

interface WelcomeCarouselProps {
    onComplete: () => void;
    onSkip: () => void;
}

interface Slide {
    id: number;
    title: string;
    subtitle: string;
    description: string;
    icon: React.ReactNode;
    gradient: string;
}

const SLIDES: Slide[] = [
    {
        id: 1,
        title: "Welcome to Weeve",
        subtitle: "Stories are better together",
        description: "Create, collaborate, and build something amazing with friends and the community.",
        icon: <Sparkles className="w-12 h-12 text-white" />,
        gradient: "from-[#EC1D99] to-purple-600",
    },
    {
        id: 2,
        title: "Stitch Stories Together",
        subtitle: "Your creativity + theirs",
        description: "Start a story or join one. Add your part – photo, video, drawing, or text – and watch it grow.",
        icon: <Users className="w-12 h-12 text-white" />,
        gradient: "from-blue-500 to-cyan-400",
    },
    {
        id: 3,
        title: "The Contribution Cycle",
        subtitle: "Create → Engage → Grow",
        description: "You contribute, the story grows, friends engage, more people join. It's a beautiful cycle!",
        icon: <RotateCcw className="w-12 h-12 text-white" />,
        gradient: "from-green-500 to-emerald-400",
    },
    {
        id: 4,
        title: "Weeve Existing Stories",
        subtitle: "Branch off and create",
        description: "See something inspiring? Tap 'Weeve' to create your own version and take it in a new direction.",
        icon: <GitBranch className="w-12 h-12 text-white" />,
        gradient: "from-orange-500 to-amber-400",
    },
];

export default function WelcomeCarousel({ onComplete, onSkip }: WelcomeCarouselProps) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const isLastSlide = currentSlide === SLIDES.length - 1;

    // Swipe detection
    const minSwipeDistance = 50;

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && currentSlide < SLIDES.length - 1) {
            setCurrentSlide(prev => prev + 1);
        }
        if (isRightSwipe && currentSlide > 0) {
            setCurrentSlide(prev => prev - 1);
        }
    };

    const handleNext = () => {
        if (isLastSlide) {
            onComplete();
        } else {
            setCurrentSlide(prev => prev + 1);
        }
    };

    const slide = SLIDES[currentSlide];

    return (
        <div
            ref={containerRef}
            className="min-h-screen bg-black text-white flex flex-col"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Skip Button */}
            <div className="absolute top-6 right-6 z-10">
                <button
                    onClick={onSkip}
                    className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
                >
                    Skip
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
                {/* Icon with gradient background */}
                <div
                    className={`w-28 h-28 rounded-full bg-gradient-to-br ${slide.gradient} flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(236,29,153,0.3)] transition-all duration-500`}
                    key={slide.id}
                >
                    {slide.icon}
                </div>

                {/* Text Content */}
                <div className="text-center max-w-sm transition-all duration-500" key={`text-${slide.id}`}>
                    <h1 className="text-3xl font-bold mb-3">{slide.title}</h1>
                    <p className="text-[#EC1D99] font-semibold mb-4">{slide.subtitle}</p>
                    <p className="text-gray-400 leading-relaxed">{slide.description}</p>
                </div>

                {/* Visual Illustration (slide-specific) */}
                <div className="mt-10 w-full max-w-xs">
                    {currentSlide === 1 && (
                        <div className="flex justify-center items-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-2xl animate-pulse">👤</div>
                            <div className="w-6 h-0.5 bg-gradient-to-r from-pink-500 to-blue-500"></div>
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-2xl animate-pulse animation-delay-200">👤</div>
                            <div className="w-6 h-0.5 bg-gradient-to-r from-blue-500 to-green-500"></div>
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center text-2xl animate-pulse animation-delay-400">👤</div>
                            <div className="w-6 h-0.5 bg-gradient-to-r from-green-500 to-amber-500"></div>
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#EC1D99] to-purple-600 flex items-center justify-center shadow-lg">
                                <span className="text-xl">🎬</span>
                            </div>
                        </div>
                    )}
                    {currentSlide === 2 && (
                        <div className="flex justify-center">
                            <div className="relative w-32 h-32">
                                <div className="absolute inset-0 rounded-full border-4 border-dashed border-green-500/50 animate-spin-slow"></div>
                                <div className="absolute inset-4 rounded-full border-4 border-dashed border-blue-500/50 animate-spin-slow-reverse"></div>
                                <div className="absolute inset-8 rounded-full bg-gradient-to-br from-[#EC1D99] to-purple-600 flex items-center justify-center">
                                    <span className="text-2xl">🔄</span>
                                </div>
                            </div>
                        </div>
                    )}
                    {currentSlide === 3 && (
                        <div className="flex justify-center">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center mb-2">
                                    <span className="text-2xl">📹</span>
                                </div>
                                <div className="absolute -right-12 top-0 flex flex-col gap-1">
                                    <div className="w-0.5 h-4 bg-orange-500 transform -rotate-45 origin-top-left ml-2"></div>
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center text-lg shadow-lg">
                                        ✨
                                    </div>
                                </div>
                                <div className="absolute -left-12 top-0 flex flex-col gap-1 items-end">
                                    <div className="w-0.5 h-4 bg-purple-500 transform rotate-45 origin-top-right mr-2"></div>
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg shadow-lg">
                                        🎨
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Section */}
            <div className="px-8 pb-12">
                {/* Dot Indicators */}
                <div className="flex justify-center gap-2 mb-6">
                    {SLIDES.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentSlide(index)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentSlide
                                    ? 'w-6 bg-[#EC1D99]'
                                    : 'bg-gray-600 hover:bg-gray-500'
                                }`}
                        />
                    ))}
                </div>

                {/* Action Button */}
                <button
                    onClick={handleNext}
                    className="w-full bg-[#EC1D99] hover:bg-[#d61a88] text-white font-bold py-4 rounded-full transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <span>{isLastSlide ? "Get Started" : "Next"}</span>
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            <style jsx>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes spin-slow-reverse {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
                .animate-spin-slow-reverse {
                    animation: spin-slow-reverse 6s linear infinite;
                }
                .animation-delay-200 {
                    animation-delay: 0.2s;
                }
                .animation-delay-400 {
                    animation-delay: 0.4s;
                }
            `}</style>
        </div>
    );
}
