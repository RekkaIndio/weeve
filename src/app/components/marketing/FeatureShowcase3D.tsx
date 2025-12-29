"use client";

import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { Zap, Shield, Users, Globe, Smartphone, Layers, Palette, Eye, LucideIcon } from "lucide-react";

export default function FeatureShowcase3D() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
    const rotate = useTransform(scrollYProgress, [0, 1], [0, 10]);

    return (
        <section ref={containerRef} className="py-32 bg-black relative overflow-hidden perspective-1000">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center mb-20">
                    <motion.h2
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="text-5xl md:text-7xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-br from-white via-gray-400 to-gray-600"
                    >
                        Built for <br /> Collaborators
                    </motion.h2>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                        The first platform designed for shared creativity.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <FeatureCard
                        title="Real-Time Sync"
                        desc="Updates happen instantly across all devices. No refreshing needed."
                        icon={Zap}
                        color="from-yellow-400 to-orange-500"
                        delay={0.1}
                    />
                    <FeatureCard
                        title="Private Circles"
                        desc="Control exactly who sees your stories. Your safe space."
                        icon={Shield}
                        color="from-green-400 to-emerald-500"
                        delay={0.2}
                    />
                    <FeatureCard
                        title="Global Format"
                        desc="Share seamlessly with friends anywhere in the world."
                        icon={Globe}
                        color="from-blue-400 to-cyan-500"
                        delay={0.3}
                    />
                    <FeatureCard
                        title="Multi-Layered"
                        desc="Stack photos, drawings, and text for rich expression."
                        icon={Layers}
                        color="from-purple-400 to-pink-500"
                        delay={0.4}
                    />
                    <FeatureCard
                        title="Co-Creation Tools"
                        desc="Professional grade filters and editing tools built-in."
                        icon={Palette}
                        color="from-red-400 to-pink-500"
                        delay={0.5}
                    />
                    <FeatureCard
                        title="Mobile First"
                        desc="Optimized for touch, gestures, and one-handed use."
                        icon={Smartphone}
                        color="from-indigo-400 to-violet-500"
                        delay={0.6}
                    />
                    <FeatureCard
                        title="No Algorithms"
                        desc="You see what your friends post. Chronological. Pure."
                        icon={Eye}
                        color="from-teal-400 to-green-500"
                        delay={0.7}
                    />
                    <FeatureCard
                        title="Community"
                        desc="Find your tribe. Join groups that share your passions."
                        icon={Users}
                        color="from-orange-400 to-red-500"
                        delay={0.8}
                    />
                </div>
            </div>
        </section>
    );
}

interface FeatureCardProps {
    title: string;
    desc: string;
    icon: LucideIcon;
    color: string;
    delay: number;
}

function FeatureCard({ title, desc, icon: Icon, color, delay }: FeatureCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50, rotateX: -10 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay, duration: 0.6, type: "spring" }}
            whileHover={{
                y: -10,
                scale: 1.02,
                boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5)"
            }}
            className="group relative p-8 rounded-3xl bg-zinc-900/50 border border-white/5 overflow-hidden backdrop-blur-sm hover:border-white/10 transition-colors"
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} p-0.5 mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">
                {title}
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors">
                {desc}
            </p>
        </motion.div>
    );
}
