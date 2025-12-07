import { supabase } from "./supabase";

const ONBOARDING_VIDEO_URL = 'https://fvyhyexdndynoonkzwbd.supabase.co/storage/v1/object/public/story-media/intro-laugh.mp4';
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Creates a personalized onboarding story for a new user
 * This story has a pre-filled middle contribution and allows the user to add the beginning and end
 */
export async function createOnboardingStory(userId: string): Promise<{ storyId: string | null; error: Error | null }> {
    try {
        // Create the onboarding story for this specific user
        // Important: Use 'invite' mode and set current_turn_user_id so turn system works
        const { data: story, error: storyError } = await supabase
            .from('stories')
            .insert({
                title: 'Your First Weeve Story',
                description: 'Complete this 3-part story! We\'ve added the middle - you add the beginning and ending.',
                creator_id: userId,
                mode: 'invite', // Use invite mode to enable turn system
                visibility: 'public',
                status: 'active',
                max_weeves: 3, // Limit to 3 contributions
                cover_image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800',
                current_turn_user_id: userId, // Set user as current turn so they can add weeves
            })
            .select()
            .single();

        if (storyError) throw storyError;
        if (!story) throw new Error('Failed to create onboarding story');

        // Add the user as a participant
        const { error: participantError } = await supabase
            .from('story_participants')
            .insert({
                story_id: story.id,
                user_id: userId,
                position: 0,
            });

        if (participantError && participantError.code !== '23505') {
            throw participantError;
        }

        // Add the pre-filled middle contribution (Part 2) using the system user
        const { error: contributionError } = await supabase
            .from('contributions')
            .insert({
                story_id: story.id,
                user_id: SYSTEM_USER_ID,
                user_name: 'Weeve Tutorial',
                content: '', // Empty content - video only
                media_type: 'video',
                media_url: ONBOARDING_VIDEO_URL,
                timestamp: Date.now(),
            });

        if (contributionError) throw contributionError;

        return { storyId: story.id, error: null };
    } catch (error) {
        console.error('[Onboarding] Error creating onboarding story:', error);
        return { storyId: null, error: error as Error };
    }
}

/**
 * Get the user's personal onboarding story ID
 */
export async function getOnboardingStoryId(userId: string): Promise<string | null> {
    try {
        const { data, error } = await supabase
            .from('stories')
            .select('id')
            .eq('creator_id', userId)
            .eq('title', 'Your First Weeve Story')
            .eq('max_weeves', 3)
            .single();

        if (error || !data) return null;
        return data.id;
    } catch (error) {
        console.error('[Onboarding] Error fetching onboarding story:', error);
        return null;
    }
}
