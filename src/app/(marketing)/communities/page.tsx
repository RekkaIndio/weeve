"use client";

import { useState, useEffect, ReactNode } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { ArrowRight, Users, Shield, Globe, Zap, Heart, Lock, MessageCircle, Calendar, Sparkles, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MarketingNavbar from "@/app/components/MarketingNavbar";
import MarketingFooter from "@/app/components/MarketingFooter";
import WaitlistModal from "@/app/components/WaitlistModal";
import CommunityVisual from "@/app/components/CommunityVisual";

// --- Components ---

const WeeveCard = ({ src, user, delay, x, y, rotate }: { src: string, user: string, delay: number, x: number, y: number, rotate: number }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
        animate={{
            opacity: 1,
            scale: 1,
            x,
            y,
            rotate,
            transition: {
                type: "spring",
                damping: 20,
                stiffness: 100,
                delay
            }
        }}
        whileHover={{ scale: 1.1, zIndex: 20, transition: { duration: 0.2 } }}
        className="absolute w-32 h-40 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl bg-zinc-900"
    >
        <img src={src} alt="Weeve" className="w-full h-full object-cover" />
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2 py-1 rounded-full">
            <img src={user} alt="User" className="w-4 h-4 rounded-full border border-white" />
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        </div>
    </motion.div>
);

export default function CommunitiesPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [waitlistOpen, setWaitlistOpen] = useState(false);

    if (loading) return null;

    return (
        <div className="min-h-screen bg-black text-white selection:bg-[#EC1D99] selection:text-white overflow-x-hidden">
            {/* Navigation */}
            {/* Navigation */}
            <MarketingNavbar onWaitlistClick={() => setWaitlistOpen(true)} />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.2, 0.3, 0.2]
                    }}
                    transition={{ duration: 8, repeat: Infinity }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"
                />
                <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-[#EC1D99]/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                        <div className="flex-1 text-center lg:text-left">
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-8"
                            >
                                Communities for <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EC1D99] to-purple-600">Every Narrative.</span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-xl text-gray-400 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed"
                            >
                                Whether you're a global brand or a local squad, Weeve gives you the space to build deeper connections. Public or private, it's your story to lead.
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
                                    Create a Community <ArrowRight className="w-5 h-5" />
                                </button>
                                <Link
                                    href="#features"
                                    className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-full transition-colors flex items-center justify-center gap-2"
                                >
                                    Explore Features
                                </Link>
                            </motion.div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6, duration: 0.8 }}
                            className="flex-1 relative"
                        >
                            <CommunityVisual />
                        </motion.div>
                    </div>
                </div>
            </section >

            {/* Community Types Showcase */}
            < section className="py-12 border-y border-white/5 bg-white/5" >
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-sm text-gray-500 font-medium mb-8 uppercase tracking-widest">Build any type of community</p>
                    <div className="flex flex-wrap justify-center gap-12 lg:gap-20 items-center">
                        {[
                            { icon: Users, label: 'Friend Squads' },
                            { icon: Sparkles, label: 'Fan Communities' },
                            { icon: Camera, label: 'Photography Crews' },
                            { icon: Globe, label: 'Travel Groups' },
                            { icon: Zap, label: 'Gaming Clans' }
                        ].map((type, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#EC1D99] to-purple-600 p-0.5">
                                    <div className="w-full h-full bg-black rounded-[6px] flex items-center justify-center">
                                        <type.icon className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                                <div className="text-lg font-bold text-white">{type.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section >

            {/* Community Growth Metrics */}
            < section className="py-32 bg-zinc-950 relative overflow-hidden" >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 to-transparent" />
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-5xl font-bold mb-6">Communities That Scale</h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                            From 10 to 10,000 members, Weeve communities grow exponentially through authentic engagement.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-8">
                        {[
                            { metric: "Unlimited", label: "Community Capacity", color: "from-blue-500 to-cyan-500" },
                            { metric: "Global", label: "Reach Potential", color: "from-purple-500 to-pink-500" },
                            { metric: "Viral", label: "Growth Engine", color: "from-orange-500 to-red-500" },
                            { metric: "Deep", label: "Member Retention", color: "from-green-500 to-emerald-500" }
                        ].map((stat, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="text-center p-8 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-white/20 transition-colors"
                            >
                                <div className={`text-4xl lg:text-5xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r ${stat.color}`}>
                                    {stat.metric}
                                </div>
                                <div className="text-gray-400 font-medium">{stat.label}</div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section >

            {/* Narrative & Structure Section */}
            < section className="py-32 bg-black" >
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl lg:text-5xl font-bold mb-6">Collaborative Narratives</h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                            Communities on Weeve aren't just chat rooms. They are living stories where every member plays a part.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-12">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="flex gap-6"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 p-0.5 shrink-0">
                                    <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center">
                                        <Zap className="w-7 h-7 text-purple-500" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold mb-3">Creators Set the Stage</h3>
                                    <p className="text-gray-400 leading-relaxed">
                                        As a community creator, you define the narrative. Set the themes, launch challenges, and guide the direction of the story. You provide the spark.
                                    </p>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                                className="flex gap-6"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#EC1D99] to-pink-600 p-0.5 shrink-0">
                                    <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center">
                                        <Users className="w-7 h-7 text-[#EC1D99]" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold mb-3">Weevers Build the Story</h3>
                                    <p className="text-gray-400 leading-relaxed">
                                        Members don't just consume; they contribute. By weaving their own unique segments into the narrative, they become active participants in the community's legacy.
                                    </p>
                                </div>
                            </motion.div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-[#EC1D99]/20 blur-3xl rounded-full" />
                            <div className="relative bg-zinc-900 border border-white/10 rounded-3xl p-8">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                                        <Globe className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <div className="text-white font-bold">Festival Season 2024</div>
                                        <div className="text-sm text-gray-400">Public Community</div>
                                    </div>
                                    <div className="ml-auto px-3 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-bold">
                                        Active
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                        <div className="text-sm text-[#EC1D99] font-bold mb-1">Weekly Prompt</div>
                                        <div className="text-white font-medium">"Best set of the weekend?"</div>
                                    </div>
                                    <div className="flex -space-x-3 overflow-hidden py-2">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className="w-10 h-10 rounded-full border-2 border-zinc-900 bg-zinc-800" />
                                        ))}
                                        <div className="w-10 h-10 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center text-xs text-gray-400">
                                            +1.2k
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        1.2k members weaved into this story today.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section >

            {/* Public vs Private Section */}
            < section className="py-32 bg-zinc-950 relative" >
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-5xl font-bold mb-6">Public or Private, Your Choice</h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                            Every community has different needs. Choose the privacy level that works for you.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <motion.div
                            whileHover={{ y: -5 }}
                            className="p-10 rounded-3xl bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/20 relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Globe className="w-32 h-32" />
                            </div>
                            <div className="relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 p-0.5 mb-6">
                                    <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center">
                                        <Globe className="w-6 h-6 text-blue-500" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold mb-4">Public Communities</h3>
                                <p className="text-gray-400 leading-relaxed mb-6">
                                    Perfect for brands, causes, and open interest groups. Let anyone discover your community and join the conversation.
                                </p>
                                <ul className="space-y-3 text-gray-300">
                                    <li className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        </div>
                                        Discoverable by everyone
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        </div>
                                        Viral growth potential
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        </div>
                                        Open participation
                                    </li>
                                </ul>
                            </div>
                        </motion.div>

                        <motion.div
                            whileHover={{ y: -5 }}
                            className="p-10 rounded-3xl bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/20 relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Lock className="w-32 h-32" />
                            </div>
                            <div className="relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 mb-6">
                                    <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center">
                                        <Lock className="w-6 h-6 text-purple-500" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold mb-4">Private Communities</h3>
                                <p className="text-gray-400 leading-relaxed mb-6">
                                    Ideal for close friends, exclusive clubs, and premium memberships. Curate your members and keep the content exclusive.
                                </p>
                                <ul className="space-y-3 text-gray-300">
                                    <li className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                                        </div>
                                        Invite-only access
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                                        </div>
                                        Safe, intimate space
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                                        </div>
                                        Controlled content
                                    </li>
                                </ul>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section >

            {/* Features Grid */}
            < section id="features" className="py-32 bg-black relative" >
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-5xl font-bold mb-6">Everything You Need</h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                            Powerful tools to build, manage, and grow your community.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Lock,
                                title: "Private Spaces",
                                desc: "Your community, your rules. Create invite-only groups for safe, intimate sharing.",
                                color: "from-purple-500 to-pink-500"
                            },
                            {
                                icon: Calendar,
                                title: "Shared Timeline",
                                desc: "A collective history of your community's best moments, automatically organized.",
                                color: "from-blue-500 to-cyan-500"
                            },
                            {
                                icon: MessageCircle,
                                title: "Real Discussions",
                                desc: "Move beyond shallow comments. Threaded conversations that actually matter.",
                                color: "from-orange-500 to-red-500"
                            }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                whileHover={{ y: -10 }}
                                className="p-8 rounded-3xl bg-zinc-900/50 border border-white/10 hover:border-white/20 transition-colors group"
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

            {/* CTA Section */}
            <section className="py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/10 to-[#EC1D99]/10" />
                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl lg:text-6xl font-bold mb-8">Gather your people.</h2>
                        <p className="text-xl text-gray-400 mb-12">
                            From sneaker drops to gaming squads, Weeve is the best place to build your community.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => setWaitlistOpen(true)}
                                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#EC1D99] to-purple-600 hover:from-[#EC1D99]/90 hover:to-purple-600/90 text-white font-bold rounded-full transition-all shadow-[0_0_30px_rgba(236,29,153,0.3)] flex items-center justify-center gap-2"
                            >
                                Start a Community <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section >

            {/* Waitlist Modal */}
            < WaitlistModal isOpen={waitlistOpen} onClose={() => setWaitlistOpen(false)
            } />

            {/* Footer */}
            <MarketingFooter />
        </div >
    );
}
