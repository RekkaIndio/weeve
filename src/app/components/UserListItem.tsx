"use client";

import Link from "next/link";
import { User as UserIcon, Check } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { notifyNewFollower } from "@/lib/notifications";

interface UserListItemProps {
    user: {
        id: string;
        name: string;
        avatar?: string;
        tagline?: string;
    };
    showFollowButton?: boolean;
}

export default function UserListItem({ user, showFollowButton = true }: UserListItemProps) {
    const { currentUser, friends, fetchFriends } = useStore();
    const [isProcessing, setIsProcessing] = useState(false);

    // Check if current user is following this user
    const isFollowing = friends.some(f => f.id === user.id);
    const isOwnProfile = currentUser?.id === user.id;

    const handleFollowToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!currentUser || isOwnProfile) return;

        setIsProcessing(true);
        try {
            if (isFollowing) {
                // Unfollow
                const { error } = await supabase
                    .from('friendships')
                    .delete()
                    .match({ user_id: currentUser.id, friend_id: user.id });

                if (error) throw error;
                await fetchFriends();
                toast.success('Unfollowed');
            } else {
                // Follow
                const { error } = await supabase
                    .from('friendships')
                    .insert({ user_id: currentUser.id, friend_id: user.id });

                if (error) throw error;
                await fetchFriends();
                toast.success('Following');

                // Notify the user being followed
                notifyNewFollower(currentUser.id, user.id).catch(console.error);
            }
        } catch (err) {
            console.error('[UserListItem] Follow toggle failed:', err);
            toast.error('Failed to update follow status');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Link
            href={isOwnProfile ? '/profile' : `/profile/${user.id}`}
            className="flex items-center gap-3 p-4 hover:bg-gray-900/50 transition-colors"
        >
            {/* Avatar */}
            <div className="relative">
                <img
                    src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`}
                    alt={user.name}
                    className="w-12 h-12 rounded-full bg-gray-800 object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`;
                    }}
                />
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">
                    {user.name}
                </div>
                {user.tagline && (
                    <div className="text-sm text-gray-400 truncate">
                        {user.tagline}
                    </div>
                )}
            </div>

            {/* Follow Button */}
            {showFollowButton && !isOwnProfile && (
                <button
                    onClick={handleFollowToggle}
                    disabled={isProcessing}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${isFollowing
                            ? 'bg-gray-800 text-white hover:bg-gray-700'
                            : 'bg-[#EC1D99] text-white hover:bg-[#EC1D99]/90'
                        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isProcessing ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : isFollowing ? (
                        <span className="flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Following
                        </span>
                    ) : (
                        'Follow'
                    )}
                </button>
            )}
        </Link>
    );
}
