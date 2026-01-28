"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Heart, MessageCircle, Bookmark, Share2, X, Check } from "lucide-react";

// Story data with 5 parts
const storyData = {
    title: "Summer road trip memories",
    contributors: [
        { id: "1", name: "Emma", avatar: "https://i.pravatar.cc/150?img=5" },
        { id: "2", name: "Lucas", avatar: "https://i.pravatar.cc/150?img=11" },
        { id: "3", name: "Mia", avatar: "https://i.pravatar.cc/150?img=9" },
        { id: "4", name: "Jake", avatar: "https://i.pravatar.cc/150?img=12" },
        { id: "5", name: "Lily", avatar: "https://i.pravatar.cc/150?img=25" },
    ],
    slides: [
        { image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400", contributor: 0 },
        { image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=400", contributor: 1 },
        { image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400", contributor: 2 },
        { image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400", contributor: 3 },
        { image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400", contributor: 4 },
    ],
    likes: 247,
};

// The user who will "Weeve"
const newUser = { id: "6", name: "You", avatar: "https://i.pravatar.cc/150?img=23" };

// Animation stages for the demo
type Stage = "viewing" | "wButton" | "slotSelection" | "scrolling" | "slotSelected" | "complete";

export default function HeroVisual3D() {
    const [stage, setStage] = useState<Stage>("viewing");
    const [activeSlide, setActiveSlide] = useState(0);
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [currentCarouselSlot, setCurrentCarouselSlot] = useState(2); // Start at middle slot (index 2)

    // Auto-advance the demo stages
    useEffect(() => {
        const timings: Record<Stage, number> = {
            viewing: 2500,
            wButton: 1800,
            slotSelection: 1200,
            scrolling: 2400, // Time to scroll through carousel
            slotSelected: 2000,
            complete: 2500,
        };

        const timer = setTimeout(() => {
            switch (stage) {
                case "viewing":
                    setStage("wButton");
                    break;
                case "wButton":
                    setStage("slotSelection");
                    break;
                case "slotSelection":
                    setStage("scrolling");
                    break;
                case "scrolling":
                    setSelectedSlot(3); // Select slot 4 (index 3) where we end up
                    setStage("slotSelected");
                    break;
                case "slotSelected":
                    setStage("complete");
                    break;
                case "complete":
                    // Reset and loop
                    setStage("viewing");
                    setSelectedSlot(null);
                    setCurrentCarouselSlot(2); // Reset to middle
                    break;
            }
        }, timings[stage]);

        return () => clearTimeout(timer);
    }, [stage]);

    // Carousel scrolling effect during "scrolling" stage
    useEffect(() => {
        if (stage !== "scrolling") return;

        // Scroll: middle (2) -> left (1) -> back to middle (2) -> right (3) to show both directions
        const scrollSequence = [1, 2, 3];
        let index = 0;

        const interval = setInterval(() => {
            if (index < scrollSequence.length) {
                setCurrentCarouselSlot(scrollSequence[index]);
                index++;
            }
        }, 700);

        return () => clearInterval(interval);
    }, [stage]);

    // Auto-rotate through slides when viewing
    useEffect(() => {
        if (stage !== "viewing") return;

        const interval = setInterval(() => {
            setActiveSlide(prev => (prev + 1) % storyData.slides.length);
        }, 1200);

        return () => clearInterval(interval);
    }, [stage]);

    const totalSlots = storyData.slides.length;

    return (
        <div className="relative w-full h-[600px] sm:h-[680px] flex items-center justify-center overflow-visible">
            {/* Ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#EC1D99]/15 rounded-full blur-[100px] pointer-events-none" />

            {/* Main phone mockup */}
            <div className="relative scale-[0.75] sm:scale-90 lg:scale-100">
                {/* Phone frame */}
                <motion.div
                    className="relative bg-zinc-900 rounded-[2.5rem] p-2 shadow-2xl"
                    style={{
                        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5), 0 0 60px rgba(236,29,153,0.2)",
                    }}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    {/* Screen */}
                    <div className="relative bg-black rounded-[2rem] overflow-hidden w-[240px] sm:w-[280px] aspect-[9/16]">
                        {/* Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-50" />

                        {/* Story content (always visible behind overlays) */}
                        <div className="absolute inset-0">
                            {storyData.slides.map((slide, idx) => (
                                <motion.img
                                    key={idx}
                                    src={slide.image}
                                    alt="Story content"
                                    className="absolute inset-0 w-full h-full object-cover"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: idx === activeSlide ? 1 : 0 }}
                                    transition={{ duration: 0.4 }}
                                />
                            ))}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        </div>

                        {/* Slide indicators (5 slots) */}
                        <div className="absolute top-8 left-3 right-3 flex gap-1 z-30">
                            {storyData.slides.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`flex-1 h-0.5 rounded-full transition-all duration-300 ${idx === activeSlide ? "bg-white" : "bg-white/30"
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Footer info (always visible) */}
                        <div className="absolute bottom-0 left-0 right-14 p-4 z-20">
                            <h3 className="text-white text-sm font-bold mb-2 drop-shadow-lg">
                                {storyData.title}
                            </h3>
                            {/* Contributors stack (5 avatars) */}
                            <div className="flex items-center">
                                {storyData.contributors.map((contributor, idx) => (
                                    <motion.div
                                        key={contributor.id}
                                        className={`relative rounded-full ${idx > 0 ? "-ml-2" : ""}`}
                                        animate={{
                                            scale: idx === storyData.slides[activeSlide].contributor ? 1.15 : 1,
                                            zIndex: idx === storyData.slides[activeSlide].contributor ? 20 : 10 - idx,
                                        }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <img
                                            src={contributor.avatar}
                                            alt={contributor.name}
                                            className={`w-7 h-7 rounded-full border-2 object-cover transition-all duration-300 ${idx === storyData.slides[activeSlide].contributor
                                                ? "border-[#EC1D99] shadow-[0_0_8px_#EC1D99]"
                                                : "border-black/80 opacity-70"
                                                }`}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Sidebar actions */}
                        <div className="absolute right-3 bottom-4 flex flex-col items-center gap-2.5 z-20">
                            <div className="flex flex-col items-center gap-0.5">
                                <div className="w-9 h-9 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center border border-white/20 text-white">
                                    <Heart className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] text-white font-bold">{storyData.likes}</span>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center border border-white/20 text-white">
                                <MessageCircle className="w-5 h-5" />
                            </div>
                            <div className="w-9 h-9 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center border border-white/20 text-white">
                                <Bookmark className="w-5 h-5" />
                            </div>
                            <div className="w-9 h-9 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center border border-white/20 text-white">
                                <Share2 className="w-4 h-4" />
                            </div>

                            {/* THE W BUTTON */}
                            <motion.div
                                className="flex flex-col items-center gap-0.5"
                                animate={stage === "wButton" ? {
                                    scale: [1, 1.2, 1],
                                } : {}}
                                transition={{ duration: 0.5, repeat: stage === "wButton" ? Infinity : 0, repeatDelay: 0.3 }}
                            >
                                <motion.div
                                    className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${stage === "wButton" || stage === "slotSelection" || stage === "scrolling" || stage === "slotSelected"
                                        ? "bg-[#EC1D99] border-[#EC1D99] text-white scale-110"
                                        : "bg-gray-800/50 backdrop-blur-sm border-white/20 text-[#EC1D99]"
                                        }`}
                                    whileHover={{ scale: 1.1 }}
                                >
                                    <span className="font-black text-base">W</span>
                                </motion.div>
                                <span className={`text-[10px] font-bold ${stage === "wButton" ? "text-[#EC1D99]" : "text-white"}`}>
                                    Weeve
                                </span>
                            </motion.div>
                        </div>

                        {/* SLOT SELECTION OVERLAY */}
                        <AnimatePresence>
                            {(stage === "slotSelection" || stage === "scrolling" || stage === "slotSelected") && (
                                <motion.div
                                    className="absolute inset-0 bg-black/90 z-40 flex flex-col items-center pt-12"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {/* Close button */}
                                    <div className="absolute top-10 right-3 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                                        <X className="w-4 h-4 text-white" />
                                    </div>

                                    {/* Header */}
                                    <h2 className="text-white text-sm font-bold mb-1">Choose what to replace</h2>
                                    <p className="text-gray-400 text-[9px] mb-4 text-center px-4">
                                        Select the parts to replace with your content
                                    </p>

                                    {/* Carousel of slots */}
                                    <div className="relative w-full h-32 flex items-center justify-center mb-3">
                                        {storyData.slides.map((slide, idx) => {
                                            const offset = idx - currentCarouselSlot;
                                            const isCenter = offset === 0;
                                            const isLeft = offset === -1;
                                            const isRight = offset === 1;
                                            const isFarLeft = offset === -2;
                                            const isFarRight = offset === 2;
                                            const isSelected = selectedSlot === idx;

                                            let translateX = "0%";
                                            let scale = 0.5;
                                            let opacity = 0;
                                            let zIndex = 0;

                                            if (isCenter) {
                                                translateX = "0%";
                                                scale = 1;
                                                opacity = 1;
                                                zIndex = 30;
                                            } else if (isLeft) {
                                                translateX = "-70%";
                                                scale = 0.75;
                                                opacity = 0.6;
                                                zIndex = 20;
                                            } else if (isRight) {
                                                translateX = "70%";
                                                scale = 0.75;
                                                opacity = 0.6;
                                                zIndex = 20;
                                            } else if (isFarLeft) {
                                                translateX = "-120%";
                                                scale = 0.5;
                                                opacity = 0.3;
                                                zIndex = 10;
                                            } else if (isFarRight) {
                                                translateX = "120%";
                                                scale = 0.5;
                                                opacity = 0.3;
                                                zIndex = 10;
                                            }

                                            return (
                                                <motion.div
                                                    key={idx}
                                                    className="absolute flex flex-col items-center"
                                                    animate={{
                                                        x: translateX,
                                                        scale,
                                                        opacity,
                                                        zIndex,
                                                    }}
                                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                                >
                                                    {/* Slot card - selection overlay only on this */}
                                                    <div
                                                        className={`relative w-24 h-24 rounded-xl overflow-hidden border-2 transition-all ${isSelected
                                                            ? "border-[#EC1D99] border-solid"
                                                            : "border-dashed border-white/30"
                                                            }`}
                                                    >
                                                        <img
                                                            src={slide.image}
                                                            alt={`Slot ${idx + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        {/* Contributor badge */}
                                                        <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-black overflow-hidden">
                                                            <img
                                                                src={storyData.contributors[slide.contributor].avatar}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>

                                                        {/* Selection overlay - ONLY on the slot card */}
                                                        {isSelected && (
                                                            <motion.div
                                                                className="absolute inset-0 bg-[#EC1D99]/40 backdrop-blur-[2px] flex items-center justify-center"
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                            >
                                                                <div className="flex flex-col items-center">
                                                                    <img
                                                                        src={newUser.avatar}
                                                                        alt={newUser.name}
                                                                        className="w-10 h-10 rounded-full border-2 border-[#EC1D99] shadow-lg"
                                                                    />
                                                                    <span className="mt-1 text-white text-[9px] font-bold bg-black/60 px-2 py-0.5 rounded-full">
                                                                        {newUser.name}
                                                                    </span>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                    {/* Slot label - OUTSIDE the slot card */}
                                                    <p className={`text-[9px] mt-1.5 font-bold ${isSelected ? "text-[#EC1D99]" : "text-white/70"}`}>
                                                        Slot {idx + 1}
                                                    </p>
                                                </motion.div>
                                            );
                                        })}
                                    </div>

                                    {/* Carousel indicators */}
                                    <div className="flex gap-1 mb-3">
                                        {storyData.slides.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`h-1 rounded-full transition-all ${idx === currentCarouselSlot
                                                    ? "w-3 bg-[#EC1D99]"
                                                    : "w-1 bg-white/30"
                                                    }`}
                                            />
                                        ))}
                                    </div>

                                    {/* Continue button */}
                                    <motion.button
                                        className={`w-[75%] py-2.5 rounded-xl font-bold text-sm transition-all ${selectedSlot !== null
                                            ? "bg-[#EC1D99] text-white"
                                            : "bg-gray-800 text-gray-500"
                                            }`}
                                        animate={selectedSlot !== null ? { scale: [1, 1.02, 1] } : {}}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {selectedSlot !== null ? "Continue (1)" : "Select a slot"}
                                    </motion.button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* COMPLETION OVERLAY */}
                        <AnimatePresence>
                            {stage === "complete" && (
                                <motion.div
                                    className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <motion.div
                                        className="w-14 h-14 rounded-full bg-[#EC1D99] flex items-center justify-center mb-3"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", bounce: 0.5 }}
                                    >
                                        <Check className="w-7 h-7 text-white" />
                                    </motion.div>
                                    <motion.h3
                                        className="text-white text-base font-bold mb-1"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        Weeve Created!
                                    </motion.h3>
                                    <motion.p
                                        className="text-gray-400 text-xs"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        Your version is now live
                                    </motion.p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Callout annotations - hidden on mobile */}
                <AnimatePresence>
                    {stage === "wButton" && (
                        <motion.div
                            className="hidden sm:block absolute -right-28 bottom-[32px]"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-0.5 bg-[#EC1D99]" />
                                <div className="px-3 py-1.5 bg-[#EC1D99] rounded-lg text-white text-xs font-medium whitespace-nowrap">
                                    Tap W to Weeve
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {(stage === "slotSelection" || stage === "scrolling") && !selectedSlot && (
                        <motion.div
                            className="hidden sm:block absolute -right-32 top-[45%] -translate-y-1/2"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-0.5 bg-purple-500" />
                                <div className="px-3 py-1.5 bg-purple-600 rounded-lg text-white text-xs font-medium whitespace-nowrap">
                                    Swipe to browse
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {stage === "slotSelected" && (
                        <motion.div
                            className="hidden sm:block absolute -right-32 top-[45%] -translate-y-1/2"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-0.5 bg-green-500" />
                                <div className="px-3 py-1.5 bg-green-600 rounded-lg text-white text-xs font-medium whitespace-nowrap">
                                    Add your content!
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom tagline */}
            <motion.div
                className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-10 w-[90%] sm:w-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.6 }}
            >
                <span className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 backdrop-blur-md border border-white/10 text-[9px] sm:text-xs text-white/80 text-center">
                    <span className="font-black text-[#EC1D99]">W</span>
                    <span className="hidden sm:inline">Tap W. Replace a slot. Create your version.</span>
                    <span className="sm:hidden">Tap W to create your version</span>
                </span>
            </motion.div>
        </div>
    );
}
