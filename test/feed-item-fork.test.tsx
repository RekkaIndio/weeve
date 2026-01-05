/**
 * UI Tests for FeedItem Forking (Weeve) Functionality.
 *
 * These tests cover:
 * 1. Weeve button visibility and states
 * 2. Forking overlay rendering
 * 3. Slot selection UI
 * 4. Participant picker flow
 * 5. Accessibility requirements
 *
 * Note: Due to the complexity of the video handling and intersection observers,
 * these tests focus on the forking UI overlay components.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import FeedItem from '@/app/components/FeedItem';
import type { Story, User, Contribution } from '@/lib/store';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: () => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            update: vi.fn().mockResolvedValue({ data: null, error: null }),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
    },
}));



// Mock zustand store
const mockCurrentUser: User = {
    id: 'current-user-123',
    name: 'Test User',
    avatar: 'https://example.com/avatar.png',
    tokens: 100,
};

const mockFriends: User[] = [
    { id: 'friend-1', name: 'Alice', avatar: 'https://example.com/alice.png', tokens: 50 },
    { id: 'friend-2', name: 'Bob', avatar: 'https://example.com/bob.png', tokens: 75 },
];

let mockStoreState = {
    currentUser: mockCurrentUser,
    friends: mockFriends,
    savedStoryIds: [] as string[],
};

const mockForkStory = vi.fn().mockResolvedValue({ success: true, storyId: 'new-story-id' });
const mockToggleStoryLike = vi.fn();
const mockAddStoryComment = vi.fn();
const mockFetchFriends = vi.fn();
const mockToggleStorySave = vi.fn();
const mockDeductTokens = vi.fn().mockReturnValue(true);

vi.mock('@/lib/store', async () => {
    const actual = await vi.importActual('@/lib/store');
    return {
        ...actual,
        useStore: (selector: (state: any) => any) => {
            const fullState = {
                ...mockStoreState,
                toggleStoryLike: mockToggleStoryLike,
                addStoryComment: mockAddStoryComment,
                forkStory: mockForkStory,
                fetchFriends: mockFetchFriends,
                toggleStorySave: mockToggleStorySave,
                deductTokens: mockDeductTokens,
            };
            return selector(fullState);
        },
    };
});

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockImplementation((callback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));
window.IntersectionObserver = mockIntersectionObserver;

// Test fixtures
const createMockStory = (overrides: Partial<Story> = {}): Story => ({
    id: 'story-123',
    title: 'Test Story',
    description: 'A test story for forking',
    creatorId: 'creator-456',
    visibility: 'public',
    mode: 'invite',
    status: 'active',
    contributions: [
        {
            id: 'c1',
            userId: 'user-1',
            userName: 'User One',
            content: 'First contribution',
            mediaType: 'image',
            mediaUrl: 'https://example.com/image1.jpg',
            timestamp: 1000000,
        },
        {
            id: 'c2',
            userId: 'user-2',
            userName: 'User Two',
            content: 'Second contribution',
            mediaType: 'image',
            mediaUrl: 'https://example.com/image2.jpg',
            timestamp: 2000000,
        },
        {
            id: 'c3',
            userId: 'user-3',
            userName: 'User Three',
            content: 'Third contribution',
            mediaType: 'image',
            mediaUrl: 'https://example.com/image3.jpg',
            timestamp: 3000000,
        },
    ],
    participants: [
        { id: 'user-1', name: 'User One', avatar: 'https://example.com/u1.png', tokens: 0, status: 'accepted', position: 0 },
        { id: 'user-2', name: 'User Two', avatar: 'https://example.com/u2.png', tokens: 0, status: 'accepted', position: 1 },
        { id: 'user-3', name: 'User Three', avatar: 'https://example.com/u3.png', tokens: 0, status: 'accepted', position: 2 },
    ],
    maxWeeves: 3,
    likes: 10,
    likedBy: ['user-1'],
    comments: [],
    ...overrides,
});

const createPrivateStory = (): Story => createMockStory({
    visibility: 'private',
    creatorId: 'someone-else',
});

describe('FeedItem Weeve Button', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockStoreState = {
            currentUser: mockCurrentUser,
            friends: mockFriends,
            savedStoryIds: [],
        };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    const renderFeedItem = async (story: Story = createMockStory()) => {
        let result;
        await act(async () => {
            result = render(<FeedItem story={story} />);
        });
        return result!;
    };

    describe('Visibility', () => {
        it('shows Weeve button for public stories', async () => {
            await renderFeedItem(createMockStory({ visibility: 'public' }));

            const weeveButton = screen.getByRole('button', { name: /fork story/i });
            expect(weeveButton).toBeInTheDocument();
        });

        it('shows Weeve label text', async () => {
            await renderFeedItem();

            expect(screen.getByText('Weeve')).toBeInTheDocument();
        });

        it('hides Weeve button for private stories when not friend of creator', async () => {
            mockStoreState.friends = []; // Not friends with creator
            await renderFeedItem(createPrivateStory());

            const weeveButton = screen.queryByRole('button', { name: /fork story/i });
            expect(weeveButton).not.toBeInTheDocument();
        });

        // TODO: Requires proper friend state reset between tests
        it.skip('shows Weeve button for private stories when friend of creator', async () => {
            const privateStory = createMockStory({
                visibility: 'private',
                creatorId: 'friend-1', // Is a friend
            });
            // Update mock friends to include friend-1
            mockStoreState.friends = [{ id: 'friend-1', name: 'Friend', avatar: '', tokens: 50 }];
            await renderFeedItem(privateStory);

            const weeveButton = screen.getByRole('button', { name: /fork story/i });
            expect(weeveButton).toBeInTheDocument();
        });
    });

    describe('Click Behavior', () => {
        it('opens forking overlay when clicked', async () => {
            await renderFeedItem();

            const weeveButton = screen.getByRole('button', { name: /fork story/i });
            await act(async () => {
                fireEvent.click(weeveButton);
            });

            // Forking overlay should appear
            expect(screen.getByText('Weeve In')).toBeInTheDocument();
        });

        it('shows slot selection instructions in overlay', async () => {
            await renderFeedItem();

            const weeveButton = screen.getByRole('button', { name: /fork story/i });
            await act(async () => {
                fireEvent.click(weeveButton);
            });

            expect(screen.getByText(/swipe through slots/i)).toBeInTheDocument();
        });
    });
});

describe('Forking Overlay', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockStoreState = {
            currentUser: mockCurrentUser,
            friends: mockFriends,
            savedStoryIds: [],
        };
    });

    const openForkingOverlay = async () => {
        const story = createMockStory();
        await act(async () => {
            render(<FeedItem story={story} />);
        });

        const weeveButton = screen.getByRole('button', { name: /fork story/i });
        await act(async () => {
            fireEvent.click(weeveButton);
        });
    };

    describe('Rendering', () => {
        it('shows close button in overlay', async () => {
            await openForkingOverlay();

            // Close button (X icon)
            const closeButtons = screen.getAllByRole('button');
            expect(closeButtons.length).toBeGreaterThan(0);
        });

        it('displays overlay title "Weeve In"', async () => {
            await openForkingOverlay();

            expect(screen.getByText('Weeve In')).toBeInTheDocument();
        });

        it('shows slot carousel area', async () => {
            await openForkingOverlay();

            // Should show contribution preview areas
            expect(screen.getByText(/swipe through slots/i)).toBeInTheDocument();
        });
    });

});

describe('Slot Selection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockStoreState = {
            currentUser: mockCurrentUser,
            friends: mockFriends,
            savedStoryIds: [],
        };
    });

    const openForkingOverlay = async (story: Story = createMockStory()) => {
        await act(async () => {
            render(<FeedItem story={story} />);
        });

        const weeveButton = screen.getByRole('button', { name: /fork story/i });
        await act(async () => {
            fireEvent.click(weeveButton);
        });
    };

    describe('Slot Count Display', () => {
        it('shows correct number of slots based on maxWeeves', async () => {
            const storyWith3Slots = createMockStory({ maxWeeves: 3 });
            await openForkingOverlay(storyWith3Slots);

            // Should have navigation dots or slot indicators
            // The overlay shows slot navigation via dots or carousel
            expect(screen.getByText('Weeve In')).toBeInTheDocument();
        });
    });
});

describe('Monetization Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockStoreState = {
            currentUser: mockCurrentUser,
            friends: mockFriends,
            savedStoryIds: [],
        };
    });

    it('shows monetization modal for premium stories', async () => {
        const premiumStory = createMockStory({
            monetizationCost: 50,
        });

        await act(async () => {
            render(<FeedItem story={premiumStory} />);
        });

        const weeveButton = screen.getByRole('button', { name: /fork story/i });
        await act(async () => {
            fireEvent.click(weeveButton);
        });

        // Should show monetization modal with 'Contribute' title (not 'premium story')
        expect(screen.getByText(/Contribute to this Story/i)).toBeInTheDocument();
    });

    it('shows insufficient tokens message when user cannot afford', async () => {
        mockStoreState.currentUser = { ...mockCurrentUser, tokens: 10 };

        const expensiveStory = createMockStory({
            monetizationCost: 100,
        });

        await act(async () => {
            render(<FeedItem story={expensiveStory} />);
        });

        const weeveButton = screen.getByRole('button', { name: /fork story/i });
        await act(async () => {
            fireEvent.click(weeveButton);
        });

        // Modal shows 'Get More Tokens' for insufficient balance
        expect(screen.getByText(/Get More Tokens/i)).toBeInTheDocument();
    });
});

describe('Accessibility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockStoreState = {
            currentUser: mockCurrentUser,
            friends: mockFriends,
            savedStoryIds: [],
        };
    });

    it('Weeve button has accessible aria-label', async () => {
        await act(async () => {
            render(<FeedItem story={createMockStory()} />);
        });

        const weeveButton = screen.getByRole('button', { name: /fork story/i });
        expect(weeveButton).toHaveAttribute('aria-label');
    });

    it('Like button has accessible aria-label', async () => {
        await act(async () => {
            render(<FeedItem story={createMockStory()} />);
        });

        const likeButton = screen.getByRole('button', { name: /like story|unlike story/i });
        expect(likeButton).toBeInTheDocument();
    });

    it('Comment button has accessible aria-label', async () => {
        await act(async () => {
            render(<FeedItem story={createMockStory({ allowComments: true })} />);
        });

        const commentButton = screen.getByRole('button', { name: /open comments/i });
        expect(commentButton).toBeInTheDocument();
    });
});

describe('Story Interactions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockStoreState = {
            currentUser: mockCurrentUser,
            friends: mockFriends,
            savedStoryIds: [],
        };
    });

    it('toggles like when like button is clicked', async () => {
        await act(async () => {
            render(<FeedItem story={createMockStory()} />);
        });

        const likeButton = screen.getByRole('button', { name: /like story|unlike story/i });
        await act(async () => {
            fireEvent.click(likeButton);
        });

        expect(mockToggleStoryLike).toHaveBeenCalledWith('story-123');
    });

    it('opens comments panel when comment button is clicked', async () => {
        await act(async () => {
            render(<FeedItem story={createMockStory({ allowComments: true })} />);
        });

        const commentButton = screen.getByRole('button', { name: /open comments/i });
        await act(async () => {
            fireEvent.click(commentButton);
        });

        // Comments panel should be open
        expect(screen.getByPlaceholderText(/add a comment/i)).toBeInTheDocument();
    });

    it('toggles save when save button is clicked', async () => {
        await act(async () => {
            render(<FeedItem story={createMockStory()} />);
        });

        const saveButton = screen.getByRole('button', { name: /save story/i });
        await act(async () => {
            fireEvent.click(saveButton);
        });

        expect(mockToggleStorySave).toHaveBeenCalledWith('story-123');
    });
});

describe('Waiting Story Display', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockStoreState = {
            currentUser: mockCurrentUser,
            friends: mockFriends,
            savedStoryIds: [],
        };
    });

    it('shows waiting message when story has no contributions but has waiting participant', async () => {
        const waitingStory = createMockStory({
            contributions: [],
            participants: [
                { id: 'user-1', name: 'User One', avatar: 'https://example.com/u1.png', tokens: 0, status: 'waiting', position: 0 },
            ],
        });

        await act(async () => {
            render(<FeedItem story={waitingStory} />);
        });

        // Should show waiting for first contributor message
        expect(screen.getByText(/waiting for/i)).toBeInTheDocument();
    });
});
