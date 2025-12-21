/**
 * Tests for stories.ts - Story management functions.
 *
 * These tests cover:
 * 1. skipTurn - Timer expiry and manual skip
 * 2. leaveStory - User leaves a story
 * 3. deleteStory - Creator deletes story
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
    notifyParticipantLeft: vi.fn().mockResolvedValue(null),
}));

// Helper to create chained mock
const createChainedMock = (finalData: any, finalError: any = null) => {
    const mockObj: any = {
        data: finalData,
        error: finalError,
    };
    
    ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'match', 'order'].forEach(method => {
        mockObj[method] = vi.fn().mockReturnValue(mockObj);
    });
    
    mockObj.single = vi.fn().mockResolvedValue({ data: finalData, error: finalError });
    
    return mockObj;
};

import { skipTurn, leaveStory, deleteStory } from '@/lib/stories';

describe('skipTurn', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns error when story not found', async () => {
        mockSupabaseFrom.mockReturnValue(createChainedMock(null, new Error('Not found')));

        const result = await skipTurn('nonexistent-story', 'user-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Story not found');
    });

    it('returns error when user does not have current turn', async () => {
        const mockStory = {
            title: 'Test Story',
            current_turn_user_id: 'different-user',
            creator_id: 'creator-123',
        };
        mockSupabaseFrom.mockReturnValue(createChainedMock(mockStory));

        const result = await skipTurn('story-123', 'user-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('This user does not have the current turn');
    });

    it('queries stories table first', async () => {
        mockSupabaseFrom.mockReturnValue(createChainedMock(null, new Error('Not found')));

        await skipTurn('story-123', 'user-123');

        expect(mockSupabaseFrom).toHaveBeenCalledWith('stories');
    });
});

describe('leaveStory', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns error when story not found', async () => {
        mockSupabaseFrom.mockReturnValue(createChainedMock(null, new Error('Not found')));

        const result = await leaveStory('nonexistent-story', 'user-123', 'Test User');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Story not found');
    });

    it('prevents creator from leaving their own story', async () => {
        const mockStory = {
            creator_id: 'user-123', // Same as userId
            title: 'Test Story',
            current_turn_user_id: 'other-user',
            story_participants: [{ user_id: 'user-123', position: 0 }],
        };
        mockSupabaseFrom.mockReturnValue(createChainedMock(mockStory));

        const result = await leaveStory('story-123', 'user-123', 'Creator');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Story creator cannot leave their own story');
    });

    it('queries stories table', async () => {
        mockSupabaseFrom.mockReturnValue(createChainedMock(null, new Error('Not found')));

        await leaveStory('story-123', 'user-456', 'Test User');

        expect(mockSupabaseFrom).toHaveBeenCalledWith('stories');
    });
});

describe('deleteStory', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns error when story not found', async () => {
        mockSupabaseFrom.mockReturnValue(createChainedMock(null, new Error('Not found')));

        const result = await deleteStory('nonexistent-story', 'user-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Story not found');
    });

    it('only allows creator to delete story', async () => {
        const mockStory = {
            creator_id: 'different-user',
        };
        mockSupabaseFrom.mockReturnValue(createChainedMock(mockStory));

        const result = await deleteStory('story-123', 'user-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Only the creator can delete this story');
    });

    it('queries stories table to verify ownership', async () => {
        mockSupabaseFrom.mockReturnValue(createChainedMock(null, new Error('Not found')));

        await deleteStory('story-123', 'user-123');

        expect(mockSupabaseFrom).toHaveBeenCalledWith('stories');
    });
});
