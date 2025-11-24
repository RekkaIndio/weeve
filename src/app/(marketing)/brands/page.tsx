"use client";

import Link from "next/link";
import { ArrowRight, Users, Zap, Shield, TrendingUp, Target, MessageCircle, BarChart3, PieChart, PoundSterling, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import MarketingNavbar from "@/app/components/MarketingNavbar";
import MarketingFooter from "@/app/components/MarketingFooter";
import WaitlistModal from "@/app/components/WaitlistModal";
import CommunityVisual from "@/app/components/CommunityVisual";
import { useState } from "react";

const DashboardMock = () => (
    <div className="w-full bg-zinc-900 rounded-xl border border-white/10 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="h-10 sm:h-12 border-b border-white/10 flex items-center px-3 sm:px-4 gap-2 sm:gap-4">
            <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500/20 border border-green-500/50" />
            </div>
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            <div className="text-[10px] sm:text-xs text-gray-400 font-mono truncate">Weeve Analytics / Campaign: Summer Drop</div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {/* Main Chart */}
            <div className="lg:col-span-2 bg-black/50 rounded-lg p-3 sm:p-4 border border-white/5">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <div>
                        <div className="text-xs sm:text-sm text-gray-400">Total Engagement Value</div>
                        <div className="text-xl sm:text-2xl font-bold text-white">£142,893</div>
                    </div>
                    <div className="flex gap-2">
                        <div className="px-2 py-1 rounded bg-[#EC1D99]/20 text-[#EC1D99] text-xs font-bold">+24%</div>
                    </div>
                </div>
                <div className="h-32 sm:h-40 lg:h-48 flex items-end gap-1 sm:gap-2">
                    {[40, 65, 45, 80, 55, 90, 75, 85, 60, 95, 80, 100].map((h, i) => (
                        <motion.div
                            key={i}
                            initial={{ height: 0 }}
                            whileInView={{ height: `${h}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05 }}
                            className="flex-1 bg-gradient-to-t from-[#EC1D99]/20 to-[#EC1D99] rounded-t-sm relative group"
                        >
                            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors" />
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Side Stats */}
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-3 sm:gap-4">
                <div className="bg-black/50 rounded-lg p-3 sm:p-4 border border-white/5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/20 text-purple-500">
                            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>
                        <div className="text-xs sm:text-sm text-gray-400">Active Creators</div>
                    </div>
                    <div className="text-lg sm:text-2xl font-bold">12.4k</div>
                    <div className="text-[10px] sm:text-xs text-green-400 mt-1">↑ 850 this week</div>
                </div>
                <div className="bg-black/50 rounded-lg p-3 sm:p-4 border border-white/5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/20 text-blue-500">
                            <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>
                        <div className="text-xs sm:text-sm text-gray-400">Sentiment Score</div>
                    </div>
                    <div className="text-lg sm:text-2xl font-bold">98.2</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 mt-1">Positive impact</div>
                </div>
                <div className="bg-black/50 rounded-lg p-3 sm:p-4 border border-white/5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/20 text-green-500">
                            <PoundSterling className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>
                        <div className="text-xs sm:text-sm text-gray-400">Conversion Rate</div>
                    </div>
                    <div className="text-lg sm:text-2xl font-bold">8.4%</div>
                    <div className="text-xs text-green-400 mt-1">vs 1.2% industry avg</div>
                </div>
            </div>
        </div>
    </div>
);

export default function BrandsPage() {
    const [waitlistOpen, setWaitlistOpen] = useState(false);

    return (
        <div className="min-h-screen bg-black text-white selection:bg-[#EC1D99] selection:text-white overflow-x-hidden">
            <MarketingNavbar onWaitlistClick={() => setWaitlistOpen(true)} />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
                    >
                        <span className="text-sm font-medium text-gray-300">Weeve for Brands</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-8"
                    >
                        Campaigns that <br />
                        <span className="text-[#EC1D99]">Weeve Together.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-base sm:text-lg lg:text-xl text-gray-400 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed"
                    >
                        Create a campaign, set the stage, and let your audience weave their authentic stories into yours. Unlock deeper insights and engagement that traditional ads can't touch.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <button
                            onClick={() => setWaitlistOpen(true)}
                            className="w-full sm:w-auto px-8 py-4 bg-white text-black hover:bg-gray-200 font-bold rounded-full transition-colors flex items-center justify-center gap-2"
                        >
                            Start a Campaign <ArrowRight className="w-5 h-5" />
                        </button>
                    </motion.div>
                </div>
            </section>

            {/* How it Works Section */}
            <section className="py-32 bg-zinc-950">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl lg:text-5xl font-bold mb-6">How Weeve Campaigns Work</h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                            Turn passive followers into active creators. A Weeve isn't just a post—it's a collaborative chain of stories.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-[#EC1D99]/0 via-[#EC1D99]/50 to-[#EC1D99]/0" />

                        {[
                            {
                                step: "01",
                                title: "Set the Stage",
                                desc: "Create a campaign and record the first segment. You define the theme, the length, and the vibe."
                            },
                            {
                                step: "02",
                                title: "Audience Weeves",
                                desc: "Users add their own video segments to your story. They don't just comment—they contribute to the narrative."
                            },
                            {
                                step: "03",
                                title: "Highlight & Boost",
                                desc: "Spotlight the best Weeves. Turn authentic user creativity into your most powerful brand assets."
                            }
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2 }}
                                className="relative text-center"
                            >
                                <div className="w-24 h-24 rounded-full bg-[#EC1D99]/10 border border-[#EC1D99]/20 flex items-center justify-center mx-auto mb-8 relative z-10 bg-zinc-950">
                                    <span className="text-3xl font-bold text-[#EC1D99]">{item.step}</span>
                                </div>
                                <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                                <p className="text-gray-400 leading-relaxed">
                                    {item.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Deep Insights Section */}
            <section className="py-16 sm:py-24 lg:py-32 bg-black relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
                        <div className="flex-1">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold mb-6">
                                <BarChart3 className="w-4 h-4" /> Data-Driven
                            </div>
                            <h2 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 sm:mb-8 leading-tight">Know your audience,<br />not just your impressions.</h2>
                            <p className="text-gray-400 text-lg mb-8">
                                Go beyond vanity metrics. Weeve's analytics dashboard gives you deep insights into sentiment, participation rates, and the viral "k-factor" of your campaigns.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    "Real-time sentiment analysis of user contributions",
                                    "Identify top brand advocates and creators",
                                    "Track the viral spread of your narrative chains"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-gray-300">
                                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex-1 w-full mt-8 lg:mt-0">
                            <DashboardMock />
                        </div>
                    </div>
                </div>
            </section>

            {/* Shoppable Narratives Section */}
            <section className="py-16 sm:py-24 lg:py-32 bg-zinc-950 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="bg-gradient-to-br from-[#EC1D99] to-purple-900 rounded-3xl sm:rounded-[3rem] p-6 sm:p-12 lg:p-24 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />

                        <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-6 backdrop-blur-md">
                                    <ShoppingBag className="w-4 h-4" /> New Feature
                                </div>
                                <h2 className="text-3xl lg:text-5xl font-bold mb-6 text-white">Shoppable Narratives</h2>
                                <p className="text-white/80 text-lg mb-8 leading-relaxed">
                                    Turn engagement into revenue. Seamlessly integrate products into your campaign challenges. When users weave with your product, their audience can shop it instantly.
                                </p>
                                <button
                                    onClick={() => setWaitlistOpen(true)}
                                    className="px-8 py-4 bg-white text-[#EC1D99] font-bold rounded-full hover:bg-gray-100 transition-colors flex items-center gap-2"
                                >
                                    Enable Commerce <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="relative">
                                {/* Product Card Mock */}
                                <div className="bg-white rounded-2xl p-4 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500 max-w-sm mx-auto">
                                    <div className="aspect-square bg-gray-100 rounded-xl mb-4 relative overflow-hidden">
                                        <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop" alt="Product" className="object-cover w-full h-full" />
                                        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold">
                                            $129.00
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-black text-lg">Neon Runner X</h4>
                                            <p className="text-gray-500 text-sm">Limited Edition</p>
                                        </div>
                                        <button className="p-2 bg-[#EC1D99] text-white rounded-full">
                                            <ShoppingBag className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                                        <TrendingUp className="w-4 h-4 text-green-500" />
                                        <span>482 sales from this Weeve</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Engagement Comparison Section */}
            <section className="py-32 bg-black relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="flex-1">
                            <h2 className="text-3xl lg:text-5xl font-bold mb-6">From Passive to Participatory</h2>
                            <p className="text-gray-400 text-lg mb-8">
                                Traditional ads interrupt the experience. Weeve campaigns <em>are</em> the experience. By inviting users to build the story with you, branding becomes inherently engaging.
                            </p>

                            <div className="space-y-8 mt-12">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm font-medium">
                                        <span className="text-gray-400">Traditional Social Media (Passive)</span>
                                        <span className="text-gray-400">~1-3%</span>
                                    </div>
                                    <div className="h-4 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full w-[15%] bg-gray-600 rounded-full" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm font-medium">
                                        <span className="text-[#EC1D99]">Weeve Campaigns (Participatory)</span>
                                        <span className="text-[#EC1D99]">~15-20%</span>
                                    </div>
                                    <div className="h-4 bg-white/5 rounded-full overflow-hidden relative">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            whileInView={{ width: "85%" }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                            className="h-full bg-[#EC1D99] rounded-full relative"
                                        >
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                                        </motion.div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-[#EC1D99]/20 blur-3xl rounded-full" />
                            <div className="grid grid-cols-2 gap-6 relative">
                                {[
                                    { icon: Target, label: "Deeper Insights", value: "See exactly how your audience interprets your brand." },
                                    { icon: Users, label: "Community", value: "Build a loyal fanbase that creates with you." },
                                    { icon: Zap, label: "Velocity", value: "Campaigns that spread through active participation." },
                                    { icon: Shield, label: "Brand Safety", value: "Curated environments for your brand stories." }
                                ].map((stat, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1 }}
                                        className="bg-zinc-900/80 border border-white/10 p-6 rounded-2xl backdrop-blur-sm"
                                    >
                                        <stat.icon className="w-8 h-8 text-[#EC1D99] mb-4" />
                                        <h4 className="text-lg font-bold mb-2">{stat.label}</h4>
                                        <p className="text-sm text-gray-400">{stat.value}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Brand Communities Section */}
            <section className="py-32 bg-zinc-950 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
                        <div className="flex-1">
                            <h2 className="text-3xl lg:text-5xl font-bold mb-6">Build Your Own Community</h2>
                            <p className="text-gray-400 text-lg mb-8">
                                Don't just rent an audience on other platforms. Create a dedicated space where your fans can connect, create, and engage with your brand on a deeper level.
                            </p>
                            <ul className="space-y-4 mb-10">
                                {[
                                    "Exclusive content drops and challenges",
                                    "Direct engagement with your most loyal fans",
                                    "A safe, curated environment for your brand"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-gray-300">
                                        <div className="w-6 h-6 rounded-full bg-[#EC1D99]/20 flex items-center justify-center">
                                            <div className="w-2 h-2 bg-[#EC1D99] rounded-full" />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => setWaitlistOpen(true)}
                                className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-full transition-colors"
                            >
                                Explore Communities <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 relative">
                            <CommunityVisual
                                name="The Creator Club"
                                handle="@creatorclub"
                                members="2,458 Members"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-purple-900/20" />
                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <h2 className="text-4xl lg:text-6xl font-bold mb-8">Ready to tell your story?</h2>
                    <p className="text-xl text-gray-400 mb-12">
                        Join the forward-thinking brands that are already building on Weeve.
                    </p>
                    <button
                        onClick={() => setWaitlistOpen(true)}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black hover:bg-gray-200 font-bold rounded-full transition-colors"
                    >
                        Get in Touch <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </section>


            {/* Waitlist Modal */}
            <WaitlistModal isOpen={waitlistOpen} onClose={() => setWaitlistOpen(false)} />

            <MarketingFooter />
        </div>
    );
}
