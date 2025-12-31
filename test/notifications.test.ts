/**
 * Tests for notifications.ts - Notification management functions.
 *
 * These tests cover:
 * 1. Core CRUD operations (get, create, mark as read, delete)
 * 2. Notification helper functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted for mock variables
const { mockSupabaseFrom, mockSupabaseChannel } = vi.hoisted(() => ({
    mockSupabaseFrom: vi.fn(),
    mockSupabaseChannel: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: mockSupabaseFrom,
        channel: mockSupabaseChannel,
    },
}));

// Helper to create chained mock query builder
const createChainedMock = (finalData: any, finalError: any = null) => {
    const mockObj: any = {
        data: finalData,
        error: finalError,
    };
    
    ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'match', 'order', 'limit', 'in'].forEach(method => {
        mockObj[method] = vi.fn().mockReturnValue(mockObj);
    });
    
    mockObj.single = vi.fn().mockResolvedValue({ data: finalData, error: finalError });
    mockObj.maybeSingle = vi.fn().mockResolvedValue({ data: finalData, error: finalError });
    
    return mockObj;
};

// Import after mocks
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    createNotification,
    deleteNotification,
    notifyStoryTurn,
    notifyStoryLike,
    notifyStoryComment,
    notifyGroupInvite,
    notifyTimerWarning,
    notifyNewMessage,
} from '@/lib/notifications';

describe('getNotifications', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns notifications for a user', async () => {
        const mockNotifications = [
            { id: '1', type: 'friend_request', title: 'New Friend', message: 'Test', read: false },
            { id: '2', type: 'story_invite', title: 'Story Invite', message: 'Test 2', read: true },
        ];
        const mock = createChainedMock(mockNotifications);
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await getNotifications('user-123');

        expect(result).toEqual(mockNotifications);
        expect(mockSupabaseFrom).toHaveBeenCalledWith('notifications');
    });

    it('returns empty array on error', async () => {
        const mock = createChainedMock(null, new Error('Database error'));
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await getNotifications('user-123');

        expect(result).toEqual([]);
    });

    it('respects limit parameter', async () => {
        const mock = createChainedMock([]);
        mockSupabaseFrom.mockReturnValue(mock);

        await getNotifications('user-123', 10);

        expect(mock.limit).toHaveBeenCalledWith(10);
    });
});

describe('getUnreadCount', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns count of unread notifications', async () => {
        const mock = createChainedMock(null);
        mock.select = vi.fn().mockReturnValue({
            ...mock,
            eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
            }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await getUnreadCount('user-123');

        expect(result).toBe(5);
    });

    it('returns 0 on error', async () => {
        const mock = createChainedMock(null);
        mock.select = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ count: null, error: new Error('Failed') }),
            }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await getUnreadCount('user-123');

        expect(result).toBe(0);
    });
});

describe('markAsRead', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('marks notification as read successfully', async () => {
        const mock = createChainedMock(null);
        mock.update = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await markAsRead('notification-123');

        expect(result).toBe(true);
        expect(mockSupabaseFrom).toHaveBeenCalledWith('notifications');
    });

    it('returns false on error', async () => {
        const mock = createChainedMock(null);
        mock.update = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: new Error('Failed') }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await markAsRead('notification-123');

        expect(result).toBe(false);
    });
});

describe('markAllAsRead', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('marks all notifications as read for user', async () => {
        const mock = createChainedMock(null);
        mock.update = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await markAllAsRead('user-123');

        expect(result).toBe(true);
    });

    it('returns false on error', async () => {
        const mock = createChainedMock(null);
        mock.update = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: new Error('Failed') }),
            }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await markAllAsRead('user-123');

        expect(result).toBe(false);
    });
});

describe('createNotification', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates a notification successfully', async () => {
        const mock = createChainedMock(null);
        mock.insert = vi.fn().mockResolvedValue({ error: null });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await createNotification({
            user_id: 'user-123',
            type: 'friend_request',
            title: 'Test Title',
            message: 'Test message',
            read: false,
        });

        expect(result).toBe(true);
        expect(mockSupabaseFrom).toHaveBeenCalledWith('notifications');
    });

    it('returns false on error', async () => {
        const mock = createChainedMock(null);
        mock.insert = vi.fn().mockResolvedValue({ error: new Error('Insert failed') });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await createNotification({
            user_id: 'user-123',
            type: 'friend_request',
            title: 'Test',
            message: 'Test',
            read: false,
        });

        expect(result).toBe(false);
    });
});

describe('deleteNotification', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deletes notification successfully when rows are returned', async () => {
        const mock = createChainedMock(null);
        mock.delete = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({ data: [{ id: 'notification-123' }], error: null }),
            }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await deleteNotification('notification-123');

        expect(result).toBe(true);
    });

    it('returns false when no rows returned (RLS blocked)', async () => {
        const mock = createChainedMock(null);
        mock.delete = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await deleteNotification('notification-123');

        expect(result).toBe(false);
    });

    it('returns false on error', async () => {
        const mock = createChainedMock(null);
        mock.delete = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({ data: null, error: new Error('Delete failed') }),
            }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await deleteNotification('notification-123');

        expect(result).toBe(false);
    });
});

describe('Notification Helper Functions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('notifyStoryTurn', () => {
        it('creates a story turn notification', async () => {
            const mock = createChainedMock(null);
            mock.insert = vi.fn().mockResolvedValue({ error: null });
            mockSupabaseFrom.mockReturnValue(mock);

            await notifyStoryTurn('story-123', 'My Story', 'user-123');

            expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({
                user_id: 'user-123',
                type: 'story_turn',
                title: "It's Your Turn!",
            }));
        });
    });

    describe('notifyStoryLike', () => {
        it('creates a story like notification', async () => {
            const mock = createChainedMock(null);
            mock.insert = vi.fn().mockResolvedValue({ error: null });
            mockSupabaseFrom.mockReturnValue(mock);

            await notifyStoryLike('story-123', 'My Story', 'creator-123', 'John');

            expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({
                user_id: 'creator-123',
                type: 'story_liked',
                title: 'New Like ❤️',
            }));
        });
    });

    describe('notifyStoryComment', () => {
        it('creates a story comment notification with truncated text', async () => {
            const mock = createChainedMock(null);
            mock.insert = vi.fn().mockResolvedValue({ error: null });
            mockSupabaseFrom.mockReturnValue(mock);

            const longComment = 'This is a very long comment that should be truncated because it exceeds fifty characters';
            await notifyStoryComment('story-123', 'My Story', 'creator-123', 'Jane', longComment);

            expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({
                user_id: 'creator-123',
                type: 'story_commented',
                message: expect.stringContaining('...'),
            }));
        });
    });

    describe('notifyGroupInvite', () => {
        it('creates a group invite notification', async () => {
            const mock = createChainedMock(null);
            mock.insert = vi.fn().mockResolvedValue({ error: null });
            mockSupabaseFrom.mockReturnValue(mock);

            await notifyGroupInvite('group-123', 'Cool Group', 'user-123', 'Admin');

            expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({
                user_id: 'user-123',
                type: 'group_invite',
                title: 'Group Invitation',
            }));
        });
    });

    describe('notifyTimerWarning', () => {
        it('creates a timer warning notification', async () => {
            const mock = createChainedMock(null);
            mock.insert = vi.fn().mockResolvedValue({ error: null });
            mockSupabaseFrom.mockReturnValue(mock);

            await notifyTimerWarning('story-123', 'My Story', 'user-123', '2 hours');

            expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({
                user_id: 'user-123',
                type: 'timer_warning',
                title: 'Time Running Out ⏳',
            }));
        });
    });

    describe('notifyNewMessage', () => {
        it('creates a new message notification', async () => {
            const mock = createChainedMock(null);
            mock.insert = vi.fn().mockResolvedValue({ error: null });
            mockSupabaseFrom.mockReturnValue(mock);

            await notifyNewMessage('conv-123', 'user-123', 'Sender', 'Hello there!');

            expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({
                user_id: 'user-123',
                type: 'new_message',
                title: 'New Message 💬',
            }));
        });
    });
});
