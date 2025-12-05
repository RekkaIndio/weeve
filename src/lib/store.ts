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
    forkStory: (originalStoryId: string, slotIndex: number, newParticipantId: string) => Promise<{ success: boolean; storyId?: string; error?: string }>;
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

                set({ savedStoryIds: data.map(item => item.story_id) });
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
                        return {
                            ...story,
                            contributions: updatedContributions,
                            currentTurnUserId: nextTurnUserId,
                            status: reachedCapacity ? 'completed' : story.status,
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

            setCurrentUser: (user) => set({ currentUser: user }),

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
                if (!currentUser) return;
                const friends = await getFriends(currentUser.id);
                set({ friends });
            },

            forkStory: async (originalStoryId: string, slotIndex: number, newParticipantId: string) => {
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
                            visibility: 'public', // Default to public for now
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

                    // 3. Copy participants and update the target slot
                    // First, filter out the new participant if they already exist in any position
                    // to avoid duplicate user constraint violations
                    const filteredParticipants = originalStory.story_participants.filter((p: any) =>
                        p.user_id !== newParticipantId
                    );

                    let slotFilled = false;
                    const participants = filteredParticipants.map((p: any) => {
                        // Check if this is the slot we are replacing
                        if (p.position === slotIndex) {
                            slotFilled = true;
                            return {
                                story_id: newStoryId,
                                user_id: newParticipantId,
                                position: p.position,
                                status: 'waiting', // New participant is waiting
                            };
                        }
                        return {
                            story_id: newStoryId,
                            user_id: p.user_id,
                            position: p.position,
                            status: p.status,
                        };
                    });

                    // If the slot was empty (no existing participant at that position), add the new participant
                    if (!slotFilled) {
                        participants.push({
                            story_id: newStoryId,
                            user_id: newParticipantId,
                            position: slotIndex,
                            status: 'waiting',
                        });
                    }

                    const { error: participantsError } = await supabase
                        .from('story_participants')
                        .insert(participants);

                    if (participantsError) {
                        console.error('Error adding participants:', participantsError);
                        // Should probably delete the story if this fails
                        return { success: false, error: `Failed to add participants: ${participantsError.message}` };
                    }

                    // 4. Copy contributions (excluding the one at the replaced slot)
                    // We need to identify which contribution belongs to the replaced slot.
                    // This is tricky if contributions aren't explicitly linked to slots/positions.
                    // Strategy: Filter out contributions by the user who was at that slot in the original story.

                    // Find the user ID of the participant at the target slot in the original story
                    const originalParticipant = originalStory.story_participants.find((p: any) => p.position === slotIndex);
                    const originalParticipantId = originalParticipant?.user_id;

                    const contributionsToCopy = originalStory.contributions
                        .filter((c: any) => c.user_id !== originalParticipantId)
                        .map((c: any) => ({
                            story_id: newStoryId,
                            user_id: c.user_id,
                            user_name: c.user_name,
                            content: c.content,
                            media_type: c.media_type,
                            media_url: c.media_url,
                            timestamp: c.timestamp,
                            text_style: c.text_style
                        }));

                    if (contributionsToCopy.length > 0) {
                        const { error: contributionsError } = await supabase
                            .from('contributions')
                            .insert(contributionsToCopy);

                        if (contributionsError) {
                            console.error('Error copying contributions:', contributionsError);
                            // Not critical enough to fail the whole fork, but worth noting
                        }
                    }

                    // 5. Update local state (fetch the new story to ensure full data)
                    // For now, we can just trigger a fetchStories or manually construct it.
                    // Let's manually construct to be fast.
                    // Actually, simpler to just return the ID and let the UI redirect or refresh.
                    // But we should update the store.

                    // We'll rely on fetchStories for now as constructing the full object with profiles is tedious here.
                    // Or we can add a simple version.

                    // Let's trigger a fetch in the background
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
                                profiles:user_id (id, name, avatar, is_influencer)
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
                        // Filter out public stories with no contributions (better UX - hide empty posts from feed)
                        .filter((s: any) => {
                            // Always show private stories (for invited participants)
                            if (s.visibility === 'private') return true;
                            // For public stories, only show if they have at least 1 contribution
                            return s.contributions && s.contributions.length > 0;
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
                                status: sp.status,
                                position: sp.position
                            };
                        }).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));

                        // Map contributions
                        const contributions = s.contributions.map((c: any) => ({
                            id: c.id,
                            userId: c.user_id,
                            userName: c.user_name,
                            content: c.content,
                            mediaType: c.media_type,
                            mediaUrl: c.media_url,
                            timestamp: c.timestamp,
                            textStyle: c.text_style
                        }));

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
