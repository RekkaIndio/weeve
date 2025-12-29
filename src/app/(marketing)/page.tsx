"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MarketingNavbar from "@/app/components/MarketingNavbar";
import MarketingFooter from "@/app/components/MarketingFooter";
import WaitlistModal from "@/app/components/WaitlistModal";
import WeeveTreeVisual from "@/app/components/WeeveTreeVisual";
import PhoneDemo3D from "@/app/components/marketing/PhoneDemo3D";
import CollaborativeFlowSection from "@/app/components/marketing/CollaborativeFlowSection";
import FeatureShowcase3D from "@/app/components/marketing/FeatureShowcase3D";
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
            <section className="relative pt-20 pb-12 sm:pt-24 sm:pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
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
                            className="flex-[1.2] relative min-h-[500px] flex items-center"
                        >
                            <PhoneDemo3D />
                        </motion.div>
                    </div>
                </div>
            </section>



            {/* NEW: Comparison Section */}
            <ComparisonSection3D />

            {/* NEW: Collaborative Flow Section */}
            <CollaborativeFlowSection />

            {/* NEW: Feature Showcase */}
            <FeatureShowcase3D />

            {/* FAQ Section */}
            <section className="py-32 bg-black relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-900/50 pointer-events-none" />
                <div className="max-w-3xl mx-auto px-6 relative z-10">
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
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />

                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl lg:text-6xl font-black mb-8 tracking-tight">
                            Ready to Build <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EC1D99] to-purple-500">Something Real?</span>
                        </h2>
                        <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                            Stop scrolling. Start creating. Join a community that values authentic moments over perfect posts.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => setWaitlistOpen(true)}
                                className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-[#EC1D99] to-purple-600 hover:from-[#EC1D99]/90 hover:to-purple-600/90 text-white font-bold text-lg rounded-full transition-all shadow-[0_0_50px_rgba(236,29,153,0.4)] hover:shadow-[0_0_80px_rgba(236,29,153,0.6)] hover:scale-105 flex items-center justify-center gap-2"
                            >
                                Join Waitlist <ArrowRight className="w-6 h-6" />
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
