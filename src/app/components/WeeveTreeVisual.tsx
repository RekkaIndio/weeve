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

// Main weeve timeline (6 contributors)
const MAIN_TIMELINE: Contributor[] = [
    {
        id: 1,
        user: "Alex",
        avatar: "https://i.pravatar.cc/100?img=33",
        img: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=600&fit=crop",
        type: "video",
        color: "from-blue-500 to-cyan-500"
    },
    {
        id: 2,
        user: "Sarah",
        avatar: "https://i.pravatar.cc/100?img=12",
        img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=600&fit=crop",
        type: "photo",
        color: "from-pink-500 to-rose-500"
    },
    {
        id: 3,
        user: "Mike",
        avatar: "https://i.pravatar.cc/100?img=15",
        img: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=600&fit=crop",
        type: "drawing",
        color: "from-yellow-500 to-orange-500"
    },
    {
        id: 4,
        user: "Emma",
        avatar: "https://i.pravatar.cc/100?img=20",
        img: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=600&fit=crop",
        type: "text",
        color: "from-purple-500 to-violet-500"
    },
    {
        id: 5,
        user: "Jake",
        avatar: "https://i.pravatar.cc/100?img=25",
        img: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=400&h=600&fit=crop",
        type: "video",
        color: "from-green-500 to-emerald-500"
    },
    {
        id: 6,
        user: "Zoe",
        avatar: "https://i.pravatar.cc/100?img=30",
        img: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&h=600&fit=crop",
        type: "photo",
        color: "from-orange-500 to-red-500"
    }
];

// The two slots we're replacing: Mike (index 2) and Jake (index 4)
const BRANCH_INDICES = [2, 4];

export default function WeeveTreeVisual() {
    const [visibleMainCards, setVisibleMainCards] = useState(0);
    const [showBranches, setShowBranches] = useState(false);
    const [showNewTimeline, setShowNewTimeline] = useState(false);

    useEffect(() => {
        const cardTimers = MAIN_TIMELINE.map((_, index) => 
            setTimeout(() => setVisibleMainCards(index + 1), 400 + index * 300)
        );
        const branchTimer = setTimeout(() => setShowBranches(true), 400 + MAIN_TIMELINE.length * 300 + 500);
        const newTimelineTimer = setTimeout(() => setShowNewTimeline(true), 400 + MAIN_TIMELINE.length * 300 + 1000);

        return () => {
            cardTimers.forEach(clearTimeout);
            clearTimeout(branchTimer);
            clearTimeout(newTimelineTimer);
        };
    }, []);

    const renderSmallCard = (contributor: Contributor, index: number, isBranchPoint: boolean) => (
        <motion.div
            whileHover={{ scale: 1.08, y: -4 }}
            className={`relative w-16 h-24 rounded-xl overflow-hidden shadow-lg cursor-pointer ${
                index === 0 ? 'border-2 border-[#EC1D99]' : 
                isBranchPoint ? 'border-2 border-green-500' : 'border border-white/30'
            } ${
                contributor.type === "drawing" ? 'bg-amber-50' : 
                contributor.type === "text" ? 'bg-slate-800' : 'bg-black'
            }`}
        >
            {(contributor.type === "photo" || contributor.type === "video") && (
                <>
                    <img src={contributor.img} alt={contributor.user} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/80" />
                </>
            )}
            {contributor.type === "drawing" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                    <svg viewBox="0 0 40 40" className="w-8 h-8 mb-0.5">
                        <circle cx="20" cy="12" r="5" fill="none" stroke="#f97316" strokeWidth="1.5" />
                        <path d="M20 17 L20 28" stroke="#f97316" strokeWidth="1.5" />
                        <path d="M20 22 L15 17" stroke="#f97316" strokeWidth="1.5" />
                        <path d="M20 22 L25 17" stroke="#f97316" strokeWidth="1.5" />
                    </svg>
                    <div className="text-orange-600 text-[6px] font-medium">vibes</div>
                </div>
            )}
            {contributor.type === "text" && (
                <div className="absolute inset-0 flex items-center justify-center p-1">
                    <div className="text-white text-[6px] font-medium text-center">"Best show!"</div>
                </div>
            )}
            <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10">
                <div className="flex items-center gap-1">
                    <div className={`w-4 h-4 rounded-full border border-white bg-gradient-to-br ${contributor.color} p-0.5`}>
                        <img src={contributor.avatar} alt={contributor.user} className="w-full h-full rounded-full" />
                    </div>
                    <div className={`text-[8px] font-bold truncate ${contributor.type === "drawing" ? 'text-gray-800' : 'text-white'}`}>
                        {contributor.user}
                    </div>
                </div>
            </div>
            <div className={`absolute top-1.5 right-1.5 p-0.5 rounded backdrop-blur-sm border z-10 ${
                contributor.type === "drawing" ? 'bg-orange-500/80 border-orange-400' : 'bg-black/70 border-white/40'
            }`}>
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
    );

    const renderLargeCard = (
        user: string, 
        avatar: string, 
        img: string, 
        color: string, 
        isNew?: boolean,
        type?: string
    ) => (
        <div className={`relative w-24 h-36 rounded-2xl overflow-hidden shadow-xl cursor-pointer ${
            isNew ? 'border-2 border-green-500' : 'border border-white/30'
        } bg-black`}>
            <img src={img} alt={user} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/70" />
            <div className="absolute bottom-2 left-2 right-2 z-10">
                <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full border-2 border-white bg-gradient-to-br ${color} ${isNew ? 'flex items-center justify-center' : 'p-0.5'}`}>
                        {isNew ? (
                            <span className="text-white text-[6px] font-bold">{user.charAt(0)}</span>
                        ) : (
                            <img src={avatar} alt={user} className="w-full h-full rounded-full" />
                        )}
                    </div>
                    <div className="text-white text-[10px] font-bold truncate">{user}</div>
                </div>
            </div>
            {type && (
                <div className="absolute top-2 right-2 p-1 rounded bg-black/70 border border-white/40">
                    {type === "video" && <Video className="w-3 h-3 text-white" />}
                    {type === "photo" && <Camera className="w-3 h-3 text-white" />}
                </div>
            )}
            {isNew && (
                <div className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-green-500 text-white text-[7px] font-bold shadow-lg border-2 border-black">
                    NEW
                </div>
            )}
        </div>
    );

    return (
        <div className="relative w-full h-[700px] lg:h-[800px] flex items-center justify-center overflow-visible px-4 py-8">
            <motion.div 
                animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.15, 1] }}
                transition={{ duration: 5, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-tr from-[#EC1D99]/15 via-purple-600/10 to-blue-500/15 blur-3xl"
            />

            <div className="relative w-full max-w-5xl h-full flex flex-col items-center">
                
                {/* Original Weeve Badge */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mb-6 px-4 py-2 rounded-full bg-gradient-to-r from-[#EC1D99] to-purple-600 z-40 shadow-lg"
                >
                    <div className="text-white text-xs font-bold flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5" />
                        Original Weeve
                    </div>
                </motion.div>

                {/* Original Timeline */}
                <div className="flex items-center gap-2 relative">
                    {MAIN_TIMELINE.map((contributor, index) => (
                        <AnimatePresence key={contributor.id}>
                            {visibleMainCards > index && (
                                <motion.div
                                    initial={{ scale: 0, opacity: 0, y: -20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                    className="relative"
                                >
                                    {renderSmallCard(contributor, index, BRANCH_INDICES.includes(index))}
                                    
                                    {/* Connection line */}
                                    {index < MAIN_TIMELINE.length - 1 && (
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: 8 }}
                                            transition={{ delay: 0.2 }}
                                            className="absolute -right-2 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-[#EC1D99] to-purple-600 rounded-full"
                                        />
                                    )}

                                    {/* Branch indicator on Mike (index 2) */}
                                    {index === 2 && showBranches && (
                                        <motion.div
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: "spring", delay: 0.1 }}
                                            className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-5 h-5 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center border-2 border-black z-40"
                                        >
                                            <GitBranch className="w-2.5 h-2.5 text-white" />
                                        </motion.div>
                                    )}

                                    {/* Branch indicator on Jake (index 4) */}
                                    {index === 4 && showBranches && (
                                        <motion.div
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: "spring", delay: 0.2 }}
                                            className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-5 h-5 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center border-2 border-black z-40"
                                        >
                                            <GitBranch className="w-2.5 h-2.5 text-white" />
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    ))}
                </div>

                {/* Arrow/flow indicator */}
                {showBranches && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mt-8 mb-6 flex flex-col items-center gap-2"
                    >
                        {/* Downward arrow */}
                        <div className="w-0.5 h-8 bg-gradient-to-b from-green-500 to-emerald-400 rounded-full" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6 }}
                            className="px-4 py-2 rounded-full bg-black/95 backdrop-blur-md border border-green-500/60 shadow-lg"
                        >
                            <div className="text-white text-xs font-bold flex items-center gap-2">
                                <GitBranch className="w-4 h-4 text-green-400" />
                                Replace 2 slots with your take
                            </div>
                        </motion.div>
                        <div className="w-0.5 h-8 bg-gradient-to-b from-emerald-400 to-green-500 rounded-full" />
                    </motion.div>
                )}

                {/* Your Version Badge */}
                {showNewTimeline && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mb-4 px-4 py-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 z-40 shadow-lg"
                    >
                        <div className="text-white text-xs font-bold flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5" />
                            Your Version
                        </div>
                    </motion.div>
                )}

                {/* New Timeline with YOUR replacements */}
                {showNewTimeline && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center gap-3"
                    >
                        {/* Alex (kept) */}
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }} className="relative">
                            {renderLargeCard("Alex", MAIN_TIMELINE[0].avatar, MAIN_TIMELINE[0].img, MAIN_TIMELINE[0].color, false, "video")}
                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
                        </motion.div>

                        {/* Sarah (kept) */}
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 }} className="relative">
                            {renderLargeCard("Sarah", MAIN_TIMELINE[1].avatar, MAIN_TIMELINE[1].img, MAIN_TIMELINE[1].color, false, "photo")}
                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
                        </motion.div>

                        {/* YOUR REPLACEMENT #1 (was Mike) */}
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7, type: "spring" }} className="relative">
                            {renderLargeCard("You", "", "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=600&fit=crop", "from-green-500 to-emerald-500", true, "video")}
                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
                        </motion.div>

                        {/* Emma (kept) - text type card */}
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 }} className="relative">
                            <div className="relative w-24 h-36 rounded-2xl overflow-hidden shadow-xl cursor-pointer border border-white/30 bg-slate-800 flex items-center justify-center">
                                <div className="text-white text-xs font-medium text-center px-2">"Best show!"</div>
                                <div className="absolute bottom-2 left-2 right-2 z-10">
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-5 h-5 rounded-full border-2 border-white bg-gradient-to-br ${MAIN_TIMELINE[3].color} p-0.5`}>
                                            <img src={MAIN_TIMELINE[3].avatar} alt="Emma" className="w-full h-full rounded-full" />
                                        </div>
                                        <div className="text-white text-[10px] font-bold">Emma</div>
                                    </div>
                                </div>
                                <div className="absolute top-2 right-2 p-1 rounded bg-black/70 border border-white/40">
                                    <Type className="w-3 h-3 text-white" />
                                </div>
                            </div>
                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
                        </motion.div>

                        {/* YOUR REPLACEMENT #2 (was Jake) */}
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.9, type: "spring" }} className="relative">
                            {renderLargeCard("You", "", "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&h=600&fit=crop", "from-green-500 to-emerald-500", true, "photo")}
                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
                        </motion.div>

                        {/* Zoe (kept) */}
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.0 }}>
                            {renderLargeCard("Zoe", MAIN_TIMELINE[5].avatar, MAIN_TIMELINE[5].img, MAIN_TIMELINE[5].color, false, "photo")}
                        </motion.div>
                    </motion.div>
                )}

                {/* Result Text */}
                {showNewTimeline && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2 }}
                        className="mt-6 text-green-400 text-sm font-medium"
                    >
                        Same story, your moments ✨
                    </motion.p>
                )}

                {/* Bottom Info */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 3.5 }}
                    className="mt-6 text-center"
                >
                    <p className="text-gray-400 text-sm px-4">
                        <span className="text-[#EC1D99] font-semibold">Pick any slots.</span> Replace them with your perspective.
                    </p>
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 3.8 }}
                    className="mt-4 px-6 py-3 rounded-full bg-black/80 backdrop-blur-md border-2 border-[#EC1D99]/60 shadow-2xl"
                >
                    <div className="text-white text-sm font-medium">
                        <span className="text-[#EC1D99] font-bold">6</span> slots • <span className="text-green-400 font-bold">2</span> replaced • <span className="text-white font-bold">∞</span> possibilities
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
