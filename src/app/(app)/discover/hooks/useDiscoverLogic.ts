import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore, Group, Story } from "@/lib/store";
import { rankStories } from '@/lib/discovery/core';
import { searchUsers, fetchPublicUsers, sendFriendRequest, Friend as FriendType } from '@/lib/friends';
import { supabase } from '@/lib/supabase';

export type ViewMode = 'all' | 'groups' | 'people';
export type FeedType = 'forYou' | 'trending' | 'new' | 'friends' | 'seeds' | 'canon';


// Helpers
const actions = {
    getPublicStories: (stories: Story[]) => {
        return stories.filter(story => {
            if (story.visibility !== 'public') return false;
            // Must have at least one contribution (completed content)
            if (!story.contributions || story.contributions.length === 0) return false;

            // Check if this is a public story with reserved slots (invited friends)
            // Reserved slots are participants who are NOT the creator
            const reservedParticipants = story.participants.filter(p => p.id !== story.creatorId);

            if (reservedParticipants.length > 0) {
                // Has reserved slots - check if ALL reserved participants have contributed
                const contributorIds = new Set(story.contributions.map(c => c.userId));
                const allReservedFilled = reservedParticipants.every(p => contributorIds.has(p.id));
                if (!allReservedFilled) {
                    // Reserved slots not all filled - don't show on discover yet
                    return false;
                }
            }
            // Either no reserved slots, or all reserved slots are filled
            return true;
        });
    }
};

export function useDiscoverLogic() {
    const { stories, groups, addGroup, currentUser, friends, blockedUserIds } = useStore();
    const searchParams = useSearchParams();
    const router = useRouter();
    
    // URL Params
    const tabParam = searchParams?.get('tab');
    const storyIdParam = searchParams?.get('storyId');
    const searchParam = searchParams?.get('search');

    // State
    const [searchQuery, setSearchQuery] = useState(searchParam || '');
    const [viewMode, setViewMode] = useState<ViewMode>(tabParam === 'groups' ? 'groups' : 'all');
    const [feedType, setFeedType] = useState<FeedType>('forYou');
    
    // Group Creation State
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [creating, setCreating] = useState(false);

    // People Search State
    const [peopleResults, setPeopleResults] = useState<FriendType[]>([]);
    const [isSearchingPeople, setIsSearchingPeople] = useState(false);

    // Derived Data
    const friendIds = useMemo(() => new Set((friends || []).map(f => f.id)), [friends]);
    const userGroupIds = useMemo(() => new Set((groups || []).map(g => g.id)), [groups]);

    // Update view mode when URL param changes
    useEffect(() => {
        if (tabParam === 'groups') {
            setViewMode('groups');
        }
    }, [tabParam]);

    // Ranking Helpers
    const getForYouScore = useCallback((story: typeof stories[0]) => {
        let score = 0;
        // Friend bonus
        story.participants.forEach(p => {
            if (friendIds.has(p.id)) score += 50;
        });
        // Group bonus
        if (story.groupId && userGroupIds.has(story.groupId)) score += 30;
        // Interest matching bonus
        const userInterests = currentUser?.preferences?.interests || [];
        if (userInterests.length > 0 && story.hashtags) {
            const matchingInterests = story.hashtags.filter(tag => 
                userInterests.some((interest: string) => tag.toLowerCase().includes(interest.toLowerCase()))
            );
            score += matchingInterests.length * 25; // 25 points per matching interest
        }
        // Engagement
        score += (story.likes || 0) * 2;
        score += (story.comments?.length || 0) * 3;
        score += (story.participants?.length || 0) * 1.5;
        // Recency
        const createdAt = story.created_at ? new Date(story.created_at).getTime() : Date.now();
        const ageHours = (Date.now() - createdAt) / 3600000;
        const recencyMultiplier = Math.max(0.3, 1 - (ageHours / 168));
        return score * recencyMultiplier;
    }, [friendIds, userGroupIds, currentUser?.preferences?.interests]);

    const getTrendingScore = useCallback((story: typeof stories[0]) => {
        const likes = story.likes || 0;
        const comments = story.comments?.length || 0;
        const participants = story.participants?.length || 0;
        const engagementScore = likes + (comments * 2) + (participants * 1.5);
        // Time decay
        const createdAt = story.created_at ? new Date(story.created_at).getTime() : Date.now();
        const ageHours = (Date.now() - createdAt) / 3600000;
        const decay = Math.pow(0.5, ageHours / 24);
        return engagementScore * (1 + decay);
    }, []);

    // Filter Stories
    const publicStories = useMemo(() => actions.getPublicStories(stories), [stories]);

    const filteredStories = useMemo(() => {
        // 1. Filter by search query
        let filtered = publicStories.filter(story => {
            if (!searchQuery.trim()) return true;
            const query = searchQuery.toLowerCase();
            
            if (story.title.toLowerCase().includes(query)) return true;
            if (story.description.toLowerCase().includes(query)) return true;
            if (story.hashtags?.some(tag => tag.toLowerCase().includes(query))) return true;
            
            const participantMatches = story.participants.some(p => {
                const allowed = !p.isPrivate || (currentUser && (p.id === currentUser.id || friendIds.has(p.id)));
                const notBlocked = !blockedUserIds.includes(p.id);
                return allowed && notBlocked && p.name.toLowerCase().includes(query);
            });
            if (participantMatches) return true;

            if (story.groupId) {
                const group = groups.find(g => g.id === story.groupId);
                if (group && group.name.toLowerCase().includes(query)) return true;
            }
            return false;
        });

        // 2. Sort/Filter based on feedType
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
                const friendStories = filtered.filter(story =>
                    story.participants.some(p => friendIds.has(p.id))
                );
                return [...friendStories].sort((a, b) => {
                    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return dateB - dateA;
                });
            case 'seeds':
                if (!currentUser) return [];
                return rankStories(
                    filtered,
                    currentUser,
                    { variant: 'seed', diversityMode: true, limit: 100 },
                    friends || []
                ).map(r => r.story);
            case 'canon':
                if (!currentUser) return [];
                return rankStories(
                    filtered,
                    currentUser,
                    { variant: 'canon', diversityMode: true, limit: 100 },
                    friends || []
                ).map(r => r.story);
            default:
                return filtered;
        }
    }, [publicStories, searchQuery, feedType, getForYouScore, getTrendingScore, currentUser, friendIds, groups, blockedUserIds, friends]);

    // Derived Lists
    const trendingStories = useMemo(() => 
        [...publicStories]
            .sort((a, b) => getTrendingScore(b) - getTrendingScore(a))
            .slice(0, 6)
    , [publicStories, getTrendingScore]);

    const groupStories = useMemo(() => 
        filteredStories.filter(story => story.groupId)
    , [filteredStories]);

    const selectedStoryIndex = useMemo(() => {
        if (!storyIdParam) return null;
        const idx = filteredStories.findIndex(s => s.id === storyIdParam);
        return idx !== -1 ? idx : null;
    }, [storyIdParam, filteredStories]);

    // Actions
    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim() || !currentUser) return;

        setCreating(true);
        try {
            const { data: groupData, error: groupError } = await supabase
                .from('groups')
                .insert({
                    name: newGroupName,
                    description: newGroupDesc,
                    avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${newGroupName}`,
                    is_private: isPrivate,
                    owner_id: currentUser.id,
                    member_count: 1
                })
                .select()
                .single();

            if (groupError) throw groupError;

            const { error: memberError } = await supabase
                .from('group_members')
                .insert({
                    group_id: groupData.id,
                    user_id: currentUser.id,
                    role: 'admin'
                });

            if (memberError) throw memberError;

            const newGroup: Group = {
                id: groupData.id,
                name: groupData.name,
                description: groupData.description || '',
                avatar: groupData.avatar || '',
                memberCount: 1,
                isPrivate: groupData.is_private,
                isMember: true,
                ownerIsVerified: currentUser.isVerified || currentUser.isBrand,
                ownerVerificationTier: currentUser.verificationTier || (currentUser.isBrand ? 'gold' : null)
            };
            addGroup(newGroup);

            setShowCreateGroup(false);
            setNewGroupName('');
            setNewGroupDesc('');
            setIsPrivate(false);
            
            // Redirect to the new group
            router.push(`/groups/${groupData.id}`);
        } catch (error) {
            console.error('Error creating group:', error);
        } finally {
            setCreating(false);
        }
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

    const openStoryInOverlay = useCallback((storyId: string) => {
        const idx = filteredStories.findIndex(s => s.id === storyId);
        if (idx !== -1) {
            const newParams = new URLSearchParams(searchParams?.toString());
            newParams.set('storyId', storyId);
            router.push(`/discover?${newParams.toString()}`, { scroll: false });
        } else {
            window.location.href = `/story/${storyId}`;
        }
    }, [filteredStories, router, searchParams]);

    // Side Effects
    // Search People
    useEffect(() => {
        let mounted = true;
        const timeout = setTimeout(async () => {
            const q = searchQuery.trim();
            if (viewMode !== 'people' && !q) return; // Optimization

            setIsSearchingPeople(true);
            try {
                const uid = currentUser?.id ?? '';
                let results: FriendType[] = [];

                if (!q || q.length < 2) {
                    results = await fetchPublicUsers(uid);
                } else {
                    results = await searchUsers(q, uid);
                    if (!results || results.length === 0) {
                        results = await fetchPublicUsers(uid);
                    }
                }

                if (mounted) {
                    const filteredResults = results.filter(user => !blockedUserIds.includes(user.id));
                    setPeopleResults(filteredResults);
                }
            } catch (err) {
                console.warn('[Discover] searchUsers failed', err);
                if (mounted) setPeopleResults([]);
            } finally {
                if (mounted) setIsSearchingPeople(false);
            }
        }, 300);
        return () => { mounted = false; clearTimeout(timeout); };
    }, [searchQuery, viewMode, currentUser, blockedUserIds]);

    // Restore story position
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const returnToStoryId = sessionStorage.getItem('weeve_return_to_story');
        if (returnToStoryId && filteredStories.length > 0) {
            sessionStorage.removeItem('weeve_return_to_story');
            const idx = filteredStories.findIndex(s => s.id === returnToStoryId);
            if (idx !== -1) {
                setTimeout(() => {
                    const newParams = new URLSearchParams(searchParams?.toString());
                    newParams.set('storyId', returnToStoryId);
                    router.replace(`/discover?${newParams.toString()}`, { scroll: false });
                }, 100);
            }
        }
    }, [filteredStories, router, searchParams]);

    return {
        // State
        searchQuery, setSearchQuery,
        viewMode, setViewMode,
        feedType, setFeedType,
        showCreateGroup, setShowCreateGroup,
        newGroupName, setNewGroupName,
        newGroupDesc, setNewGroupDesc,
        isPrivate, setIsPrivate,
        creating,
        peopleResults,
        isSearchingPeople,
        
        // Data
        currentUser,
        groups,
        userGroupIds,
        stories,
        filteredStories,
        trendingStories,
        groupStories,
        selectedStoryIndex,
        friendIds,

        // Actions
        handleCreateGroup,
        handleSendFriendRequest,
        openStoryInOverlay,
        router,
        searchParams,
    };
}

// Helpers
