"use client";

import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { Camera, PenTool, Type, Video, Plus, User, ArrowDown, LucideIcon } from "lucide-react";

export default function CollaborativeFlowSection() {
    return (
        <section className="py-32 bg-zinc-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center mb-24">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl md:text-6xl font-bold mb-6">
                            How Weeve <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EC1D99] to-purple-500">Works</span>
                        </h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            One story. Many perspectives. Watch how a simple moment evolves into a rich, shared narrative.
                        </p>
                    </motion.div>
                </div>

                <div className="relative">
                    {/* Central Timeline Line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-[#EC1D99] via-purple-600 to-transparent -translate-x-1/2 hidden md:block" />

                    <TimelineStep
                        step={1}
                        title="Start with a Spark"
                        description="Capture a moment. It could be a photo, a video, or just a thought. This is the seed of your story."
                        icon={Camera}
                        color="from-pink-500 to-rose-500"
                        align="left"
                    >
                        <MockCard
                            image="https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=500&h=600&fit=crop"
                            user="You"
                            avatar="https://i.pravatar.cc/150?img=68"
                            type="photo"
                        />
                    </TimelineStep>

                    <TimelineStep
                        step={2}
                        title="Friends or the public add Dimensions"
                        description="Invite your circle. They add their angles—drawings, reaction videos, or text overlay. No more lonely feeds."
                        icon={User}
                        color="from-purple-500 to-indigo-500"
                        align="right"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <MockCard
                                image="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=500&h=600&fit=crop"
                                user="Alex"
                                avatar="https://i.pravatar.cc/150?img=33"
                                type="drawing"
                                small
                            />
                            <MockCard
                                image="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&h=600&fit=crop"
                                user="Jordan"
                                avatar="https://i.pravatar.cc/150?img=12"
                                type="video"
                                small
                            />
                        </div>
                    </TimelineStep>

                    <TimelineStep
                        step={3}
                        title="Weeve It Together"
                        description="Every perspective merges into one seamless, multi-dimensional story. A shared memory, built together."
                        icon={Video}
                        color="from-blue-500 to-cyan-500"
                        align="left"
                    >
                        <div className="relative h-[300px] w-[240px] mx-auto">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#EC1D99] to-purple-600 rounded-2xl rotate-6 opacity-30 blur-xl" />
                            <MockCard
                                image="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&h=600&fit=crop"
                                user="The Group"
                                avatar="https://i.pravatar.cc/150?img=5"
                                type="video"
                                className="rotate-0"
                            />
                            <div className="absolute -right-12 top-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-[#EC1D99]/40 flex items-center gap-2 shadow-xl">
                                <span className="text-[#EC1D99] font-bold text-sm">3 Contributors</span>
                            </div>
                        </div>
                    </TimelineStep>
                </div>
            </div>
        </section>
    );
}

interface TimelineStepProps {
    title: string;
    description: string;
    step: number;
    icon: LucideIcon;
    color: string;
    align: 'left' | 'right';
    children: React.ReactNode;
}

function TimelineStep({ title, description, step, icon: Icon, color, align, children }: TimelineStepProps) {
    const isLeft = align === 'left';

    return (
        <div className={`flex flex-col md:flex-row items-center gap-8 md:gap-20 mb-32 relative ${isLeft ? '' : 'md:flex-row-reverse'}`}>
            {/* Timeline Dot */}
            <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-0 w-12 h-12 rounded-full bg-black border-4 border-zinc-800 items-center justify-center z-20 shadow-[0_0_20px_rgba(236,29,153,0.3)]">
                <span className="text-white font-bold">{step}</span>
            </div>

            {/* Content Side */}
            <motion.div
                initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className={`flex-1 text-center ${isLeft ? 'md:text-right' : 'md:text-left'}`}
            >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${color} mb-6 shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-white">{title}</h3>
                <p className="text-gray-400 text-lg leading-relaxed">{description}</p>
            </motion.div>

            {/* Visual Side */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8, x: isLeft ? 50 : -50 }}
                whileInView={{ opacity: 1, scale: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex-1 flex justify-center perspective-1000"
            >
                {children}
            </motion.div>
        </div>
    );
}

interface MockCardProps {
    image: string;
    user: string;
    avatar: string;
    type: 'video' | 'photo' | 'drawing';
    small?: boolean;
    className?: string;
}

function MockCard({ image, user, avatar, type, small = false, className = "" }: MockCardProps) {
    return (
        <motion.div
            whileHover={{ y: -10, rotateX: 5, rotateY: 5 }}
            className={`relative rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl ${small ? 'w-36 h-48' : 'w-60 h-80'} ${className}`}
        >
            <img src={image} alt="content" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />

            <div className="absolute top-3 right-3 p-1.5 bg-black/40 backdrop-blur-md rounded-lg">
                {type === 'video' && <Video className="w-3 h-3 text-white" />}
                {type === 'photo' && <Camera className="w-3 h-3 text-white" />}
                {type === 'drawing' && <PenTool className="w-3 h-3 text-white" />}
            </div>

            <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <img src={avatar} alt={user} className="w-6 h-6 rounded-full border border-white" />
                <span className="text-xs font-bold text-white">{user}</span>
            </div>
        </motion.div>
    );
}
