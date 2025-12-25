"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { getPrice } from "@/lib/brand-pricing";

interface Transaction {
    id: string;
    title: string;
    post_type: 'seed' | 'canon';
    visibility_days: number;
    payment_status: string;
    payment_completed_at: string;
    created_at: string;
    stripe_payment_id?: string;
}

export default function TransactionHistoryPage() {
    const router = useRouter();
    const { currentUser } = useStore();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTransactions = async () => {
            if (!currentUser?.id) return;

            try {
                const { data, error } = await supabase
                    .from('stories')
                    .select('id, title, post_type, visibility_days, payment_status, payment_completed_at, created_at, stripe_payment_id')
                    .eq('creator_id', currentUser.id)
                    .in('post_type', ['seed', 'canon'])
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setTransactions(data || []);
            } catch (error) {
                console.error('Error fetching transactions:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTransactions();
    }, [currentUser?.id]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'text-green-500';
            case 'pending': return 'text-yellow-500';
            case 'failed': return 'text-red-500';
            case 'cancelled': return 'text-gray-500';
            default: return 'text-gray-400';
        }
    };

    const getStatusLabel = (status: string) => {
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    const calculateTotal = () => {
        return transactions
            .filter(t => t.payment_status === 'completed')
            .reduce((sum, t) => {
                const price = getPrice(t.post_type, t.visibility_days);
                return sum + (price ?? 0);
            }, 0);
    };

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-gray-800">
                <div className="flex items-center gap-4 p-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold">Transaction History</h1>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Summary Card */}
                <div className="bg-gradient-to-br from-[#EC1D99]/20 to-purple-500/20 border border-[#EC1D99]/30 rounded-xl p-6 mb-6">
                    <div className="text-sm text-gray-400 mb-1">Total Spent</div>
                    <div className="text-3xl font-bold text-white">
                        £{calculateTotal().toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                        {transactions.filter(t => t.payment_status === 'completed').length} completed transactions
                    </div>
                </div>

                {/* Transactions List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-[#EC1D99] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-400">No transactions yet</p>
                        <p className="text-sm text-gray-600 mt-2">
                            Create a Seed or Canon post to get started
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transactions.map((transaction) => {
                            const price = getPrice(transaction.post_type, transaction.visibility_days);

                            return (
                                <div
                                    key={transaction.id}
                                    className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            {/* Story Title */}
                                            <h3 className="font-medium truncate mb-1">{transaction.title}</h3>

                                            {/* Details */}
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                                                <span className="px-2 py-0.5 bg-gray-800 rounded capitalize">
                                                    {transaction.post_type}
                                                </span>
                                                <span>{transaction.visibility_days} days</span>
                                                <span>•</span>
                                                <span>{formatDate(transaction.created_at)}</span>
                                            </div>

                                            {/* Payment Date */}
                                            {transaction.payment_completed_at && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Paid: {formatDate(transaction.payment_completed_at)}
                                                </div>
                                            )}
                                        </div>

                                        {/* Price & Status */}
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-lg font-bold text-white mb-1">
                                                £{(price ?? 0).toFixed(2)}
                                            </div>
                                            <div className={`text-xs font-medium ${getStatusColor(transaction.payment_status)}`}>
                                                {getStatusLabel(transaction.payment_status)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* View Story Link */}
                                    <button
                                        onClick={() => router.push(`/story/${transaction.id}`)}
                                        className="flex items-center gap-1 text-xs text-[#EC1D99] hover:text-[#d91a89] mt-3 transition-colors"
                                    >
                                        View Story <ExternalLink className="w-3 h-3" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Help Text */}
                {transactions.length > 0 && (
                    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mt-6">
                        <p className="text-xs text-gray-400 leading-relaxed">
                            <strong className="text-gray-300">Need receipts?</strong> Your Stripe payment receipts were sent to your email.
                            For accounting purposes, you can download them from your email or contact support for assistance.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
