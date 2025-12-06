"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Camera, Video, Sparkles, GitBranch, Pencil, Type } from "lucide-react";

interface Contributor {
    id: number;
    user: string;
    avatar: string;
    img: string;
    type: "photo" | "video" | "drawing" | "text";
    color: string;
}

const MAIN_TIMELINE: Contributor[] = [
    { id: 1, user: "Alex", avatar: "https://i.pravatar.cc/100?img=33", img: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=600&fit=crop", type: "video", color: "from-blue-500 to-cyan-500" },
    { id: 2, user: "Sarah", avatar: "https://i.pravatar.cc/100?img=12", img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=600&fit=crop", type: "photo", color: "from-pink-500 to-rose-500" },
    { id: 3, user: "Mike", avatar: "https://i.pravatar.cc/100?img=15", img: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=600&fit=crop", type: "drawing", color: "from-yellow-500 to-orange-500" },
    { id: 4, user: "Emma", avatar: "https://i.pravatar.cc/100?img=20", img: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=600&fit=crop", type: "text", color: "from-purple-500 to-violet-500" },
    { id: 5, user: "Jake", avatar: "https://i.pravatar.cc/100?img=25", img: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=400&h=600&fit=crop", type: "video", color: "from-green-500 to-emerald-500" },
    { id: 6, user: "Zoe", avatar: "https://i.pravatar.cc/100?img=30", img: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&h=600&fit=crop", type: "photo", color: "from-orange-500 to-red-500" }
];

const YOUR_CONTENT = [
    { img: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=600&fit=crop", type: "video" },
    { img: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&h=600&fit=crop", type: "photo" }
];

const BRANCH_INDICES = [2, 4];

export default function WeeveTreeVisual() {
    const [phase, setPhase] = useState<'building' | 'highlight' | 'transform' | 'complete'>('building');
    const [visibleCards, setVisibleCards] = useState(0);
    const [cycleKey, setCycleKey] = useState(0);

    useEffect(() => {
        // Reset state for new cycle
        setPhase('building');
        setVisibleCards(0);

        const buildTime = 300 + MAIN_TIMELINE.length * 200;
        const cardTimers = MAIN_TIMELINE.map((_, index) => 
            setTimeout(() => setVisibleCards(index + 1), 300 + index * 200)
        );
        const highlightTimer = setTimeout(() => setPhase('highlight'), buildTime + 500);
        const transformTimer = setTimeout(() => setPhase('transform'), buildTime + 2000);
        const completeTimer = setTimeout(() => setPhase('complete'), buildTime + 3500);
        
        // After complete phase, wait 3 seconds then restart the cycle
        const restartTimer = setTimeout(() => {
            setCycleKey(prev => prev + 1);
        }, buildTime + 6500);

        return () => {
            cardTimers.forEach(clearTimeout);
            clearTimeout(highlightTimer);
            clearTimeout(transformTimer);
            clearTimeout(completeTimer);
            clearTimeout(restartTimer);
        };
    }, [cycleKey]);

    const isBeingReplaced = (index: number) => BRANCH_INDICES.includes(index);
    const isHighlightPhase = phase === 'highlight' || phase === 'transform';
    const isTransformed = phase === 'transform' || phase === 'complete';

    const getReplacementIndex = (index: number) => {
        if (index === 2) return 0;
        if (index === 4) return 1;
        return -1;
    };

    const getCardBorderClass = (index: number, beingReplaced: boolean) => {
        if (index === 0) return 'border-2 border-[#EC1D99]';
        if (beingReplaced && isHighlightPhase) return 'border-2 border-green-500';
        return 'border border-white/30';
    };

    const getCardBgClass = (type: string) => {
        if (type === "drawing") return 'bg-amber-50';
        if (type === "text") return 'bg-slate-800';
        return 'bg-black';
    };

    const renderCard = (contributor: Contributor, index: number) => {
        const beingReplaced = isBeingReplaced(index);
        const replacementIdx = getReplacementIndex(index);
        const showReplacement = beingReplaced && isTransformed;
        
        const borderClass = getCardBorderClass(index, beingReplaced);
        const bgClass = getCardBgClass(contributor.type);
        const iconBgClass = contributor.type === "drawing" ? 'bg-orange-500/80 border-orange-400' : 'bg-black/70 border-white/40';
        const textClass = contributor.type === "drawing" ? 'text-gray-800' : 'text-white';
        const lineClass = isTransformed ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-[#EC1D99] to-purple-600';
        
        return (
            <motion.div
                key={contributor.id}
                initial={{ scale: 0, opacity: 0, y: -20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="relative"
            >
                <div className="relative" style={{ perspective: '1000px' }}>
                    <motion.div
                        animate={{ rotateY: showReplacement ? 180 : 0 }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                        style={{ transformStyle: 'preserve-3d' }}
                        className="relative"
                    >
                        {/* Front of card */}
                        <motion.div
                            className={"relative w-20 h-28 rounded-xl overflow-hidden shadow-lg cursor-pointer " + borderClass + " " + bgClass}
                            style={{ backfaceVisibility: 'hidden' }}
                            animate={beingReplaced && phase === 'highlight' ? {
                                boxShadow: ['0 0 0 0 rgba(34, 197, 94, 0)', '0 0 20px 4px rgba(34, 197, 94, 0.6)', '0 0 0 0 rgba(34, 197, 94, 0)'],
                            } : {}}
                            transition={beingReplaced && phase === 'highlight' ? { duration: 1, repeat: Infinity } : {}}
                        >
                            {(contributor.type === "photo" || contributor.type === "video") && (
                                <>
                                    <img src={contributor.img} alt={contributor.user} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/80" />
                                </>
                            )}
                            {contributor.type === "drawing" && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                                    <svg viewBox="0 0 40 40" className="w-10 h-10 mb-0.5">
                                        <circle cx="20" cy="12" r="5" fill="none" stroke="#f97316" strokeWidth="1.5" />
                                        <path d="M20 17 L20 28" stroke="#f97316" strokeWidth="1.5" />
                                        <path d="M20 22 L15 17" stroke="#f97316" strokeWidth="1.5" />
                                        <path d="M20 22 L25 17" stroke="#f97316" strokeWidth="1.5" />
                                    </svg>
                                    <div className="text-orange-600 text-[7px] font-medium">vibes</div>
                                </div>
                            )}
                            {contributor.type === "text" && (
                                <div className="absolute inset-0 flex items-center justify-center p-2">
                                    <div className="text-white text-[8px] font-medium text-center">&quot;Best show!&quot;</div>
                                </div>
                            )}
                            <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10">
                                <div className="flex items-center gap-1">
                                    <div className={"w-4 h-4 rounded-full border border-white bg-gradient-to-br p-0.5 " + contributor.color}>
                                        <img src={contributor.avatar} alt={contributor.user} className="w-full h-full rounded-full" />
                                    </div>
                                    <div className={"text-[8px] font-bold truncate " + textClass}>{contributor.user}</div>
                                </div>
                            </div>
                            <div className={"absolute top-1.5 right-1.5 p-0.5 rounded backdrop-blur-sm border z-10 " + iconBgClass}>
                                {contributor.type === "video" && <Video className="w-2.5 h-2.5 text-white" />}
                                {contributor.type === "photo" && <Camera className="w-2.5 h-2.5 text-white" />}
                                {contributor.type === "drawing" && <Pencil className="w-2.5 h-2.5 text-white" />}
                                {contributor.type === "text" && <Type className="w-2.5 h-2.5 text-white" />}
                            </div>
                            {index === 0 && (
                                <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-gradient-to-br from-[#EC1D99] to-purple-600 flex items-center justify-center border-2 border-black shadow-lg z-10">
                                    <Sparkles className="w-2 h-2 text-white" />
                                </div>
                            )}
                        </motion.div>

                        {/* Back of card (replacement) */}
                        {beingReplaced && (
                            <motion.div
                                className="absolute inset-0 w-20 h-28 rounded-xl overflow-hidden shadow-xl cursor-pointer border-2 border-green-500 bg-black"
                                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                            >
                                <img src={YOUR_CONTENT[replacementIdx].img} alt="You" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/70" />
                                <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10">
                                    <div className="flex items-center gap-1">
                                        <div className="w-4 h-4 rounded-full border border-white bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                                            <span className="text-white text-[6px] font-bold">Y</span>
                                        </div>
                                        <div className="text-[8px] font-bold text-white">You</div>
                                    </div>
                                </div>
                                <div className="absolute top-1.5 right-1.5 p-0.5 rounded bg-black/70 border border-white/40">
                                    {YOUR_CONTENT[replacementIdx].type === "video" ? <Video className="w-2.5 h-2.5 text-white" /> : <Camera className="w-2.5 h-2.5 text-white" />}
                                </div>
                                <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-green-500 text-white text-[6px] font-bold shadow-lg border border-black">NEW</div>
                            </motion.div>
                        )}
                    </motion.div>
                </div>

                <AnimatePresence>
                    {beingReplaced && phase === 'highlight' && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring" }}
                            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center border-2 border-black z-40"
                        >
                            <GitBranch className="w-2.5 h-2.5 text-white" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {index < MAIN_TIMELINE.length - 1 && (
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: 8 }}
                        transition={{ delay: 0.2 }}
                        className={"absolute -right-2 top-1/2 -translate-y-1/2 h-0.5 rounded-full " + lineClass}
                    />
                )}
            </motion.div>
        );
    };

    const badgeClass = isTransformed ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-[#EC1D99] to-purple-600';

    return (
        <div className="relative w-full h-[500px] lg:h-[550px] flex items-center justify-center overflow-visible px-4 py-8">
            <motion.div 
                animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.15, 1] }}
                transition={{ duration: 5, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-tr from-[#EC1D99]/15 via-purple-600/10 to-blue-500/15 blur-3xl"
            />

            <div className="relative w-full max-w-4xl flex flex-col items-center gap-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className={"px-4 py-2 rounded-full shadow-lg z-40 " + badgeClass}
                >
                    <motion.div 
                        key={isTransformed ? 'your' : 'original'}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-white text-xs font-bold flex items-center gap-2"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        {isTransformed ? 'Your Version' : 'Original Weeve'}
                    </motion.div>
                </motion.div>

                <div className="flex items-center gap-2" key={cycleKey}>
                    {MAIN_TIMELINE.map((contributor, index) => (
                        <AnimatePresence key={contributor.id}>
                            {visibleCards > index && renderCard(contributor, index)}
                        </AnimatePresence>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {phase === 'highlight' && (
                        <motion.div key="highlight" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/80 border border-green-500/60">
                            <GitBranch className="w-4 h-4 text-green-400" />
                            <span className="text-white text-sm font-medium">Selecting slots to replace...</span>
                        </motion.div>
                    )}
                    {phase === 'transform' && (
                        <motion.div key="transform" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/80 border border-green-500/60">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                                <Sparkles className="w-4 h-4 text-green-400" />
                            </motion.div>
                            <span className="text-white text-sm font-medium">Adding your perspective...</span>
                        </motion.div>
                    )}
                    {phase === 'complete' && (
                        <motion.div key="complete" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-400 text-sm font-medium mb-3">Same story, your moments ✨</motion.p>
                            <p className="text-gray-400 text-sm"><span className="text-[#EC1D99] font-semibold">Pick any slots.</span> Replace them with your perspective.</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: phase === 'complete' ? 1 : 0, y: phase === 'complete' ? 0 : 10 }}
                    transition={{ delay: 0.3 }}
                    className="px-6 py-3 rounded-full bg-black/80 backdrop-blur-md border-2 border-[#EC1D99]/60 shadow-2xl"
                >
                    <div className="text-white text-sm font-medium">
                        <span className="text-[#EC1D99] font-bold">6</span> slots • <span className="text-green-400 font-bold">2</span> replaced • <span className="text-white font-bold">∞</span> possibilities
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
