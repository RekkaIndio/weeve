"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { ArrowRight, Smartphone, Users, Zap, Shield, Camera, Video, Smile, ChevronDown, Globe, Heart, Send, Plus, Play, Sparkles, TrendingUp, X, CheckCircle2, Ban } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MarketingNavbar from "@/app/components/MarketingNavbar";
import MarketingFooter from "@/app/components/MarketingFooter";
import WaitlistModal from "@/app/components/WaitlistModal";
import StoryChainVisual from "@/app/components/StoryChainVisual";
import SmartAppRedirect from "@/app/components/SmartAppRedirect";

// --- Animations ---

const WeeveCreationAnimation = () => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setStep((prev) => (prev + 1) % 4);
        }, 2000);
        return () => clearInterval(timer);
    }, []);

    const variants = {
        initial: { scale: 0.8, opacity: 0, y: 20 },
        animate: { scale: 1, opacity: 1, y: 0 },
        exit: { scale: 0.8, opacity: 0, y: -20 },
    };

    return (
        <div className="relative w-full h-full bg-gray-900 flex flex-col relative overflow-hidden">
            <AnimatePresence mode="wait">
                {step === 0 && (
                    <motion.div
                        key="step1"
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={variants}
                        className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-black"
                    >
                        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
                            <Camera className="w-10 h-10 text-white" />
                        </div>
                        <p className="text-white font-bold">Snap a moment</p>
                        <div className="absolute bottom-10 left-4 right-4 bg-white/10 p-3 rounded-xl backdrop-blur-md">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-500 rounded-full" />
                                <span className="text-sm text-white">Alex started a story</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 1 && (
                    <motion.div
                        key="step2"
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={variants}
                        className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-pink-900 to-black"
                    >
                        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4">
                            <Video className="w-10 h-10 text-white" />
                        </div>
                        <p className="text-white font-bold">Add your view</p>
                        <div className="absolute bottom-24 left-4 right-4 bg-white/10 p-3 rounded-xl backdrop-blur-md">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-green-500 rounded-full" />
                                <span className="text-sm text-white">Sarah added a video</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div
                        key="step3"
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={variants}
                        className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-yellow-900 to-black"
                    >
                        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4">
                            <Smile className="w-10 h-10 text-white" />
                        </div>
                        <p className="text-white font-bold">React & Remix</p>
                        <div className="absolute bottom-36 left-4 right-4 bg-white/10 p-3 rounded-xl backdrop-blur-md">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-yellow-500 rounded-full" />
                                <span className="text-sm text-white">Mike reacted 🔥</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div
                        key="step4"
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={variants}
                        className="absolute inset-0 flex flex-col items-center justify-center"
                    >
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80')] bg-cover bg-center opacity-50" />
                        <div className="relative z-10 text-center p-6">
                            <h3 className="text-3xl font-bold text-white mb-2">Weeve Complete!</h3>
                            <p className="text-gray-300">A shared memory created together.</p>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
                        <div className="absolute bottom-8 left-0 right-0 flex justify-center -space-x-4">
                            <div className="w-12 h-12 bg-blue-500 rounded-full border-2 border-black" />
                            <div className="w-12 h-12 bg-green-500 rounded-full border-2 border-black" />
                            <div className="w-12 h-12 bg-yellow-500 rounded-full border-2 border-black" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Progress Indicators */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-30">
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors duration-300 ${step === i ? "bg-[#EC1D99]" : "bg-gray-700"
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};

// --- Components ---

const PhoneFrame = ({ children }: { children: React.ReactNode }) => (
    <div className="relative w-[280px] h-[580px] bg-black border-8 border-gray-900 rounded-[3rem] overflow-hidden shadow-2xl mx-auto transform transition-transform hover:scale-105 duration-500">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-7 bg-gray-900 rounded-b-3xl z-20" />
        <div className="h-full w-full bg-gray-900 flex flex-col relative">
            {children}
        </div>
    </div>
);

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

    // SmartAppRedirect component handles mobile app redirects
    // Desktop users stay on marketing page

    if (loading) return null;

    return (
        <div className="min-h-screen bg-black text-white selection:bg-[#EC1D99] selection:text-white overflow-x-hidden">
            {/* Smart App Redirect for mobile users with ref codes */}
            <SmartAppRedirect />
            
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

                        {/* Dynamic Story Chain Visual */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6, duration: 0.8 }}
                            className="flex-1 relative min-h-[500px] flex items-center"
                        >
                            <StoryChainVisual />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Why Weeve Works */}
            <section className="py-8 sm:py-12 border-y border-white/5 bg-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <p className="text-center text-sm text-gray-500 font-medium mb-8 uppercase tracking-widest">The Power of Collaboration</p>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Users,
                                title: "Multi-Perspective Stories",
                                desc: "One event, multiple viewpoints. Get the complete picture when everyone contributes their unique angle."
                            },
                            {
                                icon: TrendingUp,
                                title: "Authentic Engagement",
                                desc: "Move beyond passive scrolling. Active participation creates deeper connections and lasting memories."
                            },
                            {
                                icon: Sparkles,
                                title: "Amplified Reach",
                                desc: "Every contributor shares with their network. Your story grows organically through genuine collaboration."
                            }
                        ].map((value, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 text-center hover:border-[#EC1D99]/30 transition-colors group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#EC1D99] to-purple-600 p-0.5 mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    <div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center">
                                        <value.icon className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <h3 className="text-white font-bold mb-2 text-lg">{value.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{value.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Old vs New Social Comparison */}
            <section id="how-it-works" className="py-32 bg-zinc-950 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 via-transparent to-green-900/10" />
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-20"
                    >
                        <h2 className="text-4xl lg:text-6xl font-bold mb-6">
                            Not Your Average <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EC1D99] to-purple-600">Social App</span>
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                            We threw out the toxic playbook and built something better. Here's how Weeve compares to traditional social media.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Old Social */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="p-8 rounded-3xl bg-gradient-to-br from-red-900/20 to-black border border-red-500/20"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <X className="w-8 h-8 text-red-500" />
                                <h3 className="text-2xl font-bold">Old Social</h3>
                            </div>
                            <ul className="space-y-4">
                                {[
                                    "Passive scrolling for hours",
                                    "Algorithm decides what you see",
                                    "Curated, fake perfection",
                                    "Likes and followers obsession",
                                    "Isolated, one-sided posts"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-gray-400">
                                        <Ban className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                        {/* New Social */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="p-8 rounded-3xl bg-gradient-to-br from-green-900/20 to-black border border-green-500/20 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4">
                                <Sparkles className="w-32 h-32 text-green-500/10" />
                            </div>
                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                                <h3 className="text-2xl font-bold">New Social (Weeve)</h3>
                            </div>
                            <ul className="space-y-4 relative z-10">
                                {[
                                    "Active creation and collaboration",
                                    "You choose who you connect with",
                                    "Raw, authentic moments",
                                    "Shared memories matter more",
                                    "Multi-perspective storytelling"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-white">
                                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                        <span className="font-medium">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-32 bg-black relative overflow-hidden">
                {/* Background Gradient */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-[#EC1D99]/20 to-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-24"
                    >
                        <h2 className="text-3xl lg:text-5xl font-bold mb-6">Why Weeve is Different</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                            Built from the ground up to prioritize authentic connection over mindless consumption.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Users,
                                title: "Collaborative Stories",
                                desc: "One story, many perspectives. Build something bigger together by combining everyone's unique view.",
                                color: "from-blue-500 to-cyan-500"
                            },
                            {
                                icon: Heart,
                                title: "Real Connections",
                                desc: "No curated feeds or fake personas. Just authentic moments shared with the people who truly matter.",
                                color: "from-pink-500 to-red-500"
                            },
                            {
                                icon: Sparkles,
                                title: "Create, Don't Consume",
                                desc: "Break the scroll cycle. Every interaction is an invitation to contribute, collaborate, and create.",
                                color: "from-purple-500 to-violet-500"
                            }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                whileHover={{ y: -10 }}
                                className="p-8 rounded-3xl bg-zinc-900/50 border border-white/10 hover:border-white/20 transition-all duration-300 group"
                            >
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} p-0.5 mb-6`}>
                                    <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center">
                                        <feature.icon className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                                <p className="text-gray-400 leading-relaxed">
                                    {feature.desc}
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
                            { icon: Video, title: "Photos & Videos", desc: "Mix and match media types", color: "from-blue-500 to-cyan-500" },
                            { icon: Users, title: "Unlimited narratives", desc: "Everyone adds their view", color: "from-purple-500 to-pink-500" },
                            { icon: Shield, title: "Privacy Controls", desc: "Public or private stories", color: "from-orange-500 to-red-500" },
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
