"use client";

import { useParams, useRouter } from "next/navigation";
import { useStore, User } from "@/lib/store";
import { Grid, UserPlus, ChevronLeft, Share2, Check, Clock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from 'sonner';
import { sendFriendRequest, getFriendRequests, acceptFriendRequest } from "@/lib/friends";
import { notifyNewFollower } from "@/lib/notifications";
import VideoThumbnail from '@/app/components/VideoThumbnail';
import MediaWithFallback from '@/app/components/MediaWithFallback';

export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { currentUser, friends, stories, fetchFriends, fetchStories } = useStore();

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

    // Friendship and follow state
    const [isFollowing, setIsFollowing] = useState(false);
    const [friendStatus, setFriendStatus] = useState<'none' | 'friend' | 'requested' | 'incoming'>('none');
    const [incomingRequestId, setIncomingRequestId] = useState<string | null>(null);
    const [processingFriendAction, setProcessingFriendAction] = useState(false);

    // Basic stats
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

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
                        tagline: data.tagline || undefined,
                        tokens: data.tokens,
                        website: (data.preferences as any)?.website,
                        preferences: data.preferences as any,
                        createdAt: data.created_at,
                        isInfluencer: data.is_influencer || undefined,
                        interactionCost: data.interaction_cost || undefined,
                        inviteCode: data.invite_code || undefined,
                        isBrand: data.is_brand || false,
                        isPrivate: false // Assuming default for now
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

    // Fetch stats for this user
    useEffect(() => {
        if (!userId) return;

        async function fetchStats() {
            const { count: followers } = await supabase
                .from('friendships')
                .select('*', { count: 'exact', head: true })
                .eq('friend_id', userId);

            const { count: following } = await supabase
                .from('friendships')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            setFollowerCount(followers || 0);
            setFollowingCount(following || 0);
        }
        fetchStats();
    }, [userId, isFollowing]); // Re-fetch if I follow/unfollow

    // Fetch friends once when the current user is available
    useEffect(() => {
        if (!currentUser) return;
        (async () => {
            try {
                await fetchFriends();
            } catch (err) {
                console.warn('[UserProfile] fetchFriends on mount failed', err);
            }

            // Also ensure stories are loaded so we can render the user's weeves
            try {
                await fetchStories();
            } catch (err) {
                console.warn('[UserProfile] fetchStories on mount failed', err);
            }
        })();
    }, [currentUser, fetchFriends, fetchStories]);

    // Keep isFollowing updated based on friends list (which represents "following")
    useEffect(() => {
        const following = !!friends.find(f => f.id === userId);
        setIsFollowing(following);
    }, [friends, userId]);

    // Determine specific Friend Status (None, Requested, Friend)
    useEffect(() => {
        if (!currentUser) return;
        (async () => {
            try {
                // Check if TRUE friend (bidirectional)
                // We are friends if I follow them AND they follow me
                // OR check friend_requests status='accepted'
                // Let's use friend_requests for clarity of status
                const { sent, received } = await getFriendRequests(currentUser.id);

                // Check for accepted request (either direction)
                // Actually, the easiest way to check bidirectional friendship is via friendships table
                // But for "Status" let's check requests first

                const myRequestToThem = sent.find(r => r.receiver_id === userId);
                const theirRequestToMe = received.find(r => r.sender_id === userId);

                // If request is pending
                if (myRequestToThem?.status === 'pending') {
                    setFriendStatus('requested');
                    return;
                }

                // If they requested me (pending)
                if (theirRequestToMe?.status === 'pending') {
                    setFriendStatus('incoming');
                    setIncomingRequestId(theirRequestToMe.id);
                    return;
                }

                // Check if TRUE friend (bidirectional) based on friendships table
                // If I follow them AND they follow me -> Friend
                const { data: reverseFriendship } = await supabase
                    .from('friendships')
                    .select('id')
                    .eq('user_id', userId) // They
                    .eq('friend_id', currentUser.id) // Follow Me
                    .maybeSingle();

                const iFollowThem = !!friends.find(f => f.id === userId);

                if (iFollowThem && reverseFriendship) {
                    setFriendStatus('friend');
                } else {
                    // Not fully friends yet
                    // If no pending request found above, status is none (or check if accepted request exists?)
                    // If accepted request exists, they SHOULD be friends.
                    if (friendStatus !== 'requested' && friendStatus !== 'incoming') {
                        setFriendStatus('none');
                    }
                }

            } catch (err) {
                console.error('[UserProfile] Failed to determine friend status:', err);
            }
        })();
    }, [currentUser, userId, friends, friendStatus /* re-check if status changes */]);

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

    // Friend / Follow handlers
    const handleFollowToggle = async () => {
        if (!currentUser || !user) return;
        setProcessingFriendAction(true);
        try {
            if (isFollowing) {
                // Unfollow (delete one-directional friendship)
                const { error } = await supabase
                    .from('friendships')
                    .delete()
                    .match({ user_id: currentUser.id, friend_id: user.id });

                if (error) {
                    throw error;
                }

                // Refresh store
                try { await fetchFriends(); } catch (err) { console.warn('[UserProfile] fetchFriends after unfollow failed', err); }
                setIsFollowing(false);
                toast.success('Unfollowed');
            } else {
                // Follow (one-directional)
                const { error } = await supabase
                    .from('friendships')
                    .insert({ user_id: currentUser.id, friend_id: user.id });

                if (error) {
                    throw error;
                }

                try { await fetchFriends(); } catch (err) { console.warn('[UserProfile] fetchFriends after follow failed', err); }
                setIsFollowing(true);
                toast.success('Following');

                // Notify the user being followed
                notifyNewFollower(currentUser.id, user.id).catch(console.error);
            }
        } catch (err) {
            console.error('[UserProfile] Follow toggle failed:', err);
            toast.error('Failed to update follow status');
        } finally {
            setProcessingFriendAction(false);
        }
    };

    const handleFriendAction = async () => {
        if (!currentUser || !user) return;

        if (friendStatus === 'friend') {
            toast('You are already friends!');
            return;
        }
        if (friendStatus === 'requested') {
            toast('Friend request already sent');
            return;
        }

        setProcessingFriendAction(true);
        try {
            if (friendStatus === 'incoming' && incomingRequestId) {
                // Accept Request
                const success = await acceptFriendRequest(incomingRequestId);
                if (success) {
                    setFriendStatus('friend');
                    setIsFollowing(true); // Accepting makes us friends (bidirectional follow)

                    // Refresh friends list to ensure store is up to date
                    try { await fetchFriends(); } catch (e) { console.error(e); }

                    toast.success('Friend request accepted!');
                } else {
                    toast.error('Failed to accept request');
                }
            } else {
                // Send Request
                const sent = await sendFriendRequest(currentUser.id, user.id);
                if (sent) {
                    setFriendStatus('requested');
                    toast.success('Friend request sent');
                } else {
                    // Check if already friends via following
                    const { data: reverseFriendship } = await supabase
                        .from('friendships')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('friend_id', currentUser.id)
                        .maybeSingle();

                    // Also check if I follow them
                    const amFollowing = friends.some(f => f.id === user.id);

                    if (reverseFriendship && amFollowing) {
                        setFriendStatus('friend');
                        toast('You are already friends!');
                    } else {
                        // Check for incoming request again (race condition)
                        const { sent: s, received: r } = await getFriendRequests(currentUser.id);
                        const incoming = r.find(req => req.sender_id === user.id && req.status === 'pending');
                        if (incoming) {
                            setFriendStatus('incoming');
                            setIncomingRequestId(incoming.id);
                            toast('This user sent you a request! Click again to accept.');
                        } else {
                            toast.error('Unable to send friend request');
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[UserProfile] handleFriendAction failed:', err);
            toast.error('Failed to update friend status');
        } finally {
            setProcessingFriendAction(false);
        }
    };

    // Only show stories where this user has actually contributed content
    // (not just being listed as a participant with no contributions yet)
    const userStories = stories.filter(s =>
        s.participants.some(p => p.id === user?.id) &&
        s.contributions.some(c => c.userId === user?.id)
    );

    // Separate featured stories (only for brand profiles)
    const featuredStories = userStories.filter(s => s.isFeatured && user?.isBrand);
    const regularStories = userStories.filter(s => !s.isFeatured || !user?.isBrand);

    // Pin/Unpin handler
    const handlePinStory = async (e: React.MouseEvent, storyId: string, currentFeatured: boolean) => {
        e.preventDefault();
        e.stopPropagation();

        if (!currentUser || currentUser.id !== user?.id) return;

        // Optimistic update in UI would require store update, for now we rely on fetchStories refresh or simple toast
        try {
            const { error } = await supabase
                .from('stories')
                .update({ is_featured: !currentFeatured })
                .eq('id', storyId);

            if (error) throw error;

            toast.success(currentFeatured ? 'Story unpinned' : 'Story pinned to profile');
            // Refresh stories
            fetchStories();
        } catch (err) {
            console.error('Error pinning story:', err);
            toast.error('Failed to update pin status');
        }
    };

    // Count contributions across all stories by this user
    const contributionsCount = stories.reduce((acc, s) => acc + (s.contributions ? s.contributions.filter(c => c.userId === user?.id).length : 0), 0);

    // Calculate total likes from user's stories
    const totalLikes = userStories.reduce((acc, story) => acc + (story.likes || 0), 0);

    return (
        <div className="min-h-screen bg-black text-white pb-24 relative">
            {/* Header */}
            <div className="p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] flex items-center gap-3 sticky top-0 z-10 bg-black/80 backdrop-blur-md">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg">{user.name}</h1>
            </div>

            {/* Profile Info - Horizontal Layout */}
            <div className="px-4 mb-6">
                {/* Profile Header */}
                <div className="flex items-start gap-4 mb-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        <img
                            src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`}
                            alt={user.name}
                            className="w-20 h-20 rounded-full border-2 border-gray-800 bg-gray-800 object-cover"
                        />
                        {user.isInfluencer && (
                            <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-black">
                                PRO
                            </div>
                        )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold truncate">
                            @{user.name.toLowerCase().replace(/\s+/g, '_')}
                        </h2>
                        <p className="text-sm text-gray-400 line-clamp-2 mt-0.5">
                            {user.tagline || 'Weeve user'}
                        </p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {(user.website || (user.preferences as any)?.website) && (
                                <a
                                    href={user.website || (user.preferences as any)?.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-[#EC1D99] hover:underline"
                                >
                                    {new URL(user.website || (user.preferences as any)?.website).hostname}
                                </a>
                            )}
                            <span className="text-xs text-gray-500">
                                Joined {new Date(user.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stats - Compact Row */}
                <div className="flex items-center justify-between py-3 border-y border-gray-800 mb-4">
                    <div className="flex-1 text-center">
                        <div className="font-bold text-base">{userStories.length}</div>
                        <div className="text-xs text-gray-500">Weeves</div>
                    </div>
                    <div className="flex-1 text-center">
                        <div className="font-bold text-base">{totalLikes}</div>
                        <div className="text-xs text-gray-500">Likes</div>
                    </div>
                    <Link href={`/profile/${userId}/followers`} className="flex-1 text-center hover:opacity-80 transition-opacity cursor-pointer">
                        <div className="font-bold text-base">{followerCount}</div>
                        <div className="text-xs text-gray-500">Followers</div>
                    </Link>
                    <Link href={`/profile/${userId}/following`} className="flex-1 text-center hover:opacity-80 transition-opacity cursor-pointer">
                        <div className="font-bold text-base">{followingCount}</div>
                        <div className="text-xs text-gray-500">Following</div>
                    </Link>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleFriendAction}
                        disabled={processingFriendAction || friendStatus === 'friend' || friendStatus === 'requested'}
                        className={`flex-1 ${friendStatus === 'friend' ? 'bg-emerald-600' : (friendStatus === 'requested' || friendStatus === 'incoming' ? 'bg-gray-700' : 'bg-[#EC1D99]')} text-white font-bold py-2 rounded-lg text-sm text-center ${friendStatus === 'friend' || friendStatus === 'requested' ? '' : 'hover:opacity-90'} transition-all flex items-center justify-center gap-2`}
                    >
                        {friendStatus === 'friend' ? (
                            <>
                                <Check className="w-4 h-4" />
                                Friends
                            </>
                        ) : friendStatus === 'requested' ? (
                            <>
                                <Clock className="w-4 h-4" />
                                Requested
                            </>
                        ) : friendStatus === 'incoming' ? (
                            <>
                                <UserPlus className="w-4 h-4" />
                                Accept Request
                            </>
                        ) : (
                            <>
                                <UserPlus className="w-4 h-4" />
                                Add Friend
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleFollowToggle}
                        disabled={processingFriendAction}
                        className={`flex-1 ${isFollowing ? 'bg-gray-800 text-white' : 'bg-gray-800 text-white'} font-bold py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors flex items-center justify-center gap-2`}
                    >
                        {isFollowing ? (
                            <span className="flex items-center gap-2">
                                <Check className="w-4 h-4" />
                                Following
                            </span>
                        ) : (
                            'Follow'
                        )}
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

            {/* Featured Stories Section (Brand Only) */}
            {user?.isBrand && (featuredStories.length > 0 || (currentUser?.id === user?.id && userStories.length > 0)) && (
                <div className="mt-6 px-4 mb-2">
                    {featuredStories.length > 0 && (
                        <>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="text-yellow-500">★</span> Featured Stories
                            </h3>
                            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                                {featuredStories.map(story => (
                                    <Link key={story.id} href={`/story/${story.id}`} className="flex-shrink-0 w-32 aspect-[3/4] relative rounded-xl overflow-hidden bg-gray-900 group border border-yellow-500/30">
                                        <MediaWithFallback src={story.coverImage || story.contributions[0]?.mediaUrl} alt={story.title} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                        <div className="absolute bottom-2 left-2 right-2">
                                            <div className="text-xs font-bold text-white truncate">{story.title}</div>
                                            <div className="text-[10px] text-gray-400">{story.likes} likes</div>
                                        </div>
                                        {/* Unpin button for owner */}
                                        {currentUser?.id === user?.id && (
                                            <button
                                                onClick={(e) => handlePinStory(e, story.id, true)}
                                                className="absolute top-1 right-1 bg-black/50 hover:bg-black/80 p-1.5 rounded-full text-white backdrop-blur-sm transition-colors"
                                            >
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                                            </button>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* All Stories Grid */}
            {user?.isBrand && <div className="px-4 py-2 text-sm font-bold text-gray-400 uppercase tracking-wider">All Weeves</div>}
            <div className="grid grid-cols-3 gap-0.5">
                {
                    regularStories.length > 0 ? (
                        regularStories.map(story => {
                            const sortedContributions = (story.contributions || []).slice().sort((a, b) => a.timestamp - b.timestamp);
                            const firstContribution = sortedContributions[0];
                            const firstMediaType = firstContribution?.mediaType;
                            const firstMediaUrl = firstContribution?.mediaUrl;
                            const isPinned = story.isFeatured;

                            return (
                                <Link key={story.id} href={`/story/${story.id}`} className="aspect-[3/4] relative bg-gray-900 group overflow-hidden">
                                    {/* Prefer contribution media for preview, fall back to coverImage */}
                                    {firstMediaType === 'video' && firstMediaUrl ? (
                                        <VideoThumbnail src={firstMediaUrl} poster={story.coverImage} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    ) : firstMediaType === 'image' && firstMediaUrl ? (
                                        <MediaWithFallback src={firstMediaUrl} alt={story.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    ) : story.coverImage ? (
                                        <MediaWithFallback src={story.coverImage} alt={story.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    ) : (
                                        <img
                                            src="https://via.placeholder.com/300"
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            alt={story.title}
                                        />
                                    )}

                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute bottom-1 left-1 flex items-center gap-1 text-[10px] font-bold drop-shadow-md text-white">
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                        {story.contributions.length}
                                    </div>

                                    {/* Pin Button for Brand Owner */}
                                    {currentUser?.id === user?.id && user?.isBrand && (
                                        <button
                                            onClick={(e) => handlePinStory(e, story.id, false)}
                                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm"
                                        >
                                            <svg className="w-4 h-4 text-white/50 hover:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                                        </button>
                                    )}
                                </Link>
                            );
                        })
                    ) : (
                        <div className="col-span-3 flex flex-col items-center justify-center py-16 text-gray-500">
                            {/* ... existing empty state ... */}
                            <Grid className="w-12 h-12 mb-3 opacity-50" />
                            <p className="text-sm">No weeves yet</p>
                        </div >
                    )
                }

                {/* Fillers for visual balance if few stories */}
                {
                    regularStories.length > 0 && regularStories.length < 3 && [1, 2].map(i => (
                        <div key={i} className="aspect-[3/4] bg-gray-900/50"></div>
                    ))
                }
            </div >
        </div >
    );
}
