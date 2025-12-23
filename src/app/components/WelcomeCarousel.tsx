"use client";

import { useState, useRef } from "react";
import { ChevronRight, Sparkles, Check, X, Lock, Globe, Camera, Video, Pencil, Type } from "lucide-react";

interface WelcomeCarouselProps {
    onComplete: () => void;
    onSkip: () => void;
}

// Phone mockup container component
const PhoneMockup = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`relative mx-auto ${className}`}>
        {/* Phone frame */}
        <div className="relative w-52 h-[22rem] bg-black rounded-[2.5rem] border-4 border-zinc-800 shadow-2xl overflow-hidden ring-1 ring-zinc-700/50">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-b-2xl z-20" />
            {/* Status Bar Mock */}
            <div className="absolute top-1.5 right-5 z-20 flex gap-1">
                <div className="w-4 h-2.5 rounded-[1px] border border-zinc-600" />
                <div className="w-0.5 h-2.5 rounded-[1px] bg-zinc-600" />
            </div>
            {/* Content */}
            <div className="absolute inset-0 pt-6 overflow-hidden bg-zinc-950 font-sans">
                {children}
            </div>
            {/* Home indicator */}
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-20 h-1 bg-zinc-600/80 rounded-full z-20" />
        </div>
    </div>
);

// Create Story mockup content with realistic slots
const CreateStoryMockup = () => (
    <div className="h-full bg-black p-4 flex flex-col">
        {/* Header */}
        <div className="text-center mb-6">
            <h4 className="text-white text-[10px] font-bold tracking-wide">NEW STORY</h4>
        </div>

        {/* Title input mockup */}
        <div className="mb-6">
            <div className="text-zinc-500 text-[8px] font-medium mb-1.5 ml-1">STORY TITLE</div>
            <div className="bg-zinc-900 rounded-2xl px-3 py-3 border border-zinc-800 flex items-center">
                <span className="text-white text-[10px] font-semibold">Summer Vibes 2024 ☀️</span>
                <span className="ml-auto w-0.5 h-4 bg-[#EC1D99] animate-pulse" />
            </div>
        </div>

        {/* Participant slots - horizontal with realistic avatars */}
        <div className="mb-6">
            <div className="text-zinc-500 text-[8px] font-medium mb-2 ml-1">PARTICIPANTS</div>
            <div className="bg-zinc-900/50 rounded-2xl p-3 border border-zinc-800/50">
                <div className="flex items-center justify-between px-2">
                    {/* Slot 1 - You */}
                    <div className="flex flex-col items-center relative group">
                        <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-br from-[#EC1D99] to-purple-600 shadow-[0_0_10px_rgba(236,29,153,0.3)]">
                            <img
                                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
                                className="w-full h-full rounded-full object-cover border-2 border-black"
                                alt="You"
                            />
                        </div>
                        <span className="text-[7px] text-[#EC1D99] font-bold mt-1.5 tracking-wider">YOU</span>
                    </div>

                    {/* Connector */}
                    <div className="flex-1 h-0.5 bg-zinc-800 mx-1 rounded-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-[#EC1D99]/50 w-full animate-[shimmer_1.5s_infinite]" />
                    </div>

                    {/* Slot 2 - Friend */}
                    <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full p-0.5 bg-zinc-700 ring-2 ring-[#EC1D99] ring-offset-2 ring-offset-black">
                            <img
                                src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop"
                                className="w-full h-full rounded-full object-cover border-2 border-black"
                                alt="Friend"
                            />
                        </div>
                        <span className="text-[7px] text-zinc-400 font-bold mt-1.5 tracking-wider">JESS</span>
                    </div>

                    {/* Connector */}
                    <div className="flex-1 h-0.5 bg-zinc-800 mx-1 rounded-full" />

                    {/* Slot 3 - Add */}
                    <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-zinc-900 border-2 border-dashed border-zinc-700 flex items-center justify-center text-zinc-500 hover:border-zinc-500 transition-colors">
                            <span className="text-lg font-light relative -top-0.5">+</span>
                        </div>
                        <span className="text-[7px] text-zinc-600 font-bold mt-1.5 tracking-wider">ADD</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Visibility options */}
        <div>
            <div className="text-zinc-500 text-[8px] font-medium mb-2 ml-1">VISIBILITY</div>
            <div className="flex gap-2">
                <div className="flex-1 bg-[#EC1D99]/10 border border-[#EC1D99] rounded-xl p-2.5 flex items-center gap-2">
                    <div className="p-1 bg-[#EC1D99] rounded-full">
                        <Lock className="w-2.5 h-2.5 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] text-white font-bold leading-tight">Private</span>
                        <span className="text-[6px] text-[#EC1D99]/80 leading-tight">Invited only</span>
                    </div>
                </div>
                <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 flex items-center gap-2 opacity-50">
                    <div className="p-1 bg-zinc-800 rounded-full">
                        <Globe className="w-2.5 h-2.5 text-zinc-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] text-zinc-400 font-bold leading-tight">Public</span>
                        <span className="text-[6px] text-zinc-600 leading-tight">Anyone</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Create button */}
        <div className="mt-auto mb-2">
            <div className="bg-gradient-to-r from-[#EC1D99] to-purple-600 rounded-full py-2.5 text-center shadow-lg shadow-[#EC1D99]/20">
                <span className="text-white text-[9px] font-bold tracking-wide">CREATE STORY</span>
            </div>
        </div>
    </div>
);

// Turn System mockup with realistic content cards
const TurnSystemMockup = () => (
    <div className="h-full bg-black p-3.5 flex flex-col">
        {/* Floating "Your Turn" notification */}
        <div className="absolute top-24 right-4 z-30 animate-[bounce_2s_infinite]">
            <div className="bg-[#EC1D99] text-white text-[8px] font-bold px-3 py-1.5 rounded-full shadow-lg shadow-[#EC1D99]/30 flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                </span>
                YOUR TURN!
            </div>
            {/* Arrow/Tail */}
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#EC1D99] mx-auto mt-[-1px]" />
        </div>

        {/* Story Flow Vertical */}
        <div className="relative flex-1 flex flex-col gap-3 py-2 pl-4">
            {/* Vertical Line */}
            <div className="absolute left-[2.4rem] top-4 bottom-4 w-0.5 bg-zinc-800 rounded-full" />

            {/* Turn 1: Completed */}
            <div className="relative z-10 flex items-start gap-3">
                <div className="relative">
                    <div className="w-9 h-9 rounded-full p-0.5 bg-zinc-800 ring-2 ring-zinc-700 bg-black z-10 relative">
                        <img
                            src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&h=100&fit=crop"
                            className="w-full h-full rounded-full object-cover grayscale opacity-70"
                            alt="Previous"
                        />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-zinc-800 rounded-full flex items-center justify-center border border-black z-20">
                        <Check className="w-2.5 h-2.5 text-zinc-500" />
                    </div>
                </div>
                <div className="flex-1 bg-zinc-900/80 rounded-xl p-2 border border-zinc-800 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[8px] text-zinc-500 font-bold">PART 1 • SARAH</span>
                        <span className="text-[7px] text-zinc-600">2h ago</span>
                    </div>
                    <div className="aspect-video bg-zinc-800 rounded-lg overflow-hidden relative">
                        <img src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&q=80" className="w-full h-full object-cover opacity-50" alt="Content" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center border border-white/20">
                                <span className="text-[8px]">▶</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Turn 2: Active (You) */}
            <div className="relative z-10 flex items-start gap-3 transform scale-105 origin-left my-1">
                <div className="relative">
                    <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-br from-[#EC1D99] to-purple-600 shadow-[0_0_15px_rgba(236,29,153,0.4)] z-10 relative">
                        <img
                            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
                            className="w-full h-full rounded-full object-cover border-2 border-black"
                            alt="You"
                        />
                    </div>
                    <div className="absolute -bottom-0 -right-0 w-4 h-4 bg-[#EC1D99] rounded-full flex items-center justify-center border border-black z-20 animate-pulse">
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                </div>
                <div className="flex-1 bg-gradient-to-br from-[#EC1D99]/10 to-purple-900/10 rounded-xl p-2.5 border border-[#EC1D99] shadow-lg shadow-[#EC1D99]/5 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[8px] text-[#EC1D99] font-bold tracking-wide">PART 2 • YOU</span>
                        <span className="text-[7px] text-[#EC1D99]">Now</span>
                    </div>
                    <div className="h-14 rounded-lg border-2 border-dashed border-[#EC1D99]/30 bg-[#EC1D99]/5 flex flex-col items-center justify-center gap-1">
                        <span className="text-lg">✨</span>
                        <span className="text-[7px] text-[#EC1D99] font-medium">Tap to add content</span>
                    </div>
                </div>
            </div>

            {/* Turn 3: Waiting */}
            <div className="relative z-10 flex items-start gap-3 opacity-40">
                <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center z-10 relative">
                        <span className="text-zinc-500 font-bold text-xs">?</span>
                    </div>
                </div>
                <div className="flex-1 bg-zinc-950 rounded-xl p-2 border border-zinc-800/50">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px] text-zinc-600 font-bold">PART 3 • WAITING</span>
                    </div>
                    <div className="h-10 bg-zinc-900/50 rounded-lg"></div>
                </div>
            </div>
        </div>
    </div>
);

// Weeve/Fork overlay mockup with polished carousel
const WeeveMockup = () => (
    <div className="h-full bg-black/95 p-0 flex flex-col relative overflow-hidden">
        {/* Background Image (blurred) */}
        <div className="absolute inset-0 opacity-20 transform scale-110 blur-xl">
            <img src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300&q=80" className="w-full h-full object-cover" alt="bg" />
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black z-0" />

        <div className="relative z-10 flex flex-col h-full p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div />
                <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                    <h4 className="text-white text-[9px] font-bold tracking-widest">WEEVE IN</h4>
                </div>
                <div className="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center border border-white/10">
                    <X className="w-3 h-3 text-zinc-400" />
                </div>
            </div>

            <div className="text-center mb-6">
                <p className="text-zinc-300 text-[8px] font-medium leading-relaxed max-w-[140px] mx-auto">
                    Replace existing parts with your own remix
                </p>
            </div>

            {/* Carousel */}
            <div className="relative flex-1 flex items-center justify-center perspective-1000">
                {/* Left Card */}
                <div className="absolute left-0 w-20 h-28 bg-zinc-900 rounded-xl border border-zinc-700 opacity-30 transform -rotate-6 scale-90 translate-x-2 shadow-xl overflow-hidden grayscale">
                    <img src="https://images.unsplash.com/photo-1502872364588-894d7d6ddfab?w=200&q=80" className="w-full h-full object-cover" alt="prev" />
                </div>

                {/* Right Card */}
                <div className="absolute right-0 w-20 h-28 bg-zinc-900 rounded-xl border border-zinc-700 opacity-30 transform rotate-6 scale-90 -translate-x-2 shadow-xl overflow-hidden grayscale">
                    <img src="https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=200&q=80" className="w-full h-full object-cover" alt="next" />
                </div>

                {/* Center Card (Selected) */}
                <div className="relative w-32 h-44 rounded-2xl border-2 border-[#EC1D99] shadow-[0_0_20px_rgba(236,29,153,0.2)] bg-zinc-900 z-20 overflow-hidden group">
                    <img
                        src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300&q=80"
                        className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700"
                        alt="main"
                    />

                    {/* Dark gradient at bottom */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {/* Selection Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-[#EC1D99]/20 backdrop-blur-[1px]">
                        <div className="w-10 h-10 rounded-full bg-[#EC1D99] flex items-center justify-center shadow-lg transform scale-100 transition-transform">
                            <Check className="w-6 h-6 text-white" strokeWidth={3} />
                        </div>
                    </div>

                    {/* Slot Badge */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                        <span className="text-[7px] text-white font-bold bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 tracking-wide">
                            SLOT 2 OF 3
                        </span>
                    </div>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-1.5 mb-5 mt-2">
                <div className="w-1 h-1 rounded-full bg-zinc-700" />
                <div className="w-3 h-1 rounded-full bg-[#EC1D99] shadow-[0_0_8px_#EC1D99]" />
                <div className="w-1 h-1 rounded-full bg-zinc-700" />
            </div>

            {/* Info Message */}
            <div className="text-center mb-4">
                <span className="text-[#EC1D99] text-[9px] font-bold bg-[#EC1D99]/10 px-3 py-1 rounded-full border border-[#EC1D99]/20">
                    1 SLOT SELECTED
                </span>
            </div>

            {/* CTA */}
            <div className="mb-2">
                <div className="bg-white text-black rounded-full py-2.5 text-center shadow-lg transform active:scale-95 transition-transform">
                    <span className="text-[9px] font-black tracking-wide">CONTINUE</span>
                </div>
            </div>
        </div>
    </div>
);

interface Slide {
    id: number;
    title: string;
    subtitle: string;
    description: string;
    visual: React.ReactNode;
}

const SLIDES: Slide[] = [
    {
        id: 1,
        title: "Welcome to Weeve",
        subtitle: "Stories are better together",
        description: "Create collaborative stories with friends. Each person adds their part to build something amazing.",
        visual: (
            <div className="flex justify-center py-8">
                <div className="relative">
                    {/* Animated logo/icon */}
                    <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-[#EC1D99] to-purple-600 flex items-center justify-center shadow-[0_0_50px_rgba(236,29,153,0.5)] animate-pulse rotate-3">
                        <Sparkles className="w-16 h-16 text-white" />
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-black rounded-xl border border-zinc-700 flex items-center justify-center shadow-xl animate-[bounce_3s_infinite] delay-100">
                        <span className="text-xl">👋</span>
                    </div>
                    <div className="absolute -bottom-2 -left-4 w-10 h-10 bg-black rounded-full border border-zinc-700 flex items-center justify-center shadow-xl animate-[bounce_3s_infinite] delay-300">
                        <span className="text-lg">✨</span>
                    </div>
                </div>
            </div>
        ),
    },
    {
        id: 2,
        title: "Create a Story",
        subtitle: "Build your crew",
        description: "Start a new story and invite friends. Assign slots to build your narrative together.",
        visual: (
            <PhoneMockup>
                <CreateStoryMockup />
            </PhoneMockup>
        ),
    },
    {
        id: 3,
        title: "Take Turns",
        subtitle: "Pass the baton",
        description: "Stories are built sequentially. Wait for the 'Your Turn' notification to add your part.",
        visual: (
            <PhoneMockup>
                <TurnSystemMockup />
            </PhoneMockup>
        ),
    },
    {
        id: 4,
        title: "Express Yourself",
        subtitle: "Any media you want",
        description: "Capture the moment with photos, videos, or get creative with drawings and text.",
        visual: (
            <PhoneMockup className="bg-black">
                <div className="h-full bg-black flex flex-col p-4 relative overflow-hidden">
                    {/* Background Grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />

                    <div className="grid grid-cols-2 gap-3 h-full content-center relative z-10">
                        <div className="bg-zinc-900/80 border border-zinc-700 rounded-2xl p-3 flex flex-col items-center justify-center gap-2 hover:border-[#EC1D99] transition-colors group aspect-square">
                            <div className="w-10 h-10 rounded-full bg-[#EC1D99]/10 flex items-center justify-center group-hover:bg-[#EC1D99] transition-colors">
                                <Camera className="w-5 h-5 text-[#EC1D99] group-hover:text-white" />
                            </div>
                            <span className="text-white text-[9px] font-bold">PHOTO</span>
                        </div>
                        <div className="bg-zinc-900/80 border border-zinc-700 rounded-2xl p-3 flex flex-col items-center justify-center gap-2 hover:border-blue-500 transition-colors group aspect-square">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                                <Video className="w-5 h-5 text-blue-500 group-hover:text-white" />
                            </div>
                            <span className="text-white text-[9px] font-bold">VIDEO</span>
                        </div>
                        <div className="bg-zinc-900/80 border border-zinc-700 rounded-2xl p-3 flex flex-col items-center justify-center gap-2 hover:border-green-500 transition-colors group aspect-square">
                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500 transition-colors">
                                <Pencil className="w-5 h-5 text-green-500 group-hover:text-white" />
                            </div>
                            <span className="text-white text-[9px] font-bold">DRAW</span>
                        </div>
                        <div className="bg-zinc-900/80 border border-zinc-700 rounded-2xl p-3 flex flex-col items-center justify-center gap-2 hover:border-orange-500 transition-colors group aspect-square">
                            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                                <Type className="w-5 h-5 text-orange-500 group-hover:text-white" />
                            </div>
                            <span className="text-white text-[9px] font-bold">TEXT</span>
                        </div>
                    </div>
                </div>
            </PhoneMockup>
        ),
    },
    {
        id: 5,
        title: "Weeve Into Stories",
        subtitle: "Branch off \u0026 Remix",
        description: "See a story you love? Fork it to create your own version starting from any point.",
        visual: (
            <PhoneMockup>
                <WeeveMockup />
            </PhoneMockup>
        ),
    },
    {
        id: 6,
        title: "Ready to Start?",
        subtitle: "Your journey begins now",
        description: "Dive in, follow creators, and start weaving your first stories.",
        visual: (
            <div className="flex justify-center py-8">
                <div className="relative">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center shadow-[0_0_60px_rgba(34,197,94,0.4)] animate-bounce-subtle">
                        <Check className="w-16 h-16 text-white stroke-[3px]" />
                    </div>
                    {/* Celebration particles */}
                    <div className="absolute -top-6 -left-6 text-3xl animate-[bounce_2s_infinite]">🎉</div>
                    <div className="absolute -top-4 -right-8 text-3xl animate-[bounce_2.5s_infinite] delay-75">🚀</div>
                    <div className="absolute -bottom-4 -right-6 text-3xl animate-[bounce_2.2s_infinite] delay-150">🔥</div>
                    <div className="absolute -bottom-2 -left-8 text-3xl animate-[bounce_2.8s_infinite] delay-300">💎</div>
                </div>
            </div>
        ),
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
            {/* Background Gradients */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#EC1D99]/10 blur-[120px] rounded-full" />
            </div>

            {/* Skip Button */}
            <div className="absolute top-6 right-6 z-10 pt-[env(safe-area-inset-top,0px)]">
                <button
                    onClick={onSkip}
                    className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 text-xs font-bold tracking-wide transition-all backdrop-blur-sm"
                >
                    SKIP
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 pt-[calc(env(safe-area-inset-top,0px)+3rem)] relative z-10">
                {/* Visual/Mockup Section */}
                <div
                    className="mb-8 w-full max-w-xs flex items-center justify-center transition-all duration-700"
                    key={slide.id}
                >
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {slide.visual}
                    </div>
                </div>

                {/* Text Content */}
                <div className="text-center max-w-xs transition-all duration-500" key={`text-${slide.id}`}>
                    <h1 className="text-3xl font-bold mb-2 tracking-tight">{slide.title}</h1>
                    <p className="text-[#EC1D99] font-bold mb-3 text-sm tracking-wide uppercase bg-clip-text text-transparent bg-gradient-to-r from-[#EC1D99] to-purple-500">
                        {slide.subtitle}
                    </p>
                    <p className="text-gray-400 leading-relaxed text-sm font-medium">
                        {slide.description}
                    </p>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="px-8 pb-10 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] relative z-10">
                {/* Dot Indicators */}
                <div className="flex justify-center gap-2 mb-8">
                    {SLIDES.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentSlide(index)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${index === currentSlide
                                ? 'w-8 bg-[#EC1D99] shadow-[0_0_10px_#EC1D99]'
                                : 'w-1.5 bg-gray-700 hover:bg-gray-600'
                                }`}
                        />
                    ))}
                </div>

                {/* Action Button */}
                <button
                    onClick={handleNext}
                    className="w-full bg-[#EC1D99] hover:bg-[#d61a88] text-white font-bold py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(236,29,153,0.3)] border border-white/10"
                >
                    <span className="tracking-wide">{isLastSlide ? "Get Started" : "Next"}</span>
                    {!isLastSlide && <ChevronRight className="w-5 h-5" />}
                </button>
            </div>

            <style jsx>{`
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 3s ease-in-out infinite;
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}
