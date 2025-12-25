// Brand Content Approval Utilities
import { supabase } from './supabase';

/**
 * Check if a story is a brand post that requires approval
 */
export function isBrandPost(postType?: string): boolean {
    return postType === 'canon' || postType === 'seed';
}

/**
 * Check if the current user is the creator/owner of a brand post
 */
export function isBrandOwner(storyCreatorId: string, currentUserId: string): boolean {
    return storyCreatorId === currentUserId;
}

/**
 * Approve a contribution for a brand post
 */
export async function approveBrandContribution(
    contributionId: string,
    brandUserId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Update contribution approval status
        const { error: updateError } = await supabase
            .from('contributions')
            .update({
                approval_status: 'approved',
                reviewed_at: new Date().toISOString(),
                reviewed_by: brandUserId,
            })
            .eq('id', contributionId);

        if (updateError) {
            console.error('Error approving contribution:', updateError);
            return { success: false, error: updateError.message };
        }

        // Get contribution details for notification
        const { data: contribution, error: fetchError } = await supabase
            .from('contributions')
            .select('user_id, story_id')
            .eq('id', contributionId)
            .single();

        if (fetchError || !contribution) {
            console.error('Error fetching contribution for notification:', fetchError);
            // Still return success since the approval worked
            return { success: true };
        }

        // Get story title for notification
        const { data: story } = await supabase
            .from('stories')
            .select('title')
            .eq('id', contribution.story_id)
            .single();

        // Send approval notification to contributor
        await supabase.from('notifications').insert({
            user_id: contribution.user_id,
            type: 'content_approved',
            title: 'Content Approved!',
            message: `Your contribution to "${story?.title || 'a story'}" has been approved`,
            data: {
                story_id: contribution.story_id,
                contribution_id: contributionId,
            },
            action_url: `/story/${contribution.story_id}`,
            read: false,
        });

        return { success: true };
    } catch (error: any) {
        console.error('Unexpected error approving contribution:', error);
        return { success: false, error: error.message || 'Unexpected error' };
    }
}

/**
 * Reject a contribution for a brand post
 */
export async function rejectBrandContribution(
    contributionId: string,
    brandUserId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Update contribution approval status
        const { error: updateError } = await supabase
            .from('contributions')
            .update({
                approval_status: 'rejected',
                reviewed_at: new Date().toISOString(),
                reviewed_by: brandUserId,
            })
            .eq('id', contributionId);

        if (updateError) {
            console.error('Error rejecting contribution:', updateError);
            return { success: false, error: updateError.message };
        }

        // Get contribution details for notification
        const { data: contribution, error: fetchError } = await supabase
            .from('contributions')
            .select('user_id, story_id')
            .eq('id', contributionId)
            .single();

        if (fetchError || !contribution) {
            console.error('Error fetching contribution for notification:', fetchError);
            // Still return success since the rejection worked
            return { success: true };
        }

        // Get story title for notification
        const { data: story } = await supabase
            .from('stories')
            .select('title')
            .eq('id', contribution.story_id)
            .single();

        // Send rejection notification to contributor
        await supabase.from('notifications').insert({
            user_id: contribution.user_id,
            type: 'content_rejected',
            title: 'Content Not Approved',
            message: `Your contribution to "${story?.title || 'a story'}" was not approved. You can resubmit!`,
            data: {
                story_id: contribution.story_id,
                contribution_id: contributionId,
            },
            action_url: `/story/${contribution.story_id}`,
            read: false,
        });

        return { success: true };
    } catch (error: any) {
        console.error('Unexpected error rejecting contribution:', error);
        return { success: false, error: error.message || 'Unexpected error' };
    }
}

/**
 * Approve an entire Canon post (story-level approval)
 */
export async function approveBrandStory(
    storyId: string,
    brandUserId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Update story approval status and make it public
        const { error: updateError } = await supabase
            .from('stories')
            .update({
                approval_status: 'approved',
                reviewed_at: new Date().toISOString(),
                reviewed_by: brandUserId,
                visibility: 'public', // Make story public upon approval
            })
            .eq('id', storyId);

        if (updateError) {
            console.error('Error approving story:', updateError);
            return { success: false, error: updateError.message };
        }

        // Get story participants for notifications
        const { data: participants, error: participantsError } = await supabase
            .from('story_participants')
            .select('user_id')
            .eq('story_id', storyId);

        if (participantsError || !participants) {
            console.error('Error fetching participants for notification:', participantsError);
            return { success: true }; // Still success since approval worked
        }

        // Get story title
        const { data: story } = await supabase
            .from('stories')
            .select('title')
            .eq('id', storyId)
            .single();

        // Notify all participants
        const notifications = participants
            .filter((p: any) => p.user_id !== brandUserId) // Don't notify the brand
            .map((p: any) => ({
                user_id: p.user_id,
                type: 'story_approved',
                title: 'Story Approved!',
                message: `"${story?.title || 'Your story'}" has been approved and is now public`,
                data: { story_id: storyId },
                action_url: `/story/${storyId}`,
                read: false,
            }));

        if (notifications.length > 0) {
            await supabase.from('notifications').insert(notifications);
        }

        return { success: true };
    } catch (error: any) {
        console.error('Unexpected error approving story:', error);
        return { success: false, error: error.message || 'Unexpected error' };
    }
}

/**
 * Reject an entire Canon post (story-level rejection)
 */
export async function rejectBrandStory(
    storyId: string,
    brandUserId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Update story approval status
        const { error: updateError } = await supabase
            .from('stories')
            .update({
                approval_status: 'rejected',
                reviewed_at: new Date().toISOString(),
                reviewed_by: brandUserId,
            })
            .eq('id', storyId);

        if (updateError) {
            console.error('Error rejecting story:', updateError);
            return { success: false, error: updateError.message };
        }

        // Get story participants for notifications
        const { data: participants, error: participantsError } = await supabase
            .from('story_participants')
            .select('user_id')
            .eq('story_id', storyId);

        if (participantsError || !participants) {
            console.error('Error fetching participants for notification:', participantsError);
            return { success: true }; // Still success since rejection worked
        }

        // Get story title
        const { data: story } = await supabase
            .from('stories')
            .select('title')
            .eq('id', storyId)
            .single();

        // Notify all participants
        const notifications = participants
            .filter((p: any) => p.user_id !== brandUserId) // Don't notify the brand
            .map((p: any) => ({
                user_id: p.user_id,
                type: 'story_rejected',
                title: 'Story Not Approved',
                message: `"${story?.title || 'The story'}" was not approved`,
                data: { story_id: storyId },
                action_url: `/story/${storyId}`,
                read: false,
            }));

        if (notifications.length > 0) {
            await supabase.from('notifications').insert(notifications);
        }

        return { success: true };
    } catch (error: any) {
        console.error('Unexpected error rejecting story:', error);
        return { success: false, error: error.message || 'Unexpected error' };
    }
}

/**
 * Fetch all pending approvals for a brand user
 */
export async function fetchPendingApprovals(brandUserId: string) {
    try {
        // Fetch stories created by the brand
        const { data: brandStories, error: storiesError } = await supabase
            .from('stories')
            .select('id, post_type')
            .eq('creator_id', brandUserId)
            .in('post_type', ['canon', 'seed']);

        if (storiesError) {
            console.error('Error fetching brand stories:', storiesError);
            return { contributions: [], stories: [], error: storiesError.message };
        }

        if (!brandStories || brandStories.length === 0) {
            return { contributions: [], stories: [] };
        }

        const storyIds = brandStories.map((s: { id: string }) => s.id);

        // Fetch pending contributions for these stories
        const { data: contributions, error: contributionsError } = await supabase
            .from('contributions')
            .select(`
                *,
                stories:story_id (
                    id,
                    title,
                    post_type
                ),
                profiles:user_id (
                    name,
                    avatar
                )
            `)
            .in('story_id', storyIds)
            .eq('approval_status', 'pending')
            .order('created_at', { ascending: false });

        if (contributionsError) {
            console.error('Error fetching pending contributions:', contributionsError);
            return { contributions: [], stories: [], error: contributionsError.message };
        }

        // Fetch pending Canon stories (story-level approval)
        const { data: pendingStories, error: pendingStoriesError } = await supabase
            .from('stories')
            .select(`
                *,
                contributions (*),
                story_participants (
                    *,
                    profiles:user_id (name, avatar)
                )
            `)
            .eq('creator_id', brandUserId)
            .eq('post_type', 'canon')
            .eq('approval_status', 'pending')
            .eq('status', 'completed')
            .order('created_at', { ascending: false });

        if (pendingStoriesError) {
            console.error('Error fetching pending stories:', pendingStoriesError);
            return { contributions: contributions || [], stories: [], error: pendingStoriesError.message };
        }

        return {
            contributions: contributions || [],
            stories: pendingStories || [],
        };
    } catch (error: any) {
        console.error('Unexpected error fetching pending approvals:', error);
        return { contributions: [], stories: [], error: error.message || 'Unexpected error' };
    }
}

/**
 * Count pending approvals for a brand user (for badge display)
 */
export async function countPendingApprovals(brandUserId: string): Promise<number> {
    try {
        const { data: brandStories } = await supabase
            .from('stories')
            .select('id')
            .eq('creator_id', brandUserId)
            .in('post_type', ['canon', 'seed']);

        if (!brandStories || brandStories.length === 0) return 0;

        const storyIds = brandStories.map((s: { id: string }) => s.id);

        // Count pending contributions
        const { count: contributionsCount } = await supabase
            .from('contributions')
            .select('*', { count: 'exact', head: true })
            .in('story_id', storyIds)
            .eq('approval_status', 'pending');

        // Count pending Canon stories
        const { count: storiesCount } = await supabase
            .from('stories')
            .select('*', { count: 'exact', head: true })
            .eq('creator_id', brandUserId)
            .eq('post_type', 'canon')
            .eq('approval_status', 'pending')
            .eq('status', 'completed');

        return (contributionsCount || 0) + (storiesCount || 0);
    } catch (error) {
        console.error('Error counting pending approvals:', error);
        return 0;
    }
}
