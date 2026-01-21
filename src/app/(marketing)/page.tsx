"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MarketingNavbar from "@/app/components/MarketingNavbar";
import MarketingFooter from "@/app/components/MarketingFooter";
// WaitlistModal removed - using direct signup links now
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
    const { loading } = useAuth();
    // Auth and routing removed - now using direct app store links

    if (loading) return null;

    return (
        <div className="min-h-screen bg-black text-white selection:bg-[#EC1D99] selection:text-white overflow-x-hidden">
            {/* Navigation */}
            <MarketingNavbar />

            {/* Hero Section */}
            <section id="download" className="relative pt-20 pb-12 sm:pt-24 sm:pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
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
                                Every stitch, every Weeve. Stories never reset. Build. Collaborate. Evolve.
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="flex flex-col items-center lg:items-start gap-6"
                            >
                                {/* Auth Buttons */}
                                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                    <Link
                                        href="/signup"
                                        className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#EC1D99] to-purple-600 hover:from-[#EC1D99]/90 hover:to-purple-600/90 text-white font-bold rounded-full transition-all shadow-[0_0_30px_rgba(236,29,153,0.3)] flex items-center justify-center gap-2"
                                    >
                                        Get Started <ArrowRight className="w-5 h-5" />
                                    </Link>
                                    <Link
                                        href="/login"
                                        className="w-full sm:w-auto px-8 py-4 border border-white/20 hover:border-white/40 text-white font-bold rounded-full transition-all flex items-center justify-center"
                                    >
                                        Log In
                                    </Link>
                                </div>

                                {/* App Store Download Links */}
                                <div className="flex flex-col sm:flex-row items-center gap-3">
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
                            question="How do collaborative stories work?"
                            answer="It starts with a standard post (the 'Root'). You then open Slots for friends to add their perspectives. Contributors select a slot to weave in their own photos or videos, stitching everything together into one shared, evolving narrative."
                        />
                        <FAQItem
                            question="What are Forking and Branching?"
                            answer="Stories on Weeve are alive. If you want to take a story in a new direction, you can Fork it to create a new Branch. This allows narratives to split and grow in infinite directions, turning a single moment into a tree of shared experiences."
                        />
                        <FAQItem
                            question="Can I control who contributes?"
                            answer="Absolutely. You have full control over your privacy and collaboration settings. You decide who can view, fill slots, or fork your stories—whether it's just close friends, specific groups, or the whole world."
                        />
                        <FAQItem
                            question="Is Weeve free to use?"
                            answer="Yes! Weeve is completely free to download and use. We believe authentic connection should be accessible to everyone."
                        />
                        <FAQItem
                            question="Is Weeve available on my device?"
                            answer="Yes! Weeve is available on both iOS and Android. Download it from the App Store or Google Play Store and start weaving your stories today."
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
                            <a
                                href="https://apps.apple.com/gb/app/weeve/id6757678144"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="transition-transform hover:scale-105"
                            >
                                <img
                                    src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                                    alt="Download on the App Store"
                                    className="h-[52px]"
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
                                    className="h-[52px]"
                                />
                            </a>
                        </div>
                    </motion.div>
                </div>
            </section>



            {/* Footer */}
            <MarketingFooter />
        </div>
    );
}
