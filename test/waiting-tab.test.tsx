import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ProfilePage from '@/app/(app)/profile/page';
import { useStore } from '@/lib/store';

// Mock dependencies
vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: () => ({
            select: vi.fn(),
            insert: vi.fn(),
            update: vi.fn(),
            eq: vi.fn(),
        }),
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        },
    },
    SUPABASE_URL: 'https://mock.supabase.co',
    SUPABASE_ANON_KEY: 'mock-key',
}));

vi.mock('@/lib/store');

// Mock child components to simplify testing
vi.mock('@/app/components/AestheticFallback', () => ({
    default: () => <div data-testid="aesthetic-fallback">Fallback</div>,
}));

vi.mock('@/app/components/VideoThumbnail', () => ({
    default: () => <div data-testid="video-thumbnail">Thumbnail</div>,
}));

vi.mock('@/app/components/VerificationBadge', () => ({
    default: () => <span data-testid="verification-badge" />,
}));

// Mock lucide-react to find icons easily
vi.mock('lucide-react', () => ({
    Settings: () => <div data-testid="icon-settings" />,
    Grid: () => <div data-testid="icon-grid" />,
    Bookmark: () => <div data-testid="icon-bookmark" />,
    Share2: () => <div data-testid="icon-share2" />,
    Wallet: () => <div data-testid="icon-wallet" />,
    UserPlus: () => <div data-testid="icon-userplus" />,
    X: () => <div data-testid="icon-x" />,
    Copy: () => <div data-testid="icon-copy" />,
    Check: () => <div data-testid="icon-check" />,
    Camera: () => <div data-testid="icon-camera" />,
    Clock: () => <div data-testid="icon-clock" />,
    Image: () => <div data-testid="icon-image" />,
}));

describe('ProfilePage Waiting Tab', () => {
    const mockCurrentUser = {
        id: 'user-123',
        name: 'Test User',
        avatar: 'https://example.com/avatar.png',
        tokens: 100,
    };

    const mockStory = {
        id: 'story-1',
        title: 'My Solo Story',
        description: 'A story with just me',
        creatorId: 'user-123',
        visibility: 'public',
        mode: 'invite',
        status: 'active',
        maxWeeves: 3,
        // The key scenario: 3 participants (all the user), 1 contribution.
        // It is NOT "completed" yet, but the participants array might be full if slots are pre-filled.
        participants: [
            { id: 'user-123', status: 'accepted' },
            { id: 'user-123', status: 'waiting' },
            { id: 'user-123', status: 'waiting' },
        ],
        contributions: [
            { id: 'c1', userId: 'user-123', content: 'First part' }
        ],
        currentTurnUserId: 'user-123',
        likedBy: [],
        comments: [],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            currentUser: mockCurrentUser,
            stories: [mockStory],
            friends: [],
            savedStoryIds: [],
            fetchFriends: vi.fn(),
            fetchStories: vi.fn(),
            fetchSavedStories: vi.fn(),
            setCurrentUser: vi.fn(),
            setProfileUpdateInProgress: vi.fn(),
        });
    });

    it('should show the story in the waiting tab when it is the users turn, even if participants list is full', async () => {
        render(<ProfilePage />);

        // Find the waiting tab by the clock icon
        const clockIcon = screen.getByTestId('icon-clock');
        const waitingTab = clockIcon.closest('button');

        if (!waitingTab) {
            throw new Error('Waiting tab button not found');
        }

        waitingTab.click();

        // The story should be visible in the list (shows content, not title)
        await waitFor(() => {
            expect(screen.getByText('First part')).toBeInTheDocument();
        });
    });
});
