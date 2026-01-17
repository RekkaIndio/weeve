"use client";

import Link from "next/link";
import NextImage from "next/image";
import { useAuth } from "@/app/components/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";

interface MarketingNavbarProps {
    onWaitlistClick?: () => void; // Kept for backward compatibility, but no longer used
}

export default function MarketingNavbar({ onWaitlistClick }: MarketingNavbarProps) {
    const { user, loading } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                >
                    <Link href="/" className="flex items-center gap-2">
                        <NextImage src="/weeve-logo.png" alt="Weeve Logo" width={40} height={40} className="w-10 h-10 rounded-lg" />
                        <span className="text-xl font-bold tracking-tight text-white">Weeve</span>
                    </Link>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2"
                >
                    {/* Hidden for now - will be re-enabled later */}
                    {/* <Link href="/brands" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                        For Brands
                    </Link>
                    <Link href="/influencers" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                        For Influencers
                    </Link>
                    <Link href="/communities" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                        For Communities
                    </Link> */}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-6"
                >
                    <Link
                        href="/login"
                        className="hidden md:block text-sm font-bold text-white hover:text-gray-300 transition-colors"
                    >
                        Log In
                    </Link>

                    <Link
                        href="/signup"
                        className="hidden md:block px-5 py-2.5 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 transition-colors"
                    >
                        Sign Up
                    </Link>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 text-white hover:text-gray-300 transition-colors"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </motion.div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="md:hidden border-t border-white/10 bg-black/95 backdrop-blur-xl overflow-hidden"
                    >
                        <div className="px-6 py-4 space-y-4">
                            {/* Hidden for now - will be re-enabled later */}
                            {/* <Link
                                href="/brands"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block text-base font-medium text-gray-400 hover:text-white transition-colors py-2"
                            >
                                For Brands
                            </Link>
                            <Link
                                href="/influencers"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block text-base font-medium text-gray-400 hover:text-white transition-colors py-2"
                            >
                                For Influencers
                            </Link>
                            <Link
                                href="/communities"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block text-base font-medium text-gray-400 hover:text-white transition-colors py-2"
                            >
                                For Communities
                            </Link> */}

                            <Link
                                href="/login"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block text-base font-bold text-white hover:text-gray-300 transition-colors py-2"
                            >
                                Log In
                            </Link>

                            <Link
                                href="/signup"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block w-full px-5 py-3 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 transition-colors text-center"
                            >
                                Sign Up
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
