import { supabase } from './supabase';
import { User } from './store';
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
        // If we are strictly removing, we want the person who was *after* the removed user. 
        // In the current list, that is at nextIndex (even if it wraps around to 0, which would be the first person).
        // If there's only 1 participant (the one to be removed), nextUserId will be themselves, 
        // but we'll handle the empty case below.
        let nextUserId = participants[nextIndex].user_id;

        // 4. If timer expired, remove the user
        if (reason === 'timer_expired') {
            const { error: deleteError } = await supabase
                .from('story_participants')
                .delete()
                .match({ story_id: storyId, user_id: skippedUserId });

            if (deleteError) {
                console.error('Error removing participant on timer expiry:', deleteError);
                return { success: false, error: 'Failed to remove participant' };
            }

            // If there was only 1 participant, now there are 0.
            if (participants.length === 1) {
                nextUserId = null; // No one left
            } else if (nextUserId === skippedUserId) {
                // Should be covered by length === 1 check, but just in case logic is weird
                nextUserId = null;
            }
        }

        // 5. Update story to next user's turn
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

        // 6. Send notifications
        if (reason === 'timer_expired') {
            // Notify the removed user
            await supabase.from('notifications').insert({
                user_id: skippedUserId,
                type: 'timer_expired',
                title: 'You were removed from the story',
                message: `Your turn in "${story.title}" expired and you have been removed.`,
                data: { story_id: storyId },
                action_url: `/story/${storyId}`, // Maybe nowhere? Or to the story to see it gone/readonly?
                created_at: new Date().toISOString(),
            });

            // Notify the Creator (if they aren't the one who was removed, mostly)
            // Even if creator was removed (timer on creator?), they get the generic "removed" msg above.
            // But we specifically need to sure the Creator knows to "choose someone".
            if (story.creator_id !== skippedUserId) {
                await supabase.from('notifications').insert({
                    user_id: story.creator_id,
                    type: 'story_participant_left', // Reusing this generic type or could make a custom one
                    title: 'Timer Expired',
                    message: `A user's timer expired in "${story.title}". Please choose a new participant.`,
                    data: { story_id: storyId },
                    action_url: `/story/${storyId}`,
                    created_at: new Date().toISOString(),
                });
            }
        } else {
             // Manual skip
            await supabase.from('notifications').insert({
                user_id: skippedUserId,
                type: 'turn_skipped',
                title: 'Turn skipped',
                message: `Your turn in "${story.title}" was skipped by the creator.`,
                data: { story_id: storyId },
                action_url: `/story/${storyId}`,
                created_at: new Date().toISOString(),
            });
        }

        // Notify next user if there is one
        if (nextUserId) {
            await supabase.from('notifications').insert({
                user_id: nextUserId,
                type: 'your_turn',
                title: "It's your turn!",
                message: `It's now your turn in "${story.title}"`,
                data: { story_id: storyId },
                action_url: `/story/${storyId}`,
                created_at: new Date().toISOString(),
            });
        }

        return { success: true, nextUserId: nextUserId || undefined };
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

        // 2. Remove user's contributions (Clean up content)
        const { error: contribError } = await supabase
            .from('contributions')
            .delete()
            .match({ story_id: storyId, user_id: userId });

        if (contribError) {
            console.error('Error removing contributions:', contribError);
            return { success: false, error: 'Failed to remove contributions' };
        }

        // 3. Remove user from story_participants
        const { error: deleteError } = await supabase
            .from('story_participants')
            .delete()
            .match({ story_id: storyId, user_id: userId });

        if (deleteError) {
            console.error('Error removing participant:', deleteError);
            return { success: false, error: 'Failed to leave story' };
        }

        // 4. If this user had the current turn, reassign to next participant
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

        // 5. Notify the story creator
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

/**
 * Update story participants - adds new participants and removes removed ones
 * Calculates changes by comparing current DB state with provided new list
 */
export async function updateStoryParticipants(
    storyId: string,
    newParticipants: User[]
): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Get current participants from DB
        const { data: currentParticipants, error: fetchError } = await supabase
            .from('story_participants')
            .select('user_id')
            .eq('story_id', storyId);

        if (fetchError) {
            console.error('Error fetching current participants:', fetchError);
            return { success: false, error: 'Failed to fetch current participants' };
        }

        const currentIds = new Set<string>(currentParticipants?.map((p: { user_id: string }) => p.user_id) || []);
        const newIds = new Set(newParticipants.map(p => p.id));

        // 2. Identify additions and removals
        const toAdd = [...newIds].filter(id => !currentIds.has(id));
        const toRemove = [...currentIds].filter(id => !newIds.has(id));

        // 3. Perform updates
        if (toAdd.length > 0) {
            // Get the highest position currently in the story to append new users
            const { data: maxPosData } = await supabase
                .from('story_participants')
                .select('position')
                .eq('story_id', storyId)
                .order('position', { ascending: false })
                .limit(1)
                .single();
            
            let nextPosition = (maxPosData?.position ?? -1) + 1;

            const participantsToAdd = toAdd.map((userId, index) => ({
                story_id: storyId,
                user_id: userId,
                status: 'waiting', // Default status for added users
                position: nextPosition + index,
                invited_at: new Date().toISOString()
            }));

            const { error: insertError } = await supabase
                .from('story_participants')
                .insert(participantsToAdd);

            if (insertError) {
                console.error('Error adding participants:', insertError);
                return { success: false, error: 'Failed to add new participants' };
            }

            // Send notifications to new participants
            toAdd.forEach(userId => {
                supabase.from('notifications').insert({
                    user_id: userId,
                    type: 'story_invite',
                    title: 'New Story Invite',
                    message: 'You have been added to a story.',
                    data: { story_id: storyId },
                    action_url: `/story/${storyId}`, 
                    created_at: new Date().toISOString()
                }).then(({ error }: { error: any }) => {
                    if (error) console.error('Failed to send invite notification to', userId, error);
                });
            });
        }

        if (toRemove.length > 0) {
            const { error: deleteError } = await supabase
                .from('story_participants')
                .delete()
                .eq('story_id', storyId)
                .in('user_id', toRemove);

            if (deleteError) {
                console.error('Error removing participants:', deleteError);
                return { success: false, error: 'Failed to remove participants' };
            }
        }

        return { success: true };
    } catch (error) {
        console.error('Unexpected error updating participants:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

/**
 * Remove a participant and their contributions from a story.
 * This frees up the slot and removes the content.
 * Matches by userId AND optionally position/slotIndex to support multiple contributions by same user.
 */
export async function removeParticipant(
    storyId: string,
    userId: string,
    userName: string,
    position?: number,
    contributionId?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Fetch story details to determine behavior (Public vs Private logic)
        const { data: story, error: storyError } = await supabase
            .from('stories')
            .select('visibility, mode, creator_id, current_turn_user_id, title')
            .eq('id', storyId)
            .single();

        if (storyError || !story) {
            console.error('Error fetching story:', storyError);
            return { success: false, error: 'Story not found' };
        }

        // 1. Remove from contributions (Content first) - ALWAYS delete content
        let contribQuery = supabase
            .from('contributions')
            .delete()
            .match({ story_id: storyId, user_id: userId });
        
        if (contributionId) {
            contribQuery = contribQuery.eq('id', contributionId);
        } else if (typeof position === 'number') {
             // Fallback if needed, but risky as discussed
        }

        const { error: contribError } = await contribQuery;

        if (contribError) {
             console.error('Error removing contributions:', contribError);
             return { success: false, error: 'Failed to remove content' };
        }

        // 2. Handle Participant Row (Delete vs Reset to Waiting)
        // If Private/Invite: Reset to 'waiting' so it goes back to Waiting tab
        // If Public/Open: Delete row so slot is open for feed
        const isPrivate = story.visibility === 'private' || story.mode === 'invite';
        
        // If I am the creator removing a participant, I probably want to clear the slot (delete row) so I can invite someone else?
        // OR does "Waiting" mean waiting for THAT specific user? 
        // If I assigned "John", and I delete "John's part", do I want "John" to try again? Or do I want slot open?
        // User request: "If its a slot from a private story... put this back inside the users waiting tab."
        // "Users waiting tab" implies the participant's waiting tab. So we must keep them as a participant.
        
        if (isPrivate) {
            // Update status to waiting
            let updateQuery = supabase
                .from('story_participants')
                .update({ status: 'waiting' }) // Reset to waiting
                .match({ story_id: storyId, user_id: userId });
            
            if (typeof position === 'number') {
                updateQuery = updateQuery.eq('position', position);
            }
            
            const { error: updateError } = await updateQuery;
            if (updateError) {
                console.error('Error resetting participant status:', updateError);
                return { success: false, error: 'Failed to update participant status' };
            }
        } else {
            // Public: Delete the participant row entirely
            let partQuery = supabase
                .from('story_participants')
                .delete()
                .match({ story_id: storyId, user_id: userId });

            if (typeof position === 'number') {
                partQuery = partQuery.eq('position', position);
            }

            const { error: partError } = await partQuery;
            if (partError) {
                console.error('Error removing participant:', partError);
                return { success: false, error: 'Failed to remove participant' };
            }
        }

        // 3. Reset turn if it was theirs
        if (story.current_turn_user_id === userId) {
            await supabase
                .from('stories')
                .update({ current_turn_user_id: null })
                .eq('id', storyId);
        }

        // 4. Notify creator (if not the one leaving/removed)
        if (story && story.creator_id !== userId) {
             await notifyParticipantLeft(storyId, story.title, story.creator_id, userName);
        }

        return { success: true };
    } catch (error) {
        console.error('Error in removeParticipant:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}
