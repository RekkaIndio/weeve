/**
 * Tests for messaging.ts - Direct messaging functions.
 *
 * These tests cover:
 * 1. getConversations - Fetch user's conversations
 * 2. getMessages - Fetch messages for a conversation
 * 3. sendMessage - Send a new message
 * 4. createConversation - Start a new chat
 * 5. markAsRead - Mark conversation as read
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted for mock variables
const { mockSupabaseFrom, mockSupabaseChannel, mockNotifyNewMessage } = vi.hoisted(() => ({
    mockSupabaseFrom: vi.fn(),
    mockSupabaseChannel: vi.fn(),
    mockNotifyNewMessage: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: mockSupabaseFrom,
        channel: mockSupabaseChannel,
    },
}));

vi.mock('@/lib/notifications', () => ({
    notifyNewMessage: mockNotifyNewMessage,
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
    getConversations,
    getMessages,
    sendMessage,
    createConversation,
    markAsRead,
    deleteMessage,
} from '@/lib/messaging';

describe('getConversations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns empty array when user has no conversations', async () => {
        const mock = createChainedMock([]);
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await getConversations('user-123');

        expect(result).toEqual([]);
        expect(mockSupabaseFrom).toHaveBeenCalledWith('conversation_participants');
    });

    it('returns empty array on error', async () => {
        const mock = createChainedMock(null, new Error('Database error'));
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await getConversations('user-123');

        expect(result).toEqual([]);
    });

    it('fetches and combines conversation data with participants', async () => {
        // Mock participations
        const participations = [
            { conversation_id: 'conv-1', last_read_at: '2024-01-01', other_user_id: 'user-456' },
        ];
        
        // Create a tracking mock to return different values based on table
        const calls: string[] = [];
        mockSupabaseFrom.mockImplementation((table: string) => {
            calls.push(table);
            if (table === 'conversation_participants') {
                const mock = createChainedMock(participations);
                mock.select = vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ data: participations, error: null }),
                });
                return mock;
            }
            if (table === 'conversations') {
                const mock = createChainedMock([{ id: 'conv-1', created_at: '2024-01-01' }]);
                mock.select = vi.fn().mockReturnValue({
                    in: vi.fn().mockReturnValue({
                        order: vi.fn().mockResolvedValue({ data: [{ id: 'conv-1', created_at: '2024-01-01' }], error: null }),
                    }),
                });
                return mock;
            }
            if (table === 'profiles') {
                const mock = createChainedMock([{ user_id: 'user-456', name: 'Test User' }]);
                mock.select = vi.fn().mockReturnValue({
                    in: vi.fn().mockResolvedValue({ data: [{ user_id: 'user-456', name: 'Test User' }], error: null }),
                });
                return mock;
            }
            return createChainedMock([]);
        });

        const result = await getConversations('user-123');

        expect(calls).toContain('conversation_participants');
    });
});

describe('getMessages', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns empty array when no messages exist', async () => {
        const mock = createChainedMock([]);
        mock.select = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await getMessages('conv-123');

        expect(result).toEqual([]);
        expect(mockSupabaseFrom).toHaveBeenCalledWith('messages');
    });

    it('returns empty array on error', async () => {
        const mock = createChainedMock(null);
        mock.select = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: null, error: new Error('Failed') }),
            }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await getMessages('conv-123');

        expect(result).toEqual([]);
    });

    it('fetches messages and combines with sender profiles', async () => {
        const mockMessages = [
            { id: 'msg-1', sender_id: 'user-123', content: 'Hello' },
        ];
        
        mockSupabaseFrom.mockImplementation((table: string) => {
            if (table === 'messages') {
                const mock = createChainedMock(mockMessages);
                mock.select = vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        order: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
                    }),
                });
                return mock;
            }
            if (table === 'profiles') {
                const mock = createChainedMock([{ user_id: 'user-123', name: 'Sender' }]);
                mock.select = vi.fn().mockReturnValue({
                    in: vi.fn().mockResolvedValue({ data: [{ user_id: 'user-123', name: 'Sender' }], error: null }),
                });
                return mock;
            }
            return createChainedMock([]);
        });

        const result = await getMessages('conv-123');

        expect(result).toHaveLength(1);
        expect(result[0].sender).toBeDefined();
    });
});

describe('sendMessage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockNotifyNewMessage.mockResolvedValue(undefined);
    });

    it('inserts message and updates conversation', async () => {
        const mockMessage = { id: 'msg-1', conversation_id: 'conv-123', sender_id: 'user-123', content: 'Hello' };
        
        mockSupabaseFrom.mockImplementation((table: string) => {
            if (table === 'messages') {
                const mock = createChainedMock(mockMessage);
                mock.insert = vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: mockMessage, error: null }),
                    }),
                });
                return mock;
            }
            if (table === 'conversations') {
                const mock = createChainedMock(null);
                mock.update = vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: null }),
                });
                return mock;
            }
            if (table === 'conversation_participants') {
                const mock = createChainedMock(null);
                mock.update = vi.fn().mockReturnValue({
                    match: vi.fn().mockResolvedValue({ error: null }),
                });
                mock.select = vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({ data: { other_user_id: 'user-456' }, error: null }),
                        }),
                    }),
                });
                return mock;
            }
            if (table === 'profiles') {
                const mock = createChainedMock({ name: 'Sender' });
                mock.select = vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: { name: 'Sender' }, error: null }),
                    }),
                });
                return mock;
            }
            return createChainedMock(null);
        });

        const result = await sendMessage('conv-123', 'user-123', 'Hello');

        expect(result).toEqual(mockMessage);
    });

    it('throws error when message insert fails', async () => {
        const mock = createChainedMock(null);
        mock.insert = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') }),
            }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        await expect(sendMessage('conv-123', 'user-123', 'Hello')).rejects.toThrow();
    });
});

describe('createConversation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns existing conversation if one exists', async () => {
        const mock = createChainedMock({ conversation_id: 'existing-conv' });
        mock.select = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: { conversation_id: 'existing-conv' }, error: null }),
                }),
            }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await createConversation('user-123', 'user-456');

        expect(result).toBe('existing-conv');
    });

    it('creates new conversation when none exists', async () => {
        let callCount = 0;
        mockSupabaseFrom.mockImplementation((table: string) => {
            if (table === 'conversation_participants' && callCount === 0) {
                callCount++;
                const mock = createChainedMock(null);
                mock.select = vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({ data: null, error: null }),
                        }),
                    }),
                });
                return mock;
            }
            if (table === 'conversations') {
                const mock = createChainedMock({ id: 'new-conv' });
                mock.insert = vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: { id: 'new-conv' }, error: null }),
                    }),
                });
                return mock;
            }
            if (table === 'conversation_participants') {
                const mock = createChainedMock(null);
                mock.insert = vi.fn().mockResolvedValue({ error: null });
                return mock;
            }
            return createChainedMock(null);
        });

        const result = await createConversation('user-123', 'user-456');

        expect(result).toBe('new-conv');
    });
});

describe('markAsRead', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('updates last_read_at for user in conversation', async () => {
        const mock = createChainedMock(null);
        mock.update = vi.fn().mockReturnValue({
            match: vi.fn().mockResolvedValue({ error: null }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        await markAsRead('conv-123', 'user-123');

        expect(mockSupabaseFrom).toHaveBeenCalledWith('conversation_participants');
        expect(mock.update).toHaveBeenCalled();
    });
});

describe('deleteMessage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('soft deletes a message by setting deleted_at and deleted_by', async () => {
        const mock = createChainedMock(null);
        mock.update = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        await deleteMessage('msg-123', 'user-123');

        expect(mockSupabaseFrom).toHaveBeenCalledWith('messages');
        expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({
            deleted_at: expect.any(String),
            deleted_by: 'user-123',
        }));
    });

    it('throws error when delete fails', async () => {
        const mock = createChainedMock(null);
        mock.update = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: new Error('Delete failed') }),
            }),
        });
        mockSupabaseFrom.mockReturnValue(mock);

        await expect(deleteMessage('msg-123', 'user-123')).rejects.toThrow();
    });
});
