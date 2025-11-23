import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
import { Story, Contribution, User, MediaType, TextStyle, Group, StoryComment } from './store';
import type { Database, Json } from './database.types';
import type { Session } from '@supabase/supabase-js';

const STORY_MEDIA_BUCKET = 'story-media';

const encodeStoragePath = (path: string) => path.split('/').map(encodeURIComponent).join('/');

async function uploadFileToStorage(params: {
    bucket: string;
    objectPath: string;
    file: File | Blob;
    cacheControl?: string;
    upsert?: boolean;
    contentType?: string;
    accessToken: string;
}) {
    const { bucket, objectPath, file, cacheControl, upsert, contentType, accessToken } = params;
    const url = new URL(`${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeStoragePath(objectPath)}`);

    if (cacheControl) {
        url.searchParams.set('cacheControl', cacheControl);
    }
    if (upsert) {
        url.searchParams.set('upsert', 'true');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let response: Response;
    try {
        response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': contentType || (file instanceof File && file.type ? file.type : 'application/octet-stream'),
            },
            body: file,
            signal: controller.signal,
        });
    } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
            throw new Error('Upload timed out after 30 seconds');
        }
        throw fetchError;
    }
    clearTimeout(timeoutId);

    const responseText = await response.text();

    console.log('[Upload] Storage REST response status:', response.status);
    try {
        console.log('[Upload] Storage REST response body:', responseText ? JSON.parse(responseText) : null);
    } catch {
        console.log('[Upload] Storage REST response (text):', responseText);
    }

    if (!response.ok) {
        throw new Error(`Storage upload failed with status ${response.status}: ${responseText}`);
    }
}

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
    console.log('[Upload] Starting contribution creation', {
        storyId: options.storyId,
        mediaType: options.mediaType,
        hasFile: !!options.file,
        fileSize: options.file?.size,
        fileType: options.file?.type,
    });

    console.log('[Upload] Contribution handler version v5');

    let session: Session | null = null;
    try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Session retrieval timeout')), 10000); // 10 second timeout
        });
        const { data: sessionData, error: sessionError } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        if (sessionError) {
            console.error('[Upload] Session retrieval error:', sessionError);
        }
        session = sessionData?.session ?? null;
        const hasSession = !!sessionData?.session;
        console.log('[Upload] Session check', {
            hasSession: !!sessionData?.session,
            userId: sessionData?.session?.user?.id,
            expiresAt: sessionData?.session?.expires_at,
        });
        if (!hasSession) {
            console.warn('[Upload] No active auth session detected before upload');
        }
    } catch (sessionCatchError) {
        console.error('[Upload] Unexpected error inspecting session:', sessionCatchError);
        session = null;
    }

    let publicUrl: string | undefined;

    if (options.file && typeof options.file.size === 'number') {
        console.log('[Upload] File detected, starting upload process');

        // Check file size (limit to 100MB)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (options.file.size > maxSize) {
            const sizeMB = (options.file.size / (1024 * 1024)).toFixed(2);
            throw new Error(`File too large: ${sizeMB}MB. Maximum size is 100MB.`);
        }

        const extension = getFileExtension(options.file);
        const objectPath = `${options.storyId}/${options.userId}/${Date.now()}-${randomSuffix()}.${extension}`;

        console.log('[Upload] Upload path:', objectPath);
        console.log('[Upload] File details:', {
            name: options.file.name,
            size: options.file.size,
            type: options.file.type,
            extension,
        });

        const uploadContentType = options.file.type || `application/octet-stream`;
        let baseBlob: Blob | null = null;

        if (typeof (options.file as any).arrayBuffer === 'function') {
            try {
                console.log('[Upload] Preparing reusable Blob payload');
                const buffer = await options.file.arrayBuffer();
                console.log('[Upload] ArrayBuffer byteLength:', buffer.byteLength);
                baseBlob = new Blob([buffer], { type: uploadContentType });
            } catch (arrayBufferError) {
                console.warn('[Upload] Failed to prepare reusable Blob payload, falling back to original file:', arrayBufferError);
                baseBlob = null;
            }
        }

        const createPayload = (): File | Blob => {
            if (baseBlob) {
                return baseBlob.slice(0, baseBlob.size, uploadContentType);
            }
            return options.file;
        };

        let uploadSucceeded = false;
        let uploadError: any = null;

        console.log('[Upload] Session snapshot before upload strategy', {
            hasSession: !!session,
            hasAccessToken: !!session?.access_token,
            tokenLength: session?.access_token?.length ?? 0,
        });

        if (session?.access_token) {
            console.log('[Upload] Attempting REST upload first', {
                tokenPrefix: session.access_token.slice(0, 8),
            });
            try {
                const restPayload = createPayload();
                console.log('[Upload] REST payload prepared', {
                    size: restPayload.size,
                    type: (restPayload as File).type || uploadContentType,
                });
                await uploadFileToStorage({
                    bucket: STORY_MEDIA_BUCKET,
                    objectPath,
                    file: restPayload,
                    cacheControl: '3600',
                    upsert: false,
                    contentType: uploadContentType,
                    accessToken: session.access_token,
                });
                console.log('[Upload] REST upload successful!');
                uploadSucceeded = true;
            } catch (restPrimaryError) {
                console.error('[Upload] REST upload failed, will try Supabase SDK next:', restPrimaryError);
                uploadError = restPrimaryError;
            }
        } else {
            console.warn('[Upload] No session token available, skipping REST upload and trying SDK directly');
        }

        if (!uploadSucceeded) {
            const maxRetries = 3;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                console.log(`[Upload] Upload attempt ${attempt}/${maxRetries} via Supabase SDK...`);

                const attemptPayload = createPayload();
                console.log('[Upload] SDK payload prepared', {
                    size: attemptPayload.size,
                    type: (attemptPayload as File).type || uploadContentType,
                });

                try {
                    const uploadPromise = supabase.storage
                        .from(STORY_MEDIA_BUCKET)
                        .upload(objectPath, attemptPayload, {
                            cacheControl: '3600',
                            upsert: false,
                            contentType: uploadContentType,
                        });

                    // 2 minute timeout for large files
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Upload timeout after 2 minutes')), 120000);
                    });

                    const uploadResult = await Promise.race([uploadPromise, timeoutPromise]) as any;
                    console.log(`[Upload] Supabase SDK attempt ${attempt} completed`, {
                        hasData: !!uploadResult?.data,
                        hasError: !!uploadResult?.error,
                    });
                    const { data: uploadData, error } = uploadResult;

                    if (error) {
                        console.error(`[Upload] Attempt ${attempt} failed:`, error);
                        try {
                            console.error('[Upload] Error details:', JSON.stringify(error, null, 2));
                        } catch (_) {
                            // ignore serialization errors
                        }
                        if (uploadResult?.error?.statusCode || uploadResult?.error?.response) {
                            console.error('[Upload] Error status:', uploadResult.error.statusCode);
                            try {
                                console.error('[Upload] Error response body:', uploadResult.error.response?.data || uploadResult.error.response?.text);
                            } catch (responseError) {
                                console.error('[Upload] Failed to log error response body:', responseError);
                            }
                        }
                        uploadError = error;

                        // If not last attempt, wait before retry
                        if (attempt < maxRetries) {
                            console.log(`[Upload] Waiting 2 seconds before retry...`);
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            continue;
                        }
                    } else {
                        // Success!
                        console.log('[Upload] Upload successful via Supabase SDK!');
                        if (uploadData?.path) {
                            console.log('[Upload] Uploaded path:', uploadData.path);
                        }
                        uploadError = null;
                        uploadSucceeded = true;
                        break;
                    }
                } catch (error: any) {
                    console.error(`[Upload] Attempt ${attempt} exception:`, error);
                    uploadError = error;

                    // If not last attempt, wait before retry
                    if (attempt < maxRetries) {
                        console.log(`[Upload] Waiting 2 seconds before retry...`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        continue;
                    }
                }
            }
        }

        if (!uploadSucceeded) {
            console.error('[Upload] All upload strategies failed');
            if (uploadError?.message?.includes('timeout')) {
                throw new Error('Upload timed out after multiple attempts. Please check your internet connection.');
            }
            throw uploadError ?? new Error('Upload failed with unknown error');
        }

        console.log('[Upload] Getting public URL...');
        const { data: urlData } = supabase.storage
            .from(STORY_MEDIA_BUCKET)
            .getPublicUrl(objectPath);

        publicUrl = urlData.publicUrl;
        console.log('[Upload] Public URL obtained:', publicUrl);
    } else if (options.file) {
        console.warn('[Upload] File provided but lacks size metadata, skipping upload and keeping media_url undefined');
    }

    const timestamp = options.timestamp ?? Date.now();

    const textStyleJson: Json | null = options.textStyle ? (options.textStyle as unknown as Json) : null;

    console.log('[Upload] Inserting contribution to database...');
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
        console.error('[Upload] Database insert error:', contributionError);
        try {
            console.error('[Upload] Database insert error details:', JSON.stringify(contributionError, null, 2));
        } catch (_) {
            // ignore serialization errors
        }
        if (typeof contributionError.message === 'string' && contributionError.message.includes('Contribution limit reached')) {
            throw new Error('This story has reached its maximum number of stitches.');
        }
        throw contributionError;
    }

    if (!insertedContribution) {
        console.error('[Upload] No contribution data returned');
        throw new Error('Contribution insert did not return data');
    }

    console.log('[Upload] Contribution inserted successfully:', insertedContribution.id);

    if (options.nextTurnUserId !== undefined) {
        console.log('[Upload] Updating story turn user...');
        const { error: storyUpdateError } = await supabase
            .from('stories')
            .update({ current_turn_user_id: options.nextTurnUserId ?? null })
            .eq('id', options.storyId);

        if (storyUpdateError) {
            console.error('Failed to update story turn user:', storyUpdateError);
        } else {
            console.log('[Upload] Story turn updated successfully');
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

    console.log('[Upload] Contribution creation complete');
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
