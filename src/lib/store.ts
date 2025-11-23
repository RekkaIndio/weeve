import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase';
import { getFriends } from './friends';

export interface User {
    id: string;
    name: string;
    avatar?: string;
    tokens: number;
    isInfluencer?: boolean;
    interactionCost?: number;
    inviteCode?: string;
    isPrivate?: boolean;
}

export interface Group {
    id: string;
    name: string;
    description: string;
    avatar: string;
    memberCount: number;
    isPrivate: boolean;
}

export type MediaType = 'video' | 'image' | 'text';

export interface TextStyle {
    fontFamily: string;
    fontSize: number;
    textColor: string;
    backgroundColor: string;
    textAlign: 'left' | 'center' | 'right';
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
    status: 'active' | 'completed';
    currentTurnUserId?: string;
    contributions: Contribution[];
    participants: User[];
    maxWeeves?: number;
    coverImage?: string; // Thumbnail for the story
    theme?: string; // Visual theme for the story
    groupId?: string;
    groupAvatar?: string;
    likes: number;
    likedBy: string[];
    comments: StoryComment[];
}

interface AppState {
    currentUser: User | null;
    stories: Story[];
    activeWeeveId: string | null;
    friends: User[];
    groups: Group[];

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
];

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            currentUser: null,
            stories: MOCK_STORIES,
            activeWeeveId: null,
            friends: [],
            groups: [],

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

                    const updatedStories = [...state.stories];
                    updatedStories[storyIndex] = {
                        ...currentStory,
                        contributions: updatedContributions,
                        currentTurnUserId: nextTurnUserId,
                        status: reachedCapacity ? 'completed' : currentStory.status,
                    };

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
        }),
        {
            name: 'weeve-storage',
            partialize: (state) => ({ currentUser: state.currentUser }), // Only persist currentUser
        }
    ));
