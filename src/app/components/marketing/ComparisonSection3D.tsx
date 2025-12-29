"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { X, Check, Heart, User, Ghost, Sparkles, MessageCircle, BarChart3, Lock, Users, LucideIcon } from "lucide-react";

export default function ComparisonSection3D() {
    const containerRef = useRef<HTMLDivElement>(null);
    return (
        <section ref={containerRef} className="py-24 bg-zinc-950 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-20"
                >
                    <h2 className="text-4xl md:text-6xl font-bold mb-6">
                        The Evolution of <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EC1D99] to-purple-500">Connection</span>
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Stop playing the optimisation game. Start building real connections.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8 lg:gap-16 items-center">
                    {/* The Old Way - Depressing/Grey */}
                    <motion.div
                        initial={{ opacity: 0, x: -50, rotateY: 10 }}
                        whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="group relative h-[600px] rounded-3xl bg-zinc-900/40 border border-white/5 p-8 flex flex-col overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10" />

                        {/* Glitchy/Static overlay */}
                        <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none mix-blend-overlay" />

                        <div className="relative z-20 mb-auto">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold uppercase tracking-wider mb-6">
                                <X className="w-3 h-3" /> The Old Way
                            </div>
                            <h3 className="text-3xl font-bold text-gray-500 mb-2 group-hover:text-gray-400 transition-colors">Traditional Social</h3>
                            <p className="text-gray-600">Lonely. Performative. Algorithmic.</p>
                        </div>

                        {/* Animated "Bad" Elements */}
                        <div className="relative z-10 flex-1 flex items-center justify-center">
                            <div className="relative w-full max-w-sm grayscale opacity-50 group-hover:opacity-70 transition-opacity">
                                {/* Fake Post */}
                                <div className="bg-zinc-800 rounded-xl p-4 mb-4 border border-zinc-700">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-full bg-zinc-700" />
                                        <div className="w-24 h-3 rounded bg-zinc-700" />
                                    </div>
                                    <div className="h-32 rounded bg-zinc-700 mb-3" />
                                    <div className="flex gap-2">
                                        <div className="w-6 h-6 rounded bg-zinc-700" />
                                        <div className="w-6 h-6 rounded bg-zinc-700" />
                                    </div>
                                </div>

                                {/* Floating Negative Labels */}
                                <FloatingTag x={-20} y={-100} text="0 Likes" icon={Heart} delay={0.2} />
                                <FloatingTag x={80} y={-50} text="Ghost Followers" icon={Ghost} delay={0.4} />
                                <FloatingTag x={-60} y={40} text="Algorithmic Burying" icon={BarChart3} delay={0.6} />
                            </div>
                        </div>

                    </motion.div>

                    {/* The Weeve Way - Vibrant/3D */}
                    <motion.div
                        initial={{ opacity: 0, x: 50, rotateY: -10 }}
                        whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="group relative h-[600px] rounded-3xl bg-gradient-to-br from-[#EC1D99]/10 to-purple-900/20 border border-[#EC1D99]/30 p-8 flex flex-col overflow-hidden perspective-1000"
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#EC1D99]/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

                        <div className="relative z-20 mb-auto">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EC1D99]/20 border border-[#EC1D99]/40 text-[#EC1D99] text-xs font-bold uppercase tracking-wider mb-6 shadow-[0_0_15px_rgba(236,29,153,0.3)]">
                                <Check className="w-3 h-3" /> The Weeve Way
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-2">Weeve</h3>
                            <p className="text-gray-400">Collaborative. Dynamic. Authentic.</p>
                        </div>

                        {/* Animated "Good" Elements */}
                        <div className="relative z-10 flex-1 flex items-center justify-center transform-style-3d">
                            <motion.div
                                animate={{ rotateY: [-5, 5, -5], rotateX: [2, -2, 2] }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                className="relative w-full max-w-sm"
                            >
                                {/* Collaborative Post */}
                                <div className="relative bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-4 border border-white/10 shadow-2xl h-[320px] flex flex-col">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#EC1D99] to-purple-600 rounded-2xl opacity-30 blur group-hover:opacity-50 transition-opacity" />

                                    <div className="relative z-10 flex-1 overflow-hidden">
                                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#EC1D99] to-purple-500/0" />

                                        <div className="space-y-3 pl-8 pt-2">
                                            {[
                                                { user: "Sarah", img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300", delay: 0 },
                                                { user: "Alex", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300", delay: 1.5 },
                                                { user: "You", img: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300", delay: 3 }
                                            ].map((item, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: item.delay, duration: 0.5 }}
                                                    className="relative"
                                                >
                                                    {/* Connector Dot */}
                                                    <div className="absolute -left-[29px] top-3 w-3 h-3 rounded-full border-2 border-[#EC1D99] bg-zinc-900 z-10" />

                                                    {/* Card */}
                                                    <div className="flex items-center gap-3 bg-zinc-800/50 p-2 rounded-lg border border-white/5">
                                                        <img src={item.img} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                                                        <div className="min-w-0">
                                                            <div className="text-[10px] text-gray-400 font-medium">Added by</div>
                                                            <div className="text-xs font-bold text-white flex items-center gap-1">
                                                                {item.user}
                                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}

                                            {/* Infinite Indicator */}
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 4.5 }}
                                                className="flex items-center gap-2 text-[10px] text-[#EC1D99] font-bold"
                                            >
                                                <div className="w-4 h-0.5 bg-[#EC1D99]/50" />
                                                <span>Story continues...</span>
                                            </motion.div>
                                        </div>
                                    </div>
                                </div>

                                {/* Floating Positive Labels */}
                                <FloatingTag x={-40} y={-120} text="Co-Creation" icon={Users} delay={0.2} positive />
                                <FloatingTag x={100} y={-40} text="Algorithm-Free" icon={Sparkles} delay={0.4} positive />
                                <FloatingTag x={-80} y={80} text="Zero Pressure" icon={Lock} delay={0.6} positive />
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

interface FloatingTagProps {
    x: number;
    y: number;
    text: string;
    icon: LucideIcon;
    delay: number;
    positive?: boolean;
}

function FloatingTag({ x, y, text, icon: Icon, delay, positive = false }: FloatingTagProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: y + 20 }}
            whileInView={{ opacity: 1, y }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.5, type: "spring" }}
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border shadow-lg whitespace-nowrap z-30
                ${positive
                    ? 'bg-black/60 border-[#EC1D99]/40 text-white shadow-[#EC1D99]/20'
                    : 'bg-zinc-800/80 border-white/10 text-gray-400'
                }`}
            style={{ x }}
        >
            <Icon className={`w-4 h-4 ${positive ? 'text-[#EC1D99]' : 'text-gray-500'}`} />
            <span className="text-sm font-bold">{text}</span>
        </motion.div>
    );
}
