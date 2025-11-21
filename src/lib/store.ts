import { create } from 'zustand';

export interface User {
    id: string;
    name: string;
    avatar?: string;
    tokens: number;
    isInfluencer?: boolean;
    interactionCost?: number;
    inviteCode?: string;
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

export interface Contribution {
    id: string;
    userId: string;
    userName: string;
    content: string; // Caption or text content
    mediaType: MediaType;
    mediaUrl?: string; // URL for video or image
    timestamp: number;
}

export interface Story {
    id: string;
    title: string;
    description: string;
    creatorId: string;
    mode: 'invite' | 'open';
    status: 'active' | 'completed';
    currentTurnUserId?: string;
    contributions: Contribution[];
    participants: User[];
    maxWeeves?: number;
    coverImage?: string; // Thumbnail for the story
    theme?: string; // Visual theme for the story
}

interface AppState {
    currentUser: User;
    stories: Story[];
    activeWeeveId: string | null;
    friends: User[];
    groups: Group[];

    addStory: (story: Story) => void;
    addContribution: (storyId: string, content: string, mediaType: MediaType, mediaUrl?: string) => void;
    updateStory: (id: string, updates: Partial<Story>) => void;
    setActiveWeeve: (id: string | null) => void;
    addGroup: (group: Group) => void;
    addTokens: (amount: number) => void;
    deductTokens: (amount: number) => boolean;
    setCurrentUser: (user: User) => void;
    logoutUser: () => void;
}

const MOCK_USER: User = {
    id: 'me',
    name: 'Jay',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jay',
    tokens: 100,
    inviteCode: 'JAY-VIP-2024',
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
        mode: 'open',
        status: 'active',
        coverImage: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1000&auto=format&fit=crop',
        participants: [MOCK_FRIENDS[0], MOCK_USER],
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
        mode: 'invite',
        status: 'active',
        currentTurnUserId: 'me',
        coverImage: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1000&auto=format&fit=crop',
        participants: [MOCK_FRIENDS[1], MOCK_USER, MOCK_FRIENDS[2]],
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
        mode: 'open',
        status: 'active',
        coverImage: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=1000&auto=format&fit=crop',
        participants: [MOCK_USER, MOCK_FRIENDS[0], MOCK_FRIENDS[1], MOCK_FRIENDS[2]],
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
        mode: 'open',
        status: 'completed',
        coverImage: 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?q=80&w=1000&auto=format&fit=crop',
        participants: [MOCK_USER, MOCK_FRIENDS[0]],
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
        mode: 'open',
        status: 'active',
        coverImage: 'https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=1000&auto=format&fit=crop',
        participants: [MOCK_USER, MOCK_FRIENDS[1], MOCK_FRIENDS[2]],
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
        mode: 'open',
        status: 'completed',
        coverImage: 'https://images.unsplash.com/photo-1518998053901-5348d3969105?q=80&w=1000&auto=format&fit=crop',
        participants: [MOCK_USER],
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

export const useStore = create<AppState>((set, get) => ({
    currentUser: MOCK_USER,
    stories: MOCK_STORIES,
    activeWeeveId: null,
    friends: MOCK_FRIENDS,
    groups: MOCK_GROUPS,

    addStory: (story) =>
        set((state) => ({ stories: [story, ...state.stories] })),

    addGroup: (group) =>
        set((state) => ({ groups: [group, ...state.groups] })),

    addContribution: (storyId, content, mediaType, mediaUrl) =>
        set((state) => {
            const storyIndex = state.stories.findIndex((s) => s.id === storyId);
            if (storyIndex === -1) return state;

            const newContribution: Contribution = {
                id: Math.random().toString(36).substr(2, 9),
                userId: state.currentUser.id,
                userName: state.currentUser.name,
                content,
                mediaType,
                mediaUrl,
                timestamp: Date.now(), // Safe to use Date.now() here as this only runs client-side after hydration
            };

            const updatedStories = [...state.stories];
            updatedStories[storyIndex] = {
                ...updatedStories[storyIndex],
                contributions: [...updatedStories[storyIndex].contributions, newContribution],
                currentTurnUserId:
                    updatedStories[storyIndex].mode === 'invite'
                        ? (() => {
                            const participants = updatedStories[storyIndex].participants;
                            const currentIndex = participants.findIndex(p => p.id === state.currentUser.id);
                            if (currentIndex === -1) return undefined;
                            const nextIndex = (currentIndex + 1) % participants.length;
                            return participants[nextIndex].id;
                        })()
                        : undefined
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
        set((state) => ({
            currentUser: {
                ...state.currentUser,
                tokens: state.currentUser.tokens + amount,
            },
        })),

    deductTokens: (amount) => {
        const state = get();
        if (state.currentUser.tokens >= amount) {
            set((state) => ({
                currentUser: {
                    ...state.currentUser,
                    tokens: state.currentUser.tokens - amount,
                },
            }));
            return true;
        }
        return false;
    },

    setCurrentUser: (user) => set({ currentUser: user }),

    logoutUser: () => set({ currentUser: { id: 'guest', name: 'Guest', tokens: 0 } }),
}));
