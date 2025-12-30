import { supabase } from './supabase';

/**
 * Check if one user has blocked another
 * @param blockerId - The user who may have blocked
 * @param blockedId - The user who may be blocked
 * @returns true if blockerId has blocked blockedId
 */
export async function isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('blocked_users')
            .select('id')
            .eq('user_id', blockerId)
            .eq('blocked_user_id', blockedId)
            .maybeSingle();

        if (error) {
            console.error('[Blocked] Error checking block status:', error);
            return false;
        }

        return !!data;
    } catch (err) {
        console.error('[Blocked] Unexpected error checking block status:', err);
        return false;
    }
}

/**
 * Block a user
 * @param blockerId - The user doing the blocking
 * @param blockedId - The user being blocked
 * @returns true if successfully blocked
 */
export async function blockUser(blockerId: string, blockedId: string): Promise<boolean> {
    try {
        // First check if already blocked
        const alreadyBlocked = await isUserBlocked(blockerId, blockedId);
        if (alreadyBlocked) {
            return true; // Already blocked
        }

        const { error } = await supabase
            .from('blocked_users')
            .insert({
                user_id: blockerId,
                blocked_user_id: blockedId
            });

        if (error) {
            console.error('[Blocked] Error blocking user:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('[Blocked] Unexpected error blocking user:', err);
        return false;
    }
}

/**
 * Unblock a user
 * @param blockerId - The user who blocked
 * @param blockedId - The user who was blocked
 * @returns true if successfully unblocked
 */
export async function unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('blocked_users')
            .delete()
            .match({ user_id: blockerId, blocked_user_id: blockedId });

        if (error) {
            console.error('[Blocked] Error unblocking user:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('[Blocked] Unexpected error unblocking user:', err);
        return false;
    }
}

/**
 * Get list of user IDs that the current user has blocked
 * @param userId - The current user's ID
 * @returns Array of blocked user IDs
 */
export async function getBlockedUserIds(userId: string): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from('blocked_users')
            .select('blocked_user_id')
            .eq('user_id', userId);

        if (error) {
            console.error('[Blocked] Error fetching blocked users:', error);
            return [];
        }

        return (data || []).map((row: { blocked_user_id: string }) => row.blocked_user_id);
    } catch (err) {
        console.error('[Blocked] Unexpected error fetching blocked users:', err);
        return [];
    }
}

/**
 * Get list of user IDs that have blocked the current user
 * @param userId - The current user's ID
 * @returns Array of user IDs who have blocked this user
 */
export async function getBlockedByUserIds(userId: string): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from('blocked_users')
            .select('user_id')
            .eq('blocked_user_id', userId);

        if (error) {
            console.error('[Blocked] Error fetching users who blocked:', error);
            return [];
        }

        return (data || []).map((row: { user_id: string }) => row.user_id);
    } catch (err) {
        console.error('[Blocked] Unexpected error fetching users who blocked:', err);
        return [];
    }
}
