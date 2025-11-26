import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
import { getLatestSession, setLatestSession } from './auth-session';
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

// Helper to compress image
async function compressImage(file: File): Promise<Blob> {
    // Only compress images
    if (!file.type.startsWith('image/')) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        let objectUrl: string | null = null;
        let timeoutId: number | null = null;

        const cleanup = () => {
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
                objectUrl = null;
            }
        };

        img.onload = () => {
            cleanup();

            // Calculate new dimensions (max 1920x1920)
            let width = img.width;
            let height = img.height;
            const maxSize = 1920;

            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                } else {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Compress to JPEG 0.8
            canvas.toBlob((blob) => {
                if (blob) {
                    console.log(`[Upload] Compressed image: ${file.size} -> ${blob.size} bytes`);
                    resolve(blob);
                } else {
                    reject(new Error('Canvas toBlob failed'));
                }
            }, 'image/jpeg', 0.8);
        };

        img.onerror = (err) => {
            cleanup();
            reject(new Error('Failed to load image for compression'));
        };

        try {
            objectUrl = URL.createObjectURL(file);
            if (typeof window !== 'undefined') {
                timeoutId = window.setTimeout(() => {
                    cleanup();
                    reject(new Error('Image load timeout during compression'));
                }, 4000);
            }
            img.src = objectUrl;
        } catch (objectUrlError) {
            cleanup();
            reject(objectUrlError instanceof Error ? objectUrlError : new Error('Failed to create object URL for compression'));
        }
    });
}

export async function createStoryContribution(options: CreateStoryContributionOptions): Promise<{ contribution: Contribution }> {
    console.log('[Upload] Starting contribution creation', {
        storyId: options.storyId,
        mediaType: options.mediaType,
        hasFile: !!options.file,
    });

    let session: Session | null = getLatestSession();
    let sessionTimedOut = false;
    const sessionFetchedFromCache = !!session;

    if (!session) {
        try {
            const timeoutPromise = new Promise<{ data: null; error: null; timedOut: true }>((resolve) => {
                setTimeout(() => resolve({ data: null, error: null, timedOut: true }), 4000);
            });

            const sessionResult = await Promise.race([
                supabase.auth.getSession().then((result) => ({ ...result, timedOut: false as const })).catch((error) => ({ data: null, error, timedOut: false as const })),
                timeoutPromise,
            ]);

            if ('timedOut' in sessionResult && sessionResult.timedOut) {
                sessionTimedOut = true;
                console.warn('[Upload] Session retrieval timed out after 4s, continuing without cached session');
            } else {
                const { data: sessionData, error: sessionError } = sessionResult as { data: { session: Session | null } | null; error: any };

                if (sessionError) {
                    console.error('[Upload] Session retrieval error:', sessionError);
                }

                session = sessionData?.session ?? null;
                setLatestSession(session ?? null);
            }
        } catch (sessionCatchError) {
            console.error('[Upload] Unexpected error inspecting session:', sessionCatchError);
            session = null;
        }
    }
    console.log('[Upload] Session fetch result', {
        hasSession: !!session,
        timedOut: sessionTimedOut,
        fromCache: sessionFetchedFromCache,
    });

    // Proactive token refresh if expiring soon (within 5 minutes)
    if (session?.expires_at) {
        const expiresAt = session.expires_at * 1000; // convert to ms
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;

        if (timeUntilExpiry < 5 * 60 * 1000) { // 5 minutes
            try {
                const refreshTimeout = new Promise<{ data: null; error: Error; timedOut: true }>((resolve) => {
                    setTimeout(() => resolve({ data: null, error: new Error('Refresh timeout'), timedOut: true }), 4000);
                });

                const refreshResult = await Promise.race([
                    supabase.auth.refreshSession().then((result) => ({ ...result, timedOut: false as const })).catch((error) => ({ data: null, error, timedOut: false as const })),
                    refreshTimeout,
                ]);

                if ('timedOut' in refreshResult && refreshResult.timedOut) {
                    console.warn('[Upload] Proactive refresh timed out after 4s');
                } else {
                    const { data: refreshData, error: refreshError } = refreshResult as { data: { session: Session | null } | null; error: any };

                    if (refreshError) {
                        console.error('[Upload] Proactive refresh failed:', refreshError);
                    } else if (refreshData?.session) {
                        session = refreshData.session;
                        setLatestSession(session);
                    }
                }
            } catch (err) {
                console.error('[Upload] Proactive refresh failed:', err);
            }
        }
    }

    let hasSession = !!session;
    if (!hasSession) {
        console.warn('[Upload] No active auth session detected before upload');
        try {
            const fallbackRefreshTimeout = new Promise<{ data: null; error: Error; timedOut: true }>((resolve) => {
                setTimeout(() => resolve({ data: null, error: new Error('Refresh timeout'), timedOut: true }), 4000);
            });

            const refreshResult = await Promise.race([
                supabase.auth.refreshSession().then((result) => ({ ...result, timedOut: false as const })).catch((error) => ({ data: null, error, timedOut: false as const })),
                fallbackRefreshTimeout,
            ]);

            if ('timedOut' in refreshResult && refreshResult.timedOut) {
                console.warn('[Upload] Session refresh timed out after 4s');
            } else {
                const { data: refreshData, error: refreshError } = refreshResult as { data: { session: Session | null } | null; error: any };
                if (refreshError) {
                    console.error('[Upload] Session refresh failed:', refreshError);
                } else if (refreshData?.session) {
                    session = refreshData.session;
                    hasSession = true;
                    setLatestSession(session);
                }
            }
        } catch (refreshCatchError) {
            console.error('[Upload] Session refresh threw:', refreshCatchError);
        }

        if (!hasSession) {
            try {
                const { data: retryData, error: retryError } = await supabase.auth.getSession();
                if (retryError) {
                    console.error('[Upload] Session retry failed:', retryError);
                } else if (retryData?.session) {
                    session = retryData.session;
                    hasSession = true;
                    setLatestSession(session);
                }
            } catch (retryCatchError) {
                console.error('[Upload] Session retry threw:', retryCatchError);
            }
        }
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

        // Compress image if applicable
        let uploadBlob: Blob;
        let uploadContentType = options.file.type || 'application/octet-stream';

        try {
            if (options.file.type.startsWith('image/')) {
                uploadBlob = await compressImage(options.file);
                uploadContentType = 'image/jpeg'; // We force JPEG in compression
            } else if (options.file.type.startsWith('video/')) {
                // For video files, don't slice to avoid potential issues
                uploadBlob = options.file;
            } else {
                // For other files, slice to ensure stable Blob
                try {
                    uploadBlob = options.file.slice(0, options.file.size, options.file.type);
                } catch (sliceError) {
                    console.warn('[Upload] File slice failed, falling back to original file:', sliceError);
                    uploadBlob = options.file;
                }
            }
        } catch (compressError) {
            console.warn('[Upload] Preparation failed, falling back to original file:', compressError);
            uploadBlob = options.file;
        }

        let uploadSucceeded = false;
        let uploadError: any = null;

        if (session?.access_token) {
            try {
                await uploadFileToStorage({
                    bucket: STORY_MEDIA_BUCKET,
                    objectPath,
                    file: uploadBlob,
                    cacheControl: '3600',
                    upsert: false,
                    contentType: uploadContentType,
                    accessToken: session.access_token,
                });
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
                // Use the prepared blob directly
                const attemptPayload = uploadBlob;
                const finalContentType = uploadContentType;

                try {
                    const uploadPromise = supabase.storage
                        .from(STORY_MEDIA_BUCKET)
                        .upload(objectPath, attemptPayload, {
                            cacheControl: '3600',
                            upsert: false,
                            contentType: finalContentType,
                        });

                    // Timeout based on file type - longer for videos
                    const isVideo = options.file.type.startsWith('video/');
                    const timeoutMs = isVideo ? 600000 : 300000; // 10 min for video, 5 min for others
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error(`Upload timeout after ${timeoutMs / 1000} seconds`)), timeoutMs);
                    });

                    const uploadResult = await Promise.race([uploadPromise, timeoutPromise]) as any;
                    const { data: uploadData, error } = uploadResult;

                    if (error) {
                        console.error(`[Upload] Attempt ${attempt} failed:`, error);

                        // Check for 401 Unauthorized and try to refresh session
                        if (error.statusCode === '401' || error.message?.includes('jwt expired')) {
                            console.warn('[Upload] 401 Unauthorized detected. Attempting to refresh session...');
                            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                            if (refreshError) {
                                console.error('[Upload] Session refresh failed:', refreshError);
                            } else if (refreshData.session) {
                                console.log('[Upload] Session refreshed successfully (retrying upload)');
                                // Update session variable for next loop if needed (though SDK handles it internally usually)
                                session = refreshData.session;
                            }
                        }

                        try {
                            console.error('[Upload] Error details:', JSON.stringify(error, null, 2));
                        } catch (_) {
                            // ignore serialization errors
                        }

                        uploadError = error;

                        // If not last attempt, wait before retry
                        if (attempt < maxRetries) {
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            continue;
                        }
                    } else {
                        // Success!
                        uploadError = null;
                        uploadSucceeded = true;
                        break;
                    }
                } catch (error: any) {
                    console.error(`[Upload] Attempt ${attempt} exception:`, error);
                    uploadError = error;

                    // If not last attempt, wait before retry
                    if (attempt < maxRetries) {
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

        const { data: urlData } = supabase.storage
            .from(STORY_MEDIA_BUCKET)
            .getPublicUrl(objectPath);

        publicUrl = urlData.publicUrl;
    } else if (options.file) {
        console.warn('[Upload] File provided but lacks size metadata, skipping upload and keeping media_url undefined');
    }

    const timestamp = options.timestamp ?? Date.now();

    const textStyleJson: Json | null = options.textStyle ? (options.textStyle as unknown as Json) : null;

    const insertPayload = {
        story_id: options.storyId,
        user_id: options.userId,
        user_name: options.userName,
        content: options.content,
        media_type: options.mediaType,
        media_url: publicUrl,
        timestamp,
        text_style: textStyleJson,
    } as const;

    let insertedContribution: any = null;
    let contributionError: any = null;

    const attemptRestInsert = async () => {
        if (!session?.access_token) {
            return false;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const restResponse = await fetch(`${SUPABASE_URL}/rest/v1/contributions`, {
                method: 'POST',
                headers: {
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                    Prefer: 'return=representation',
                },
                body: JSON.stringify([insertPayload]),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!restResponse.ok) {
                const errorText = await restResponse.text();
                console.error('[Upload] REST insert failed', restResponse.status, errorText);
                contributionError = new Error(`REST insert failed with status ${restResponse.status}`);
                return false;
            }

            const restData = await restResponse.json();
            insertedContribution = Array.isArray(restData) ? restData[0] ?? null : null;
            contributionError = null;
            return !!insertedContribution;
        } catch (restInsertError) {
            console.error('[Upload] REST insert error', restInsertError);
            contributionError = restInsertError;
            return false;
        }
    };

    const attemptSdkInsert = async () => {
        try {
            const insertTimeoutMs = 4000;
            const sdkInsertPromise = supabase
                .from('contributions')
                .insert(insertPayload)
                .select()
                .single();

            const sdkResult = await Promise.race([
                sdkInsertPromise,
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Insert timeout')), insertTimeoutMs)),
            ]);

            insertedContribution = sdkResult?.data ?? null;
            contributionError = sdkResult?.error ?? null;
            return !!insertedContribution && !contributionError;
        } catch (sdkInsertError) {
            console.warn('[Upload] SDK insert failed or timed out', sdkInsertError);
            contributionError = sdkInsertError;
            return false;
        }
    };

    const restSucceeded = await attemptRestInsert();

    if (!restSucceeded) {
        const sdkSucceeded = await attemptSdkInsert();
        if (!sdkSucceeded && session?.access_token) {
            const restRetrySucceeded = await attemptRestInsert();
            if (!restRetrySucceeded) {
                contributionError = contributionError || new Error('All contribution insert attempts failed');
            } else {
                contributionError = null;
            }
        }
    } else {
        contributionError = null;
    }

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
        console.error('[Upload] No contribution data returned after both insert strategies');
        throw new Error('Contribution insert did not return data');
    }

    if (options.nextTurnUserId !== undefined) {
        const updatePayload = { current_turn_user_id: options.nextTurnUserId ?? null };
        let updateSucceeded = false;

        if (session?.access_token) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);
                const restResponse = await fetch(`${SUPABASE_URL}/rest/v1/stories?id=eq.${options.storyId}`, {
                    method: 'PATCH',
                    headers: {
                        apikey: SUPABASE_ANON_KEY,
                        Authorization: `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                        Prefer: 'return=minimal',
                    },
                    body: JSON.stringify(updatePayload),
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);

                if (!restResponse.ok) {
                    const errorText = await restResponse.text();
                    console.warn('[Upload] Story turn REST update failed', restResponse.status, errorText);
                } else {
                    updateSucceeded = true;
                }
            } catch (restUpdateError) {
                console.warn('[Upload] Story turn REST update error', restUpdateError);
            }
        }

        if (!updateSucceeded) {
            try {
                const updateTimeoutMs = 4000;
                const updatePromise = supabase
                    .from('stories')
                    .update(updatePayload)
                    .eq('id', options.storyId);

                const updateResult = await Promise.race([
                    updatePromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Story turn update timeout')), updateTimeoutMs)),
                ]);

                const { error: storyUpdateError } = updateResult as { error?: unknown };
                if (storyUpdateError) {
                    console.error('[Upload] Story turn update failed via SDK:', storyUpdateError);
                } else {
                    updateSucceeded = true;
                }
            } catch (sdkUpdateError) {
                console.error('[Upload] Story turn update error via SDK:', sdkUpdateError);
            }
        }

        if (!updateSucceeded) {
            console.warn('[Upload] Story turn update ultimately failed (continuing without blocking user)');
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
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('groups')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching groups:', error);
            return [];
        }

        // If user is logged in, check membership for each group
        let membershipMap: Record<string, boolean> = {};
        if (user) {
            const { data: memberships, error: memberError } = await supabase
                .from('group_members')
                .select('group_id')
                .eq('user_id', user.id);

            if (!memberError && memberships) {
                membershipMap = memberships.reduce((acc, m) => {
                    acc[m.group_id] = true;
                    return acc;
                }, {} as Record<string, boolean>);
            }
        }

        return data.map((group): Group => ({
            id: group.id,
            name: group.name,
            description: group.description,
            avatar: group.avatar,
            memberCount: group.member_count,
            isPrivate: group.is_private,
            isMember: membershipMap[group.id] || false,
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
