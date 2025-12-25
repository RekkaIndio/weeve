'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Sparkles, Lock, Zap } from 'lucide-react';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function SubscriptionPage() {
    const router = useRouter();
    const { currentUser, setCurrentUser } = useStore();
    const [loading, setLoading] = useState(false);

    const isPremium = currentUser?.brandSubscriptionStatus === 'active';

    const handleSubscribe = async () => {
        if (!currentUser) return;

        setLoading(true);
        try {
            // For MVP: Directly activate premium (placeholder for Stripe integration)
            const { error } = await supabase
                .from('profiles')
                .update({ brand_subscription_status: 'active' })
                .eq('user_id', currentUser.id);

            if (error) throw error;

            // Update local state
            setCurrentUser({
                ...currentUser,
                brandSubscriptionStatus: 'active',
            });

            toast.success('Premium activated! You can now use Canon & Seed posts.');
            router.push('/create-story');
        } catch (error) {
            console.error('[Subscription] Error:', error);
            toast.error('Failed to activate premium. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const features = [
        {
            icon: '🌱',
            title: 'Seed Posts',
            description: 'Your first contribution is locked. Others build on your foundation.',
        },
        {
            icon: '🎬',
            title: 'Canon Posts',
            description: 'Lock any slot to create curated, brand-approved collaborative stories.',
        },
        {
            icon: '📊',
            title: 'Analytics',
            description: 'Track engagement, views, and participation on your brand content.',
        },
        {
            icon: '✨',
            title: 'Priority Support',
            description: 'Get dedicated support for your brand account.',
        },
    ];

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10">
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-lg font-bold">Brand Premium</h1>
                    <div className="w-10" />
                </div>
            </div>

            <div className="px-4 py-6 max-w-lg mx-auto">
                {/* Hero Section */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 mb-4">
                        <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Unlock Premium Features</h2>
                    <p className="text-gray-400">
                        Take your brand presence to the next level with exclusive content tools.
                    </p>
                </div>

                {/* Current Status */}
                {isPremium ? (
                    <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-green-500">
                                <Check className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="font-bold text-green-400">Premium Active</p>
                                <p className="text-sm text-gray-400">You have access to all premium features</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-yellow-500">
                                <Lock className="w-5 h-5 text-black" />
                            </div>
                            <div>
                                <p className="font-bold text-yellow-400">Premium Required</p>
                                <p className="text-sm text-gray-400">Upgrade to unlock Canon & Seed posts</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Features List */}
                <div className="space-y-3 mb-8">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="flex items-start gap-3 p-3 rounded-xl bg-gray-900/50 border border-gray-800"
                        >
                            <div className="text-2xl">{feature.icon}</div>
                            <div>
                                <h3 className="font-bold text-sm">{feature.title}</h3>
                                <p className="text-xs text-gray-400">{feature.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* CTA Button */}
                {!isPremium && (
                    <button
                        onClick={handleSubscribe}
                        disabled={loading}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            'Activating...'
                        ) : (
                            <>
                                <Zap className="w-5 h-5" />
                                Activate Premium
                            </>
                        )}
                    </button>
                )}

                {isPremium && (
                    <button
                        onClick={() => router.push('/create-story')}
                        className="w-full py-4 rounded-xl bg-[#EC1D99] text-white font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                        Create a Brand Post
                    </button>
                )}

                {/* Note */}
                <p className="text-center text-xs text-gray-500 mt-4">
                    Premium is currently free during beta. Pricing coming soon.
                </p>
            </div>
        </div>
    );
}
