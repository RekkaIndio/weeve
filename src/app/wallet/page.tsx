"use client";

import { useStore } from "@/lib/store";
import { ArrowLeft, Wallet, CreditCard, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function WalletPage() {
    const { currentUser, addTokens } = useStore();
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePurchase = (amount: number) => {
        setIsProcessing(true);
        // Simulate API call
        setTimeout(() => {
            addTokens(amount);
            setIsProcessing(false);
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Header */}
            <div className="p-4 flex items-center gap-4">
                <Link href="/profile">
                    <ArrowLeft className="w-6 h-6 text-white" />
                </Link>
                <h1 className="font-bold text-lg">My Wallet</h1>
            </div>

            {/* Balance Card */}
            <div className="px-4 mb-8">
                <div className="bg-gradient-to-r from-[#EC1D99] to-[#B721FF] p-6 rounded-2xl shadow-lg">
                    <div className="flex items-center gap-2 mb-2 opacity-90">
                        <Wallet className="w-5 h-5" />
                        <span className="text-sm font-medium">Current Balance</span>
                    </div>
                    <div className="text-4xl font-bold mb-4">{currentUser.tokens} <span className="text-xl font-normal opacity-80">Weeve Coins</span></div>
                    <div className="text-xs opacity-75">Use coins to collaborate with premium creators and unlock special features.</div>
                </div>
            </div>

            {/* Purchase Options */}
            <div className="px-4">
                <h2 className="font-bold text-lg mb-4">Top Up</h2>

                <div className="space-y-3">
                    <button
                        onClick={() => handlePurchase(100)}
                        disabled={isProcessing}
                        className="w-full bg-gray-900 hover:bg-gray-800 transition-colors p-4 rounded-xl flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                                <Zap className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <div className="font-bold">100 Coins</div>
                                <div className="text-xs text-gray-400">Starter Pack</div>
                            </div>
                        </div>
                        <div className="bg-white text-black px-4 py-1.5 rounded-full font-bold text-sm group-hover:scale-105 transition-transform">
                            $1.99
                        </div>
                    </button>

                    <button
                        onClick={() => handlePurchase(550)}
                        disabled={isProcessing}
                        className="w-full bg-gray-900 hover:bg-gray-800 transition-colors p-4 rounded-xl flex items-center justify-between group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 bg-[#EC1D99] text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">POPULAR</div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                                <Zap className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <div className="font-bold">550 Coins</div>
                                <div className="text-xs text-gray-400">Creator Pack (+50 Bonus)</div>
                            </div>
                        </div>
                        <div className="bg-white text-black px-4 py-1.5 rounded-full font-bold text-sm group-hover:scale-105 transition-transform">
                            $9.99
                        </div>
                    </button>

                    <button
                        onClick={() => handlePurchase(1200)}
                        disabled={isProcessing}
                        className="w-full bg-gray-900 hover:bg-gray-800 transition-colors p-4 rounded-xl flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500">
                                <Zap className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <div className="font-bold">1200 Coins</div>
                                <div className="text-xs text-gray-400">Pro Pack (+200 Bonus)</div>
                            </div>
                        </div>
                        <div className="bg-white text-black px-4 py-1.5 rounded-full font-bold text-sm group-hover:scale-105 transition-transform">
                            $19.99
                        </div>
                    </button>
                </div>
            </div>

            <div className="px-4 mt-8">
                <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
                    <CreditCard className="w-3 h-3" />
                    <span>Secure payment processed by App Store</span>
                </div>
            </div>
        </div>
    );
}
