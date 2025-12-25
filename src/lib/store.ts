import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase';
import { getFriends } from './friends';

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
    // Brand account fields
    isBrand?: boolean;
    brandWebsite?: string;
    brandVerified?: boolean;
    brandSubscriptionStatus?: 'none' | 'active' | 'expired';
}

export interface Group {
    id: string;
    name: string;
    description: string;
    avatar: string;
    memberCount: number;
    isPrivate: boolean;
    isMember?: boolean;
}

export type MediaType = 'video' | 'image' | 'text' | 'drawing';

export interface TextElement {
    id: string;
    content: string;
    style: TextStyle;
    position: { left: number; top: number };
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
}

export interface StoryComment {
    id: string;
    userId: string;
    userName: string;
    content: string;
    timestamp: number;
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
    groupAvatar?: string;
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
    // Approval status (for Canon posts - entire story approval)
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    reviewedAt?: string;
    reviewedBy?: string;
    // Product link for brand posts
    productUrl?: string;
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
    setActiveWeeve: (id: string | null) => void;
    addGroup: (group: Group) => void;
    addTokens: (amount: number) => void;
    deductTokens: (amount: number) => boolean;
    setCurrentUser: (user: User | null) => void;
    setStories: (stories: Story[]) => void;
    setGroups: (groups: Group[]) => void;
    toggleStoryLike: (storyId: string) => Promise<void>;
    addStoryComment: (storyId: string, content: string) => Promise<void>;
    logoutUser: () => void;
    fetchFriends: () => Promise<void>;
    forkStory: (originalStoryId: string, slotIndices: number[], newParticipantId: string, contributionIdsToExclude?: string[], customTitle?: string, customDescription?: string) => Promise<{ success: boolean; storyId?: string; error?: string }>;
    fetchStories: () => Promise<void>;
    setProfileUpdateInProgress: (value: boolean) => void;

    // Saved Stories
    savedStoryIds: string[];
    toggleStorySave: (storyId: string) => Promise<void>;
    fetchSavedStories: () => Promise<void>;
}

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            currentUser: null,
            stories: [],
            activeWeeveId: null,
            friends: [],
            groups: [],
            profileUpdateInProgress: false,
            isStoriesLoading: false,
            savedStoryIds: [],

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
                set((state) => ({ stories: [story, ...state.stories] })),

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

            deductTokens: (amount) => {
                const state = get();
                if (state.currentUser && state.currentUser.tokens >= amount) {
                    set((state) => ({
                        currentUser: state.currentUser ? {
                            ...state.currentUser,
                            tokens: state.currentUser.tokens - amount,
                        } : null,
                    }));
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

            addStoryComment: async (storyId, content) => {
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
                    content: insertedComment.content,
                    timestamp: insertedComment.timestamp ?? timestamp,
                };

                // Send comment notification to story creator
                const state = get();
                const story = state.stories.find((s) => s.id === storyId);
                if (story && story.creatorId !== currentUser.id) {
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

            logoutUser: () => set({ 
                currentUser: null, 
                stories: [], 
                groups: [], 
                friends: [], 
                savedStoryIds: [],
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

            forkStory: async (originalStoryId: string, slotIndices: number[], newParticipantId: string, contributionIdsToExclude?: string[], customTitle?: string, customDescription?: string) => {
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
                            current_turn_user_id: newParticipantId, // Set turn to the new participant
                            // Always link to the ROOT original story, not the immediate parent
                            // If the story we're forking from is itself a fork, use its original reference
                            // This ensures all weeves in a chain point back to the originating post
                            forked_from_story_id: originalStory.forked_from_story_id || originalStoryId
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
                    
                    console.log('[forkStory] Original contributions:', sortedContributions.length);
                    console.log('[forkStory] slotIndices (to exclude):', slotIndices);
                    console.log('[forkStory] contributionIdsToExclude:', contributionIdsToExclude);
                    
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
                        
                        console.log(`[forkStory] Contribution ${originalIndex}: id=${c.id}, exclude=${shouldExclude}`);
                        
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
                    
                    console.log('[forkStory] Contributions to copy:', contributionsToCopy.length);

                    // 5. Build a map of slot index → user ID from contributions (this is the TRUE slot mapping)
                    // This tells us which user owns which slot based on contribution order
                    const slotToUserMap = new Map<number, string>();
                    sortedContributions.forEach((c: any, idx: number) => {
                        slotToUserMap.set(idx, c.user_id);
                    });
                    
                    // Determine which user IDs are being replaced based on selected slots
                    const replacedUserIds = new Set<string>();
                    slotIndices.forEach(slotIdx => {
                        const userId = slotToUserMap.get(slotIdx);
                        if (userId) {
                            replacedUserIds.add(userId);
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
                    
                    // Track which positions are being excluded (for new participant placement)
                    const excludedPositions: number[] = [];
                    sortedContributions.forEach((c: any, originalIndex: number) => {
                        const isExcluded = excludeIds.size > 0 
                            ? excludeIds.has(c.id)
                            : slotIndices.includes(originalIndex);
                        if (isExcluded) {
                            excludedPositions.push(originalIndex);
                        }
                    });
                    
                    // Create participants from KEPT CONTRIBUTIONS
                    contributionsToCopy.forEach((c: any) => {
                         // Derive position from timestamp (timestamp = (position + 1) * 1000000)
                         const position = Math.floor(c.timestamp / 1000000) - 1;
                         addParticipant(c.user_id, position, 'accepted');
                    });

                    // Add the new participant at the FIRST excluded position (where the first excluded contribution was)
                    // This ensures they're placed at the correct slot in the timeline
                    const newParticipantPosition = excludedPositions.length > 0 ? excludedPositions[0] : slotIndices[0];
                    
                    // The new participant is ALWAYS 'waiting' when forking - they need to add their content
                    // If user already exists from kept contributions, update to 'waiting' status at new position
                    participantsMap.set(newParticipantId, {
                        story_id: newStoryId,
                        user_id: newParticipantId,
                        position: newParticipantPosition,
                        status: 'waiting' // Always waiting - they need to add content to this slot
                    });

                    const participantsToInsert = Array.from(participantsMap.values());
                    console.log('[forkStory] About to insert participants:', JSON.stringify(participantsToInsert, null, 2));


                    const { error: participantsError } = await supabase
                        .from('story_participants')
                        .insert(participantsToInsert);

                    console.log('[forkStory] Participants insert completed, error:', participantsError?.message || 'none');

                    if (participantsError) {
                         console.error('[forkStory] Error adding participants:', participantsError);
                         // Rollback story
                         try { await supabase.from('stories').delete().eq('id', newStoryId); } catch {}
                         return { success: false, error: `Failed to add participants: ${participantsError.message}` };
                    }

                    // 6. Insert the copied contributions
                    console.log('[forkStory] About to insert contributions:', contributionsToCopy.length);
                    if (contributionsToCopy.length > 0) {
                        const { error: contributionsError } = await supabase
                            .from('contributions')
                            .insert(contributionsToCopy);

                        console.log('[forkStory] Contributions insert completed, error:', contributionsError?.message || 'none');

                        if (contributionsError) {
                            console.error('[forkStory] Error copying contributions:', contributionsError);
                        }
                    }

                    // Return success - the story page will fetch the story data when it loads
                    console.log('[forkStory] Fork completed successfully, storyId:', newStoryId);
                    return { success: true, storyId: newStoryId };

                } catch (err: any) {
                    console.error('Unexpected error in forkStory:', err);
                    return { success: false, error: `Unexpected error: ${err?.message || err}` };
                }
            },

            fetchStories: async () => {
                const { currentUser, isStoriesLoading } = get();

                // Deduplicate: Don't fetch if already fetching
                if (isStoriesLoading) {
                    console.log('[Store] fetchStories skipped - already loading');
                    return;
                }

                set({ isStoriesLoading: true });

                try {
                    // Helper to run query with timeout
                    const runQuery = async (timeoutMs: number) => {
                        const storiesQueryPromise = supabase
                            .from('stories')
                            .select(`
                                *,
                                contributions (*),
                                story_participants (
                                    *,
                                    profiles:user_id (id, name, avatar, is_influencer, is_private, is_brand)
                                ),
                                story_likes (user_id),
                                story_comments (
                                    *,
                                    profiles:user_id (name, avatar)
                                )
                            `)
                            .order('created_at', { ascending: false });

                        return Promise.race([
                            storiesQueryPromise,
                            new Promise<{ data: any[] | null; error: any }>((resolve) => 
                                setTimeout(() => resolve({ data: null, error: new Error(`Stories query timeout (${timeoutMs}ms)`) }), timeoutMs)
                            ),
                        ]);
                    };

                    // First attempt: Fail fast (5s) to detect dead socket
                    let result = await runQuery(5000);
                    let { data: storiesData, error } = result as { data: any[] | null; error: any };

                    // Auto-recovery: If failed, try refreshing session and retrying with patience (15s)
                    if (error) {
                        console.warn('[Store] fetchStories failed (attempt 1), attempting auto-recovery (refresh session + retry)...', error);
                        
                        // refreshing session can also hang on bad connection, so race it
                        const refreshPromise = supabase.auth.refreshSession();
                        const { error: refreshError } = await Promise.race([
                            refreshPromise,
                            new Promise<{ error: any }>(r => setTimeout(() => r({ error: new Error('Refresh timeout') }), 5000))
                        ]);
                        
                        if (!refreshError) {
                            console.log('[Store] Session refreshed, retrying fetchStories (attempt 2)...');
                            result = await runQuery(15000); // Give it more time on retry
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

                    // Log data reception for debugging
                    console.log(`[Store] fetchStories received ${storiesData?.length || 0} raw stories`);
                    if (!storiesData) { // Allow empty array, but check for null/undefined
                         console.warn('[Store] fetchStories: No data returned from Supabase query'); 
                         return;
                    }

                    const formattedStories: Story[] = storiesData
                        // Filter out stories we don't want on the public feed
                        .filter((s: any) => {
                            const currentUserId = get()?.currentUser?.id;

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
                                const isBrandPostCreator = currentUserId && (s.post_type === 'canon' || s.post_type === 'seed') && s.creator_id === currentUserId;
                                return hasContributions || isParticipant || isBrandPostCreator;
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
                        const comments = s.story_comments.map((cm: any) => ({
                            id: cm.id,
                            userId: cm.user_id,
                            userName: cm.user_name || cm.profiles?.name || 'Unknown',
                            content: cm.content,
                            timestamp: cm.timestamp
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
                            scheduledFor: s.scheduled_for ?? undefined
                        };
                    });

                    set({ stories: formattedStories });

                } catch (err) {
                    console.error('Failed to fetch stories:', err);
                } finally {
                    set({ isStoriesLoading: false });
                }
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
