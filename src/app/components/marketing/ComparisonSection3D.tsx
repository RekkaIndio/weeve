"use client";

import { motion } from "framer-motion";
import { useRef } from "react";
import { X, Check, Ghost, Sparkles, BarChart3, Lock, Users, ArrowDown, GitBranch, Heart, MessageCircle } from "lucide-react";

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

                        <div className="relative z-20 mb-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold uppercase tracking-wider mb-6">
                                <X className="w-3 h-3" /> The Old Way
                            </div>
                            <h3 className="text-3xl font-bold text-gray-500 mb-2 group-hover:text-gray-400 transition-colors">Traditional Social</h3>
                            <p className="text-gray-600">Lonely. Performative. Algorithmic.</p>
                        </div>

                        {/* Linear Feed Visualization */}
                        <div className="relative z-10 flex-1 overflow-hidden mask-image-linear-to-b">
                            <motion.div
                                animate={{ y: [-20, -200] }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="flex flex-col gap-4 opacity-50 grayscale"
                            >
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 rounded-full bg-zinc-700" />
                                            <div className="w-24 h-3 rounded bg-zinc-700" />
                                        </div>
                                        <div className="aspect-[4/3] rounded bg-zinc-700 mb-3" />
                                        <div className="flex gap-2">
                                            <div className="w-6 h-6 rounded bg-zinc-700" />
                                            <div className="w-6 h-6 rounded bg-zinc-700" />
                                        </div>
                                    </div>
                                ))}
                            </motion.div>

                            {/* Floating Negative Labels */}
                            <motion.div
                                animate={{ y: [0, 10, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute inset-0 pointer-events-none"
                            >
                                <div className="absolute top-[20%] right-10 bg-zinc-900/90 border border-zinc-700 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-xl">
                                    <Ghost className="w-3 h-3 text-gray-400" />
                                    <span className="text-xs font-bold text-gray-400">Ghost Followers</span>
                                </div>
                                <div className="absolute top-[50%] left-10 bg-zinc-900/90 border border-zinc-700 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-xl">
                                    <BarChart3 className="w-3 h-3 text-gray-400" />
                                    <span className="text-xs font-bold text-gray-400">Algorithmic Burying</span>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* The Weeve Way - Vibrant/Tree */}
                    <motion.div
                        initial={{ opacity: 0, x: 50, rotateY: -10 }}
                        whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="group relative h-[600px] rounded-3xl bg-gradient-to-br from-[#EC1D99]/10 to-purple-900/20 border border-[#EC1D99]/30 p-8 flex flex-col overflow-hidden perspective-1000"
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#EC1D99]/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

                        <div className="relative z-20 mb-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EC1D99]/20 border border-[#EC1D99]/40 text-[#EC1D99] text-xs font-bold uppercase tracking-wider mb-6 shadow-[0_0_15px_rgba(236,29,153,0.3)]">
                                <Check className="w-3 h-3" /> The Weeve Way
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-2">Weeve</h3>
                            <p className="text-gray-400">Collaborative. Dynamic. Authentic.</p>
                        </div>

                        {/* Branching Visualization */}
                        <div className="relative z-10 flex-1 flex items-center justify-center">
                            <div className="relative w-full max-w-[320px] h-[400px]">
                                {/* Tree Lines (SVG) */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">
                                    <motion.path
                                        d="M160,40 L160,120"
                                        stroke="#EC1D99"
                                        strokeWidth="2"
                                        initial={{ pathLength: 0 }}
                                        whileInView={{ pathLength: 1 }}
                                        transition={{ duration: 0.8, delay: 0.2 }}
                                    />
                                    {/* Left Branch */}
                                    <motion.path
                                        d="M160,120 C160,160 80,160 80,200 L80,280"
                                        fill="none"
                                        stroke="#A855F7"
                                        strokeWidth="2"
                                        strokeDasharray="4 4"
                                        initial={{ pathLength: 0 }}
                                        whileInView={{ pathLength: 1 }}
                                        transition={{ duration: 1, delay: 0.8 }}
                                    />
                                    {/* Right Branch */}
                                    <motion.path
                                        d="M160,120 C160,160 240,160 240,200 L240,280"
                                        fill="none"
                                        stroke="#EC1D99"
                                        strokeWidth="2"
                                        initial={{ pathLength: 0 }}
                                        whileInView={{ pathLength: 1 }}
                                        transition={{ duration: 1, delay: 0.8 }}
                                    />
                                </svg>

                                {/* Root Node */}
                                <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    whileInView={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0 }}
                                    className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-2xl bg-zinc-900 border-2 border-[#EC1D99] p-0.5 z-20 shadow-[0_0_20px_rgba(236,29,153,0.4)]"
                                >
                                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200" className="w-full h-full object-cover rounded-[14px]" />
                                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-[#EC1D99] px-2 py-0.5 rounded-full">ROOT</div>
                                </motion.div>

                                {/* Fork Point */}
                                <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    whileInView={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.6 }}
                                    className="absolute top-[120px] left-1/2 -translate-x-1/2 z-20"
                                >
                                    <div className="w-10 h-10 rounded-full bg-black border border-purple-500 shadow-[0_0_15px_#A855F7] flex items-center justify-center">
                                        <GitBranch className="w-5 h-5 text-white" />
                                    </div>
                                </motion.div>

                                {/* Left Leaf (Video) */}
                                <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    whileInView={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 1.2 }}
                                    className="absolute top-[280px] left-[80px] -translate-x-1/2 w-14 h-14 rounded-xl bg-zinc-900 border border-purple-500/50 p-0.5 z-20"
                                >
                                    <img src="https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=200" className="w-full h-full object-cover rounded-[10px]" />
                                    <div className="absolute -top-3 -right-3 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center border border-black text-[10px] text-white">
                                        <Users className="w-3 h-3" />
                                    </div>
                                </motion.div>

                                {/* Right Leaf (Photo) */}
                                <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    whileInView={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 1.4 }}
                                    className="absolute top-[280px] left-[240px] -translate-x-1/2 w-14 h-14 rounded-xl bg-zinc-900 border border-[#EC1D99]/50 p-0.5 z-20"
                                >
                                    <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=200" className="w-full h-full object-cover rounded-[10px]" />
                                    <div className="absolute -top-3 -right-3 w-6 h-6 bg-[#EC1D99] rounded-full flex items-center justify-center border border-black text-[10px] text-white">
                                        <Heart className="w-3 h-3" />
                                    </div>
                                </motion.div>

                                {/* Floating Tags */}
                                <div className="absolute top-[200px] left-1/2 -translate-x-1/2 flex gap-12 pointer-events-none">
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 1.6 }}
                                        className="bg-black/60 backdrop-blur-md border border-[#EC1D99]/40 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(236,29,153,0.3)]"
                                    >
                                        <Sparkles className="w-3 h-3 text-[#EC1D99]" />
                                        <span className="text-xs font-bold text-white">Live Branch</span>
                                    </motion.div>
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 1.8 }}
                                        className="bg-black/60 backdrop-blur-md border border-purple-500/40 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                                    >
                                        <Lock className="w-3 h-3 text-purple-400" />
                                        <span className="text-xs font-bold text-white">Private</span>
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
