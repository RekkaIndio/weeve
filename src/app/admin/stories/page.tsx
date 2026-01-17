'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    Eye,
    Trash2,
    Film,
    Heart,
    MessageCircle,
    AlertTriangle,
    Globe,
    Lock,
} from 'lucide-react';
import Link from 'next/link';

interface Story {
    id: string;
    title: string;
    description: string;
    creator_id: string;
    visibility: 'public' | 'private';
    status: 'active' | 'completed';
    post_type?: 'normal' | 'canon' | 'seed';
    created_at: string;
    contributions: { id: string; media_url?: string; media_type?: string }[];
    story_likes: { user_id: string }[];
    story_comments: { id: string }[];
    profiles?: { id: string; name: string; avatar?: string };
    _reportCount?: number;
}

export default function AdminStoriesPage() {
    const [stories, setStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [filterVisibility, setFilterVisibility] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterPostType, setFilterPostType] = useState<string>('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const ITEMS_PER_PAGE = 20;

    const fetchStories = useCallback(async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('stories')
                .select(`
                    id,
                    title,
                    description,
                    creator_id,
                    visibility,
                    status,
                    post_type,
                    created_at,
                    contributions (id, media_url, media_type),
                    story_likes (user_id),
                    story_comments (id),
                    profiles:creator_id (id, name, avatar)
                `, { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

            if (searchQuery) {
                query = query.ilike('title', `%${searchQuery}%`);
            }
            if (filterVisibility) {
                query = query.eq('visibility', filterVisibility);
            }
            if (filterStatus) {
                query = query.eq('status', filterStatus);
            }
            if (filterPostType) {
                query = query.eq('post_type', filterPostType);
            }

            const { data, count, error } = await query;

            if (error) {
                console.error('Failed to fetch stories:', error);
                return;
            }

            // Fetch report counts for these stories
            if (data && data.length > 0) {
                const storyIds = data.map((s: { id: string }) => s.id);
                const { data: reportData } = await supabase
                    .from('story_reports')
                    .select('story_id')
                    .in('story_id', storyIds);

                const reportCounts: Record<string, number> = {};
                reportData?.forEach((r: { story_id: string }) => {
                    reportCounts[r.story_id] = (reportCounts[r.story_id] || 0) + 1;
                });

                const storiesWithReports = data.map((story: Story) => ({
                    ...story,
                    _reportCount: reportCounts[story.id] || 0,
                })) as Story[];
                setStories(storiesWithReports);
            } else {
                setStories([]);
            }

            setTotalCount(count || 0);
        } catch (error) {
            console.error('Error fetching stories:', error);
        } finally {
            setIsLoading(false);
        }
    }, [page, searchQuery, filterVisibility, filterStatus, filterPostType]);

    useEffect(() => {
        fetchStories();
    }, [fetchStories]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchQuery(searchInput);
        setPage(0);
    };

    const handleDeleteStory = async (storyId: string) => {
        if (!confirm('Are you sure you want to delete this story? This action cannot be undone.')) {
            return;
        }

        setActionLoading(storyId);
        try {
            const { error } = await supabase
                .from('stories')
                .delete()
                .eq('id', storyId);

            if (error) throw error;

            setStories(stories.filter(s => s.id !== storyId));
            setTotalCount(prev => prev - 1);
        } catch (error) {
            console.error('Failed to delete story:', error);
            alert('Failed to delete story');
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

    const getStoryThumbnail = (story: Story) => {
        const contribution = story.contributions?.[0];
        if (contribution?.media_url && (contribution.media_type === 'image' || contribution.media_type === 'video')) {
            return contribution.media_url;
        }
        return null;
    };

    const getPostTypeBadge = (postType?: string) => {
        if (!postType || postType === 'normal') return null;
        const config = {
            canon: { label: 'Canon', color: 'bg-purple-500/10 text-purple-400' },
            seed: { label: 'Seed', color: 'bg-blue-500/10 text-blue-400' },
        };
        const type = config[postType as keyof typeof config];
        if (!type) return null;
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${type.color}`}>
                {type.label}
            </span>
        );
    };

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Stories</h1>
                    <p className="text-zinc-400 mt-1">Browse and manage all stories</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Film size={16} />
                    <span>{totalCount} total stories</span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search by title..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-pink-500"
                    />
                </form>

                <select
                    value={filterVisibility}
                    onChange={(e) => {
                        setFilterVisibility(e.target.value);
                        setPage(0);
                    }}
                    className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-pink-500 cursor-pointer"
                >
                    <option value="">All Visibility</option>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                </select>

                <select
                    value={filterStatus}
                    onChange={(e) => {
                        setFilterStatus(e.target.value);
                        setPage(0);
                    }}
                    className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-pink-500 cursor-pointer"
                >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                </select>

                <select
                    value={filterPostType}
                    onChange={(e) => {
                        setFilterPostType(e.target.value);
                        setPage(0);
                    }}
                    className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-pink-500 cursor-pointer"
                >
                    <option value="">All Types</option>
                    <option value="normal">Normal</option>
                    <option value="canon">Canon</option>
                    <option value="seed">Seed</option>
                </select>
            </div>

            {/* Stories Table */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : stories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                        <Film size={40} className="mb-3" />
                        <p>No stories found</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-zinc-800/50">
                                    <tr>
                                        <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                                            Story
                                        </th>
                                        <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                                            Creator
                                        </th>
                                        <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                                            Created
                                        </th>
                                        <th className="text-center text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                                            Stats
                                        </th>
                                        <th className="text-center text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                                            Status
                                        </th>
                                        <th className="text-right text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {stories.map((story) => (
                                        <tr key={story.id} className="hover:bg-zinc-800/30">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-lg bg-zinc-800 flex-shrink-0 overflow-hidden">
                                                        {getStoryThumbnail(story) ? (
                                                            <img
                                                                src={getStoryThumbnail(story)!}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                                <Film size={18} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-white font-medium truncate max-w-xs">
                                                            {story.title || 'Untitled'}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {story.visibility === 'private' ? (
                                                                <Lock size={12} className="text-zinc-500" />
                                                            ) : (
                                                                <Globe size={12} className="text-zinc-500" />
                                                            )}
                                                            <span className="text-xs text-zinc-500">
                                                                {story.contributions?.length || 0} weeves
                                                            </span>
                                                            {getPostTypeBadge(story.post_type)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Link
                                                    href={`/admin/users/${story.creator_id}`}
                                                    className="flex items-center gap-2 text-sm text-zinc-300 hover:text-pink-400"
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0">
                                                        {story.profiles?.avatar ? (
                                                            <img
                                                                src={story.profiles.avatar}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                                                                {story.profiles?.name?.[0]?.toUpperCase() || '?'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="truncate max-w-[120px]">
                                                        {story.profiles?.name || 'Unknown'}
                                                    </span>
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-zinc-400">
                                                {formatDate(story.created_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-4 text-sm text-zinc-400">
                                                    <span className="flex items-center gap-1">
                                                        <Heart size={14} />
                                                        {story.story_likes?.length || 0}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <MessageCircle size={14} />
                                                        {story.story_comments?.length || 0}
                                                    </span>
                                                    {(story._reportCount ?? 0) > 0 && (
                                                        <span className="flex items-center gap-1 text-orange-400">
                                                            <AlertTriangle size={14} />
                                                            {story._reportCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${story.status === 'completed'
                                                    ? 'bg-green-500/10 text-green-400'
                                                    : 'bg-blue-500/10 text-blue-400'
                                                    }`}>
                                                    {story.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link
                                                        href={`/admin/stories/${story.id}`}
                                                        className="p-2 text-zinc-400 hover:text-pink-400 hover:bg-pink-500/10 rounded-lg transition-colors"
                                                        title="Manage Story"
                                                    >
                                                        <Eye size={16} />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDeleteStory(story.id)}
                                                        disabled={actionLoading === story.id}
                                                        className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                                        title="Delete Story"
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
