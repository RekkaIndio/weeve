"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Film, Layers, Heart, Users, UserPlus, Calendar, TrendingUp, Trophy, Percent, Flame, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import VideoThumbnail from "@/app/components/VideoThumbnail";

type Contribution = {
    id: string;
    userId: string;
    mediaUrl?: string;
    mediaType?: string;
    timestamp: number;
};

type Story = {
    id: string;
    title: string;
    likes?: number;
    status?: string;
    contributions?: Contribution[];
    participants: { id: string; status?: string }[];
    createdAt?: number;
};

export default function AnalyticsPage() {
    const router = useRouter();
    const { currentUser, stories } = useStore();

    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [joinedDate, setJoinedDate] = useState<string | null>(null);
    const [followerGrowth, setFollowerGrowth] = useState<number | null>(null);

    // Calculate stats from stories
    const myStories = useMemo(() => {
        if (!currentUser) return [];
        return stories.filter(s => {
            const userParticipant = s.participants.find(p => p.id === currentUser.id);
            if (!userParticipant) return false;
            if (s.status !== 'completed' && userParticipant.status !== 'accepted' && userParticipant.status !== undefined) return false;
            if (userParticipant.status === 'waiting') return false;
            return true;
        });
    }, [currentUser, stories]);

    const contributionsCount = useMemo(() => {
        return stories.reduce(
            (acc, s) => acc + (s.contributions ? s.contributions.filter(c => c.userId === currentUser?.id).length : 0),
            0
        );
    }, [stories, currentUser]);

    const totalLikes = useMemo(() => {
        return myStories.reduce((acc, story) => acc + (story.likes || 0), 0);
    }, [myStories]);

    // Top Weeve - most liked story
    const topWeeve = useMemo(() => {
        if (myStories.length === 0) return null;
        return myStories.reduce((best, current) =>
            (current.likes || 0) > (best.likes || 0) ? current : best
            , myStories[0]);
    }, [myStories]);

    // Engagement rate - average likes per weeve
    const engagementRate = useMemo(() => {
        if (myStories.length === 0) return 0;
        return Math.round((totalLikes / myStories.length) * 10) / 10;
    }, [totalLikes, myStories.length]);

    // Completion rate
    const completionRate = useMemo(() => {
        const allParticipatedStories = stories.filter(s =>
            s.participants.some(p => p.id === currentUser?.id)
        );
        if (allParticipatedStories.length === 0) return 0;
        const completed = allParticipatedStories.filter(s => s.status === 'completed').length;
        return Math.round((completed / allParticipatedStories.length) * 100);
    }, [stories, currentUser]);

    // Recent activity - last 5 contributions
    const recentActivity = useMemo(() => {
        if (!currentUser) return [];

        const allContributions: { storyId: string; storyTitle: string; contribution: Contribution }[] = [];

        stories.forEach(story => {
            (story.contributions || []).forEach(c => {
                if (c.userId === currentUser.id) {
                    allContributions.push({
                        storyId: story.id,
                        storyTitle: story.title,
                        contribution: c
                    });
                }
            });
        });

        return allContributions
            .sort((a, b) => b.contribution.timestamp - a.contribution.timestamp)
            .slice(0, 5);
    }, [stories, currentUser]);

    // Activity streak - consecutive days with contributions
    const activityStreak = useMemo(() => {
        if (!currentUser) return 0;

        const allTimestamps = stories.flatMap(story =>
            (story.contributions || [])
                .filter(c => c.userId === currentUser.id)
                .map(c => c.timestamp)
        );

        if (allTimestamps.length === 0) return 0;

        // Get unique days (in local timezone)
        const uniqueDays = [...new Set(
            allTimestamps.map(ts => {
                const d = new Date(ts);
                return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            })
        )].sort().reverse();

        if (uniqueDays.length === 0) return 0;

        // Check if most recent activity was today or yesterday
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
        const yesterday = new Date(today.getTime() - 86400000);
        const yesterdayStr = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

        if (uniqueDays[0] !== todayStr && uniqueDays[0] !== yesterdayStr) {
            return 0; // Streak broken
        }

        // Count consecutive days
        let streak = 1;
        for (let i = 1; i < uniqueDays.length; i++) {
            const currentDate = new Date(uniqueDays[i - 1].replace(/-/g, '/'));
            const prevDate = new Date(uniqueDays[i].replace(/-/g, '/'));
            const diffDays = Math.round((currentDate.getTime() - prevDate.getTime()) / 86400000);

            if (diffDays === 1) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    }, [stories, currentUser]);

    // Format relative time
    const formatTimeAgo = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    useEffect(() => {
        if (!currentUser) return;

        async function fetchStats() {
            // Current followers
            const { count: followers } = await supabase
                .from('friendships')
                .select('*', { count: 'exact', head: true })
                .eq('friend_id', currentUser!.id);

            const { count: following } = await supabase
                .from('friendships')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', currentUser!.id);

            setFollowerCount(followers || 0);
            setFollowingCount(following || 0);

            // Follower growth this week
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            const { count: newFollowers } = await supabase
                .from('friendships')
                .select('*', { count: 'exact', head: true })
                .eq('friend_id', currentUser!.id)
                .gte('created_at', oneWeekAgo.toISOString());

            setFollowerGrowth(newFollowers || 0);

            // Fetch joined date from profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('created_at')
                .eq('user_id', currentUser!.id)
                .single();

            if (profile?.created_at) {
                const date = new Date(profile.created_at);
                setJoinedDate(date.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                }));
            }
        }

        fetchStats();
    }, [currentUser]);

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    // Get thumbnail for top weeve
    const getStoryThumbnail = (story: typeof topWeeve) => {
        if (!story) return null;
        const sortedContributions = (story.contributions || [])
            .slice()
            .sort((a, b) => a.timestamp - b.timestamp);
        return sortedContributions[0] || null;
    };

    const topWeeveThumb = getStoryThumbnail(topWeeve);

    const stats = [
        {
            label: "Weeves",
            value: myStories.length,
            icon: Film,
            color: "from-purple-500 to-pink-500"
        },
        {
            label: "Contributions",
            value: contributionsCount,
            icon: Layers,
            color: "from-blue-500 to-cyan-500"
        },
        {
            label: "Total Likes",
            value: totalLikes,
            icon: Heart,
            color: "from-pink-500 to-red-500"
        },
        {
            label: "Followers",
            value: followerCount,
            icon: Users,
            color: "from-green-500 to-emerald-500"
        },
        {
            label: "Following",
            value: followingCount,
            icon: UserPlus,
            color: "from-orange-500 to-yellow-500"
        }
    ];

    return (
        <div className="min-h-screen bg-black text-white pb-8">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md p-4 flex items-center gap-4 border-b border-gray-800">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg">Analytics</h1>
            </div>

            <div className="p-4 space-y-4">
                {/* Streak & Growth Row */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Activity Streak */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 p-4">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-500" />
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
                                <Flame className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{activityStreak}</div>
                                <div className="text-sm text-gray-400">Day Streak</div>
                            </div>
                        </div>
                    </div>

                    {/* Follower Growth */}
                    <div className="relative overflow-hidden rounded-2xl bg-gray-900 p-4">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500">
                                {(followerGrowth || 0) >= 0 ? (
                                    <ArrowUpRight className="w-5 h-5 text-white" />
                                ) : (
                                    <ArrowDownRight className="w-5 h-5 text-white" />
                                )}
                            </div>
                            <div>
                                <div className="text-2xl font-bold flex items-center gap-1">
                                    {(followerGrowth || 0) > 0 && '+'}
                                    {followerGrowth ?? 0}
                                </div>
                                <div className="text-sm text-gray-400">This Week</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Weeve Section */}
                {topWeeve && (topWeeve.likes || 0) > 0 && (
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-orange-500" />
                        <div className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Trophy className="w-5 h-5 text-yellow-500" />
                                <span className="text-sm font-semibold text-yellow-500">Top Weeve</span>
                            </div>
                            <Link href={`/story/${topWeeve.id}`} className="flex gap-3 group">
                                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
                                    {topWeeveThumb?.mediaType === 'video' && topWeeveThumb.mediaUrl ? (
                                        <VideoThumbnail
                                            src={topWeeveThumb.mediaUrl}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : topWeeveThumb?.mediaUrl ? (
                                        <img
                                            src={topWeeveThumb.mediaUrl}
                                            alt={topWeeve.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Film className="w-8 h-8 text-gray-600" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold truncate group-hover:text-yellow-500 transition-colors">
                                        {topWeeve.title}
                                    </h3>
                                    <div className="flex items-center gap-1 mt-1 text-sm text-gray-400">
                                        <Heart className="w-4 h-4 text-pink-500" />
                                        <span>{topWeeve.likes?.toLocaleString() || 0} likes</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {topWeeve.contributions?.length || 0} stitches
                                    </p>
                                </div>
                            </Link>
                        </div>
                    </div>
                )}

                {/* Engagement Metrics */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="relative overflow-hidden rounded-2xl bg-gray-900 p-4">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
                                <TrendingUp className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{engagementRate}</div>
                                <div className="text-sm text-gray-400">Avg Likes/Weeve</div>
                            </div>
                        </div>
                    </div>
                    <div className="relative overflow-hidden rounded-2xl bg-gray-900 p-4">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500">
                                <Percent className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{completionRate}%</div>
                                <div className="text-sm text-gray-400">Completion Rate</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                {recentActivity.length > 0 && (
                    <div className="bg-gray-900 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-gray-800 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-gray-400" />
                            <h3 className="font-semibold">Recent Activity</h3>
                        </div>
                        <div className="divide-y divide-gray-800">
                            {recentActivity.map((item, idx) => (
                                <Link
                                    key={`${item.storyId}-${item.contribution.id}-${idx}`}
                                    href={`/story/${item.storyId}`}
                                    className="flex items-center gap-3 p-4 hover:bg-gray-800/50 transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                                        {item.contribution.mediaType === 'video' && item.contribution.mediaUrl ? (
                                            <VideoThumbnail
                                                src={item.contribution.mediaUrl}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : item.contribution.mediaUrl ? (
                                            <img
                                                src={item.contribution.mediaUrl}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Layers className="w-4 h-4 text-gray-600" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{item.storyTitle}</p>
                                        <p className="text-xs text-gray-500">Added a stitch</p>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {formatTimeAgo(item.contribution.timestamp)}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {stats.map((stat, idx) => (
                        <div
                            key={idx}
                            className={`relative overflow-hidden rounded-2xl bg-gray-900 p-4 ${idx === 0 ? 'col-span-2' : ''}`}
                        >
                            {/* Gradient accent */}
                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${stat.color}`} />

                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20`}>
                                    <stat.icon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
                                    <div className="text-sm text-gray-400">{stat.label}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Joined Date */}
                {joinedDate && (
                    <div className="bg-gray-900 rounded-2xl p-4 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gray-800">
                            <Calendar className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                            <div className="text-sm text-gray-400">Joined</div>
                            <div className="font-medium">{joinedDate}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
