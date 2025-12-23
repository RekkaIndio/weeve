"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import UserListItem from "@/app/components/UserListItem";

interface FollowerProfile {
    id: string;
    name: string;
    avatar?: string;
    tagline?: string;
}

export default function FollowersPage() {
    const router = useRouter();
    const { currentUser } = useStore();
    const [followers, setFollowers] = useState<FollowerProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        async function fetchFollowers() {
            setLoading(true);
            try {
                // Get all users who follow the current user
                // Followers are rows where friend_id = currentUser.id
                const { data: friendships, error } = await supabase
                    .from('friendships')
                    .select('user_id')
                    .eq('friend_id', currentUser!.id);

                if (error) throw error;

                if (friendships && friendships.length > 0) {
                    const userIds = friendships.map((f: { user_id: string }) => f.user_id);

                    // Fetch profiles for these users
                    const { data: profiles, error: profilesError } = await supabase
                        .from('profiles')
                        .select('user_id, name, avatar, tagline')
                        .in('user_id', userIds);

                    if (profilesError) throw profilesError;

                    const formattedFollowers = (profiles || []).map((p: { user_id: string; name: string | null; avatar: string | null; tagline: string | null }) => ({
                        id: p.user_id,
                        name: p.name || 'Unknown User',
                        avatar: p.avatar || undefined,
                        tagline: p.tagline || undefined,
                    }));

                    setFollowers(formattedFollowers);
                } else {
                    setFollowers([]);
                }
            } catch (err) {
                console.error('[FollowersPage] Failed to fetch followers:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchFollowers();
    }, [currentUser]);

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Header */}
            <div className="p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] flex items-center gap-3 sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-gray-800">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg">Followers</h1>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#EC1D99]"></div>
                </div>
            ) : followers.length > 0 ? (
                <div className="divide-y divide-gray-800">
                    {followers.map(user => (
                        <UserListItem key={user.id} user={user} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <Users className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">No followers yet</p>
                    <p className="text-xs mt-1">Share your profile to get more followers</p>
                </div>
            )}
        </div>
    );
}
