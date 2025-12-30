import { supabase } from './supabase';
import { addFriend } from './friends';

const REFERRAL_CODE_KEY = 'weeve_invite_code';

/**
 * Store a referral code in localStorage for later processing.
 * Called when user lands on app via referral link.
 */
export function storeReferralCode(code: string): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(REFERRAL_CODE_KEY, code);
    } catch (error) {
        console.warn('[Referral] Failed to store referral code:', error);
    }
}

/**
 * Get the stored referral code from localStorage.
 */
export function getStoredReferralCode(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return localStorage.getItem(REFERRAL_CODE_KEY);
    } catch (error) {
        console.warn('[Referral] Failed to get referral code:', error);
        return null;
    }
}

/**
 * Clear the stored referral code from localStorage.
 */
export function clearReferralCode(): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(REFERRAL_CODE_KEY);
    } catch (error) {
        console.warn('[Referral] Failed to clear referral code:', error);
    }
}

/**
 * Process any stored referral code and connect the user with their referrer.
 * This creates a bidirectional friendship between the new user and the referrer.
 * 
 * Should be called after user profile is created, from any auth flow:
 * - Email signup via /setup page
 * - Google OAuth via AuthProvider
 * 
 * @param userId - The ID of the newly signed up user
 * @returns true if friendship was created, false otherwise
 */
export async function processReferralCode(userId: string): Promise<boolean> {
    try {
        const referrerCode = getStoredReferralCode();
        
        if (!referrerCode) {
            return false;
        }

        // Look up referrer by their invite code
        const { data: referrer, error: lookupError } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('invite_code', referrerCode)
            .single();

        if (lookupError || !referrer) {
            console.warn('[Referral] Referrer not found for code:', referrerCode, lookupError);
            clearReferralCode(); // Clear invalid code
            return false;
        }

        // Don't connect a user to themselves
        if (referrer.user_id === userId) {
            console.warn('[Referral] Cannot refer yourself');
            clearReferralCode();
            return false;
        }

        // Check if already friends (avoid duplicate entries)
        const { data: existingFriendship } = await supabase
            .from('friendships')
            .select('id')
            .or(`and(user_id.eq.${userId},friend_id.eq.${referrer.user_id}),and(user_id.eq.${referrer.user_id},friend_id.eq.${userId})`)
            .maybeSingle();

        if (existingFriendship) {
            clearReferralCode();
            return true; // Already connected, still a success
        }

        // Create bidirectional friendship
        await addFriend(userId, referrer.user_id);
        
        // Clear the code after successful processing
        clearReferralCode();
        return true;
    } catch (error) {
        console.error('[Referral] Failed to process referral code:', error);
        // Don't clear the code on error - might be a transient issue
        return false;
    }
}
