import { supabase } from './supabase';
import { Story, Contribution, User, MediaType, TextStyle, Group, StoryComment } from './store';
import type { Database, Json } from './database.types';

const STORY_MEDIA_BUCKET = 'story-media';

const randomSuffix = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2, 10);
};

const normalizeExtension = (value?: string | null) => {
    if (!value) return 'bin';
    const cleaned = value.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleaned === 'jpeg') return 'jpg';
    if (cleaned.length === 0) return 'bin';
    return cleaned;
};

const getFileExtension = (file: File) => {
    if (file.name && file.name.includes('.')) {
        const parts = file.name.split('.');
        const extFromName = parts.pop();
        if (extFromName) return normalizeExtension(extFromName);
    }

    if (file.type && file.type.includes('/')) {
        const [, subtype] = file.type.split('/');
        if (subtype) return normalizeExtension(subtype);
    }

    return 'bin';
};

export interface CreateStoryContributionOptions {
    storyId: string;
    userId: string;
    userName: string;
    mediaType: MediaType;
    content: string;
    file?: File;
    textStyle?: TextStyle;
    timestamp?: number;
    nextTurnUserId?: string | null;
}

const parseTextStyle = (value: Json | null): TextStyle | undefined => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined;
    }

    const record = value as Record<string, unknown>;
    const { fontFamily, fontSize, textColor, backgroundColor, textAlign } = record;

    if (typeof fontFamily !== 'string') return undefined;
    if (typeof fontSize !== 'number') return undefined;
    if (typeof textColor !== 'string') return undefined;
    if (typeof backgroundColor !== 'string') return undefined;
    if (textAlign !== 'left' && textAlign !== 'center' && textAlign !== 'right') return undefined;

    return {
        fontFamily,
        fontSize,
        textColor,
        backgroundColor,
        textAlign,
    };
};

const isStoryWithRelations = (value: unknown): value is StoryWithRelations => {
    if (!value || typeof value !== 'object') return false;

    const record = value as Record<string, unknown>;

    if (typeof record.id !== 'string') return false;

    const { contributions, story_participants, story_likes, story_comments } = record;

    if (contributions !== null && contributions !== undefined && !Array.isArray(contributions)) return false;
    if (story_participants !== null && story_participants !== undefined && !Array.isArray(story_participants)) return false;
    if (story_likes !== null && story_likes !== undefined && !Array.isArray(story_likes)) return false;
    if (story_comments !== null && story_comments !== undefined && !Array.isArray(story_comments)) return false;

    const groupValue = record.group;
    if (groupValue !== null && groupValue !== undefined) {
        if (typeof groupValue !== 'object' || Array.isArray(groupValue)) return false;
    }

    return true;
};

type StoryRow = Database['public']['Tables']['stories']['Row'];
type ContributionRow = Database['public']['Tables']['contributions']['Row'];
type StoryParticipantRow = Database['public']['Tables']['story_participants']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type StoryLikeRow = Database['public']['Tables']['story_likes']['Row'];
type StoryCommentRow = Database['public']['Tables']['story_comments']['Row'];
type GroupRow = Database['public']['Tables']['groups']['Row'];

type StoryWithRelations = StoryRow & {
    contributions: ContributionRow[] | null;
    story_participants: (StoryParticipantRow & { user: ProfileRow | null })[] | null;
    group: Pick<GroupRow, 'avatar'> | null;
    story_likes: StoryLikeRow[] | null;
    story_comments: StoryCommentRow[] | null;
};

const mapStoryFromSupabase = (story: StoryWithRelations): Story => {
    const participants: User[] = (story.story_participants ?? [])
        .slice()
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((participant) => {
            const profile = participant.user;
            const userId = profile?.user_id ?? participant.user_id;
            const name = profile?.name ?? participant.user_id;
            return {
                id: userId,
                name,
                avatar: profile?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
                tokens: profile?.tokens ?? 0,
                isInfluencer: profile?.is_influencer ?? undefined,
                interactionCost: profile?.interaction_cost ?? undefined,
                inviteCode: profile?.invite_code ?? undefined,
            };
        });

    const contributions: Contribution[] = (story.contributions ?? [])
        .slice()
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((contribution) => ({
            id: contribution.id,
            userId: contribution.user_id,
            userName: contribution.user_name,
            content: contribution.content,
            mediaType: contribution.media_type,
            mediaUrl: contribution.media_url ?? undefined,
            timestamp: contribution.timestamp,
            textStyle: parseTextStyle(contribution.text_style),
        }));

    const likesArray = Array.from(new Set((story.story_likes ?? []).map((like) => like.user_id)));

    const comments: StoryComment[] = (story.story_comments ?? [])
        .slice()
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((comment) => ({
            id: comment.id,
            userId: comment.user_id,
            userName: comment.user_name,
            content: comment.content,
            timestamp: Number(comment.timestamp ?? Date.now()),
        }));

    return {
        id: story.id,
        title: story.title,
        description: story.description,
        creatorId: story.creator_id,
        visibility: story.visibility ?? 'private',
        status: story.status,
        currentTurnUserId: story.current_turn_user_id ?? undefined,
        contributions,
        participants,
        maxWeeves: story.max_weeves ?? undefined,
        coverImage: story.cover_image ?? undefined,
        theme: story.theme ?? undefined,
        groupId: story.group_id ?? undefined,
        groupAvatar: story.group?.avatar ?? undefined,
        likes: likesArray.length,
        likedBy: likesArray,
        comments,
    };
};

export async function createStoryContribution(options: CreateStoryContributionOptions): Promise<{ contribution: Contribution }> {
    let publicUrl: string | undefined;

    if (options.file) {
        const extension = getFileExtension(options.file);
        const objectPath = `${options.storyId}/${options.userId}/${Date.now()}-${randomSuffix()}.${extension}`;

        const { error: uploadError } = await supabase.storage
            .from(STORY_MEDIA_BUCKET)
            .upload(objectPath, options.file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) {
            throw uploadError;
        }

        const { data: urlData } = supabase.storage
            .from(STORY_MEDIA_BUCKET)
            .getPublicUrl(objectPath);

        publicUrl = urlData.publicUrl;
    }

    const timestamp = options.timestamp ?? Date.now();

    const textStyleJson: Json | null = options.textStyle ? (options.textStyle as unknown as Json) : null;

    const { data: insertedContribution, error: contributionError } = await supabase
        .from('contributions')
        .insert({
            story_id: options.storyId,
            user_id: options.userId,
            user_name: options.userName,
            content: options.content,
            media_type: options.mediaType,
            media_url: publicUrl,
            timestamp,
            text_style: textStyleJson,
        })
        .select()
        .single();

    if (contributionError) {
        if (typeof contributionError.message === 'string' && contributionError.message.includes('Contribution limit reached')) {
            throw new Error('This story has reached its maximum number of stitches.');
        }
        throw contributionError;
    }

    if (!insertedContribution) {
        throw new Error('Contribution insert did not return data');
    }

    if (options.nextTurnUserId !== undefined) {
        const { error: storyUpdateError } = await supabase
            .from('stories')
            .update({ current_turn_user_id: options.nextTurnUserId ?? null })
            .eq('id', options.storyId);

        if (storyUpdateError) {
            console.error('Failed to update story turn user:', storyUpdateError);
        }
    }

    const textStyle = parseTextStyle(insertedContribution.text_style);

    const contribution: Contribution = {
        id: insertedContribution.id,
        userId: insertedContribution.user_id,
        userName: insertedContribution.user_name,
        content: insertedContribution.content,
        mediaType: insertedContribution.media_type,
        mediaUrl: insertedContribution.media_url ?? undefined,
        timestamp: insertedContribution.timestamp,
        textStyle,
    };

    return { contribution };
}

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

        return data.map((group): Group => ({
            id: group.id,
            name: group.name,
            description: group.description,
            avatar: group.avatar,
            memberCount: group.member_count,
            isPrivate: group.is_private,
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
        type ParticipationRow = {
            story: (Pick<StoryRow,
            'id' | 'title' | 'description' | 'creator_id' | 'mode' | 'status' | 'current_turn_user_id' | 'max_weeves' | 'cover_image' | 'theme' | 'created_at'> & { visibility: StoryRow['visibility'] }) | null;
        };

        const { data: participatedStories, error: participationError } = await supabase
            .from('story_participants')
            .select(`
                story:stories (
                    id,
                    title,
                    description,
                    creator_id,
                    mode,
                    visibility,
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
        const storyIds = ((participatedStories ?? []) as ParticipationRow[])
            .map((item) => item.story?.id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0);

        if (storyIds.length === 0) return [];

        // 2. Fetch full story details including participants and contributions for these stories
        const { data: storiesData, error: storiesError } = await supabase
            .from('stories')
            .select(`
                *,
                contributions (*),
                story_participants (
                    *,
                    user:profiles (*)
                ),
                group:groups (
                        avatar
                ),
                story_likes (*),
                story_comments (*)
            `)
            .in('id', storyIds)
            .order('created_at', { ascending: false });

        if (storiesError) {
            console.error('Error fetching full story details:', storiesError);
            return [];
        }

        if (!storiesData) return [];

        // 3. Map to Store types
        const storyRecords = (storiesData ?? []) as unknown[];
        const mappedStories: Story[] = storyRecords
            .filter(isStoryWithRelations)
            .map((story) => mapStoryFromSupabase(story));

        return mappedStories;

    } catch (error) {
        console.error('Unexpected error fetching stories:', error);
        return [];
    }
}
