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
    interactionCost?: number;
    inviteCode?: string;
    isPrivate?: boolean;
    isVerified?: boolean;
    verificationTier?: 'bronze' | 'silver' | 'gold' | null;
    verifiedAt?: string;
    lastNameChangeAt?: string;
    status?: 'accepted' | 'waiting' | 'declined'; // For story participants
    position?: number; // Slot position in the story
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
    created_at?: string;
    updated_at?: string;
}

interface AppState {
    currentUser: User | null;
    stories: Story[];
    activeWeeveId: string | null;
    friends: User[];
    groups: Group[];
    profileUpdateInProgress: boolean;

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
    forkStory: (originalStoryId: string, slotIndices: number[], newParticipantId: string, contributionIdsToExclude?: string[]) => Promise<{ success: boolean; storyId?: string; error?: string }>;
    fetchStories: () => Promise<void>;
    setProfileUpdateInProgress: (value: boolean) => void;

    // Saved Stories
    savedStoryIds: string[];
    toggleStorySave: (storyId: string) => Promise<void>;
    fetchSavedStories: () => Promise<void>;
}

const MOCK_USER: User = {
    id: 'me',
    name: 'Jay',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jay',
    tokens: 100,
    interactionCost: 0,
    inviteCode: 'JAY-VIP-2024',
    isPrivate: false,
};

const MOCK_FRIENDS: User[] = [
    { id: '1', name: 'Alice', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', tokens: 0 },
    { id: '2', name: 'Bob', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob', tokens: 0 },
    { id: '3', name: 'Carol', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol', tokens: 0 },
    {
        id: 'influencer1',
        name: 'Sarah Star',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahStar',
        tokens: 1000,
        isInfluencer: true,
        interactionCost: 50
    },
];

const MOCK_GROUPS: Group[] = [
    {
        id: 'g1',
        name: 'Gamers Unite',
        description: 'For all things gaming! 🎮',
        avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Gamers',
        memberCount: 1250,
        isPrivate: false,
    },
    {
        id: 'g2',
        name: 'Life & Chill',
        description: 'Just vibing and sharing life moments. 🌿',
        avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Life',
        memberCount: 840,
        isPrivate: false,
    },
    {
        id: 'g3',
        name: 'Tech Talk',
        description: 'Latest in tech and coding. 💻',
        avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Tech',
        memberCount: 560,
        isPrivate: true,
    },
];

const MOCK_STORIES: Story[] = [
    {
        id: 's1',
        title: 'Morning Routine',
        description: 'Show us how you start your day! ☀️',
        creatorId: '1',
        visibility: 'public',
        mode: 'invite',
        status: 'active',
        coverImage: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1000&auto=format&fit=crop',
        participants: [MOCK_FRIENDS[0], MOCK_USER],
        likes: 42,
        likedBy: ['1', 'me'],
        comments: [
            {
                id: 'cm1',
                userId: '1',
                userName: 'Alice',
                content: 'This routine is goals! 💪',
                timestamp: 1700000120000,
            },
        ],
        contributions: [
            {
                id: 'c1',
                userId: '1',
                userName: 'Alice',
                content: 'Coffee first, always. ☕️',
                mediaType: 'video',
                mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', // Placeholder video
                timestamp: 1700000000000, // Static timestamp
            },
            {
                id: 'c2',
                userId: 'me',
                userName: 'Jay',
                content: 'Then a quick run! 🏃‍♂️',
                mediaType: 'video',
                mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', // Placeholder video
                timestamp: 1700000100000, // Static timestamp
            },
        ],
    },
    {
        id: 's2',
        title: 'Travel Diaries',
        description: 'Where is the most beautiful place you have been?',
        creatorId: '2',
        visibility: 'private',
        mode: 'invite',
        status: 'active',
        currentTurnUserId: 'me',
        coverImage: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1000&auto=format&fit=crop',
        participants: [MOCK_FRIENDS[1], MOCK_USER, MOCK_FRIENDS[2]],
        likes: 18,
        likedBy: ['2', 'me'],
        comments: [
            {
                id: 'cm2',
                userId: '3',
                userName: 'Carol',
                content: 'Kyoto is on my list! 🍂',
                timestamp: 1700000250000,
            },
        ],
        contributions: [
            {
                id: 'c3',
                userId: '2',
                userName: 'Bob',
                content: 'Kyoto in autumn is magic. 🍁',
                mediaType: 'image',
                mediaUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1000&auto=format&fit=crop',
                timestamp: 1700000200000, // Static timestamp
            },
        ],
    },
    {
        id: 's3',
        title: 'Urban Jungle Adventure',
        description: 'Exploring the hidden gems of the city 🏙️',
        creatorId: 'me',
        visibility: 'public',
        mode: 'open',
        status: 'active',
        coverImage: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=1000&auto=format&fit=crop',
        participants: [MOCK_USER, MOCK_FRIENDS[0], MOCK_FRIENDS[1], MOCK_FRIENDS[2]],
        likes: 67,
        likedBy: ['me', '1', '2', '3'],
        comments: [
            {
                id: 'cm3',
                userId: '2',
                userName: 'Bob',
                content: 'Need to visit this rooftop spot! ☕',
                timestamp: 1700000650000,
            },
            {
                id: 'cm4',
                userId: '1',
                userName: 'Alice',
                content: 'Night market time! 🍜',
                timestamp: 1700000850000,
            },
        ],
        contributions: [
            {
                id: 'c3_1',
                userId: 'me',
                userName: 'Jay',
                content: 'Starting at the old train station 🚂',
                mediaType: 'video',
                mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                timestamp: 1700000300000, // Static timestamp
            },
            {
                id: 'c3_2',
                userId: '1',
                userName: 'Alice',
                content: 'Look at this graffiti art! 🎨',
                mediaType: 'image',
                mediaUrl: 'https://images.unsplash.com/photo-1517960413843-0aee8e2b3285?q=80&w=1000&auto=format&fit=crop',
                timestamp: 1700000400000, // Static timestamp
            },
            {
                id: 'c3_3',
                userId: '2',
                userName: 'Bob',
                content: 'Found a secret rooftop cafe ☕',
                mediaType: 'text',
                mediaUrl: undefined,
                timestamp: 1700000500000, // Static timestamp
            },
            {
                id: 'c3_4',
                userId: '3',
                userName: 'Carol',
                content: 'The view from up here is insane!',
                mediaType: 'video',
                mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
                timestamp: 1700000600000, // Static timestamp
            },
            {
                id: 'c3_5',
                userId: 'me',
                userName: 'Jay',
                content: 'Sunset vibes 🌅',
                mediaType: 'image',
                mediaUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1000&auto=format&fit=crop',
                timestamp: 1700000700000, // Static timestamp
            },
            {
                id: 'c3_6',
                userId: '1',
                userName: 'Alice',
                content: 'Heading to the night market now 🍜',
                mediaType: 'text',
                mediaUrl: undefined,
                timestamp: 1700000800000, // Static timestamp
            },
            {
                id: 'c3_7',
                userId: '2',
                userName: 'Bob',
                content: 'Live music on the street! 🎸',
                mediaType: 'video',
                mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
                timestamp: 1700000900000, // Static timestamp
            },
        ],
    },
    {
        id: 's4',
        title: 'Cooking Class',
        description: 'Learning to make pasta from scratch! 🍝',
        creatorId: 'me',
        visibility: 'public',
        mode: 'invite',
        status: 'completed',
        coverImage: 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?q=80&w=1000&auto=format&fit=crop',
        participants: [MOCK_USER, MOCK_FRIENDS[0]],
        likes: 9,
        likedBy: ['me'],
        comments: [],
        contributions: [
            {
                id: 'c4_1',
                userId: 'me',
                userName: 'Jay',
                content: 'Flour everywhere! 😂',
                mediaType: 'image',
                mediaUrl: 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?q=80&w=1000&auto=format&fit=crop',
                timestamp: 1700001000000,
            },
        ],
    },
    {
        id: 's5',
        title: 'Hiking Trip',
        description: 'Conquering the mountain peak 🏔️',
        creatorId: 'me',
        visibility: 'public',
        mode: 'invite',
        status: 'active',
        coverImage: 'https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=1000&auto=format&fit=crop',
        participants: [MOCK_USER, MOCK_FRIENDS[1], MOCK_FRIENDS[2]],
        likes: 25,
        likedBy: ['me', '2'],
        comments: [
            {
                id: 'cm5',
                userId: '2',
                userName: 'Bob',
                content: 'That view is unbelievable! 😍',
                timestamp: 1700001150000,
            },
        ],
        contributions: [
            {
                id: 'c5_1',
                userId: 'me',
                userName: 'Jay',
                content: 'The view is worth the climb!',
                mediaType: 'video',
                mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
                timestamp: 1700001100000,
            },
        ],
    },
    {
        id: 's6',
        title: 'Art Gallery Visit',
        description: 'Getting inspired by modern art 🎨',
        creatorId: 'me',
        visibility: 'public',
        mode: 'invite',
        status: 'completed',
        coverImage: 'https://images.unsplash.com/photo-1518998053901-5348d3969105?q=80&w=1000&auto=format&fit=crop',
        participants: [MOCK_USER],
        likes: 7,
        likedBy: ['me'],
        comments: [],
        contributions: [
            {
                id: 'c6_1',
                userId: 'me',
                userName: 'Jay',
                content: 'Abstract vibes.',
                mediaType: 'image',
                mediaUrl: 'https://images.unsplash.com/photo-1518998053901-5348d3969105?q=80&w=1000&auto=format&fit=crop',
                timestamp: 1700001200000,
            },
        ],
    },
    {
        id: 's7',
        title: 'Exclusive Masterclass',
        description: 'Premium content for aspiring creators. 🌟',
        creatorId: 'influencer1',
        visibility: 'public',
        mode: 'invite',
        status: 'active',
        coverImage: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1000&auto=format&fit=crop',
        participants: [MOCK_FRIENDS[3]],
        likes: 120,
        likedBy: ['me', '1', '2'],
        comments: [],
        contributions: [
            {
                id: 'c7_1',
                userId: 'influencer1',
                userName: 'Sarah Star',
                content: 'Welcome to my masterclass!',
                mediaType: 'video',
                mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
                timestamp: 1700001300000,
            },
        ],
        monetizationCost: 50,
    },
];

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            currentUser: null,
            stories: MOCK_STORIES,
            activeWeeveId: null,
            friends: [],
            groups: [],
            profileUpdateInProgress: false,
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

            logoutUser: () => set({ currentUser: null }),

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

            forkStory: async (originalStoryId: string, slotIndices: number[], newParticipantId: string, contributionIdsToExclude?: string[]) => {
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

                    // 2. Create new story (copy metadata)
                    const { data: newStoryData, error: createError } = await supabase
                        .from('stories')
                        .insert({
                            title: originalStory.title,
                            description: originalStory.description,
                            creator_id: currentUser.id, // The forker becomes the creator of the new branch
                            mode: originalStory.mode, // Copy mode from original story
                            visibility: 'private', // Set to private so it appears in waiting tab
                            status: 'active',
                            max_weeves: originalStory.max_weeves,
                            cover_image: originalStory.cover_image,
                            theme: originalStory.theme,
                            group_id: originalStory.group_id,
                            current_turn_user_id: newParticipantId // Set turn to the new participant
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

                    // 5. Build participant list with strict de-duplication
                    const participantsMap = new Map<string, any>();

                    // Helper to add participant
                    const addParticipant = (userId: string, position: number, status: 'accepted' | 'waiting') => {
                         // If user is already in the map, we generally keep the existing entry intact 
                         // unless we want to update status. For simplicity, we assume first valid entry wins 
                         // or we overwrite if needed. Here, we prioritize preserving the specific slot positions.
                        if (!participantsMap.has(userId)) {
                            participantsMap.set(userId, {
                                story_id: newStoryId,
                                user_id: userId,
                                position: position,
                                status: status
                            });
                        } else {
                            // If user already exists (e.g. contributing multiple times), check if we need to update anything.
                            // However, the DB schema usually has (story_id, user_id) unique. 
                            // So we just keep one entry.
                            // Ideally, a user can only have ONE 'position' in the participants table? 
                            // If `position` is important per-contribution, it should be on the contribution. 
                            // `story_participants.position` might be "initially invited slot".
                            // We will keep the FIRST encountered position for them.
                        }
                    };
                    
                    // Add participants for kept contributions
                    originalStory.story_participants.forEach((p: any) => {
                         // Only add if we're keeping at least one of their contributions AND they're not the new participant (yet)
                         if (keptUserIds.has(p.user_id) && p.user_id !== newParticipantId) {
                             addParticipant(p.user_id, p.position, 'accepted');
                         }
                    });

                    // Add the new participant
                    // They take the position of the FIRST selected slot (usually slotIndices[0])
                    const firstSelectedSlot = slotIndices[0];
                    
                    // If the new participant was already in the story (e.g. forking their own story to add more), 
                    // we need to make sure their status is updated or they are re-added correctly.
                    // Since we used a Map, simply setting them again will overwrite or we can check.
                    // For the "forking" context, they are jumping into a NEW slot, so they are 'waiting' for THAT slot.
                    // But if they already had 'accepted' content, they are technically 'accepted' in the story overall?
                    // The schema `status` is per-participant. If they have ANY content, they are 'accepted'.
                    // But for the purpose of the turn-based flow, if it's their turn, it implies they have work to do.
                    // However, `current_turn_user_id` on the story controls whose turn it is.
                    // So we can set them to 'accepted' if they already have content, or 'waiting' if not.
                    // But usually, if you fork, you are adding NEW content, so you are 'waiting' to add that.
                    
                    const isAlreadyContributor = keptUserIds.has(newParticipantId);
                    const newStatus = isAlreadyContributor ? 'accepted' : 'waiting';

                    // Update or Set the new participant entry
                    participantsMap.set(newParticipantId, {
                        story_id: newStoryId,
                        user_id: newParticipantId,
                        position: firstSelectedSlot,
                        status: newStatus 
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

                    // 7. Update local state
                    get().fetchStories();

                    return { success: true, storyId: newStoryId };

                } catch (err: any) {
                    console.error('Unexpected error in forkStory:', err);
                    return { success: false, error: `Unexpected error: ${err?.message || err}` };
                }
            },

            fetchStories: async () => {
                const { currentUser } = get();

                try {
                    const { data: storiesData, error } = await supabase
                        .from('stories')
                        .select(`
                            *,
                            contributions (*),
                            story_participants (
                                *,
                                profiles:user_id (id, name, avatar, is_influencer, is_private)
                            ),
                            story_likes (user_id),
                            story_comments (
                                *,
                                profiles:user_id (name, avatar)
                            )
                        `)
                        .order('created_at', { ascending: false });

                    if (error) {
                        console.error('Error fetching stories:', error);
                        return;
                    }

                    if (!storiesData) return;

                    const formattedStories: Story[] = storiesData
                        // Filter out stories we don't want on the public feed
                        .filter((s: any) => {
                            const currentUserId = get()?.currentUser?.id;

                            // For public stories, only show if they have at least 1 contribution OR the current user is a participant
                            if (s.visibility === 'public') {
                                const hasContributions = s.contributions && s.contributions.length > 0;
                                const isParticipant = currentUserId && (s.story_participants ?? []).some((p: any) => p.user_id === currentUserId);
                                return hasContributions || isParticipant;
                            }

                            // For private stories, hide those where the current user is a waiting participant
                            if (currentUserId) {
                                const isWaitingForCurrentUser = (s.story_participants ?? []).some((p: any) => p.user_id === currentUserId && p.status === 'waiting');
                                if (isWaitingForCurrentUser) {
                                    // This story belongs in the Waiting tab instead of the main feed
                                    return false;
                                }
                            }

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
                            status: s.status,
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
                            turnTimerHours: s.turn_timer_hours
                        };
                    });

                    set({ stories: formattedStories });

                } catch (err) {
                    console.error('Failed to fetch stories:', err);
                }
            },
        }),
        {
            name: 'weeve-storage',
            partialize: (state) => ({ currentUser: state.currentUser }), // Only persist currentUser
        }
    ));
