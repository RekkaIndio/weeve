"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Heart, MessageCircle, Zap, Smile, Flame, Star } from "lucide-react";

const STORIES = [
    {
        img: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1925&auto=format&fit=crop",
        userImg: "https://i.pravatar.cc/100?img=33",
        user: "Alex's Story",
        time: "2h ago",
        color: "from-blue-500 to-purple-500"
    },
    {
        img: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80",
        userImg: "https://i.pravatar.cc/100?img=12",
        user: "Sarah's Remix",
        time: "1h ago",
        color: "from-[#EC1D99] to-red-500"
    },
    {
        img: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80",
        userImg: "https://i.pravatar.cc/100?img=15",
        user: "Mike's Vibe",
        time: "30m ago",
        color: "from-yellow-500 to-orange-500"
    },
    {
        img: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
        userImg: "https://i.pravatar.cc/100?img=20",
        user: "Jessie's POV",
        time: "Just now",
        color: "from-green-500 to-emerald-500"
    }
];

const FloatingReaction = ({ icon: Icon, color, delay, x, y }: { icon: any, color: string, delay: number, x: number, y: number }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0, y: 0 }}
        animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.2, 0.8],
            y: -100,
            x: Math.random() * 40 - 20
        }}
        transition={{
            duration: 2,
            delay,
            repeat: Infinity,
            repeatDelay: Math.random() * 3 + 2
        }}
        className={`absolute z-30 p-2 rounded-full bg-white shadow-lg ${color}`}
        style={{ left: x, top: y }}
    >
        <Icon className="w-5 h-5" />
    </motion.div>
);

export default function StoryChainVisual() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const nextIndex = (currentIndex + 1) % STORIES.length;

    const currentStory = STORIES[currentIndex];
    const nextStory = STORIES[nextIndex];

    return (
        <div className="relative w-full h-[500px] lg:h-[600px] flex items-center justify-center perspective-1000">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#EC1D99]/20 to-purple-600/20 blur-3xl rounded-full opacity-40 animate-pulse" />

            {/* Central Active Story (Static Base) */}
            <motion.div
                key={currentIndex} // Re-render animation on index change
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
                className="relative z-10 w-64 h-[400px] bg-black rounded-[2rem] border-4 border-zinc-900 shadow-2xl overflow-hidden"
            >
                {/* Video/Image Content */}
                <div className="absolute inset-0">
                    <img
                        src={currentStory.img}
                        alt="Main Story"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
                </div>

                {/* UI Elements */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full border border-white p-0.5">
                            <img src={currentStory.userImg} alt="Creator" className="w-full h-full rounded-full" />
                        </div>
                        <div>
                            <div className="text-white text-sm font-bold shadow-black drop-shadow-md">{currentStory.user}</div>
                            <div className="text-white/80 text-xs shadow-black drop-shadow-md">{currentStory.time}</div>
                        </div>
                    </div>
                    <div className="px-2 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold border border-white/10">
                        LIVE
                    </div>
                </div>

                {/* Progress Bars */}
                <div className="absolute top-1 left-2 right-2 flex gap-1">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                            <div className={`h-full bg-white ${i === 1 ? 'w-full' : i === 2 ? 'w-[60%]' : 'w-0'}`} />
                        </div>
                    ))}
                </div>

                {/* Bottom Interaction */}
                <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-6 h-6 rounded-full border border-black bg-zinc-800">
                                    <img src={`https://i.pravatar.cc/100?img=${i + currentIndex + 20}`} className="w-full h-full rounded-full" />
                                </div>
                            ))}
                        </div>
                        <div className="text-white/90 text-xs font-medium">+ {124 + currentIndex * 12} others added</div>
                    </div>
                    <button className="w-full h-10 rounded-full bg-gradient-to-r from-[#EC1D99] to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg hover:scale-105 transition-transform">
                        Add to this Weeve
                    </button>
                </div>
            </motion.div>

            {/* Incoming Weeve (The "Next" Card) */}
            <motion.div
                key={nextIndex} // Restart animation when index changes
                initial={{ opacity: 0, scale: 0.6, x: 250, y: 100, rotate: 12 }}
                animate={{
                    opacity: 1,
                    scale: 1,
                    x: 0,
                    y: 0,
                    rotate: 0
                }}
                transition={{
                    duration: 3,
                    ease: "easeInOut",
                    times: [0, 1]
                }}
                onAnimationComplete={() => setCurrentIndex(nextIndex)}
                className="absolute z-20 w-64 h-[400px] bg-black rounded-[2rem] border-4 border-zinc-900 shadow-2xl overflow-hidden"
            >
                <div className="absolute inset-0">
                    <img
                        src={nextStory.img}
                        alt="Next Story"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
                </div>

                {/* Minimal UI for incoming card */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full border border-white p-0.5">
                        <img src={nextStory.userImg} alt="Creator" className="w-full h-full rounded-full" />
                    </div>
                    <div className="text-white text-sm font-bold shadow-black drop-shadow-md">{nextStory.user}</div>
                </div>

                {/* Progress Bar Animation on Incoming Card */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                    <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 3, ease: "linear" }}
                        className={`h-full bg-gradient-to-r ${nextStory.color}`}
                    />
                </div>
            </motion.div>

            {/* Floating Reactions */}
            <FloatingReaction icon={Heart} color="text-red-500" delay={0.5} x={60} y={100} />
            <FloatingReaction icon={Flame} color="text-orange-500" delay={1.2} x={-50} y={150} />
            <FloatingReaction icon={Zap} color="text-yellow-500" delay={2.5} x={80} y={-50} />
            <FloatingReaction icon={Smile} color="text-blue-500" delay={3.1} x={-70} y={20} />
            <FloatingReaction icon={Star} color="text-purple-500" delay={4.0} x={40} y={180} />
        </div>
    );
}
