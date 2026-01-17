'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Users,
    Film,
    UsersRound,
    AlertTriangle,
    TrendingUp,
    Clock,
} from 'lucide-react';
import Link from 'next/link';

interface Stats {
    totalUsers: number;
    totalStories: number;
    totalGroups: number;
    pendingReports: number;
    newUsersToday: number;
    newStoriesToday: number;
}

interface Activity {
    id: string;
    type: 'report' | 'user' | 'story';
    message: string;
    timestamp: string;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats>({
        totalUsers: 0,
        totalStories: 0,
        totalGroups: 0,
        pendingReports: 0,
        newUsersToday: 0,
        newStoriesToday: 0,
    });
    const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            // Fetch counts in parallel
            const [usersRes, storiesRes, groupsRes, reportsRes] = await Promise.all([
                supabase.from('profiles').select('id, created_at', { count: 'exact', head: true }),
                supabase.from('stories').select('id, created_at', { count: 'exact', head: true }),
                supabase.from('groups').select('id', { count: 'exact', head: true }),
                supabase.from('story_reports').select('id, created_at, story_id, reason', { count: 'exact' }).order('created_at', { ascending: false }).limit(10),
            ]);

            // Get today's date for filtering new items
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();

            const [newUsersRes, newStoriesRes] = await Promise.all([
                supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),
                supabase.from('stories').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),
            ]);

            setStats({
                totalUsers: usersRes.count || 0,
                totalStories: storiesRes.count || 0,
                totalGroups: groupsRes.count || 0,
                pendingReports: reportsRes.count || 0,
                newUsersToday: newUsersRes.count || 0,
                newStoriesToday: newStoriesRes.count || 0,
            });

            // Format recent reports as activity
            if (reportsRes.data) {
                const activities: Activity[] = reportsRes.data.map((report: any) => ({
                    id: report.id,
                    type: 'report' as const,
                    message: `New report: ${report.reason || 'No reason provided'}`,
                    timestamp: report.created_at,
                }));
                setRecentActivity(activities);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatRelativeTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    const statCards = [
        {
            title: 'Total Users',
            value: stats.totalUsers,
            subValue: `+${stats.newUsersToday} today`,
            icon: Users,
            color: 'from-blue-500 to-blue-600',
            href: '/admin/users',
        },
        {
            title: 'Total Stories',
            value: stats.totalStories,
            subValue: `+${stats.newStoriesToday} today`,
            icon: Film,
            color: 'from-purple-500 to-purple-600',
            href: '/admin/stories',
        },
        {
            title: 'Total Groups',
            value: stats.totalGroups,
            subValue: 'Active communities',
            icon: UsersRound,
            color: 'from-green-500 to-green-600',
            href: '/admin/groups',
        },
        {
            title: 'Pending Reports',
            value: stats.pendingReports,
            subValue: 'Needs attention',
            icon: AlertTriangle,
            color: stats.pendingReports > 0 ? 'from-red-500 to-red-600' : 'from-zinc-500 to-zinc-600',
            href: '/admin/reports',
        },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-zinc-400 mt-1">Overview of your platform</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card) => (
                    <Link
                        key={card.title}
                        href={card.href}
                        className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 hover:border-zinc-700 transition-colors group"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-zinc-400 text-sm">{card.title}</p>
                                <p className="text-3xl font-bold text-white mt-1">
                                    {card.value.toLocaleString()}
                                </p>
                                <p className="text-xs text-zinc-500 mt-1">{card.subValue}</p>
                            </div>
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <card.icon size={20} className="text-white" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick Actions & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <TrendingUp size={18} className="text-pink-400" />
                        Quick Actions
                    </h2>
                    <div className="mt-4 space-y-2">
                        <Link
                            href="/admin/reports"
                            className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <AlertTriangle size={18} className="text-orange-400" />
                                <span className="text-white">Review Reports</span>
                            </div>
                            {stats.pendingReports > 0 && (
                                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                                    {stats.pendingReports} pending
                                </span>
                            )}
                        </Link>
                        <Link
                            href="/admin/users"
                            className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Users size={18} className="text-blue-400" />
                                <span className="text-white">Manage Users</span>
                            </div>
                        </Link>
                        <Link
                            href="/admin/stories"
                            className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Film size={18} className="text-purple-400" />
                                <span className="text-white">Browse Stories</span>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Clock size={18} className="text-pink-400" />
                        Recent Reports
                    </h2>
                    <div className="mt-4 space-y-3">
                        {recentActivity.length === 0 ? (
                            <p className="text-zinc-500 text-sm py-4 text-center">No recent reports</p>
                        ) : (
                            recentActivity.slice(0, 5).map((activity) => (
                                <div
                                    key={activity.id}
                                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle size={14} className="text-orange-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white truncate">{activity.message}</p>
                                        <p className="text-xs text-zinc-500">{formatRelativeTime(activity.timestamp)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                        {recentActivity.length > 0 && (
                            <Link
                                href="/admin/reports"
                                className="block text-center text-sm text-pink-400 hover:text-pink-300 pt-2"
                            >
                                View all reports →
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
