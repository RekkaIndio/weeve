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
import { ChevronLeft, Plus, Play, MoreVertical, Video, Camera, Type, Pencil, X, Loader2, Edit2, LogOut, Trash, AlignLeft, AlignCenter, AlignRight, ChevronDown, ChevronUp, FileVideo, Image as ImageIcon } from "lucide-react";
import EditStoryModal from "@/app/components/EditStoryModal";
import { DrawingCanvas, type DrawingCanvasRef } from "@/app/components/DrawingCanvas";
import OnboardingTutorialOverlay from "@/app/components/OnboardingTutorialOverlay";
import { toast } from "sonner";
import { useTimerCheck } from "@/lib/useTimerCheck";
import { supabase } from "@/lib/supabase";

const FONT_OPTIONS = [
    { label: "Sans", value: "'Inter', 'Helvetica Neue', sans-serif" },
    { label: "Serif", value: "'Playfair Display', 'Georgia', serif" },
    { label: "Mono", value: "'Space Mono', 'Courier New', monospace" },
    { label: "Script", value: "'Pacifico', 'Brush Script MT', cursive" },
    { label: "Display", value: "'Bebas Neue', 'Impact', sans-serif" },
] as const;

const FONT_SIZE_OPTIONS = [18, 24, 32, 40, 48, 56] as const;

const TEXT_COLOR_OPTIONS = [
    "#FFFFFF",
    "#EC1D99",
    "#FFD166",
    "#06D6A0",
    "#118AB2",
    "#EF476F",
    "#F4F1DE",
] as const;

const BACKGROUND_OPTIONS = [
    "transparent",
    "rgba(0,0,0,0.6)",
    "rgba(236,29,153,0.25)",
    "rgba(255,209,102,0.25)",
    "rgba(17,138,178,0.25)",
    "rgba(244,241,222,0.35)",
] as const;

const EMOJI_OPTIONS = [
    "✨",
    "🔥",
    "🎉",
    "🌟",
    "💫",
    "🥳",
    "🚀",
    "🎬",
    "📸",
    "🎵",
] as const;

const ALIGN_OPTIONS: Array<{ value: TextStyle["textAlign"]; icon: typeof AlignLeft }> = [
    { value: "left", icon: AlignLeft },
    { value: "center", icon: AlignCenter },
    { value: "right", icon: AlignRight },
];

const EMPTY_CONTRIBUTIONS: Contribution[] = [];

const DEFAULT_TEXT_STYLE: TextStyle = {
    fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
    fontSize: 28,
    textColor: "#FFFFFF",
    backgroundColor: "rgba(0,0,0,0.6)",
    textAlign: "center",
};

export default function StoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <StoryPageContent storyId={id} />;
}

function StoryPageContent({ storyId }: { storyId: string }) {
    const router = useRouter();
    const { stories, currentUser, addContribution, fetchStories, addStory } = useStore();

    const story = stories.find((s) => s.id === storyId);

    useEffect(() => {
        console.debug('[StoryPage] resolving storyId', storyId, 'found:', !!story, 'storiesCount:', stories.length, 'visibleIds:', stories.slice(0, 10).map(s => s.id));
    }, [storyId, story, stories]);

    const [activeIndex, setActiveIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isFetchingStory, setIsFetchingStory] = useState(false);
    const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

    // Stitch Flow States
    const [showStitchMenu, setShowStitchMenu] = useState(false);
    const [mediaSourcePicker, setMediaSourcePicker] = useState<{ type: 'video' | 'image' } | null>(null);
    const [stitchMode, setStitchMode] = useState<'video' | 'image' | 'text' | 'drawing' | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [textElements, setTextElements] = useState<TextElement[]>([]);
    const [activeElementId, setActiveElementId] = useState<string | null>(null);
    const [mediaDraft, setMediaDraft] = useState<{ type: 'video' | 'image'; file?: File; previewUrl?: string } | null>(null);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
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
    const userHasWaitingSlotRaw = currentUserParticipant?.status === 'waiting';
    const userHasContributed = currentUser?.id ? contributions.some(c => c.userId === currentUser.id) : false;
    const canContributeDespiteCapacity = userHasWaitingSlotRaw && !userHasContributed;
    
    // Story is at capacity ONLY if contributions >= maxWeeves AND user can't contribute
    const isAtCapacity = maxWeeves !== null && contributionsCount >= maxWeeves && !canContributeDespiteCapacity;
    const isStoryComplete = story?.status === 'completed' || isAtCapacity;
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
    const isMyTurn = isExplicitlyMyTurn || canContributeWithWaitingSlot;
    const hasContributions = contributions.length > 0;
    
    // Debug logging for forked stories
    useEffect(() => {
        // Refresh stories on mount to ensure we have the latest state
        try { fetchStories(); } catch (err) { console.warn('[Story] fetchStories failed on mount:', err); }
    }, [fetchStories]);

    useEffect(() => {
        // If the story isn't available in the store, try fetching it directly by id.
        if (story || isFetchingStory || hasFetchedOnce) return;
        let cancelled = false;

        const fetchStoryById = async () => {
            try {
                setIsFetchingStory(true);
                setHasFetchedOnce(false);
                const { data: s, error } = await supabase
                    .from('stories')
                    .select(`
                        *,
                        contributions (*),
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

                if (error || !s) {
                    console.warn('[Story] fetchStoryById: not found or error', { id: storyId, error });
                    setHasFetchedOnce(true);
                    return;
                }

                if (cancelled) return;

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
                };

                addStory(mapped);
                setHasFetchedOnce(true);
                console.log('[Story] Fetched story by id and added to store:', mapped.id);
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
            console.log('[Story] Forked story debug:', {
                storyId: story?.id,
                visibility: story?.visibility,
                participants: story?.participants?.map(p => ({ id: p.id, name: p.name, status: p.status, position: p.position })),
                contributions: contributions.map((c, i) => ({ index: i, userId: c.userId, timestamp: c.timestamp })),
                currentUserParticipant: currentUserParticipant ? { id: currentUserParticipant.id, status: currentUserParticipant.status, position: currentUserParticipant.position } : null,
                userHasWaitingSlot,
                isMyTurn,
            });
        }
    }, [story, contributions, currentUserParticipant, userHasWaitingSlot, isMyTurn]);
    
    // Debug logging for onboarding
    useEffect(() => {
        if (story?.title === 'Your First Weeve Story') {
            console.log('[Story] Turn debug:', {
                isStoryComplete,
                currentTurnUserId: story?.currentTurnUserId,
                currentUserId: currentUser?.id,
                isMyTurn,
                storyMode: story?.mode
            });
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
                console.log('[Story] Waiting for user/story:', { hasUser: !!currentUser?.id, hasStory: !!story });
                return;
            }
            
            try {
                // Check if this is an onboarding story (title matches and has max 3 weeves)
                const isOnboardingStory = story.title === 'Your First Weeve Story' && story.maxWeeves === 3;
                
                console.log('[Story] Checking if onboarding story:', { 
                    title: story.title, 
                    maxWeeves: story.maxWeeves, 
                    isOnboardingStory 
                });
                
                if (!isOnboardingStory) return;
                
                const { data } = await supabase
                    .from('profiles')
                    .select('onboarding_step, completed_onboarding')
                    .eq('user_id', currentUser.id)
                    .single();
                
                console.log('[Story] Onboarding status:', data);
                
                // Show tutorial if onboarding_step is 2 and not completed
                if (data && data.onboarding_step === 2 && !data.completed_onboarding) {
                    // Respect a local dismissal flag so this doesn't keep showing repeatedly
                    let dismissed = false;
                    try { dismissed = !!(typeof window !== 'undefined' && localStorage.getItem('weeve_onboarding_story_overlay_dismissed_' + currentUser.id)); } catch (err) { dismissed = false; }

                    if (!dismissed) {
                        console.log('[Story] Showing tutorial overlay');
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
        const contributors = new Set(contributions.map(c => c.userId));
        const allParticipants = story?.participants ?? [];
        
        console.log('[Timeline] All participants DETAILED:', JSON.stringify(allParticipants.map(p => ({ 
            id: p.id, 
            name: p.name, 
            status: p.status, 
            position: p.position,
            positionType: typeof p.position,
            hasContributed: contributors.has(p.id)
        })), null, 2));
        
        // For forked stories (private visibility), show empty slot for participants with status='waiting'
        // even if hasContributed is true (because contributions might have been copied from original)
        // For regular stories, show empty slot if participant hasn't contributed
        const isForkedStory = story?.visibility === 'private';
        let waitingParticipants = allParticipants.filter(p => {
            const hasPosition = p.position !== undefined && p.position !== null;
            if (isForkedStory && p.status === 'waiting' && hasPosition) {
                // For forked stories, show slot for waiting participants regardless of contribution status
                return true;
            }
            // For regular stories, show if no contribution and has position
            return !contributors.has(p.id) && hasPosition;
        });

        // If the story is complete or at capacity, do not display waiting slots — play like a normal completed post
        if (isStoryComplete) {
            waitingParticipants = [];
        }
        
        console.log('[Timeline] Waiting participants after filter:', JSON.stringify(waitingParticipants.map(p => ({ 
            id: p.id, 
            status: p.status, 
            position: p.position 
        })), null, 2));
        
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
            console.log('[Timeline] Building entries:', {
                waitingParticipants: waitingParticipants.map(p => ({ id: p.id, position: p.position, status: p.status })),
                contributionEntries: contributionEntries.map(e => ({ index: e.index, timestamp: e.contribution.timestamp, calculatedPosition: e.position })),
                emptySlotEntries: emptySlotEntries.map(e => ({ participantId: e.participant.id, position: e.position })),
            });
        }
        
        // Combine and sort by position
        const allEntries = [
            ...contributionEntries.map(e => ({ ...e, sortPosition: e.position })),
            ...emptySlotEntries.map(e => ({ ...e, sortPosition: e.position })),
        ].sort((a, b) => a.sortPosition - b.sortPosition);
        
        return allEntries;
    }, [contributions, story?.participants]);
    
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
    const updateTextStyle = <K extends keyof TextStyle>(key: K, value: TextStyle[K]) => {
        if (!activeElementId) return;
        updateElement(activeElementId, (el) => ({
            style: { ...el.style, [key]: value }
        }));
    };

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

    const handleDragStart = (event: React.PointerEvent<HTMLDivElement>, id: string) => {
        event.preventDefault();
        event.stopPropagation();
        const elementRef = draggableRefs.current.get(id);
        if (!elementRef) return;

        // Set as active
        setActiveElementId(id);

        const rect = elementRef.getBoundingClientRect();

        // Use window dimensions for viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Pre-calculate constraints
        const minLeft = 16;
        const maxLeft = Math.max(minLeft, viewportWidth - rect.width - 16);
        const minTop = 16;
        const maxTop = Math.max(minTop, viewportHeight - rect.height - 80 - 16);

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

        // Set pointer capture on the drag handle itself (event.currentTarget)
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        elementRef.style.transition = 'none';
        console.log('Drag started for:', id);
    };

    const handleDragMove = (event: React.PointerEvent<HTMLDivElement>, id: string) => {
        event.preventDefault();
        event.stopPropagation();
        const dragState = dragStateRef.current;
        const elementRef = draggableRefs.current.get(id);

        // Only process if this element is actively being dragged
        if (!dragState || !elementRef || isDragging.current !== id) return;

        // Use cached constraints
        const rawLeft = event.clientX - dragState.viewportLeft - dragState.offsetX;
        const rawTop = event.clientY - dragState.viewportTop - dragState.offsetY;

        const left = Math.min(Math.max(rawLeft, dragState.minLeft), dragState.maxLeft);
        const top = Math.min(Math.max(rawTop, dragState.minTop), dragState.maxTop);

        // Direct DOM update
        elementRef.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    };

    const handleDragEnd = (event: React.PointerEvent<HTMLDivElement>, id: string) => {
        event.preventDefault();
        event.stopPropagation();
        const dragState = dragStateRef.current;
        const elementRef = draggableRefs.current.get(id);

        if (dragState && elementRef) {
            try {
                (event.currentTarget as HTMLElement).releasePointerCapture(dragState.pointerId);
            } catch (err) {
                // ignore
            }

            const rawLeft = event.clientX - dragState.viewportLeft - dragState.offsetX;
            const rawTop = event.clientY - dragState.viewportTop - dragState.offsetY;

            const left = Math.min(Math.max(rawLeft, dragState.minLeft), dragState.maxLeft);
            const top = Math.min(Math.max(rawTop, dragState.minTop), dragState.maxTop);

            // Sync to React state
            updateElement(id, { position: { left, top } });
        }
        isDragging.current = null;
        dragStateRef.current = null;
        console.log('Drag ended for:', id);
    };

    const resetComposer = () => {
        setTextElements([]);
        setActiveElementId(null);
        setMediaDraft(null);
        setStitchMode(null);
        setActiveMenu(null);
        dragStateRef.current = null;
    };

    const addTextElement = useCallback(() => {
        if (textElements.length >= 5) {
            toast.error("Maximum 5 text boxes allowed");
            return;
        }

        const id = Math.random().toString(36).substr(2, 9);

        // Calculate position with offset for each new box
        let left = 100;
        let top = 100;
        if (stageRef.current) {
            const viewport = stageRef.current.getBoundingClientRect();
            // Start from center and offset each new box
            const baseLeft = (viewport.width - 200) / 2;
            const baseTop = (viewport.height - 200) / 2;
            // Offset by 40px for each existing element to create a cascade effect
            left = baseLeft + (textElements.length * 40);
            top = baseTop + (textElements.length * 40);
        }

        const newElement: TextElement = {
            id,
            content: "",
            style: { ...DEFAULT_TEXT_STYLE },
            position: { left, top }
        };

        setTextElements(prev => [...prev, newElement]);
        setActiveElementId(id);
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
        console.log('[Story] Media source selected:', { type, source });
        try {
            const file = type === 'video' ? await captureVideo(source) : await capturePhoto(source);
            if (file) {
                console.log(`[Story] ${type} file received:`, file.name, file.size);
                const previewUrl = URL.createObjectURL(file);
                setMediaDraft({ type, file, previewUrl });
                setTextElements([]); // Clear any existing text
                setStitchMode(type);
                // No initial text box created for media uploads

            } else {
                console.log(`[Story] No ${type} file returned (user may have cancelled)`);
                toast.error(`${type === 'video' ? 'Video' : 'Photo'} capture cancelled or failed. Please try again.`);
                setShowStitchMenu(true);
            }
        } catch (error) {
            console.error(`[Story] ${type} capture failed:`, error);
            toast.error(`${type === 'video' ? 'Video' : 'Photo'} capture failed. Please try again.`);
            setShowStitchMenu(true);
        }
    }, [setMediaDraft, setShowStitchMenu, addTextElement]);

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
                                <span className="text-[10px] font-medium text-gray-300">From Group</span>
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

    const handleStitchOption = async (mode: 'video' | 'image' | 'text' | 'drawing') => {
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
            console.log('[Story] Video option selected');
            if (Capacitor.isNativePlatform()) {
                setMediaSourcePicker({ type: 'video' });
            } else {
                await handleMediaSourceSelection('video', 'gallery');
            }
            return;
        }

        if (mode === 'image') {
            console.log('[Story] Photo option selected');
            if (Capacitor.isNativePlatform()) {
                setMediaSourcePicker({ type: 'image' });
            } else {
                await handleMediaSourceSelection('image', 'gallery');
            }
            return;
        }

        if (mode === 'drawing') {
            console.log('[Story] Drawing option selected');
            setStitchMode('drawing');
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

        try {
            const willComplete = maxWeeves !== null && story.contributions.length + 1 >= maxWeeves;
            const computedNextTurnUserId = computeNextTurnUserId(willComplete);
            const nextTurnUpdate = willComplete ? null : computedNextTurnUserId;
            
            // Calculate timestamp based on slot position for proper ordering
            // If user has a waiting slot (forked story), use their position to determine timestamp
            // Position 0 = 1000000, Position 1 = 2000000, etc.
            // This ensures their contribution appears in the correct slot
            let contributionTimestamp = Date.now();
            if (currentUserParticipant?.status === 'waiting' && typeof currentUserParticipant.position === 'number') {
                // Use position-based timestamp: (position + 1) * 1000000
                contributionTimestamp = (currentUserParticipant.position + 1) * 1000000;
                console.log('[Story] Using position-based timestamp for slot:', currentUserParticipant.position, 'timestamp:', contributionTimestamp);
            }
            
            const { contribution } = await createStoryContribution({
                storyId: story.id,
                userId: currentUser.id,
                userName: currentUser.name,
                mediaType: stitchMode,
                content: caption,
                file: stitchMode === 'drawing' ? drawingFile : mediaDraft?.file,
                textStyle: textStylePayload,
                timestamp: contributionTimestamp,
                nextTurnUserId: nextTurnUpdate,
            });

            addContribution(story.id, contribution, { nextTurnUserId: nextTurnUpdate });
            toast.success('Contribution posted!');
            setActiveIndex(story.contributions.length);
            setIsPlaying(true);
            resetComposer();
            setShowStitchMenu(false);
        } catch (error) {
            console.error('Error adding contribution:', error);
            toast.error('Failed to post contribution. Please try again.');
        } finally {
            setIsUploading(false);
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
                            <span className="text-[10px] font-medium text-gray-300">From Group</span>
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
                        </div>
                    )}
                </div>
            </div>

            {/* Main Media Player Area */}
            <div
                className="flex-1 relative flex items-center justify-center bg-gray-900 overflow-hidden cursor-pointer"
                onClick={() => setIsPlaying(!isPlaying)}
            >
                {/* Play/Pause Indicator */}
                {!isPlaying && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                        <div className="p-4 rounded-full glass animate-in zoom-in duration-200">
                            <Play className="w-8 h-8 fill-white" />
                        </div>
                    </div>
                )}
                {activeSegment ? (
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
                        <div className="text-gray-500">No segments yet. Be the first!</div>
                    )
                )}

                {/* Uploading Overlay */}
                {isUploading && (
                    <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-[#EC1D99] animate-spin mb-4" />
                        <p className="font-bold">Uploading...</p>
                    </div>
                )}

                {/* Onboarding Tutorial Overlay */}
                {showOnboardingTutorial && (
                    <OnboardingTutorialOverlay
                        onDismiss={() => {
                            try { if (typeof window !== 'undefined' && currentUser?.id) { localStorage.setItem('weeve_onboarding_story_overlay_dismissed_' + currentUser.id, 'true'); localStorage.setItem('weeve_onboarding_overlay_dismissed_' + currentUser.id, 'true'); } } catch (err) {}
                            setShowOnboardingTutorial(false);
                        }}
                        targetElementId="add-weeve-button"
                    />
                )}
            </div>

            {/* Timeline Controls */}
            {!isComposerOpen && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl p-4 pb-8 border-t border-white/10 z-30 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide px-2 flex-nowrap">
                        {timelineEntries.map((entry, entryIndex) => {
                            // Handle empty slot entries (waiting participants)
                            if (entry.type === 'empty') {
                                const participant = entry.participant;
                                const isCurrentUser = currentUser?.id === participant.id;
                                const isCurrentTurn = story.currentTurnUserId === participant.id;
                                
                                console.log('[Timeline] Empty slot render:', {
                                    participantId: participant.id,
                                    participantName: participant.name,
                                    currentUserId: currentUser?.id,
                                    isCurrentUser,
                                    isCurrentTurn,
                                    isMyTurn,
                                    position: entry.position,
                                });
                                
                                // Show clickable + button for current user's empty slot
                                if (isCurrentUser && isMyTurn && !isStoryComplete) {
                                    return (
                                        <button
                                            key={`empty-${participant.id}-${entry.position}`}
                                            id="add-weeve-button"
                                            onClick={() => {
                                                setShowStitchMenu(true);
                                                setShowOnboardingTutorial(false);
                                            }}
                                            className="flex flex-col items-center gap-1 min-w-[64px] transition-opacity focus:outline-none"
                                        >
                                            <div className="shrink-0 w-12 h-12 rounded-full border-2 border-dashed border-[#EC1D99] flex items-center justify-center text-[#EC1D99] hover:bg-[#EC1D99]/10 transition-colors">
                                                <Plus className="w-6 h-6" />
                                            </div>
                                            <span className="text-[10px] text-[#EC1D99] font-medium max-w-[64px] truncate">
                                                Your turn
                                            </span>
                                            <span className="text-[9px] uppercase tracking-wide text-gray-600">Part {entry.position + 1}</span>
                                        </button>
                                    );
                                }
                                
                                // Show disabled placeholder for other users' empty slots
                                return (
                                    <button
                                        key={`empty-${participant.id}-${entry.position}`}
                                        type="button"
                                        disabled
                                        className="flex flex-col items-center gap-1 min-w-[64px] transition-opacity focus:outline-none opacity-40 cursor-default"
                                    >
                                        <div
                                            className={`w-12 h-12 rounded-full border-2 border-dashed overflow-hidden flex items-center justify-center transition-all shrink-0 ${isCurrentTurn ? 'border-[#EC1D99]/70' : 'border-gray-600'}`}
                                        >
                                            <img
                                                src={participant.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(participant.name)}`}
                                                alt={participant.name}
                                                className="w-full h-full object-cover opacity-50"
                                            />
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-medium max-w-[64px] truncate" title={participant.name}>
                                            {participant.name.split(' ').slice(0, 2).join(' ')}
                                        </span>
                                        <span className="text-[9px] uppercase tracking-wide text-gray-600">Part {entry.position + 1}</span>
                                        {isCurrentTurn && (
                                            <span className="text-[10px] text-[#EC1D99] font-semibold">Their turn</span>
                                        )}
                                    </button>
                                );
                            }
                            
                            // Handle contribution entries
                            const { contribution, index, occurrence, isLatestForUser } = entry;
                            const participant = participantMap.get(contribution.userId);
                            const displayName = participant?.name ?? contribution.userName;
                            const avatar = participant?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;
                            const isActive = index === activeIndex;
                            const isCurrentTurn = isLatestForUser && story.currentTurnUserId === contribution.userId;

                            return (
                                <button
                                    key={`${contribution.id}-${index}`}
                                    type="button"
                                    onClick={() => handleContributionSelect(index)}
                                    className="flex flex-col items-center gap-1 min-w-[64px] transition-opacity focus:outline-none text-white"
                                >
                                    <div
                                        className={`w-12 h-12 rounded-full border-2 overflow-hidden flex items-center justify-center transition-all shrink-0 ${isActive
                                            ? 'border-[#EC1D99] shadow-[0_0_15px_rgba(236,29,153,0.35)]'
                                            : isCurrentTurn
                                                ? 'border-[#EC1D99]/70 shadow-[0_0_12px_rgba(236,29,153,0.25)]'
                                                : 'border-gray-700'}`}
                                    >
                                        <img
                                            src={avatar}
                                            alt={displayName}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-300 font-medium max-w-[64px] truncate" title={displayName}>
                                        {displayName.split(' ').slice(0, 2).join(' ')}
                                    </span>
                                    <span className="text-[9px] uppercase tracking-wide text-gray-600">Part {occurrence}</span>
                                    {isCurrentTurn && (
                                        <span className="text-[10px] text-[#EC1D99] font-semibold">Their turn</span>
                                    )}
                                </button>
                            );
                        })}

                        {participantsWithoutContributions.map((participant, idx) => {
                            const isCurrentTurn = story.currentTurnUserId === participant.id;
                            return (
                                <button
                                    key={`pending-${participant.id}-${participant.position ?? idx}`}
                                    type="button"
                                    disabled
                                    className="flex flex-col items-center gap-1 min-w-[64px] transition-opacity focus:outline-none opacity-40 cursor-default"
                                >
                                    <div
                                        className={`w-12 h-12 rounded-full border-2 overflow-hidden flex items-center justify-center transition-all shrink-0 ${isCurrentTurn ? 'border-[#EC1D99]/70 shadow-[0_0_12px_rgba(236,29,153,0.25)]' : 'border-gray-700'}`}
                                    >
                                        <img
                                            src={participant.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(participant.name)}`}
                                            alt={participant.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium max-w-[64px] truncate" title={participant.name}>
                                        {participant.name.split(' ').slice(0, 2).join(' ')}
                                    </span>
                                    <span className="text-[9px] uppercase tracking-wide text-gray-600">No part yet</span>
                                    {isCurrentTurn && (
                                        <span className="text-[10px] text-[#EC1D99] font-semibold">Their turn</span>
                                    )}
                                </button>
                            );
                        })}

                        {/* Show + button only if it's user's turn AND they don't have a specific waiting slot */}
                        {isMyTurn && !userHasWaitingSlot && !isStoryComplete && (
                            <button
                                id="add-weeve-button"
                                onClick={() => {
                                    try { if (typeof window !== 'undefined' && currentUser?.id) { localStorage.setItem('weeve_onboarding_story_overlay_dismissed_' + currentUser.id, 'true'); localStorage.setItem('weeve_onboarding_overlay_dismissed_' + currentUser.id, 'true'); } } catch (err) {}
                                    setShowStitchMenu(true);
                                    setShowOnboardingTutorial(false);
                                }}
                                className="shrink-0 w-12 h-12 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center text-gray-400 hover:text-[#EC1D99] hover:border-[#EC1D99] transition-colors"
                            >
                                <Plus className="w-6 h-6" />
                            </button>
                        )}
                    </div>

                    {!hasContributions && (
                        <div className="text-xs text-gray-500 px-2 pb-2">
                            No stitches yet. Be the first to add one!
                        </div>
                    )}

                    {/* Action Button */}
                    {!isStoryComplete && remainingSlots !== null && (
                        <div className="text-center text-[10px] text-gray-500 pb-2">
                            {remainingSlots} stitch{remainingSlots === 1 ? '' : 'es'} remaining.
                        </div>
                    )}

                    {isStoryComplete ? (
                        <div className="text-center text-xs text-gray-500 py-2">
                            Story complete — stitch limit reached.
                        </div>
                    ) : isMyTurn && !userHasWaitingSlot ? (
                        <button
                            onClick={() => setShowStitchMenu(true)}
                            className="w-full bg-[#EC1D99] text-white font-bold py-3 rounded-full flex items-center justify-center gap-2 hover:bg-[#D41C84] transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Stitch Your Part
                        </button>
                    ) : (
                        <div className="text-center text-xs text-gray-500 py-2">
                            Waiting for {story.participants.find(p => p.id === story.currentTurnUserId)?.name ?? 'the next creator'} to stitch...
                        </div>
                    )}
                </div>
            )}

            {/* Stitch Menu Modal */}
            {showStitchMenu && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-40 flex flex-col items-center justify-end pb-12 animate-in slide-in-from-bottom duration-300">
                    <button
                        onClick={() => setShowStitchMenu(false)}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <h2 className="text-xl font-bold mb-8">How do you want to stitch?</h2>

                    <div className="flex gap-6 mb-8">
                        <button
                            onClick={() => handleStitchOption('video')}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[#EC1D99] transition-colors">
                                <Video className="w-8 h-8" />
                            </div>
                            <span className="text-sm font-medium">Video</span>
                        </button>

                        <button
                            onClick={() => handleStitchOption('image')}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[#EC1D99] transition-colors">
                                <Camera className="w-8 h-8" />
                            </div>
                            <span className="text-sm font-medium">Photo</span>
                        </button>

                        <button
                            onClick={() => handleStitchOption('text')}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[#EC1D99] transition-colors">
                                <Type className="w-8 h-8" />
                            </div>
                            <span className="text-sm font-medium">Text</span>
                        </button>

                        <button
                            onClick={() => handleStitchOption('drawing')}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[#EC1D99] transition-colors">
                                <Pencil className="w-8 h-8" />
                            </div>
                            <span className="text-sm font-medium">Draw</span>
                        </button>
                    </div>
                </div>
            )}

            {mediaPickerConfig && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col items-center justify-end pb-12 animate-in slide-in-from-bottom duration-300">
                    <button
                        onClick={handleMediaPickerCancel}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <h2 className="text-xl font-bold mb-8">{mediaPickerConfig.heading}</h2>

                    <div className="flex gap-6 mb-8">
                        <button
                            onClick={() => handleMediaSourceSelection(mediaPickerConfig.type, 'camera')}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[#EC1D99] transition-colors">
                                <mediaPickerConfig.TakeIcon className="w-8 h-8" />
                            </div>
                            <span className="text-sm font-medium">{mediaPickerConfig.takeLabel}</span>
                        </button>

                        <button
                            onClick={() => handleMediaSourceSelection(mediaPickerConfig.type, 'gallery')}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[#EC1D99] transition-colors">
                                <mediaPickerConfig.UploadIcon className="w-8 h-8" />
                            </div>
                            <span className="text-sm font-medium">{mediaPickerConfig.uploadLabel}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Composer Overlay */}
            {isComposerOpen && (
                <>
                    <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
                        {(stitchMode === 'video' || stitchMode === 'image') && mediaDraft?.previewUrl && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-8 pt-12 pb-32">
                                {stitchMode === 'video' ? (
                                    <video
                                        src={mediaDraft.previewUrl}
                                        className="max-h-[70vh] w-auto rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                                        controls
                                    />
                                ) : (
                                    <img
                                        src={mediaDraft.previewUrl}
                                        alt="Selected media preview"
                                        className="max-h-[70vh] w-auto rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] object-contain"
                                    />
                                )}
                            </div>
                        )}

                        {/* Drawing Canvas */}
                        {stitchMode === 'drawing' && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto px-4 pt-20 pb-32">
                                <DrawingCanvas ref={drawingCanvasRef} className="w-full max-w-md" />
                            </div>
                        )}

                        {(stitchMode === 'text' || stitchMode === 'drawing') && textElements.map((element) => (
                            <div
                                key={element.id}
                                ref={(el) => {
                                    if (el) draggableRefs.current.set(element.id, el);
                                    else draggableRefs.current.delete(element.id);
                                }}
                                className="pointer-events-auto select-none"
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    transform: `translate3d(${element.position.left}px, ${element.position.top}px, 0)`,
                                    touchAction: 'none',
                                    zIndex: activeElementId === element.id ? 20 : 10,
                                }}
                                onClick={() => setActiveElementId(element.id)}
                            >
                                <div className="relative group">
                                    {/* Drag Handle - NOW INTERACTIVE */}
                                    <div
                                        className={`absolute -top-10 left-1/2 -translate-x-1/2 p-2 cursor-grab active:cursor-grabbing transition-opacity ${activeElementId === element.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                        onPointerDown={(e) => handleDragStart(e, element.id)}
                                        onPointerMove={(e) => handleDragMove(e, element.id)}
                                        onPointerUp={(e) => handleDragEnd(e, element.id)}
                                        onPointerCancel={(e) => handleDragEnd(e, element.id)}
                                    >
                                        <div className="w-12 h-1.5 bg-white/30 rounded-full backdrop-blur-sm" />
                                    </div>

                                    {/* Delete Button (only if more than 1) */}
                                    {textElements.length > 1 && activeElementId === element.id && (
                                        <button
                                            className="absolute -top-10 -right-8 p-1.5 bg-red-500/80 rounded-full text-white hover:bg-red-600 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTextElements(prev => prev.filter(el => el.id !== element.id));
                                                if (activeElementId === element.id) {
                                                    setActiveElementId(null);
                                                }
                                            }}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}

                                    <textarea
                                        value={element.content}
                                        onChange={(e) => {
                                            updateElement(element.id, { content: e.target.value });
                                            // Auto-resize
                                            e.target.style.height = 'auto';
                                            e.target.style.height = e.target.scrollHeight + 'px';
                                        }}
                                        onPointerDown={(e) => {
                                            // Stop propagation when clicking on textarea to allow typing
                                            e.stopPropagation();
                                        }}
                                        placeholder={stitchMode === 'drawing' || stitchMode === 'text' ? "Type something..." : ''}
                                        className="min-w-[200px] max-w-[80vw] overflow-hidden bg-transparent resize-none focus:outline-none text-center placeholder:text-white/50"
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
                                            border: activeElementId === element.id ? '1px solid rgba(236,29,153,0.5)' : '1px solid rgba(255,255,255,0.1)',
                                            backdropFilter: 'blur(4px)',
                                            boxShadow: activeElementId === element.id ? '0 0 15px rgba(236,29,153,0.2)' : 'none',
                                        }}
                                        autoFocus={activeElementId === element.id}
                                        rows={1}
                                        onFocus={() => setActiveElementId(element.id)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Side Menu & Controls */}
                    <div className="absolute inset-0 z-50 pointer-events-none">
                        {/* Top Controls */}
                        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
                            <button
                                onClick={handleComposerCancel}
                                className="px-4 py-2 rounded-full bg-black/40 backdrop-blur-md text-white font-medium hover:bg-black/60 transition-colors"
                            >
                                Cancel
                            </button>

                            {/* Add Text Button */}
                            {((stitchMode === 'text' || stitchMode === 'drawing') && textElements.length < 5) && (
                                <button
                                    onClick={addTextElement}
                                    className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white font-medium hover:bg-white/20 transition-colors flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Text
                                </button>
                            )}

                            <button
                                onClick={() => handleComposerSubmit()}
                                disabled={isPostDisabled || isUploading}
                                className={`px-6 py-2 rounded-full font-bold transition-colors ${isPostDisabled || isUploading ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-[#EC1D99] text-white hover:bg-[#D41C84]'}`}
                            >
                                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Post'}
                            </button>
                        </div>

                        {/* Right Side Menu */}
                        {stitchMode === 'text' && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 pointer-events-auto">
                                {/* Font Family */}
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveMenu(activeMenu === 'font' ? null : 'font')}
                                        className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors ${activeMenu === 'font' ? 'bg-[#EC1D99] border-[#EC1D99] text-white' : 'bg-black/40 border-white/10 text-white hover:bg-[#EC1D99]'}`}
                                    >
                                        <Type className="w-5 h-5" />
                                    </button>
                                    {activeMenu === 'font' && (
                                        <div className="absolute right-full top-0 mr-4 bg-black/90 border border-white/10 rounded-xl p-2 flex flex-col gap-2 w-32 animate-in slide-in-from-right-2 duration-200">
                                            {FONT_OPTIONS.map((font) => (
                                                <button
                                                    key={font.value}
                                                    onClick={() => {
                                                        updateTextStyle('fontFamily', font.value);
                                                        setActiveMenu(null);
                                                    }}
                                                    className={`text-sm py-1 px-2 rounded text-left truncate ${activeElementId && textElements.find(el => el.id === activeElementId)?.style.fontFamily === font.value ? 'text-[#EC1D99]' : 'text-white hover:bg-white/10'}`}
                                                    style={{ fontFamily: font.value }}
                                                >
                                                    {font.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Font Size */}
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveMenu(activeMenu === 'size' ? null : 'size')}
                                        className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors ${activeMenu === 'size' ? 'bg-[#EC1D99] border-[#EC1D99] text-white' : 'bg-black/40 border-white/10 text-white hover:bg-[#EC1D99]'}`}
                                    >
                                        <span className="text-xs font-bold">Aa</span>
                                    </button>
                                    {activeMenu === 'size' && (
                                        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-4 bg-black/90 border border-white/10 rounded-xl p-2 flex gap-2 animate-in slide-in-from-right-2 duration-200">
                                            {FONT_SIZE_OPTIONS.map((size) => (
                                                <button
                                                    key={size}
                                                    onClick={() => {
                                                        updateTextStyle('fontSize', size);
                                                        setActiveMenu(null);
                                                    }}
                                                    className={`w-8 h-8 rounded flex items-center justify-center text-xs ${activeElementId && textElements.find(el => el.id === activeElementId)?.style.fontSize === size ? 'bg-[#EC1D99] text-white' : 'text-gray-300 hover:bg-white/10'}`}
                                                >
                                                    {size}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Alignment */}
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveMenu(activeMenu === 'align' ? null : 'align')}
                                        className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors ${activeMenu === 'align' ? 'bg-[#EC1D99] border-[#EC1D99] text-white' : 'bg-black/40 border-white/10 text-white hover:bg-[#EC1D99]'}`}
                                    >
                                        {(!activeElementId || textElements.find(el => el.id === activeElementId)?.style.textAlign === 'left') && <AlignLeft className="w-5 h-5" />}
                                        {activeElementId && textElements.find(el => el.id === activeElementId)?.style.textAlign === 'center' && <AlignCenter className="w-5 h-5" />}
                                        {activeElementId && textElements.find(el => el.id === activeElementId)?.style.textAlign === 'right' && <AlignRight className="w-5 h-5" />}
                                    </button>
                                    {activeMenu === 'align' && (
                                        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-4 bg-black/90 border border-white/10 rounded-xl p-2 flex gap-2 animate-in slide-in-from-right-2 duration-200">
                                            {ALIGN_OPTIONS.map(({ value, icon: Icon }) => (
                                                <button
                                                    key={value}
                                                    onClick={() => {
                                                        updateTextStyle('textAlign', value);
                                                        setActiveMenu(null);
                                                    }}
                                                    className={`p-2 rounded ${activeElementId && textElements.find(el => el.id === activeElementId)?.style.textAlign === value ? 'bg-[#EC1D99] text-white' : 'text-gray-300 hover:bg-white/10'}`}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Text Color */}
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveMenu(activeMenu === 'color' ? null : 'color')}
                                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${activeMenu === 'color' ? 'border-white scale-110' : 'border-white/20'}`}
                                        style={{ backgroundColor: activeElementId ? textElements.find(el => el.id === activeElementId)?.style.textColor : '#FFFFFF' }}
                                    />
                                    {activeMenu === 'color' && (
                                        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-4 bg-black/90 border border-white/10 rounded-xl p-2 grid grid-cols-4 gap-2 w-48 animate-in slide-in-from-right-2 duration-200">
                                            {TEXT_COLOR_OPTIONS.map((color) => (
                                                <button
                                                    key={color}
                                                    onClick={() => {
                                                        updateTextStyle('textColor', color);
                                                        setActiveMenu(null);
                                                    }}
                                                    className={`w-8 h-8 rounded-full border-2 ${activeElementId && textElements.find(el => el.id === activeElementId)?.style.textColor === color ? 'border-white' : 'border-transparent'}`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Background Color */}
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveMenu(activeMenu === 'bg' ? null : 'bg')}
                                        className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-colors ${activeMenu === 'bg' ? 'border-white scale-110' : 'border-white/20'}`}
                                        style={{
                                            background: (activeElementId ? textElements.find(el => el.id === activeElementId)?.style.backgroundColor : 'transparent') === 'transparent'
                                                ? 'linear-gradient(135deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)'
                                                : (activeElementId ? textElements.find(el => el.id === activeElementId)?.style.backgroundColor : 'transparent')
                                        }}
                                    />
                                    {activeMenu === 'bg' && (
                                        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-4 bg-black/90 border border-white/10 rounded-xl p-2 grid grid-cols-3 gap-2 w-40 animate-in slide-in-from-right-2 duration-200">
                                            {BACKGROUND_OPTIONS.map((color) => (
                                                <button
                                                    key={color}
                                                    onClick={() => {
                                                        updateTextStyle('backgroundColor', color);
                                                        setActiveMenu(null);
                                                    }}
                                                    className={`w-10 h-8 rounded border ${activeElementId && textElements.find(el => el.id === activeElementId)?.style.backgroundColor === color ? 'border-white' : 'border-transparent'}`}
                                                    style={{
                                                        background: color === 'transparent'
                                                            ? 'linear-gradient(135deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)'
                                                            : color
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
    {/* Edit Story Modal */ }
    {
        showEditModal && (
            <EditStoryModal
                story={story}
                onClose={() => setShowEditModal(false)}
            />
        )
    }

    {/* Leave Story Confirmation Modal */ }
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

    {/* Delete Story Confirmation Modal */ }
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
                    console.log("Video safety timer triggered");
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
