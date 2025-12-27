'use client';

import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, TrendingUp, DollarSign, Clock, CheckCircle, XCircle, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface EarningsData {
    earnedTokens: number;
    totalEarned: number;
}

interface PayoutRequest {
    id: string;
    amount_tokens: number;
    amount_usd: number;
    status: string;
    payment_method: string;
    payment_email: string;
    created_at: string;
}

const TOKEN_VALUE = 0.10;
const PAYOUT_RATIO = 0.70; // 70% to user
const MIN_PAYOUT_TOKENS = 500;
const MIN_PAYOUT_USD = MIN_PAYOUT_TOKENS * TOKEN_VALUE * PAYOUT_RATIO;

export default function EarningsPage() {
    const router = useRouter();
    const { currentUser } = useStore();
    const [earnings, setEarnings] = useState<EarningsData | null>(null);
    const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState('');
    const [paymentEmail, setPaymentEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchEarningsData();
        fetchPayoutRequests();
    }, [currentUser]);

    const fetchEarningsData = async () => {
        if (!currentUser) return;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('earned_tokens, total_earned')
                .eq('user_id', currentUser.id)
                .single();

            if (error) {
                // If columns don't exist yet, use default values
                console.warn('Earnings columns not found. Run migration_earnings_and_payouts.sql');
                setEarnings({
                    earnedTokens: 0,
                    totalEarned: 0,
                });
            } else {
                setEarnings({
                    earnedTokens: (data as any).earned_tokens || 0,
                    totalEarned: (data as any).total_earned || 0,
                });
            }
        } catch (error) {
            console.error('Error fetching earnings:', error);
            setEarnings({
                earnedTokens: 0,
                totalEarned: 0,
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchPayoutRequests = async () => {
        if (!currentUser) return;

        try {
            const { data, error } = await supabase
                .from('payout_requests' as any)
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (error) {
                // Table doesn't exist yet
                console.warn('Payout requests table not found. Run migration_earnings_and_payouts.sql');
                setPayoutRequests([]);
                return;
            }

            setPayoutRequests((data as any) || []);
        } catch (error) {
            console.error('Error fetching payout requests:', error);
            setPayoutRequests([]);
        }
    };

    const handleRequestPayout = async () => {
        if (!currentUser || !earnings) return;

        const tokens = parseInt(payoutAmount);

        if (isNaN(tokens) || tokens <= 0) {
            toast.error('Please enter a valid token amount');
            return;
        }

        if (tokens < MIN_PAYOUT_TOKENS) {
            toast.error(`Minimum payout is ${MIN_PAYOUT_TOKENS} tokens ($${MIN_PAYOUT_USD.toFixed(2)})`);
            return;
        }

        if (tokens > earnings.earnedTokens) {
            toast.error('Insufficient earned tokens');
            return;
        }

        if (!paymentEmail) {
            toast.error('Please enter your PayPal email');
            return;
        }

        setSubmitting(true);

        try {
            // @ts-ignore - RPC function may not exist until migration is run
            const { data, error } = await supabase.rpc('request_payout', {
                p_user_id: currentUser.id,
                p_amount_tokens: tokens,
                p_payment_method: 'paypal',
                p_payment_email: paymentEmail,
            });

            if (error) {
                if (error.message?.includes('does not exist')) {
                    toast.error('Earnings system not set up yet. Please run the database migration.');
                } else {
                    throw error;
                }
                return;
            }

            toast.success('Payout request submitted! We\'ll process it within 3-5 business days.');
            setShowPayoutModal(false);
            setPayoutAmount('');
            setPaymentEmail('');

            // Refresh data
            fetchEarningsData();
            fetchPayoutRequests();
        } catch (error: any) {
            console.error('Error requesting payout:', error);
            toast.error(error.message || 'Failed to request payout');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-5 h-5 text-green-400" />;
            case 'pending':
            case 'processing':
                return <Clock className="w-5 h-5 text-yellow-400" />;
            case 'failed':
            case 'cancelled':
                return <XCircle className="w-5 h-5 text-red-400" />;
            default:
                return <Clock className="w-5 h-5 text-gray-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'text-green-400 bg-green-500/10';
            case 'pending':
            case 'processing':
                return 'text-yellow-400 bg-yellow-500/10';
            case 'failed':
            case 'cancelled':
                return 'text-red-400 bg-red-500/10';
            case 'paid':
                return 'text-green-400 bg-green-500/10';
            default:
                return 'text-gray-400 bg-gray-500/10';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    const availableUSD = (earnings?.earnedTokens || 0) * TOKEN_VALUE * PAYOUT_RATIO;
    const totalEarnedUSD = (earnings?.totalEarned || 0) * TOKEN_VALUE * PAYOUT_RATIO;
    const canRequestPayout = (earnings?.earnedTokens || 0) >= MIN_PAYOUT_TOKENS;

    return (
        <div className="flex flex-col min-h-screen bg-black text-white pb-24">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-gray-800 px-4 py-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full border border-[#EC1D99] text-[#EC1D99] bg-black hover:bg-gray-900 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-bold">My Earnings</h1>
            </header>

            <main className="flex-1 px-4 py-6">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Earnings Summary */}
                    <div className="bg-gradient-to-br from-[#EC1D99]/20 to-purple-600/20 rounded-2xl p-6 border border-[#EC1D99]/20">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="w-5 h-5 text-[#EC1D99]" />
                            <h2 className="text-lg font-bold">Available for Payout</h2>
                        </div>
                        <div className="mb-2">
                            <div className="text-4xl font-bold text-white mb-1">
                                {earnings?.earnedTokens || 0} tokens
                            </div>
                            <div className="text-2xl font-semibold text-green-400">
                                ${availableUSD.toFixed(2)} USD
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                                After 30% platform fee
                            </div>
                        </div>
                        <button
                            onClick={() => setShowPayoutModal(true)}
                            disabled={!canRequestPayout}
                            className={`w-full mt-4 py-3 rounded-xl font-bold transition-colors ${canRequestPayout
                                    ? 'bg-[#EC1D99] hover:bg-[#d61a88] text-white'
                                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {canRequestPayout ? 'Request Payout' : `Minimum ${MIN_PAYOUT_TOKENS} tokens required`}
                        </button>
                        {!canRequestPayout && (
                            <div className="mt-2 text-xs text-gray-400 text-center">
                                You need {MIN_PAYOUT_TOKENS - (earnings?.earnedTokens || 0)} more tokens to request a payout
                            </div>
                        )}
                    </div>

                    {/* Lifetime Earnings */}
                    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <div className="flex items-center gap-2 mb-4">
                            <DollarSign className="w-5 h-5 text-yellow-400" />
                            <h2 className="text-lg font-bold">Lifetime Earnings</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-sm text-gray-400 mb-1">Total Earned</div>
                                <div className="text-2xl font-bold text-white">
                                    {earnings?.totalEarned || 0}
                                </div>
                                <div className="text-sm text-gray-400">${totalEarnedUSD.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-400 mb-1">Already Paid Out</div>
                                <div className="text-2xl font-bold text-white">
                                    {(earnings?.totalEarned || 0) - (earnings?.earnedTokens || 0)}
                                </div>
                                <div className="text-sm text-gray-400">
                                    ${(((earnings?.totalEarned || 0) - (earnings?.earnedTokens || 0)) * TOKEN_VALUE * PAYOUT_RATIO).toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                        <div className="flex gap-3">
                            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-gray-300">
                                <p className="font-semibold text-blue-400 mb-1">How Earnings Work</p>
                                <ul className="space-y-1 text-xs">
                                    <li>• Earn tokens when users pay to contribute to your stories</li>
                                    <li>• 1 token = $0.10 USD (Purchase Value)</li>
                                    <li>• Payout Rate: 70% (You) / 30% (Platform fee)</li>
                                    <li>• Minimum payout: {MIN_PAYOUT_TOKENS} tokens (${MIN_PAYOUT_USD.toFixed(2)})</li>
                                    <li>• Payouts processed via PayPal within 3-5 business days</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Payout History */}
                    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h2 className="text-lg font-bold mb-4">Payout History</h2>
                        {payoutRequests.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No payout requests yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {payoutRequests.map((request) => (
                                    <div
                                        key={request.id}
                                        className="bg-black/50 rounded-xl p-4 border border-gray-800"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(request.status)}
                                                <div>
                                                    <div className="font-bold">
                                                        {request.amount_tokens} tokens
                                                    </div>
                                                    <div className="text-sm text-green-400">
                                                        ${request.amount_usd.toFixed(2)} USD
                                                    </div>
                                                </div>
                                            </div>
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                                                    request.status
                                                )}`}
                                            >
                                                {request.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(request.created_at).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Payout Modal */}
            {showPayoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
                    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Request Payout</h3>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Token Amount
                            </label>
                            <input
                                type="number"
                                min={MIN_PAYOUT_TOKENS}
                                max={earnings?.earnedTokens || 0}
                                value={payoutAmount}
                                onChange={(e) => setPayoutAmount(e.target.value)}
                                placeholder={`Min: ${MIN_PAYOUT_TOKENS}`}
                                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-xl text-white focus:outline-none focus:border-[#EC1D99]"
                            />
                            {payoutAmount && (
                                <div className="mt-2 text-sm text-gray-400">
                                    ≈ ${(parseInt(payoutAmount) * TOKEN_VALUE * PAYOUT_RATIO).toFixed(2)} USD (after 30% fee)
                                </div>
                            )}
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                PayPal Email
                            </label>
                            <input
                                type="email"
                                value={paymentEmail}
                                onChange={(e) => setPaymentEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-xl text-white focus:outline-none focus:border-[#EC1D99]"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowPayoutModal(false)}
                                disabled={submitting}
                                className="flex-1 py-3 rounded-xl bg-gray-800 text-white font-semibold hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRequestPayout}
                                disabled={submitting}
                                className="flex-1 py-3 rounded-xl bg-[#EC1D99] text-white font-semibold hover:bg-[#d61a88] transition-colors disabled:opacity-50"
                            >
                                {submitting ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
