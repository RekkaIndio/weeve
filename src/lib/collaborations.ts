/**
 * Collaboration Functions
 * Handles creator collaboration requests, acceptance, and payments
 */

import { supabase } from './supabase';

// ============================================
// TYPES
// ============================================

export interface CollabEligibility {
    allowed: boolean;
    reason?: string;
    priceCents: number;
    priceFormatted: string;
}

export interface CollabSettings {
    enabled: boolean;
    priceCents: number | null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format cents to dollar string
 * @param cents - Price in cents (e.g., 500 = $5.00)
 */
export function formatPrice(cents: number | null | undefined): string {
    if (!cents || cents === 0) return 'Free';
    const dollars = cents / 100;
    return `$${dollars.toFixed(2)}`;
}

/**
 * Parse dollar string to cents
 * @param dollarString - e.g., "5.00" or "5"
 */
export function parseToCents(dollarString: string): number {
    const cleaned = dollarString.replace(/[^0-9.]/g, '');
    const dollars = parseFloat(cleaned);
    if (isNaN(dollars)) return 0;
    return Math.round(dollars * 100);
}

// ============================================
// COLLABORATION ELIGIBILITY
// ============================================

/**
 * Check if a user can initiate a collaboration with another user
 */
export async function canInitiateCollab(
    senderId: string,
    targetId: string
): Promise<CollabEligibility> {
    // 0. GLOBALLY DISABLED
    return {
        allowed: false,
        reason: 'Collaboration features are coming soon!',
        priceCents: 0,
        priceFormatted: 'Free'
    };

    // 1. Can't collab with yourself
    if (senderId === targetId) {
        return {
            allowed: false,
            reason: 'You cannot collaborate with yourself',
            priceCents: 0,
            priceFormatted: 'Free'
        };
    }

    // 2. Check if target has collab enabled and get their price
    const { data: targetProfile, error } = await supabase
        .from('profiles')
        .select('collab_enabled, collab_price_cents, name')
        .eq('user_id', targetId)
        .single();

    if (error || !targetProfile) {
        return {
            allowed: false,
            reason: 'User not found',
            priceCents: 0,
            priceFormatted: 'Free'
        };
    }

    if (!targetProfile.collab_enabled) {
        return {
            allowed: false,
            reason: `${targetProfile.name} is not accepting collaboration requests`,
            priceCents: 0,
            priceFormatted: 'Free'
        };
    }

    // 3. Check if blocked (use existing blocked logic)
    const { getBlockedUserIds, getBlockedByUserIds } = await import('./blocked');
    const blockedByTarget = await getBlockedByUserIds(senderId);
    const blockedBySender = await getBlockedUserIds(senderId);

    if (blockedByTarget.includes(targetId) || blockedBySender.includes(targetId)) {
        return {
            allowed: false,
            reason: 'Unable to collaborate with this user',
            priceCents: 0,
            priceFormatted: 'Free'
        };
    }

    // 4. Check for existing pending collab between these users
    const { data: existingCollab } = await supabase
        .from('stories')
        .select('id')
        .eq('is_collab', true)
        .eq('collab_status', 'pending')
        .or(`and(collab_initiator_id.eq.${senderId},collab_target_id.eq.${targetId}),and(collab_initiator_id.eq.${targetId},collab_target_id.eq.${senderId})`)
        .limit(1);

    if (existingCollab && existingCollab.length > 0) {
        return {
            allowed: false,
            reason: 'You already have a pending collaboration with this user',
            priceCents: 0,
            priceFormatted: 'Free'
        };
    }

    // 5. TODO: Check follower count threshold (disabled for testing)
    // const FOLLOWER_THRESHOLD = 1000;
    // ... check both users have enough followers

    const priceCents = targetProfile.collab_price_cents || 0;

    return {
        allowed: true,
        priceCents,
        priceFormatted: formatPrice(priceCents)
    };
}

// ============================================
// GET COLLABORATION INFO
// ============================================

/**
 * Get collaboration price for a user
 */
export async function getCollabPrice(userId: string): Promise<number> {
    const { data } = await supabase
        .from('profiles')
        .select('collab_price_cents')
        .eq('user_id', userId)
        .single();

    return data?.collab_price_cents || 0;
}

/**
 * Get collaboration settings for a user
 */
export async function getCollabSettings(userId: string): Promise<CollabSettings> {
    const { data } = await supabase
        .from('profiles')
        .select('collab_enabled, collab_price_cents')
        .eq('user_id', userId)
        .single();

    return {
        enabled: data?.collab_enabled ?? true,
        priceCents: data?.collab_price_cents ?? null
    };
}

// ============================================
// COLLABORATION ACTIONS
// ============================================

/**
 * Accept a collaboration request
 * Updates story status and notifies initiator
 */
export async function acceptCollabRequest(
    storyId: string,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    // 1. Verify the user is the target of this collab
    const { data: story, error: fetchError } = await supabase
        .from('stories')
        .select('id, title, collab_initiator_id, collab_target_id, collab_status')
        .eq('id', storyId)
        .eq('is_collab', true)
        .single();

    if (fetchError || !story) {
        return { success: false, error: 'Collaboration not found' };
    }

    if (story.collab_target_id !== userId) {
        return { success: false, error: 'You are not the target of this collaboration' };
    }

    if (story.collab_status !== 'pending') {
        return { success: false, error: 'This collaboration request is no longer pending' };
    }

    // 2. Update story status to accepted
    const { error: updateError } = await supabase
        .from('stories')
        .update({
            collab_status: 'accepted',
            visibility: 'private' // Stays private until both contribute
        })
        .eq('id', storyId);

    if (updateError) {
        return { success: false, error: 'Failed to accept collaboration' };
    }

    // 3. Send notification to initiator
    try {
        const { notifyCollabAccepted } = await import('./notifications');
        await notifyCollabAccepted(storyId, story.title, userId, story.collab_initiator_id);
    } catch (err) {
        console.error('[Collab] Failed to send acceptance notification:', err);
    }

    return { success: true };
}

/**
 * Decline a collaboration request
 * Refunds payment and notifies initiator
 */
export async function declineCollabRequest(
    storyId: string,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    // 1. Get story to find price and initiator
    const { data: story, error: fetchError } = await supabase
        .from('stories')
        .select('id, title, collab_initiator_id, collab_target_id, collab_price_cents, collab_status')
        .eq('id', storyId)
        .eq('is_collab', true)
        .single();

    if (fetchError || !story) {
        return { success: false, error: 'Collaboration not found' };
    }

    if (story.collab_target_id !== userId) {
        return { success: false, error: 'You are not the target of this collaboration' };
    }

    if (story.collab_status !== 'pending') {
        return { success: false, error: 'This collaboration request is no longer pending' };
    }

    // 2. Refund payment if price was paid
    // NOTE: For now we're using dollar-based pricing. In production, this would
    // trigger a payment refund. For MVP, we'll just mark it as declined.

    // 3. Update story status to declined
    const { error: updateError } = await supabase
        .from('stories')
        .update({ collab_status: 'declined' })
        .eq('id', storyId);

    if (updateError) {
        return { success: false, error: 'Failed to decline collaboration' };
    }

    // 4. Send notification to initiator
    try {
        const { notifyCollabDeclined } = await import('./notifications');
        await notifyCollabDeclined(
            storyId,
            story.title,
            userId,
            story.collab_initiator_id,
            story.collab_price_cents || undefined
        );
    } catch (err) {
        console.error('[Collab] Failed to send decline notification:', err);
    }

    return { success: true };
}

/**
 * Cancel a collaboration request (by initiator)
 */
export async function cancelCollabRequest(
    storyId: string,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    // 1. Verify the user is the initiator
    const { data: story, error: fetchError } = await supabase
        .from('stories')
        .select('id, collab_initiator_id, collab_status')
        .eq('id', storyId)
        .eq('is_collab', true)
        .single();

    if (fetchError || !story) {
        return { success: false, error: 'Collaboration not found' };
    }

    if (story.collab_initiator_id !== userId) {
        return { success: false, error: 'You are not the initiator of this collaboration' };
    }

    if (story.collab_status !== 'pending') {
        return { success: false, error: 'This collaboration request is no longer pending' };
    }

    // 2. Delete the story (it was never accepted)
    const { error: deleteError } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);

    if (deleteError) {
        return { success: false, error: 'Failed to cancel collaboration' };
    }

    // NOTE: Refund handling would go here when payment integration is complete

    return { success: true };
}

// ============================================
// SETTINGS MANAGEMENT
// ============================================

/**
 * Update collaboration price setting
 */
export async function updateCollabPrice(
    userId: string,
    priceCents: number | null
): Promise<boolean> {
    const { error } = await supabase
        .from('profiles')
        .update({ collab_price_cents: priceCents })
        .eq('user_id', userId);

    return !error;
}

/**
 * Toggle collaboration enabled setting
 */
export async function toggleCollabEnabled(
    userId: string,
    enabled: boolean
): Promise<boolean> {
    const { error } = await supabase
        .from('profiles')
        .update({ collab_enabled: enabled })
        .eq('user_id', userId);

    return !error;
}

/**
 * Update both collaboration settings at once
 */
export async function updateCollabSettings(
    userId: string,
    settings: { enabled?: boolean; priceCents?: number | null }
): Promise<boolean> {
    const updates: Record<string, any> = {};

    if (settings.enabled !== undefined) {
        updates.collab_enabled = settings.enabled;
    }

    if (settings.priceCents !== undefined) {
        updates.collab_price_cents = settings.priceCents;
    }

    if (Object.keys(updates).length === 0) {
        return true; // Nothing to update
    }

    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId);

    return !error;
}
