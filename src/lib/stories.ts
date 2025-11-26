import { supabase } from './supabase';
import { notifyParticipantLeft } from './notifications';

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
