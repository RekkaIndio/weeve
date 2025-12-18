import { supabase } from './supabase';
import { notifyParticipantLeft } from './notifications';

/**
 * Skip a user's turn (used when timer expires or manual skip)
 * Moves the turn to the next participant in the story
 * Notifies both the skipped user and the next user
 */
export async function skipTurn(
    storyId: string,
    skippedUserId: string,
    reason: 'timer_expired' | 'manual_skip' = 'timer_expired'
): Promise<{ success: boolean; nextUserId?: string; error?: string }> {
    try {
        // 1. Get story details
        const { data: story, error: storyError } = await supabase
            .from('stories')
            .select('title, current_turn_user_id, creator_id')
            .eq('id', storyId)
            .single();

        if (storyError || !story) {
            return { success: false, error: 'Story not found' };
        }

        // Verify this is the current turn user
        if (story.current_turn_user_id !== skippedUserId) {
            return { success: false, error: 'This user does not have the current turn' };
        }

        // 2. Get remaining participants
        const { data: participants } = await supabase
            .from('story_participants')
            .select('user_id, position')
            .eq('story_id', storyId)
            .order('position', { ascending: true });

        if (!participants || participants.length === 0) {
            return { success: false, error: 'No participants found' };
        }

        // 3. Find next user (circular)
        const currentIndex = participants.findIndex((p: { user_id: string; position: number }) => p.user_id === skippedUserId);
        if (currentIndex === -1) {
            return { success: false, error: 'Current user not found in participants' };
        }

        const nextIndex = (currentIndex + 1) % participants.length;
        const nextUserId = participants[nextIndex].user_id;

        // 4. Update story to next user's turn
        const { error: updateError } = await supabase
            .from('stories')
            .update({ 
                current_turn_user_id: nextUserId,
                updated_at: new Date().toISOString()
            })
            .eq('id', storyId);

        if (updateError) {
            console.error('Error updating story turn:', updateError);
            return { success: false, error: 'Failed to update turn' };
        }

        // 5. Send notifications
        const notificationMessage = reason === 'timer_expired'
            ? `Your turn in "${story.title}" expired and has been passed to the next person.`
            : `Your turn in "${story.title}" was skipped by the creator.`;

        await supabase.from('notifications').insert({
            user_id: skippedUserId,
            type: reason === 'timer_expired' ? 'timer_expired' : 'turn_skipped',
            title: reason === 'timer_expired' ? 'Your turn expired' : 'Turn skipped',
            message: notificationMessage,
            story_id: storyId,
            created_at: new Date().toISOString(),
        });

        await supabase.from('notifications').insert({
            user_id: nextUserId,
            type: 'your_turn',
            title: "It's your turn!",
            message: `It's now your turn in "${story.title}"`,
            story_id: storyId,
            created_at: new Date().toISOString(),
        });

        return { success: true, nextUserId };
    } catch (error) {
        console.error('Unexpected error skipping turn:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

/**
 * Leave a story - removes the user from the story participants
 * If the user had the current turn, reassigns to the next participant
 * Notifies the story creator
 */
export async function leaveStory(
    storyId: string,
    userId: string,
    userName: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Get story details first
        const { data: story, error: storyError } = await supabase
            .from('stories')
            .select('creator_id, title, current_turn_user_id, story_participants!inner(user_id, position)')
            .eq('id', storyId)
            .single();

        if (storyError || !story) {
            return { success: false, error: 'Story not found' };
        }

        // Prevent creator from leaving their own story
        if (story.creator_id === userId) {
            return { success: false, error: 'Story creator cannot leave their own story' };
        }

        // 2. Remove user from story_participants
        const { error: deleteError } = await supabase
            .from('story_participants')
            .delete()
            .match({ story_id: storyId, user_id: userId });

        if (deleteError) {
            console.error('Error removing participant:', deleteError);
            return { success: false, error: 'Failed to leave story' };
        }

        // 3. If this user had the current turn, reassign to next participant
        if (story.current_turn_user_id === userId) {
            // Get remaining participants
            const { data: remainingParticipants } = await supabase
                .from('story_participants')
                .select('user_id, position')
                .eq('story_id', storyId)
                .order('position', { ascending: true });

            if (remainingParticipants && remainingParticipants.length > 0) {
                // Assign turn to the first remaining participant
                const nextUserId = remainingParticipants[0].user_id;

                await supabase
                    .from('stories')
                    .update({ current_turn_user_id: nextUserId })
                    .eq('id', storyId);
            } else {
                // No participants left, set to null
                await supabase
                    .from('stories')
                    .update({ current_turn_user_id: null })
                    .eq('id', storyId);
            }
        }

        // 4. Notify the story creator
        if (story.creator_id !== userId) {
            await notifyParticipantLeft(storyId, story.title, story.creator_id, userName);
        }

        return { success: true };
    } catch (error) {
        console.error('Unexpected error leaving story:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

/**
 * Delete a story - removes the entire story and all related data
 * Only the creator can delete their story
 */
export async function deleteStory(
    storyId: string,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Verify user is the creator
        const { data: story, error: storyError } = await supabase
            .from('stories')
            .select('creator_id')
            .eq('id', storyId)
            .single();

        if (storyError || !story) {
            return { success: false, error: 'Story not found' };
        }

        if (story.creator_id !== userId) {
            return { success: false, error: 'Only the creator can delete this story' };
        }

        // 2. Delete related data (Supabase should handle cascading deletes if set up)
        // But we'll be explicit to ensure everything is cleaned up

        // Delete story participants
        await supabase
            .from('story_participants')
            .delete()
            .eq('story_id', storyId);

        // Delete contributions
        await supabase
            .from('contributions')
            .delete()
            .eq('story_id', storyId);

        // Delete likes
        await supabase
            .from('story_likes')
            .delete()
            .eq('story_id', storyId);

        // Delete comments
        await supabase
            .from('story_comments')
            .delete()
            .eq('story_id', storyId);

        // 3. Finally, delete the story itself
        const { error: deleteError } = await supabase
            .from('stories')
            .delete()
            .eq('id', storyId);

        if (deleteError) {
            console.error('Error deleting story:', deleteError);
            return { success: false, error: 'Failed to delete story' };
        }

        return { success: true };
    } catch (error) {
        console.error('Unexpected error deleting story:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}
