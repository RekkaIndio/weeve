"use client";

import { motion } from "framer-motion";
import { Camera, Users, Layers, LucideIcon } from "lucide-react";

export default function CollaborativeFlowSection() {
    return (
        <section className="py-24 sm:py-32 bg-zinc-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center mb-16 sm:mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl md:text-6xl font-bold mb-6">
                            How Weeve{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EC1D99] to-purple-500">
                                Works
                            </span>
                        </h2>
                        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto">
                            Three steps. One shared story. It's that simple.
                        </p>
                    </motion.div>
                </div>

                {/* 3-Step Horizontal Layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                    <StepCard
                        step={1}
                        title="Post a Moment"
                        description="Share a photo or video to start a story. This is the seed — the Root of something bigger."
                        icon={Camera}
                        color="from-pink-500 to-rose-500"
                        delay={0.1}
                        image="https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=500&h=600&fit=crop"
                    />
                    <StepCard
                        step={2}
                        title="Friends Jump In"
                        description="Open slots for others to add their angle — photos, videos, drawings. Everyone contributes."
                        icon={Users}
                        color="from-purple-500 to-indigo-500"
                        delay={0.3}
                        image="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=500&h=600&fit=crop"
                    />
                    <StepCard
                        step={3}
                        title="A Story Unfolds"
                        description="Multiple perspectives merge into one shared narrative. A memory built together, not consumed alone."
                        icon={Layers}
                        color="from-blue-500 to-cyan-500"
                        delay={0.5}
                        image="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&h=600&fit=crop"
                    />
                </div>
            </div>
        </section>
    );
}

interface StepCardProps {
    step: number;
    title: string;
    description: string;
    icon: LucideIcon;
    color: string;
    delay: number;
    image: string;
}

function StepCard({ step, title, description, icon: Icon, color, delay, image }: StepCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay, duration: 0.6 }}
            className="group relative"
        >
            {/* Image */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-6 border border-white/5">
                <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {/* Step number badge */}
                <div className={`absolute top-4 left-4 w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
                    <span className="text-white font-black text-lg">{step}</span>
                </div>
                {/* Icon badge */}
                <div className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                </div>
            </div>

            {/* Text */}
            <h3 className="text-xl sm:text-2xl font-bold mb-3 text-white">{title}</h3>
            <p className="text-gray-400 leading-relaxed">{description}</p>
        </motion.div>
    );
}
