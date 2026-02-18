"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Heart, MessageCircle, Bookmark, Share2, X, Check, Users, GitBranch } from "lucide-react";

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
    const [currentCarouselSlot, setCurrentCarouselSlot] = useState(2);

    // Auto-advance the demo stages
    useEffect(() => {
        const timings: Record<Stage, number> = {
            viewing: 2500,
            wButton: 1800,
            slotSelection: 1200,
            scrolling: 2400,
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
                    setSelectedSlot(3);
                    setStage("slotSelected");
                    break;
                case "slotSelected":
                    setStage("complete");
                    break;
                case "complete":
                    setStage("viewing");
                    setSelectedSlot(null);
                    setCurrentCarouselSlot(2);
                    break;
            }
        }, timings[stage]);

        return () => clearTimeout(timer);
    }, [stage]);

    // Carousel scrolling effect during "scrolling" stage
    useEffect(() => {
        if (stage !== "scrolling") return;

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

    return (
        <div className="relative w-full h-[580px] sm:h-[680px] flex items-center justify-center overflow-visible">
            {/* Multi-layered ambient glow */}
            <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#EC1D99]/10 rounded-full blur-[120px] pointer-events-none"
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[400px] bg-purple-600/15 rounded-full blur-[80px] pointer-events-none"
                animate={{ scale: [1.1, 1, 1.1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />

            {/* Floating feature pills — orbit around the phone */}
            <div className="hidden sm:block">
                <FloatingPill
                    icon={<Users className="w-3 h-3" />}
                    label="5 Contributors"
                    className="absolute top-8 left-0 lg:-left-4"
                    delay={1.5}
                    bobDelay={0}
                />
                <FloatingPill
                    icon={<GitBranch className="w-3 h-3" />}
                    label="3 Branches"
                    className="absolute top-28 right-0 lg:-right-4"
                    delay={2.0}
                    bobDelay={1.5}
                />
                <FloatingPill
                    icon={<Heart className="w-3 h-3 text-pink-400" />}
                    label="247 Likes"
                    className="absolute bottom-32 left-2 lg:-left-2"
                    delay={2.5}
                    bobDelay={0.8}
                />
            </div>

            {/* Main phone mockup */}
            <div className="relative scale-[0.82] sm:scale-95 lg:scale-100">
                {/* Reflection/surface effect below phone */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[260px] h-[60px] bg-[#EC1D99]/8 blur-[30px] rounded-full pointer-events-none" />

                {/* Phone frame */}
                <motion.div
                    className="relative bg-zinc-900 rounded-[2.5rem] p-2"
                    style={{
                        boxShadow: "0 25px 60px -12px rgba(0,0,0,0.6), 0 0 80px rgba(236,29,153,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
                    }}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    {/* Phone border shimmer */}
                    <motion.div
                        className="absolute inset-0 rounded-[2.5rem] pointer-events-none"
                        style={{ background: "linear-gradient(135deg, transparent 40%, rgba(236,29,153,0.15) 50%, transparent 60%)", backgroundSize: "200% 200%" }}
                        animate={{ backgroundPosition: ["0% 0%", "200% 200%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                    />

                    {/* Screen */}
                    <div className="relative bg-black rounded-[2rem] overflow-hidden w-[260px] sm:w-[290px] aspect-[9/16]">
                        {/* Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-b-2xl z-50">
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-zinc-900 rounded-full" />
                        </div>

                        {/* Story content */}
                        <div className="absolute inset-0">
                            {storyData.slides.map((slide, idx) => (
                                <motion.img
                                    key={idx}
                                    src={slide.image}
                                    alt="Story content"
                                    className="absolute inset-0 w-full h-full object-cover"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: idx === activeSlide ? 1 : 0 }}
                                    transition={{ duration: 0.5 }}
                                />
                            ))}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        </div>

                        {/* Slide indicators (5 slots) */}


                        {/* Footer info */}
                        <div className="absolute bottom-0 left-0 right-14 p-4 z-20">
                            <h3 className="text-white text-sm font-bold mb-2 drop-shadow-lg">
                                {storyData.title}
                            </h3>
                            {/* Contributors stack */}
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

                            {/* THE W BUTTON — with pulse ring */}
                            <motion.div
                                className="flex flex-col items-center gap-0.5"
                                animate={stage === "wButton" ? {
                                    scale: [1, 1.2, 1],
                                } : {}}
                                transition={{ duration: 0.5, repeat: stage === "wButton" ? Infinity : 0, repeatDelay: 0.3 }}
                            >
                                <div className="relative">
                                    {/* Pulse ring when active */}
                                    {stage === "wButton" && (
                                        <motion.div
                                            className="absolute inset-0 rounded-full border-2 border-[#EC1D99]"
                                            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                        />
                                    )}
                                    <motion.div
                                        className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${stage === "wButton" || stage === "slotSelection" || stage === "scrolling" || stage === "slotSelected"
                                            ? "bg-[#EC1D99] border-[#EC1D99] text-white scale-110 shadow-[0_0_20px_rgba(236,29,153,0.6)]"
                                            : "bg-gray-800/50 backdrop-blur-sm border-white/20 text-[#EC1D99]"
                                            }`}
                                        whileHover={{ scale: 1.1 }}
                                    >
                                        <span className="font-black text-base">W</span>
                                    </motion.div>
                                </div>
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
                                                translateX = "0%"; scale = 1; opacity = 1; zIndex = 30;
                                            } else if (isLeft) {
                                                translateX = "-70%"; scale = 0.75; opacity = 0.6; zIndex = 20;
                                            } else if (isRight) {
                                                translateX = "70%"; scale = 0.75; opacity = 0.6; zIndex = 20;
                                            } else if (isFarLeft) {
                                                translateX = "-120%"; scale = 0.5; opacity = 0.3; zIndex = 10;
                                            } else if (isFarRight) {
                                                translateX = "120%"; scale = 0.5; opacity = 0.3; zIndex = 10;
                                            }

                                            return (
                                                <motion.div
                                                    key={idx}
                                                    className="absolute flex flex-col items-center"
                                                    animate={{ x: translateX, scale, opacity, zIndex }}
                                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                                >
                                                    <div
                                                        className={`relative w-24 h-24 rounded-xl overflow-hidden border-2 transition-all ${isSelected
                                                            ? "border-[#EC1D99] border-solid shadow-[0_0_15px_rgba(236,29,153,0.5)]"
                                                            : "border-dashed border-white/30"
                                                            }`}
                                                    >
                                                        <img
                                                            src={slide.image}
                                                            alt={`Slot ${idx + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-black overflow-hidden">
                                                            <img
                                                                src={storyData.contributors[slide.contributor].avatar}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>

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
                                            ? "bg-[#EC1D99] text-white shadow-[0_0_20px_rgba(236,29,153,0.4)]"
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
                                    {/* Celebration particles */}
                                    {[...Array(6)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            className="absolute w-1.5 h-1.5 rounded-full bg-[#EC1D99]"
                                            style={{ top: "50%", left: "50%" }}
                                            initial={{ scale: 0, x: 0, y: 0 }}
                                            animate={{
                                                scale: [0, 1, 0],
                                                x: [0, Math.cos((i * 60 * Math.PI) / 180) * 60],
                                                y: [0, Math.sin((i * 60 * Math.PI) / 180) * 60],
                                            }}
                                            transition={{ duration: 0.8, delay: 0.2 }}
                                        />
                                    ))}

                                    <motion.div
                                        className="w-16 h-16 rounded-full bg-gradient-to-br from-[#EC1D99] to-purple-600 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(236,29,153,0.5)]"
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: "spring", bounce: 0.5 }}
                                    >
                                        <Check className="w-8 h-8 text-white" />
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

                {/* Stage-specific callout annotations */}
                <AnimatePresence>
                    {stage === "wButton" && (
                        <motion.div
                            className="hidden sm:block absolute left-full ml-8 bottom-[40px]"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-0.5 bg-gradient-to-r from-transparent to-[#EC1D99]" />
                                <div className="px-4 py-2 bg-gradient-to-r from-[#EC1D99] to-pink-600 rounded-xl text-white text-xs font-bold whitespace-nowrap shadow-[0_0_20px_rgba(236,29,153,0.4)]">
                                    Tap W. Replace a slot. Create your version.
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {(stage === "slotSelection" || stage === "scrolling") && !selectedSlot && (
                        <motion.div
                            className="hidden sm:block absolute left-full ml-8 top-[45%] -translate-y-1/2"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-0.5 bg-gradient-to-r from-transparent to-purple-500" />
                                <div className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white text-xs font-bold whitespace-nowrap shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                                    Swipe to browse slots
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {stage === "slotSelected" && (
                        <motion.div
                            className="hidden sm:block absolute left-full ml-8 top-[45%] -translate-y-1/2"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-0.5 bg-gradient-to-r from-transparent to-green-500" />
                                <div className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-white text-xs font-bold whitespace-nowrap shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                                    Add your content!
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom tagline — redesigned as a pill */}
            <motion.div
                className="absolute bottom-0 sm:bottom-2 left-1/2 -translate-x-1/2 z-10 w-[90%] sm:w-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.6 }}
            >
                <span className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 py-2 rounded-full bg-zinc-900/90 backdrop-blur-md border border-white/10 text-[10px] sm:text-xs text-white/80 text-center shadow-lg">
                    <span className="font-black text-[#EC1D99] text-sm">W</span>
                    <span className="hidden sm:inline">Tap W. Replace a slot. Create your version.</span>
                    <span className="sm:hidden">Tap W to create your version</span>
                </span>
            </motion.div>
        </div>
    );
}

// Floating pill component that orbits around the phone
function FloatingPill({ icon, label, className, delay, bobDelay }: {
    icon: React.ReactNode;
    label: string;
    className: string;
    delay: number;
    bobDelay: number;
}) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
        >
            <motion.div
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/10 shadow-xl"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: bobDelay }}
            >
                <span className="text-[#EC1D99]">{icon}</span>
                <span className="text-xs font-semibold text-white whitespace-nowrap">{label}</span>
            </motion.div>
        </motion.div>
    );
}
