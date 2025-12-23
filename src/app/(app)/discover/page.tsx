"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useStore, Group } from "@/lib/store";
import { useSearchParams } from 'next/navigation';
import Link from "next/link";
import { Search, TrendingUp, Sparkles, Clock, Users, Plus, X, Heart } from "lucide-react";
import NotificationBell from "@/app/components/NotificationBell";

import MediaWithFallback from "@/app/components/MediaWithFallback";
import { searchUsers, fetchPublicUsers, sendFriendRequest, Friend as FriendType } from '@/lib/friends';

function DiscoverContent() {
    const { stories, groups, addGroup, currentUser, friends } = useStore();
    const searchParams = useSearchParams();
    const tabParam = searchParams?.get('tab');
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'all' | 'groups' | 'people'>(tabParam === 'groups' ? 'groups' : 'all');
    const [feedType, setFeedType] = useState<'forYou' | 'trending' | 'new' | 'friends'>('forYou');

    const [peopleResults, setPeopleResults] = useState<FriendType[]>([]);
    const [isSearchingPeople, setIsSearchingPeople] = useState(false);

    // Set of friend IDs for quick lookup
    const friendIds = new Set((friends || []).map(f => f.id));
    const userGroupIds = new Set((groups || []).map(g => g.id));

    // Ranking algorithms
    const getForYouScore = (story: typeof stories[0]) => {
        let score = 0;

        // Friend bonus (+50 for each friend participant)
        story.participants.forEach(p => {
            if (friendIds.has(p.id)) score += 50;
        });

        // Group bonus (+30 if in user's groups)
        if (story.groupId && userGroupIds.has(story.groupId)) score += 30;

        // Engagement signals
        score += (story.likes || 0) * 2;
        score += (story.comments?.length || 0) * 3;
        score += (story.participants?.length || 0) * 1.5;

        // Recency boost (decay over 7 days)
        const createdAt = story.created_at ? new Date(story.created_at).getTime() : Date.now();
        const ageHours = (Date.now() - createdAt) / 3600000;
        const recencyMultiplier = Math.max(0.3, 1 - (ageHours / 168));

        return score * recencyMultiplier;
    };

    const getTrendingScore = (story: typeof stories[0]) => {
        const likes = story.likes || 0;
        const comments = story.comments?.length || 0;
        const participants = story.participants?.length || 0;

        const engagementScore = likes + (comments * 2) + (participants * 1.5);

        // Time decay (24h half-life)
        const createdAt = story.created_at ? new Date(story.created_at).getTime() : Date.now();
        const ageHours = (Date.now() - createdAt) / 3600000;
        const decay = Math.pow(0.5, ageHours / 24);

        return engagementScore * (1 + decay);
    };

    // Compute trending stories for the top carousel
    const trendingStories = [...stories]
        .sort((a, b) => getTrendingScore(b) - getTrendingScore(a))
        .slice(0, 6);

    // Update view mode when URL param changes
    useEffect(() => {
        if (tabParam === 'groups') {
            setViewMode('groups');
        }
    }, [tabParam]);

    // Fetch people matches when in People view or when searchQuery changes
    useEffect(() => {
        let mounted = true;
        const timeout = setTimeout(async () => {
            const q = searchQuery.trim();

            setIsSearchingPeople(true);
            try {
                const uid = currentUser?.id ?? '';
                let results: FriendType[] = [];

                if (!q || q.length < 2) {
                    // No search term -> show public (non-private) users
                    results = await fetchPublicUsers(uid);
                } else {
                    // Attempt a targeted search; fall back to public users if nothing found
                    results = await searchUsers(q, uid);
                    if (!results || results.length === 0) {
                        results = await fetchPublicUsers(uid);
                    }
                }

                if (mounted) setPeopleResults(results);
            } catch (err) {
                console.warn('[Discover] searchUsers/fetchPublicUsers failed', err);
                if (mounted) setPeopleResults([]);
            } finally {
                setIsSearchingPeople(false);
            }
        }, 300);
        return () => { mounted = false; clearTimeout(timeout); };
    }, [searchQuery, viewMode, currentUser]);

    // Filter and sort stories based on search query and feed type
    const filteredStories = (() => {
        // First, filter by search query
        let filtered = stories.filter(story => {
            if (!searchQuery.trim()) return true;

            const query = searchQuery.toLowerCase();

            // Search in title
            if (story.title.toLowerCase().includes(query)) return true;

            // Search in description
            if (story.description.toLowerCase().includes(query)) return true;

            // Search in hashtags
            if (story.hashtags?.some(tag => tag.toLowerCase().includes(query))) return true;

            // Search in participant names, but ignore private participants
            const participantMatches = story.participants.some(p => {
                const allowed = !p.isPrivate || (currentUser && (p.id === currentUser.id || friendIds.has(p.id)));
                return allowed && p.name.toLowerCase().includes(query);
            });
            if (participantMatches) return true;

            return false;
        });

        // Apply feed type filter and sorting
        switch (feedType) {
            case 'forYou':
                return [...filtered].sort((a, b) => getForYouScore(b) - getForYouScore(a));

            case 'trending':
                return [...filtered].sort((a, b) => getTrendingScore(b) - getTrendingScore(a));

            case 'new':
                return [...filtered].sort((a, b) => {
                    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return dateB - dateA;
                });

            case 'friends':
                // Only show stories where at least one participant is a friend
                const friendStories = filtered.filter(story =>
                    story.participants.some(p => friendIds.has(p.id))
                );
                return [...friendStories].sort((a, b) => {
                    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return dateB - dateA;
                });

            default:
                return filtered;
        }
    })();

    // Filter groups based on search query
    const filteredGroups = groups.filter(group => {
        if (!searchQuery.trim()) return true;

        const query = searchQuery.toLowerCase();

        // Search in group name
        if (group.name.toLowerCase().includes(query)) return true;

        // Search in group description
        if (group.description.toLowerCase().includes(query)) return true;

        return false;
    });

    const handleCreateGroup = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;

        const newGroup: Group = {
            id: Math.random().toString(36).substr(2, 9),
            name: newGroupName,
            description: newGroupDesc,
            avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${newGroupName}`,
            memberCount: 1,
            isPrivate: false,
        };

        addGroup(newGroup);
        setShowCreateGroup(false);
        setNewGroupName('');
        setNewGroupDesc('');
    };

    const handleSendFriendRequest = async (personId: string) => {
        if (!currentUser) return;
        try {
            const success = await sendFriendRequest(currentUser.id, personId);
            if (success) {
                setPeopleResults(prev => prev.map(p => p.id === personId ? { ...p, friendRequestStatus: 'pending_sent' } : p));
            }
        } catch (err) {
            console.warn('[Discover] sendFriendRequest failed', err);
        }
    };


    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Search Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md py-2 px-4 mb-2">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search stories, people, tags..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-800 rounded-full py-3 pl-10 pr-4 text-base focus:outline-none focus:border-[#EC1D99] focus:ring-1 focus:ring-[#EC1D99]/30 transition-all"
                        />
                    </div>
                    {currentUser && (
                        <NotificationBell
                            userId={currentUser.id}
                            className="bg-gray-900/80 border border-gray-800"
                            badgeClassName="bg-[#EC1D99]"
                        />
                    )}
                </div>
            </div>

            {/* View Tabs */}
            <div className="flex items-center gap-6 px-2 border-b border-gray-800 mb-4 overflow-x-auto">
                <button
                    onClick={() => setViewMode('all')}
                    className={`pb-3 text-sm font-medium transition-all relative ${viewMode === 'all' ? 'text-white' : 'text-gray-400 hover:text-gray-300'}`}
                >
                    Stories
                    {viewMode === 'all' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EC1D99] rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setViewMode('groups')}
                    className={`pb-3 text-sm font-medium transition-all relative ${viewMode === 'groups' ? 'text-white' : 'text-gray-400 hover:text-gray-300'}`}
                >
                    Groups
                    {viewMode === 'groups' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EC1D99] rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setViewMode('people')}
                    className={`pb-3 text-sm font-medium transition-all relative ${viewMode === 'people' ? 'text-white' : 'text-gray-400 hover:text-gray-300'}`}
                >
                    People
                    {viewMode === 'people' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EC1D99] rounded-t-full" />
                    )}
                </button>
            </div>

            {/* Feed Type Filter Chips - Only show in Stories view */}
            {viewMode === 'all' && !searchQuery.trim() && (
                <div className="flex gap-2 pb-4 overflow-x-auto scrollbar-hide -mx-4 px-4">
                    {[
                        { id: 'forYou', label: 'For You', icon: Sparkles },
                        { id: 'trending', label: 'Trending', icon: TrendingUp },
                        { id: 'new', label: 'New', icon: Clock },
                        { id: 'friends', label: 'Friends', icon: Heart },
                    ].map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setFeedType(id as typeof feedType)}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${feedType === id
                                ? 'bg-[#EC1D99] text-white shadow-lg shadow-[#EC1D99]/30'
                                : 'bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-700 hover:text-white'
                                }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {/* Content Area */}
            {viewMode === 'groups' ? (
                <div className="space-y-4 px-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Popular Groups</h2>
                        <button
                            onClick={() => setShowCreateGroup(true)}
                            className="flex items-center gap-1 text-sm bg-[#EC1D99] px-3 py-1.5 rounded-full hover:bg-[#d61a88] transition-colors shadow-lg shadow-[#EC1D99]/20"
                        >
                            <Plus className="w-4 h-4" />
                            Create
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {filteredGroups.length > 0 ? (
                            filteredGroups.map(group => (
                                <Link
                                    key={group.id}
                                    href={`/groups/${group.id}`}
                                    className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:border-[#EC1D99]/50 hover:shadow-lg hover:shadow-[#EC1D99]/5 transition-all duration-200 cursor-pointer group"
                                >
                                    <MediaWithFallback
                                        src={group.avatar}
                                        alt={group.name}
                                        className="w-12 h-12 rounded-full bg-gray-800 ring-2 ring-gray-800 group-hover:ring-[#EC1D99]/30 transition-all"
                                    />
                                    <div className="flex-1">
                                        <h3 className="font-bold text-base group-hover:text-[#EC1D99] transition-colors">{group.name}</h3>
                                        <p className="text-xs text-gray-400 line-clamp-1">{group.description}</p>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                            <Users className="w-3 h-3" />
                                            <span>{group.memberCount.toLocaleString()} members</span>
                                            {group.isPrivate && <span className="bg-gray-800 px-1.5 rounded text-[10px]">Private</span>}
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium text-[#EC1D99] border border-[#EC1D99] px-3 py-1 rounded-full group-hover:bg-[#EC1D99] group-hover:text-white transition-colors">
                                        View
                                    </span>
                                </Link>
                            ))
                        ) : (
                            <div className="text-center py-12 space-y-3">
                                <Users className="w-12 h-12 text-gray-700 mx-auto" />
                                <p className="text-gray-400">{`No groups found matching "${searchQuery}"`}</p>
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setShowCreateGroup(true);
                                    }}
                                    className="text-[#EC1D99] text-sm font-medium hover:underline"
                                >
                                    Create the first one →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : viewMode === 'people' ? (
                <div className="space-y-4 px-4">
                    <div className="mb-4 grid grid-cols-1 gap-3">
                        {isSearchingPeople ? (
                            <div className="flex items-center justify-center py-8 gap-3">
                                <div className="w-5 h-5 border-2 border-[#EC1D99] border-t-transparent rounded-full animate-spin" />
                                <span className="text-gray-400">Searching...</span>
                            </div>
                        ) : (peopleResults.length > 0 ? (
                            peopleResults.map((person) => (
                                <div key={person.id} className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:border-[#EC1D99]/50 hover:shadow-lg hover:shadow-[#EC1D99]/5 transition-all duration-200 cursor-pointer">
                                    <Link href={`/profile/${person.id}`} className="flex items-center gap-4 flex-1">
                                        <MediaWithFallback
                                            src={person.avatar}
                                            alt={person.name}
                                            className="w-12 h-12 rounded-full bg-gray-800 ring-2 ring-gray-800"
                                        />
                                        <div className="flex-1">
                                            <h3 className="font-bold text-base">{person.name}</h3>
                                            {person.tagline && <p className="text-xs text-gray-400 line-clamp-1">{person.tagline}</p>}
                                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                {person.isFriend ? <span className="bg-gray-800 px-1.5 rounded text-[10px]">Friend</span> : null}
                                            </div>
                                        </div>
                                    </Link>
                                    {person.isFriend ? (
                                        <div className="text-xs font-medium text-gray-300 border border-gray-700 px-3 py-1 rounded-full">Friends</div>
                                    ) : person.friendRequestStatus === 'none' ? (
                                        <button onClick={(e) => { e.stopPropagation(); handleSendFriendRequest(person.id); }} className="text-xs font-medium text-[#EC1D99] border border-[#EC1D99] px-3 py-1 rounded-full hover:bg-[#EC1D99] hover:text-white transition-colors">Add Friend</button>
                                    ) : person.friendRequestStatus === 'pending_sent' ? (
                                        <div className="text-xs font-medium text-[#EC1D99] border border-[#EC1D99]/50 px-3 py-1 rounded-full bg-[#EC1D99]/10">Requested</div>
                                    ) : (
                                        <div className="text-xs font-medium text-gray-500 border border-gray-700 px-3 py-1 rounded-full">Pending</div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 space-y-3">
                                <Users className="w-12 h-12 text-gray-700 mx-auto" />
                                <p className="text-gray-400">No people found</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-6 px-4">
                    {/* Trending Stories Section */}
                    {!searchQuery.trim() && trendingStories.length > 0 && (
                        <div className="mb-2">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="w-5 h-5 text-[#EC1D99]" />
                                <h2 className="text-lg font-bold">Trending</h2>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                                {trendingStories.map((story) => (
                                    <Link
                                        key={story.id}
                                        href={`/story/${story.id}`}
                                        className="relative flex-shrink-0 w-36 aspect-[9/14] rounded-2xl overflow-hidden group"
                                    >
                                        <MediaWithFallback
                                            src={story.coverImage || story.contributions[0]?.mediaUrl}
                                            alt={story.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl group-hover:ring-[#EC1D99]/50 transition-all" />
                                        <div className="absolute bottom-0 left-0 right-0 p-3">
                                            <h3 className="font-bold text-xs line-clamp-2 mb-1">{story.title}</h3>
                                            <div className="flex items-center gap-1 text-[10px] text-gray-300">
                                                <div className="flex -space-x-1">
                                                    {story.participants.slice(0, 2).map(p => (
                                                        <MediaWithFallback
                                                            key={`${p.id}-${p.position}`}
                                                            src={p.avatar}
                                                            className="w-3 h-3 rounded-full border border-black"
                                                        />
                                                    ))}
                                                </div>
                                                <span>{story.participants.length}</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* People Results when searching */}
                    {searchQuery.trim() && peopleResults.length > 0 && (
                        <div className="mb-4 grid grid-cols-1 gap-3 col-span-2">
                            <h3 className="text-sm font-bold">{`People matching "${searchQuery}"`}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {peopleResults.slice(0, 8).map(person => (
                                    <Link key={person.id} href={`/profile/${person.id}`} className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 px-3 py-2 rounded-full hover:border-[#EC1D99]/50 transition-colors">
                                        <MediaWithFallback src={person.avatar} alt={person.name} className="w-6 h-6 rounded-full" />
                                        <span className="text-xs">{person.name.split(' ').slice(0, 2).join(' ')}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All Stories Header */}
                    {!searchQuery.trim() && (
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-[#EC1D99]" />
                            <h2 className="text-lg font-bold">All Stories</h2>
                        </div>
                    )}

                    {/* Stories Grid - Enhanced with better hover effects */}
                    <div className="grid grid-cols-2 gap-3">
                        {filteredStories.length > 0 ? (
                            <>
                                {filteredStories.map((story, idx) => (
                                    <Link
                                        key={story.id}
                                        href={`/story/${story.id}`}
                                        className={`relative rounded-xl overflow-hidden group ${idx % 3 === 0 ? 'row-span-2 aspect-[9/16]' : 'aspect-square'}`}
                                    >
                                        <MediaWithFallback
                                            src={story.coverImage || story.contributions[0]?.mediaUrl}
                                            alt={story.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                                            <h3 className="font-bold text-sm line-clamp-2 mb-1">{story.title}</h3>
                                            <div className="flex items-center gap-1 text-xs text-gray-300">
                                                <div className="flex -space-x-1">
                                                    {story.participants.slice(0, 2).map(p => (
                                                        <MediaWithFallback
                                                            key={`${p.id}-${p.position}`}
                                                            src={p.avatar}
                                                            className="w-4 h-4 rounded-full border border-black"
                                                        />
                                                    ))}
                                                </div>
                                                <span>{story.participants.length} weevers</span>
                                            </div>
                                        </div>
                                        {/* Hover overlay with pink glow */}
                                        <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-xl group-hover:ring-[#EC1D99]/50 group-hover:shadow-lg group-hover:shadow-[#EC1D99]/20 transition-all duration-300" />
                                    </Link>
                                ))}
                            </>
                        ) : (
                            <div className="col-span-2 text-center py-12 space-y-3">
                                <Search className="w-12 h-12 text-gray-700 mx-auto" />
                                <p className="text-gray-400">{`No stories found matching "${searchQuery}"`}</p>
                                <Link
                                    href="/create-story"
                                    className="inline-block text-[#EC1D99] text-sm font-medium hover:underline"
                                >
                                    {`Create a story about "${searchQuery}" →`}
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create Group Modal */}
            {showCreateGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setShowCreateGroup(false)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h2 className="text-xl font-bold mb-4">Create New Group</h2>
                        <form onSubmit={handleCreateGroup} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Group Name</label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    className="w-full bg-black border border-gray-800 rounded-lg p-3 focus:border-[#EC1D99] focus:outline-none transition-colors"
                                    placeholder="e.g. Photography Lovers"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Description</label>
                                <textarea
                                    value={newGroupDesc}
                                    onChange={(e) => setNewGroupDesc(e.target.value)}
                                    className="w-full bg-black border border-gray-800 rounded-lg p-3 focus:border-[#EC1D99] focus:outline-none transition-colors h-24 resize-none"
                                    placeholder="What is this group about?"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-[#EC1D99] hover:bg-[#d61a88] text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-[#EC1D99]/20"
                            >
                                Create Group
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DiscoverPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-black text-white">Loading...</div>}>
            <DiscoverContent />
        </Suspense>
    );
}
