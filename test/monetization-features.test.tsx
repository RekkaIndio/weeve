
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import FeedItem from '@/app/components/FeedItem';
import type { Story, User } from '@/lib/store';

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

vi.mock('sonner', () => ({
    toast: Object.assign(vi.fn(), {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
    }),
}));

// Mock zustand store
const mockCurrentUser: User = {
    id: 'current-user-123',
    name: 'Test User',
    avatar: 'https://example.com/avatar.png',
    tokens: 100,
    preferences: { monetization_enabled: true },
};

const mockFriends: User[] = [
    { id: 'friend-1', name: 'Alice', avatar: 'https://example.com/alice.png', tokens: 50 },
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
    description: 'A test story',
    creatorId: 'creator-456',
    visibility: 'public',
    mode: 'invite',
    status: 'active',
    contributions: [],
    participants: [],
    maxWeeves: 3,
    likes: 10,
    likedBy: [],
    comments: [],
    ...overrides,
});

describe('Monetization Features Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockStoreState = {
            currentUser: { ...mockCurrentUser },
            friends: mockFriends,
            savedStoryIds: [],
        };
    });

    const renderFeedItem = async (story: Story) => {
        let result;
        await act(async () => {
            result = render(<FeedItem story={story} />);
        });
        return result!;
    };

    describe('Monetization Disabled Flow', () => {
        it('shows Weeve button even when monetization is disabled', async () => {
            mockStoreState.currentUser = {
                ...mockCurrentUser,
                preferences: { monetization_enabled: false }
            };

            const monetizedStory = createMockStory({
                monetizationCost: 10,
            });

            await renderFeedItem(monetizedStory);

            const weeveButton = screen.getByRole('button', { name: /fork story/i });
            expect(weeveButton).toBeInTheDocument();
        });

        it('shows "Enable Monetization" modal when clicking Weeve button with monetization disabled', async () => {
            mockStoreState.currentUser = {
                ...mockCurrentUser,
                preferences: { monetization_enabled: false }
            };

            const monetizedStory = createMockStory({
                monetizationCost: 10,
            });

            await renderFeedItem(monetizedStory);

            const weeveButton = screen.getByRole('button', { name: /fork story/i });
            await act(async () => {
                fireEvent.click(weeveButton);
            });

            expect(screen.getByText('Enable Monetization')).toBeInTheDocument();
            expect(screen.getByText(/Please enable monetization features in your settings/i)).toBeInTheDocument();
            expect(screen.getByRole('link', { name: /go to settings/i })).toBeInTheDocument();
        });
    });

    describe('Insufficient Funds Flow', () => {
        it('shows "Get More Tokens" modal when user has insufficient tokens', async () => {
            mockStoreState.currentUser = {
                ...mockCurrentUser,
                tokens: 5,
                preferences: { monetization_enabled: true }
            };

            const expensiveStory = createMockStory({
                monetizationCost: 10,
            });

            await renderFeedItem(expensiveStory);

            const weeveButton = screen.getByRole('button', { name: /fork story/i });
            await act(async () => {
                fireEvent.click(weeveButton);
            });

            expect(screen.getByText('Get More Tokens')).toBeInTheDocument();
            expect(screen.getByRole('link', { name: /get tokens/i })).toBeInTheDocument();
        });
    });

    describe('Successful Payment Flow', () => {
        it('shows confirmation modal when user has sufficient tokens and monetization enabled', async () => {
            mockStoreState.currentUser = {
                ...mockCurrentUser,
                tokens: 100,
                preferences: { monetization_enabled: true }
            };

            const monetizedStory = createMockStory({
                monetizationCost: 10,
            });

            await renderFeedItem(monetizedStory);

            const weeveButton = screen.getByRole('button', { name: /fork story/i });
            await act(async () => {
                fireEvent.click(weeveButton);
            });

            expect(screen.getByText('Contribute to this Story')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Pay 10 Tokens & Weeve/i })).toBeInTheDocument();
        });

        it('deducts tokens and opens forking overlay when confirming payment', async () => {
            mockStoreState.currentUser = {
                ...mockCurrentUser,
                tokens: 100,
                preferences: { monetization_enabled: true }
            };

            const monetizedStory = createMockStory({
                monetizationCost: 10,
                creatorId: 'creator-456'
            });

            await renderFeedItem(monetizedStory);

            const weeveButton = screen.getByRole('button', { name: /fork story/i });
            await act(async () => {
                fireEvent.click(weeveButton);
            });

            const payButton = screen.getByRole('button', { name: /Pay 10 Tokens & Weeve/i });
            await act(async () => {
                fireEvent.click(payButton);
            });

            expect(mockDeductTokens).toHaveBeenCalledWith(10, 'creator-456');
            // Should transition to Weeve In overlay
            expect(screen.getByText('Weeve In')).toBeInTheDocument();
        });
    });
});
