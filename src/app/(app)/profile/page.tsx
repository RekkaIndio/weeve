"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useStore } from "@/lib/store";
import { Settings, Grid, Bookmark, Share2, Wallet, UserPlus, X, Copy, Check, Camera, Clock, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";
import { toast } from "sonner";
import { updateUserProfile } from "@/lib/auth";
import { capturePhoto } from "@/lib/camera";
import { getLatestSession, setLatestSession } from "@/lib/auth-session";
import { buildPublicUrl } from "@/lib/url";
import type { Session } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import AestheticFallback from "@/app/components/AestheticFallback";
import VideoThumbnail from "@/app/components/VideoThumbnail";
import VerificationBadge from "@/app/components/VerificationBadge";

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
        promise
            .then((value) => {
                clearTimeout(timeoutId);
                resolve(value);
            })
            .catch((error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
    });
}

const AVATAR_MAX_DIMENSION = 1024;

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

const inferFileExtension = (file: File): string => {
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
    const timeoutId = setTimeout(() => controller.abort(), 30000);

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
        if (fetchError?.name === 'AbortError') {
            throw new Error('Upload timed out after 30 seconds');
        }
        throw fetchError;
    }
    clearTimeout(timeoutId);

    let responseText = '';
    try {
        responseText = await response.text();
    } catch (readError) {
        console.warn('[Profile] Failed to read storage response body:', readError);
    }

    console.log('[Profile] Storage REST response status:', response.status);
    if (responseText) {
        try {
            console.log('[Profile] Storage REST response body:', JSON.parse(responseText));
        } catch {
            console.log('[Profile] Storage REST response (text):', responseText);
        }
    }

    if (!response.ok) {
        throw new Error(`Storage upload failed with status ${response.status}: ${responseText}`);
    }
}

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

async function acquireUploadSession(): Promise<Session | null> {
    let session: Session | null = getLatestSession();
    let sessionTimedOut = false;
    const sessionFetchedFromCache = !!session;

    if (!session) {
        try {
            const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
                setTimeout(() => resolve({ timedOut: true }), 4000);
            });

            const sessionResult = await Promise.race([
                supabase.auth
                    .getSession()
                    .then((result: any) => ({ ...result, timedOut: false as const }))
                    .catch((error: any) => ({ data: null, error, timedOut: false as const })),
                timeoutPromise,
            ]);

            if ('timedOut' in sessionResult && sessionResult.timedOut) {
                sessionTimedOut = true;
                console.warn('[Profile] Session retrieval timed out after 4s, continuing with fallback strategies');
            } else {
                const { data: sessionData, error: sessionError } = sessionResult as { data: { session: Session | null } | null; error: any };

                if (sessionError) {
                    console.error('[Profile] Session retrieval error:', sessionError);
                }

                session = sessionData?.session ?? null;
                setLatestSession(session ?? null);
            }
        } catch (sessionCatchError) {
            console.error('[Profile] Unexpected error inspecting session:', sessionCatchError);
            session = null;
        }
    }

    console.log('[Profile] Session fetch result', {
        hasSession: !!session,
        timedOut: sessionTimedOut,
        fromCache: sessionFetchedFromCache,
    });

    if (session?.expires_at) {
        const expiresAt = session.expires_at * 1000;
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;

        if (timeUntilExpiry < 5 * 60 * 1000) {
            try {
                const refreshTimeout = new Promise<{ timedOut: true; data: null; error: Error }>((resolve) => {
                    setTimeout(() => resolve({ timedOut: true, data: null, error: new Error('Refresh timeout') }), 4000);
                });

                const refreshResult = await Promise.race([
                    supabase.auth
                        .refreshSession()
                        .then((result: any) => ({ ...result, timedOut: false as const }))
                        .catch((error: any) => ({ data: null, error, timedOut: false as const })),
                    refreshTimeout,
                ]);

                if ('timedOut' in refreshResult && refreshResult.timedOut) {
                    console.warn('[Profile] Proactive session refresh timed out after 4s');
                } else {
                    const { data: refreshData, error: refreshError } = refreshResult as { data: { session: Session | null } | null; error: any };

                    if (refreshError) {
                        console.error('[Profile] Proactive session refresh failed:', refreshError);
                    } else if (refreshData?.session) {
                        session = refreshData.session;
                        setLatestSession(session);
                    }
                }
            } catch (refreshCatchError) {
                console.error('[Profile] Proactive session refresh threw:', refreshCatchError);
            }
        }
    }

    if (!session) {
        console.warn('[Profile] No active session detected before upload, attempting refresh');
        try {
            const fallbackRefreshTimeout = new Promise<{ timedOut: true; data: null; error: Error }>((resolve) => {
                setTimeout(() => resolve({ timedOut: true, data: null, error: new Error('Refresh timeout') }), 4000);
            });

            const refreshResult = await Promise.race([
                supabase.auth
                    .refreshSession()
                    .then((result: any) => ({ ...result, timedOut: false as const }))
                    .catch((error: any) => ({ data: null, error, timedOut: false as const })),
                fallbackRefreshTimeout,
            ]);

            if ('timedOut' in refreshResult && refreshResult.timedOut) {
                console.warn('[Profile] Session refresh timed out after 4s');
            } else {
                const { data: refreshData, error: refreshError } = refreshResult as { data: { session: Session | null } | null; error: any };
                if (refreshError) {
                    console.error('[Profile] Session refresh failed:', refreshError);
                } else if (refreshData?.session) {
                    session = refreshData.session;
                    setLatestSession(session);
                }
            }
        } catch (refreshError) {
            console.error('[Profile] Session refresh threw:', refreshError);
        }

        if (!session) {
            try {
                const { data: retryData, error: retryError } = await supabase.auth.getSession();
                if (retryError) {
                    console.error('[Profile] Session retry failed:', retryError);
                } else if (retryData?.session) {
                    session = retryData.session;
                    setLatestSession(session);
                }
            } catch (retryCatchError) {
                console.error('[Profile] Session retry threw:', retryCatchError);
            }
        }
    }

    return session ?? null;
}

type CompressedAvatarResult = {
    blob: Blob;
    extension: string;
    contentType: string;
};

async function compressAvatarImage(file: File): Promise<CompressedAvatarResult> {
    if (!file.type.startsWith('image/')) {
        return {
            blob: file,
            extension: inferFileExtension(file),
            contentType: file.type || 'application/octet-stream',
        };
    }

    return new Promise<CompressedAvatarResult>((resolve, reject) => {
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

            let { width, height } = img;

            if (width > AVATAR_MAX_DIMENSION || height > AVATAR_MAX_DIMENSION) {
                if (width > height) {
                    height = Math.round((height * AVATAR_MAX_DIMENSION) / width);
                    width = AVATAR_MAX_DIMENSION;
                } else {
                    width = Math.round((width * AVATAR_MAX_DIMENSION) / height);
                    height = AVATAR_MAX_DIMENSION;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not acquire canvas context'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                if (blob) {
                    resolve({
                        blob,
                        extension: 'jpg',
                        contentType: 'image/jpeg',
                    });
                } else {
                    reject(new Error('Failed to compress avatar image'));
                }
            }, 'image/jpeg', 0.85);
        };

        img.onerror = () => {
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
        } catch (error) {
            cleanup();
            reject(error instanceof Error ? error : new Error('Failed to create object URL for compression'));
        }
    });
}

const SECOND_IN_MS = 1000;
const MINUTE_IN_MS = 60 * SECOND_IN_MS;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * HOUR_IN_MS;

const parseTimestamp = (value: number | string | null | undefined): number | undefined => {
    if (value === null || value === undefined) {
        return undefined;
    }

    if (typeof value === 'number') {
        if (value > 0 && value < 1e12) {
            return value * 1000;
        }
        return value;
    }

    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
};

const formatTimeAgo = (past: number, now: number): string => {
    const diff = now - past;

    if (diff <= 0 || diff <= 45 * SECOND_IN_MS) {
        return 'just now';
    }

    if (diff < HOUR_IN_MS) {
        const minutes = Math.max(1, Math.round(diff / MINUTE_IN_MS));
        return `${minutes}m ago`;
    }

    if (diff < DAY_IN_MS) {
        const hours = Math.max(1, Math.round(diff / HOUR_IN_MS));
        return `${hours}h ago`;
    }

    const days = Math.max(1, Math.round(diff / DAY_IN_MS));
    return `${days}d ago`;
};

const formatDurationShort = (ms: number): string => {
    const safeMs = Math.max(0, ms);
    const totalSeconds = Math.round(safeMs / SECOND_IN_MS);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }

    if (minutes > 0) {
        return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    }

    return `${Math.max(0, seconds)}s`;
};

export default function ProfilePage() {
    const { currentUser, stories, setCurrentUser, friends, fetchFriends, setProfileUpdateInProgress, savedStoryIds, fetchSavedStories, fetchStories } = useStore();
    const [activeTab, setActiveTab] = useState<'weeves' | 'saved' | 'waiting'>('weeves');

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);


    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(currentUser?.name || '');
    const [editAvatar, setEditAvatar] = useState(currentUser?.avatar || '');
    const [editTagline, setEditTagline] = useState(currentUser?.tagline || '');
    const [editWebsite, setEditWebsite] = useState(currentUser?.website || '');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Invite Modal State
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [copied, setCopied] = useState(false);

    const [nowMs, setNowMs] = useState(() => Date.now());

    // Basic stats
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    // Fetch real follower/following counts
    useEffect(() => {
        if (!currentUser) return;

        async function fetchStats() {
            // "Followers" = people who friended me (or I accepted) - simplified to bidirectional count for now to match friends, 
            // OR strict directional:
            // Followers: rows in friendships where friend_id = me
            // Following: rows in friendships where user_id = me

            // Getting accurate counts from DB
            const { count: followers } = await supabase
                .from('friendships')
                .select('*', { count: 'exact', head: true })
                .eq('friend_id', currentUser!.id);

            const { count: following } = await supabase
                .from('friendships')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', currentUser!.id);

            setFollowerCount(followers || 0);
            setFollowingCount(following || 0);

            // Also check for website in preferences if not set in main part (backwards compatibility or if not migrated)
            if (!currentUser!.website && currentUser?.preferences) {
                const prefs = currentUser!.preferences as any;
                if (prefs?.website) {
                    setEditWebsite(prefs.website);
                }
            }
        }

        fetchStats();
    }, [currentUser]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const interval = window.setInterval(() => {
            setNowMs(Date.now());
        }, 15000);

        return () => {
            window.clearInterval(interval);
        };
    }, []);

    // Main tab: Show stories where user is a participant BUT exclude stories where it's their turn (those go in timer tab)
    const myStories = currentUser ? stories.filter(s => {
        const userParticipant = s.participants.find(p => p.id === currentUser.id);
        if (!userParticipant) return false;

        // If story is not completed, only show when participant is accepted (or status undefined)
        if (s.status !== 'completed' && userParticipant.status !== 'accepted' && userParticipant.status !== undefined) return false;

        // Exclude stories where the user has a pending waiting slot — these belong in the Waiting tab
        if (userParticipant.status === 'waiting') return false;

        // Exclude stories where it's the user's turn (those belong in the timer tab)
        if (s.status === 'active' && s.currentTurnUserId === currentUser.id) return false;

        return true;
    }) : [];

    // Count contributions across all stories by the current user
    const contributionsCount = stories.reduce((acc, s) => acc + (s.contributions ? s.contributions.filter(c => c.userId === currentUser?.id).length : 0), 0);

    // Calculate total likes from user's stories
    const totalLikes = myStories.reduce((acc, story) => acc + (story.likes || 0), 0);

    // Timer tab: Stories that need user action - pending invites OR active stories where it's the user's turn
    const waitingStories = currentUser ? stories.filter(s => {
        const userParticipant = s.participants.find(p => p.id === currentUser.id);
        if (!userParticipant) return false;

        // Exclude completed stories from waiting tab — they should appear in main weeves tab
        if (s.status === 'completed') return false;

        // Show if it's their turn in an active story
        if (s.status === 'active' && s.currentTurnUserId === currentUser.id) return true;

        // Show if pending invite or waiting slot (any participant entry for user has status 'waiting')
        // This explicitly handles the case of "forked" stories where the user is added to a specific slot
        if (s.participants.some(p => p.id === currentUser.id && p.status === 'waiting')) return true;

        return false;
    }) : [];

    // Real saved stories
    const savedStories = useMemo(() => {
        return stories.filter(s => savedStoryIds.includes(s.id));
    }, [stories, savedStoryIds]);

    useEffect(() => {
        fetchSavedStories();
    }, [fetchSavedStories]);

    // Refresh stories when the user opens the Waiting tab to ensure we hide any fully completed stories
    useEffect(() => {
        if (activeTab === 'waiting') {
            try {
                fetchStories();
            } catch (err) {
                console.warn('[Profile] fetchStories failed while refreshing waiting tab:', err);
            }
        }
    }, [activeTab, fetchStories]);

    const handleSave = async () => {
        console.log('[Profile] handleSave called');

        if (isSaving) {
            console.log('[Profile] Already saving, ignoring duplicate click');
            return;
        }

        if (!currentUser) {
            console.log('[Profile] No current user, aborting save');
            return;
        }

        if (uploadingAvatar) {
            toast.info('Please wait for your profile photo to finish uploading');
            return;
        }

        const trimmedName = editName.trim();
        console.log('[Profile] Trimmed name:', trimmedName);
        if (trimmedName.length === 0) {
            toast.error('Display name cannot be empty');
            return;
        }

        const trimmedTagline = editTagline.trim();
        const trimmedWebsite = editWebsite.trim();
        const normalizedCurrentTagline = currentUser.tagline?.trim() || '';
        const normalizedCurrentWebsite = currentUser.website?.trim() || (currentUser.preferences as any)?.website || '';

        const hasNameChange = trimmedName !== currentUser.name;
        const hasTaglineChange = trimmedTagline !== normalizedCurrentTagline;
        const hasWebsiteChange = trimmedWebsite !== normalizedCurrentWebsite;

        if (!hasNameChange && !hasTaglineChange && !hasWebsiteChange) {
            console.log('[Profile] No changes detected, closing editor');
            toast.info('No changes to save');
            setIsEditing(false);
            return;
        }

        setIsSaving(true);

        try {

            // Check if name has changed and if it already exists
            if (hasNameChange) {
                console.log('[Profile] Name changed, checking uniqueness...');
                const { data: existingUsers, error: checkError } = await supabase
                    .from('profiles')
                    .select('user_id')
                    .ilike('name', trimmedName)
                    .neq('user_id', currentUser.id)
                    .limit(1);

                if (checkError) {
                    console.error('Error checking name uniqueness:', checkError);
                    toast.error('Failed to validate display name');
                    setIsSaving(false);
                    return;
                }

                if (existingUsers && existingUsers.length > 0) {
                    console.log('[Profile] Name already taken');
                    toast.error('This display name is already taken. Please choose another.');
                    setIsSaving(false);
                    return;
                }
                console.log('[Profile] Name is unique, proceeding...');
            } else {
                console.log('[Profile] Name unchanged, skipping uniqueness check');
            }

            const updates: Partial<{ name: string; avatar: string | null; tagline: string | null; preferences: any }> = {};
            if (hasNameChange) {
                updates.name = trimmedName;
            }
            if (hasTaglineChange) {
                updates.tagline = trimmedTagline.length > 0 ? trimmedTagline : null;
            }

            // Handle website update via preferences JSONB to avoid schema migration requirement
            if (hasWebsiteChange) {
                const currentPrefs = (currentUser.preferences as any) || {};
                updates.preferences = {
                    ...currentPrefs,
                    website: trimmedWebsite.length > 0 ? trimmedWebsite : undefined
                };
            }

            console.log('[Profile] Calling updateUserProfile with updates:', updates);

            const result = await withTimeout(
                updateUserProfile(currentUser.id, updates),
                15000,
                'Profile update timeout after 15 seconds'
            );
            const { data: updatedProfile, error } = result;

            console.log('[Profile] updateUserProfile result:', { error });

            if (error) {
                console.error('[Profile] Update error:', error);
                throw error;
            }

            console.log('[Profile] Update successful, updating local state');
            const nextName = updatedProfile?.name ?? (hasNameChange ? trimmedName : currentUser.name);
            const nextTaglineRaw = updatedProfile?.tagline ?? (hasTaglineChange ? (updates.tagline ?? null) : currentUser.tagline ?? null);
            const resolvedTagline = typeof nextTaglineRaw === 'string' && nextTaglineRaw.length > 0 ? nextTaglineRaw : undefined;
            const updatedPrefs = updatedProfile?.preferences as any;

            setCurrentUser({
                ...currentUser,
                name: nextName,
                tagline: resolvedTagline,
                website: updatedPrefs?.website,
                preferences: updatedPrefs || currentUser.preferences,
                tokens: typeof updatedProfile?.tokens === 'number' ? updatedProfile.tokens : currentUser.tokens,
                inviteCode: updatedProfile?.invite_code ?? currentUser.inviteCode,
                isPrivate: typeof updatedProfile?.is_private === 'boolean' ? updatedProfile.is_private : currentUser.isPrivate,
            });
            setEditName(nextName);
            setEditTagline(resolvedTagline ?? '');
            setEditWebsite(updatedPrefs?.website || '');

            toast.success('Profile updated!');
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (!currentUser) return;
        setEditName(currentUser.name);
        setEditAvatar(currentUser.avatar || '');
        setEditTagline(currentUser.tagline || '');
        setEditWebsite(currentUser.website || (currentUser.preferences as any)?.website || '');
        setIsEditing(false);
    };

    const handleAvatarClick = () => {
        // Only allow avatar picker in edit mode
        if (isEditing) {
            setShowAvatarPicker(true);
        }
    };

    const handleMediaSelect = async (source: 'camera' | 'gallery') => {
        setShowAvatarPicker(false);
        try {
            const file = await capturePhoto(source);
            if (file) {
                await handleAvatarUpload(file);
            }
        } catch (error) {
            console.error('Error capturing photo:', error);
            toast.error('Failed to capture photo');
        }
    };

    const handleAvatarUpload = async (file: File) => {
        console.log('[Profile] handleAvatarUpload called', { fileName: file.name, fileType: file.type, fileSize: file.size });
        if (!file || !currentUser) return;

        setProfileUpdateInProgress(true);
        const previousUser = { ...currentUser };
        let previewApplied = false;

        console.log('[Profile] Starting avatar upload...');
        setUploadingAvatar(true);
        console.log('[Profile] uploadingAvatar state set -> true');

        let uploadExtension = inferFileExtension(file);
        let uploadContentType = file.type || 'application/octet-stream';
        let uploadPayload: Blob = file;

        try {
            if (!file.type.startsWith('image/')) {
                console.log('[Profile] Invalid file type:', file.type);
                toast.error('Please select an image file');
                return;
            }

            const compressed = await compressAvatarImage(file);
            uploadPayload = compressed.blob;
            uploadExtension = compressed.extension;
            uploadContentType = compressed.contentType;
            console.log('[Profile] Avatar compressed successfully', {
                originalSize: file.size,
                compressedSize: compressed.blob.size,
                extension: uploadExtension,
            });
        } catch (compressionError) {
            console.warn('[Profile] Avatar compression failed, using original file', compressionError);
        }

        const MAX_FINAL_SIZE = 5 * 1024 * 1024; // 5MB limit for avatar after compression
        if (uploadPayload.size > MAX_FINAL_SIZE) {
            console.warn('[Profile] Compressed avatar still too large:', uploadPayload.size);
            toast.error('Image is too large even after compression. Please choose a smaller photo.');
            return;
        }

        const uniqueSuffix = randomSuffix();
        const fileName = `${currentUser.id}-${Date.now()}-${uniqueSuffix}.${uploadExtension}`;
        const filePath = `user-avatars/${fileName}`;
        let uploadedAvatarUrl: string | null = null;

        try {
            console.log('[Profile] Upload path:', filePath);
            console.log('[Profile] Upload payload details:', {
                size: uploadPayload.size,
                type: uploadContentType,
                extension: uploadExtension,
            });

            let session = await acquireUploadSession();
            let uploadSucceeded = false;
            let uploadError: unknown = null;

            if (session?.access_token) {
                try {
                    await uploadFileToStorage({
                        bucket: 'avatars',
                        objectPath: filePath,
                        file: uploadPayload,
                        cacheControl: '3600',
                        upsert: true,
                        contentType: uploadContentType,
                        accessToken: session.access_token,
                    });
                    uploadSucceeded = true;
                } catch (restUploadError) {
                    console.error('[Profile] REST upload failed, will try SDK next:', restUploadError);
                    uploadError = restUploadError;
                }
            } else {
                console.warn('[Profile] No session token available for REST upload, falling back to SDK');
            }

            if (!uploadSucceeded) {
                const maxRetries = 3;

                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        const uploadPromise = supabase.storage
                            .from('avatars')
                            .upload(filePath, uploadPayload, {
                                upsert: true,
                                cacheControl: '3600',
                                contentType: uploadContentType,
                            });

                        const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) => {
                            setTimeout(() => resolve({ data: null, error: new Error('Upload timeout after 60 seconds') }), 60000);
                        });

                        const uploadResult = await Promise.race([
                            uploadPromise,
                            timeoutPromise,
                        ]);

                        const { error } = uploadResult as { data: unknown; error: unknown };

                        if (error) {
                            console.error(`[Profile] SDK upload attempt ${attempt} failed:`, error);

                            const errorRecord = typeof error === 'object' && error !== null ? error as Record<string, unknown> : null;
                            const statusCode = errorRecord?.statusCode;
                            const message = typeof errorRecord?.message === 'string' ? errorRecord.message : '';

                            if (statusCode === '401' || message.includes('jwt expired')) {
                                console.warn('[Profile] 401 Unauthorized detected. Attempting to refresh session...');
                                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                                if (refreshError) {
                                    console.error('[Profile] Session refresh failed:', refreshError);
                                } else if (refreshData.session) {
                                    setLatestSession(refreshData.session);
                                }
                            }

                            uploadError = error;
                            if (attempt < maxRetries) {
                                await new Promise(resolve => setTimeout(resolve, 1500));
                                continue;
                            }
                        } else {
                            uploadError = null;
                            uploadSucceeded = true;
                            break;
                        }
                    } catch (sdkError) {
                        console.error(`[Profile] SDK upload attempt ${attempt} threw:`, sdkError);
                        uploadError = sdkError;
                        if (attempt < maxRetries) {
                            await new Promise(resolve => setTimeout(resolve, 1500));
                            continue;
                        }
                    }
                }
            }

            if (!uploadSucceeded) {
                console.error('[Profile] Avatar upload failed after multiple attempts');
                throw uploadError ?? new Error('Avatar upload failed');
            }

            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            uploadedAvatarUrl = urlData.publicUrl;
            console.log('[Profile] Avatar URL:', uploadedAvatarUrl);

            setCurrentUser({
                ...previousUser,
                avatar: uploadedAvatarUrl ?? undefined,
            });
            setEditAvatar(uploadedAvatarUrl ?? '');
            previewApplied = true;
            setUploadingAvatar(false);
            console.log('[Profile] uploadingAvatar state set -> false (post-preview)');

            let updatedProfile: ProfileRow | null = null;

            if (session?.access_token) {
                const requestBody = JSON.stringify({ avatar: uploadedAvatarUrl });
                const patchProfile = async (accessToken: string) => {
                    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${encodeURIComponent(currentUser.id)}`, {
                        method: 'PATCH',
                        headers: {
                            apikey: SUPABASE_ANON_KEY,
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                            Prefer: 'return=representation',
                        },
                        body: requestBody,
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`[Profile] REST profile update failed (${response.status}):`, errorText);
                        return { row: null as ProfileRow | null, status: response.status };
                    }

                    const payload = await response.json();
                    const row = Array.isArray(payload) ? (payload[0] as ProfileRow | undefined) ?? null : null;
                    return { row, status: response.status };
                };

                try {
                    const { row, status } = await patchProfile(session.access_token);
                    updatedProfile = row;

                    if (!updatedProfile && status === 401) {
                        console.warn('[Profile] REST profile update returned 401, attempting session refresh');
                        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                        if (refreshError) {
                            console.error('[Profile] Session refresh during profile update failed:', refreshError);
                        } else if (refreshData.session) {
                            session = refreshData.session;
                            setLatestSession(refreshData.session);
                            const retry = await patchProfile(refreshData.session.access_token);
                            updatedProfile = retry.row;
                        }
                    }
                } catch (restError) {
                    console.error('[Profile] REST profile update error:', restError);
                }
            }

            if (!updatedProfile) {
                const { data: fallbackProfile, error: updateError } = await updateUserProfile(currentUser.id, { avatar: uploadedAvatarUrl });

                if (updateError) {
                    console.error('Database update error:', updateError);
                    throw updateError;
                }

                updatedProfile = fallbackProfile;
            }

            const storeState = useStore.getState();
            const baseUser = storeState.currentUser ? { ...storeState.currentUser } : previousUser;

            const resolvedProfile = updatedProfile
                ? {
                    name: updatedProfile.name ?? baseUser.name,
                    avatar: updatedProfile.avatar ?? uploadedAvatarUrl ?? baseUser.avatar,
                    tagline: updatedProfile.tagline ?? baseUser.tagline ?? undefined,
                    tokens: typeof updatedProfile.tokens === 'number' ? updatedProfile.tokens : baseUser.tokens,
                    inviteCode: updatedProfile.invite_code ?? baseUser.inviteCode,
                    isPrivate: typeof updatedProfile.is_private === 'boolean' ? updatedProfile.is_private : baseUser.isPrivate,
                }
                : {
                    name: baseUser.name,
                    avatar: uploadedAvatarUrl ?? baseUser.avatar,
                    tagline: baseUser.tagline ?? undefined,
                    tokens: baseUser.tokens,
                    inviteCode: baseUser.inviteCode,
                    isPrivate: baseUser.isPrivate,
                };

            const resolvedTagline = typeof resolvedProfile.tagline === 'string' && resolvedProfile.tagline.length > 0 ? resolvedProfile.tagline : undefined;
            const resolvedAvatar = resolvedProfile.avatar ?? uploadedAvatarUrl ?? baseUser.avatar;

            setCurrentUser({
                ...baseUser,
                name: resolvedProfile.name,
                avatar: resolvedAvatar,
                tagline: resolvedTagline,
                tokens: resolvedProfile.tokens,
                inviteCode: resolvedProfile.inviteCode,
                isPrivate: resolvedProfile.isPrivate,
            });
            setEditAvatar(resolvedAvatar ?? '');
            setEditTagline(resolvedTagline ?? '');
            toast.success('Avatar updated!');
        } catch (error) {
            console.error('Error uploading avatar:', error);
            if (previewApplied) {
                setCurrentUser(previousUser);
                setEditAvatar(previousUser.avatar || '');
                setEditTagline(previousUser.tagline || '');
            }
            toast.error('Failed to update avatar');
        } finally {
            setUploadingAvatar(false);
            console.log('[Profile] uploadingAvatar state set -> false (finally)');
            setProfileUpdateInProgress(false);
        }
    };

    const inviteCode = currentUser?.inviteCode || currentUser?.id || '';
    const inviteLink = useMemo(() => {
        try {
            const url = new URL(buildPublicUrl('/'));
            if (inviteCode) {
                url.searchParams.set('ref', inviteCode);
            }
            return url.toString();
        } catch (err) {
            // Fallback for test environments where URL or searchParams may behave oddly
            const base = buildPublicUrl('/');
            if (inviteCode) {
                return `${base.replace(/\/$/, '')}/?ref=${encodeURIComponent(inviteCode)}`;
            }
            return base;
        }
    }, [inviteCode]);

    const copyTextToClipboard = async (text: string) => {
        if (!text) throw new Error('No text to copy');

        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }

        if (typeof document !== 'undefined') {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'absolute';
            textarea.style.left = '-9999px';

            document.body.appendChild(textarea);

            const selection = document.getSelection();
            const savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

            textarea.select();
            const succeeded = document.execCommand('copy');

            document.body.removeChild(textarea);
            if (savedRange && selection) {
                selection.removeAllRanges();
                selection.addRange(savedRange);
            }

            if (succeeded) {
                return;
            }
        }

        throw new Error('Clipboard copy not supported');
    };

    const handleCopyLink = async () => {
        try {
            await copyTextToClipboard(inviteLink);
            setCopied(true);
            toast.success('Link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            toast.error('Unable to copy link');
        }
    };

    const handleNativeShare = async () => {
        const shareData = {
            title: 'Join me on Weeve!',
            text: `Check out this cool storytelling app! Use my invite code ${inviteCode} to join.`,
            url: inviteLink,
        };
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                return;
            } catch (err) {
                console.log('Error sharing:', err);
            }
        }

        try {
            await copyTextToClipboard(inviteLink);
            toast.success('Link copied to clipboard!');
        } catch (err) {
            console.error('Share fallback failed:', err);
            toast.error('Sharing is not supported on this device.');
        }
    };

    // Show loading state if user is not yet loaded
    if (!currentUser) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pb-24 relative">
            {/* Header */}
            <div className="p-4 flex justify-end items-center">
                <div className="flex items-center gap-4">
                    {/* Wallet Link - HIDDEN
                    <Link href="/wallet" className="flex items-center gap-1 bg-gray-800 px-3 py-1.5 rounded-full">
                        <Wallet className="w-4 h-4 text-[#EC1D99]" />
                        <span className="text-sm font-bold">{currentUser.tokens}</span>
                    </Link>
                    */}
                    <button onClick={() => setShowInviteModal(true)} className="text-white hover:text-gray-300 transition-colors">
                        <UserPlus className="w-6 h-6" />
                    </button>
                    <Link href="/settings">
                        <Settings className="w-6 h-6 text-white hover:text-gray-300 transition-colors" />
                    </Link>
                </div>
            </div>

            <div className="px-4 mb-6">
                {/* Profile Header - Horizontal Layout */}
                <div className="flex items-start gap-4 mb-4">
                    {/* Avatar */}
                    <div
                        className="relative flex-shrink-0 group cursor-pointer"
                        onClick={isEditing ? handleAvatarClick : undefined}
                    >
                        <img
                            src={isEditing ? editAvatar : currentUser.avatar}
                            alt={currentUser.name}
                            className={`w-20 h-20 rounded-full border-2 border-gray-800 bg-gray-800 object-cover ${uploadingAvatar ? 'opacity-50' : ''}`}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${editName}`;
                            }}
                        />
                        {uploadingAvatar && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#EC1D99]"></div>
                            </div>
                        )}
                        {!isEditing && !uploadingAvatar && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-6 h-6 text-white" />
                            </div>
                        )}
                        {isEditing && !uploadingAvatar && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/60 rounded-full opacity-100">
                                <Camera className="w-5 h-5 text-white" />
                                <span className="text-[8px] uppercase tracking-wide text-white/80">Change</span>
                            </div>
                        )}
                        {!isEditing && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleNativeShare();
                                }}
                                className="absolute -bottom-1 -right-1 bg-[#EC1D99] p-1 rounded-full border-2 border-black hover:bg-[#EC1D99]/90 transition-colors"
                            >
                                <Share2 className="w-3 h-3 text-white" />
                            </button>
                        )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold flex items-center gap-1.5 truncate">
                            @{currentUser.name.toLowerCase().replace(/\s+/g, '_')}
                            <VerificationBadge
                                isVerified={currentUser.isVerified || false}
                                tier={currentUser.verificationTier}
                                size="sm"
                            />
                        </h2>
                        <p className="text-sm text-gray-400 line-clamp-2 mt-0.5">
                            {currentUser.tagline || 'Storyteller, dreamer, and weaver of tales. 🌌'}
                        </p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {(currentUser.website || (currentUser.preferences as any)?.website) && (
                                <a
                                    href={currentUser.website || (currentUser.preferences as any)?.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-[#EC1D99] hover:underline"
                                >
                                    {new URL(currentUser.website || (currentUser.preferences as any)?.website).hostname}
                                </a>
                            )}
                            <span className="text-xs text-gray-500">
                                Joined {new Date(currentUser.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                            </span>
                        </div>
                    </div>
                </div>

                {isEditing ? (
                    <div className="w-full space-y-3 mb-4">
                        <div>
                            <label className="text-xs text-gray-500 ml-1">Display Name</label>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#EC1D99]"
                                placeholder="Your Name"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 ml-1">Tagline</label>
                            <textarea
                                value={editTagline}
                                onChange={(e) => setEditTagline(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#EC1D99] resize-none"
                                placeholder="Storyteller, dreamer, and weaver of tales. 🌌"
                                rows={2}
                                maxLength={100}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 ml-1">Website</label>
                            <input
                                type="url"
                                value={editWebsite}
                                onChange={(e) => setEditWebsite(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#EC1D99]"
                                placeholder="https://example.com"
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleCancel}
                                className="flex-1 bg-gray-800 text-white font-bold py-2 rounded-lg text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || uploadingAvatar}
                                className={`flex-1 ${isSaving ? 'bg-gray-600' : 'bg-[#EC1D99]'} ${(isSaving || uploadingAvatar) ? 'cursor-not-allowed opacity-90' : ''} text-white font-bold py-2 rounded-lg text-sm`}
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Stats - Compact Row */}
                        <div className="flex items-center justify-between py-3 border-y border-gray-800 mb-4">
                            <div className="flex-1 text-center">
                                <div className="font-bold text-base">{totalLikes}</div>
                                <div className="text-xs text-gray-500">Likes</div>
                            </div>
                            <Link href="/profile/followers" className="flex-1 text-center hover:opacity-80 transition-opacity cursor-pointer">
                                <div className="font-bold text-base">{followerCount}</div>
                                <div className="text-xs text-gray-500">Followers</div>
                            </Link>
                            <Link href="/profile/following" className="flex-1 text-center hover:opacity-80 transition-opacity cursor-pointer">
                                <div className="font-bold text-base">{followingCount}</div>
                                <div className="text-xs text-gray-500">Following</div>
                            </Link>
                        </div>

                        <button
                            onClick={() => {
                                setEditName(currentUser.name);
                                setEditAvatar(currentUser.avatar || '');
                                setIsEditing(true);
                            }}
                            className="w-full bg-white text-black font-bold py-2 rounded-lg text-sm text-center hover:bg-gray-200 transition-colors"
                        >
                            Edit Profile
                        </button>
                    </>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800 mb-1">
                <button
                    onClick={() => setActiveTab('weeves')}
                    className={`flex-1 flex justify-center py-3 border-b-2 transition-colors ${activeTab === 'weeves'
                        ? 'border-white text-white'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                        }`}
                >
                    <Grid className="w-6 h-6" />
                </button>
                <button
                    onClick={() => setActiveTab('saved')}
                    className={`flex-1 flex justify-center py-3 border-b-2 transition-colors ${activeTab === 'saved'
                        ? 'border-white text-white'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                        }`}
                >
                    <Bookmark className="w-6 h-6" />
                </button>
                <button
                    onClick={() => setActiveTab('waiting')}
                    className={`flex-1 flex justify-center py-3 border-b-2 transition-colors ${activeTab === 'waiting'
                        ? 'border-white text-white'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                        }`}
                >
                    <div className="relative">
                        <Clock className="w-6 h-6" />
                        {waitingStories.length > 0 && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#EC1D99] rounded-full border-2 border-black"></div>
                        )}
                    </div>
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 gap-0.5">
                {activeTab === 'weeves' && (
                    <>
                        {myStories.map(story => {
                            const sortedContributions = (story.contributions || [])
                                .slice()
                                .sort((a, b) => a.timestamp - b.timestamp);
                            const hasContributions = sortedContributions.length > 0;
                            const firstContribution = sortedContributions[0];
                            const waitingForFirstContribution = !hasContributions;

                            const waitingForUser = story.currentTurnUserId
                                ? story.participants.find(p => p.id === story.currentTurnUserId)
                                : null;

                            const isWaitingForNextCreator = !waitingForFirstContribution && story.status === 'active' && story.currentTurnUserId && story.currentTurnUserId !== currentUser.id;
                            const isMyTurn = !waitingForFirstContribution && story.status === 'active' && story.currentTurnUserId === currentUser.id;

                            const firstMediaType = firstContribution?.mediaType;
                            const firstMediaUrl = firstContribution?.mediaUrl;

                            return (
                                <Link key={story.id} href={`/story/${story.id}`} className="aspect-[3/4] relative bg-gray-900 group overflow-hidden">
                                    {firstMediaType === 'video' && firstMediaUrl ? (
                                        <VideoThumbnail
                                            src={firstMediaUrl}
                                            poster={story.coverImage}
                                            className="weeve-inline-video w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : firstMediaType === 'drawing' && firstMediaUrl ? (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                            <img
                                                src={firstMediaUrl}
                                                className="w-full h-auto max-h-full object-contain"
                                                alt="Drawing contribution"
                                            />
                                        </div>
                                    ) : firstMediaType === 'image' && firstMediaUrl ? (
                                        <img
                                            src={firstMediaUrl}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            alt={story.title}
                                        />
                                    ) : firstContribution ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black text-white p-3 text-center">
                                            <p className="text-sm font-semibold leading-snug line-clamp-5">
                                                {firstContribution.content}
                                            </p>
                                        </div>
                                    ) : (
                                        <img
                                            src={story.coverImage || "https://via.placeholder.com/300"}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            alt={story.title}
                                        />
                                    )}



                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute bottom-1 left-1 flex items-center gap-1 text-[10px] font-bold drop-shadow-md text-white">
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                        {story.contributions.length}
                                    </div>
                                </Link>
                            );
                        })}
                        {/* Fillers if needed, but now we have more stories */}
                        {myStories.length < 6 && [1, 2, 3].map(i => (
                            <div key={i} className="aspect-[3/4] bg-gray-900/50"></div>
                        ))}
                    </>
                )}

                {activeTab === 'saved' && (
                    <>
                        {savedStories.length > 0 ? (
                            savedStories.map(story => {
                                const sortedContributions = (story.contributions || [])
                                    .slice()
                                    .sort((a, b) => a.timestamp - b.timestamp);
                                const hasContributions = sortedContributions.length > 0;
                                const firstContribution = sortedContributions[0];
                                const waitingForFirstContribution = !hasContributions;

                                const waitingForUser = story.currentTurnUserId
                                    ? story.participants.find(p => p.id === story.currentTurnUserId)
                                    : null;
                                const isMyTurn = story.status === 'active' && story.currentTurnUserId === currentUser.id;

                                const firstMediaType = firstContribution?.mediaType;
                                const firstMediaUrl = firstContribution?.mediaUrl;

                                return (
                                    <Link key={story.id} href={`/story/${story.id}`} className="aspect-[3/4] relative bg-gray-900 group overflow-hidden">
                                        {waitingForFirstContribution ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black text-white p-3">
                                                <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-sm w-full max-w-[85%]">
                                                    <div className="relative">
                                                        <div className="w-12 h-12 rounded-full border-2 border-[#EC1D99]/70 p-0.5 animate-pulse">
                                                            <img
                                                                src={waitingForUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${waitingForUser?.name || 'Storyteller'}`}
                                                                alt={waitingForUser?.name || 'Next creator'}
                                                                className="w-full h-full rounded-full object-cover"
                                                            />
                                                        </div>
                                                        <div className="absolute -bottom-1 -right-1 bg-[#EC1D99] rounded-full p-0.5">
                                                            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                                                        </div>
                                                    </div>
                                                    <span className="text-[11px] uppercase tracking-wide text-gray-300">Waiting for</span>
                                                    <span className="text-sm font-bold text-white truncate max-w-full">
                                                        {waitingForUser?.name?.split(' ')[0] || 'a collaborator'}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : firstMediaType === 'video' && firstMediaUrl ? (



                                            <VideoThumbnail
                                                src={firstMediaUrl}
                                                poster={story.coverImage}
                                                className="weeve-inline-video w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : firstMediaType === 'drawing' && firstMediaUrl ? (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                                <img
                                                    src={firstMediaUrl}
                                                    className="w-full h-auto max-h-full object-contain transition-transform duration-500 group-hover:scale-105"
                                                    alt="Drawing contribution"
                                                />
                                            </div>
                                        ) : firstMediaType === 'image' && firstMediaUrl ? (
                                            <img
                                                src={firstMediaUrl}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                alt={story.title}
                                            />
                                        ) : firstContribution ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black text-white p-3 text-center">
                                                <p className="text-sm font-semibold leading-snug line-clamp-5">
                                                    {firstContribution.content}
                                                </p>
                                            </div>
                                        ) : (
                                            <img
                                                src={story.coverImage || "https://via.placeholder.com/300"}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                alt={story.title}
                                            />
                                        )}

                                        {isMyTurn && waitingForFirstContribution && (
                                            <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                                                <img src="/weeve-logo.png" alt="Your Turn" className="w-6 h-6 animate-glow-pulse drop-shadow-md" />
                                                <span className="text-[11px] font-bold text-white bg-[#EC1D99] px-2 py-0.5 rounded-full">Your turn</span>
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2">
                                            <Bookmark className="w-4 h-4 text-white fill-white drop-shadow-md" />
                                        </div>
                                        <div className="absolute bottom-1 left-1 flex items-center gap-1 text-[10px] font-bold drop-shadow-md text-white">
                                            <div className="w-2 h-2 bg-white rounded-full"></div>
                                            {story.contributions.length}
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="col-span-3 flex flex-col items-center justify-center py-16 text-gray-500">
                                <Bookmark className="w-12 h-12 mb-3 opacity-50" />
                                <p className="text-sm">No saved weeves yet</p>
                                <p className="text-xs mt-1">Tap the bookmark icon to save weeves</p>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'waiting' && (
                    <>
                        {waitingStories.length > 0 ? (
                            waitingStories.map(story => {
                                const sortedContributions = (story.contributions || [])
                                    .slice()
                                    .sort((a, b) => a.timestamp - b.timestamp);


                                const lastContribution = sortedContributions[sortedContributions.length - 1];
                                const hasContributions = sortedContributions.length > 0;
                                const waitingForFirstContribution = !hasContributions;
                                const waitingForUser = story.currentTurnUserId
                                    ? story.participants.find(p => p.id === story.currentTurnUserId)
                                    : null;

                                const mediaType = lastContribution?.mediaType;
                                const mediaUrl = lastContribution?.mediaUrl;
                                const content = lastContribution?.content;

                                const isMyTurn = story.status === 'active' && story.currentTurnUserId === currentUser.id;
                                const timerHours = typeof story.turnTimerHours === 'number' && story.turnTimerHours > 0 ? story.turnTimerHours : null;
                                const lastContributionTimestamp = parseTimestamp(lastContribution?.timestamp);
                                const fallbackUpdatedAt = parseTimestamp(story.updated_at);
                                const fallbackCreatedAt = parseTimestamp(story.created_at);
                                const resolvedTurnStart = lastContributionTimestamp ?? fallbackUpdatedAt ?? fallbackCreatedAt ?? nowMs;

                                const expiryTimestamp = timerHours !== null
                                    ? resolvedTurnStart + timerHours * 60 * 60 * 1000
                                    : undefined;

                                const remainingMs = typeof expiryTimestamp === 'number' ? expiryTimestamp - nowMs : undefined;
                                const isExpired = typeof remainingMs === 'number' && remainingMs <= 0;
                                const addedLabel = formatTimeAgo(resolvedTurnStart, nowMs);
                                const timeLeftLabel = typeof remainingMs === 'number'
                                    ? (isExpired ? 'Expired' : `${formatDurationShort(remainingMs)} left`)
                                    : null;
                                const showTimerMeta = Boolean(timerHours !== null && addedLabel && timeLeftLabel);

                                return (
                                    <Link key={story.id} href={`/story/${story.id}`} className="aspect-[3/4] relative bg-gray-900 group overflow-hidden border-2 border-[#EC1D99]/50">
                                        {/* Wavy Lines Background - shown when no content */}
                                        {!mediaUrl && !content && (!story.coverImage || story.coverImage.includes('placehold.co')) && (
                                            <AestheticFallback className="absolute inset-0 z-0" showLogo={false} />
                                        )}

                                        {/* Waiting for first contribution overlay */}
                                        {waitingForFirstContribution && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black text-white p-3">
                                                <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-sm w-full max-w-[85%]">
                                                    <div className="relative">
                                                        <div className="w-12 h-12 rounded-full border-2 border-[#EC1D99]/70 p-0.5 animate-pulse">
                                                            <img
                                                                src={waitingForUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${waitingForUser?.name || 'Storyteller'}`}
                                                                alt={waitingForUser?.name || 'Next creator'}
                                                                className="w-full h-full rounded-full object-cover"
                                                            />
                                                        </div>
                                                        <div className="absolute -bottom-1 -right-1 bg-[#EC1D99] rounded-full p-0.5">
                                                            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                                                        </div>
                                                    </div>
                                                    <span className="text-[11px] uppercase tracking-wide text-gray-300">Waiting for</span>
                                                    <span className="text-sm font-bold text-white truncate max-w-full">
                                                        {isMyTurn ? 'You' : (waitingForUser?.name?.split(' ')[0] || 'a collaborator')}
                                                    </span>
                                                </div>

                                                {isMyTurn && (
                                                    <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
                                                        <img
                                                            src="/weeve-logo.png"
                                                            alt="Your Turn"
                                                            className="w-6 h-6 animate-glow-pulse drop-shadow-md"
                                                        />
                                                        <span className="hidden sm:inline-block text-[11px] font-bold text-white bg-[#EC1D99] px-2 py-0.5 rounded-full">Your turn</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Logo indicator - show only when it's my turn */}
                                        {isMyTurn && (
                                            <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
                                                <img
                                                    src="/weeve-logo.png"
                                                    alt="Your Turn"
                                                    className="w-6 h-6 animate-glow-pulse drop-shadow-md"
                                                />
                                                <span className="hidden sm:inline-block text-[11px] font-bold text-white bg-[#EC1D99] px-2 py-0.5 rounded-full">Your turn</span>
                                            </div>
                                        )}

                                        {/* Media Content */}
                                        {mediaType === 'video' && mediaUrl ? (
                                            <VideoThumbnail
                                                src={mediaUrl}
                                                poster={story.coverImage}
                                                className="weeve-inline-video absolute inset-0 w-full h-full object-cover z-10"
                                            />
                                        ) : mediaType === 'drawing' && mediaUrl ? (
                                            <img
                                                src={mediaUrl}
                                                className="absolute inset-0 z-10 w-full h-auto max-h-full object-contain opacity-80"
                                                alt="Drawing contribution"
                                            />
                                        ) : mediaType === 'image' && mediaUrl ? (
                                            <img
                                                src={mediaUrl}
                                                className="absolute inset-0 z-10 w-full h-full object-cover opacity-60"
                                                alt={story.title}
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        ) : content ? (
                                            <div className="absolute inset-0 z-10 flex items-center justify-center p-3">
                                                <p className="text-sm font-semibold leading-snug line-clamp-5 text-white/90 drop-shadow-md text-center">
                                                    {content}
                                                </p>
                                            </div>
                                        ) : story.coverImage && !story.coverImage.includes('placehold.co') ? (
                                            <img
                                                src={story.coverImage}
                                                className="absolute inset-0 z-10 w-full h-full object-cover opacity-50"
                                                alt={story.title}
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        ) : null}

                                        {/* Timer metadata */}
                                        {showTimerMeta && (
                                            <div className="absolute inset-x-0 bottom-0 bg-black/80 px-2 py-1.5 z-20">
                                                <div className="flex items-center justify-between gap-2 text-[10px] font-medium">
                                                    <span className="text-white/80">Added {addedLabel}</span>
                                                    <span className={isExpired ? 'text-red-400' : 'text-[#EC1D99]'}>{timeLeftLabel}</span>
                                                </div>
                                            </div>
                                        )}
                                    </Link>
                                )
                            })
                        ) : (
                            <div className="col-span-3 flex flex-col items-center justify-center py-16 text-gray-500">
                                <Clock className="w-12 h-12 mb-3 opacity-50" />
                                <p className="text-sm">No pending invites</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowInviteModal(false)}>
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xs p-6 relative" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowInviteModal(false)}
                            className="absolute top-3 right-3 text-gray-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-[#EC1D99]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                <UserPlus className="w-6 h-6 text-[#EC1D99]" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">Invite Friends</h3>
                            <p className="text-sm text-gray-400">Share your unique link to earn rewards when friends join!</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 ml-1 mb-1 block">Your Invite Link</label>
                                <div className="flex items-center gap-2 bg-black rounded-lg p-1 border border-gray-800">
                                    <input
                                        readOnly
                                        value={inviteLink}
                                        className="bg-transparent text-sm text-gray-300 px-2 py-1.5 w-full focus:outline-none"
                                    />
                                    <button
                                        onClick={handleCopyLink}
                                        className={`p-2 rounded-md transition-colors ${copied ? 'bg-green-500/20 text-green-500' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleNativeShare}
                                className="w-full bg-[#EC1D99] hover:bg-[#EC1D99]/90 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                                <Share2 className="w-4 h-4" />
                                Share Link
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Avatar Picker Modal */}
            {
                showAvatarPicker && (
                    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end pb-12 bg-black/90 backdrop-blur-sm animate-in slide-in-from-bottom duration-300">
                        <button
                            onClick={() => setShowAvatarPicker(false)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white"
                        >
                            <X className="w-8 h-8" />
                        </button>

                        <h2 className="text-xl font-bold mb-8 text-white">Update Profile Photo</h2>

                        <div className="flex gap-6 mb-8">
                            <button
                                onClick={() => handleMediaSelect('camera')}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[#EC1D99] transition-colors">
                                    <Camera className="w-8 h-8 text-white" />
                                </div>
                                <span className="text-sm font-medium text-white">Take Photo</span>
                            </button>

                            <button
                                onClick={() => handleMediaSelect('gallery')}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[#EC1D99] transition-colors">
                                    <ImageIcon className="w-8 h-8 text-white" />
                                </div>
                                <span className="text-sm font-medium text-white">Upload Photo</span>
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
