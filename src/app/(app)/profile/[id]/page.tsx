"use client";

import { useParams, useRouter } from "next/navigation";
import { useStore, User } from "@/lib/store";
import { Grid, UserPlus, ChevronLeft, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { currentUser, friends, stories } = useStore();

    const userId = params?.id as string;

    if (!userId) return null;

    // Show loading if currentUser is not yet loaded
    if (!currentUser) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    // Redirect to main profile if it's the current user (check this first!)
    // Redirect to main profile if it's the current user
    useEffect(() => {
        if (currentUser && userId === currentUser.id) {
            router.replace('/profile');
        }
    }, [userId, currentUser, router]);

    if (currentUser && userId === currentUser.id) {
        return null;
    }

    // Find user in friends list or fetch from database
    const [user, setUser] = useState<User | undefined>(
        friends.find(f => f.id === userId)
    );
    const [loadingProfile, setLoadingProfile] = useState(false);

    useEffect(() => {
        async function fetchProfile() {
            if (user || userId === currentUser?.id) return;

            setLoadingProfile(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('user_id', userId)
                    .single();

                if (data) {
                    setUser({
                        id: data.user_id,
                        name: data.name,
                        avatar: data.avatar || undefined,
                        tokens: data.tokens,
                        isInfluencer: data.is_influencer || undefined,
                        interactionCost: data.interaction_cost || undefined,
                        inviteCode: data.invite_code || undefined,
                        isPrivate: false // Assuming default for now, or fetch from DB if column exists
                    });
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
            } finally {
                setLoadingProfile(false);
            }
        }

        fetchProfile();
    }, [userId, user, currentUser]);

    // If user not found (in a real app, fetch from API)
    if (loadingProfile) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-gray-500">Loading profile...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
                <p className="text-gray-400 mb-4">User not found</p>
                <button
                    onClick={() => router.back()}
                    className="text-[#EC1D99] hover:text-white transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const userStories = stories.filter(s => s.participants.some(p => p.id === user.id));

    return (
        <div className="min-h-screen bg-black text-white pb-24 relative">
            {/* Header */}
            <div className="p-4 flex items-center gap-3 sticky top-0 z-10 bg-black/80 backdrop-blur-md">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg">{user.name}</h1>
            </div>

            {/* Profile Info */}
            <div className="flex flex-col items-center px-4 mb-8">
                <div className="relative mb-4">
                    <img
                        src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`}
                        alt={user.name}
                        className="w-24 h-24 rounded-full border-4 border-black bg-gray-800 object-cover"
                    />
                    {user.isInfluencer && (
                        <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-black">
                            PRO
                        </div>
                    )}
                </div>

                <h2 className="text-xl font-bold mb-1">@{user.name.toLowerCase().replace(/\s+/g, '_')}</h2>
                <p className="text-sm text-gray-400 text-center max-w-xs mb-6">
                    Storyteller, dreamer, and weaver of tales. 🌌
                </p>

                {/* Stats */}
                <div className="flex items-center gap-8 mb-6">
                    <div className="text-center">
                        <div className="font-bold text-lg">{userStories.length}</div>
                        <div className="text-xs text-gray-500">Weeves</div>
                    </div>
                    <div className="text-center">
                        <div className="font-bold text-lg">42</div>
                        <div className="text-xs text-gray-500">Contributions</div>
                    </div>
                    <div className="text-center">
                        <div className="font-bold text-lg">850</div>
                        <div className="text-xs text-gray-500">Followers</div>
                    </div>
                </div>

                <div className="flex gap-2 w-full max-w-xs">
                    <Link
                        href={`/create-story?invite=${user.id}`}
                        className="flex-1 bg-[#EC1D99] text-white font-bold py-2 rounded-lg text-sm text-center hover:bg-[#D41C84] transition-colors flex items-center justify-center gap-2"
                    >
                        <UserPlus className="w-4 h-4" />
                        Invite to Weeve
                    </Link>
                    <button className="flex-1 bg-gray-800 text-white font-bold py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors">
                        Follow
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800 mb-1">
                <button
                    className="flex-1 flex justify-center py-3 border-b-2 border-white text-white transition-colors"
                >
                    <Grid className="w-6 h-6" />
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 gap-0.5">
                {userStories.length > 0 ? (
                    userStories.map(story => (
                        <Link key={story.id} href={`/story/${story.id}`} className="aspect-[3/4] relative bg-gray-900 group overflow-hidden">
                            <img
                                src={story.coverImage || story.contributions[0]?.mediaUrl || "https://via.placeholder.com/300"}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute bottom-1 left-1 flex items-center gap-1 text-[10px] font-bold drop-shadow-md text-white">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                                {story.contributions.length}
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="col-span-3 flex flex-col items-center justify-center py-16 text-gray-500">
                        <Grid className="w-12 h-12 mb-3 opacity-50" />
                        <p className="text-sm">No weeves yet</p>
                    </div>
                )}

                {/* Fillers for visual balance if few stories */}
                {userStories.length > 0 && userStories.length < 3 && [1, 2].map(i => (
                    <div key={i} className="aspect-[3/4] bg-gray-900/50"></div>
                ))}
            </div>
        </div>
    );
}
