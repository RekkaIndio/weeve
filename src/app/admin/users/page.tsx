'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
    Users,
    Shield,
    Ban,
    CheckCircle,
    Star,
    Crown,
    Briefcase,
} from 'lucide-react';
import Link from 'next/link';

interface User {
    id: string;
    name: string;
    avatar?: string;
    tagline?: string;
    tokens: number;
    is_influencer?: boolean;
    is_private?: boolean;
    is_verified?: boolean;
    verification_tier?: 'bronze' | 'silver' | 'gold' | null;
    is_brand?: boolean;
    is_admin?: boolean;
    created_at: string;
    tags?: string[];
    _storyCount?: number;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [filterVerified, setFilterVerified] = useState<string>('');
    const [filterBrand, setFilterBrand] = useState<string>('');

    const ITEMS_PER_PAGE = 25;

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('profiles')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

            if (searchQuery) {
                query = query.ilike('name', `%${searchQuery}%`);
            }
            if (filterVerified === 'verified') {
                query = query.eq('is_verified', true);
            } else if (filterVerified === 'unverified') {
                query = query.or('is_verified.is.null,is_verified.eq.false');
            }
            if (filterBrand === 'brand') {
                query = query.eq('is_brand', true);
            } else if (filterBrand === 'personal') {
                query = query.or('is_brand.is.null,is_brand.eq.false');
            }

            const { data, count, error } = await query;

            if (error) {
                console.error('Failed to fetch users:', error);
                return;
            }

            setUsers(data || []);
            setTotalCount(count || 0);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setIsLoading(false);
        }
    }, [page, searchQuery, filterVerified, filterBrand]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchQuery(searchInput);
        setPage(0);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const getVerificationBadge = (user: User) => {
        if (!user.is_verified) return null;
        const tierConfig = {
            gold: { color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            silver: { color: 'text-zinc-300', bg: 'bg-zinc-500/10' },
            bronze: { color: 'text-orange-400', bg: 'bg-orange-500/10' },
        };
        const tier = user.verification_tier || 'bronze';
        const config = tierConfig[tier] || tierConfig.bronze;
        return (
            <span className={`${config.bg} ${config.color} px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1`}>
                <CheckCircle size={10} />
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </span>
        );
    };

    const getUserBadges = (user: User) => {
        const badges = [];

        if (user.is_admin) {
            badges.push(
                <span key="admin" className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                    <Shield size={10} />
                    Admin
                </span>
            );
        }

        if (user.is_brand) {
            badges.push(
                <span key="brand" className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                    <Briefcase size={10} />
                    Brand
                </span>
            );
        }

        if (user.is_influencer) {
            badges.push(
                <span key="influencer" className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                    <Star size={10} />
                    Influencer
                </span>
            );
        }

        if (user.tags?.includes('OG')) {
            badges.push(
                <span key="og" className="bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                    <Crown size={10} />
                    OG
                </span>
            );
        }

        return badges;
    };

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Users</h1>
                    <p className="text-zinc-400 mt-1">Manage user accounts</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Users size={16} />
                    <span>{totalCount} total users</span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-pink-500"
                    />
                </form>

                <select
                    value={filterVerified}
                    onChange={(e) => {
                        setFilterVerified(e.target.value);
                        setPage(0);
                    }}
                    className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-pink-500 cursor-pointer"
                >
                    <option value="">All Verification</option>
                    <option value="verified">Verified</option>
                    <option value="unverified">Unverified</option>
                </select>

                <select
                    value={filterBrand}
                    onChange={(e) => {
                        setFilterBrand(e.target.value);
                        setPage(0);
                    }}
                    className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-pink-500 cursor-pointer"
                >
                    <option value="">All Account Types</option>
                    <option value="brand">Brand Accounts</option>
                    <option value="personal">Personal Accounts</option>
                </select>
            </div>

            {/* Users Table */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                        <Users size={40} className="mb-3" />
                        <p>No users found</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-zinc-800/50">
                                    <tr>
                                        <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                                            User
                                        </th>
                                        <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                                            Badges
                                        </th>
                                        <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                                            Joined
                                        </th>
                                        <th className="text-center text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                                            Tokens
                                        </th>
                                        <th className="text-right text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-zinc-800/30">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden">
                                                        {user.avatar ? (
                                                            <img
                                                                src={user.avatar}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                                {user.name?.[0]?.toUpperCase() || '?'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-white font-medium truncate max-w-xs flex items-center gap-2">
                                                            {user.name || 'Unknown'}
                                                            {getVerificationBadge(user)}
                                                        </p>
                                                        {user.tagline && (
                                                            <p className="text-xs text-zinc-500 truncate max-w-xs">
                                                                {user.tagline}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    {getUserBadges(user)}
                                                    {getUserBadges(user).length === 0 && (
                                                        <span className="text-zinc-600 text-xs">—</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-zinc-400">
                                                {formatDate(user.created_at)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-center text-zinc-400">
                                                {user.tokens?.toLocaleString() || 0}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link
                                                        href={`/admin/users/${user.id}`}
                                                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                                        title="View Profile"
                                                    >
                                                        <Eye size={16} />
                                                    </Link>
                                                    <Link
                                                        href={`/profile/${user.id}`}
                                                        target="_blank"
                                                        className="p-2 text-zinc-400 hover:text-pink-400 hover:bg-pink-500/10 rounded-lg transition-colors"
                                                        title="View Public Profile"
                                                    >
                                                        <Users size={16} />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between p-4 border-t border-zinc-800">
                                <p className="text-sm text-zinc-500">
                                    Showing {page * ITEMS_PER_PAGE + 1} to {Math.min((page + 1) * ITEMS_PER_PAGE, totalCount)} of {totalCount}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <span className="text-sm text-zinc-400 px-2">
                                        Page {page + 1} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                        disabled={page >= totalPages - 1}
                                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
