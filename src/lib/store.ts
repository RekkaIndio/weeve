import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase';
import { getFriends } from './friends';

export const STORY_SELECT_QUERY = `
    *,
    groups (
        name,
        avatar,
        is_private
    ),
    contributions (*),
    story_participants (
        *,
        profiles:user_id (id, name, avatar, is_influencer, is_private, is_brand)
    ),
    story_likes (user_id),
    story_comments (
        *,
        profiles:user_id (name, avatar),
        comment_likes (user_id)
    ),
    forks:stories!forked_from_story_id(count)
`;

export interface User {
    id: string;
    name: string;
    avatar?: string;
    tagline?: string;
    tokens: number;
    isInfluencer?: boolean;
    interactionCost?: number; // Cost to interact with this user (in tokens)
    inviteCode?: string;
    isPrivate?: boolean;
    isVerified?: boolean;
    verificationTier?: 'bronze' | 'silver' | 'gold' | null;
    verifiedAt?: string;
    lastNameChangeAt?: string;
    status?: 'accepted' | 'waiting' | 'declined'; // For story participants
    position?: number; // Slot position in the story
    website?: string;
    createdAt?: string;
    preferences?: {
        website?: string;
        [key: string]: any;
    };
    // Community multi-tenancy
    communityId?: string;
    // Brand account fields
    isBrand?: boolean;
    brandWebsite?: string;
    brandVerified?: boolean;
    brandSubscriptionStatus?: 'none' | 'active' | 'expired';
    completedOnboarding?: boolean;
    onboardingStep?: number;
    // Collaboration fields
    collabEnabled?: boolean;
    collabPriceCents?: number; // Price in cents (e.g., 500 = $5.00)
    tags?: string[]; // Profile tags like "OG", "Beta Tester", etc.
}

export interface Group {
    id: string;
    name: string;
    description: string;
    avatar: string;
    memberCount: number;
    isPrivate: boolean;
    isMember?: boolean;
    storyCount?: number;
    ownerIsVerified?: boolean;
    ownerVerificationTier?: 'bronze' | 'silver' | 'gold' | null;
    createdAt?: string;
}

export type MediaType = 'video' | 'image' | 'text' | 'drawing' | 'audio';

export interface TextElement {
    id: string;
    content: string;
    style: TextStyle;
    position: { left: number; top: number; unit?: 'px' | '%' };
}

export interface TextStyle {
    fontFamily: string;
    fontSize: number;
    textColor: string;
    backgroundColor: string;
    textAlign: 'left' | 'center' | 'right';
    elements?: TextElement[];
}

export interface Contribution {
    id: string;
    userId: string;
    userName: string;
    content: string; // Caption or text content
    mediaType: MediaType;
    mediaUrl?: string; // URL for video or image
    timestamp: number;
    textStyle?: TextStyle;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    reviewedAt?: string;
    reviewedBy?: string;
    slotIndex?: number;
    mediaSource?: 'camera' | 'gallery';
}

export interface StoryComment {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    content: string;
    timestamp: number;
    parentCommentId?: string | null;
    likes: number;
    likedBy: string[];
}

export interface Story {
    id: string;
    title: string;
    description: string;
    creatorId: string;
    visibility: 'public' | 'private';
    mode: 'invite' | 'open';
    status: 'active' | 'completed';
    currentTurnUserId?: string;
    contributions: Contribution[];
    participants: User[];
    maxWeeves?: number;
    coverImage?: string; // Thumbnail for the story
    theme?: string; // Visual theme for the story
    groupId?: string;
    groupName?: string;
    groupAvatar?: string;
    groupIsPrivate?: boolean;
    hashtags?: string[];
    likes: number;
    likedBy: string[];
    comments: StoryComment[];
    allowComments?: boolean;
    allowReuse?: boolean;
    turnTimerHours?: number;
    monetizationCost?: number;
    forkedFromStoryId?: string; // Reference to original story if this is a fork
    created_at?: string;
    updated_at?: string;
    // Brand post fields
    postType?: 'normal' | 'canon' | 'seed';
    canonSlots?: number[]; // Array of immutable slot indices (0-indexed)
    brandId?: string; // Brand account ID if this is a brand post
    isFeatured?: boolean;
    scheduledFor?: string;
    visibilityDays?: number;
    forksCount?: number;
    // Approval status (for Canon posts - entire story approval)
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    reviewedAt?: string;
    reviewedBy?: string;
    // Product link for brand posts
    productUrl?: string;
    // Collaboration fields
    isCollab?: boolean;
    collabStatus?: 'pending' | 'accepted' | 'declined';
    collabInitiatorId?: string;
    collabTargetId?: string;
    collabPriceCents?: number; // Price paid for this collab (in cents)
    communityId?: string;
}

/**
 * Check if a specific slot in a story is immutable.
 * - Seed posts: slot 0 is always immutable
 * - Canon posts: slots in canonSlots array are immutable
 */
export function isSlotImmutable(story: Story, slotIndex: number): boolean {
    if (story.postType === 'seed' && slotIndex === 0) return true;
    if (story.postType === 'canon' && story.canonSlots?.includes(slotIndex)) return true;
    return false;
}

/**
 * Check if a story is a brand post (Canon or Seed mode).
 * Brand posts can only be stitched into, not weeved/forked.
 */
export function isBrandPost(story: Story): boolean {
    return story.postType === 'canon' || story.postType === 'seed';
}

/**
 * Get slot progress for a brand post.
 * Returns the number of filled slots vs total slots needed.
 */
export interface SlotProgress {
    filled: number;
    total: number;
    percentage: number;
    isComplete: boolean;
}

export function getSlotProgress(story: Story): SlotProgress | null {
    if (!isBrandPost(story)) {
        return null;
    }

    const totalSlots = story.maxWeeves || 0;
    
    // For brand posts, count approved contributions
    const filledSlots = story.contributions.filter(
        c => c.approvalStatus === 'approved' || !c.approvalStatus
    ).length;

    const percentage = totalSlots > 0 ? (filledSlots / totalSlots) * 100 : 0;
    const isComplete = filledSlots >= totalSlots;

    return {
        filled: filledSlots,
        total: totalSlots,
        percentage,
        isComplete
    };
}

/**
 * Check if a brand post needs contributors (has unfilled slots).
 */
export function needsContributors(story: Story): boolean {
    const progress = getSlotProgress(story);
    return progress !== null && !progress.isComplete;
}


interface AppState {
    currentUser: User | null;
    stories: Story[];
    activeWeeveId: string | null;
    friends: User[];
    groups: Group[];
    profileUpdateInProgress: boolean;
    isStoriesLoading: boolean;
    hasMoreStories: boolean;
    storiesPage: number;

    addStory: (story: Story) => void;
    addContribution: (storyId: string, contribution: Contribution | {
        id?: string;
        userId?: string;
        userName?: string;
        content: string;
        mediaType: MediaType;
        mediaUrl?: string;
        textStyle?: TextStyle;
        timestamp?: number;
    }, options?: { nextTurnUserId?: string | null }) => void;
    updateStory: (id: string, updates: Partial<Story>) => void;
    removeStory: (id: string) => void;
    setActiveWeeve: (id: string | null) => void;
    addGroup: (group: Group) => void;
    addTokens: (amount: number) => void;
    deductTokens: (amount: number, recipientId?: string) => boolean;
    setCurrentUser: (user: User | null) => void;
    setStories: (stories: Story[]) => void;
    setGroups: (groups: Group[]) => void;
    toggleStoryLike: (storyId: string) => Promise<void>;
    toggleCommentLike: (storyId: string, commentId: string) => Promise<void>;
    addStoryComment: (storyId: string, content: string, parentCommentId?: string) => Promise<void>;
    deleteStoryComment: (storyId: string, commentId: string) => Promise<void>;
    logoutUser: () => void;
    fetchFriends: () => Promise<void>;
    forkStory: (originalStoryId: string, slotToUserAssignments: Map<number, string>, contributionIdsToExclude?: string[], customTitle?: string, customDescription?: string) => Promise<{ success: boolean; storyId?: string; error?: string }>;
    forkBrandPost: (originalStoryId: string) => Promise<{ success: boolean; storyId?: string; error?: string }>;
    fetchStories: (reset?: boolean, recursionDepth?: number) => Promise<void>;
    fetchUserStories: (userId: string) => Promise<void>;
    fetchDiscoveryStories: (reset?: boolean) => Promise<void>;
    fetchMoreStories: () => Promise<void>;
    setProfileUpdateInProgress: (value: boolean) => void;

    // Saved Stories
    savedStoryIds: string[];
    toggleStorySave: (storyId: string) => Promise<void>;
    fetchSavedStories: () => Promise<void>;

    // Reported Stories (Local Only)
    reportedStoryIds: string[];
    reportStory: (storyId: string, reason: string) => Promise<void>;
    fetchReportedStories: () => Promise<void>;

    // Blocked Users
    blockedUserIds: string[];
    fetchBlockedUsers: () => Promise<void>;
}

export const useStore = create<AppState>()(
    // @ts-ignore
    persist(
        (set, get) => ({
            currentUser: null,
            stories: [],
            activeWeeveId: null,
            friends: [],
            groups: [],
            profileUpdateInProgress: false,
            isStoriesLoading: false,
            hasMoreStories: true,
            storiesPage: 0,
            savedStoryIds: [],
            reportedStoryIds: [],
            blockedUserIds: [],

            reportStory: async (storyId, reason) => {
                const { currentUser, reportedStoryIds, stories } = get();
                if (!currentUser) return;
                if (reportedStoryIds.includes(storyId)) return; // Already reported

                // Optimistic update
                set((state) => ({ reportedStoryIds: [...state.reportedStoryIds, storyId] }));

                try {
                    const { error } = await supabase
                        .from('story_reports')
                        .insert({
                            story_id: storyId,
                            reporter_id: currentUser.id,
                            reason: reason
                        });

                    if (error) {
                        console.error('[Store] Failed to report story:', error);
                        // Revert on error
                        set((state) => ({
                            reportedStoryIds: state.reportedStoryIds.filter(id => id !== storyId)
                        }));
                        return;
                    }

                    // Notify developer (Apple Guideline 1.2 compliance)
                    const storyTitle = stories.find(s => s.id === storyId)?.title || 'Unknown Story';
                    try {
                        await fetch('/api/support/email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userName: currentUser.name,
                                userId: currentUser.id,
                                category: 'Content Report',
                                subject: `Story Reported: ${reason}`,
                                description: `Story ID: ${storyId}\nStory Title: ${storyTitle}\nReason: ${reason}\nReporter: ${currentUser.name} (${currentUser.id})`
                            })
                        });
                    } catch (emailErr) {
                        console.warn('[Store] Failed to send report notification email:', emailErr);
                        // Don't revert - report was still saved
                    }
                } catch (err) {
                    console.error('[Store] Error reporting story:', err);
                    // Revert on error
                    set((state) => ({
                        reportedStoryIds: state.reportedStoryIds.filter(id => id !== storyId)
                    }));
                }
            },

            fetchReportedStories: async () => {
                const { currentUser } = get();
                if (!currentUser) return;

                try {
                    const { data, error } = await supabase
                        .from('story_reports')
                        .select('story_id')
                        .eq('reporter_id', currentUser.id);

                    if (error) {
                        console.error('[Store] Failed to fetch reported stories:', error);
                        return;
                    }

                    if (data) {
                        set({ reportedStoryIds: data.map((item: { story_id: string }) => item.story_id) });
                    }
                } catch (err) {
                    console.error('[Store] Error fetching reported stories:', err);
                }
            },

            fetchBlockedUsers: async () => {
                const { currentUser } = get();
                if (!currentUser) return;
                
                try {
                    // Import helper dynamically to avoid circular dependency issues if any
                    // But actually we can just use the supabase client directly here for simplicity
                    // or import the helper. Let's use the helper we created.
                    const { getBlockedUserIds, getBlockedByUserIds } = await import('./blocked');
                    
                    // Get people I blocked
                    const iBlocked = await getBlockedUserIds(currentUser.id);
                    
                    // Get people who blocked me (so I don't see their stuff either)
                    const blockedMe = await getBlockedByUserIds(currentUser.id);
                    
                    // Combine unique IDs
                    const allBlockedIds = Array.from(new Set([...iBlocked, ...blockedMe]));
                    
                    set({ blockedUserIds: allBlockedIds });
                } catch (err) {
                    console.error('[Store] Failed to fetch blocked users:', err);
                }
            },


            fetchSavedStories: async () => {
                const { currentUser } = get();
                if (!currentUser) return;

                const { data, error } = await supabase
                    .from('story_saves')
                    .select('story_id')
                    .eq('user_id', currentUser.id);

                if (error) {
                    console.error('Failed to fetch saved stories:', error);
                    return;
                }

                set({ savedStoryIds: data.map((item: { story_id: string }) => item.story_id) });
            },

            toggleStorySave: async (storyId) => {
                const { currentUser, savedStoryIds } = get();
                if (!currentUser) return;

                const isSaved = savedStoryIds.includes(storyId);
                const newSavedStoryIds = isSaved
                    ? savedStoryIds.filter(id => id !== storyId)
                    : [...savedStoryIds, storyId];

                // Optimistic update
                set({ savedStoryIds: newSavedStoryIds });

                if (isSaved) {
                    const { error } = await supabase
                        .from('story_saves')
                        .delete()
                        .match({ story_id: storyId, user_id: currentUser.id });

                    if (error) {
                        console.error('Failed to unsave story:', error);
                        // Revert on error
                        set({ savedStoryIds: savedStoryIds });
                    }
                } else {
                    const { error } = await supabase
                        .from('story_saves')
                        .insert({ story_id: storyId, user_id: currentUser.id });

                    if (error) {
                        console.error('Failed to save story:', error);
                        // Revert on error
                        set({ savedStoryIds: savedStoryIds });
                    }
                }
            },


            addStory: (story) =>
                set((state) => {
                    const existingIndex = state.stories.findIndex((s) => s.id === story.id);
                    if (existingIndex !== -1) {
                        // Merge: prefer new story data but preserve comments if the new story has fewer
                        const existing = state.stories[existingIndex];
                        const mergedComments = story.comments.length >= existing.comments.length
                            ? story.comments
                            : existing.comments;
                        const mergedStory = { ...story, comments: mergedComments };
                        const updatedStories = [...state.stories];
                        updatedStories[existingIndex] = mergedStory;
                        return { stories: updatedStories };
                    }
                    // New story - prepend as before
                    return { stories: [story, ...state.stories] };
                }),

            addGroup: (group) =>
                set((state) => ({ groups: [group, ...state.groups] })),

            addContribution: (storyId, contribution, options) =>
                set((state) => {
                    const storyIndex = state.stories.findIndex((s) => s.id === storyId);
                    if (storyIndex === -1) return state;

                    const currentStory = state.stories[storyIndex];
                    const maxWeeves = typeof currentStory.maxWeeves === 'number' ? currentStory.maxWeeves : null;

                    if (maxWeeves !== null && currentStory.contributions.length >= maxWeeves) {
                        return state;
                    }

                    const suppliedUserId = 'userId' in contribution ? contribution.userId : undefined;
                    const suppliedUserName = 'userName' in contribution ? contribution.userName : undefined;
                    const suppliedId = 'id' in contribution ? contribution.id : undefined;
                    const suppliedTimestamp = 'timestamp' in contribution ? contribution.timestamp : undefined;

                    const fallbackUserId = suppliedUserId ?? (state.currentUser ? state.currentUser.id : undefined);

                    if (!fallbackUserId) {
                        return state;
                    }

                    const fallbackUserName = suppliedUserName ?? (state.currentUser ? state.currentUser.name : 'Unknown User');

                    const timestamp = suppliedTimestamp ?? Date.now();

                    const newContribution: Contribution = {
                        id: suppliedId ?? Math.random().toString(36).substr(2, 9),
                        userId: fallbackUserId,
                        userName: fallbackUserName,
                        content: contribution.content,
                        mediaType: contribution.mediaType,
                        mediaUrl: contribution.mediaUrl,
                        timestamp,
                        textStyle: contribution.textStyle,
                    };

                    const updatedContributions = [...currentStory.contributions, newContribution];
                    const reachedCapacity = maxWeeves !== null && updatedContributions.length >= maxWeeves;

                    // Send completion notification if story just reached capacity
                    if (reachedCapacity && currentStory.status !== 'completed') {
                        import('./notifications').then(({ notifyStoryCompleted }) => {
                            const participantIds = currentStory.participants.map(p => p.id);
                            notifyStoryCompleted(currentStory.id, currentStory.title, participantIds).catch(err => {
                                console.error('Failed to send completion notification:', err);
                            });
                        }).catch(err => console.error('Failed to import notifications:', err));
                        // Refresh stories from server so completed story appears in the main tab
                        setTimeout(() => {
                            try { get().fetchStories(); } catch (err) { console.warn('[Store] fetchStories failed after completion', err); }
                        }, 1000);
                    }

                    const nextTurnUserId = (() => {
                        if (options && Object.prototype.hasOwnProperty.call(options, 'nextTurnUserId')) {
                            return options.nextTurnUserId ?? undefined;
                        }
                        if (reachedCapacity) {
                            return undefined;
                        }
                        const participants = currentStory.participants;
                        const currentIndex = participants.findIndex((p) => p.id === fallbackUserId);
                        if (currentIndex === -1 || participants.length === 0) return currentStory.currentTurnUserId;
                        const nextIndex = (currentIndex + 1) % participants.length;
                        return participants[nextIndex]?.id ?? currentStory.currentTurnUserId;
                    })();

                    const updatedStories = state.stories.map((story, index) => {
                        if (index !== storyIndex) {
                            return story;
                        }

                        // Update participant status for the contributor to 'accepted'
                        const updatedParticipants = story.participants.map(p => {
                            if (p.id === fallbackUserId && p.status === 'waiting') {
                                return { ...p, status: 'accepted' as 'accepted' }; 
                            }
                            return p;
                        });

                        // If we reached capacity, mark story completed and accept all participants,
                        // and make it public so it moves out of the waiting tab in profile view.
                        let visibilityUpdate = story.visibility;
                        let finalParticipants = updatedParticipants;
                        if (reachedCapacity) {
                            finalParticipants = updatedParticipants.map(p => ({ ...p, status: 'accepted' as 'accepted' }));
                            visibilityUpdate = 'public';
                        }

                        return {
                            ...story,
                            contributions: updatedContributions,
                            currentTurnUserId: nextTurnUserId,
                            status: reachedCapacity ? 'completed' : story.status,
                            participants: finalParticipants,
                            visibility: visibilityUpdate,
                        };
                    });

                    return { stories: updatedStories };
                }),

            updateStory: (id, updates) =>
                set((state) => ({
                    stories: state.stories.map((s) =>
                        s.id === id ? { ...s, ...updates } : s
                    ),
                })),

            removeStory: (id) =>
                set((state) => {
                    console.log('[Store] removeStory called for:', id);
                    console.log('[Store] Previous story count:', state.stories.length);
                    const updated = state.stories.filter((s) => s.id !== id);
                    console.log('[Store] New story count:', updated.length);
                    return { stories: updated };
                }),

            setActiveWeeve: (id) => set({ activeWeeveId: id }),

            addTokens: (amount) =>
                set((state) => {
                    if (!state.currentUser) return state;
                    return {
                        currentUser: {
                            ...state.currentUser,
                            tokens: state.currentUser.tokens + amount,
                        },
                    };
                }),

            deductTokens: (amount, recipientId) => {
                const state = get();
                if (state.currentUser && state.currentUser.tokens >= amount) {
                    const originalTokens = state.currentUser.tokens;
                    
                    // Optimistic update
                    set((state) => ({
                        currentUser: state.currentUser ? {
                            ...state.currentUser,
                            tokens: state.currentUser.tokens - amount,
                        } : null,
                    }));

                    // Persist to backend using Transactional RPCs
                    (async () => {
                        try {
                            let rpcError;
                            
                            if (recipientId) {
                                // Transfer to another user (P2P)
                                const { error } = await supabase.rpc('transfer_tokens', {
                                    p_from_user_id: state.currentUser!.id,
                                    p_to_user_id: recipientId,
                                    p_token_amount: amount
                                });
                                rpcError = error;
                            } else {
                                // Burn / Platform Fee
                                const { error } = await supabase.rpc('deduct_tokens', {
                                    p_user_id: state.currentUser!.id,
                                    p_token_amount: amount,
                                    p_description: 'Feature usage / Burn'
                                });
                                rpcError = error;
                            }

                            if (rpcError) {
                                console.error('Token transaction failed:', rpcError);
                                throw rpcError;
                            }
                        } catch (err) {
                            console.error('Failed to process token transaction:', err);
                            // Revert on error
                            set((state) => ({
                                currentUser: state.currentUser ? {
                                    ...state.currentUser,
                                    tokens: originalTokens,
                                } : null,
                            }));
                            
                            // Optional: Show toast error to user
                            // console.error('Transaction failed');
                        }
                    })();

                    return true;
                }
                return false;
            },

            setCurrentUser: (user) => {

                set({ currentUser: user });
            },

            setProfileUpdateInProgress: (value) => set({ profileUpdateInProgress: value }),

            setStories: (stories) => set({ stories }),

            setGroups: (groups) => set({ groups }),

            toggleStoryLike: async (storyId) => {
                const { currentUser } = get();
                if (!currentUser) return;

                const state = get();
                const story = state.stories.find((s) => s.id === storyId);
                if (!story) return;

                const alreadyLiked = story.likedBy.includes(currentUser.id);

                if (alreadyLiked) {
                    const { error } = await supabase
                        .from('story_likes')
                        .delete()
                        .match({ story_id: storyId, user_id: currentUser.id });

                    if (error) {
                        console.error('Failed to remove like:', error);
                        return;
                    }
                } else {
                    const { error } = await supabase
                        .from('story_likes')
                        .insert({ story_id: storyId, user_id: currentUser.id });

                    if (error) {
                        console.error('Failed to add like:', error);
                        return;
                    }

                    // Send like notification to story creator
                    if (story.creatorId !== currentUser.id) {
                        import('./notifications').then(({ notifyStoryLike }) => {
                            notifyStoryLike(storyId, story.title, story.creatorId, currentUser.name).catch(err => {
                                console.error('Failed to send like notification:', err);
                            });
                        }).catch(err => console.error('Failed to import notifications:', err));
                    }
                }

                const shouldLike = !alreadyLiked;

                set((state) => {
                    const storyIndex = state.stories.findIndex((s) => s.id === storyId);
                    if (storyIndex === -1) return state;

                    const baseStory = state.stories[storyIndex];
                    const updatedLikedBy = shouldLike
                        ? Array.from(new Set([...baseStory.likedBy, currentUser.id]))
                        : baseStory.likedBy.filter((id) => id !== currentUser.id);

                    const updatedStory: Story = {
                        ...baseStory,
                        likedBy: updatedLikedBy,
                        likes: updatedLikedBy.length,
                    };

                    const updatedStories = [...state.stories];
                    updatedStories[storyIndex] = updatedStory;

                    return { stories: updatedStories };
                });
            },

            toggleCommentLike: async (storyId, commentId) => {
                const { currentUser } = get();
                if (!currentUser) return;

                const state = get();
                const story = state.stories.find((s) => s.id === storyId);
                if (!story) return;

                const comment = story.comments.find((c) => c.id === commentId);
                if (!comment) return;

                const alreadyLiked = comment.likedBy.includes(currentUser.id);

                if (alreadyLiked) {
                    const { error } = await supabase
                        .from('comment_likes')
                        .delete()
                        .match({ comment_id: commentId, user_id: currentUser.id });

                    if (error) {
                        console.error('Failed to remove comment like:', error);
                        return;
                    }
                } else {
                    const { error } = await supabase
                        .from('comment_likes')
                        .insert({ comment_id: commentId, user_id: currentUser.id });

                    if (error) {
                        console.error('Failed to add comment like:', error);
                        return;
                    }

                    // Notify the comment author if liking someone else's comment
                    if (comment.userId !== currentUser.id) {
                        import('./notifications').then(({ notifyCommentLike }) => {
                            notifyCommentLike(
                                storyId,
                                comment.userId,
                                currentUser.name
                            ).catch(err => {
                                console.error('Failed to send comment like notification:', err);
                            });
                        }).catch(err => console.error('Failed to import notifications:', err));
                    }
                }

                const shouldLike = !alreadyLiked;

                set((state) => {
                    const storyIndex = state.stories.findIndex((s) => s.id === storyId);
                    if (storyIndex === -1) return state;

                    const baseStory = state.stories[storyIndex];
                    const updatedComments = baseStory.comments.map((c) => {
                        if (c.id !== commentId) return c;
                        const updatedLikedBy = shouldLike
                            ? Array.from(new Set([...c.likedBy, currentUser.id]))
                            : c.likedBy.filter((id) => id !== currentUser.id);
                        return {
                            ...c,
                            likedBy: updatedLikedBy,
                            likes: updatedLikedBy.length,
                        };
                    });

                    const updatedStory: Story = {
                        ...baseStory,
                        comments: updatedComments,
                    };

                    const updatedStories = [...state.stories];
                    updatedStories[storyIndex] = updatedStory;

                    return { stories: updatedStories };
                });
            },

            addStoryComment: async (storyId, content, parentCommentId) => {
                const trimmed = content.trim();
                if (!trimmed) return;

                const { currentUser } = get();
                if (!currentUser) return;

                const timestamp = Date.now();

                const { data: insertedComment, error } = await supabase
                    .from('story_comments')
                    .insert({
                        story_id: storyId,
                        user_id: currentUser.id,
                        user_name: currentUser.name,
                        content: trimmed,
                        timestamp,
                        parent_comment_id: parentCommentId || null,
                    })
                    .select()
                    .single();

                if (error || !insertedComment) {
                    console.error('Failed to add comment:', error);
                    return;
                }

                const newComment: StoryComment = {
                    id: insertedComment.id,
                    userId: insertedComment.user_id,
                    userName: insertedComment.user_name,
                    userAvatar: currentUser.avatar,
                    content: insertedComment.content,
                    timestamp: insertedComment.timestamp ?? timestamp,
                    parentCommentId: insertedComment.parent_comment_id,
                    likes: 0,
                    likedBy: [],
                };

                // Send notification
                const state = get();
                const story = state.stories.find((s) => s.id === storyId);
                
                if (story) {
                    // 1. Handle Mentions
                    // Extract potential mentions (@username)
                    const mentionMatches = trimmed.match(/@(\w+)/g);
                    
                    if (mentionMatches && mentionMatches.length > 0) {
                        const uniqueUsernames = new Set(mentionMatches.map(m => m.substring(1))); // Remove '@'
                        
                        // Async lookup - don't await blocking the UI update
                        (async () => {
                            try {
                                const usernamesArray = Array.from(uniqueUsernames);
                                const { data: mentionedUsers } = await supabase
                                    .from('profiles')
                                    .select('user_id, name')
                                    .in('name', usernamesArray); // Assuming 'name' matches the @username handle. If you have separate 'username' field, use that.

                                if (mentionedUsers && mentionedUsers.length > 0) {
                                    const { notifyMention } = await import('./notifications');
                                    
                                    for (const user of mentionedUsers) {
                                        // Don't notify self
                                        if (user.user_id === currentUser.id) continue;

                                        await notifyMention(
                                            storyId,
                                            story.title,
                                            user.user_id,
                                            currentUser.name,
                                            trimmed
                                        );
                                    }
                                }
                            } catch (err) {
                                console.error('Failed to process mentions:', err);
                            }
                        })();
                    }

                    // 2. Handle Reply Notifications
                    // If this is a reply, notify the parent comment author
                    if (parentCommentId) {
                        const parentComment = story.comments.find(c => c.id === parentCommentId);
                        if (parentComment && parentComment.userId !== currentUser.id) {
                            import('./notifications').then(({ notifyCommentReply }) => {
                                notifyCommentReply(
                                    storyId,
                                    story.title,
                                    parentComment.userId,
                                    currentUser.name,
                                    trimmed
                                ).catch(err => {
                                    console.error('Failed to send reply notification:', err);
                                });
                            }).catch(err => console.error('Failed to import notifications:', err));
                        }
                    } else if (story.creatorId !== currentUser.id) {
                        // Top-level comment: notify story creator
                        import('./notifications').then(({ notifyStoryComment }) => {
                            notifyStoryComment(
                                storyId,
                                story.title,
                                story.creatorId,
                                currentUser.name,
                                trimmed
                            ).catch(err => {
                                console.error('Failed to send comment notification:', err);
                            });
                        }).catch(err => console.error('Failed to import notifications:', err));
                    }
                }

                set((state) => {
                    const storyIndex = state.stories.findIndex((s) => s.id === storyId);
                    if (storyIndex === -1) return state;

                    const baseStory = state.stories[storyIndex];
                    const updatedStory: Story = {
                        ...baseStory,
                        comments: [...baseStory.comments, newComment].sort((a, b) => a.timestamp - b.timestamp),
                    };

                    const updatedStories = [...state.stories];
                    updatedStories[storyIndex] = updatedStory;

                    return { stories: updatedStories };
                });
            },

            deleteStoryComment: async (storyId, commentId) => {
                const { currentUser } = get();
                if (!currentUser) return;

                // 1. Optimistic update
                set((state) => {
                    const storyIndex = state.stories.findIndex((s) => s.id === storyId);
                    if (storyIndex === -1) return state;

                    const baseStory = state.stories[storyIndex];
                    
                    // Filter out the comment and any replies that have this comment as parent
                    // Note: This simple check works for one level of nesting. 
                    // If we support deeper nesting, we'd need recursive deletion or rely on DB cascade + refetch.
                    // Given the current UI, recursive checks might be overkill but safe to filter by parentCommentId too.
                    const updatedComments = baseStory.comments.filter(
                        c => c.id !== commentId && c.parentCommentId !== commentId
                    );

                    const updatedStory: Story = {
                        ...baseStory,
                        comments: updatedComments
                    };

                    const updatedStories = [...state.stories];
                    updatedStories[storyIndex] = updatedStory;

                    return { stories: updatedStories };
                });

                // 2. DB Update
                const { error } = await supabase
                    .from('story_comments')
                    .delete()
                    .match({ id: commentId, user_id: currentUser.id });

                if (error) {
                    console.error('Failed to delete comment:', error);
                    // Optionally revert optimistic update here if needed
                }
            },

            logoutUser: () => set({ 
                currentUser: null, 
                stories: [], 
                groups: [], 
                friends: [], 
                savedStoryIds: [],
                reportedStoryIds: [],
                activeWeeveId: null,
            }),

            fetchFriends: async () => {
                const { currentUser } = get();

                if (!currentUser) {

                    return;
                }
                try {
                    const friends = await getFriends(currentUser.id);

                    set({ friends });
                } catch (err) {
                     console.error('[Store] fetchFriends failed:', err);
                }
            },

            forkStory: async (originalStoryId: string, slotToUserAssignments: Map<number, string>, contributionIdsToExclude?: string[], customTitle?: string, customDescription?: string) => {
                const { currentUser } = get();
                if (!currentUser) return { success: false, error: "User not logged in" };

                // Extract slot indices from the assignments map
                const slotIndices = Array.from(slotToUserAssignments.keys()).sort((a, b) => a - b);
                if (slotIndices.length === 0) return { success: false, error: "No slots selected" };

                // Get the first assigned user for current_turn_user_id (ordered by slot)
                const firstAssignedUserId = slotToUserAssignments.get(slotIndices[0])!;

                try {
                    // 1. Fetch original story details
                    const { data: originalStory, error: fetchError } = await supabase
                        .from('stories')
                        .select(`
                            *,
                            contributions (*),
                            story_participants (*)
                        `)
                        .eq('id', originalStoryId)
                        .single();

                    if (fetchError || !originalStory) {
                        console.error('Error fetching original story:', fetchError);
                        return { success: false, error: `Failed to fetch original story: ${fetchError?.message || 'Unknown error'}` };
                    }

                    // GUARD: Block weeve/fork on brand posts (canon/seed)
                    // Brand posts can only be stitched into, not forked
                    const postType = (originalStory as any).post_type;


                    // 2. Create new story (copy metadata)
                    const { data: newStoryData, error: createError } = await supabase
                        .from('stories')
                        .insert({
                            title: customTitle?.trim() || originalStory.title,
                            description: customDescription?.trim() || originalStory.description,
                            creator_id: currentUser.id, // The forker becomes the creator of the new branch
                            mode: originalStory.mode, // Copy mode from original story
                            visibility: 'private', // Set to private so it appears in waiting tab
                            status: 'active',
                            max_weeves: originalStory.max_weeves,
                            cover_image: originalStory.cover_image,
                            theme: originalStory.theme,
                            group_id: originalStory.group_id,
                            current_turn_user_id: firstAssignedUserId, // Set turn to the first assigned participant
                            // Always link to the ROOT original story, not the immediate parent
                            // If the story we're forking from is itself a fork, use its original reference
                            // This ensures all weeves in a chain point back to the originating post
                            forked_from_story_id: originalStory.forked_from_story_id || originalStoryId,
                            // Use creator's community for content isolation
                            community_id: currentUser.communityId || null
                        })
                        .select()
                        .single();

                    if (createError || !newStoryData) {
                        console.error('Error creating new story:', createError);
                        return { success: false, error: `Failed to create new story: ${createError?.message || 'Unknown error'}` };
                    }

                    const newStoryId = newStoryData.id;


                    // 3. Sort contributions by timestamp to determine slot positions
                    const sortedContributions = [...originalStory.contributions].sort(
                        (a: any, b: any) => a.timestamp - b.timestamp
                    );
                    
                    // 4. Copy contributions EXCEPT those that should be excluded
                    // If contributionIdsToExclude is provided, use that; otherwise fall back to slotIndices
                    const excludeIds = new Set(contributionIdsToExclude || []);
                    const keptUserIds = new Set<string>();
                    const contributionsToCopy: any[] = [];
                    
                    sortedContributions.forEach((c: any, originalIndex: number) => {
                        // Exclude if ID is in exclude list, OR if no IDs provided and index is in slotIndices
                        const shouldExclude = excludeIds.size > 0 
                            ? excludeIds.has(c.id)
                            : slotIndices.includes(originalIndex);
                        
                        if (!shouldExclude) {
                            keptUserIds.add(c.user_id);
                            contributionsToCopy.push({
                                story_id: newStoryId,
                                user_id: c.user_id,
                                user_name: c.user_name,
                                content: c.content,
                                media_type: c.media_type,
                                media_url: c.media_url,
                                // Use position-based timestamp to maintain slot order
                                // Position 0 = 1000000, Position 1 = 2000000, etc.
                                // This leaves "gaps" for selected slots
                                timestamp: (originalIndex + 1) * 1000000,
                                text_style: c.text_style
                            });
                        }
                    });

                    // Build participant list with strict de-duplication
                    const participantsMap = new Map<string, any>();

                    // Helper to add participant 
                    const addParticipant = (userId: string, position: number, status: 'accepted' | 'waiting') => {
                        if (!participantsMap.has(userId)) {
                            participantsMap.set(userId, {
                                story_id: newStoryId,
                                user_id: userId,
                                position: position,
                                status: status
                            });
                        }
                        // If user already exists, keep their first position (DB unique constraint)
                    };
                    
                    // Create participants from KEPT CONTRIBUTIONS
                    contributionsToCopy.forEach((c: any) => {
                         // Derive position from timestamp (timestamp = (position + 1) * 1000000)
                         const position = Math.floor(c.timestamp / 1000000) - 1;
                         addParticipant(c.user_id, position, 'accepted');
                    });

                    // Add new participants for each slot assignment
                    // Each assigned user gets added at their assigned slot position with 'waiting' status
                    slotToUserAssignments.forEach((userId, slotIndex) => {
                        // Override any existing entry for this user with their new assignment
                        participantsMap.set(userId, {
                            story_id: newStoryId,
                            user_id: userId,
                            position: slotIndex,
                            status: 'waiting' // Always waiting - they need to add content to this slot
                        });
                    });

                    const participantsToInsert = Array.from(participantsMap.values());

                    const { error: participantsError } = await supabase
                        .from('story_participants')
                        .insert(participantsToInsert);

                    if (participantsError) {
                         console.error('[forkStory] Error adding participants:', participantsError);
                         // Rollback story
                         try { await supabase.from('stories').delete().eq('id', newStoryId); } catch {}
                         return { success: false, error: `Failed to add participants: ${participantsError.message}` };
                    }

                    // 6. Insert the copied contributions
                    if (contributionsToCopy.length > 0) {
                        const { error: contributionsError } = await supabase
                            .from('contributions')
                            .insert(contributionsToCopy);

                        if (contributionsError) {
                            console.error('[forkStory] Error copying contributions:', contributionsError);
                        }
                    }

                    // 7. Send notifications to all assigned users (except the current user/creator)
                    const assignedUserIds = Array.from(new Set(slotToUserAssignments.values()));
                    const usersToNotify = assignedUserIds.filter(id => id !== currentUser.id);
                    
                    if (usersToNotify.length > 0) {
                        import('./notifications').then(({ notifyStoryInvite }) => {
                            notifyStoryInvite(
                                newStoryId,
                                customTitle?.trim() || originalStory.title,
                                currentUser.name,
                                usersToNotify
                            ).catch(err => {
                                console.error('[forkStory] Failed to send invite notifications:', err);
                            });
                        }).catch(err => console.error('[forkStory] Failed to import notifications:', err));
                    }

                    // Return success - the story page will fetch the story data when it loads
                    return { success: true, storyId: newStoryId };
                } catch (err: any) {
                    console.error('Unexpected error in forkStory:', err);
                    return { success: false, error: `Unexpected error: ${err?.message || err}` };
                }
            },

            /**
             * Fork a brand post (Canon/Seed) for the current user.
             * This creates a personal copy of the Canon/Seed so each user can complete it independently.
             * The brand's immutable content is copied, and the user is set up to add their own content.
             */
            forkBrandPost: async (originalStoryId: string) => {
                const { currentUser } = get();
                if (!currentUser) return { success: false, error: "User not logged in" };

                try {
                    // 1. Fetch original story details
                    const { data: originalStory, error: fetchError } = await supabase
                        .from('stories')
                        .select(`
                            *,
                            contributions (*),
                            story_participants (*)
                        `)
                        .eq('id', originalStoryId)
                        .single();

                    if (fetchError || !originalStory) {
                        console.error('[forkBrandPost] Error fetching original story:', fetchError);
                        return { success: false, error: `Failed to fetch original story: ${fetchError?.message || 'Unknown error'}` };
                    }

                    // Verify this is a brand post
                    const postType = originalStory.post_type as 'canon' | 'seed' | 'normal';
                    if (postType !== 'canon' && postType !== 'seed') {
                        return { success: false, error: 'This is not a brand post' };
                    }

                    // Check if user already has a fork of this Canon
                    const { data: existingForks } = await supabase
                        .from('stories')
                        .select('id')
                        .eq('forked_from_story_id', originalStoryId)
                        .eq('creator_id', currentUser.id)
                        .limit(1);

                    if (existingForks && existingForks.length > 0) {
                        // User already has a fork, return it
                        return { success: true, storyId: existingForks[0].id };
                    }

                    const canonSlots: number[] = originalStory.canon_slots || [];
                    const immutableSlots = postType === 'seed' ? [0] : canonSlots;

                    // 3. Create new story (fork)
                    const { data: newStoryData, error: createError } = await supabase
                        .from('stories')
                        .insert({
                            title: originalStory.title,
                            description: originalStory.description,
                            creator_id: currentUser.id,
                            mode: 'invite',
                            visibility: 'private', // Start as private until completed
                            status: 'active',
                            max_weeves: originalStory.max_weeves,
                            cover_image: originalStory.cover_image,
                            theme: originalStory.theme,
                            hashtags: originalStory.hashtags,
                            post_type: postType,
                            canon_slots: originalStory.canon_slots,
                            brand_id: originalStory.brand_id || originalStory.creator_id,
                            forked_from_story_id: originalStoryId,
                            current_turn_user_id: currentUser.id
                        })
                        .select()
                        .single();

                    if (createError || !newStoryData) {
                        console.error('[forkBrandPost] Error creating fork:', createError);
                        return { success: false, error: `Failed to create fork: ${createError?.message || 'Unknown error'}` };
                    }

                    const newStoryId = newStoryData.id;

                    // 4. Copy immutable contributions (brand content)
                    // IMPORTANT: We decode the actual slot position from the timestamp
                    // Timestamps are encoded as (position + 1) * 1000000
                    const contributionsToCopy: any[] = [];
                    (originalStory.contributions || []).forEach((c: any) => {
                        // Decode position from timestamp
                        let contributionPosition: number;
                        if (c.timestamp >= 1000000 && c.timestamp < 100000000) {
                            contributionPosition = Math.floor(c.timestamp / 1000000) - 1;
                        } else {
                            // Fallback: try to infer from order (less reliable)
                            contributionPosition = -1;
                        }
                        
                        // Copy only contributions that are in immutable slots
                        if (immutableSlots.includes(contributionPosition)) {
                            contributionsToCopy.push({
                                story_id: newStoryId,
                                user_id: c.user_id,
                                user_name: c.user_name,
                                content: c.content,
                                media_type: c.media_type,
                                media_url: c.media_url,
                                timestamp: c.timestamp, // Preserve original timestamp/position
                                text_style: c.text_style,
                                approval_status: 'approved'
                            });
                        }
                    });
                    if (contributionsToCopy.length > 0) {
                        const { error: contributionsError } = await supabase
                            .from('contributions')
                            .insert(contributionsToCopy);

                        if (contributionsError) {
                            console.error('[forkBrandPost] Error copying contributions:', contributionsError);
                            // Continue anyway - user can still add their content
                        }
                    }

                    // NOTE: We do NOT add the user as a separate participant here.
                    // For forked Canon posts, the user fills the open slot (non-reserved position)
                    // which is determined by canonSlots. They interact via the "Your turn" open slot.

                    // 5. Fetch the complete new story and add to store
                    const { data: completeStory } = await supabase
                        .from('stories')
                        .select(`
                            *,
                            contributions (*),
                            story_participants (
                                *,
                                profiles:user_id (id, name, avatar, is_influencer)
                            ),
                            story_likes (user_id),
                            story_comments (*)
                        `)
                        .eq('id', newStoryId)
                        .single();

                    if (completeStory) {
                        const participants = (completeStory.story_participants || []).map((sp: any) => {
                            const profile = sp.profiles || { name: 'Unknown', avatar: '' };
                            return {
                                id: sp.user_id,
                                name: profile.name,
                                avatar: profile.avatar,
                                tokens: 0,
                                isInfluencer: profile.is_influencer,
                                status: sp.status as 'accepted' | 'waiting' | 'declined' | undefined,
                                position: sp.position,
                            };
                        });

                        const contributions = (completeStory.contributions || []).map((c: any) => ({
                            id: c.id,
                            userId: c.user_id,
                            userName: c.user_name,
                            content: c.content,
                            mediaType: c.media_type,
                            mediaUrl: c.media_url,
                            timestamp: c.timestamp,
                            textStyle: c.text_style,
                        }));

                        const newStory: Story = {
                            id: completeStory.id,
                            title: completeStory.title,
                            description: completeStory.description,
                            creatorId: completeStory.creator_id,
                            visibility: completeStory.visibility,
                            mode: completeStory.mode ?? 'invite',
                            status: completeStory.status,
                            currentTurnUserId: completeStory.current_turn_user_id,
                            contributions,
                            participants,
                            maxWeeves: completeStory.max_weeves,
                            coverImage: completeStory.cover_image,
                            theme: completeStory.theme,
                            likes: 0,
                            likedBy: [],
                            comments: [],
                            created_at: completeStory.created_at,
                            updated_at: completeStory.updated_at,
                            hashtags: completeStory.hashtags,
                            forkedFromStoryId: completeStory.forked_from_story_id,
                            postType: completeStory.post_type ?? 'normal',
                            canonSlots: completeStory.canon_slots,
                            brandId: completeStory.brand_id,
                        };

                        set((state) => ({ stories: [newStory, ...state.stories] }));
                    }

                    return { success: true, storyId: newStoryId };

                } catch (err: any) {
                    console.error('[forkBrandPost] Unexpected error:', err);
                    return { success: false, error: `Unexpected error: ${err?.message || err}` };
                }
            },

            fetchStories: async (reset = true, recursionDepth = 0) => {
                const PAGE_SIZE = 30;
                const { currentUser, isStoriesLoading, storiesPage } = get();
                const userCommunityId = currentUser?.communityId;
                const defaultCommunityId = '00000000-0000-0000-0000-000000000001';

                // Deduplicate: Don't fetch if already fetching (unless recursing)
                if (isStoriesLoading && recursionDepth === 0) {
                    return;
                }

                // If reset, start from page 0
                const page = reset ? 0 : storiesPage;
                const offset = page * PAGE_SIZE;



                set({ isStoriesLoading: true });
                
                // Refresh blocked users list first
                try { await get().fetchBlockedUsers(); } catch (e) { /* ignore */ }
                const { blockedUserIds } = get();

                try {
                    // Helper to run query with timeout and pagination
                    const runQuery = async (timeoutMs: number) => {
                        // Start building the query
                        let query = supabase
                            .from('stories')
                            .select(STORY_SELECT_QUERY)
                            .order('created_at', { ascending: false })
                            .range(offset, offset + PAGE_SIZE - 1);

                        // Community filter: Show stories from user's community only
                        // Default public community (WEEVE) sees all stories for backward compatibility
                        
                        console.log('[Store] Fetching stories. User Community:', userCommunityId, 'Default:', defaultCommunityId);

                        if (userCommunityId && userCommunityId !== defaultCommunityId) {
                            console.log('[Store] Applying community filter:', userCommunityId);
                            query = query.eq('community_id', userCommunityId);
                        } else {
                            console.log('[Store] No specific community filter applied (Public Feed)');
                        }

                        return Promise.race([
                            query,
                            new Promise<{ data: any[] | null; error: any }>((resolve) => 
                                setTimeout(() => resolve({ data: null, error: new Error(`Stories query timeout (${timeoutMs}ms)`) }), timeoutMs)
                            ),
                        ]);
                    };

                    // First attempt: Fail fast (10s) to detect dead socket but allow slow connections
                    let result = await runQuery(10000);
                    let { data: storiesData, error } = result as { data: any[] | null; error: any };

                    // Auto-recovery: If failed, try refreshing session and retrying with patience (20s)
                    if (error) {
                        console.warn('[Store] fetchStories failed (attempt 1), attempting auto-recovery (refresh session + retry)...', error);
                        
                        // refreshing session can also hang on bad connection, so race it
                        const refreshPromise = supabase.auth.refreshSession();
                        const { error: refreshError } = await Promise.race([
                            refreshPromise,
                            new Promise<{ error: any }>(r => setTimeout(() => r({ error: new Error('Refresh timeout') }), 15000))
                        ]);
                        
                        if (!refreshError) {
                            result = await runQuery(20000); // Give it more time on retry
                            storiesData = (result as any).data;
                            error = (result as any).error;
                        } else {
                            console.warn('[Store] Session refresh failed/timed out during recovery:', refreshError);
                        }
                    }

                    if (error) {
                        console.error('[Store] Error fetching stories (final):', error);
                        return;
                    }

                    if (!storiesData) { // Allow empty array, but check for null/undefined
                         return;
                    }

                    // Determine if there are more stories to load
                    const hasMore = storiesData.length === PAGE_SIZE;

                    // Fetch user's group memberships for filtering group content
                    // Group content should only be visible to members on the main feed
                    const currentUserId = get()?.currentUser?.id;
                    let userGroupIds = new Set<string>();
                    if (currentUserId) {
                        try {
                            const { data: membershipData } = await supabase
                                .from('group_members')
                                .select('group_id')
                                .eq('user_id', currentUserId)
                                .eq('status', 'active');
                            
                            if (membershipData) {
                                userGroupIds = new Set(membershipData.map((m: { group_id: string }) => m.group_id));
                            }
                        } catch (err) {
                            console.warn('[Store] Failed to fetch group memberships:', err);
                        }
                    }

                    const formattedStories: Story[] = storiesData
                        // Filter out stories we don't want on the public feed
                        .filter((s: any) => {
                            // Private group content check - only show if user is a member of the group
                            // Public groups are visible to everyone
                            if (s.group_id && s.groups?.is_private) {
                                if (!currentUserId || !userGroupIds.has(s.group_id)) {
                                    return false; // User is not a member of this private group
                                }
                                // Group stories must have at least 1 contribution to appear in feed
                                // OR the current user must be a participant (so they can see it in their waiting tab)
                                const hasContributions = s.contributions && s.contributions.length > 0;
                                const isParticipant = (s.story_participants ?? []).some((p: any) => p.user_id === currentUserId);
                                if (!hasContributions && !isParticipant) {
                                    return false;
                                }
                            }



                            // Filter out blocked users
                            if (blockedUserIds.length > 0) {
                                // If I blocked the creator, or the creator blocked me
                                if (blockedUserIds.includes(s.creator_id)) {
                                    return false;
                                }
                                
                                // Also check if ALL currently visible contributions are from blocked users
                                // (If a story has non-blocked contributors, we might still show it, 
                                // but we should hide the blocked contributions - handled in map step or UI)
                                // For now, let's just hide STORIES created by blocked users.
                            }

                            // For public stories, only show if they have at least 1 contribution OR the current user is a participant
                            if (s.visibility === 'public') {
                                // Filter out future scheduled posts (unless I am the creator)
                                if (s.scheduled_for) {
                                  const isScheduledFuture = new Date(s.scheduled_for) > new Date();
                                  const isCreator = currentUserId && s.creator_id === currentUserId;
                                  if (isScheduledFuture && !isCreator) return false;
                                }

                                // Filter out incomplete Brand Canon/Seed posts (unless I am the creator)
                                // Brands must fill all their reserved slots (canon_slots) before the post goes public

                                const hasContributions = s.contributions && s.contributions.length > 0;
                                const isParticipant = currentUserId && (s.story_participants ?? []).some((p: any) => p.user_id === currentUserId);
                                // Show brand posts to their creators even without contributions so they can add content
                                const isBrandPost = s.post_type === 'canon' || s.post_type === 'seed';
                                const isBrandPostCreator = currentUserId && isBrandPost && s.creator_id === currentUserId;
                                
                                // Show ORIGINAL brand posts (not forks) to everyone even without contributions
                                // This allows users to see and fork Canon posts as soon as they're created
                                const isOriginalBrandPost = isBrandPost && !s.forked_from_story_id;

                                // Hide stories where the creator has assigned slots to themselves but hasn't filled them yet
                                // These should stay in "Waiting" (visible only to participants) until the creator completes their parts
                                const creatorHasWaitingSlot = (s.story_participants ?? []).some((p: any) => p.user_id === s.creator_id && p.status === 'waiting');
                                if (creatorHasWaitingSlot) {
                                    return isParticipant;
                                }
                                
                                return hasContributions || isParticipant || isBrandPostCreator || isOriginalBrandPost;
                            }

                            // For private stories, hide those where the current user is a waiting participant
                            // For private stories, hide those where the current user is a waiting participant
                            // UPDATE: We now KEEP these in the store so they can be shown in the "Waiting" tab on profile
                            // The Feed component will be responsible for filtering them out of the main feed
                            /*
                            if (currentUserId) {
                                const isWaitingForCurrentUser = (s.story_participants ?? []).some((p: any) => p.user_id === currentUserId && p.status === 'waiting');
                                if (isWaitingForCurrentUser) {
                                    // This story belongs in the Waiting tab instead of the main feed
                                    return false;
                                }
                            }
                            */

                            // Otherwise include the private story (e.g., created by current user or others)
                            return true;
                        })
                        .map((s: any) => {
                        // Map participants
                        const participants = s.story_participants.map((sp: any) => {
                            // Handle case where profile might be missing (deleted user?)
                            const profile = sp.profiles || { name: 'Unknown', avatar: '' };
                            return {
                                id: sp.user_id,
                                name: profile.name,
                                avatar: profile.avatar,
                                tokens: 0, // Not needed for display
                                isInfluencer: profile.is_influencer,
                                isBrand: profile.is_brand,
                                isPrivate: profile.is_private === true,
                                status: (sp.status === 'accepted' || sp.status === 'waiting' || sp.status === 'declined') ? (sp.status as 'accepted' | 'waiting' | 'declined') : undefined,
                                position: sp.position
                            };
                        }).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));

                        // Map contributions with validation
                        const contributions = s.contributions.map((c: any) => {
                            // Log if video has no URL
                            if (c.media_type === 'video' && (!c.media_url || !c.media_url.trim())) {
                                console.warn('[Store] Video contribution with empty media_url:', {
                                    contributionId: c.id,
                                    storyId: s.id,
                                    storyTitle: s.title,
                                    mediaUrl: c.media_url
                                });
                            }
                            return {
                                id: c.id,
                                userId: c.user_id,
                                userName: c.user_name,
                                content: c.content,
                                mediaType: c.media_type,
                                mediaUrl: c.media_url?.trim() || undefined, // Ensure undefined if empty string
                                timestamp: c.timestamp,
                                textStyle: c.text_style
                            };
                        });

                        // Map comments
                        const comments = (s.story_comments || []).map((cm: any) => ({
                            id: cm.id,
                            userId: cm.user_id,
                            userName: cm.user_name || cm.profiles?.name || 'Unknown',
                            userAvatar: cm.profiles?.avatar || undefined,
                            content: cm.content,
                            timestamp: cm.timestamp,
                            parentCommentId: cm.parent_comment_id,
                            likes: cm.comment_likes?.length ?? 0,
                            likedBy: (cm.comment_likes ?? []).map((l: any) => l.user_id),
                        }));

                        // Map likes
                        const likedBy = s.story_likes.map((l: any) => l.user_id);

                        return {
                            id: s.id,
                            title: s.title,
                            description: s.description,
                            creatorId: s.creator_id,
                            visibility: s.visibility,
                            mode: s.mode ?? 'invite',
                            // Calculate status: Brand posts expire after visibilityDays, becoming 'completed' (view-only)
                            status: ((s.post_type === 'canon' || s.post_type === 'seed') && s.visibility_days && (new Date(s.created_at).getTime() + (s.visibility_days * 86400000) < Date.now())) ? 'completed' : s.status,
                            currentTurnUserId: s.current_turn_user_id,
                            contributions,
                            participants,
                            maxWeeves: s.max_weeves,
                            coverImage: s.cover_image,
                            theme: s.theme,
                            groupId: s.group_id,
                            groupName: s.groups?.name,
                            groupAvatar: s.groups?.avatar,
                            groupIsPrivate: s.groups?.is_private,
                            likes: likedBy.length,
                            likedBy,
                            comments,
                            created_at: s.created_at,
                            updated_at: s.updated_at,
                            hashtags: s.hashtags,
                            monetizationCost: s.monetization_cost,
                            allowComments: s.allow_comments,
                            allowReuse: s.allow_reuse,
                            turnTimerHours: s.turn_timer_hours,
                            forkedFromStoryId: s.forked_from_story_id ?? undefined,
                            // Brand fields
                            postType: s.post_type ?? 'normal',
                            canonSlots: s.canon_slots ?? undefined,
                            visibilityDays: s.visibility_days ?? undefined,
                            brandId: s.brand_id ?? undefined,
                            isFeatured: s.is_featured ?? false,
                            scheduledFor: s.scheduled_for ?? undefined,
                            forksCount: (s.forks && s.forks[0]) ? s.forks[0].count : 0,
                            communityId: s.community_id ?? undefined
};
                    });

                    // If reset, replace stories; otherwise append
                    if (reset) {
                        set((state) => {
                            // When resetting, we merge with existing stories to preserve local updates (like optimistic comments)
                            // or detailed data loaded from individual story views.
                            
                            // Create map for O(1) lookup
                            const existingStoriesMap = new Map(state.stories.map(s => [s.id, s]));
                            
                            const mergedStories = formattedStories.map(newStory => {
                                const existing = existingStoriesMap.get(newStory.id);
                                if (existing) {
                                    // Preserve comments if existing (local/cached) has more than incoming
                                    // STRICTER CHECK: Only take server comments if strictly GREATER than local.
                                    // This prevents server latency (0/equal comments) from overwriting local optimistic updates.
                                    const mergedComments = newStory.comments.length > existing.comments.length
                                        ? newStory.comments
                                        : existing.comments;
                                    
                                    if (existing.comments.length > newStory.comments.length) {
                                        console.log(`[Store] Preserving local comments for ${newStory.id}. Local: ${existing.comments.length}, Server: ${newStory.comments.length}`);
                                    }

                                    // Could merge other fields here if needed, but comments are the main dynamic issue
                                    return { ...newStory, comments: mergedComments };
                                }
                                return newStory;
                            });

                             // NEW: Preserve stories from state that are NOT in the new batch.
                             // This prevents older stories (that were loaded individually via useStoryData)
                             // from being dropped when the feed refreshes Page 1.
                             const newIds = new Set(formattedStories.map(s => s.id));
                             const keptStories = state.stories.filter(s => {
                                 // 1. Must not be in the new batch
                                 if (newIds.has(s.id)) return false;

                                 // 2. Must match the current community filter
                                 // If user has a specific community, only keep stories from that community
                                 if (userCommunityId && userCommunityId !== defaultCommunityId) {
                                     // Check if story belongs to this community
                                     // Note: 'community_id' property might be camelCase 'communityId' depending on map logic
                                     const storyCommunityId = (s as any).community_id || (s as any).communityId; 
                                     if (storyCommunityId && storyCommunityId !== userCommunityId) {
                                         return false;
                                     }
                                     // Strict Check for private community:
                                     // If the story has NO community ID (undefined), it's likely a legacy public story.
                                     // If we are in a private community, we should hide it.
                                     if (!storyCommunityId && userCommunityId !== defaultCommunityId) {
                                         return false;
                                     }
                                 }
                                 
                                 return true;
                             });

                             return { 
                                stories: [...mergedStories, ...keptStories], 
                                storiesPage: 1, 
                                hasMoreStories: hasMore 
                            };
                        });
                    } else {
                        set((state) => {
                            const existingIds = new Set(state.stories.map(s => s.id));
                            const newStories = formattedStories.filter(s => !existingIds.has(s.id));
                            return { 
                                stories: [...state.stories, ...newStories], 
                                storiesPage: page + 1, 
                                hasMoreStories: hasMore 
                            };
                        });
                    }

                    // RECURSIVE FETCH: If we got results from DB but filtered them all out (e.g. private/blocked),
                    // effectively getting an empty page, we should immediately try the next page
                    // to avoid the UI getting stuck in "loading" or "infinite loop" state.
                    if (formattedStories.length === 0 && hasMore && recursionDepth < 5) {
                        console.log(`[Store] Page ${page} filtered to empty. Recursively fetching next page (depth ${recursionDepth + 1})...`);
                        await get().fetchStories(false, recursionDepth + 1);
                    }

                } catch (err) {
                    console.error('Failed to fetch stories:', err);
                } finally {
                    set({ isStoriesLoading: false });
                }
            },

            fetchUserStories: async (userId: string) => {
                const { stories } = get();
                // 1. Fetch IDs where user is creator, participant, or contributor
                // use separate queries to keep it simple and efficient enough
                
                try {
                    const [createdRes, participatedRes, contributedRes] = await Promise.all([
                        supabase.from('stories').select('id').eq('creator_id', userId),
                        supabase.from('story_participants').select('story_id').eq('user_id', userId),
                        supabase.from('contributions').select('story_id').eq('user_id', userId)
                    ]);

                    const ids = new Set<string>();
                    createdRes.data?.forEach((r: any) => ids.add(r.id));
                    participatedRes.data?.forEach((r: any) => ids.add(r.story_id));
                    contributedRes.data?.forEach((r: any) => ids.add(r.story_id));

                    // Filter out already loaded stories
                    const existingIds = new Set(stories.map(s => s.id));
                    const missingIds = Array.from(ids).filter(id => !existingIds.has(id));

                    if (missingIds.length === 0) return;

                    // Fetch missing stories
                    // Process in chunks of 20 to avoid URL length issues if many
                    const CHUNK_SIZE = 20;
                    const chunks = [];
                    for (let i = 0; i < missingIds.length; i += CHUNK_SIZE) {
                        chunks.push(missingIds.slice(i, i + CHUNK_SIZE));
                    }

                    for (const chunk of chunks) {
                        const { data: storiesData, error } = await supabase
                            .from('stories')
                            .select(STORY_SELECT_QUERY)
                            .in('id', chunk);

                        if (error) {
                            console.error('[Store] Error fetching user stories chunk:', error);
                            continue;
                        }
                        
                        if (!storiesData) continue;

                        const { blockedUserIds, groups: userGroups, currentUser } = get();
                        const userGroupIds = new Set(userGroups.map(g => g.id));

                        const formattedStories: Story[] = storiesData
                            .filter((s: any) => {
                                // Filter out blocked users
                                if (blockedUserIds.includes(s.creator_id)) return false;

                                // Filter out private group stories if not a member
                                if (s.group_id && s.groups?.is_private) {
                                    if (!currentUser || !userGroupIds.has(s.group_id)) {
                                        return false;
                                    }
                                }
                                return true;
                            })
                            .map((s: any) => {
                             // Map participants
                             const participants = s.story_participants.map((sp: any) => {
                                 const profile = sp.profiles || { name: 'Unknown', avatar: '' };
                                 return {
                                     id: sp.user_id,
                                     name: profile.name,
                                     avatar: profile.avatar,
                                     tokens: 0,
                                     isInfluencer: profile.is_influencer,
                                     isBrand: profile.isBrand,
                                     isPrivate: profile.is_private === true,
                                     status: (sp.status === 'accepted' || sp.status === 'waiting' || sp.status === 'declined') ? sp.status : undefined,
                                     position: sp.position
                                 };
                             }).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
     
                             const contributions = s.contributions.map((c: any) => ({
                                 id: c.id,
                                 userId: c.user_id,
                                 userName: c.user_name,
                                 content: c.content,
                                 mediaType: c.media_type,
                                 mediaUrl: c.media_url?.trim() || undefined,
                                 timestamp: c.timestamp,
                                 textStyle: c.text_style
                             }));
     
                             const comments = (s.story_comments || []).map((cm: any) => ({
                                 id: cm.id,
                                 userId: cm.user_id,
                                 userName: cm.user_name || cm.profiles?.name || 'Unknown',
                                 userAvatar: cm.profiles?.avatar || undefined,
                                 content: cm.content,
                                 timestamp: cm.timestamp,
                                 parentCommentId: cm.parent_comment_id,
                                 likes: cm.comment_likes?.length ?? 0,
                                 likedBy: (cm.comment_likes ?? []).map((l: any) => l.user_id),
                             }));
     
                             const likedBy = s.story_likes.map((l: any) => l.user_id);
     
                             return {
                                 id: s.id,
                                 title: s.title,
                                 description: s.description,
                                 creatorId: s.creator_id,
                                 visibility: s.visibility,
                                 mode: s.mode ?? 'invite',
                                 status: ((s.post_type === 'canon' || s.post_type === 'seed') && s.visibility_days && (new Date(s.created_at).getTime() + (s.visibility_days * 86400000) < Date.now())) ? 'completed' : s.status,
                                 currentTurnUserId: s.current_turn_user_id,
                                 contributions,
                                 participants,
                                 maxWeeves: s.max_weeves,
                                 coverImage: s.cover_image,
                                 theme: s.theme,
                                 groupId: s.group_id,
                                 groupName: s.groups?.name,
                                 groupAvatar: s.groups?.avatar,
                                 groupIsPrivate: s.groups?.is_private,
                                 likes: likedBy.length,
                                 likedBy,
                                 comments,
                                 created_at: s.created_at,
                                 updated_at: s.updated_at,
                                 hashtags: s.hashtags,
                                 monetizationCost: s.monetization_cost,
                                 allowComments: s.allow_comments,
                                 allowReuse: s.allow_reuse,
                                 turnTimerHours: s.turn_timer_hours,
                                 forkedFromStoryId: s.forked_from_story_id ?? undefined,
                                 postType: s.post_type ?? 'normal',
                                 canonSlots: s.canon_slots ?? undefined,
                                 visibilityDays: s.visibility_days ?? undefined,
                                 brandId: s.brand_id ?? undefined,
                                 isFeatured: s.is_featured ?? false,
                                 scheduledFor: s.scheduled_for ?? undefined,
                                 forksCount: (s.forks && s.forks[0]) ? s.forks[0].count : 0
                             };
                        });

                        set((state) => {
                            const existingIds = new Set(state.stories.map(s => s.id));
                            const uniqueNewStories = formattedStories.filter(s => !existingIds.has(s.id));
                            return { 
                                stories: [...state.stories, ...uniqueNewStories] 
                            };
                        });
                    }
                } catch (err) {
                    console.error('[Store] fetchUserStories failed:', err);
                }
            },

            fetchDiscoveryStories: async (reset = true) => {
                const PAGE_SIZE = 30;
                const { isStoriesLoading, storiesPage } = get();

                if (isStoriesLoading) {
                    return;
                }

                const page = reset ? 0 : storiesPage;
                const offset = page * PAGE_SIZE;

                set({ isStoriesLoading: true });
                
                try { await get().fetchBlockedUsers(); } catch (e) { /* ignore */ }
                const { blockedUserIds } = get();

                try {
                    const { currentUser } = get();
                    const userCommunityId = currentUser?.communityId;
                    const defaultCommunityId = '00000000-0000-0000-0000-000000000001';

                    const runQuery = async (timeoutMs: number) => {
                        let storiesQueryPromise = supabase
                            .from('stories')
                            .select(`
                                id, title, description, creator_id, visibility, mode, status,
                                max_weeves, cover_image, hashtags, created_at, updated_at,
                                forked_from_story_id, post_type, canon_slots, brand_id, 
                                is_featured, group_id, current_turn_user_id, allow_comments, 
                                allow_reuse, turn_timer_hours, monetization_cost,
                                allow_reuse, turn_timer_hours, monetization_cost,
                                scheduled_for, visibility_days, community_id,
                                groups (name, avatar, is_private),
                                contributions (id, user_id, user_name, content, media_type, media_url, timestamp, text_style),
                                story_participants (user_id, status, position, profiles:user_id (id, name, avatar, is_influencer, is_private, is_brand)),
                                story_likes (user_id),
                                story_comments (
                                    *,
                                    profiles:user_id (name, avatar),
                                    comment_likes (user_id)
                                ),
                                forks:stories!forked_from_story_id(count)
                            `)
                            .eq('visibility', 'public')
                            .order('created_at', { ascending: false })
                            .range(offset, offset + PAGE_SIZE - 1);
                        
                        // Community Filter for Discover
                        if (userCommunityId && userCommunityId !== defaultCommunityId) {
                            storiesQueryPromise = storiesQueryPromise.eq('community_id', userCommunityId);
                        } else {
                            // Public feed: Default or Null community
                            storiesQueryPromise = storiesQueryPromise.or(`community_id.eq.${defaultCommunityId},community_id.is.null`);
                        }

                        return Promise.race([
                            storiesQueryPromise,
                            new Promise<{ data: any[] | null; error: any }>((resolve) => 
                                setTimeout(() => resolve({ data: null, error: new Error(`Stories query timeout (${timeoutMs}ms)`) }), timeoutMs)
                            ),
                        ]);
                    };

                    let result = await runQuery(10000);
                    let { data: storiesData, error } = result as { data: any[] | null; error: any };

                    if (error) {
                        const refreshPromise = supabase.auth.refreshSession();
                        await Promise.race([
                            refreshPromise,
                            new Promise(r => setTimeout(r, 15000))
                        ]);
                        
                        result = await runQuery(20000);
                        storiesData = (result as any).data;
                        error = (result as any).error;
                    }

                    if (error) {
                        console.error('[Store] Error fetching discovery stories (final):', error);
                        return;
                    }
                    if (!storiesData) return;

                    const hasMore = storiesData.length === PAGE_SIZE;

                    const formattedStories: Story[] = storiesData
                        .filter((s: any) => {
                            if (blockedUserIds.includes(s.creator_id)) return false;
                            
                            if (s.scheduled_for) {
                                  const isScheduledFuture = new Date(s.scheduled_for) > new Date();
                                  if (isScheduledFuture) return false;
                             }
                             
                             const hasContributions = s.contributions && s.contributions.length > 0;
                             const isBrand = s.post_type === 'canon' || s.post_type === 'seed';
                             if (!hasContributions && !isBrand) return false;

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
                                     isBrand: profile.is_brand,
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

                             // Map comments
                             const comments = (s.story_comments || []).map((cm: any) => ({
                                 id: cm.id,
                                 userId: cm.user_id,
                                 userName: cm.user_name || cm.profiles?.name || 'Unknown',
                                 userAvatar: cm.profiles?.avatar || undefined,
                                 content: cm.content,
                                 timestamp: cm.timestamp,
                                 parentCommentId: cm.parent_comment_id,
                                 likes: cm.comment_likes?.length ?? 0,
                                 likedBy: (cm.comment_likes ?? []).map((l: any) => l.user_id),
                             }));

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
                                 theme: s.theme,
                                 groupId: s.group_id,
                                 groupName: s.groups?.name,
                                 groupAvatar: s.groups?.avatar,
                                 groupIsPrivate: s.groups?.is_private,
                                 likes: likedBy.length,
                                 likedBy,
                                 comments,
                                 created_at: s.created_at,
                                 updated_at: s.updated_at,
                                 hashtags: s.hashtags,
                                 monetizationCost: s.monetization_cost,
                                 allowComments: s.allow_comments,
                                 allowReuse: s.allow_reuse,
                                 turnTimerHours: s.turn_timer_hours,
                                 forkedFromStoryId: s.forked_from_story_id ?? undefined,
                                 postType: s.post_type ?? 'normal',
                                 canonSlots: s.canon_slots ?? undefined,
                                 visibilityDays: s.visibility_days ?? undefined,
                                 brandId: s.brand_id ?? undefined,
                                 isFeatured: s.is_featured ?? false,
                                 scheduledFor: s.scheduled_for ?? undefined,
                                 forksCount: (s.forks && s.forks[0]) ? s.forks[0].count : 0
                             };
                        });

                    if (reset) {
                        set((state) => {
                            // Merge with existing stories to preserve local updates (like optimistic comments)
                            // and keep other stories (e.g. from Feed) in the store.
                            
                            // Create map for O(1) lookup
                            const existingStoriesMap = new Map(state.stories.map(s => [s.id, s]));
                            
                            const mergedStories = formattedStories.map(newStory => {
                                const existing = existingStoriesMap.get(newStory.id);
                                if (existing) {
                                    // Preserve comments if existing (local/cached) has more than incoming
                                    const mergedComments = newStory.comments.length > existing.comments.length
                                        ? newStory.comments
                                        : existing.comments;
                                    
                                    if (existing.comments.length > newStory.comments.length) {
                                        console.log(`[Store] Preserving local comments for ${newStory.id}. Local: ${existing.comments.length}, Server: ${newStory.comments.length}`);
                                    }

                                    return { ...newStory, comments: mergedComments };
                                }
                                return newStory;
                            });

                             // Preserve stories from state that are NOT in the new batch.
                             // This prevents stories from Main Feed (or other pages) from being wiped out.
                             const newIds = new Set(formattedStories.map(s => s.id));
                             const keptStories = state.stories.filter(s => !newIds.has(s.id));

                             return { 
                                stories: [...mergedStories, ...keptStories], 
                                storiesPage: 1, 
                                hasMoreStories: hasMore 
                            };
                        });
                    } else {
                        set((state) => {
                            const existingIds = new Set(state.stories.map(s => s.id));
                            const newStories = formattedStories.filter(s => !existingIds.has(s.id));
                            return { 
                                stories: [...state.stories, ...newStories], 
                                storiesPage: page + 1, 
                                hasMoreStories: hasMore 
                            };
                        });
                    }
                } catch (err) {
                    console.error('Failed to fetch discovery stories:', err);
                } finally {
                    set({ isStoriesLoading: false });
                }
            },

            fetchMoreStories: async () => {
                const { hasMoreStories, isStoriesLoading } = get();
                if (!hasMoreStories || isStoriesLoading) {
                    return;
                }
                await get().fetchStories(false);
            },
        }),
        {
            name: 'weeve-storage',
            partialize: (state) => ({ 
                currentUser: state.currentUser,
                stories: state.stories,
                groups: state.groups,
                friends: state.friends,
                savedStoryIds: state.savedStoryIds
            }),
        }
    ));
