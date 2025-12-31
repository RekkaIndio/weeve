/**
 * Tests for blocked.ts - Block/unblock user functions.
 *
 * These tests cover:
 * 1. isUserBlocked - Check if one user has blocked another
 * 2. blockUser - Block a user
 * 3. unblockUser - Unblock a user
 * 4. getBlockedUserIds - Get list of blocked users
 * 5. getBlockedByUserIds - Get list of users who blocked current user
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

// Helper to create chained mock query builder
const createChainedMock = (finalData: any, finalError: any = null) => {
    const mockObj: any = {
        data: finalData,
        error: finalError,
    };
    
    ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'match', 'order', 'limit'].forEach(method => {
        mockObj[method] = vi.fn().mockReturnValue(mockObj);
    });
    
    mockObj.single = vi.fn().mockResolvedValue({ data: finalData, error: finalError });
    mockObj.maybeSingle = vi.fn().mockResolvedValue({ data: finalData, error: finalError });
    
    return mockObj;
};

// Import after mocks
import {
    isUserBlocked,
    blockUser,
    unblockUser,
    getBlockedUserIds,
    getBlockedByUserIds,
} from '@/lib/blocked';

describe('isUserBlocked', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns true when user is blocked', async () => {
        const mock = createChainedMock({ id: 'block-1' });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await isUserBlocked('blocker-123', 'blocked-456');

        expect(result).toBe(true);
        expect(mockSupabaseFrom).toHaveBeenCalledWith('blocked_users');
    });

    it('returns false when user is not blocked', async () => {
        const mock = createChainedMock(null);
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await isUserBlocked('user-123', 'user-456');

        expect(result).toBe(false);
    });

    it('returns false on error', async () => {
        const mock = createChainedMock(null, new Error('Database error'));
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await isUserBlocked('user-123', 'user-456');

        expect(result).toBe(false);
    });
});

describe('blockUser', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns true when user is already blocked', async () => {
        // First call checks if already blocked (returns true)
        const mock = createChainedMock({ id: 'block-1' });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await blockUser('blocker-123', 'blocked-456');

        expect(result).toBe(true);
    });

    it('blocks user successfully when not already blocked', async () => {
        let callCount = 0;
        mockSupabaseFrom.mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
                // isUserBlocked check returns null (not blocked)
                const mock = createChainedMock(null);
                return mock;
            }
            // Insert block record
            const mock = createChainedMock(null);
            mock.insert = vi.fn().mockResolvedValue({ error: null });
            return mock;
        });

        const result = await blockUser('blocker-123', 'blocked-456');

        expect(result).toBe(true);
    });

    it('returns false on insert error', async () => {
        let callCount = 0;
        mockSupabaseFrom.mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
                return createChainedMock(null);
            }
            const mock = createChainedMock(null);
            mock.insert = vi.fn().mockResolvedValue({ error: new Error('Insert failed') });
            return mock;
        });

        const result = await blockUser('blocker-123', 'blocked-456');

        expect(result).toBe(false);
    });
});

describe('unblockUser', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('unblocks user successfully', async () => {
        const mock = createChainedMock(null);
        mock.delete = vi.fn().mockReturnValue({
            match: vi.fn().mockResolvedValue({ error: null }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await unblockUser('blocker-123', 'blocked-456');

        expect(result).toBe(true);
        expect(mockSupabaseFrom).toHaveBeenCalledWith('blocked_users');
    });

    it('returns false on error', async () => {
        const mock = createChainedMock(null);
        mock.delete = vi.fn().mockReturnValue({
            match: vi.fn().mockResolvedValue({ error: new Error('Delete failed') }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await unblockUser('blocker-123', 'blocked-456');

        expect(result).toBe(false);
    });
});

describe('getBlockedUserIds', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns list of blocked user IDs', async () => {
        const blockedUsers = [
            { blocked_user_id: 'user-1' },
            { blocked_user_id: 'user-2' },
            { blocked_user_id: 'user-3' },
        ];
        const mock = createChainedMock(null);
        mock.select = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: blockedUsers, error: null }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await getBlockedUserIds('user-123');

        expect(result).toEqual(['user-1', 'user-2', 'user-3']);
        expect(mockSupabaseFrom).toHaveBeenCalledWith('blocked_users');
    });

    it('returns empty array when no users blocked', async () => {
        const mock = createChainedMock(null);
        mock.select = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await getBlockedUserIds('user-123');

        expect(result).toEqual([]);
    });

    it('returns empty array on error', async () => {
        const mock = createChainedMock(null);
        mock.select = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: new Error('Failed') }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await getBlockedUserIds('user-123');

        expect(result).toEqual([]);
    });
});

describe('getBlockedByUserIds', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns list of users who blocked current user', async () => {
        const blockers = [
            { user_id: 'blocker-1' },
            { user_id: 'blocker-2' },
        ];
        const mock = createChainedMock(null);
        mock.select = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: blockers, error: null }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await getBlockedByUserIds('user-123');

        expect(result).toEqual(['blocker-1', 'blocker-2']);
        expect(mockSupabaseFrom).toHaveBeenCalledWith('blocked_users');
    });

    it('returns empty array when no one has blocked the user', async () => {
        const mock = createChainedMock(null);
        mock.select = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await getBlockedByUserIds('user-123');

        expect(result).toEqual([]);
    });

    it('returns empty array on error', async () => {
        const mock = createChainedMock(null);
        mock.select = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: new Error('Failed') }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await getBlockedByUserIds('user-123');

        expect(result).toEqual([]);
    });
});
