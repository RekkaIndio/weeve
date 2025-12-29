"use client";

import { motion, useSpring, useTransform, AnimatePresence, useMotionValue } from "framer-motion";
import { useState, useEffect } from "react";
import { Heart, MessageCircle, Video, Camera, PenTool, Type, Sparkles, GitBranch } from "lucide-react";

// 5 contributors for original story
const originalStory = [
    { id: 1, user: "Sarah", avatar: "https://i.pravatar.cc/150?img=1", type: "photo", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400" },
    { id: 2, user: "Alex", avatar: "https://i.pravatar.cc/150?img=33", type: "video", image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400" },
    { id: 3, user: "Jordan", avatar: "https://i.pravatar.cc/150?img=12", type: "drawing", image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400" },
    { id: 4, user: "Sam", avatar: "https://i.pravatar.cc/150?img=5", type: "text", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400" },
    { id: 5, user: "Taylor", avatar: "https://i.pravatar.cc/150?img=47", type: "photo", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400" },
];

// Forked branch - starts with a COPY of Alex (the fork point), then new contributors
const forkedStory = [
    { id: 10, user: "Alex", avatar: "https://i.pravatar.cc/150?img=33", type: "video", image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400", isForkPoint: true },
    { id: 11, user: "Maya", avatar: "https://i.pravatar.cc/150?img=45", type: "drawing", image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400" },
    { id: 12, user: "Chris", avatar: "https://i.pravatar.cc/150?img=53", type: "photo", image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400" },
];

export default function PhoneDemo3D() {
    const [mainProgress, setMainProgress] = useState(0);
    const [forkProgress, setForkProgress] = useState(0);
    const [showFork, setShowFork] = useState(false);

    useEffect(() => {
        const sequence = async () => {
            setMainProgress(0);
            setForkProgress(0);
            setShowFork(false);

            await new Promise(r => setTimeout(r, 500));

            // Build first 2 items of main story
            setMainProgress(1);
            await new Promise(r => setTimeout(r, 800));
            setMainProgress(2);
            await new Promise(r => setTimeout(r, 600));

            // Show fork after Alex (slot 2)
            setShowFork(true);
            await new Promise(r => setTimeout(r, 400));

            // Build fork and rest of main story in parallel
            setForkProgress(1);
            await new Promise(r => setTimeout(r, 600));

            setMainProgress(3);
            await new Promise(r => setTimeout(r, 600));

            setForkProgress(2);
            await new Promise(r => setTimeout(r, 600));

            setMainProgress(4);
            await new Promise(r => setTimeout(r, 600));

            setForkProgress(3);
            await new Promise(r => setTimeout(r, 600));

            setMainProgress(5);

            await new Promise(r => setTimeout(r, 2500));
            sequence();
        };
        sequence();
    }, []);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        mouseX.set((e.clientX - left) / width - 0.5);
        mouseY.set((e.clientY - top) / height - 0.5);
    };
    const handleMouseLeave = () => { mouseX.set(0); mouseY.set(0); };
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), { stiffness: 150, damping: 20 });
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), { stiffness: 150, damping: 20 });

    const currentItem = mainProgress > 0 ? originalStory[Math.min(mainProgress - 1, originalStory.length - 1)] : null;

    // Each card takes 20% width (1/5), fork starts at position 1 (second slot = 20% offset)
    const cardWidth = 100 / 5; // 20%
    const forkOffset = cardWidth; // Starts at slot 2 position (20%)

    return (
        <div className="relative w-full h-[750px] flex items-start justify-center py-10 lg:py-0">
            {/* Background gradient removed for hero integration */}
            {/* <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black" /> */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#EC1D99]/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-6xl mx-auto px-6 relative z-10">
                {/* Main Layout - Stacked vertically to maximize timeline width */}
                <div className="flex flex-col items-center gap-4 w-full origin-top scale-[0.75] sm:scale-[0.80]">

                    {/* Phone */}
                    <div className="flex-shrink-0 self-center">
                        <div className="perspective-1000" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
                            <motion.div
                                style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                                className="relative w-[260px] h-[520px] bg-zinc-950 rounded-[40px] border-4 border-zinc-800 shadow-2xl overflow-hidden"
                            >
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-6 bg-black rounded-b-xl z-30" />
                                <div className="relative w-full h-full bg-zinc-900">
                                    <AnimatePresence initial={false}>
                                        {currentItem && (
                                            <motion.div
                                                key={currentItem.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute inset-0"
                                            >
                                                {/* Media */}
                                                <img src={currentItem.image} className="w-full h-full object-cover" />

                                                {/* Gradient Overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 pointer-events-none" />

                                                {/* Right Sidebar Actions */}
                                                <div className="absolute right-3 bottom-24 flex flex-col items-center gap-3 text-white">
                                                    {/* Like */}
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <div className="w-9 h-9 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center border border-white/20">
                                                            <Heart className="w-5 h-5" />
                                                        </div>
                                                        <span className="text-[9px] font-bold">2.4K</span>
                                                    </div>

                                                    {/* Comment */}
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <div className="w-9 h-9 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center border border-white/20">
                                                            <MessageCircle className="w-5 h-5" />
                                                        </div>
                                                        <span className="text-[9px] font-bold">89</span>
                                                    </div>

                                                    {/* Weeve Button */}
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <div className="w-9 h-9 rounded-full bg-[#EC1D99] flex items-center justify-center border border-white/20 shadow-[0_0_12px_#EC1D99]">
                                                            <span className="font-black text-sm text-white">W</span>
                                                        </div>
                                                        <span className="text-[9px] font-bold text-[#EC1D99]">Weeve</span>
                                                    </div>
                                                </div>

                                                {/* Bottom Info */}
                                                <div className="absolute bottom-3 left-3 right-16 text-white">
                                                    {/* Stacked Avatars */}
                                                    <div className="flex items-center mb-2">
                                                        {/* Stacked Avatars - Always show 5 slots */}
                                                        <div className="flex items-center mb-2">
                                                            {originalStory.map((item, idx) => {
                                                                const isActive = mainProgress > 0 && idx === mainProgress - 1;
                                                                return (
                                                                    <div
                                                                        key={item.id}
                                                                        className={`relative transition-all duration-300 ${idx > 0 ? '-ml-2' : ''} ${isActive ? 'z-10 scale-110' : 'z-0'}`}
                                                                    >
                                                                        <img
                                                                            src={item.avatar}
                                                                            className={`w-7 h-7 rounded-full border-2 object-cover ${isActive ? 'border-[#EC1D99] shadow-[0_0_8px_#EC1D99]' : 'border-black/60 opacity-80'}`}
                                                                        />
                                                                        {isActive && (
                                                                            <div className="absolute inset-0 rounded-full border-2 border-[#EC1D99] animate-pulse" />
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Title */}
                                                    <h3 className="text-sm font-bold mb-0.5 drop-shadow-md">Summer Adventures 🌴</h3>

                                                    {/* Description */}
                                                    <p className="text-[10px] text-gray-200 line-clamp-2 drop-shadow-sm">Join us on our epic journey through the coast!</p>

                                                    {/* Timestamp */}
                                                    <span className="text-[9px] text-gray-400">2h ago</span>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    {!currentItem && (
                                        <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
                                            <Sparkles className="w-8 h-8 text-zinc-600 animate-pulse" />
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Dual Timeline */}
                    <div className="flex-1 w-full">

                        {/* Title removed for hero integration */}

                        {/* ORIGINAL STORY - Top Row (5 cards) */}
                        <div className="mb-2">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#EC1D99]" />
                                <span className="text-[10px] font-bold text-[#EC1D99] uppercase tracking-wider">Original Story</span>
                            </div>

                            <div className="flex items-start gap-1">
                                {originalStory.map((item, index) => {
                                    const isVisible = index < mainProgress;
                                    const isLatest = index === mainProgress - 1;
                                    const isForkPoint = index === 1; // Alex is the fork point
                                    return (
                                        <div key={item.id} className="flex-1 flex flex-col items-center relative">
                                            {/* Line + Dot */}
                                            <div className="w-full flex items-center mb-1">
                                                <div className={`flex-1 h-0.5 ${index === 0 ? 'bg-transparent' : isVisible ? 'bg-[#EC1D99]' : 'bg-zinc-800'}`} />
                                                <div className={`w-2.5 h-2.5 rounded-full border-2 flex items-center justify-center ${isVisible ? 'border-[#EC1D99] bg-zinc-900' : 'border-zinc-700 bg-zinc-900'} ${isLatest ? 'ring-2 ring-[#EC1D99]/30' : ''}`}>
                                                    {isVisible && <div className="w-1 h-1 rounded-full bg-[#EC1D99]" />}
                                                </div>
                                                <div className={`flex-1 h-0.5 ${index === originalStory.length - 1 ? 'bg-transparent' : index < mainProgress - 1 ? 'bg-[#EC1D99]' : 'bg-zinc-800'}`} />
                                            </div>

                                            {/* Card */}
                                            <motion.div
                                                animate={{ opacity: isVisible ? 1 : 0.25 }}
                                                className={`w-full p-1 rounded border ${isLatest ? 'bg-zinc-900 border-[#EC1D99]/40' : isVisible ? 'bg-zinc-900/70 border-zinc-700' : 'bg-zinc-900/20 border-zinc-800/40'}`}
                                            >
                                                <div className="aspect-square rounded-sm overflow-hidden bg-zinc-800 mb-1">
                                                    {isVisible && <img src={item.image} className="w-full h-full object-cover" />}
                                                </div>
                                                <div className="flex items-center gap-0.5">
                                                    <img src={item.avatar} className="w-2.5 h-2.5 rounded-full" />
                                                    <span className="text-[6px] font-bold text-white truncate">{item.user}</span>
                                                </div>
                                            </motion.div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* FORKED STORY - Bottom Row (3 cards, aligned starting from slot 2) */}
                        <div className={`transition-opacity duration-1000 ${showFork ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="mt-0">
                                {/* Connector Row - Vertical line from slot 2 */}
                                <div className="flex items-start gap-1 h-12 mb-[-4px]">
                                    <div className="flex-1" /> {/* Slot 1 Spacer */}

                                    {/* Slot 2 Connector */}
                                    <div className="flex-1 flex justify-center relative">
                                        {/* Vertical Line */}
                                        <div className="h-full w-0.5 border-l-2 border-dashed border-purple-500" />
                                        {/* Fork Icon (Centered on line) */}
                                        <div className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-purple-500 shadow-[0_0_10px_#8B5CF6] flex items-center justify-center z-10">
                                            <GitBranch className="w-3 h-3 text-white" />
                                        </div>
                                    </div>

                                    <div className="flex-1" /> {/* Slot 3 Spacer */}
                                    <div className="flex-1" /> {/* Slot 4 Spacer */}
                                    <div className="flex-1" /> {/* Slot 5 Spacer */}
                                </div>
                                {/* Use same flex structure as top row for alignment */}
                                <div className="flex items-start gap-1">
                                    {/* Empty spacer for slot 1 */}
                                    <div className="flex-1" />

                                    {/* Fork cards - 3 cards aligned with slots 2, 3, 4 */}
                                    {forkedStory.map((item, index) => {
                                        const isVisible = index < forkProgress;
                                        const isLatest = index === forkProgress - 1;
                                        return (
                                            <div key={item.id} className="flex-1 flex flex-col items-center">
                                                {/* Line + Dot */}
                                                <div className="w-full flex items-center justify-center relative mb-1 h-3">
                                                    {/* Lines - absolute to bleed into gaps */}
                                                    {/* Left Line - connects to previous card */}
                                                    {index > 0 && (
                                                        <div className={`absolute top-1/2 -translate-y-1/2 right-1/2 left-[-2px] h-0.5 border-t-2 border-dashed ${isVisible ? 'border-purple-500' : 'border-zinc-700'}`} />
                                                    )}
                                                    {/* Right Line - connects to next card */}
                                                    {index < forkedStory.length - 1 && (
                                                        <div className={`absolute top-1/2 -translate-y-1/2 left-1/2 right-[-2px] h-0.5 border-t-2 border-dashed ${index < forkProgress - 1 ? 'border-purple-500' : 'border-zinc-700'}`} />
                                                    )}

                                                    {/* Dot */}
                                                    <div className={`relative z-10 w-2.5 h-2.5 flex-shrink-0 rounded-full border-2 ${isVisible ? 'border-purple-500 bg-purple-500' : 'border-zinc-700 bg-zinc-900'} ${isLatest ? 'ring-2 ring-purple-500/30' : ''}`} />
                                                </div>

                                                {/* Card */}
                                                <motion.div
                                                    animate={{ opacity: isVisible ? 1 : 0.25 }}
                                                    className={`w-full p-1 rounded border ${isLatest ? 'bg-zinc-900 border-purple-500/40' : isVisible ? 'bg-zinc-900/70 border-zinc-700' : 'bg-zinc-900/20 border-zinc-800/40'}`}
                                                >
                                                    <div className="aspect-square rounded-sm overflow-hidden bg-zinc-800 mb-1">
                                                        {isVisible && <img src={item.image} className="w-full h-full object-cover" />}
                                                    </div>
                                                    <div className="flex items-center gap-0.5">
                                                        <img src={item.avatar} className="w-2.5 h-2.5 rounded-full" />
                                                        <span className="text-[6px] font-bold text-white truncate">{item.user}</span>
                                                    </div>
                                                </motion.div>
                                            </div>
                                        );
                                    })}

                                    {/* Empty spacer for slot 5 */}
                                    <div className="flex-1" />
                                </div>
                            </div>
                        </div>

                        {/* Completion */}
                        {/* Completion - Always rendered to preserve layout height */}
                        <div className={`mt-6 text-center transition-opacity duration-1000 ${(forkProgress === forkedStory.length && mainProgress === originalStory.length) ? 'opacity-100' : 'opacity-0'}`}>
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#EC1D99]/10 to-purple-500/10 border border-[#EC1D99]/20 text-xs text-white">
                                <Sparkles className="w-3 h-3 text-[#EC1D99]" />
                                One moment, infinite possibilities!
                            </span>
                        </div>
                    </div >
                </div >
            </div >
        </div >
    );
}
