"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import { ChevronDown, Sparkles, Users, GitBranch, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import MarketingNavbar from "@/app/components/MarketingNavbar";
import MarketingFooter from "@/app/components/MarketingFooter";
import HeroVisual3D from "@/app/components/marketing/HeroVisual3D";
import CollaborativeFlowSection from "@/app/components/marketing/CollaborativeFlowSection";
import ComparisonSection3D from "@/app/components/marketing/ComparisonSection3D";

// --- Components ---

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-white/10">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-6 flex items-center justify-between text-left hover:text-[#EC1D99] transition-colors"
            >
                <span className="text-lg font-medium">{question}</span>
                <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <p className="pb-6 text-gray-400 leading-relaxed">{answer}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Basic Check to see if we are in the native app
import { Capacitor } from "@capacitor/core";

export default function LandingPage() {
    const { loading, user } = useAuth();
    const router = useRouter();
    const [isNative, setIsNative] = useState(false);

    // Redirect authenticated users to the app (via login page which handles routing)
    useEffect(() => {
        if (!loading && user) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    // Detect if we are in the native app to hide download buttons
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const isCapacitor = Capacitor.isNativePlatform();
            const ua = window.navigator.userAgent;
            const isWeeveApp = ua.includes('WeeveApp');
            if (isCapacitor || isWeeveApp) {
                setIsNative(true);
            }
        }
    }, []);

    if (loading) return null;

    return (
        <div className="min-h-screen bg-black text-white selection:bg-[#EC1D99] selection:text-white overflow-x-hidden">
            {/* Navigation */}
            <MarketingNavbar />

            {/* ═══════════════════════════════════════════
                HERO SECTION — Emotional hook + clear value prop
            ═══════════════════════════════════════════ */}
            <section id="download" className="relative pt-20 pb-12 sm:pt-24 sm:pb-20 lg:pt-28 lg:pb-32 overflow-hidden">
                {/* Background Gradients */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.15, 0.25, 0.15]
                    }}
                    transition={{ duration: 8, repeat: Infinity }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#EC1D99]/20 rounded-full blur-[120px] pointer-events-none"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.08, 0.15, 0.08]
                    }}
                    transition={{ duration: 10, repeat: Infinity, delay: 1 }}
                    className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none"
                />

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-16 lg:gap-24">
                        <div className="flex-1 text-center lg:text-left">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#EC1D99]/20 to-purple-600/20 border border-[#EC1D99]/30 mb-6 sm:mb-8"
                            >
                                <Sparkles className="w-4 h-4 text-[#EC1D99]" />
                                <span className="text-sm font-medium text-white">Social media, finally social</span>
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6 sm:mb-8"
                            >
                                Social Media <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EC1D99] to-purple-600">Reimagined.</span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-base sm:text-lg lg:text-xl text-gray-400 mb-8 sm:mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed"
                            >
                                The social app where you don't just watch — you join in.
                                Replace a scene, add your angle, and build something real together.
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="flex flex-col items-center lg:items-start gap-4"
                            >
                                {/* Primary CTA */}


                                {/* App Store Download Links - Hide on Native App */}
                                {!isNative && (
                                    <div className="flex flex-row items-center gap-3">
                                        <a
                                            href="https://apps.apple.com/gb/app/weeve/id6757678144"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="transition-transform hover:scale-105"
                                        >
                                            <img
                                                src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                                                alt="Download on the App Store"
                                                className="h-[44px]"
                                            />
                                        </a>
                                        <a
                                            href="https://play.google.com/store/apps/details?id=com.weeve.app.staging"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="transition-transform hover:scale-105"
                                        >
                                            <img
                                                src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                                                alt="Get it on Google Play"
                                                className="h-[44px]"
                                            />
                                        </a>
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {/* 3D Hero Visual */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6, duration: 0.8 }}
                            className="flex-[1.2] relative"
                        >
                            <HeroVisual3D />
                        </motion.div>
                    </div>
                </div>
            </section>


            {/* ═══════════════════════════════════════════
                HOW IT WORKS — Moved up, simplified 3-step
            ═══════════════════════════════════════════ */}
            <CollaborativeFlowSection />

            {/* ═══════════════════════════════════════════
                WHY WEEVE — Slimmed comparison
            ═══════════════════════════════════════════ */}
            <ComparisonSection3D />

            {/* ═══════════════════════════════════════════
                FEATURE HIGHLIGHTS — 3 hero features
            ═══════════════════════════════════════════ */}
            <section className="py-24 sm:py-32 bg-black relative overflow-hidden">
                {/* Background Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none" />

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16 sm:mb-24"
                    >
                        <h2 className="text-4xl md:text-6xl font-bold mb-6">
                            What Makes Weeve{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EC1D99] to-purple-500">
                                Different
                            </span>
                        </h2>
                        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto">
                            Not another feed. A creative space where stories come alive through collaboration.
                        </p>
                    </motion.div>

                    <div className="space-y-20 sm:space-y-32">
                        {/* Feature 1: Collaborative Stories */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.7 }}
                            className="flex flex-col md:flex-row items-center gap-10 md:gap-16"
                        >
                            <div className="flex-1 text-center md:text-left">
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 mb-6">
                                    <Users className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-bold mb-4">Collaborative Stories</h3>
                                <p className="text-gray-400 text-lg leading-relaxed max-w-lg">
                                    Start a story with a photo or video. Open slots for friends to add their perspectives.
                                    Every contributor brings their angle — creating a rich, multi-dimensional narrative that no single person could make alone.
                                </p>
                            </div>
                            <div className="flex-1 flex justify-center">
                                <div className="relative w-full max-w-sm aspect-square rounded-3xl bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20 flex items-center justify-center overflow-hidden">
                                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none" />
                                    {/* Stacked cards visual */}
                                    <div className="relative w-48 h-64">
                                        <motion.div
                                            animate={{ rotate: [-6, -6], y: [0, -4, 0] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                            className="absolute inset-0 rounded-2xl overflow-hidden border border-white/10 shadow-xl"
                                        >
                                            <img src="https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400" className="w-full h-full object-cover" alt="" />
                                            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                                                <img src="https://i.pravatar.cc/150?img=33" className="w-5 h-5 rounded-full" alt="" />
                                                <span className="text-[10px] text-white font-bold">Alex</span>
                                            </div>
                                        </motion.div>
                                        <motion.div
                                            animate={{ rotate: [3, 3], y: [0, -6, 0] }}
                                            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                                            className="absolute inset-0 translate-x-4 translate-y-4 rounded-2xl overflow-hidden border border-white/10 shadow-xl"
                                        >
                                            <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400" className="w-full h-full object-cover" alt="" />
                                            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                                                <img src="https://i.pravatar.cc/150?img=12" className="w-5 h-5 rounded-full" alt="" />
                                                <span className="text-[10px] text-white font-bold">Jordan</span>
                                            </div>
                                        </motion.div>
                                        <motion.div
                                            animate={{ rotate: [8, 8], y: [0, -3, 0] }}
                                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                                            className="absolute inset-0 translate-x-8 translate-y-8 rounded-2xl overflow-hidden border-2 border-[#EC1D99]/50 shadow-xl shadow-[#EC1D99]/10"
                                        >
                                            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400" className="w-full h-full object-cover" alt="" />
                                            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                                                <img src="https://i.pravatar.cc/150?img=5" className="w-5 h-5 rounded-full" alt="" />
                                                <span className="text-[10px] text-white font-bold">You</span>
                                            </div>
                                        </motion.div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Feature 2: Fork & Remix */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.7 }}
                            className="flex flex-col md:flex-row-reverse items-center gap-10 md:gap-16"
                        >
                            <div className="flex-1 text-center md:text-left">
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 mb-6">
                                    <GitBranch className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-bold mb-4">Fork & Take It Further</h3>
                                <p className="text-gray-400 text-lg leading-relaxed max-w-lg">
                                    Loved someone's story? Fork it. Take the narrative in a completely new direction.
                                    Stories on Weeve aren't static posts — they're living, branching trees of shared creativity.
                                </p>
                            </div>
                            <div className="flex-1 flex justify-center">
                                <div className="relative w-full max-w-sm aspect-square rounded-3xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 flex items-center justify-center overflow-hidden">
                                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none" />
                                    {/* Branching tree visual */}
                                    <svg className="w-64 h-64" viewBox="0 0 256 256">
                                        <motion.circle cx="128" cy="40" r="20" fill="#EC1D99" opacity="0.8"
                                            initial={{ scale: 0 }} whileInView={{ scale: 1 }}
                                            transition={{ delay: 0.2 }}
                                        />
                                        <motion.path d="M128,60 L128,110" stroke="#EC1D99" strokeWidth="2"
                                            initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
                                            transition={{ delay: 0.4, duration: 0.5 }}
                                        />
                                        <motion.path d="M128,110 C128,140 70,140 70,170" fill="none" stroke="#A855F7" strokeWidth="2" strokeDasharray="4 4"
                                            initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
                                            transition={{ delay: 0.8, duration: 0.6 }}
                                        />
                                        <motion.path d="M128,110 C128,140 186,140 186,170" fill="none" stroke="#EC1D99" strokeWidth="2"
                                            initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
                                            transition={{ delay: 0.8, duration: 0.6 }}
                                        />
                                        <motion.circle cx="70" cy="185" r="15" fill="#A855F7" opacity="0.6"
                                            initial={{ scale: 0 }} whileInView={{ scale: 1 }}
                                            transition={{ delay: 1.2 }}
                                        />
                                        <motion.circle cx="186" cy="185" r="15" fill="#EC1D99" opacity="0.6"
                                            initial={{ scale: 0 }} whileInView={{ scale: 1 }}
                                            transition={{ delay: 1.2 }}
                                        />
                                        <motion.path d="M70,200 C70,220 40,220 40,240" fill="none" stroke="#A855F7" strokeWidth="1.5" strokeDasharray="3 3"
                                            initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
                                            transition={{ delay: 1.5, duration: 0.4 }}
                                        />
                                        <motion.path d="M70,200 C70,220 100,220 100,240" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeDasharray="3 3"
                                            initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
                                            transition={{ delay: 1.5, duration: 0.4 }}
                                        />
                                        <motion.text x="128" y="44" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold"
                                            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                        >Root</motion.text>
                                    </svg>
                                </div>
                            </div>
                        </motion.div>

                        {/* Feature 3: Your Circle, Your Rules */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.7 }}
                            className="flex flex-col md:flex-row items-center gap-10 md:gap-16"
                        >
                            <div className="flex-1 text-center md:text-left">
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 mb-6">
                                    <Shield className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-bold mb-4">Your Circle, Your Rules</h3>
                                <p className="text-gray-400 text-lg leading-relaxed max-w-lg">
                                    Not everything needs to be public. Share stories with close friends, specific groups,
                                    or the world — you decide. Weeve is built for real connection, not performing for strangers.
                                </p>
                            </div>
                            <div className="flex-1 flex justify-center">
                                <div className="relative w-full max-w-sm aspect-square rounded-3xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 flex items-center justify-center overflow-hidden">
                                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none" />
                                    {/* Circle of avatars visual */}
                                    <div className="relative w-48 h-48">
                                        {[
                                            { angle: 0, img: "5", delay: 0.2 },
                                            { angle: 60, img: "11", delay: 0.3 },
                                            { angle: 120, img: "9", delay: 0.4 },
                                            { angle: 180, img: "12", delay: 0.5 },
                                            { angle: 240, img: "25", delay: 0.6 },
                                            { angle: 300, img: "33", delay: 0.7 },
                                        ].map((item, idx) => {
                                            const x = 72 + 72 * Math.cos((item.angle * Math.PI) / 180);
                                            const y = 72 + 72 * Math.sin((item.angle * Math.PI) / 180);
                                            return (
                                                <motion.div
                                                    key={idx}
                                                    className="absolute w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500/50 shadow-lg"
                                                    style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
                                                    initial={{ scale: 0, opacity: 0 }}
                                                    whileInView={{ scale: 1, opacity: 1 }}
                                                    transition={{ delay: item.delay, type: "spring" }}
                                                >
                                                    <img src={`https://i.pravatar.cc/150?img=${item.img}`} className="w-full h-full object-cover" alt="" />
                                                </motion.div>
                                            );
                                        })}
                                        {/* Center shield */}
                                        <motion.div
                                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-black border-2 border-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                                            initial={{ scale: 0 }}
                                            whileInView={{ scale: 1 }}
                                            transition={{ delay: 0.8, type: "spring" }}
                                        >
                                            <Shield className="w-7 h-7 text-emerald-400" />
                                        </motion.div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>


            {/* ═══════════════════════════════════════════
                FINAL CTA — Strong closer
            ═══════════════════════════════════════════ */}
            <section className="py-24 sm:py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#EC1D99]/10 to-purple-900/20" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />

                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl lg:text-6xl font-black mb-6 tracking-tight">
                            Stories Are Better{" "}
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EC1D99] to-purple-500">Together.</span>
                        </h2>
                        <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Stop scrolling past your friends' lives. Start creating memories with them.
                            Weeve is free on iOS and Android.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <a
                                href="https://apps.apple.com/gb/app/weeve/id6757678144"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="transition-transform hover:scale-105"
                            >
                                <img
                                    src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                                    alt="Download on the App Store"
                                    className="h-[56px]"
                                />
                            </a>
                            <a
                                href="https://play.google.com/store/apps/details?id=com.weeve.app.staging"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="transition-transform hover:scale-105"
                            >
                                <img
                                    src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                                    alt="Get it on Google Play"
                                    className="h-[56px]"
                                />
                            </a>
                        </div>
                    </motion.div>
                </div>
            </section>


            {/* ═══════════════════════════════════════════
                FAQ — Trimmed to 3 essential questions
            ═══════════════════════════════════════════ */}
            <section className="py-24 sm:py-32 bg-black relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-900/50 pointer-events-none" />
                <div className="max-w-3xl mx-auto px-6 relative z-10">
                    <h2 className="text-3xl lg:text-5xl font-bold mb-12 text-center">Common Questions</h2>
                    <div className="space-y-2">
                        <FAQItem
                            question="How do collaborative stories work?"
                            answer="It starts with a standard post (the 'Root'). You then open Slots for friends to add their perspectives. Contributors select a slot to weave in their own photos or videos, stitching everything together into one shared, evolving narrative."
                        />
                        <FAQItem
                            question="What are Forking and Branching?"
                            answer="Stories on Weeve are alive. If you want to take a story in a new direction, you can Fork it to create a new Branch. This allows narratives to split and grow in infinite directions, turning a single moment into a tree of shared experiences."
                        />
                        <FAQItem
                            question="Is Weeve free?"
                            answer="Yes! Weeve is completely free to download and use on both iOS and Android. We believe authentic connection should be accessible to everyone."
                        />
                    </div>
                </div>
            </section>


            {/* Footer */}
            <MarketingFooter />
        </div>
    );
}
