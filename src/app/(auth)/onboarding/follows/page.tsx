"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Check } from "lucide-react";

interface SuggestedUser {
    id: string;
    name: string;
    avatar: string | null;
    tagline: string | null;
    story_count?: number;
}

type ProfileRow = {
    user_id: string;
    name: string;
    avatar: string | null;
    tagline: string | null;
};

export default function FollowsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
    const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);

    useEffect(() => {
        loadSuggestedUsers();
    }, []);

    const loadSuggestedUsers = async () => {
        if (!user) return;

        try {
            // Get random active users (excluding current user)
            const { data, error } = await supabase
                .from('profiles')
                .select('user_id, name, avatar, tagline')
                .neq('user_id', user.id)
                .limit(10);

            if (error) throw error;

            if (data) {
                setSuggestedUsers(data.map((u: ProfileRow) => ({
                    id: u.user_id,
                    name: u.name,
                    avatar: u.avatar,
                    tagline: u.tagline,
                })));
            }
        } catch (err) {
            console.error('[Follows] Error loading suggested users:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleFollow = async (userId: string) => {
        if (!user) return;

        const isFollowing = followedUsers.has(userId);

        if (isFollowing) {
            // Unfollow
            setFollowedUsers(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });

            await supabase
                .from('friendships')
                .delete()
                .eq('user_id', user.id)
                .eq('friend_id', userId);
        } else {
            // Follow
            setFollowedUsers(prev => new Set(prev).add(userId));

            await supabase
                .from('friendships')
                .insert({
                    user_id: user.id,
                    friend_id: userId,
                    status: 'accepted',
                });
        }
    };

    const handleFollowAll = async () => {
        if (!user) return;

        const usersToFollow = suggestedUsers.filter(u => !followedUsers.has(u.id));

        // Optimistically update UI
        setFollowedUsers(new Set(suggestedUsers.map(u => u.id)));

        // Insert all friendships
        const friendships = usersToFollow.map(u => ({
            user_id: user.id,
            friend_id: u.id,
            status: 'accepted',
        }));

        await supabase.from('friendships').insert(friendships);
    };

    const handleComplete = async () => {
        if (!user) return;

        setCompleting(true);
        try {
            // Mark onboarding as complete
            await supabase
                .from('profiles')
                .update({
                    onboarding_step: null,
                    completed_onboarding: true,
                })
                .eq('user_id', user.id);

            // Respect local dismissal flags so tutorials don't reappear
            try { if (typeof window !== 'undefined' && user?.id) { localStorage.setItem('weeve_onboarding_overlay_dismissed_' + user.id, 'true'); localStorage.setItem('weeve_onboarding_story_overlay_dismissed_' + user.id, 'true'); } } catch (err) { }

            // Navigate to feed with fallback to ensure we navigate
            try {
                router.push('/feed');
                // Fallback after short delay
                setTimeout(() => {
                    window.location.replace('/feed');
                }, 500);
            } catch (navErr) {
                console.warn('[Follows] router.push failed, using fallback:', navErr);
                window.location.replace('/feed');
            }
        } catch (err) {
            console.error('[Follows] Error completing onboarding:', err);
            // Even on error, try to navigate to feed
            window.location.replace('/feed');
        } finally {
            setCompleting(false);
        }
    };


    return (
        <div className="min-h-screen bg-black text-white pb-32">
            {/* Header */}
            <div className="p-6 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] border-b border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                        <div className="w-2 h-2 rounded-full bg-[#EC1D99]"></div>
                    </div>
                    <span className="text-sm text-gray-400">Step 2 of 2</span>
                </div>
                <h1 className="text-3xl font-bold mb-2">Find your storytelling crew</h1>
                <p className="text-gray-400">Follow amazing creators to start your journey</p>
            </div>

            {/* Quick Action */}
            <div className="p-6 pb-4">
                <button
                    onClick={handleFollowAll}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-lg transition-colors border border-gray-800"
                >
                    Follow All ({suggestedUsers.length})
                </button>
            </div>

            {/* Suggested Users List */}
            <div className="px-6 space-y-3">
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading suggestions...</div>
                ) : suggestedUsers.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No suggestions available yet
                    </div>
                ) : (
                    suggestedUsers.map(suggestedUser => (
                        <div
                            key={suggestedUser.id}
                            className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center gap-4"
                        >
                            <img
                                src={suggestedUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${suggestedUser.id}`}
                                alt={suggestedUser.name}
                                className="w-14 h-14 rounded-full object-cover border-2 border-gray-800"
                            />
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-white truncate">
                                    {suggestedUser.name}
                                </h3>
                                <p className="text-sm text-gray-400 truncate">
                                    {suggestedUser.tagline || 'Storyteller on Weeve'}
                                </p>
                            </div>
                            <button
                                onClick={() => toggleFollow(suggestedUser.id)}
                                className={`px-6 py-2 rounded-full font-semibold text-sm transition-all ${followedUsers.has(suggestedUser.id)
                                    ? 'bg-gray-800 text-white border border-gray-700'
                                    : 'bg-[#EC1D99] text-white hover:bg-[#d61a88]'
                                    }`}
                            >
                                {followedUsers.has(suggestedUser.id) ? (
                                    <span className="flex items-center gap-1">
                                        <Check className="w-4 h-4" />
                                        Following
                                    </span>
                                ) : (
                                    'Follow'
                                )}
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 p-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]">
                <button
                    onClick={handleComplete}
                    disabled={completing}
                    className="w-full bg-white text-black font-bold py-4 rounded-lg mb-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-gray-100 active:scale-95"
                >
                    {completing ? 'Getting Started...' : 'Get Started 🎉'}
                </button>
                <button
                    onClick={handleComplete}
                    className="w-full text-gray-400 hover:text-white transition-colors text-sm"
                >
                    Skip and explore
                </button>
            </div>
        </div>
    );
}
