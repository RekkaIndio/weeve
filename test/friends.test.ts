/**
 * Tests for friends.ts - Friend management functions.
 *
 * Note: Some functions have complex multi-table query chains that are
 * difficult to mock precisely. Tests focus on verifiable behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted for mock variables
const { mockSupabaseFrom } = vi.hoisted(() => ({
    mockSupabaseFrom: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: mockSupabaseFrom,
    },
}));

vi.mock('@/lib/notifications', () => ({
    notifyFriendRequest: vi.fn().mockResolvedValue(null),
}));

// Helper to create a fully-chained mock query builder
const createChainedMockBuilder = (finalData: any, finalError: any = null) => {
    const mockObj: any = {
        data: finalData,
        error: finalError,
    };
    
    // All chainable methods return self
    ['select', 'insert', 'upsert', 'update', 'delete', 'eq', 'neq', 'in', 'or', 'ilike', 'order', 'limit'].forEach(method => {
        mockObj[method] = vi.fn().mockReturnValue(mockObj);
    });
    
    // Terminal methods
    mockObj.single = vi.fn().mockResolvedValue({ data: finalData, error: finalError });
    mockObj.maybeSingle = vi.fn().mockResolvedValue({ data: finalData, error: finalError });
    
    return mockObj;
};

// Import after mocks
import {
    getFriends,
    addFriend,
    removeFriend,
    declineFriendRequest,
} from '@/lib/friends';

describe('getFriends', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns empty array when user has no friends (empty friendships)', async () => {
        const mock = createChainedMockBuilder([]);
        mockSupabaseFrom.mockReturnValue(mock);

        const friends = await getFriends('lonely-user');

        expect(friends).toEqual([]);
        expect(mockSupabaseFrom).toHaveBeenCalledWith('friendships');
    });

    it('calls supabase.from with friendships table', async () => {
        const mock = createChainedMockBuilder([]);
        mockSupabaseFrom.mockReturnValue(mock);

        await getFriends('user-123');

        expect(mockSupabaseFrom).toHaveBeenCalledWith('friendships');
    });
});

describe('addFriend', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls supabase.from with friendships table', async () => {
        const mock = createChainedMockBuilder(null);
        mockSupabaseFrom.mockReturnValue(mock);

        await addFriend('user-1', 'user-2');

        expect(mockSupabaseFrom).toHaveBeenCalledWith('friendships');
    });

    it('completes without throwing on success', async () => {
        const mock = createChainedMockBuilder(null);
        mock.insert = vi.fn().mockResolvedValue({ error: null });
        mockSupabaseFrom.mockReturnValue(mock);

        // Should not throw
        await expect(addFriend('user-1', 'user-2')).resolves.not.toThrow();
    });
});

describe('removeFriend', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls supabase.from with friendships table', async () => {
        const mock = createChainedMockBuilder(null);
        mockSupabaseFrom.mockReturnValue(mock);

        await removeFriend('user-1', 'user-2');

        expect(mockSupabaseFrom).toHaveBeenCalledWith('friendships');
    });

    it('completes without throwing on success', async () => {
        const mock = createChainedMockBuilder(null);
        mock.delete = vi.fn().mockReturnValue({
            or: vi.fn().mockResolvedValue({ error: null }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        // Should not throw
        await expect(removeFriend('user-1', 'user-2')).resolves.not.toThrow();
    });
});

describe('declineFriendRequest', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls supabase.from with friend_requests table', async () => {
        const mock = createChainedMockBuilder({ id: 'request-1', status: 'declined' });
        mockSupabaseFrom.mockReturnValue(mock);

        await declineFriendRequest('request-123');

        expect(mockSupabaseFrom).toHaveBeenCalledWith('friend_requests');
    });

    it('returns true on success', async () => {
        const mock = createChainedMockBuilder({ id: 'request-1', status: 'declined' });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await declineFriendRequest('request-123');

        expect(result).toBe(true);
    });

    it('returns false on error', async () => {
        const mock = createChainedMockBuilder(null, new Error('Decline failed'));
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await declineFriendRequest('request-123');

        expect(result).toBe(false);
    });
});
