'use client';

import { useStore } from '@/lib/store';
import { fetchBrandAnalytics, filterBrandPosts, sortBrandPosts, BrandAnalyticsData } from '@/lib/brand-analytics';
import { formatPrice } from '@/lib/brand-pricing';
import { ChevronLeft, BarChart3, DollarSign, Users, TrendingUp, ExternalLink, Calendar, Filter, ArrowUpDown, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type PostTypeFilter = 'all' | 'canon' | 'seed';
type DateRangeFilter = 'all' | '7d' | '30d' | '90d';
type SortOption = 'date' | 'revenue' | 'engagement' | 'contributions';

export default function AnalyticsPage() {
    const router = useRouter();
    const { currentUser } = useStore();
    const [analytics, setAnalytics] = useState<BrandAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [postTypeFilter, setPostTypeFilter] = useState<PostTypeFilter>('all');
    const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>('all');
    const [sortBy, setSortBy] = useState<SortOption>('date');
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        // Redirect non-brand users
        if (currentUser && !currentUser.isBrand) {
            toast.error('Analytics is only available for brand accounts');
            router.push('/settings');
            return;
        }

        if (currentUser) {
            fetchAnalytics();
        }
    }, [currentUser]);

    const fetchAnalytics = async () => {
        if (!currentUser) return;

        try {
            setLoading(true);
            const data = await fetchBrandAnalytics(currentUser.id);
            setAnalytics(data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    // Apply filters, search, and sorting
    const filteredPosts = analytics
        ? sortBrandPosts(
            filterBrandPosts(analytics.posts, { postType: postTypeFilter, dateRange: dateRangeFilter })
                .filter(post =>
                    searchQuery.trim() === '' ||
                    post.title.toLowerCase().includes(searchQuery.toLowerCase())
                ),
            sortBy
        )
        : [];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="text-white">Loading analytics...</div>
            </div>
        );
    }

    if (!currentUser?.isBrand) {
        return null; // Will redirect
    }

    const hasNoPosts = !analytics || analytics.overview.totalPosts === 0;

    return (
        <div className="flex flex-col min-h-screen bg-black text-white pb-24">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-gray-800 px-4 py-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
                <div className="flex items-center gap-3 mb-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-full border border-[#EC1D99] text-[#EC1D99] bg-black hover:bg-gray-900 transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold">Brand Analytics</h1>
                </div>

                {!hasNoPosts && (
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 transition-colors"
                    >
                        <Filter className="w-4 h-4" />
                        <span className="text-sm">Filters</span>
                    </button>
                )}
            </header>

            <main className="flex-1 px-4 py-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    {hasNoPosts ? (
                        // Empty State
                        <div className="flex flex-col items-center justify-center py-20 px-4">
                            <BarChart3 className="w-20 h-20 text-gray-700 mb-4" />
                            <h2 className="text-2xl font-bold mb-2">No Brand Posts Yet</h2>
                            <p className="text-gray-400 text-center mb-6 max-w-md">
                                Create your first Canon or Seed post to start seeing analytics and insights about your brand's performance.
                            </p>
                            <button
                                onClick={() => router.push('/create-story')}
                                className="px-6 py-3 rounded-xl bg-[#EC1D99] hover:bg-[#d61a88] text-white font-semibold transition-colors"
                            >
                                Create Your First Post
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Filter Panel */}
                            {showFilters && (
                                <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800 space-y-4">
                                    {/* Search Bar */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            Search Posts
                                        </label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search by post title..."
                                                className="w-full pl-10 pr-4 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#EC1D99]"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Post Type Filter */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                                Post Type
                                            </label>
                                            <select
                                                value={postTypeFilter}
                                                onChange={(e) => setPostTypeFilter(e.target.value as PostTypeFilter)}
                                                className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#EC1D99]"
                                            >
                                                <option value="all">All Posts</option>
                                                <option value="canon">Canon Only</option>
                                                <option value="seed">Seed Only</option>
                                            </select>
                                        </div>

                                        {/* Date Range Filter */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                                Date Range
                                            </label>
                                            <select
                                                value={dateRangeFilter}
                                                onChange={(e) => setDateRangeFilter(e.target.value as DateRangeFilter)}
                                                className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#EC1D99]"
                                            >
                                                <option value="all">All Time</option>
                                                <option value="7d">Last 7 Days</option>
                                                <option value="30d">Last 30 Days</option>
                                                <option value="90d">Last 90 Days</option>
                                            </select>
                                        </div>

                                        {/* Sort By */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                                Sort By
                                            </label>
                                            <select
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                                className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#EC1D99]"
                                            >
                                                <option value="date">Date (Newest)</option>
                                                <option value="revenue">Revenue (Highest)</option>
                                                <option value="engagement">Engagement (Highest)</option>
                                                <option value="contributions">Contributions (Most)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Overview Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Total Posts Card */}
                                <div className="bg-gradient-to-br from-[#EC1D99]/20 to-purple-600/20 rounded-2xl p-4 border border-[#EC1D99]/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <BarChart3 className="w-4 h-4 text-[#EC1D99]" />
                                        <h3 className="text-xs font-medium text-gray-400">Total Posts</h3>
                                    </div>
                                    <div className="text-2xl font-bold mb-1">{analytics.overview.totalPosts}</div>
                                    <div className="text-xs text-gray-400">
                                        {analytics.overview.canonPosts} Canon · {analytics.overview.seedPosts} Seed
                                    </div>
                                </div>

                                {/* Revenue Card */}
                                <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-2xl p-4 border border-green-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <DollarSign className="w-4 h-4 text-green-400" />
                                        <h3 className="text-xs font-medium text-gray-400">Total Revenue</h3>
                                    </div>
                                    <div className="text-2xl font-bold text-green-400">
                                        {formatPrice(analytics.overview.totalRevenue)}
                                    </div>
                                    <div className="text-xs text-gray-400">From all posts</div>
                                </div>

                                {/* Contributions Card */}
                                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 rounded-2xl p-4 border border-blue-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Users className="w-4 h-4 text-blue-400" />
                                        <h3 className="text-xs font-medium text-gray-400">Contributions</h3>
                                    </div>
                                    <div className="text-2xl font-bold text-blue-400">
                                        {analytics.overview.totalContributions}
                                    </div>
                                    <div className="text-xs text-gray-400">Total stitches</div>
                                </div>

                                {/* Engagement Card */}
                                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 rounded-2xl p-4 border border-yellow-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-4 h-4 text-yellow-400" />
                                        <h3 className="text-xs font-medium text-gray-400">Avg Engagement</h3>
                                    </div>
                                    <div className="text-2xl font-bold text-yellow-400">
                                        {analytics.overview.avgEngagementRate.toFixed(1)}
                                    </div>
                                    <div className="text-xs text-gray-400">Per post</div>
                                </div>
                            </div>

                            {/* Post Performance Section */}
                            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                                <div className="p-4 border-b border-gray-800">
                                    <h2 className="text-lg font-bold">Post Performance</h2>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Showing {filteredPosts.length} of {analytics.overview.totalPosts} posts
                                    </p>
                                </div>

                                {filteredPosts.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        No posts match your current filters
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        {/* Desktop Table View */}
                                        <div className="hidden md:block">
                                            <table className="w-full">
                                                <thead className="bg-black/50 text-xs text-gray-400 uppercase">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left">Post</th>
                                                        <th className="px-4 py-3 text-left">Type</th>
                                                        <th className="px-4 py-3 text-left">Created</th>
                                                        <th className="px-4 py-3 text-center">Slots</th>
                                                        <th className="px-4 py-3 text-center">Engagement</th>
                                                        <th className="px-4 py-3 text-center">Contributions</th>
                                                        <th className="px-4 py-3 text-right">Revenue</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-800">
                                                    {filteredPosts.map((post) => (
                                                        <tr
                                                            key={post.id}
                                                            onClick={() => router.push(`/story/${post.id}`)}
                                                            className="hover:bg-gray-800/50 cursor-pointer transition-colors"
                                                        >
                                                            <td className="px-4 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium truncate max-w-xs">
                                                                        {post.title}
                                                                    </span>
                                                                    {post.productUrl && (
                                                                        <ExternalLink className="w-3 h-3 text-[#EC1D99] flex-shrink-0" />
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${post.postType === 'canon'
                                                                    ? 'bg-purple-500/20 text-purple-400'
                                                                    : 'bg-green-500/20 text-green-400'
                                                                    }`}>
                                                                    {post.postType.toUpperCase()}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-sm text-gray-400">
                                                                {new Date(post.createdAt).toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    year: 'numeric',
                                                                })}
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-sm font-medium">
                                                                        {post.filledSlots}/{post.slotCount}
                                                                    </span>
                                                                    <div className="w-16 h-1 bg-gray-700 rounded-full mt-1 overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-[#EC1D99]"
                                                                            style={{ width: `${(post.filledSlots / post.slotCount) * 100}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 text-center text-sm">
                                                                <div className="flex items-center justify-center gap-3">
                                                                    <span>❤️ {post.likes}</span>
                                                                    <span>💬 {post.comments}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-sm font-medium">{post.contributions}</span>
                                                                    <span className="text-xs text-gray-500">
                                                                        ✓{post.approvedCount} ✕{post.rejectedCount}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 text-right font-semibold text-green-400">
                                                                {formatPrice(post.revenue)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Card View */}
                                        <div className="md:hidden divide-y divide-gray-800">
                                            {filteredPosts.map((post) => (
                                                <div
                                                    key={post.id}
                                                    onClick={() => router.push(`/story/${post.id}`)}
                                                    className="p-4 hover:bg-gray-800/50 cursor-pointer transition-colors"
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h3 className="font-medium">{post.title}</h3>
                                                                {post.productUrl && (
                                                                    <ExternalLink className="w-3 h-3 text-[#EC1D99]" />
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${post.postType === 'canon'
                                                                    ? 'bg-purple-500/20 text-purple-400'
                                                                    : 'bg-green-500/20 text-green-400'
                                                                    }`}>
                                                                    {post.postType.toUpperCase()}
                                                                </span>
                                                                <span className="text-xs text-gray-400">
                                                                    {new Date(post.createdAt).toLocaleDateString('en-US', {
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                    })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-semibold text-green-400">
                                                                {formatPrice(post.revenue)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="bg-black/50 rounded-lg p-2">
                                                            <div className="text-xs text-gray-400 mb-1">Slots</div>
                                                            <div className="text-sm font-medium">{post.filledSlots}/{post.slotCount}</div>
                                                        </div>
                                                        <div className="bg-black/50 rounded-lg p-2">
                                                            <div className="text-xs text-gray-400 mb-1">Engagement</div>
                                                            <div className="text-sm font-medium">{post.likes + post.comments}</div>
                                                        </div>
                                                        <div className="bg-black/50 rounded-lg p-2">
                                                            <div className="text-xs text-gray-400 mb-1">Stitches</div>
                                                            <div className="text-sm font-medium">{post.contributions}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
