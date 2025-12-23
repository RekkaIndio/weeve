"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function UserFollowersPage() {
    const router = useRouter();
    const params = useParams();
    const { currentUser } = useStore();
    const userId = params?.id as string;

    const [followers, setFollowers] = useState<FollowerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState<string>('');

    // Redirect to own followers page if viewing own profile
    useEffect(() => {
        if (currentUser && userId === currentUser.id) {
            router.replace('/profile/followers');
        }
    }, [currentUser, userId, router]);

    useEffect(() => {
        if (!userId || (currentUser && userId === currentUser.id)) return;

        async function fetchData() {
            setLoading(true);
            try {
                // Fetch the user's name
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('name')
                    .eq('user_id', userId)
                    .single();

                if (profile) {
                    setUserName(profile.name || 'User');
                }

                // Get all users who follow this user
                const { data: friendships, error } = await supabase
                    .from('friendships')
                    .select('user_id')
                    .eq('friend_id', userId);

                if (error) throw error;

                if (friendships && friendships.length > 0) {
                    const userIds = friendships.map((f: { user_id: string }) => f.user_id);

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
                console.error('[UserFollowersPage] Failed to fetch followers:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [userId, currentUser]);

    if (!userId) return null;

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
                <div>
                    <h1 className="font-bold text-lg">Followers</h1>
                    {userName && <p className="text-xs text-gray-400">@{userName.toLowerCase().replace(/\s+/g, '_')}</p>}
                </div>
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
                </div>
            )}
        </div>
    );
}
