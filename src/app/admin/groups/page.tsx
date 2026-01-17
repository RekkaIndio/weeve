'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
    UsersRound,
    Lock,
    Globe,
    Trash2,
    Users,
    Film,
} from 'lucide-react';
import Link from 'next/link';

interface Group {
    id: string;
    name: string;
    description: string;
    avatar?: string;
    is_private: boolean;
    created_at: string;
    owner_id: string;
    owner?: { id: string; name: string; avatar?: string };
    _memberCount?: number;
    _storyCount?: number;
}

export default function AdminGroupsPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [filterPrivacy, setFilterPrivacy] = useState<string>('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const ITEMS_PER_PAGE = 20;

    const fetchGroups = useCallback(async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('groups')
                .select(`
                    *,
                    owner:profiles!groups_owner_id_fkey (id, name, avatar)
                `, { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

            if (searchQuery) {
                query = query.ilike('name', `%${searchQuery}%`);
            }
            if (filterPrivacy === 'private') {
                query = query.eq('is_private', true);
            } else if (filterPrivacy === 'public') {
                query = query.eq('is_private', false);
            }

            const { data, count, error } = await query;

            if (error) {
                console.error('Failed to fetch groups:', error);
                return;
            }

            // Fetch member and story counts for each group
            if (data && data.length > 0) {
                const groupIds = data.map((g: { id: string }) => g.id);

                // Get member counts
                const { data: memberData } = await supabase
                    .from('group_members')
                    .select('group_id')
                    .in('group_id', groupIds);

                const memberCounts: Record<string, number> = {};
                memberData?.forEach((m: { group_id: string }) => {
                    memberCounts[m.group_id] = (memberCounts[m.group_id] || 0) + 1;
                });

                // Get story counts
                const { data: storyData } = await supabase
                    .from('stories')
                    .select('group_id')
                    .in('group_id', groupIds);

                const storyCounts: Record<string, number> = {};
                storyData?.forEach((s: { group_id: string | null }) => {
                    if (s.group_id) {
                        storyCounts[s.group_id] = (storyCounts[s.group_id] || 0) + 1;
                    }
                });

                const groupsWithCounts = data.map((group: Group) => ({
                    ...group,
                    _memberCount: memberCounts[group.id] || 0,
                    _storyCount: storyCounts[group.id] || 0,
                })) as Group[];
                setGroups(groupsWithCounts);
            } else {
                setGroups([]);
            }

            setTotalCount(count || 0);
        } catch (error) {
            console.error('Error fetching groups:', error);
        } finally {
            setIsLoading(false);
        }
    }, [page, searchQuery, filterPrivacy]);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchQuery(searchInput);
        setPage(0);
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (!confirm('Are you sure you want to delete this group? This action cannot be undone. Stories in this group will NOT be deleted but will be unlinked.')) {
            return;
        }

        setActionLoading(groupId);
        try {
            // Unlink stories from this group
            await supabase
                .from('stories')
                .update({ group_id: null })
                .eq('group_id', groupId);

            // Delete group members
            await supabase
                .from('group_members')
                .delete()
                .eq('group_id', groupId);

            // Delete the group
            const { error } = await supabase
                .from('groups')
                .delete()
                .eq('id', groupId);

            if (error) throw error;

            setGroups(groups.filter(g => g.id !== groupId));
            setTotalCount(prev => prev - 1);
        } catch (error) {
            console.error('Failed to delete group:', error);
            alert('Failed to delete group');
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Groups</h1>
                    <p className="text-zinc-400 mt-1">Manage community groups</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <UsersRound size={16} />
                    <span>{totalCount} total groups</span>
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
                    value={filterPrivacy}
                    onChange={(e) => {
                        setFilterPrivacy(e.target.value);
                        setPage(0);
                    }}
                    className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-pink-500 cursor-pointer"
                >
                    <option value="">All Privacy</option>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                </select>
            </div>

            {/* Groups Table */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : groups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                        <UsersRound size={40} className="mb-3" />
                        <p>No groups found</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-zinc-800/50">
                                    <tr>
                                        <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                                            Group
                                        </th>
                                        <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                                            Owner
                                        </th>
                                        <th className="text-center text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                                            Members
                                        </th>
                                        <th className="text-center text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                                            Stories
                                        </th>
                                        <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                                            Created
                                        </th>
                                        <th className="text-right text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {groups.map((group) => (
                                        <tr key={group.id} className="hover:bg-zinc-800/30">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex-shrink-0 overflow-hidden">
                                                        {group.avatar ? (
                                                            <img
                                                                src={group.avatar}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                                <UsersRound size={18} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-white font-medium truncate max-w-xs flex items-center gap-2">
                                                            {group.name}
                                                            {group.is_private ? (
                                                                <Lock size={12} className="text-zinc-500" />
                                                            ) : (
                                                                <Globe size={12} className="text-zinc-500" />
                                                            )}
                                                        </p>
                                                        {group.description && (
                                                            <p className="text-xs text-zinc-500 truncate max-w-xs">
                                                                {group.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Link
                                                    href={`/admin/users/${group.owner_id}`}
                                                    className="flex items-center gap-2 text-sm text-zinc-300 hover:text-pink-400"
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0">
                                                        {group.owner?.avatar ? (
                                                            <img
                                                                src={group.owner.avatar}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                                                                {group.owner?.name?.[0]?.toUpperCase() || '?'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="truncate max-w-[100px]">
                                                        {group.owner?.name || 'Unknown'}
                                                    </span>
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="flex items-center justify-center gap-1 text-sm text-zinc-400">
                                                    <Users size={14} />
                                                    {group._memberCount || 0}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="flex items-center justify-center gap-1 text-sm text-zinc-400">
                                                    <Film size={14} />
                                                    {group._storyCount || 0}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-zinc-400">
                                                {formatDate(group.created_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link
                                                        href={`/admin/groups/${group.id}`}
                                                        className="p-2 text-zinc-400 hover:text-pink-400 hover:bg-pink-500/10 rounded-lg transition-colors"
                                                        title="Manage Group"
                                                    >
                                                        <Eye size={16} />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDeleteGroup(group.id)}
                                                        disabled={actionLoading === group.id}
                                                        className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                                        title="Delete Group"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
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
