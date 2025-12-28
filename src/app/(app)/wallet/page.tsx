'use client';

import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Coins, TrendingUp, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useCallback, useRef } from 'react';

// Token package configuration (matches server-side)
const TOKEN_PACKAGES = [
    { key: 'TOKENS_100', tokens: 100, price: '£1.00', name: 'Starter Pack', emoji: '🪙' },
    { key: 'TOKENS_550', tokens: 550, price: '£5.00', name: 'Standard Pack', emoji: '💰', popular: true },
    { key: 'TOKENS_1000', tokens: 1000, price: '£10.00', name: 'Pro Pack', emoji: '💎' },
];

export default function WalletPage() {
    const router = useRouter();
    const { currentUser } = useStore();
    const [mounted, setMounted] = useState(false);
    const [balance, setBalance] = useState(currentUser?.tokens || 0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [purchasingPackage, setPurchasingPackage] = useState<string | null>(null);
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

    const handlePurchase = async (packageKey: string) => {
        if (!currentUser) return;

        setPurchasingPackage(packageKey);

        try {
            // Create a Revolut checkout session
            const response = await fetch('/api/create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    packageKey,
                    userId: currentUser.id,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create payment session');
            }

            const { checkoutUrl } = await response.json();

            // Redirect to Revolut checkout
            window.location.href = checkoutUrl;
        } catch (error) {
            console.error('[Wallet] Payment error:', error);
            setPurchasingPackage(null);
            // TODO: Show error toast
        }
    };

    if (!mounted) return null;

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-gray-800 px-4 py-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleBack}
                        className="p-2 rounded-full border border-[#EC1D99] text-[#EC1D99] bg-black hover:bg-gray-900 transition-colors"
                        aria-label="Go back"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-white font-sans">Wallet</h1>
                </div>
                <button
                    onClick={() => router.push('/earnings')}
                    className="px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold hover:bg-green-500/20 transition-colors"
                >
                    💰 Earnings
                </button>
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

                    {/* Quick Info */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                        <p className="text-sm text-gray-300">
                            <span className="font-semibold text-blue-400">💡 Did you know?</span> You can earn tokens by creating monetized stories!
                            <Link href="/earnings" className="text-[#EC1D99] hover:underline ml-1">
                                View your earnings →
                            </Link>
                        </p>
                    </div>

                    <h2 className="text-xl font-bold text-white mb-4 font-sans">Top Up Tokens</h2>

                    <div className="space-y-4">
                        {TOKEN_PACKAGES.map((pkg) => (
                            <button
                                key={pkg.key}
                                onClick={() => handlePurchase(pkg.key)}
                                disabled={purchasingPackage !== null}
                                className={`w-full bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-[#EC1D99] rounded-xl p-4 flex items-center justify-between transition-all group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed ${pkg.key === 'TOKENS_1000' ? 'bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700' : ''}`}
                            >
                                {pkg.popular && (
                                    <div className="absolute top-0 right-0 bg-[#EC1D99] text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                        POPULAR
                                    </div>
                                )}
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 group-hover:scale-110 transition-transform">
                                        <span className="text-xl">{pkg.emoji}</span>
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-white font-sans">{pkg.tokens} Tokens</h3>
                                        <p className="text-sm text-gray-400">{pkg.name} • {pkg.price}</p>
                                    </div>
                                </div>
                                <div className={`px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 ${pkg.key === 'TOKENS_1000' ? 'bg-[#EC1D99] text-white shadow-lg shadow-[#EC1D99]/20' : 'bg-white text-black'}`}>
                                    {purchasingPackage === pkg.key ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Loading...</span>
                                        </>
                                    ) : (
                                        'Buy'
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>

                    <p className="text-center text-xs text-gray-600 mt-8">
                        Secured by Revolut. Tokens are added to your account immediately after payment.
                    </p>
                </div>
            </main>
        </div>
    );
}
