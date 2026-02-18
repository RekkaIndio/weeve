"use client";

import { motion } from "framer-motion";
import { X, Check, Ghost, BarChart3, Sparkles, Users, Heart, GitBranch } from "lucide-react";

export default function ComparisonSection3D() {
    return (
        <section className="py-24 sm:py-32 bg-black overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16 sm:mb-20"
                >
                    <h2 className="text-4xl md:text-6xl font-bold mb-6">
                        Social Media Was Built for{" "}
                        <span className="text-gray-500">Audiences</span>.
                        <br />
                        Weeve Is Built for{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EC1D99] to-purple-500">Friends</span>.
                    </h2>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
                    {/* The Old Way */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="relative rounded-2xl bg-zinc-900/40 border border-white/5 p-8 overflow-hidden"
                    >
                        <div className="absolute inset-0 opacity-5 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none" />

                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider mb-8">
                                <X className="w-3 h-3" /> Traditional Social
                            </div>

                            <div className="space-y-5">
                                <ComparisonRow
                                    icon={Ghost}
                                    label="Ghost followers who never see your posts"
                                    negative
                                />
                                <ComparisonRow
                                    icon={BarChart3}
                                    label="Algorithms decide who sees what"
                                    negative
                                />
                                <ComparisonRow
                                    icon={X}
                                    label="Stories vanish after 24 hours"
                                    negative
                                />
                                <ComparisonRow
                                    icon={X}
                                    label="One person posts, everyone else watches"
                                    negative
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* The Weeve Way */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="relative rounded-2xl bg-gradient-to-br from-[#EC1D99]/10 to-purple-900/15 border border-[#EC1D99]/20 p-8 overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#EC1D99]/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EC1D99]/20 border border-[#EC1D99]/40 text-[#EC1D99] text-xs font-bold uppercase tracking-wider mb-8 shadow-[0_0_10px_rgba(236,29,153,0.2)]">
                                <Check className="w-3 h-3" /> Weeve
                            </div>

                            <div className="space-y-5">
                                <ComparisonRow
                                    icon={Users}
                                    label="Real friends who actively participate"
                                />
                                <ComparisonRow
                                    icon={Heart}
                                    label="You choose who sees and joins your stories"
                                />
                                <ComparisonRow
                                    icon={Sparkles}
                                    label="Stories grow and evolve — they never expire"
                                />
                                <ComparisonRow
                                    icon={GitBranch}
                                    label="Everyone contributes, creating together"
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

function ComparisonRow({ icon: Icon, label, negative = false }: { icon: React.ElementType; label: string; negative?: boolean }) {
    return (
        <div className="flex items-start gap-3">
            <div className={`mt-0.5 w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${negative
                    ? "bg-zinc-800/80 text-gray-500"
                    : "bg-[#EC1D99]/20 text-[#EC1D99]"
                }`}>
                <Icon className="w-4 h-4" />
            </div>
            <span className={`text-sm sm:text-base leading-relaxed ${negative ? "text-gray-500" : "text-white"}`}>
                {label}
            </span>
        </div>
    );
}
