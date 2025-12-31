/**
 * Tests for referral.ts - Referral code processing functions.
 *
 * These tests cover:
 * 1. storeReferralCode - Store code in localStorage
 * 2. getStoredReferralCode - Retrieve stored code
 * 3. clearReferralCode - Clear stored code
 * 4. processReferralCode - Process referral and create friendship
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted for mock variables
const { mockSupabaseFrom, mockAddFriend } = vi.hoisted(() => ({
    mockSupabaseFrom: vi.fn(),
    mockAddFriend: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: mockSupabaseFrom,
    },
}));

vi.mock('@/lib/friends', () => ({
    addFriend: mockAddFriend,
}));

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
    };
})();

Object.defineProperty(global, 'window', {
    value: { localStorage: localStorageMock },
    writable: true,
});

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
});

// Helper to create chained mock query builder
const createChainedMock = (finalData: any, finalError: any = null) => {
    const mockObj: any = {
        data: finalData,
        error: finalError,
    };
    
    ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'match', 'or', 'order', 'limit'].forEach(method => {
        mockObj[method] = vi.fn().mockReturnValue(mockObj);
    });
    
    mockObj.single = vi.fn().mockResolvedValue({ data: finalData, error: finalError });
    mockObj.maybeSingle = vi.fn().mockResolvedValue({ data: finalData, error: finalError });
    
    return mockObj;
};

// Import after mocks
import {
    storeReferralCode,
    getStoredReferralCode,
    clearReferralCode,
    processReferralCode,
} from '@/lib/referral';

describe('storeReferralCode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
    });

    it('stores referral code in localStorage', () => {
        storeReferralCode('ABC123');

        expect(localStorageMock.setItem).toHaveBeenCalledWith('weeve_invite_code', 'ABC123');
    });
});

describe('getStoredReferralCode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
    });

    it('retrieves stored referral code', () => {
        localStorageMock.getItem.mockReturnValue('ABC123');

        const result = getStoredReferralCode();

        expect(result).toBe('ABC123');
        expect(localStorageMock.getItem).toHaveBeenCalledWith('weeve_invite_code');
    });

    it('returns null when no code stored', () => {
        localStorageMock.getItem.mockReturnValue(null);

        const result = getStoredReferralCode();

        expect(result).toBeNull();
    });
});

describe('clearReferralCode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
    });

    it('removes referral code from localStorage', () => {
        clearReferralCode();

        expect(localStorageMock.removeItem).toHaveBeenCalledWith('weeve_invite_code');
    });
});

describe('processReferralCode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
        mockAddFriend.mockResolvedValue({ success: true });
    });

    it('returns false when no referral code is stored', async () => {
        localStorageMock.getItem.mockReturnValue(null);

        const result = await processReferralCode('new-user-123');

        expect(result).toBe(false);
    });

    it('clears code and returns false when referrer not found', async () => {
        localStorageMock.getItem.mockReturnValue('INVALID_CODE');
        
        const mock = createChainedMock(null, { message: 'Not found' });
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await processReferralCode('new-user-123');

        expect(result).toBe(false);
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('weeve_invite_code');
    });

    it('clears code and returns false when user tries to refer themselves', async () => {
        localStorageMock.getItem.mockReturnValue('SELF_CODE');
        
        const mock = createChainedMock({ user_id: 'new-user-123' }); // Same as the user
        mockSupabaseFrom.mockReturnValue(mock);

        const result = await processReferralCode('new-user-123');

        expect(result).toBe(false);
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('weeve_invite_code');
    });

    it('returns true when users are already friends', async () => {
        localStorageMock.getItem.mockReturnValue('REFERRER_CODE');
        
        let callCount = 0;
        mockSupabaseFrom.mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
                // First call: lookup referrer
                return createChainedMock({ user_id: 'referrer-123' });
            }
            // Second call: check existing friendship
            return createChainedMock({ id: 'existing-friendship' });
        });

        const result = await processReferralCode('new-user-123');

        expect(result).toBe(true);
        expect(mockAddFriend).not.toHaveBeenCalled();
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('weeve_invite_code');
    });

    it('creates friendship and clears code on success', async () => {
        localStorageMock.getItem.mockReturnValue('REFERRER_CODE');
        
        let callCount = 0;
        mockSupabaseFrom.mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
                // First call: lookup referrer
                return createChainedMock({ user_id: 'referrer-123' });
            }
            // Second call: check existing friendship (none found)
            return createChainedMock(null);
        });

        const result = await processReferralCode('new-user-123');

        expect(result).toBe(true);
        expect(mockAddFriend).toHaveBeenCalledWith('new-user-123', 'referrer-123');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('weeve_invite_code');
    });

    it('returns false but does not clear code on unexpected error', async () => {
        localStorageMock.getItem.mockReturnValue('REFERRER_CODE');
        
        mockSupabaseFrom.mockImplementation(() => {
            throw new Error('Unexpected error');
        });

        const result = await processReferralCode('new-user-123');

        expect(result).toBe(false);
        // Code should NOT be cleared on unexpected errors
        expect(localStorageMock.removeItem).not.toHaveBeenCalled();
    });
});
