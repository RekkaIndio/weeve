"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Check, Users, UserPlus } from "lucide-react";

type TabType = "creators" | "groups";

interface SuggestedUser {
    id: string;
    name: string;
    avatar: string | null;
    tagline: string | null;
    story_count?: number;
}

interface SuggestedGroup {
    id: string;
    name: string;
    avatar: string | null;
    description: string | null;
    memberCount: number;
    isPrivate: boolean;
}

type ProfileRow = {
    user_id: string;
    name: string;
    avatar: string | null;
    tagline: string | null;
};

type GroupRow = {
    id: string;
    name: string;
    avatar: string | null;
    description: string | null;
    member_count: number;
    is_private: boolean;
};

export default function FollowsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
    const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
    const [suggestedGroups, setSuggestedGroups] = useState<SuggestedGroup[]>([]);
    const [joinedGroups, setJoinedGroups] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [completing, setCompleting] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>("creators");

    // Track mount status to prevent updates after unmount
    const isMounted = useRef(true);

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        loadSuggestedUsers();
        loadSuggestedGroups();
    }, []);

    const loadSuggestedUsers = async () => {
        if (!user) return;

        try {
            // Get random active users (excluding current user)
            const { data, error } = await supabase
                .from('profiles')
                .select('user_id, name, avatar, tagline')
                .neq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

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

    const loadSuggestedGroups = async () => {
        if (!user) return;

        try {
            // Get popular public groups (not private, ordered by member count)
            const { data, error } = await supabase
                .from('groups')
                .select('id, name, avatar, description, member_count, is_private')
                .eq('is_private', false)
                .order('member_count', { ascending: false })
                .limit(20);

            if (error) throw error;

            if (data) {
                // Check which groups user is already a member of
                const { data: memberships } = await supabase
                    .from('group_members')
                    .select('group_id')
                    .eq('user_id', user.id);

                const memberGroupIds = new Set<string>((memberships || []).map((m: { group_id: string }) => m.group_id));
                setJoinedGroups(memberGroupIds);

                setSuggestedGroups(data.map((g: GroupRow) => ({
                    id: g.id,
                    name: g.name,
                    avatar: g.avatar,
                    description: g.description,
                    memberCount: g.member_count,
                    isPrivate: g.is_private,
                })));
            }
        } catch (err) {
            console.error('[Follows] Error loading suggested groups:', err);
        } finally {
            setLoadingGroups(false);
        }
    };

    const toggleJoinGroup = async (groupId: string) => {
        if (!user) return;

        const isJoined = joinedGroups.has(groupId);

        if (isJoined) {
            // Leave group
            setJoinedGroups(prev => {
                const next = new Set(prev);
                next.delete(groupId);
                return next;
            });

            await supabase
                .from('group_members')
                .delete()
                .eq('group_id', groupId)
                .eq('user_id', user.id);
        } else {
            // Join group
            setJoinedGroups(prev => new Set(prev).add(groupId));

            await supabase
                .from('group_members')
                .insert({
                    group_id: groupId,
                    user_id: user.id,
                    role: 'member',
                });
        }
    };

    const handleJoinAllGroups = async () => {
        if (!user) return;

        const groupsToJoin = suggestedGroups.filter(g => !joinedGroups.has(g.id));

        // Optimistically update UI
        setJoinedGroups(new Set(suggestedGroups.map(g => g.id)));

        // Insert all memberships
        const memberships = groupsToJoin.map(g => ({
            group_id: g.id,
            user_id: user.id,
            role: 'member',
        }));

        await supabase.from('group_members').insert(memberships);
    };

    const handleComplete = async () => {
        if (!user) return;

        setCompleting(true);
        try {
            // Mark onboarding as complete via API (Bypasses RLS)
            const response = await fetch('/api/auth/update-onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    onboardingStep: null,
                    completedOnboarding: true
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                console.error('[Follows] API update failed:', errData);
                // We don't throw here to allow optimistic UI navigation to proceed
                // as the user is effectively done anyway
            }

            // CRITICAL: Update the store BEFORE navigating to prevent AuthProvider
            // from seeing stale onboardingStep and redirecting back to /onboarding
            const { setCurrentUser, currentUser: storeUser } = useStore.getState();
            if (storeUser) {
                setCurrentUser({
                    ...storeUser,
                    completedOnboarding: true,
                    onboardingStep: undefined,
                });
            }

            // Respect local dismissal flags so tutorials don't reappear
            try { if (typeof window !== 'undefined' && user?.id) { localStorage.setItem('weeve_onboarding_overlay_dismissed_' + user.id, 'true'); localStorage.setItem('weeve_onboarding_story_overlay_dismissed_' + user.id, 'true'); } } catch (err) { }

            // Navigate to feed
            // Use router.push for SPA navigation, but also force a router refresh to ensure data is up to date
            try {
                router.push('/feed');
                router.refresh();
            } catch (navErr) {
                console.warn('[Follows] router.push failed, using fallback:', navErr);
                window.location.href = '/feed';
            }
        } catch (err) {
            console.error('[Follows] Error completing onboarding:', err);
            // On error, we still want to let them into the app rather than blocking
            window.location.href = '/feed';
        } finally {
            if (isMounted.current) {
                setCompleting(false);
            }
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
                <p className="text-gray-400">Follow amazing creators and join communities</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800">
                <button
                    onClick={() => setActiveTab("creators")}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all relative ${activeTab === "creators"
                        ? "text-white"
                        : "text-gray-500 hover:text-gray-300"
                        }`}
                >
                    <UserPlus className="w-4 h-4" />
                    Creators
                    {suggestedUsers.length > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === "creators"
                            ? "bg-[#EC1D99] text-white"
                            : "bg-gray-800 text-gray-400"
                            }`}>
                            {suggestedUsers.length}
                        </span>
                    )}
                    {activeTab === "creators" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EC1D99]" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("groups")}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all relative ${activeTab === "groups"
                        ? "text-white"
                        : "text-gray-500 hover:text-gray-300"
                        }`}
                >
                    <Users className="w-4 h-4" />
                    Groups
                    {suggestedGroups.length > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === "groups"
                            ? "bg-[#EC1D99] text-white"
                            : "bg-gray-800 text-gray-400"
                            }`}>
                            {suggestedGroups.length}
                        </span>
                    )}
                    {activeTab === "groups" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EC1D99]" />
                    )}
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === "creators" ? (
                <>
                    {/* Quick Action - Follow All */}
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
                </>
            ) : (
                <>
                    {/* Quick Action - Join All */}
                    <div className="p-6 pb-4">
                        <button
                            onClick={handleJoinAllGroups}
                            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-lg transition-colors border border-gray-800"
                        >
                            Join All Groups ({suggestedGroups.length})
                        </button>
                    </div>

                    {/* Suggested Groups List */}
                    <div className="px-6 space-y-3 pb-6">
                        {loadingGroups ? (
                            <div className="text-center py-12 text-gray-500">Loading groups...</div>
                        ) : suggestedGroups.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                No groups available yet
                            </div>
                        ) : (
                            suggestedGroups.map(group => (
                                <div
                                    key={group.id}
                                    className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center gap-4"
                                >
                                    <img
                                        src={group.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${group.id}`}
                                        alt={group.name}
                                        className="w-14 h-14 rounded-xl object-cover border-2 border-gray-800"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-white truncate">
                                            {group.name}
                                        </h3>
                                        <p className="text-sm text-gray-400 truncate">
                                            {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => toggleJoinGroup(group.id)}
                                        className={`px-6 py-2 rounded-full font-semibold text-sm transition-all ${joinedGroups.has(group.id)
                                            ? 'bg-gray-800 text-white border border-gray-700'
                                            : 'bg-[#EC1D99] text-white hover:bg-[#d61a88]'
                                            }`}
                                    >
                                        {joinedGroups.has(group.id) ? (
                                            <span className="flex items-center gap-1">
                                                <Check className="w-4 h-4" />
                                                Joined
                                            </span>
                                        ) : (
                                            'Join'
                                        )}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

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
