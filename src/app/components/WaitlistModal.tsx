"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, CheckCircle2 } from "lucide-react";

interface WaitlistModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function WaitlistModal({ isOpen, onClose }: WaitlistModalProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/waitlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, name: name.trim() || undefined }),
            });

            if (!response.ok) {
                throw new Error('Failed to join waitlist');
            }

            setSubmitted(true);
            setLoading(false);

            // Reset after 3 seconds
            setTimeout(() => {
                setName("");
                setEmail("");
                setSubmitted(false);
                onClose();
            }, 3000);
        } catch (error) {
            console.error('Error joining waitlist:', error);
            alert('Failed to join waitlist. Please try again.');
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-[100] overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full relative"
                            >
                                {/* Close Button */}
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                {!submitted ? (
                                    <>
                                        {/* Icon */}
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#EC1D99] to-purple-600 p-0.5 mx-auto mb-6">
                                            <div className="w-full h-full bg-zinc-900 rounded-[14px] flex items-center justify-center">
                                                <Mail className="w-8 h-8 text-white" />
                                            </div>
                                        </div>

                                        {/* Title */}
                                        <h2 className="text-2xl font-bold text-center mb-3">Join the Waitlist</h2>
                                        <p className="text-gray-400 text-center mb-8">
                                            Be the first to know when Weeve launches. Get early access and exclusive updates.
                                        </p>

                                        {/* Form */}
                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            <div>
                                                <input
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    placeholder="What should we call you? (optional)"
                                                    className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#EC1D99] transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="Enter your email"
                                                    required
                                                    className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#EC1D99] transition-colors"
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full px-6 py-3 bg-gradient-to-r from-[#EC1D99] to-purple-600 hover:from-[#EC1D99]/90 hover:to-purple-600/90 text-white font-bold rounded-xl transition-all shadow-[0_0_30px_rgba(236,29,153,0.3)] disabled:opacity-50"
                                            >
                                                {loading ? "Joining..." : "Join Waitlist"}
                                            </button>
                                        </form>

                                        <p className="text-xs text-gray-500 text-center mt-4">
                                            We'll never spam you. Unsubscribe anytime.
                                        </p>
                                    </>
                                ) : (
                                    <div className="text-center py-8">
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                            className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6"
                                        >
                                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                                        </motion.div>
                                        <h3 className="text-2xl font-bold mb-3">You're on the list! 🎉</h3>
                                        <p className="text-gray-400">
                                            We'll notify you as soon as Weeve launches.
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
