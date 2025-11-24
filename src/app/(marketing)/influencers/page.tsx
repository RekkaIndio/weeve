"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Users, Zap, Star, BarChart3, BadgeCheck, TrendingUp, PoundSterling, Share2, Flame, Crown, Video, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import MarketingNavbar from "@/app/components/MarketingNavbar";
import MarketingFooter from "@/app/components/MarketingFooter";
import WaitlistModal from "@/app/components/WaitlistModal";
import { useState } from "react";

const RevenueDashboardMock = () => (
    <div className="w-full bg-zinc-900 rounded-xl border border-white/10 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="h-12 border-b border-white/10 flex items-center px-4 gap-4">
            <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="text-xs text-gray-400 font-mono">Creator Dashboard / Earnings</div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
            {/* Total Earnings */}
            <div className="bg-gradient-to-br from-[#EC1D99] to-purple-900 rounded-lg p-6 text-white">
                <div className="text-sm opacity-80 mb-1">Total Earnings (This Month)</div>
                <div className="text-4xl font-bold mb-2">£8,247</div>
                <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>+32% from last month</span>
                </div>
            </div>

            {/* Revenue Streams */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/50 rounded-lg p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded bg-blue-500/20 text-blue-500">
                            <PoundSterling className="w-4 h-4" />
                        </div>
                        <div className="text-xs text-gray-400">Brand Deals</div>
                    </div>
                    <div className="text-2xl font-bold">£5,200</div>
                </div>
                <div className="bg-black/50 rounded-lg p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded bg-purple-500/20 text-purple-500">
                            <Crown className="w-4 h-4" />
                        </div>
                        <div className="text-xs text-gray-400">Creator Fund</div>
                    </div>
                    <div className="text-2xl font-bold">£3,047</div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="space-y-2">
                {[
                    { label: "Nike Campaign Bonus", amount: "+£1,200", time: "2h ago" },
                    { label: "Monthly Creator Fund", amount: "+£850", time: "1d ago" }
                ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm bg-black/30 rounded p-3">
                        <div>
                            <div className="font-medium text-white">{item.label}</div>
                            <div className="text-xs text-gray-500">{item.time}</div>
                        </div>
                        <div className="text-green-400 font-bold">{item.amount}</div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const ViralChainViz = () => (
    <div className="relative w-full aspect-square max-w-md mx-auto">
        {/* Central Node */}
        <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-[#EC1D99] to-purple-600 flex items-center justify-center text-2xl z-10 border-4 border-black"
        >
            🎥
        </motion.div>

        {/* Rings */}
        {[1, 2, 3].map((ring, ringIdx) => (
            <div key={ring} className="absolute inset-0">
                {Array.from({ length: ring * 6 }).map((_, i) => {
                    const angle = (i / (ring * 6)) * Math.PI * 2;
                    const radius = 30 + ring * 40;
                    const x = 50 + Math.cos(angle) * radius;
                    const y = 50 + Math.sin(angle) * radius;

                    return (
                        <motion.div
                            key={i}
                            initial={{ scale: 0, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: ringIdx * 0.2 + (i * 0.01) }}
                            className="absolute w-8 h-8 rounded-full bg-zinc-800 border border-[#EC1D99]/30"
                            style={{
                                left: `${x}% `,
                                top: `${y}% `,
                                transform: 'translate(-50%, -50%)'
                            }}
                        >
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#EC1D99]/20 to-purple-600/20" />
                        </motion.div>
                    );
                })}
            </div>
        ))}

        {/* Connecting Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20" style={{ overflow: 'visible' }}>
            {[1, 2, 3].map((ring) =>
                Array.from({ length: ring * 2 }).map((_, i) => {
                    const angle = (i / (ring * 2)) * Math.PI * 2;
                    const radius = 30 + ring * 40;
                    const x = 50 + Math.cos(angle) * radius;
                    const y = 50 + Math.sin(angle) * radius;

                    return (
                        <line
                            key={`${ring} -${i} `}
                            x1="50%"
                            y1="50%"
                            x2={`${x}% `}
                            y2={`${y}% `}
                            stroke="#EC1D99"
                            strokeWidth="1"
                        />
                    );
                })
            )}
        </svg>
    </div>
);

export default function InfluencersPage() {
    const [waitlistOpen, setWaitlistOpen] = useState(false);

    return (
        <div className="min-h-screen bg-black text-white selection:bg-[#EC1D99] selection:text-white overflow-x-hidden">
            <MarketingNavbar onWaitlistClick={() => setWaitlistOpen(true)} />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#EC1D99]/20 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#EC1D99]/20 to-purple-600/20 border border-[#EC1D99]/30 mb-8"
                    >
                        <Flame className="w-4 h-4 text-[#EC1D99]" />
                        <span className="text-sm font-medium text-white">Weeve for Creators</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-8"
                    >
                        Own Your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EC1D99] to-purple-600">Narrative.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed"
                    >
                        Don't just post content—start movements. Weeve lets you collaborate with your audience to build stories that grow, evolve, and multiply your reach.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <button
                            onClick={() => setWaitlistOpen(true)}
                            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#EC1D99] to-purple-600 hover:from-[#EC1D99]/90 hover:to-purple-600/90 text-white font-bold rounded-full transition-all shadow-[0_0_30px_rgba(236,29,153,0.3)] flex items-center justify-center gap-2"
                        >
                            Join Waitlist <ArrowRight className="w-5 h-5" />
                        </button>
                        <Link
                            href="#monetise"
                            className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-full transition-colors flex items-center justify-center gap-2"
                        >
                            See How You'll Earn <PoundSterling className="w-5 h-5" />
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* Creator Tools Showcase */}
            <section className="py-12 border-y border-white/5 bg-white/5">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-sm text-gray-500 font-medium mb-8 uppercase tracking-widest">Built for Creators</p>
                    <div className="flex flex-wrap justify-center gap-12 lg:gap-20 items-center">
                        {[
                            { icon: Video, label: 'Media Library' },
                            { icon: BarChart3, label: 'Analytics' },
                            { icon: BadgeCheck, label: 'Verification' },
                            { icon: TrendingUp, label: 'Growth Tools' },
                            { icon: PoundSterling, label: 'Monetisation' }
                        ].map((tool, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#EC1D99] to-purple-600 p-0.5">
                                    <div className="w-full h-full bg-black rounded-[6px] flex items-center justify-center">
                                        <tool.icon className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                                <div className="text-lg font-bold text-white">{tool.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Monetisation Section */}
            <section id="monetise" className="py-32 bg-zinc-950">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="flex-1">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-bold mb-6">
                                <PoundSterling className="w-4 h-4" /> The Creator Programme
                            </div>
                            <h2 className="text-3xl lg:text-5xl font-bold mb-6">Monetise Your<br />Creativity</h2>
                            <p className="text-gray-400 text-lg mb-8">
                                Turn your passion into revenue. Weeve's Creator Programme offers multiple streams of income, from brand partnerships to our exclusive Creator Fund.
                            </p>
                            <ul className="space-y-4 mb-10">
                                {[
                                    { label: "Brand Partnerships", desc: "Connect with brands that align with your values" },
                                    { label: "Creator Fund", desc: "Earn based on engagement and quality" },
                                    { label: "Exclusive Content", desc: "Premium Weeves for your biggest fans" }
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center mt-1">
                                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-white mb-1">{item.label}</div>
                                            <div className="text-sm text-gray-400">{item.desc}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex-1 w-full">
                            <RevenueDashboardMock />
                        </div>
                    </div>
                </div>
            </section>

            {/* Viral Chains Section */}
            <section className="py-32 bg-black relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
                        <div className="flex-1 relative z-20">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-xs font-bold mb-6">
                                <Share2 className="w-4 h-4" /> Exponential Growth
                            </div>
                            <h2 className="text-3xl lg:text-5xl font-bold mb-6">Your Story,<br />Amplified Exponentially</h2>
                            <p className="text-gray-400 text-lg mb-8">
                                One Weeve can spark a chain reaction. When your audience adds to your story, their followers see it too. That's how you go from hundreds to thousands, and thousands to millions.
                            </p>
                            <div className="grid grid-cols-2 gap-6">
                                {[
                                    { metric: "2.4x", label: "Average Reach Multiplier" },
                                    { metric: "67%", label: "Higher Engagement vs Stories" },
                                    { metric: "10k+", label: "Avg Views per Viral Weeve" },
                                    { metric: "5.8", label: "Shares per Contribution" }
                                ].map((stat, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1 }}
                                        className="bg-zinc-900/80 border border-white/10 p-4 rounded-xl"
                                    >
                                        <div className="text-2xl font-bold text-[#EC1D99] mb-1">{stat.metric}</div>
                                        <div className="text-sm text-gray-400">{stat.label}</div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 w-full relative z-10">
                            <ViralChainViz />
                            <p className="text-center text-sm text-gray-500 mt-6 relative z-20">Your Weeve → 6 Contributors → 36 More → Infinite Reach</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Creator Tools Section */}
            <section className="py-32 bg-zinc-950 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold mb-6">
                            <Video className="w-4 h-4" /> Professional Tools
                        </div>
                        <h2 className="text-3xl lg:text-5xl font-bold mb-6">Studio-Quality Tools<br />in Your Pocket</h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                            Professional features designed for creators who care about quality. No compromises.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Star,
                                title: "Story Building",
                                desc: "Collaborate with friends to build multi-perspective narratives that capture every moment.",
                                color: "from-yellow-500 to-orange-500"
                            },
                            {
                                icon: BarChart3,
                                title: "Deep Analytics",
                                desc: "Track engagement, reach, and audience demographics in real-time.",
                                color: "from-blue-500 to-cyan-500"
                            },
                            {
                                icon: Users,
                                title: "Audience Insights",
                                desc: "Understand who's watching, when they're active, and what resonates.",
                                color: "from-purple-500 to-pink-500"
                            }
                        ].map((tool, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8 hover:border-[#EC1D99]/50 transition-colors group"
                            >
                                <div className={`w - 14 h - 14 rounded - xl bg - gradient - to - br ${tool.color} p - 0.5 mb - 6`}>
                                    <div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center">
                                        <tool.icon className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold mb-3">{tool.title}</h3>
                                <p className="text-gray-400 leading-relaxed">
                                    {tool.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Value Props */}
            <section className="py-32 bg-black">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-3 gap-12">
                        {[
                            {
                                icon: Sparkles,
                                title: "Viral Collaboration",
                                desc: "Your story is just the beginning. Watch as your community adds their own perspectives, turning a single moment into a viral movement."
                            },
                            {
                                icon: Users,
                                title: "Deeper Connection",
                                desc: "Move beyond passive likes. Collaborate directly with your fans to create shared memories and experiences."
                            },
                            {
                                icon: Zap,
                                title: "Creative Freedom",
                                desc: "No filters, no algorithms forcing a specific aesthetic. Just raw, authentic storytelling that resonates."
                            }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="text-center"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-[#EC1D99]/10 flex items-center justify-center mx-auto mb-6 text-[#EC1D99]">
                                    <feature.icon className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                                <p className="text-gray-400 leading-relaxed">
                                    {feature.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#EC1D99]/10 to-purple-900/20" />
                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <h2 className="text-4xl lg:text-6xl font-bold mb-8">Ready to lead?</h2>
                    <p className="text-xl text-gray-400 mb-12">
                        Join the creators who are defining the future of social storytelling.
                    </p>
                    <button
                        onClick={() => setWaitlistOpen(true)}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#EC1D99] to-purple-600 hover:from-[#EC1D99]/90 hover:to-purple-600/90 text-white font-bold rounded-full transition-all shadow-[0_0_30px_rgba(236,29,153,0.3)]"
                    >
                        Join Waitlist <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </section>

            {/* Waitlist Modal */}
            <WaitlistModal isOpen={waitlistOpen} onClose={() => setWaitlistOpen(false)} />

            <MarketingFooter />
        </div>
    );
}
