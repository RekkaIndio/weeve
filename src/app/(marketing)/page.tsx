"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { ArrowRight, Users, Zap, Shield, Video, ChevronDown, Heart, Sparkles, X, CheckCircle2, Ban, Pencil, Type } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MarketingNavbar from "@/app/components/MarketingNavbar";
import MarketingFooter from "@/app/components/MarketingFooter";
import WaitlistModal from "@/app/components/WaitlistModal";
import WeeveTreeVisual from "@/app/components/WeeveTreeVisual";

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

export default function LandingPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [waitlistOpen, setWaitlistOpen] = useState(false);

    if (loading) return null;

    return (
        <div className="min-h-screen bg-black text-white selection:bg-[#EC1D99] selection:text-white overflow-x-hidden">
            {/* Navigation */}
            <MarketingNavbar onWaitlistClick={() => setWaitlistOpen(true)} />

            {/* Hero Section */}
            <section className="relative pt-24 pb-12 sm:pt-32 sm:pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                {/* Background Gradients */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.2, 0.3, 0.2]
                    }}
                    transition={{ duration: 8, repeat: Infinity }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#EC1D99]/20 rounded-full blur-[120px] pointer-events-none"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.1, 0.2, 0.1]
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
                                className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 sm:mb-8"
                            >
                                Stories Built <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EC1D99] to-purple-600">Together.</span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-base sm:text-lg lg:text-xl text-gray-400 mb-8 sm:mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed"
                            >
                                Stop doomscrolling. Start creating. Weeve lets you and your friends build collaborative stories that capture every angle, every moment, every memory.
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
                            >
                                <button
                                    onClick={() => setWaitlistOpen(true)}
                                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#EC1D99] to-purple-600 hover:from-[#EC1D99]/90 hover:to-purple-600/90 text-white font-bold rounded-full transition-all shadow-[0_0_30px_rgba(236,29,153,0.3)] flex items-center justify-center gap-2"
                                >
                                    Join Waitlist <ArrowRight className="w-5 h-5" />
                                </button>
                                <Link
                                    href="#how-it-works"
                                    className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-full transition-colors flex items-center justify-center gap-2"
                                >
                                    See How It Works
                                </Link>
                            </motion.div>
                        </div>

                        {/* Dynamic Weeve Tree Visual */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6, duration: 0.8 }}
                            className="flex-1 relative min-h-[500px] flex items-center"
                        >
                            <WeeveTreeVisual />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Value Props Bar */}
            <section className="py-10 sm:py-12 border-y border-white/5 bg-gradient-to-r from-[#EC1D99]/5 via-purple-600/5 to-[#EC1D99]/5">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-12 text-center">
                        {[
                            { icon: Heart, label: "Engagement beyond Algorithms" },
                            { icon: Users, label: "Connection without Competition" },
                            { icon: Sparkles, label: "Earn through Collaboration" }
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                            >
                                <item.icon className="w-4 h-4 text-[#EC1D99]" />
                                <span className="text-sm font-medium">{item.label}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Old vs New Social Comparison */}
            <section id="how-it-works" className="py-24 bg-zinc-950 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 via-transparent to-green-900/10" />
                <div className="max-w-6xl mx-auto px-6 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl lg:text-5xl font-bold mb-4">
                            Social Media, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EC1D99] to-purple-600">Reimagined</span>
                        </h2>
                        <p className="text-gray-400 max-w-xl mx-auto">
                            Built for creators who want to collaborate, not compete.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Old Social */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="p-6 rounded-2xl bg-gradient-to-br from-red-900/20 to-black border border-red-500/20"
                        >
                            <div className="flex items-center gap-2 mb-5">
                                <X className="w-6 h-6 text-red-500" />
                                <h3 className="text-lg font-bold text-gray-300">Traditional Social</h3>
                            </div>
                            <ul className="space-y-3">
                                {[
                                    "You post alone, hope for likes",
                                    "Algorithms bury your content",
                                    "Brands pay to reach YOUR followers",
                                    "Your content makes them money",
                                    "Designed to keep you scrolling"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-2.5 text-gray-500 text-sm">
                                        <Ban className="w-4 h-4 text-red-500/70 shrink-0 mt-0.5" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                        {/* Weeve */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="p-6 rounded-2xl bg-gradient-to-br from-[#EC1D99]/20 to-black border border-[#EC1D99]/30 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4">
                                <Sparkles className="w-24 h-24 text-[#EC1D99]/10" />
                            </div>
                            <div className="flex items-center gap-2 mb-5 relative z-10">
                                <CheckCircle2 className="w-6 h-6 text-[#EC1D99]" />
                                <h3 className="text-lg font-bold">Weeve</h3>
                            </div>
                            <ul className="space-y-3 relative z-10">
                                {[
                                    "Collaborate with friends on shared stories",
                                    "Your circle sees everything you share",
                                    "Brands collaborate WITH you, not around you",
                                    "Creators earn from brand partnerships",
                                    "Designed to capture real moments together"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-2.5 text-white text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-[#EC1D99] shrink-0 mt-0.5" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* How It Works - Step by Step */}
            <section className="py-24 bg-black relative overflow-hidden">
                {/* Background Gradient */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-[#EC1D99]/10 to-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl lg:text-5xl font-bold mb-6">How Weeve Works</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                            Three simple steps to create collaborative stories with your friends.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8 relative">
                        {/* Connection line */}
                        <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-[#EC1D99] via-purple-600 to-[#EC1D99]" />
                        
                        {[
                            {
                                step: "01",
                                title: "Start a Story",
                                desc: "Capture a moment with a photo, video, drawing, or text. Invite friends to add their perspective.",
                                color: "from-[#EC1D99] to-pink-600"
                            },
                            {
                                step: "02",
                                title: "Friends Add Their View",
                                desc: "Friends contribute their angle—photos, videos, sketches, or thoughts—building a richer story together.",
                                color: "from-purple-500 to-violet-600"
                            },
                            {
                                step: "03",
                                title: "Watch It Come Together",
                                desc: "All perspectives weave into one beautiful, multi-angle story. Share it or keep it private—your choice.",
                                color: "from-blue-500 to-cyan-500"
                            }
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15 }}
                                className="relative text-center"
                            >
                                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${item.color} p-0.5 mx-auto mb-6 relative z-10`}>
                                    <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
                                        <span className="text-white font-bold text-xl">{item.step}</span>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                                <p className="text-gray-400 leading-relaxed text-sm">
                                    {item.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Platform Capabilities */}
            <section className="py-32 bg-zinc-950 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 to-transparent" />
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-5xl font-bold mb-6">Built for Modern Storytelling</h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                            Everything you need to create, collaborate, and share multi-perspective stories that matter.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-8">
                        {[
                            { icon: Video, title: "Photos & Videos", desc: "Capture any moment", color: "from-blue-500 to-cyan-500" },
                            { icon: Pencil, title: "Drawings & Text", desc: "Sketch or write your view", color: "from-purple-500 to-pink-500" },
                            { icon: Users, title: "Unlimited Contributors", desc: "Everyone adds their perspective", color: "from-orange-500 to-red-500" },
                            { icon: Zap, title: "Real-Time Sync", desc: "See updates instantly", color: "from-green-500 to-emerald-500" }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="text-center p-8 rounded-2xl bg-black/50 border border-white/10 hover:border-white/20 transition-colors"
                            >
                                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} p-0.5 mx-auto mb-4`}>
                                    <div className="w-full h-full bg-black rounded-[11px] flex items-center justify-center">
                                        <feature.icon className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <h3 className="text-white font-bold mb-2">{feature.title}</h3>
                                <p className="text-gray-400 text-sm">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-32 bg-black">
                <div className="max-w-3xl mx-auto px-6">
                    <h2 className="text-3xl lg:text-5xl font-bold mb-12 text-center">Common Questions</h2>
                    <div className="space-y-2">
                        <FAQItem
                            question="Is Weeve free to use?"
                            answer="Yes! Weeve is completely free to download and use. We believe authentic connection should be accessible to everyone."
                        />
                        <FAQItem
                            question="How do collaborative stories work?"
                            answer="One person starts a story with a photo or video, then invites friends to add their perspectives. All contributions weave together into one seamless narrative that captures the full experience."
                        />
                        <FAQItem
                            question="Can I keep my stories private?"
                            answer="Absolutely. You have complete control over privacy. Share with specific friends, create private communities, or go public—it's entirely up to you."
                        />
                        <FAQItem
                            question="Is Weeve available on my device?"
                            answer="Weeve will shortly be available on both iOS and Android. Join our waitlist to be notified when it's ready."
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#EC1D99]/10 to-purple-900/20" />
                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl lg:text-6xl font-bold mb-8">Ready to Build Something Real?</h2>
                        <p className="text-xl text-gray-400 mb-12">
                            Stop scrolling. Start creating. Join a community that values authentic moments over perfect posts.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => setWaitlistOpen(true)}
                                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#EC1D99] to-purple-600 hover:from-[#EC1D99]/90 hover:to-purple-600/90 text-white font-bold rounded-full transition-all shadow-[0_0_30px_rgba(236,29,153,0.3)] flex items-center justify-center gap-2"
                            >
                                Join Waitlist <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Waitlist Modal */}
            <WaitlistModal isOpen={waitlistOpen} onClose={() => setWaitlistOpen(false)} />

            {/* Footer */}
            <MarketingFooter />
        </div>
    );
}
