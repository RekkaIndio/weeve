"use client";

import { use, useState, useEffect, useRef, useMemo, useCallback } from "react";
import FeedItem from "@/app/components/FeedItem";
import { NON_VIDEO_AUTO_ADVANCE_MS } from "@/lib/playback";
import { useRouter } from "next/navigation";
import { useStore, type TextStyle, type Contribution, type User, type TextElement, type Story } from "@/lib/store";
import { createStoryContribution } from "@/lib/data";
import { leaveStory, deleteStory } from "@/lib/stories";
import { capturePhoto, captureVideo } from "@/lib/camera";
import { Capacitor } from "@capacitor/core";
import { ChevronLeft, Plus, Play, MoreVertical, Video, Camera, Type, Pencil, X, Loader2, Edit2, LogOut, Trash, AlignLeft, AlignCenter, AlignRight, ChevronDown, ChevronUp, FileVideo, Image as ImageIcon, GitBranch, Sparkles, Crop, Smile, Mic } from "lucide-react";
import EditStoryModal from "@/app/components/EditStoryModal";
import ImageCropper from "@/app/components/ImageCropper";
import { DrawingCanvas, type DrawingCanvasRef } from "@/app/components/DrawingCanvas";
import { DraggableSticker } from "@/app/components/DraggableSticker";
import OnboardingTutorialOverlay from "@/app/components/OnboardingTutorialOverlay";
import StitchContextThumbnails from "@/app/components/StitchContextThumbnails";
import AudioRecorder from "@/app/components/AudioRecorder";
import { uploadAudio } from "@/lib/uploadAudio";
import { toast } from "sonner";
import { useTimerCheck } from "@/lib/useTimerCheck";
import { supabase } from "@/lib/supabase";

import {
    TimelineEntry, MediaPickerConfig, PhotoSticker, MediaDraft
} from "./types";
import {
    FONT_OPTIONS,
    FONT_SIZE_OPTIONS,
    TEXT_COLOR_OPTIONS,
    BACKGROUND_OPTIONS,
    ALIGN_OPTIONS,
    DEFAULT_TEXT_STYLE,
    EMPTY_CONTRIBUTIONS
} from "./constants/text";
import { PHOTO_FILTERS } from "./constants/filters";
import { STICKER_EMOJIS, EMOJI_OPTIONS } from "./constants/stickers";

// Components
import { EditorCanvas } from "./components/EditorCanvas";
import { StitchComposer } from "./components/StitchComposer";
import { StoryTimeline } from "./components/StoryTimeline";
import { StitchMenu } from "./components/StitchMenu";
import { MediaPickerOverlay } from "./components/MediaPickerOverlay";

export default function StoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <StoryPageContent storyId={id} />;
}

function StoryPageContent({ storyId }: { storyId: string }) {
    const router = useRouter();
    const { stories, currentUser, addContribution, fetchStories, addStory, forkBrandPost } = useStore();

    const story = stories.find((s) => s.id === storyId);

    // Get original story title for forked stories
    const originalStoryTitle = useMemo(() => {
        if (!story?.forkedFromStoryId) return null;
        const originalStory = stories.find(s => s.id === story.forkedFromStoryId);
        return originalStory?.title || null;
    }, [story?.forkedFromStoryId, stories]);

    // Handle payment success/failure from Stripe redirect
    useEffect(() => {
        const handlePaymentStatus = async () => {
            // Check URL params for payment status
            const urlParams = new URLSearchParams(window.location.search);
            const paymentStatus = urlParams.get('payment');

            if (!paymentStatus || !story) return;

            if (paymentStatus === 'success') {
                try {
                    // Update story payment status to completed
                    const { error } = await supabase
                        .from('stories')
                        .update({ payment_status: 'completed', payment_completed_at: new Date().toISOString() })
                        .eq('id', storyId);

                    if (error) {
                        console.error('Error updating payment status:', error);
                        toast.error('Payment verification failed. Please contact support.');
                    } else {
                        toast.success('Payment successful! Your story is now live.');
                        // Refresh stories to get updated payment status
                        await fetchStories();
                    }
                } catch (err) {
                    console.error('Error processing payment success:', err);
                }

                // Clean up URL
                router.replace(`/story/${storyId}`, { scroll: false });
            }
        };

        handlePaymentStatus();
    }, [storyId, story, router, fetchStories]);

    useEffect(() => {

    }, [storyId, story, stories]);

    const [activeIndex, setActiveIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isFetchingStory, setIsFetchingStory] = useState(false);
    const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

    // Stitch Flow States
    const [showStitchMenu, setShowStitchMenu] = useState(false);
    const [mediaSourcePicker, setMediaSourcePicker] = useState<{ type: 'video' | 'image' } | null>(null);
    const [stitchMode, setStitchMode] = useState<'video' | 'image' | 'text' | 'drawing' | 'audio' | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isForkingBrandPost, setIsForkingBrandPost] = useState(false);
    const uploadStartTimeRef = useRef<number | null>(null);

    // Safety mechanism: Reset stuck upload state when app resumes from background
    // This handles the case where upload completes while app is backgrounded but UI doesn't update
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isUploading) {
                // App just became visible and we were supposedly uploading
                // Check if the user has already contributed (upload completed in background)
                const userAlreadyContributed = currentUser?.id && story?.contributions?.some(c => c.userId === currentUser.id);

                if (userAlreadyContributed) {
                    console.log('[Story] Upload appears to have completed while app was backgrounded. Resetting state.');
                    setIsUploading(false);
                    setStitchMode(null);
                    setMediaDraft(null);
                    setTextElements([]);
                    setShowStitchMenu(false);
                    toast.success('Your contribution was posted!');
                }

                // Also check for timeout - if uploading for more than 2 minutes, assume something went wrong
                const UPLOAD_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
                if (uploadStartTimeRef.current && Date.now() - uploadStartTimeRef.current > UPLOAD_TIMEOUT_MS) {
                    console.warn('[Story] Upload has been stuck for over 2 minutes. Resetting state.');
                    setIsUploading(false);
                    toast.error('Upload timed out. Please try again.');
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Also handle focus events for additional coverage
        window.addEventListener('focus', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleVisibilityChange);
        };
    }, [isUploading, currentUser?.id, story?.contributions]);

    const [textElements, setTextElements] = useState<TextElement[]>([]);
    const [activeElementId, setActiveElementId] = useState<string | null>(null);
    const [mediaDraft, setMediaDraft] = useState<MediaDraft | null>(null);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [photoFilter, setPhotoFilter] = useState<string>('normal');
    const [showPhotoFilterPanel, setShowPhotoFilterPanel] = useState(false);
    const [showStickerPanel, setShowStickerPanel] = useState(false);
    const [photoStickers, setPhotoStickers] = useState<PhotoSticker[]>([]);
    const [draggingStickerId, setDraggingStickerId] = useState<string | null>(null);
    const stickerLastTapRef = useRef<{ id: string; time: number } | null>(null);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [hasMovedInCurrentEdit, setHasMovedInCurrentEdit] = useState(false);
    // Track which slot position the user chose to contribute to (crucial for users with multiple slots)
    const [targetSlotPosition, setTargetSlotPosition] = useState<number | null>(null);

    // Audio recording state
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioDuration, setAudioDuration] = useState<number>(0);

    // Auto-submit when audio recording is complete
    useEffect(() => {
        if (audioBlob && stitchMode === 'audio') {
            handleComposerSubmit();
        }
    }, [audioBlob]);

    // Reset move tracking when entering edit mode
    useEffect(() => {
        setHasMovedInCurrentEdit(false);
    }, [activeElementId]);
    const dragStateRef = useRef<{
        offsetX: number;
        offsetY: number;
        minLeft: number;
        maxLeft: number;
        minTop: number;
        maxTop: number;
        viewportLeft: number;
        viewportTop: number;
        pointerId: number
    } | null>(null);

    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const draggableRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const stageRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef<string | null>(null); // Track which element is being dragged

    // Edit Story States
    const [showMenu, setShowMenu] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const drawingCanvasRef = useRef<DrawingCanvasRef>(null);
    const [showOnboardingTutorial, setShowOnboardingTutorial] = useState(false);

    // Sort contributions by timestamp to ensure proper ordering (especially for forked stories)
    const contributions = useMemo(() => {
        const raw = story?.contributions ?? EMPTY_CONTRIBUTIONS;
        return [...raw].sort((a, b) => a.timestamp - b.timestamp);
    }, [story?.contributions]);
    const maxWeeves = typeof story?.maxWeeves === 'number' ? story?.maxWeeves : null;
    const contributionsCount = contributions.length;

    // Check if current user has a waiting slot AND hasn't contributed yet (for branched stories)
    const currentUserParticipant = story?.participants?.find(p => p.id === currentUser?.id);
    // Consider a user to have a "waiting slot" if they are explicitly marked as waiting OR
    // if they have an assigned position but haven't contributed yet (this matches how we
    // render waiting slots in the timeline and prevents showing a duplicate add button).
    const userHasContributed = currentUser?.id ? contributions.some(c => c.userId === currentUser.id) : false;
    const userHasWaitingSlotRaw = currentUserParticipant?.status === 'waiting' || (currentUserParticipant?.position !== undefined && currentUserParticipant?.position !== null && !userHasContributed);
    const canContributeDespiteCapacity = userHasWaitingSlotRaw && !userHasContributed;

    // Story is at capacity ONLY if contributions >= maxWeeves AND user can't contribute
    const isAtCapacity = maxWeeves !== null && contributionsCount >= maxWeeves && !canContributeDespiteCapacity;

    // Check if current user is involved in this story (creator or participant)
    // If not, treat the story as "complete" for display purposes so they see the normal post view
    // EXCEPTION: Brand posts (canon/seed) allow public users to weave, so don't mark as complete
    const isBrandPost = story?.postType === 'canon' || story?.postType === 'seed';
    const isPublicOpenStory = story?.visibility === 'public' && story?.mode === 'open';
    const isUserInvolvedInStory = currentUser && story && (
        story.creatorId === currentUser.id ||
        story.participants.some(p => p.id === currentUser.id) ||
        isBrandPost || // Brand posts are always "open" for public users to weave
        isPublicOpenStory // Public open stories are "open" for everyone to weave
    );

    const isStoryComplete = story?.status === 'completed' || isAtCapacity || !isUserInvolvedInStory;
    // Final user waiting slot considers story completeness
    const userHasWaitingSlot = userHasWaitingSlotRaw && !isStoryComplete;
    const remainingSlots = maxWeeves !== null ? Math.max(maxWeeves - contributionsCount, 0) : null;
    const activeSegment = contributions[activeIndex];
    const activeTextStyle = useMemo<TextStyle>(() => ({
        ...DEFAULT_TEXT_STYLE,
        ...(activeSegment?.textStyle ?? {}),
    }), [activeSegment?.textStyle]);
    const hasCustomTextStyle = Boolean(activeSegment?.textStyle);

    // Check if it's the user's turn - either explicitly their turn OR they have a waiting slot they haven't filled
    const isExplicitlyMyTurn = !isStoryComplete && story?.currentTurnUserId === currentUser?.id;
    const canContributeWithWaitingSlot = !isStoryComplete && userHasWaitingSlot && !userHasContributed;

    // Sequential check: A user at position N can only contribute if there are at least N contributions
    // This ensures all previous parts are completed before the next person can add theirs
    const userPosition = currentUserParticipant?.position;
    const canContributeSequentially = userPosition === undefined || userPosition === null || contributionsCount >= userPosition;

    const isMyTurn = (isExplicitlyMyTurn || canContributeWithWaitingSlot) && canContributeSequentially;
    const hasContributions = contributions.length > 0;

    // Note: We intentionally do NOT call fetchStories() on mount because:
    // 1. We fetch the specific story by ID if it's not in the store
    // 2. fetchStories() filters out private stories with waiting participants (forked stories),
    //    which would overwrite the story we just added via addStory()

    useEffect(() => {
        // If the story isn't available in the store, try fetching it directly by id.
        if (story || isFetchingStory || hasFetchedOnce) return;
        let cancelled = false;

        const fetchStoryById = async () => {
            try {
                console.log('[Story] fetchStoryById starting for:', storyId);
                setIsFetchingStory(true);
                setHasFetchedOnce(false);
                const { data: s, error } = await supabase
                    .from('stories')
                    .select(`
                        *,
                        contributions (*),
                        groups (
                            name,
                            avatar,
                            is_private
                        ),
                        story_participants (
                            *,
                            profiles:user_id (id, name, avatar, is_influencer)
                        ),
                        story_likes (user_id),
                        story_comments (
                            *,
                            profiles:user_id (name, avatar)
                        )
                    `)
                    .eq('id', storyId)
                    .single();

                console.log('[Story] fetchStoryById result:', { hasData: !!s, error: error?.message, participantsCount: s?.story_participants?.length, contributionsCount: s?.contributions?.length });

                if (error || !s) {
                    console.warn('[Story] fetchStoryById: not found or error', { id: storyId, error });
                    setHasFetchedOnce(true);
                    return;
                }

                // Check if story belongs to a group and validate membership
                if (s.group_id) {
                    // Import isGroupMember dynamically to avoid circular dependencies
                    const { isGroupMember } = await import('@/lib/data');
                    const currentUserId = currentUser?.id;

                    if (currentUserId) {
                        const isMember = await isGroupMember(s.group_id, currentUserId);
                        if (!isMember) {
                            console.warn('[Story] User is not a member of the group for this story');
                            toast.error('You must be a member of this group to view this story');
                            router.push('/groups');
                            return;
                        }
                    } else {
                        // Not logged in - can't view group-specific stories
                        toast.error('Please sign in to view group stories');
                        router.push('/');
                        return;
                    }
                }

                // Note: We intentionally don't check "cancelled" here because we want to 
                // add the story to the store even if the component remounted during navigation

                const participants = (s.story_participants || []).map((sp: any) => {
                    const profile = sp.profiles || { name: 'Unknown', avatar: '' };
                    return {
                        id: sp.user_id,
                        name: profile.name,
                        avatar: profile.avatar,
                        tokens: 0,
                        isInfluencer: profile.is_influencer,
                        status: (sp.status === 'accepted' || sp.status === 'waiting' || sp.status === 'declined') ? (sp.status as 'accepted' | 'waiting' | 'declined') : undefined,
                        position: sp.position,
                    } as User;
                }).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));

                const contributionsFromServer = (s.contributions || []).map((c: any) => ({
                    id: c.id,
                    userId: c.user_id,
                    userName: c.user_name,
                    content: c.content,
                    mediaType: c.media_type,
                    mediaUrl: (c.media_url && c.media_url.trim()) ? c.media_url : undefined,
                    timestamp: c.timestamp,
                    textStyle: c.text_style,
                })) as Contribution[];

                const comments = (s.story_comments || []).map((cm: any) => ({
                    id: cm.id,
                    userId: cm.user_id,
                    userName: cm.user_name || cm.profiles?.name || 'Unknown',
                    content: cm.content,
                    timestamp: cm.timestamp,
                }));

                const likedBy = (s.story_likes || []).map((l: any) => l.user_id);

                const mapped: Story = {
                    id: s.id,
                    title: s.title,
                    description: s.description,
                    creatorId: s.creator_id,
                    visibility: s.visibility,
                    mode: s.mode ?? 'invite',
                    status: s.status,
                    currentTurnUserId: s.current_turn_user_id ?? undefined,
                    contributions: contributionsFromServer,
                    participants,
                    maxWeeves: s.max_weeves ?? undefined,
                    coverImage: s.cover_image ?? undefined,
                    theme: s.theme ?? undefined,
                    groupId: s.group_id ?? undefined,
                    groupName: s.groups?.name,
                    groupAvatar: s.groups?.avatar,
                    likes: likedBy.length,
                    likedBy,
                    comments,
                    created_at: s.created_at ?? undefined,
                    updated_at: s.updated_at ?? undefined,
                    hashtags: s.hashtags ?? undefined,
                    monetizationCost: (s as any).monetization_cost ?? undefined,
                    allowComments: (s as any).allow_comments ?? undefined,
                    allowReuse: (s as any).allow_reuse ?? undefined,
                    turnTimerHours: s.turn_timer_hours ?? undefined,
                    forkedFromStoryId: (s as any).forked_from_story_id ?? undefined,
                    postType: (s as any).post_type ?? 'normal',
                    canonSlots: (s as any).canon_slots ?? undefined,
                    scheduledFor: (s as any).scheduled_for ?? undefined,
                };

                console.log('[Story] About to call addStory with id:', mapped.id);
                addStory(mapped);
                console.log('[Story] addStory called, setting hasFetchedOnce to true');
                setHasFetchedOnce(true);

            } catch (err) {
                console.error('[Story] Error fetching story by id:', err);
                setHasFetchedOnce(true);
            } finally {
                if (!cancelled) setIsFetchingStory(false);
            }
        };

        fetchStoryById();

        return () => { cancelled = true; };
    }, [story, storyId, isFetchingStory, hasFetchedOnce, addStory]);

    useEffect(() => {
        if (story?.visibility === 'private') {

        }
    }, [story, contributions, currentUserParticipant, userHasWaitingSlot, isMyTurn]);

    // Debug logging for onboarding
    useEffect(() => {
        if (story?.title === 'Your First Weeve Story') {

        }
    }, [story, currentUser?.id, isMyTurn, isStoryComplete]);

    // Get last contribution timestamp for timer calculation
    const lastContributionTimestamp = useMemo(() => {
        if (contributions.length === 0) return undefined;
        const sorted = [...contributions].sort((a, b) => b.timestamp - a.timestamp);
        return sorted[0]?.timestamp;
    }, [contributions]);

    // Timer expiration check - automatically skips turn if expired
    useTimerCheck(
        story?.id,
        story?.currentTurnUserId,
        currentUser?.id,
        story?.turnTimerHours,
        lastContributionTimestamp,
        story?.updated_at,
        isMyTurn
    );

    // Check if this is the user's onboarding story and they need tutorial
    useEffect(() => {
        const checkOnboardingStatus = async () => {
            if (!currentUser?.id || !story) {

                return;
            }

            try {
                // Check if this is an onboarding story (title matches and has max 3 weeves)
                const isOnboardingStory = story.title === 'Your First Weeve Story' && story.maxWeeves === 3;



                if (!isOnboardingStory) return;

                const { data } = await supabase
                    .from('profiles')
                    .select('onboarding_step, completed_onboarding')
                    .eq('user_id', currentUser.id)
                    .single();



                // Show tutorial if onboarding_step is 2 and not completed
                if (data && data.onboarding_step === 2 && !data.completed_onboarding) {
                    // Respect a local dismissal flag so this doesn't keep showing repeatedly
                    let dismissed = false;
                    try { dismissed = !!(typeof window !== 'undefined' && localStorage.getItem('weeve_onboarding_story_overlay_dismissed_' + currentUser.id)); } catch (err) { dismissed = false; }

                    if (!dismissed) {

                        setShowOnboardingTutorial(true);
                    }
                }
            } catch (err) {
                console.error('[Story] Error checking onboarding:', err);
            }
        };

        checkOnboardingStatus();
    }, [currentUser?.id, story]);

    const participantMap = useMemo(() => {
        const map = new Map<string, User>();
        (story?.participants ?? []).forEach((participant) => {
            map.set(participant.id, participant);
        });
        return map;
    }, [story?.participants]);
    // Build a unified timeline that includes both contributions AND empty slots (waiting participants)
    // Empty slots should appear at their designated position, not at the end
    const timelineEntries = useMemo(() => {
        const occurrences = new Map<string, number>();
        const latestIndexByUser = new Map<string, number>();
        contributions.forEach((contribution, index) => {
            latestIndexByUser.set(contribution.userId, index);
        });

        // Get participants with status 'waiting' who haven't contributed yet
        // IMPORTANT: Check if the POSITION has a contribution, not just if the USER has contributed
        // This allows the same user to have multiple slots
        const contributionPositions = new Set(
            contributions
                .filter(c => c.timestamp >= 1000000 && c.timestamp < 100000000)
                .map(c => Math.floor(c.timestamp / 1000000) - 1)
        );
        const allParticipants = story?.participants ?? [];

        // For forked stories (private visibility), show empty slot for participants with status='waiting'
        // even if hasContributed is true (because contributions might have been copied from original)
        // For regular stories, show empty slot if participant hasn't contributed TO THAT POSITION
        const isForkedStory = story?.visibility === 'private';
        let waitingParticipants = allParticipants.filter(p => {
            const hasPosition = p.position !== undefined && p.position !== null;
            if (isForkedStory && p.status === 'waiting' && hasPosition) {
                // Fix: If the participant has already contributed to this position,
                // do not show them as waiting (show the contribution instead)
                const hasContributedToPos = contributions.some(c =>
                    c.userId === p.id &&
                    (c.timestamp >= 1000000 && c.timestamp < 100000000
                        ? (Math.floor(c.timestamp / 1000000) - 1) === p.position
                        : false
                    )
                );

                if (hasContributedToPos) {
                    return false;
                }

                // For forked stories, show slot for waiting participants regardless of contribution status
                return true;
            }
            // For regular stories, show if THIS POSITION has no contribution
            // Check position-specific contribution, not user-level
            return hasPosition && !contributionPositions.has(p.position as number);
        });

        // If the story is complete or at capacity, do not display waiting slots — play like a normal completed post
        if (isStoryComplete) {
            waitingParticipants = [];
        }



        // Create entries for contributions
        // Exclude contributions at positions where there's a waiting participant (empty slot)
        const waitingPositions = new Set(waitingParticipants.map(p => p.position as number));

        const contributionEntries = contributions
            .map((contribution, index) => {
                const occurrence = (occurrences.get(contribution.userId) ?? 0) + 1;
                occurrences.set(contribution.userId, occurrence);
                // Calculate position from timestamp (position = timestamp / 1000000 - 1)
                const position = contribution.timestamp >= 1000000 && contribution.timestamp < 100000000
                    ? Math.floor(contribution.timestamp / 1000000) - 1
                    : index;
                return {
                    type: 'contribution' as const,
                    contribution,
                    index,
                    occurrence,
                    isLatestForUser: latestIndexByUser.get(contribution.userId) === index,
                    position,
                };
            })
            // Filter out contributions at positions that have waiting participants
            .filter(entry => !waitingPositions.has(entry.position));

        // Create entries for empty slots (waiting participants)
        const emptySlotEntries = waitingParticipants.map(participant => ({
            type: 'empty' as const,
            participant,
            position: participant.position as number,
        }));

        // Debug logging
        if (story?.visibility === 'private') {

        }

        // Combine and sort by position
        // Combine contributions and waiting participants
        const existingEntries = [
            ...contributionEntries.map(e => ({ ...e, sortPosition: e.position })),
            ...emptySlotEntries.map(e => ({ ...e, sortPosition: e.position })),
        ];

        // Synthesize missing slots up to maxWeeves for Canon/Seed visualization
        const coveredPositions = new Set(existingEntries.map(e => e.position));
        const syntheticEntries = [];

        let totalSlots = story?.maxWeeves || 0;

        // Ensure we at least cover the next available slot if story is not complete, 
        // so we can render the "Add" button in the correct position
        const nextSlotIndex = contributions.length;
        const isComplete = story?.status === 'completed' || (totalSlots > 0 && nextSlotIndex >= totalSlots);

        if (!isComplete && totalSlots <= nextSlotIndex) {
            totalSlots = nextSlotIndex + 1;
        }

        // Only show synthetic slots if we need to cover positions
        if (totalSlots > 0) {
            for (let i = 0; i < totalSlots; i++) {
                if (!coveredPositions.has(i)) {
                    syntheticEntries.push({
                        type: 'empty' as const,
                        participant: null, // Open/Reserved slot with no assigned user
                        position: i,
                        sortPosition: i
                    });
                }
            }
        }

        return [...existingEntries, ...syntheticEntries].sort((a, b) => a.sortPosition - b.sortPosition);
    }, [contributions, story?.participants, story?.maxWeeves]);

    // Separate out contribution entries for backward compatibility
    const contributionTimelineEntries = useMemo(() =>
        timelineEntries.filter(e => e.type === 'contribution'),
        [timelineEntries]);

    const participantsWithoutContributions = useMemo(() => {
        const contributorIds = new Set(contributions.map((contribution) => contribution.userId));
        // Also collect IDs that are shown as waiting slots (positions)
        const waitingSlotIds = new Set((story?.participants ?? []).filter(p => p.position !== undefined && p.position !== null).map(p => p.id));
        // Exclude 'waiting' participants and those with explicit positions (they're shown inline in the timeline)
        const list = (story?.participants ?? []).filter(
            (participant) => !contributorIds.has(participant.id) && participant.status !== 'waiting' && (participant.position === undefined || participant.position === null)
        );
        // Deduplicate by user id so the UI doesn't render repeated entries for the same user
        const seen = new Set<string>();
        return list.filter(p => {
            // Also exclude participants who are already shown in waiting positions (shouldn't be duplicated)
            if (waitingSlotIds.has(p.id)) return false;
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
        });
    }, [story?.participants, contributions]);

    // Styles for timeline items to support scroll snapping on mobile
    const timelineItemSnapStyle = useMemo(() => ({ scrollSnapAlign: 'center' as const }), []);
    const handleContributionSelect = useCallback((index: number) => {
        setActiveIndex(index);
        setIsPlaying(true);
    }, [setActiveIndex, setIsPlaying]);

    const isComposerOpen = stitchMode !== null && !showStitchMenu;
    const composerTitle = useMemo(() => {
        if (stitchMode === 'video') return 'Add Video';
        if (stitchMode === 'image') return 'Add Photo';
        if (stitchMode === 'text') return 'Write Caption';
        if (stitchMode === 'drawing') return 'Create Drawing';
        if (stitchMode === 'audio') return 'Record Audio';
        return 'Compose';
    }, [stitchMode]);

    const isPostDisabled = useMemo(() => {
        if (stitchMode === 'text') {
            return textElements.length === 0 || textElements.every(el => el.content.trim().length === 0);
        }
        return false;
    }, [stitchMode, textElements]);

    // Check if current user is a participant (not creator) - must be before early returns
    const isUserParticipant = useMemo(() => {
        if (!currentUser || !story) return false;
        return story.participants.some(p => p.id === currentUser.id) && story.creatorId !== currentUser.id;
    }, [currentUser, story]);

    const mediaPickerConfig = useMemo(() => {
        if (!mediaSourcePicker) return null;
        const isVideo = mediaSourcePicker.type === 'video';
        return {
            type: mediaSourcePicker.type,
            heading: isVideo ? 'How do you want to add a video?' : 'How do you want to add a photo?',
            takeLabel: isVideo ? 'Take Video' : 'Take Photo',
            uploadLabel: isVideo ? 'Upload Video' : 'Upload Photo',
            TakeIcon: isVideo ? Video : Camera,
            UploadIcon: isVideo ? FileVideo : ImageIcon,
        } as const;
    }, [mediaSourcePicker]);

    // Helper to update a specific element
    const updateElement = (id: string, updates: Partial<TextElement> | ((prev: TextElement) => Partial<TextElement>)) => {
        setTextElements(prev => prev.map(el => {
            if (el.id !== id) return el;
            const newValues = typeof updates === 'function' ? updates(el) : updates;
            return { ...el, ...newValues };
        }));
    };

    // Helper to update style of active element


    const clampPosition = useCallback((left: number, top: number, width: number, height: number) => {
        if (!stageRef.current) return { left, top };
        const viewport = stageRef.current.getBoundingClientRect();
        const bottomPadding = 120;

        const minLeft = 16;
        const maxLeft = Math.max(minLeft, viewport.width - width - 16);
        const minTop = 16;
        const maxTop = Math.max(minTop, viewport.height - height - bottomPadding - 16);

        return {
            left: Math.min(Math.max(left, minLeft), maxLeft),
            top: Math.min(Math.max(top, minTop), maxTop),
        };
    }, []);

    // Effect to center new elements
    useEffect(() => {
        if (!isComposerOpen) return;

        // Only run if we have elements that need positioning (e.g. newly added ones at 0,0)
        // For simplicity, we can just ensure the active element is clamped if it was just added
        // But we need to know if it was just added. 
        // Instead, let's just rely on the initial position being set correctly when adding.
    }, [isComposerOpen]);

    const isClickRef = useRef(false);
    const justSelectedRef = useRef(false);

    const handleDragStart = (event: React.PointerEvent<HTMLDivElement>, id: string) => {
        event.preventDefault();
        event.stopPropagation();
        const elementRef = draggableRefs.current.get(id);
        if (!elementRef) return;

        // Removed the check that prevented dragging active elements.
        // Now rely on stopPropagation in the textarea/input to prevent unwanted drags.

        // If we are dragging the currently active/editing element, flag it as manually moved
        if (id === activeElementId) {
            // Prevent jump: If this is the first move in this session and we were auto-centered,
            // we need to sync the state position to the current visual position immediately.
            if (!hasMovedInCurrentEdit && stageRef.current) {
                const stageRect = stageRef.current.getBoundingClientRect();
                const elementRect = elementRef.getBoundingClientRect();

                updateElement(id, {
                    position: {
                        left: elementRect.left - stageRect.left,
                        top: elementRect.top - stageRect.top
                    }
                });
            }
            setHasMovedInCurrentEdit(true);
        }

        isClickRef.current = true; // Assume click until moved

        const rect = elementRef.getBoundingClientRect();

        // Use window dimensions instead of viewport for simplified calculation
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const minLeft = -rect.width / 2; // Allow pushing partially off-screen
        const maxLeft = viewportWidth - rect.width / 2;
        const minTop = 0;
        const maxTop = viewportHeight - rect.height;

        dragStateRef.current = {
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            minLeft,
            maxLeft,
            minTop,
            maxTop,
            viewportLeft: 0,
            viewportTop: 0,
            pointerId: event.pointerId,
        };
        isDragging.current = id;

        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        elementRef.style.transition = 'none';
        elementRef.style.cursor = 'grabbing';
    };

    // ... (skipping handleDragMove, handleDragEnd)



    // ... 

    const handleDragMove = (event: React.PointerEvent<HTMLDivElement>, id: string) => {
        event.preventDefault();
        event.stopPropagation();

        const dragState = dragStateRef.current;
        const elementRef = draggableRefs.current.get(id);

        if (!dragState || !elementRef || isDragging.current !== id) return;

        // Use a threshold to detect drag vs click
        if (isClickRef.current) {
            const moveDistance = Math.hypot(
                event.movementX,
                event.movementY
            );
            if (moveDistance > 2) {
                isClickRef.current = false;
            }
        }

        const rawLeft = event.clientX - dragState.viewportLeft - dragState.offsetX;
        const rawTop = event.clientY - dragState.viewportTop - dragState.offsetY;

        // No strict clamping during drag for smoother feel, clamp on end
        elementRef.style.transform = `translate3d(${rawLeft}px, ${rawTop}px, 0) scale(1.05)`;
    };

    const handleDragEnd = (event: React.PointerEvent<HTMLDivElement>, id: string) => {
        event.preventDefault();
        event.stopPropagation();
        const dragState = dragStateRef.current;
        const elementRef = draggableRefs.current.get(id);

        if (dragState && elementRef) {
            try {
                (event.currentTarget as HTMLElement).releasePointerCapture(dragState.pointerId);
            } catch (err) { }

            elementRef.style.cursor = 'grab';
            elementRef.style.transform = elementRef.style.transform.replace(' scale(1.05)', '');

            if (isClickRef.current) {
                // It was a click/tap
                justSelectedRef.current = true;
                setActiveElementId(id);
                // Ensure the menu for font is reset or set to default? 
                // Maybe open font menu by default on tap?
                if (!activeMenu) setActiveMenu('font');
                // Reset justSelectedRef after a brief delay to allow onClick to check it
                setTimeout(() => { justSelectedRef.current = false; }, 100);
            } else {
                // It was a drag, commit position
                let rawLeft = event.clientX - dragState.viewportLeft - dragState.offsetX;
                let rawTop = event.clientY - dragState.viewportTop - dragState.offsetY;

                // Soft clamping
                const width = elementRef.getBoundingClientRect().width;
                const height = elementRef.getBoundingClientRect().height;
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                // Keep mainly on screen
                if (rawLeft + width < 20) rawLeft = 20 - width;
                if (rawLeft > viewportWidth - 20) rawLeft = viewportWidth - 20;
                if (rawTop < 60) rawTop = 60; // Top header safe area
                if (rawTop + height > viewportHeight - 100) rawTop = viewportHeight - 100 - height; // Bottom controls safe area

                updateElement(id, { position: { left: rawLeft, top: rawTop } });
            }
        }
        isDragging.current = null;
        dragStateRef.current = null;
    };

    const resetComposer = () => {
        setTextElements([]);
        setActiveElementId(null);
        setMediaDraft(null);
        setStitchMode(null);
        setActiveMenu(null);
        setPhotoFilter('normal');
        setShowPhotoFilterPanel(false);
        setShowStickerPanel(false);
        setPhotoStickers([]);
        setAudioBlob(null);
        setAudioDuration(0);
        dragStateRef.current = null;
    };

    const updateTextStyle = (key: keyof TextStyle, value: string | number) => {
        if (!activeElementId) return;

        setTextElements(prev => prev.map(el => {
            if (el.id === activeElementId) {
                return {
                    ...el,
                    style: {
                        ...el.style,
                        [key]: value
                    }
                };
            }
            return el;
        }));
    };

    const addTextElement = useCallback(() => {
        if (textElements.length >= 5) {
            toast.error("Maximum 5 text boxes allowed");
            return;
        }

        const id = Math.random().toString(36).substr(2, 9);

        // Initial centering strategy:
        // Set position to -1, -1 to indicate "use CSS centering".
        // The render loop will handle this by applying translate(-50%, -50%) and left: 50%, top: 50%.
        // Once dragged, these values will be replaced by absolute pixels.

        const newElement: TextElement = {
            id,
            content: "",
            style: { ...DEFAULT_TEXT_STYLE },
            position: { left: -1, top: -1 }
        };

        setTextElements(prev => [...prev, newElement]);
        setActiveElementId(id);
        setHasMovedInCurrentEdit(false);
        // Close sticker panel when adding text (mutual exclusivity - only one menu open at a time)
        setShowStickerPanel(false);
    }, [textElements.length]);

    const handleComposerCancel = () => {
        resetComposer();
        setShowStitchMenu(false);
    };

    const handleMediaPickerCancel = useCallback(() => {
        setMediaSourcePicker(null);
        setShowStitchMenu(true);
    }, []);

    const handleMediaSourceSelection = useCallback(async (type: 'video' | 'image', source: 'camera' | 'gallery') => {
        setMediaSourcePicker(null);

        try {
            const file = type === 'video' ? await captureVideo(source) : await capturePhoto(source);
            if (file) {
                // Go directly to preview for both image and video (skip auto-crop)
                const previewUrl = URL.createObjectURL(file);
                setMediaDraft({ type, file, previewUrl });
                setTextElements([]); // Clear any existing text
                setStitchMode(type);
                // No initial text box created for media uploads

            } else {

                toast.error(`${type === 'video' ? 'Video' : 'Photo'} capture cancelled or failed. Please try again.`);
                setShowStitchMenu(true);
            }
        } catch (error) {
            console.error(`[Story] ${type} capture failed:`, error);
            toast.error(`${type === 'video' ? 'Video' : 'Photo'} capture failed. Please try again.`);
            setShowStitchMenu(true);
        }
    }, [setMediaDraft, setShowStitchMenu, addTextElement]);

    const handleCroppedImage = useCallback((blob: Blob) => {
        setImageToCrop(null);
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(file);
        setMediaDraft({ type: 'image', file, previewUrl });
        setTextElements([]);
        setStitchMode('image');
    }, []);

    useEffect(() => {
        return () => {
            if (mediaDraft?.previewUrl) {
                URL.revokeObjectURL(mediaDraft.previewUrl);
            }
        };
    }, [mediaDraft?.previewUrl]);

    useEffect(() => {
        if (!isStoryComplete) return;
        resetComposer();
        setShowStitchMenu(false);
        setIsPlaying(true);
    }, [isStoryComplete]);

    if (!story) {
        console.log('[Story] No story found for id:', storyId, 'isFetchingStory:', isFetchingStory, 'hasFetchedOnce:', hasFetchedOnce, 'storiesCount:', stories.length);
        if (isFetchingStory || !hasFetchedOnce) {
            return (
                <div className="min-h-screen bg-black text-white flex items-center justify-center">
                    <div className="text-gray-500">Loading...</div>
                </div>
            );
        }
        return <div>Story not found</div>;
    }

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    // If story is complete, render it using the feed-style UI so it behaves like a normal post
    if (isStoryComplete) {
        return (
            <div className="h-full flex flex-col bg-black text-white relative">
                {/* Header (same as story header) */}
                <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none">
                    <button onClick={() => router.back()} className="p-2 rounded-full glass hover:bg-white/10 transition-colors pointer-events-auto">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col items-center">
                        <h1 className="font-bold text-sm tracking-wide uppercase opacity-80 font-sans">Weeve Timeline</h1>
                        {story?.title && <div className="text-sm text-gray-300 mt-1 font-semibold">{story.title}</div>}


                        {/* Weeve of indicator for forked stories */}
                        {story.forkedFromStoryId && (
                            <button
                                onClick={() => router.push(`/story/${story.forkedFromStoryId}`)}
                                className="flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full bg-[#EC1D99]/20 hover:bg-[#EC1D99]/30 transition-colors pointer-events-auto"
                            >
                                <GitBranch className="w-3 h-3 text-[#EC1D99]" />
                                <span className="text-[10px] font-medium text-gray-300">Weeve of:</span>
                                <span className="text-[10px] font-medium text-[#EC1D99] truncate max-w-[100px]">
                                    {originalStoryTitle || 'Original'}
                                </span>
                            </button>
                        )}
                        {story.groupId && (
                            <button
                                onClick={() => router.push(`/groups/${story.groupId}`)}
                                className="flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                {story.groupAvatar && (
                                    <img
                                        src={story.groupAvatar}
                                        alt="Group"
                                        className="w-3 h-3 rounded-full"
                                    />
                                )}
                                <span className="text-[10px] font-medium text-gray-300">{story.groupName || 'From Group'}</span>
                            </button>
                        )}
                    </div>
                    <div className="relative pointer-events-auto">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 rounded-full glass hover:bg-white/10 transition-colors pointer-events-auto"
                        >
                            <MoreVertical className="w-6 h-6" />
                        </button>

                        {/* Dropdown Menu */}
                        {showMenu && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden pointer-events-auto z-50">
                                {story.creatorId === currentUser.id && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setShowEditModal(true);
                                                setShowMenu(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm font-medium text-white">Edit Story</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowDeleteConfirm(true);
                                                setShowMenu(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors border-t border-gray-800"
                                        >
                                            <Trash className="w-4 h-4 text-red-400" />
                                            <span className="text-sm font-medium text-red-400">Delete Story</span>
                                        </button>
                                    </>
                                )}
                                {isUserParticipant && (
                                    <button
                                        onClick={() => {
                                            setShowLeaveConfirm(true);
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors border-t border-gray-800"
                                    >
                                        <LogOut className="w-4 h-4 text-red-400" />
                                        <span className="text-sm font-medium text-red-400">Leave Story</span>
                                    </button>
                                )}
                                {story.forkedFromStoryId && (
                                    <button
                                        onClick={() => {
                                            router.push(`/story/${story.forkedFromStoryId}`);
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors border-t border-gray-800"
                                    >
                                        <GitBranch className="w-4 h-4 text-[#EC1D99]" />
                                        <span className="text-sm font-medium text-white">View Original Weeve</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* FeedItem renders the feed-style post UI */}
                <div className="flex-1">
                    {/* Choose initial contribution to match the profile thumbnail if possible */}
                    {(() => {
                        let chosenId: string | undefined = undefined;
                        if (contributions && contributions.length > 0) {
                            const exact = contributions.find(c => c.mediaUrl === story.coverImage);
                            if (exact) chosenId = exact.id;
                            else {
                                const substring = contributions.find(c => c.mediaUrl && story.coverImage && (c.mediaUrl.includes(story.coverImage) || (story.coverImage.includes && story.coverImage.includes(c.mediaUrl))));
                                if (substring) chosenId = substring.id;
                            }
                            if (!chosenId) chosenId = contributions[0]?.id;
                        }
                        console.debug('[StoryPage] Rendering completed story via FeedItem - chosenId:', chosenId, 'contributionIds:', (contributions || []).map(c => ({ id: c.id, mediaUrl: c.mediaUrl })));
                        return (
                            <FeedItem
                                story={story}
                                initialContributionId={chosenId}
                            />
                        );
                    })()}
                </div>
            </div>
        );
    }

    const handleNext = () => {
        if (activeIndex < story.contributions.length - 1) {
            setActiveIndex(prev => prev + 1);
        } else {
            setIsPlaying(false); // End of story
        }
    };

    const handleStitchOption = async (mode: 'video' | 'image' | 'text' | 'drawing' | 'audio') => {
        if (isStoryComplete) {
            toast.error('This story has reached its stitch limit.');
            return;
        }

        setShowStitchMenu(false);
        resetComposer();

        if (mode === 'text') {
            setTextElements([]);
            setStitchMode('text');
            // Ensure we have an initial element to edit
            addTextElement();
            return;
        }


        if (mode === 'video') {

            if (Capacitor.isNativePlatform()) {
                setMediaSourcePicker({ type: 'video' });
            } else {
                await handleMediaSourceSelection('video', 'gallery');
            }
            return;
        }

        if (mode === 'image') {

            if (Capacitor.isNativePlatform()) {
                setMediaSourcePicker({ type: 'image' });
            } else {
                await handleMediaSourceSelection('image', 'gallery');
            }
            return;
        }

        if (mode === 'drawing') {

            setStitchMode('drawing');
            return;
        }

        if (mode === 'audio') {
            setStitchMode('audio');
            return;
        }
    };

    const computeNextTurnUserId = (willComplete: boolean) => {
        if (willComplete) {
            return undefined;
        }
        const participants = story.participants;
        const currentIndex = participants.findIndex((p) => p.id === currentUser.id);
        if (currentIndex === -1 || participants.length === 0) {
            return story.currentTurnUserId;
        }
        const nextIndex = (currentIndex + 1) % participants.length;
        return participants[nextIndex]?.id ?? story.currentTurnUserId;
    };

    const handleComposerSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!stitchMode || !currentUser) return;

        if (isStoryComplete) {
            toast.error('This story has reached its stitch limit.');
            resetComposer();
            setShowStitchMenu(false);
            return;
        }

        // BRAND POST: One-time contribution limit
        // Check if this is a brand post and user has already contributed
        // EXCEPTION: Brand owners can contribute multiple times to fill their reserved slots
        const isBrandOwner = story && currentUser && story.creatorId === currentUser.id;
        const isBrandPost = story?.postType === 'canon' || story?.postType === 'seed';
        const userHasContributed = story.contributions?.some(c => c.userId === currentUser.id);

        if (isBrandPost && !isBrandOwner && userHasContributed) {
            toast.error("You've already contributed to this brand post.");
            resetComposer();
            setShowStitchMenu(false);
            return;
        }

        const trimmed = (stitchMode === 'text' || stitchMode === 'drawing') ? textElements.map(el => el.content).join(" ").trim() : '';

        if (stitchMode === 'text' && trimmed.length === 0) {
            toast.error('Please add some text before posting.');
            return;
        }

        // Handle drawing export
        let drawingFile: File | undefined;
        if (stitchMode === 'drawing') {
            if (!drawingCanvasRef.current) {
                toast.error('Drawing canvas not initialized.');
                return;
            }

            if (drawingCanvasRef.current.isEmpty()) {
                toast.error('Please draw something before posting.');
                return;
            }

            try {
                const blob = await drawingCanvasRef.current.exportToBlob();
                drawingFile = new File([blob], `drawing-${Date.now()}.png`, { type: 'image/png' });
            } catch (error) {
                console.error('Failed to export drawing:', error);
                toast.error('Failed to export drawing. Please try again.');
                return;
            }
        }

        // Handle image filter + stickers export - bake into the image
        let filteredImageFile: File | undefined;
        if (stitchMode === 'image' && mediaDraft?.file && (photoFilter !== 'normal' || photoStickers.length > 0)) {
            try {
                const filterValue = PHOTO_FILTERS.find(f => f.id === photoFilter)?.filter || 'none';
                const img = new Image();
                img.crossOrigin = 'anonymous';

                await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error('Failed to load image'));
                    img.src = mediaDraft.previewUrl!;
                });

                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Apply filter to image
                    ctx.filter = filterValue;
                    ctx.drawImage(img, 0, 0);
                    ctx.filter = 'none'; // Reset filter for stickers

                    // Draw stickers
                    for (const sticker of photoStickers) {
                        const stickerX = (sticker.x / 100) * canvas.width;
                        const stickerY = (sticker.y / 100) * canvas.height;
                        const fontSize = Math.min(canvas.width, canvas.height) * 0.1 * sticker.scale; // ~10% of image size

                        ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(sticker.emoji, stickerX, stickerY);
                    }

                    const blob = await new Promise<Blob>((resolve, reject) => {
                        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed to export')), 'image/jpeg', 0.9);
                    });
                    filteredImageFile = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
                }
            } catch (error) {
                console.error('Failed to apply filter/stickers:', error);
                // Fall back to original file
            }
        }

        // Handle audio upload
        let audioMediaUrl: string | undefined;
        if (stitchMode === 'audio') {
            if (!audioBlob) {
                toast.error('Please record audio before posting.');
                return;
            }

            const result = await uploadAudio(audioBlob, currentUser.id);
            if (!result.success || !result.url) {
                toast.error(result.error || 'Failed to upload audio.');
                return;
            }
            audioMediaUrl = result.url;
        }

        const requiresFile = stitchMode === 'video' || stitchMode === 'image';
        if (requiresFile && !mediaDraft?.file) {
            toast.error(`Please select a ${stitchMode === 'video' ? 'video' : 'photo'} to upload.`);
            return;
        }

        const caption = (() => {
            if (trimmed.length > 0) return trimmed;
            if (stitchMode === 'drawing') return 'Created this drawing! 🎨';
            // For image/video uploads, do not include default caption text
            return '';
        })();

        const shouldPersistStyle = stitchMode === 'text' || trimmed.length > 0;

        // Construct the primary text style, including all elements
        const textStylePayload: TextStyle | undefined = shouldPersistStyle ? {
            ...DEFAULT_TEXT_STYLE, // Base style (unused but keeps type happy)
            elements: textElements
        } : undefined;

        // Check if monetization is required
        if (story.monetizationCost && story.monetizationCost > 0 && story.creatorId !== currentUser.id) {
            if (currentUser.tokens < story.monetizationCost) {
                toast.error(`Not enough tokens! You need ${story.monetizationCost} tokens to contribute.`);
                return;
            }

            // Deduct tokens from current user
            const { deductTokens, addTokens } = useStore.getState();
            const success = deductTokens(story.monetizationCost);

            if (!success) {
                toast.error('Failed to deduct tokens. Please try again.');
                return;
            }

            // Update balances in database
            try {
                const response = await fetch('/api/transfer-tokens', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fromUserId: currentUser.id,
                        toUserId: story.creatorId,
                        amount: story.monetizationCost,
                    }),
                });

                if (!response.ok) {
                    // Refund tokens if transfer fails
                    addTokens(story.monetizationCost);
                    toast.error('Payment failed. Please try again.');
                    return;
                }

                toast.success(`Paid ${story.monetizationCost} tokens to contribute!`);
            } catch (error) {
                // Refund tokens if API call fails
                addTokens(story.monetizationCost);
                toast.error('Payment failed. Please try again.');
                return;
            }
        }

        setIsUploading(true);
        uploadStartTimeRef.current = Date.now();

        try {
            const willComplete = maxWeeves !== null && story.contributions.length + 1 >= maxWeeves;
            const computedNextTurnUserId = computeNextTurnUserId(willComplete);
            const nextTurnUpdate = willComplete ? null : computedNextTurnUserId;

            // Calculate timestamp based on slot position for proper ordering
            // For open mode stories (public/brand), use assigned position for ALL participants
            // Position 0 = 1000000,Position 1 = 2000000, etc.
            // This ensures contributions appear in the correct slot
            let contributionTimestamp = Date.now();
            const isOpenModeStory = story.mode === 'open';

            // Determine position to use for timestamp
            // 1. Use targetSlotPosition if explicitly set (highest priority, handles new users & multi-slot)
            // 2. Use currentUserParticipant.position if available (fallback for existing participants)
            let positionToUse: number | null = targetSlotPosition;

            if (positionToUse === null && currentUserParticipant && typeof currentUserParticipant.position === 'number') {
                positionToUse = currentUserParticipant.position;
            }

            if (positionToUse !== null) {
                // Always use position-based timestamp if a position is determined
                // This ensures the contribution is correctly linked to the slot in the timeline
                contributionTimestamp = (positionToUse + 1) * 1000000;
            }

            const { contribution } = await createStoryContribution({
                storyId: story.id,
                userId: currentUser.id,
                userName: currentUser.name,
                mediaType: stitchMode,
                content: caption,
                file: stitchMode === 'drawing' ? drawingFile : (filteredImageFile || mediaDraft?.file),
                mediaUrl: stitchMode === 'audio' ? audioMediaUrl : undefined,
                textStyle: textStylePayload,
                timestamp: contributionTimestamp,
                nextTurnUserId: nextTurnUpdate,
            });


            // Check if this is a brand post and user is not the creator
            const isBrandPost = story.postType === 'canon' || story.postType === 'seed';
            const isCreator = story.creatorId === currentUser.id;
            const isPending = isBrandPost && !isCreator;

            if (isPending) {
                // For brand posts, contribution is pending approval - don't add to local state
                toast.success('Submitted for approval! The brand will review your contribution.');
            } else {
                // For regular posts or brand creators, add to local state and show in UI
                addContribution(story.id, contribution, { nextTurnUserId: nextTurnUpdate });

                // Refresh stories from server so contribution appears in feed/discovery immediately
                setTimeout(() => {
                    fetchStories().catch(err => console.warn('[Story] fetchStories failed after contribution', err));
                }, 100);

                toast.success('Contribution posted!');
            }

            setActiveIndex(story.contributions.length);
            setIsPlaying(true);
            resetComposer();
            setShowStitchMenu(false);
        } catch (error) {
            console.error('Error adding contribution:', error);
            toast.error('Failed to post contribution. Please try again.');
        } finally {
            setIsUploading(false);
            uploadStartTimeRef.current = null;
        }

        // POST-SUBMISSION: Check if this was the onboarding story and mark as complete
        if (story.title === 'Your First Weeve Story' && story.maxWeeves === 3) {
            try {
                console.log('[Story] Completing onboarding for user:', currentUser.id);
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        completed_onboarding: true,
                        onboarding_step: null // Clear the step
                    })
                    .eq('user_id', currentUser.id);

                if (updateError) {
                    console.error('[Story] Failed to update onboarding status:', updateError);
                } else {
                    // Update local store immediately to prevent redirect loops
                    const { setCurrentUser } = useStore.getState();
                    setCurrentUser({
                        ...currentUser,
                        completedOnboarding: true,
                        onboardingStep: undefined
                    });

                    // Clear any local storage flags
                    try {
                        localStorage.setItem('weeve_onboarding_overlay_dismissed_' + currentUser.id, 'true');
                        localStorage.setItem('weeve_onboarding_story_overlay_dismissed_' + currentUser.id, 'true');
                    } catch (e) { }

                    toast.success('Tutorial completed! Welcome to Weeve! 🎉');
                }
            } catch (err) {
                console.error('[Story] Error in onboarding completion:', err);
            }
        }
    };

    // Handle leaving the story
    const handleLeaveStory = async () => {
        if (!currentUser || !story) return;

        setShowLeaveConfirm(false);
        setShowMenu(false);

        try {
            const result = await leaveStory(story.id, currentUser.id, currentUser.name);

            if (result.success) {
                toast.success('You have left the story');
                router.push('/profile');
            } else {
                toast.error(result.error || 'Failed to leave story');
            }
        } catch (error) {
            console.error('Error leaving story:', error);
            toast.error('An error occurred while leaving the story');
        }
    };

    // Handle deleting the story (creators only)
    const handleDeleteStory = async () => {
        if (!currentUser || !story) return;

        setShowDeleteConfirm(false);
        setShowMenu(false);

        try {
            const result = await deleteStory(story.id, currentUser.id);

            if (result.success) {
                toast.success('Story deleted successfully');
                // Redirect to group page if story belongs to a group, otherwise profile
                if (story.groupId) {
                    router.push(`/groups/${story.groupId}`);
                } else {
                    router.push('/profile');
                }
            } else {
                toast.error(result.error || 'Failed to delete story');
            }
        } catch (error) {
            console.error('Error deleting story:', error);
            toast.error('An error occurred while deleting the story');
        }
    };



    const handleEmojiInsert = (emoji: string) => {
        if (!activeElementId) return;

        updateElement(activeElementId, (el) => {
            return { content: el.content + emoji };
        });

        // Focus handling would be more complex with multiple inputs, skipping for now or can rely on user re-focusing
    };

    return (
        <div ref={stageRef} className="h-full flex flex-col bg-black text-white relative">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none">
                <button onClick={() => router.back()} className="p-2 rounded-full glass hover:bg-white/10 transition-colors pointer-events-auto">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="font-bold text-sm tracking-wide uppercase opacity-80 font-sans">Weeve Timeline</h1>
                    {story?.title && <div className="text-sm text-gray-300 mt-1 font-semibold">{story.title}</div>}
                    {/* Weeve of indicator for forked stories */}
                    {story.forkedFromStoryId && (
                        <button
                            onClick={() => router.push(`/story/${story.forkedFromStoryId}`)}
                            className="flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full bg-[#EC1D99]/20 hover:bg-[#EC1D99]/30 transition-colors pointer-events-auto"
                        >
                            <GitBranch className="w-3 h-3 text-[#EC1D99]" />
                            <span className="text-[10px] font-medium text-gray-300">Weeve of:</span>
                            <span className="text-[10px] font-medium text-[#EC1D99] truncate max-w-[100px]">
                                {originalStoryTitle || 'Original'}
                            </span>
                        </button>
                    )}
                    {story.groupId && (
                        <button
                            onClick={() => router.push(`/groups/${story.groupId}`)}
                            className="flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            {story.groupAvatar && (
                                <img
                                    src={story.groupAvatar}
                                    alt="Group"
                                    className="w-3 h-3 rounded-full"
                                />
                            )}
                            <span className="text-[10px] font-medium text-gray-300">{story.groupName || 'From Group'}</span>
                        </button>
                    )}
                </div>
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 rounded-full glass hover:bg-white/10 transition-colors pointer-events-auto"
                    >
                        <MoreVertical className="w-6 h-6" />
                    </button>

                    {/* Dropdown Menu */}
                    {showMenu && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden pointer-events-auto z-50">
                            {story.creatorId === currentUser.id && (
                                <>
                                    <button
                                        onClick={() => {
                                            setShowEditModal(true);
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm font-medium text-white">Edit Story</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowDeleteConfirm(true);
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors border-t border-gray-800"
                                    >
                                        <Trash className="w-4 h-4 text-red-400" />
                                        <span className="text-sm font-medium text-red-400">Delete Story</span>
                                    </button>
                                </>
                            )}
                            {isUserParticipant && (
                                <button
                                    onClick={() => {
                                        setShowLeaveConfirm(true);
                                        setShowMenu(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors border-t border-gray-800"
                                >
                                    <LogOut className="w-4 h-4 text-red-400" />
                                    <span className="text-sm font-medium text-red-400">Leave Story</span>
                                </button>
                            )}
                            {story.forkedFromStoryId && (
                                <button
                                    onClick={() => {
                                        router.push(`/story/${story.forkedFromStoryId}`);
                                        setShowMenu(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors border-t border-gray-800"
                                >
                                    <GitBranch className="w-4 h-4 text-[#EC1D99]" />
                                    <span className="text-sm font-medium text-white">View Original Weeve</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Media Player Area */}
            <div
                className="flex-1 relative flex items-center justify-center bg-gray-900 overflow-hidden cursor-pointer"
                onClick={() => setIsPlaying(!isPlaying)}
            >
                {/* Play/Pause Indicator - hide in text/drawing creation mode */}
                {!isPlaying && !stitchMode && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                        <div className="p-4 rounded-full glass animate-in zoom-in duration-200">
                            <Play className="w-8 h-8 fill-white" />
                        </div>
                    </div>
                )}
                {/* Content Area - Playback vs Creation Mode */}
                {stitchMode ? (
                    // Creation Mode: Solid background for text/drawing canvas
                    <div className="absolute inset-0 bg-[#111] flex items-center justify-center">
                        {/* Optional: Add a subtle pattern or gradient to make it look less dead? */}
                        {/* For now, just a clean dark background as requested */}
                    </div>
                ) : activeSegment ? (
                    <>
                        {activeSegment.mediaType === 'video' ? (
                            <VideoPlayer
                                key={activeSegment.id}
                                src={activeSegment.mediaUrl}
                                onComplete={handleNext}
                                isPlaying={isPlaying}
                            />
                        ) : (activeSegment.mediaType === 'image' || activeSegment.mediaType === 'drawing') ? (
                            <div
                                className={`relative w-full h-full ${activeSegment.mediaType === 'drawing'
                                    ? 'flex items-center justify-center bg-gray-900'
                                    : ''}`}
                            >
                                <img
                                    src={activeSegment.mediaUrl || "https://via.placeholder.com/400x800"}
                                    className={activeSegment.mediaType === 'drawing'
                                        ? 'w-full h-auto max-h-full object-contain'
                                        : 'w-full h-full object-cover'}
                                    alt={activeSegment.mediaType === 'drawing' ? 'Drawing' : 'Story segment'}
                                />
                                <AutoAdvance onComplete={handleNext} isPlaying={isPlaying} duration={NON_VIDEO_AUTO_ADVANCE_MS} />
                            </div>
                        ) : (
                            /* Text-only background */
                            <div
                                className="w-full h-full flex items-center justify-center p-8"
                                style={{
                                    backgroundColor: activeTextStyle.backgroundColor === 'transparent'
                                        ? 'rgba(0,0,0,0.85)'
                                        : activeTextStyle.backgroundColor,
                                }}
                            >
                                <AutoAdvance onComplete={handleNext} isPlaying={isPlaying} duration={NON_VIDEO_AUTO_ADVANCE_MS} />
                            </div>
                        )}

                        {/* Multi-Text Overlay - Renders on ALL media types */}
                        {activeSegment.textStyle?.elements && activeSegment.textStyle.elements.length > 0 ? (
                            <>
                                {activeSegment.textStyle.elements.map((element) => (
                                    <div
                                        key={element.id}
                                        className="absolute pointer-events-none"
                                        style={{
                                            left: 0,
                                            top: 0,
                                            transform: `translate3d(${element.position.left}px, ${element.position.top}px, 0)`,
                                            zIndex: 20,
                                        }}
                                    >
                                        <div
                                            className="min-w-[200px] max-w-[80vw] text-center"
                                            style={{
                                                fontFamily: element.style.fontFamily,
                                                fontSize: element.style.fontSize,
                                                color: element.style.textColor,
                                                textAlign: element.style.textAlign,
                                                backgroundColor: element.style.backgroundColor === 'transparent'
                                                    ? 'rgba(0,0,0,0.45)'
                                                    : element.style.backgroundColor,
                                                padding: '1rem 1.25rem',
                                                borderRadius: '1.5rem',
                                                backdropFilter: 'blur(4px)',
                                                whiteSpace: 'pre-wrap',
                                            }}
                                        >
                                            {element.content}
                                        </div>
                                    </div>
                                ))}
                                {/* User attribution for multi-text */}
                                <div className="absolute bottom-32 left-6 z-10">
                                    <span className="font-bold text-shadow-sm font-sans text-white">{activeSegment.userName}</span>
                                </div>
                            </>
                        ) : (
                            /* Legacy caption/text rendering when no multi-text elements */
                            <>
                                {activeSegment.mediaType === 'text' && activeSegment.content && (
                                    <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
                                        <div
                                            className="max-w-xl w-full mx-auto rounded-3xl px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
                                            style={{
                                                fontFamily: activeTextStyle.fontFamily,
                                                fontSize: activeTextStyle.fontSize,
                                                color: activeTextStyle.textColor,
                                                backgroundColor: activeTextStyle.backgroundColor === 'transparent'
                                                    ? 'rgba(0,0,0,0.35)'
                                                    : activeTextStyle.backgroundColor,
                                                textAlign: activeTextStyle.textAlign,
                                                whiteSpace: 'pre-line',
                                            }}
                                        >
                                            {activeSegment.content}
                                        </div>
                                    </div>
                                )}
                                {activeSegment.mediaType !== 'text' && activeSegment.content && (
                                    <div className="absolute bottom-32 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none">
                                        <div className="mb-2">
                                            <span className="font-bold text-shadow-sm font-sans">{activeSegment.userName}</span>
                                        </div>
                                        <div
                                            className="w-full"
                                            style={{ textAlign: hasCustomTextStyle ? activeTextStyle.textAlign : 'left' }}
                                        >
                                            <span
                                                className="text-lg font-medium leading-snug text-shadow-sm font-sans"
                                                style={{
                                                    fontFamily: hasCustomTextStyle ? activeTextStyle.fontFamily : undefined,
                                                    fontSize: hasCustomTextStyle ? activeTextStyle.fontSize : undefined,
                                                    color: hasCustomTextStyle ? activeTextStyle.textColor : undefined,
                                                    backgroundColor: hasCustomTextStyle && activeTextStyle.backgroundColor !== 'transparent'
                                                        ? activeTextStyle.backgroundColor
                                                        : undefined,
                                                    padding: hasCustomTextStyle ? '0.75rem 1.25rem' : undefined,
                                                    borderRadius: hasCustomTextStyle ? '1.5rem' : undefined,
                                                    display: 'inline-block',
                                                    whiteSpace: 'pre-line',
                                                }}
                                            >
                                                {activeSegment.content}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                ) : (
                    // Show waiting element for forked stories with user's slot, otherwise generic message
                    (currentUserParticipant?.status === 'waiting' && !isStoryComplete && currentUserParticipant?.id !== currentUser?.id) ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black text-white">
                            <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-sm">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-2 border-[#EC1D99]/70 p-1 animate-pulse">
                                        <img
                                            src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser?.name || 'You')}`}
                                            alt={currentUser?.name || 'You'}
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 bg-[#EC1D99] rounded-full p-1">
                                        <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                                    </div>
                                </div>
                                <span className="text-sm font-semibold tracking-wide uppercase text-gray-300">Your turn</span>
                                <span className="text-lg font-bold text-white">
                                    Add your stitch!
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black text-white px-6 text-center">
                            <div className="w-20 h-20 rounded-full bg-[#EC1D99]/10 flex items-center justify-center mb-6 animate-pulse">
                                <Sparkles className="w-10 h-10 text-[#EC1D99]" />
                            </div>
                            <h3 className="text-2xl font-bold bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent mb-3">
                                Start the Story
                            </h3>
                            <p className="text-gray-400 max-w-sm leading-relaxed">
                                Be the first to add a weeve and set the direction for what comes next.
                            </p>
                        </div>
                    )
                )
                }

                {/* Uploading Overlay */}
                {
                    isUploading && (
                        <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center">
                            <Loader2 className="w-12 h-12 text-[#EC1D99] animate-spin mb-4" />
                            <p className="font-bold">Uploading...</p>
                        </div>
                    )
                }

                {/* Onboarding Tutorial Overlay */}
                {
                    showOnboardingTutorial && (
                        <OnboardingTutorialOverlay
                            onDismiss={() => {
                                try { if (typeof window !== 'undefined' && currentUser?.id) { localStorage.setItem('weeve_onboarding_story_overlay_dismissed_' + currentUser.id, 'true'); localStorage.setItem('weeve_onboarding_overlay_dismissed_' + currentUser.id, 'true'); } } catch (err) { }
                                setShowOnboardingTutorial(false);
                            }}
                            targetElementId="add-weeve-button"
                        />
                    )
                }
            </div >

            {/* Timeline Controls */}
            {!isComposerOpen && timelineEntries && (
                <StoryTimeline
                    timelineEntries={timelineEntries}
                    story={story}
                    currentUser={currentUser}
                    activeContributionIndex={activeIndex}
                    isMyTurn={isMyTurn}
                    isStoryComplete={isStoryComplete}
                    contributions={contributions}
                    participantMap={participantMap}
                    participantsWithoutContributions={participantsWithoutContributions}
                    onContributionSelect={handleContributionSelect}
                    onAddWeeve={(slotPosition?: number) => {
                        try { if (typeof window !== 'undefined' && currentUser?.id) { localStorage.setItem('weeve_onboarding_story_overlay_dismissed_' + currentUser.id, 'true'); localStorage.setItem('weeve_onboarding_overlay_dismissed_' + currentUser.id, 'true'); } } catch (err) { }
                        // Store the target position so we know which slot to fill
                        if (typeof slotPosition === 'number') {
                            setTargetSlotPosition(slotPosition);
                        }
                        setShowStitchMenu(true);
                        setShowOnboardingTutorial(false);
                    }}
                />
            )}

            {/* Creation Overlays */}
            {showStitchMenu && (
                <StitchMenu
                    onOptionSelect={handleStitchOption}
                    onClose={() => setShowStitchMenu(false)}
                />
            )}

            {mediaPickerConfig && (
                <MediaPickerOverlay
                    config={mediaPickerConfig}
                    onSelectSource={handleMediaSourceSelection}
                    onCancel={handleMediaPickerCancel}
                />
            )}
            {/* Audio Recorder - shown when audio mode is selected */}
            {stitchMode === 'audio' && !showStitchMenu && (
                <div className="absolute inset-0 z-40">
                    <AudioRecorder
                        userAvatar={currentUser?.avatar}
                        userName={currentUser?.name || 'User'}
                        onRecordingComplete={async (blob, duration) => {
                            // Store the audio data and trigger upload + submission
                            setAudioBlob(blob);
                            setAudioDuration(duration);
                        }}
                        onCancel={() => {
                            resetComposer();
                            setShowStitchMenu(false);
                        }}
                        maxDuration={60}
                    />
                </div>
            )}

            <StitchComposer
                isComposerOpen={isComposerOpen && stitchMode !== 'audio'}
                stitchMode={stitchMode}
                mediaDraft={mediaDraft}
                photoFilter={photoFilter}
                photoStickers={photoStickers}
                textElements={textElements}
                activeElementId={activeElementId}
                activeMenu={activeMenu}
                hasMovedInCurrentEdit={hasMovedInCurrentEdit}
                showPhotoFilterPanel={showPhotoFilterPanel}
                showStickerPanel={showStickerPanel}
                draggingStickerId={draggingStickerId}
                drawingCanvasRef={drawingCanvasRef}
                draggableRefs={draggableRefs}
                justSelectedRef={justSelectedRef}
                onBackgroundClick={() => {
                    if (activeElementId) {
                        setActiveElementId(null);
                        setActiveMenu(null);
                        setHasMovedInCurrentEdit(false);
                    }
                }}
                onAddText={addTextElement}
                onToggleStickers={() => {
                    const opening = !showStickerPanel;
                    setShowStickerPanel(opening);
                    setShowPhotoFilterPanel(false);
                    // Close text menus when opening sticker panel (mutual exclusivity)
                    if (opening) {
                        setActiveMenu(null);
                    }
                }}
                onClearStickers={() => setPhotoStickers([])}
                onSetPhotoStickers={setPhotoStickers}
                onSetDraggingStickerId={setDraggingStickerId}
                onSelectFilter={setPhotoFilter}
                onSelectSticker={(emoji) => {
                    const newSticker: PhotoSticker = {
                        id: `sticker-${Date.now()}-${photoStickers.length}`,
                        emoji,
                        x: 50,
                        y: 50,
                        scale: 1,
                    };
                    setPhotoStickers(prev => [...prev, newSticker]);
                }}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onSetActiveElementId={setActiveElementId}
                onSetActiveMenu={(menu) => {
                    setActiveMenu(menu);
                    // Close sticker panel when opening a text menu (mutual exclusivity)
                    if (menu !== null) {
                        setShowStickerPanel(false);
                    }
                }}
                onSetHasMovedInCurrentEdit={setHasMovedInCurrentEdit}
                onUpdateTextStyle={updateTextStyle}
                onUpdateTextContent={(id, content) => {
                    setTextElements(prev => prev.map(el =>
                        el.id === id ? { ...el, content } : el
                    ));
                }}
                onDeleteTextElement={(id) => {
                    setTextElements(prev => prev.filter(el => el.id !== id));
                    setActiveElementId(null);
                    setActiveMenu(null);
                }}
            />

            {/* Composer Header - Cancel/Post buttons */}
            {isComposerOpen && (
                <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-auto">
                    <button
                        onClick={handleComposerCancel}
                        className="px-4 py-2 rounded-full bg-black/40 backdrop-blur-md text-white font-medium hover:bg-black/60 transition-colors"
                    >
                        Cancel
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleComposerSubmit()}
                            disabled={isPostDisabled || isUploading}
                            className={`px-6 py-2 rounded-full font-bold transition-colors ${isPostDisabled || isUploading ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-[#EC1D99] text-white hover:bg-[#D41C84]'}`}
                        >
                            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Post'}
                        </button>
                    </div>
                </div>
            )}

            {/* Photo Tools Menu - Right Side (Text, Filters, Stickers, Crop) */}
            {isComposerOpen && stitchMode === 'image' && mediaDraft?.previewUrl && !activeElementId && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 pointer-events-auto">
                    {/* Add Text Button */}
                    <button
                        onClick={() => {
                            setShowPhotoFilterPanel(false);
                            setShowStickerPanel(false);
                            addTextElement();
                        }}
                        className="w-10 h-10 rounded-full bg-gray-800/90 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-lg transition-all hover:bg-gray-700"
                        aria-label="Add Text"
                    >
                        <Type className="w-5 h-5 text-white" />
                    </button>

                    {/* Filter Button */}
                    <button
                        onClick={() => {
                            setShowPhotoFilterPanel(!showPhotoFilterPanel);
                            setShowStickerPanel(false);
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${showPhotoFilterPanel ? 'bg-[#EC1D99] border-2 border-white' : 'bg-gray-800/90 backdrop-blur-sm border-2 border-white/30'}`}
                        aria-label="Filters"
                    >
                        <Sparkles className="w-5 h-5 text-white" />
                    </button>

                    {/* Sticker Button */}
                    <button
                        onClick={() => {
                            setShowStickerPanel(!showStickerPanel);
                            setShowPhotoFilterPanel(false);
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${showStickerPanel ? 'bg-[#EC1D99] border-2 border-white' : 'bg-gray-800/90 backdrop-blur-sm border-2 border-white/30'}`}
                        aria-label="Stickers"
                    >
                        <Smile className="w-5 h-5 text-white" />
                    </button>

                    {/* Crop Button */}
                    <button
                        onClick={() => {
                            setShowStickerPanel(false);
                            setShowPhotoFilterPanel(false);
                            if (mediaDraft?.previewUrl) {
                                setImageToCrop(mediaDraft.previewUrl);
                            }
                        }}
                        className="w-10 h-10 rounded-full bg-gray-800/90 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-lg transition-all hover:bg-gray-700"
                        aria-label="Crop"
                    >
                        <Crop className="w-5 h-5 text-white" />
                    </button>

                    {/* Clear Stickers Button - visible when stickers exist */}
                    {photoStickers.length > 0 && (
                        <button
                            onClick={() => setPhotoStickers([])}
                            className="w-10 h-10 rounded-full bg-red-500/30 backdrop-blur-sm border-2 border-red-500/50 flex items-center justify-center shadow-lg transition-all hover:bg-red-500/50"
                            aria-label="Clear stickers"
                        >
                            <Trash className="w-5 h-5 text-red-400" />
                        </button>
                    )}
                </div>
            )}

            {/* Edit Story Modal */}
            {
                showEditModal && (
                    <EditStoryModal
                        story={story}
                        onClose={() => setShowEditModal(false)}
                    />
                )
            }

            {/* Leave Story Confirmation Modal */}
            {
                showLeaveConfirm && (
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-sm w-full">
                            <h2 className="text-xl font-bold mb-2">Leave Story?</h2>
                            <p className="text-gray-400 text-sm mb-6">
                                Are you sure you want to leave "<span className="text-white font-medium">{story.title}</span>"? This will free up your slot for someone else.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowLeaveConfirm(false)}
                                    className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLeaveStory}
                                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                                >
                                    Yes, Leave
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Story Confirmation Modal */}
            {
                showDeleteConfirm && (
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-sm w-full">
                            <h2 className="text-xl font-bold mb-2 text-red-400">Delete Story?</h2>
                            <p className="text-gray-400 text-sm mb-6">
                                Are you sure you want to permanently delete "<span className="text-white font-medium">{story.title}</span>"? This action cannot be undone and will remove all contributions, comments, and likes.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteStory}
                                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                                >
                                    Yes, Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {
                imageToCrop && (
                    <ImageCropper
                        imageSrc={imageToCrop}
                        onCropComplete={handleCroppedImage}
                        onCancel={() => {
                            setImageToCrop(null);
                            // If we have a media draft (came from preview), stay in preview mode
                            // Otherwise show the stitch menu
                            if (!mediaDraft) {
                                setShowStitchMenu(true);
                            }
                        }}
                    />
                )
            }


            {/* Context Thumbnails - Visible when composing OR cropping, BUT NOT when editing text (to avoid keyboard overlap) */}
            {contributions.length > 0 && ((stitchMode !== null && !showStitchMenu) || imageToCrop) && !activeElementId && (
                <StitchContextThumbnails
                    contributions={contributions}
                    className={imageToCrop ? 'bottom-36' : 'bottom-[70px]'}
                />
            )}
        </div >
    );
}


function AutoAdvance({ onComplete, isPlaying, duration }: { onComplete: () => void, isPlaying: boolean, duration: number }) {
    useEffect(() => {
        if (!isPlaying) return;
        const timer = setTimeout(onComplete, duration);
        return () => clearTimeout(timer);
    }, [isPlaying, onComplete, duration]);
    return null;
}

function VideoPlayer({ src, onComplete, isPlaying }: { src?: string, onComplete: () => void, isPlaying: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('x-webkit-airplay', 'deny');
        video.preload = 'auto';

        // Set ready state on load
        const handleReady = () => setIsReady(true);
        video.addEventListener('loadeddata', handleReady);
        video.addEventListener('canplay', handleReady);

        return () => {
            video.removeEventListener('loadeddata', handleReady);
            video.removeEventListener('canplay', handleReady);
        };
    }, [src]);

    // Play or pause based on isPlaying
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (isPlaying && isReady) {
            const playVideo = async () => {
                try {
                    video.currentTime = 0;
                    await video.play();
                } catch (err) {
                    console.error("Play failed:", err);
                    video.muted = true;
                    try {
                        await video.play();
                    } catch (mutedErr) {
                        console.error("Muted play failed:", mutedErr);
                        setError(true);
                    }
                }
            };
            playVideo();
        } else if (!isPlaying) {
            video.pause();
        }
    }, [src, isPlaying, isReady]);

    // Notify when video ends or safety timer fires
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const onLoadedMetadata = () => {
            const duration = video.duration;
            if (isFinite(duration)) {
                const safetyTimer = setTimeout(() => {

                    onComplete();
                }, (duration * 1000) + 2000);
                return () => clearTimeout(safetyTimer);
            }
        };
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        return () => video.removeEventListener('loadedmetadata', onLoadedMetadata);
    }, [src, onComplete]);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <button onClick={onComplete} className="text-white">
                    Video Error. Skip →
                </button>
            </div>
        );
    }

    return (
        <video
            ref={videoRef}
            src={src}
            className="weeve-inline-video w-full h-full object-cover"
            playsInline
            preload="auto"
            controls={false}
            controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
            disablePictureInPicture
            disableRemotePlayback
            onEnded={onComplete}
            onCanPlay={(e) => {
                const video = e.currentTarget;
                setIsReady(true);
                if (isPlaying) {
                    video.play().catch(() => null);
                }
            }}
            onLoadedMetadata={(e) => {
                const video = e.currentTarget;
                video.volume = 1.0;
                video.muted = false;
            }}
            onClick={(e) => {
                const video = e.currentTarget;
                video.muted = false;
                video.volume = 1.0;
            }}
            style={{
                opacity: isReady ? 1 : 0,
                visibility: isReady ? 'visible' : 'hidden',
                transform: isReady ? 'translate3d(0,0,0)' : 'translate3d(-9999px,-9999px,0)',
                transition: 'none',
                backgroundColor: '#000000',
                WebkitAppearance: 'none',
                appearance: 'none',
                backgroundImage: 'none'
            }}
        />
    );
}
