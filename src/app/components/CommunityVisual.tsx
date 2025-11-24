"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";

const WeeveCard = ({ src, user, delay, x, y, rotate }: { src: string, user: string, delay: number, x: number, y: number, rotate: number }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
        animate={{
            opacity: 1,
            scale: 1,
            x,
            y,
            rotate,
            transition: {
                type: "spring",
                damping: 20,
                stiffness: 100,
                delay
            }
        }}
        whileHover={{ scale: 1.1, zIndex: 20, transition: { duration: 0.2 } }}
        className="absolute w-32 h-40 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl bg-zinc-900"
    >
        <img src={src} alt="Weeve" className="w-full h-full object-cover" />
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2 py-1 rounded-full">
            <img src={user} alt="User" className="w-4 h-4 rounded-full border border-white" />
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        </div>
    </motion.div>
);

interface CommunityVisualProps {
    name?: string;
    handle?: string;
    members?: string;
    color?: string;
}

export default function CommunityVisual({
    name = "Neon Nights",
    handle = "@neonnights",
    members = "12.5k Members",
    color = "#EC1D99"
}: CommunityVisualProps) {
    return (
        <div className="relative w-full h-[500px] lg:h-[600px] flex items-center justify-center perspective-1000">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#EC1D99]/20 to-purple-600/20 blur-3xl rounded-full opacity-50 animate-pulse" />

            {/* Connecting Lines (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#EC1D99" stopOpacity="0" />
                        <stop offset="50%" stopColor="#EC1D99" stopOpacity="1" />
                        <stop offset="100%" stopColor="#purple-600" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <motion.path
                    d="M 50% 50% L 20% 20%"
                    stroke="url(#lineGradient)"
                    strokeWidth="2"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, delay: 0.5 }}
                />
                <motion.path
                    d="M 50% 50% L 80% 25%"
                    stroke="url(#lineGradient)"
                    strokeWidth="2"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, delay: 0.7 }}
                />
                <motion.path
                    d="M 50% 50% L 15% 70%"
                    stroke="url(#lineGradient)"
                    strokeWidth="2"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, delay: 0.9 }}
                />
                <motion.path
                    d="M 50% 50% L 85% 75%"
                    stroke="url(#lineGradient)"
                    strokeWidth="2"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, delay: 1.1 }}
                />
            </svg>

            {/* Central Group Card */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-64 h-80 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center shadow-[0_0_50px_rgba(236,29,153,0.3)]"
            >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#EC1D99] to-purple-600 p-0.5 mb-4 shadow-lg">
                    <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center">
                        <Zap className="w-10 h-10 text-white" />
                    </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{name}</h3>
                <p className="text-purple-400 text-sm font-medium mb-6">{handle} • {members}</p>

                <div className="w-full bg-white/5 rounded-xl p-4 mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                        <span>Weekly Goal</span>
                        <span>85%</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "85%" }}
                            transition={{ duration: 1.5, delay: 0.5 }}
                            className="h-full bg-gradient-to-r from-[#EC1D99] to-purple-600"
                        />
                    </div>
                </div>

                <div className="flex -space-x-3 mt-auto">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-gray-800 flex items-center justify-center text-xs font-bold">
                            {i === 4 ? '+' : <img src={`https://i.pravatar.cc/100?img=${i + 10}`} className="w-full h-full rounded-full" alt="" />}
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Floating Weeve Cards */}
            <WeeveCard
                src="https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=2070&auto=format&fit=crop"
                user="https://i.pravatar.cc/100?img=5"
                delay={0.5}
                x={-140}
                y={-120}
                rotate={-6}
            />
            <WeeveCard
                src="https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=2070&auto=format&fit=crop"
                user="https://i.pravatar.cc/100?img=8"
                delay={0.7}
                x={150}
                y={-100}
                rotate={6}
            />
            <WeeveCard
                src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop"
                user="https://i.pravatar.cc/100?img=12"
                delay={0.9}
                x={-160}
                y={100}
                rotate={-3}
            />
            <WeeveCard
                src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop"
                user="https://i.pravatar.cc/100?img=15"
                delay={1.1}
                x={160}
                y={120}
                rotate={3}
            />
        </div>
    );
}
