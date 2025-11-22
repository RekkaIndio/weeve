import { supabase } from './supabase';
import { Story, Contribution, User, MediaType, TextStyle, Group } from './store';

export async function fetchGroups(): Promise<Group[]> {
    try {
        const { data, error } = await supabase
            .from('groups')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching groups:', error);
            return [];
        }

        return data.map((g: any) => ({
            id: g.id,
            name: g.name,
            description: g.description,
            avatar: g.avatar,
            memberCount: g.member_count,
            isPrivate: g.is_private,
        }));
    } catch (error) {
        console.error('Unexpected error fetching groups:', error);
        return [];
    }
}

export async function fetchUserStories(userId: string): Promise<Story[]> {
    try {
        // 1. Fetch stories where user is a participant
        // We need to join with story_participants to filter by user_id
        const { data: participatedStories, error: participationError } = await supabase
            .from('story_participants')
            .select(`
        story:stories (
          id,
          title,
          description,
          creator_id,
          mode,
          status,
          current_turn_user_id,
          max_weeves,
          cover_image,
          theme,
          created_at
        )
      `)
            .eq('user_id', userId);

        if (participationError) {
            console.error('Error fetching participated stories:', participationError);
            return [];
        }

        // Extract story IDs
        const storyIds = participatedStories
            .map((item: any) => item.story?.id)
            .filter((id: string | undefined): id is string => !!id);

        if (storyIds.length === 0) return [];

        // 2. Fetch full story details including participants and contributions for these stories
        const { data: storiesData, error: storiesError } = await supabase
            .from('stories')
            .select(`
        *,
        contributions (*),
        story_participants (
          user:profiles (*)
        ),
        group:groups (
            avatar
        )
      `)
            .in('id', storyIds)
            .order('created_at', { ascending: false });

        if (storiesError) {
            console.error('Error fetching full story details:', storiesError);
            return [];
        }

        if (!storiesData) return [];

        // 3. Map to Store types
        const mappedStories: Story[] = storiesData.map((story: any) => {
            // Map Participants
            const participants: User[] = story.story_participants
                .sort((a: any, b: any) => (a.position || 0) - (b.position || 0)) // Assuming position exists or we sort by join order
                .map((p: any) => ({
                    id: p.user.user_id,
                    name: p.user.name,
                    avatar: p.user.avatar,
                    tokens: p.user.tokens,
                    isInfluencer: p.user.is_influencer,
                    interactionCost: p.user.interaction_cost,
                    inviteCode: p.user.invite_code,
                }));

            // Map Contributions
            const contributions: Contribution[] = (story.contributions || [])
                .sort((a: any, b: any) => a.timestamp - b.timestamp)
                .map((c: any) => ({
                    id: c.id,
                    userId: c.user_id,
                    userName: c.user_name,
                    content: c.content,
                    mediaType: c.media_type as MediaType,
                    mediaUrl: c.media_url,
                    timestamp: c.timestamp,
                    // textStyle: c.text_style // If we had this in DB
                }));

            return {
                id: story.id,
                title: story.title,
                description: story.description,
                creatorId: story.creator_id,
                visibility: 'public', // Default or map if DB has it (it does in our types but maybe not in this specific return if strict)
                status: story.status,
                currentTurnUserId: story.current_turn_user_id,
                contributions,
                participants,
                maxWeeves: story.max_weeves,
                coverImage: story.cover_image,
                theme: story.theme,
                groupId: story.group_id,
                groupAvatar: story.group?.avatar,
            };
        });

        return mappedStories;

    } catch (error) {
        console.error('Unexpected error fetching stories:', error);
        return [];
    }
}
