import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore, Group, Story } from "@/lib/store";
import { rankStories } from '@/lib/discovery/core';
import { searchUsers, fetchPublicUsers, sendFriendRequest, Friend as FriendType } from '@/lib/friends';
import { supabase } from '@/lib/supabase';

export type ViewMode = 'all' | 'open' | 'groups' | 'people';
export type FeedType = 'forYou' | 'trending' | 'new' | 'friends' | 'seeds' | 'canon';


// Helpers
const actions = {
    getPublicStories: (stories: Story[]) => {
        return stories.filter(story => {
            if (story.visibility !== 'public') return false;
            // Must have at least one contribution (completed content)
            if (!story.contributions || story.contributions.length === 0) return false;

            // Hide stories where the creator has assigned slots to themselves but hasn't filled them yet
            // These should NOT appear in the public feed yet (even for the creator)
            // Check 1: Creator has explicit 'waiting' status on any participant entry
            const creatorHasWaitingSlot = story.participants.some(p => p.id === story.creatorId && p.status === 'waiting');
            // Check 2: Creator has more participant entries (slots) than contributions
            const creatorParticipantCount = story.participants.filter(p => p.id === story.creatorId).length;
            const creatorContributionCount = story.contributions.filter(c => c.userId === story.creatorId).length;
            const creatorHasUnfilledSlots = creatorParticipantCount > creatorContributionCount;
            // Check 3: It's currently the creator's turn to post (story is active and waiting for creator)
            // NOTE: Skip this check for 'open' mode stories - currentTurnUserId doesn't mean much there
            // since anyone can contribute. We only rely on checks 1 & 2 for open mode.
            const isCreatorsTurn = story.mode !== 'open' && story.status !== 'completed' && story.currentTurnUserId === story.creatorId;
            
            if (creatorHasWaitingSlot || creatorHasUnfilledSlots || isCreatorsTurn) {
                return false;
            }

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
    const { stories, groups, addGroup, currentUser, friends, blockedUserIds, fetchDiscoveryStories } = useStore();
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

    // Group Stories State (fetched separately since they may be private visibility)
    const [groupStoriesData, setGroupStoriesData] = useState<Story[]>([]);

    // Derived Data
    const friendIds = useMemo(() => new Set((friends || []).map(f => f.id)), [friends]);
    const userGroupIds = useMemo(() => new Set((groups || []).map(g => g.id)), [groups]);

    // Update view mode when URL param changes
    useEffect(() => {
        if (tabParam === 'groups') {
            setViewMode('groups');
        }
    }, [tabParam]);

    // Initial optimized fetch for Discovery page
    useEffect(() => {
        fetchDiscoveryStories();
    }, [fetchDiscoveryStories]);

    // Fetch stories from user's groups (separate from discovery since group stories may have private visibility)
    useEffect(() => {
        const fetchGroupStories = async () => {
            if (!currentUser || groups.length === 0) {
                setGroupStoriesData([]);
                return;
            }

            try {
                const groupIds = groups.map(g => g.id);
                
                const { data: storiesData, error } = await supabase
                    .from('stories')
                    .select(`
                        id, title, description, creator_id, visibility, mode, status,
                        max_weeves, cover_image, hashtags, created_at, updated_at,
                        forked_from_story_id, post_type, group_id, current_turn_user_id,
                        groups (name, avatar, is_private),
                        contributions (id, user_id, user_name, content, media_type, media_url, timestamp, text_style),
                        story_participants (user_id, status, position, profiles:user_id (id, name, avatar, is_influencer, is_private)),
                        story_likes (user_id)
                    `)
                    .in('group_id', groupIds)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (error) {
                    console.error('[useDiscoverLogic] Error fetching group stories:', error);
                    return;
                }

                if (!storiesData) return;

                const formattedStories: Story[] = storiesData
                    .filter((s: any) => {
                        // Must have contributions
                        if (!s.contributions || s.contributions.length === 0) return false;
                        // Filter blocked users
                        if (blockedUserIds.includes(s.creator_id)) return false;
                        return true;
                    })
                    .map((s: any) => {
                        const participants = (s.story_participants || []).map((sp: any) => {
                            const profile = sp.profiles || { name: 'Unknown', avatar: '' };
                            return {
                                id: sp.user_id,
                                name: profile.name,
                                avatar: profile.avatar,
                                tokens: 0,
                                isInfluencer: profile.is_influencer,
                                isPrivate: profile.is_private === true,
                                status: sp.status,
                                position: sp.position
                            };
                        }).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));

                        const contributions = (s.contributions || [])
                            .sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0))
                            .map((c: any) => ({
                                id: c.id,
                                userId: c.user_id,
                                userName: c.user_name,
                                content: c.content,
                                mediaType: c.media_type,
                                mediaUrl: c.media_url?.trim() || undefined,
                                timestamp: c.timestamp,
                                textStyle: c.text_style
                            }));

                        const likedBy = (s.story_likes || []).map((l: any) => l.user_id);

                        return {
                            id: s.id,
                            title: s.title,
                            description: s.description,
                            creatorId: s.creator_id,
                            visibility: s.visibility,
                            mode: s.mode ?? 'invite',
                            status: s.status,
                            currentTurnUserId: s.current_turn_user_id,
                            contributions,
                            participants,
                            maxWeeves: s.max_weeves,
                            coverImage: s.cover_image,
                            groupId: s.group_id,
                            groupName: s.groups?.name,
                            groupAvatar: s.groups?.avatar,
                            groupIsPrivate: s.groups?.is_private,
                            likes: likedBy.length,
                            likedBy,
                            comments: [],
                            created_at: s.created_at,
                            updated_at: s.updated_at,
                            hashtags: s.hashtags,
                            forkedFromStoryId: s.forked_from_story_id ?? undefined,
                            postType: s.post_type ?? 'normal'
                        } as Story;
                    });

                setGroupStoriesData(formattedStories);
            } catch (err) {
                console.error('[useDiscoverLogic] Failed to fetch group stories:', err);
            }
        };

        fetchGroupStories();
    }, [currentUser, groups, blockedUserIds]);

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

    const getInterestScore = useCallback((story: typeof stories[0]) => {
        let score = 0;
        const userInterests = currentUser?.preferences?.interests || [];
        
        // Base score for being an open story
        score += 100;

        // Heavy weighting for interest matches
        if (userInterests.length > 0 && story.hashtags) {
            const matchingInterests = story.hashtags.filter(tag => 
                userInterests.some((interest: string) => tag.toLowerCase().includes(interest.toLowerCase()))
            );
            // 50 points per matching interest (higher than regular feed)
            score += matchingInterests.length * 50; 
        }

        // Slight bonus for recent activity to keep it fresh
        const createdAt = story.created_at ? new Date(story.created_at).getTime() : Date.now();
        const ageHours = (Date.now() - createdAt) / 3600000;
        const recencyMultiplier = Math.max(0.7, 1 - (ageHours / (24 * 7))); // Slower decay for open stories (1 week)
        
        return score * recencyMultiplier;
    }, [currentUser?.preferences?.interests]);

    // Filter Stories
    const publicStories = useMemo(() => actions.getPublicStories(stories), [stories]);

    const openStories = useMemo(() => {
        return publicStories.filter(story => {
             // Basic check: must be open mode
            if (story.mode !== 'open') return false;
            
            // Should verify it's not completed? Usually open stories are ongoing.
            // But if it's 'completed' it might not be relevant for "Open" tab unless we want to show examples.
            // Let's hide completed ones from "Open" tab so users only see actionable ones.
            if (story.status === 'completed') return false;

            return true;
        }).sort((a, b) => getInterestScore(b) - getInterestScore(a));
    }, [publicStories, getInterestScore]);

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

    // Group stories come from separate fetch (not filtered by public visibility)
    // Apply search filter if user is searching
    const groupStories = useMemo(() => {
        if (!searchQuery.trim()) return groupStoriesData;
        const query = searchQuery.toLowerCase();
        return groupStoriesData.filter(story => {
            if (story.title.toLowerCase().includes(query)) return true;
            if (story.description.toLowerCase().includes(query)) return true;
            if (story.hashtags?.some(tag => tag.toLowerCase().includes(query))) return true;
            if (story.groupName?.toLowerCase().includes(query)) return true;
            return false;
        });
    }, [groupStoriesData, searchQuery]);

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
        openStories,
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
