/**
 * Tests for auth.ts - Authentication and user profile functions.
 *
 * These tests cover:
 * 1. User signup and signin
 * 2. Profile CRUD operations
 * 3. Display name availability checking
 * 4. Helper functions (getNativeRedirectUri)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted for mock variables that are used in vi.mock factories
const { mockSupabaseAuth, mockSupabaseFrom } = vi.hoisted(() => ({
    mockSupabaseAuth: {
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
        getUser: vi.fn(),
        getSession: vi.fn(),
    },
    mockSupabaseFrom: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
    supabase: {
        auth: mockSupabaseAuth,
        from: mockSupabaseFrom,
    },
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
}));

vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: () => false,
        getPlatform: () => 'web',
    },
}));

vi.mock('@/lib/friends', () => ({
    addFriend: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/url', () => ({
    buildPublicUrl: (path: string) => `https://example.com${path}`,
}));

// Import after mocks
import {
    getNativeRedirectUri,
    NATIVE_GOOGLE_REDIRECT_URI_ANDROID,
    NATIVE_GOOGLE_REDIRECT_URI_IOS,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    getUserProfile,
    createUserProfile,
    profileExists,
    checkDisplayNameAvailability,
    updateUserProfile,
} from '@/lib/auth';

// Helper to create mock query builder
const createMockQueryBuilder = () => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
});

describe('Auth Helper Functions', () => {
    describe('getNativeRedirectUri', () => {
        it('returns Android URI for android platform', () => {
            expect(getNativeRedirectUri('android')).toBe(NATIVE_GOOGLE_REDIRECT_URI_ANDROID);
        });

        it('returns iOS URI for ios platform', () => {
            expect(getNativeRedirectUri('ios')).toBe(NATIVE_GOOGLE_REDIRECT_URI_IOS);
        });

        it('returns Android URI by default for unknown platform', () => {
            expect(getNativeRedirectUri('unknown')).toBe(NATIVE_GOOGLE_REDIRECT_URI_ANDROID);
        });
    });
});

describe('Auth Sign Up/In Functions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('signUp', () => {
        it('successfully creates a new user', async () => {
            const mockUser = { id: 'user-123', email: 'test@example.com' };
            mockSupabaseAuth.signUp.mockResolvedValue({
                data: { user: mockUser },
                error: null,
            });

            const result = await signUp('test@example.com', 'password123', 'Test User');

            expect(result.user).toEqual(mockUser);
            expect(result.error).toBeNull();
        });

        it('returns error when signup fails', async () => {
            const mockError = new Error('Email already exists');
            mockSupabaseAuth.signUp.mockResolvedValue({
                data: { user: null },
                error: mockError,
            });

            const result = await signUp('existing@example.com', 'password123');

            expect(result.user).toBeNull();
            expect(result.error).toBe(mockError);
        });

        it('includes date_of_birth when provided', async () => {
            mockSupabaseAuth.signUp.mockResolvedValue({
                data: { user: { id: 'user-123' } },
                error: null,
            });

            await signUp('test@example.com', 'password123', 'Test User', '1990-01-15');

            expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith(
                expect.objectContaining({
                    options: expect.objectContaining({
                        data: expect.objectContaining({
                            date_of_birth: '1990-01-15',
                        }),
                    }),
                })
            );
        });
    });

    describe('signIn', () => {
        it('successfully signs in a user', async () => {
            const mockUser = { id: 'user-123', email: 'test@example.com' };
            const mockSession = { access_token: 'token-123' };
            mockSupabaseAuth.signInWithPassword.mockResolvedValue({
                data: { user: mockUser, session: mockSession },
                error: null,
            });

            const result = await signIn('test@example.com', 'password123');

            expect(result.user).toEqual(mockUser);
            expect(result.session).toEqual(mockSession);
            expect(result.error).toBeNull();
        });

        it('returns error when credentials are invalid', async () => {
            const mockError = new Error('Invalid credentials');
            mockSupabaseAuth.signInWithPassword.mockResolvedValue({
                data: { user: null, session: null },
                error: mockError,
            });

            const result = await signIn('test@example.com', 'wrongpassword');

            expect(result.user).toBeNull();
            expect(result.session).toBeNull();
            expect(result.error).toBe(mockError);
        });
    });

    describe('signOut', () => {
        it('successfully signs out user', async () => {
            mockSupabaseAuth.signOut.mockResolvedValue({ error: null });

            const result = await signOut();

            expect(result.error).toBeNull();
        });

        it('returns error when signout fails', async () => {
            const mockError = new Error('Signout failed');
            mockSupabaseAuth.signOut.mockResolvedValue({ error: mockError });

            const result = await signOut();

            expect(result.error).toBe(mockError);
        });
    });

    describe('getCurrentUser', () => {
        it('returns current authenticated user', async () => {
            const mockUser = { id: 'user-123', email: 'test@example.com' };
            mockSupabaseAuth.getUser.mockResolvedValue({
                data: { user: mockUser },
                error: null,
            });

            const user = await getCurrentUser();

            expect(user).toEqual(mockUser);
        });

        it('returns null when no user is authenticated', async () => {
            mockSupabaseAuth.getUser.mockResolvedValue({
                data: { user: null },
                error: null,
            });

            const user = await getCurrentUser();

            expect(user).toBeNull();
        });
    });
});

describe('Profile Functions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getUserProfile', () => {
        it('returns user profile when found', async () => {
            const mockQueryBuilder = createMockQueryBuilder();
            mockQueryBuilder.maybeSingle.mockResolvedValue({
                data: {
                    user_id: 'user-123',
                    name: 'Test User',
                    avatar: 'https://example.com/avatar.png',
                    tagline: 'Hello world',
                    tokens: 500,
                    invite_code: 'TEST-CODE',
                    is_private: false,
                    onboarding_step: 3,
                    completed_onboarding: true,
                    last_name_change_at: '2024-01-01',
                },
                error: null,
            });
            mockSupabaseFrom.mockReturnValue(mockQueryBuilder);

            const profile = await getUserProfile('user-123');

            expect(profile?.id).toBe('user-123');
            expect(profile?.name).toBe('Test User');
            expect(profile?.tokens).toBe(500);
        });

        it('returns null when profile not found', async () => {
            const mockQueryBuilder = createMockQueryBuilder();
            mockQueryBuilder.maybeSingle.mockResolvedValue({
                data: null,
                error: null,
            });
            mockSupabaseFrom.mockReturnValue(mockQueryBuilder);

            const profile = await getUserProfile('nonexistent-user');

            expect(profile).toBeNull();
        });
    });

    describe('profileExists', () => {
        it('returns true when profile exists', async () => {
            const mockQueryBuilder = createMockQueryBuilder();
            mockQueryBuilder.maybeSingle.mockResolvedValue({
                data: { user_id: 'user-123' },
                error: null,
            });
            mockSupabaseFrom.mockReturnValue(mockQueryBuilder);

            const exists = await profileExists('user-123');

            expect(exists).toBe(true);
        });

        it('returns false when profile does not exist', async () => {
            const mockQueryBuilder = createMockQueryBuilder();
            mockQueryBuilder.maybeSingle.mockResolvedValue({
                data: null,
                error: null,
            });
            mockSupabaseFrom.mockReturnValue(mockQueryBuilder);

            const exists = await profileExists('nonexistent-user');

            expect(exists).toBe(false);
        });
    });

    describe('checkDisplayNameAvailability', () => {
        it('returns available: true when name is not taken', async () => {
            const mockQueryBuilder = createMockQueryBuilder();
            mockQueryBuilder.maybeSingle.mockResolvedValue({
                data: null,
                error: null,
            });
            mockSupabaseFrom.mockReturnValue(mockQueryBuilder);

            const result = await checkDisplayNameAvailability('UniqueUserName');

            expect(result.available).toBe(true);
            expect(result.error).toBeNull();
        });

        it('returns available: false when name is taken', async () => {
            const mockQueryBuilder = createMockQueryBuilder();
            mockQueryBuilder.maybeSingle.mockResolvedValue({
                data: { user_id: 'other-user' },
                error: null,
            });
            mockSupabaseFrom.mockReturnValue(mockQueryBuilder);

            const result = await checkDisplayNameAvailability('TakenName');

            expect(result.available).toBe(false);
        });

        it('returns available: false for empty name', async () => {
            const result = await checkDisplayNameAvailability('');

            expect(result.available).toBe(false);
        });
    });

    describe('createUserProfile', () => {
        it('creates profile successfully', async () => {
            const mockProfileData = {
                user_id: 'user-123',
                name: 'Test User',
                avatar: 'https://example.com/avatar.png',
                tokens: 100,
            };

            const mockQueryBuilder = createMockQueryBuilder();
            mockQueryBuilder.maybeSingle.mockResolvedValue({
                data: mockProfileData,
                error: null,
            });
            mockSupabaseFrom.mockReturnValue(mockQueryBuilder);

            const result = await createUserProfile(
                'user-123',
                'Test User',
                'https://example.com/avatar.png'
            );

            expect(result.data).toEqual(mockProfileData);
            expect(result.error).toBeNull();
        });

        it('returns error on failure', async () => {
            const mockError = new Error('Insert failed');
            const mockQueryBuilder = createMockQueryBuilder();
            mockQueryBuilder.maybeSingle.mockResolvedValue({
                data: null,
                error: mockError,
            });
            mockSupabaseFrom.mockReturnValue(mockQueryBuilder);

            const result = await createUserProfile('user-123', 'Test User');

            expect(result.data).toBeNull();
            expect(result.error).toBe(mockError);
        });
    });

    describe('updateUserProfile', () => {
        it('returns no error for empty updates', async () => {
            const result = await updateUserProfile('user-123', {});

            expect(result.data).toBeNull();
            expect(result.error).toBeNull();
        });

        it('updates profile fields', async () => {
            const mockUpdatedProfile = {
                user_id: 'user-123',
                name: 'Updated Name',
                tokens: 200,
            };

            const mockQueryBuilder = createMockQueryBuilder();
            // First call for update
            mockQueryBuilder.eq.mockReturnValueOnce({ error: null });
            // Second call for select
            mockQueryBuilder.maybeSingle.mockResolvedValue({
                data: mockUpdatedProfile,
                error: null,
            });
            mockSupabaseFrom.mockReturnValue(mockQueryBuilder);

            const result = await updateUserProfile('user-123', {
                name: 'Updated Name',
                tokens: 200,
            });

            expect(mockQueryBuilder.update).toHaveBeenCalled();
        });
    });
});
