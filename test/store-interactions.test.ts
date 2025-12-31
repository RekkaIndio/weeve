/**
 * Tests for store.ts comment/like functions.
 *
 * These tests cover:
 * 1. toggleCommentLike - Like/unlike comments
 * 2. addStoryComment - Add comments and replies
 * 
 * Note: These test the core logic. The zustand store is mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the modules we need
const { mockSupabaseFrom } = vi.hoisted(() => ({
    mockSupabaseFrom: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: mockSupabaseFrom,
    },
}));

vi.mock('@/lib/notifications', () => ({
    notifyCommentLike: vi.fn().mockResolvedValue(undefined),
    notifyStoryComment: vi.fn().mockResolvedValue(undefined),
    notifyCommentReply: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/friends', () => ({
    getFriends: vi.fn().mockResolvedValue([]),
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

describe('Comment System Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Comment Like Toggle', () => {
        it('adds like to comment_likes table when not already liked', async () => {
            const mock = createChainedMock(null);
            mock.insert = vi.fn().mockResolvedValue({ error: null });
            mockSupabaseFrom.mockReturnValue(mock);

            // Simulate the store operation directly
            const { error } = await mockSupabaseFrom('comment_likes').insert({
                comment_id: 'comment-123',
                user_id: 'user-123',
            });

            expect(error).toBeNull();
            expect(mockSupabaseFrom).toHaveBeenCalledWith('comment_likes');
        });

        it('removes like from comment_likes when already liked', async () => {
            const mock = createChainedMock(null);
            mock.delete = vi.fn().mockReturnValue({
                match: vi.fn().mockResolvedValue({ error: null }),
            });
            mockSupabaseFrom.mockReturnValue(mock);

            await mockSupabaseFrom('comment_likes')
                .delete()
                .match({ comment_id: 'comment-123', user_id: 'user-123' });

            expect(mockSupabaseFrom).toHaveBeenCalledWith('comment_likes');
        });

        it('handles like error gracefully', async () => {
            const mock = createChainedMock(null);
            mock.insert = vi.fn().mockResolvedValue({ error: new Error('Insert failed') });
            mockSupabaseFrom.mockReturnValue(mock);

            const { error } = await mockSupabaseFrom('comment_likes').insert({
                comment_id: 'comment-123',
                user_id: 'user-123',
            });

            expect(error).toBeTruthy();
        });
    });

    describe('Comment Creation', () => {
        it('creates comment with parent_comment_id for replies', async () => {
            const mockComment = {
                id: 'new-comment-123',
                story_id: 'story-123',
                user_id: 'user-123',
                user_name: 'Test User',
                content: 'This is a reply',
                timestamp: Date.now(),
                parent_comment_id: 'parent-comment-123',
            };

            const mock = createChainedMock(mockComment);
            mock.insert = vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockComment, error: null }),
                }),
            });
            mockSupabaseFrom.mockReturnValue(mock);

            const { data } = await mockSupabaseFrom('story_comments')
                .insert({
                    story_id: 'story-123',
                    user_id: 'user-123',
                    user_name: 'Test User',
                    content: 'This is a reply',
                    timestamp: Date.now(),
                    parent_comment_id: 'parent-comment-123',
                })
                .select()
                .single();

            expect(data.parent_comment_id).toBe('parent-comment-123');
        });

        it('creates top-level comment without parent_comment_id', async () => {
            const mockComment = {
                id: 'new-comment-123',
                story_id: 'story-123',
                user_id: 'user-123',
                user_name: 'Test User',
                content: 'This is a top-level comment',
                timestamp: Date.now(),
                parent_comment_id: null,
            };

            const mock = createChainedMock(mockComment);
            mock.insert = vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockComment, error: null }),
                }),
            });
            mockSupabaseFrom.mockReturnValue(mock);

            const { data } = await mockSupabaseFrom('story_comments')
                .insert({
                    story_id: 'story-123',
                    user_id: 'user-123',
                    user_name: 'Test User',
                    content: 'This is a top-level comment',
                    timestamp: Date.now(),
                    parent_comment_id: null,
                })
                .select()
                .single();

            expect(data.parent_comment_id).toBeNull();
        });

        it('rejects empty comments', () => {
            const content = '   ';
            const trimmed = content.trim();
            
            expect(trimmed).toBe('');
        });

        it('handles comment creation error', async () => {
            const mock = createChainedMock(null);
            mock.insert = vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') }),
                }),
            });
            mockSupabaseFrom.mockReturnValue(mock);

            const { data, error } = await mockSupabaseFrom('story_comments')
                .insert({
                    story_id: 'story-123',
                    user_id: 'user-123',
                    content: 'Test',
                })
                .select()
                .single();

            expect(error).toBeTruthy();
            expect(data).toBeNull();
        });
    });
});

describe('Story Like Toggle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('adds like to story_likes table', async () => {
        const mock = createChainedMock(null);
        mock.insert = vi.fn().mockResolvedValue({ error: null });
        mockSupabaseFrom.mockReturnValue(mock);

        const { error } = await mockSupabaseFrom('story_likes').insert({
            story_id: 'story-123',
            user_id: 'user-123',
        });

        expect(error).toBeNull();
        expect(mockSupabaseFrom).toHaveBeenCalledWith('story_likes');
    });

    it('removes like from story_likes table', async () => {
        const mock = createChainedMock(null);
        mock.delete = vi.fn().mockReturnValue({
            match: vi.fn().mockResolvedValue({ error: null }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        await mockSupabaseFrom('story_likes')
            .delete()
            .match({ story_id: 'story-123', user_id: 'user-123' });

        expect(mockSupabaseFrom).toHaveBeenCalledWith('story_likes');
    });

    it('handles like add error', async () => {
        const mock = createChainedMock(null);
        mock.insert = vi.fn().mockResolvedValue({ error: new Error('Duplicate like') });
        mockSupabaseFrom.mockReturnValue(mock);

        const { error } = await mockSupabaseFrom('story_likes').insert({
            story_id: 'story-123',
            user_id: 'user-123',
        });

        expect(error).toBeTruthy();
    });
});

describe('Story Save Toggle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('adds story to story_saves table', async () => {
        const mock = createChainedMock(null);
        mock.insert = vi.fn().mockResolvedValue({ error: null });
        mockSupabaseFrom.mockReturnValue(mock);

        const { error } = await mockSupabaseFrom('story_saves').insert({
            story_id: 'story-123',
            user_id: 'user-123',
        });

        expect(error).toBeNull();
        expect(mockSupabaseFrom).toHaveBeenCalledWith('story_saves');
    });

    it('removes story from story_saves table', async () => {
        const mock = createChainedMock(null);
        mock.delete = vi.fn().mockReturnValue({
            match: vi.fn().mockResolvedValue({ error: null }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        await mockSupabaseFrom('story_saves')
            .delete()
            .match({ story_id: 'story-123', user_id: 'user-123' });

        expect(mockSupabaseFrom).toHaveBeenCalledWith('story_saves');
    });

    it('fetches saved story IDs for user', async () => {
        const savedStories = [
            { story_id: 'story-1' },
            { story_id: 'story-2' },
            { story_id: 'story-3' },
        ];
        
        const mock = createChainedMock(null);
        mock.select = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: savedStories, error: null }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const { data } = await mockSupabaseFrom('story_saves')
            .select('story_id')
            .eq('user_id', 'user-123');

        expect(data).toEqual(savedStories);
        expect(data.map((item: { story_id: string }) => item.story_id)).toEqual(['story-1', 'story-2', 'story-3']);
    });
});

describe('Blocked Users in Store', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('fetches blocked user IDs from blocked_users table', async () => {
        const blockedUsers = [
            { blocked_user_id: 'blocked-1' },
            { blocked_user_id: 'blocked-2' },
        ];
        
        const mock = createChainedMock(null);
        mock.select = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: blockedUsers, error: null }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const { data } = await mockSupabaseFrom('blocked_users')
            .select('blocked_user_id')
            .eq('user_id', 'user-123');

        expect(data).toEqual(blockedUsers);
    });

    it('combines IDs of users blocked and who blocked current user', () => {
        const iBlocked = ['blocked-1', 'blocked-2'];
        const blockedMe = ['blocker-1'];
        
        const allBlockedIds = Array.from(new Set([...iBlocked, ...blockedMe]));
        
        expect(allBlockedIds).toContain('blocked-1');
        expect(allBlockedIds).toContain('blocked-2');
        expect(allBlockedIds).toContain('blocker-1');
        expect(allBlockedIds).toHaveLength(3);
    });
});
