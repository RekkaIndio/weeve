'use client';

import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Coins } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';

// Stripe Payment Links
// TODO: Replace with production links when ready
const PAYMENT_LINKS = {
    TOKENS_100: 'https://buy.stripe.com/test_14AeVcdtk88qbN4bZ32Nq00', // Test link provided
    TOKENS_550: 'https://buy.stripe.com/14A3cu1KCdsKdVc4wB2Nq01', // Prod link (placeholder for now)
    TOKENS_1000: 'https://buy.stripe.com/28E8wO2OG4We2cugfj2Nq02', // Prod link (placeholder for now)
};

export default function WalletPage() {
    const router = useRouter();
    const { currentUser } = useStore();
    const [mounted, setMounted] = useState(false);
    const [balance, setBalance] = useState(currentUser?.tokens || 0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const userIdRef = useRef(currentUser?.id);

    // Update ref when user changes
    useEffect(() => {
        userIdRef.current = currentUser?.id;
        setBalance(currentUser?.tokens || 0);
    }, [currentUser]);

    // Fetch latest balance from database
    const fetchLatestBalance = useCallback(async () => {
        const userId = userIdRef.current;
        if (!userId) {
            console.log('[Wallet] No user ID, skipping fetch');
            return;
        }

        console.log('[Wallet] Fetching latest balance for user:', userId);
        setIsRefreshing(true);

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('tokens')
                .eq('user_id', userId)
                .single();

            console.log('[Wallet] Query result:', { data, error });

            if (error) {
                console.error('[Wallet] Supabase error:', error);
                return;
            }

            if (data) {
                console.log('[Wallet] Balance fetched successfully:', data.tokens);
                setBalance(data.tokens);
            } else {
                console.warn('[Wallet] No data returned from query');
            }
        } catch (error) {
            console.error('[Wallet] Fetch error:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    // Fetch on mount
    useEffect(() => {
        setMounted(true);
        fetchLatestBalance();
    }, [fetchLatestBalance]);

    // Refresh when page becomes visible (web)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('[Wallet] Page visible, refreshing...');
                fetchLatestBalance();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [fetchLatestBalance]);

    // Refresh on window focus (fallback for when returning from external browser)
    useEffect(() => {
        const handleFocus = () => {
            console.log('[Wallet] Window focused, refreshing...');
            fetchLatestBalance();
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [fetchLatestBalance]);

    // Refresh when user navigates back from payment (Capacitor app state)
    useEffect(() => {
        let appStateListener: any;

        const setupAppStateListener = async () => {
            try {
                const { App } = await import('@capacitor/app');
                appStateListener = await App.addListener('appStateChange', (state) => {
                    if (state.isActive) {
                        console.log('[Wallet] App resumed, refreshing...');
                        fetchLatestBalance();
                    }
                });
            } catch (error) {
                // Capacitor not available (web), ignore
                console.log('[Wallet] Capacitor App plugin not available');
            }
        };

        setupAppStateListener();

        return () => {
            if (appStateListener) {
                appStateListener.remove();
            }
        };
    }, [fetchLatestBalance]);

    const handleBack = () => {
        router.back();
    };

    const handlePurchase = (link: string) => {
        if (!currentUser) return;
        // Append client_reference_id to the URL to track which user made the purchase
        const url = new URL(link);
        url.searchParams.append('client_reference_id', currentUser.id);
        window.location.href = url.toString();
    };

    if (!mounted) return null;

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-gray-800 px-4 py-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] flex items-center gap-3">
                <button
                    onClick={handleBack}
                    className="p-2 rounded-full border border-[#EC1D99] text-[#EC1D99] bg-black hover:bg-gray-900 transition-colors"
                    aria-label="Go back"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-bold text-white font-sans">Wallet</h1>
            </header>

            <main className="flex-1 px-4 py-6">
                <div className="max-w-md mx-auto">
                    {/* Current Balance */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 mb-8 border border-gray-700 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Coins className="w-32 h-32 text-yellow-500" />
                        </div>
                        <p className="text-gray-400 text-sm font-medium mb-1 font-sans">Current Balance</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-white font-sans">{balance}</span>
                            <span className="text-yellow-500 font-medium">Tokens</span>
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-white mb-4 font-sans">Top Up Tokens</h2>

                    <div className="space-y-4">
                        {/* 100 Tokens */}
                        <button
                            onClick={() => handlePurchase(PAYMENT_LINKS.TOKENS_100)}
                            className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-[#EC1D99] rounded-xl p-4 flex items-center justify-between transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 group-hover:scale-110 transition-transform">
                                    <span className="text-xl">🪙</span>
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-white font-sans">100 Tokens</h3>
                                    <p className="text-sm text-gray-400">Starter Pack</p>
                                </div>
                            </div>
                            <div className="bg-white text-black px-4 py-2 rounded-full font-bold text-sm">
                                Buy
                            </div>
                        </button>

                        {/* 550 Tokens */}
                        <button
                            onClick={() => handlePurchase(PAYMENT_LINKS.TOKENS_550)}
                            className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-[#EC1D99] rounded-xl p-4 flex items-center justify-between transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 bg-[#EC1D99] text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                POPULAR
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 group-hover:scale-110 transition-transform">
                                    <span className="text-xl">💰</span>
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-white font-sans">550 Tokens</h3>
                                    <p className="text-sm text-gray-400">Standard Pack</p>
                                </div>
                            </div>
                            <div className="bg-white text-black px-4 py-2 rounded-full font-bold text-sm">
                                Buy
                            </div>
                        </button>

                        {/* 1000 Tokens */}
                        <button
                            onClick={() => handlePurchase(PAYMENT_LINKS.TOKENS_1000)}
                            className="w-full bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 border border-gray-800 hover:border-[#EC1D99] rounded-xl p-4 flex items-center justify-between transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 group-hover:scale-110 transition-transform">
                                    <span className="text-xl">💎</span>
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-white font-sans">1000 Tokens</h3>
                                    <p className="text-sm text-gray-400">Pro Pack</p>
                                </div>
                            </div>
                            <div className="bg-[#EC1D99] text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg shadow-[#EC1D99]/20">
                                Buy
                            </div>
                        </button>
                    </div>

                    <p className="text-center text-xs text-gray-600 mt-8">
                        Secured by Stripe. Tokens are added to your account immediately after payment.
                    </p>
                </div>
            </main>
        </div>
    );
}
