"use client";

import { useState } from "react";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import AuthBackground from "@/app/components/AuthBackground";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        setErrorMessage("");

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                throw new Error('Failed to send reset link');
            }

            setStatus("success");
        } catch (error) {
            console.error(error);
            setStatus("error");
            setErrorMessage("Failed to send reset link. Please try again.");
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            {/* Animated Background */}
            <AuthBackground />

            <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-8">
                <Link href="/login" className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                </Link>

                {status === "success" ? (
                    <div className="text-center py-8">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6"
                        >
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </motion.div>
                        <h2 className="text-2xl font-bold mb-3">Check your email</h2>
                        <p className="text-gray-400 mb-8">
                            We've sent a password reset link to <strong className="text-white">{email}</strong>
                        </p>
                        <Link
                            href="/login"
                            className="block w-full py-3 bg-white text-black font-bold rounded-xl text-center hover:bg-gray-100 transition-colors"
                        >
                            Return to Login
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-6">
                            <Mail className="w-6 h-6 text-white" />
                        </div>

                        <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
                        <p className="text-gray-400 mb-8">
                            Enter your email address and we'll send you a link to reset your password.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {status === "error" && (
                                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                                    {errorMessage}
                                </div>
                            )}

                            <div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                    className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#EC1D99] transition-colors"
                                    disabled={status === "loading"}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={status === "loading"}
                                className="w-full px-6 py-3 bg-gradient-to-r from-[#EC1D99] to-purple-600 hover:from-[#EC1D99]/90 hover:to-purple-600/90 text-white font-bold rounded-xl transition-all shadow-[0_0_30px_rgba(236,29,153,0.3)] disabled:opacity-50"
                            >
                                {status === "loading" ? "Sending..." : "Send Reset Link"}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
