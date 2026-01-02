
// Shared module-level caches that persist across component remounts/navigation
const GLOBAL_VIDEO_PRELOAD_CACHE: Map<string, HTMLVideoElement> = (globalThis as any).__weeveVideoPreloadCache || new Map();
const GLOBAL_VIDEO_POSTER_CACHE: Map<string, string> = (globalThis as any).__weeveVideoPosterCache || new Map();
const GLOBAL_VIDEO_READY_REF: Map<string, boolean> = (globalThis as any).__weeveVideoReadyRef || new Map();
if (!(globalThis as any).__weeveVideoPreloadCache) (globalThis as any).__weeveVideoPreloadCache = GLOBAL_VIDEO_PRELOAD_CACHE;
if (!(globalThis as any).__weeveVideoPosterCache) (globalThis as any).__weeveVideoPosterCache = GLOBAL_VIDEO_POSTER_CACHE;
if (!(globalThis as any).__weeveVideoReadyRef) (globalThis as any).__weeveVideoReadyRef = GLOBAL_VIDEO_READY_REF;

import { Story, useStore, Contribution, isSlotImmutable, isBrandPost, getSlotProgress } from "@/lib/store";
import { NON_VIDEO_AUTO_ADVANCE_MS } from "@/lib/playback";
import { MessageCircle, Heart, Share2, X, UserPlus, Users, Bookmark, Search, GitBranch, Plus, ExternalLink, ChevronDown, Lock } from "lucide-react";
import { searchUsers } from "@/lib/friends";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useMemo, FormEvent, useCallback } from "react";
import { createPortal } from "react-dom";
import ShareModal from "./ShareModal";
import VerificationBadge from "./VerificationBadge";
import VideoThumbnail from "./VideoThumbnail";

interface FeedItemProps {
    story: Story;
    initialContributionId?: string;
    /** When provided, overrides IntersectionObserver for playback control. Use for overlay/modal feeds. */
    isActive?: boolean;
}

const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const deltaSeconds = Math.round((now - timestamp) / 1000);

    if (!Number.isFinite(deltaSeconds)) {
        return "";
    }

    if (Math.abs(deltaSeconds) < 60) {
        return `${Math.max(0, deltaSeconds)}s ago`;
    }

    const deltaMinutes = Math.round(deltaSeconds / 60);
    if (Math.abs(deltaMinutes) < 60) {
        return `${Math.max(0, deltaMinutes)}m ago`;
    }

    const deltaHours = Math.round(deltaMinutes / 60);
    if (Math.abs(deltaHours) < 24) {
        return `${Math.max(0, deltaHours)}h ago`;
    }

    const deltaDays = Math.round(deltaHours / 24);
    if (deltaDays < 7) {
        return `${Math.max(0, deltaDays)}d ago`;
    }

    const deltaWeeks = Math.round(deltaDays / 7);
    if (deltaWeeks < 5) {
        return `${Math.max(0, deltaWeeks)}w ago`;
    }

    const deltaMonths = Math.round(deltaDays / 30);
    if (deltaMonths < 12) {
        return `${Math.max(0, deltaMonths)}mo ago`;
    }

    const deltaYears = Math.round(deltaDays / 365);
    return `${Math.max(0, deltaYears)}y ago`;
};

export default function FeedItem({ story, initialContributionId, isActive }: FeedItemProps) {
    const router = useRouter();

    const [currentIndex, setCurrentIndex] = useState(0);
    const initialSet = useRef(false);
    const [isVisible, setIsVisible] = useState(false);
    // When isActive prop is provided, use it to control playback; otherwise fall back to IntersectionObserver
    const effectiveIsVisible = isActive !== undefined ? isActive : isVisible;
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const bufferVideoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const videoPreloadCache = useRef<Map<string, HTMLVideoElement>>(GLOBAL_VIDEO_PRELOAD_CACHE);
    const videoPosterCache = useRef<Map<string, string>>(GLOBAL_VIDEO_POSTER_CACHE);
    const videoReadyRef = useRef<Map<string, boolean>>(GLOBAL_VIDEO_READY_REF);
    const [videoReadyVersion, setVideoReadyVersion] = useState(0);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [isVideoVisible, setIsVideoVisible] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBufferVisible, setIsBufferVisible] = useState(false);
    const [currentVideoSrc, setCurrentVideoSrc] = useState<string | undefined>(undefined);
    const [hasInteracted, setHasInteracted] = useState(false);

    const [isForking, setIsForking] = useState(false);
    const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
    const [showParticipantPicker, setShowParticipantPicker] = useState(false);
    const [showFriendPicker, setShowFriendPicker] = useState(false);
    const [friendSearchQuery, setFriendSearchQuery] = useState('');
    const [friendSearchResults, setFriendSearchResults] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
    const [isSearchingFriends, setIsSearchingFriends] = useState(false);
    const [currentSlotIndex, setCurrentSlotIndex] = useState(0);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const [showTutorialTooltip, setShowTutorialTooltip] = useState(false);
    const [showMonetizationModal, setShowMonetizationModal] = useState<'confirm' | 'insufficient' | 'enable_required' | null>(null);
    const [isAvatarsExpanded, setIsAvatarsExpanded] = useState(false);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    // Weeve details editing state
    const [showWeeveDetailsModal, setShowWeeveDetailsModal] = useState(false);
    const [weeveTitle, setWeeveTitle] = useState('');
    const [weeveDescription, setWeeveDescription] = useState('');
    const [pendingParticipantId, setPendingParticipantId] = useState<string | null>(null);
    const [isCreatingWeeve, setIsCreatingWeeve] = useState(false);
    const [isForkingBrandPost, setIsForkingBrandPost] = useState(false);

    const deductTokens = useStore((state) => state.deductTokens);

    // Detect if this is an onboarding story (personalized for each user)
    const isOnboardingStory = story.title === 'Your First Weeve Story' && story.maxWeeves === 3;

    const captureFrameFromVideo = useCallback((video: HTMLVideoElement) => {
        if (typeof document === "undefined") {
            return null;
        }

        const width = video.videoWidth;
        const height = video.videoHeight;

        if (!width || !height) {
            return null;
        }

        try {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            if (!context) {
                return null;
            }
            context.drawImage(video, 0, 0, width, height);
            return canvas.toDataURL('image/jpeg', 0.7);
        } catch (error) {

            return null;
        }
    }, []);

    const markVideoReady = useCallback((url: string, source?: HTMLVideoElement) => {
        if (!url) {
            return;
        }

        let didUpdate = false;

        if (source && !videoPosterCache.current.has(url)) {
            const snapshot = captureFrameFromVideo(source);
            if (snapshot) {
                videoPosterCache.current.set(url, snapshot);
                didUpdate = true;
            }
        }

        if (!videoReadyRef.current.get(url)) {
            videoReadyRef.current.set(url, true);
            didUpdate = true;
        }

        if (didUpdate) {
            setVideoReadyVersion((value) => value + 1);
        }
    }, [captureFrameFromVideo]);
    const skipAutoAdvanceRef = useRef(false);

    // Touch handling refs for swipe gestures (used by slot picker overlay)
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);

    // Touch handling refs for main media content swipe navigation
    const mediaTouchStartX = useRef(0);
    const mediaTouchStartY = useRef(0);
    const mediaTouchEndX = useRef(0);
    const mediaTouchEndY = useRef(0);
    const isMediaSwiping = useRef(false);

    // Normalize participants to handle cases where position might be missing or duplicated (legacy data)
    const normalizedParticipants = useMemo(() => {
        if (!story.participants) return [];

        const participants = [...story.participants];
        const positions = participants.map(p => p.position ?? 0);
        const hasDuplicates = new Set(positions).size !== positions.length;

        // If we have duplicates (likely all 0s), re-assign positions sequentially
        if (hasDuplicates) {
            return participants.map((p, index) => ({
                ...p,
                position: index
            }));
        }

        return participants;
    }, [story.participants]);

    const toggleStoryLike = useStore((state) => state.toggleStoryLike);
    const toggleCommentLike = useStore((state) => state.toggleCommentLike);
    const addStoryComment = useStore((state) => state.addStoryComment);
    const forkStory = useStore((state) => state.forkStory);
    const forkBrandPost = useStore((state) => state.forkBrandPost);
    const currentUser = useStore((state) => state.currentUser);
    const friends = useStore((state) => state.friends);
    const fetchFriends = useStore((state) => state.fetchFriends);
    const savedStoryIds = useStore((state) => state.savedStoryIds);
    const toggleStorySave = useStore((state) => state.toggleStorySave);
    const stories = useStore((state) => state.stories);

    // Get original story title for forked stories
    const originalStoryTitle = useMemo(() => {
        if (!story.forkedFromStoryId) return null;
        const originalStory = stories.find(s => s.id === story.forkedFromStoryId);
        return originalStory?.title || null;
    }, [story.forkedFromStoryId, stories]);

    useEffect(() => {
        if (!isVisible) {
            // Avoid preloading when the story isn't visible (prevent loading everything)
            return;
        }
        if (showFriendPicker && friends.length === 0) {
            fetchFriends();
        }
    }, [showFriendPicker, friends.length, fetchFriends, isVisible]);

    // Debounced search for friend picker
    useEffect(() => {
        if (!friendSearchQuery.trim() || friendSearchQuery.length < 2) {
            setFriendSearchResults([]);
            setIsSearchingFriends(false);
            return;
        }

        setIsSearchingFriends(true);
        const timeoutId = setTimeout(async () => {
            if (!currentUser) {
                setIsSearchingFriends(false);
                return;
            }
            try {
                const results = await searchUsers(friendSearchQuery, currentUser.id);
                setFriendSearchResults(results.map(r => ({ id: r.id, name: r.name, avatar: r.avatar })));
            } catch (err) {
                console.error('Friend search failed:', err);
            } finally {
                setIsSearchingFriends(false);
            }
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [friendSearchQuery, currentUser]);

    const likedBy = useMemo(() => story.likedBy ?? [], [story.likedBy]);
    const comments = useMemo(() => story.comments ?? [], [story.comments]);

    const contributions = useMemo(() => {
        return (story.contributions || [])
            .slice()
            .sort((a, b) => a.timestamp - b.timestamp);
    }, [story.contributions]);

    const participantsMap = useMemo(() => {
        return new Map(story.participants.map((participant) => [participant.id, participant]));
    }, [story.participants]);

    const sortedComments = useMemo(() => {
        return comments.slice().sort((a, b) => a.timestamp - b.timestamp);
    }, [comments]);

    // Organize comments into threads: top-level comments with their replies grouped
    const organizedComments = useMemo(() => {
        const topLevel = sortedComments.filter(c => !c.parentCommentId);
        const repliesMap = new Map<string, typeof sortedComments>();

        sortedComments.forEach(c => {
            if (c.parentCommentId) {
                const existing = repliesMap.get(c.parentCommentId) || [];
                existing.push(c);
                repliesMap.set(c.parentCommentId, existing);
            }
        });

        return topLevel.map(parent => ({
            ...parent,
            replies: repliesMap.get(parent.id) || []
        }));
    }, [sortedComments]);

    const isLiked = useMemo(() => {
        if (!currentUser) return false;
        return likedBy.includes(currentUser.id);
    }, [currentUser, likedBy]);

    const likeCount = useMemo(() => {
        return typeof story.likes === "number" ? story.likes : likedBy.length;
    }, [story.likes, likedBy]);

    const isFriendOfCreator = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.id === story.creatorId) return true;
        return friends.some(f => f.id === story.creatorId);
    }, [currentUser, friends, story.creatorId]);

    // Check if current user is a participant in this story
    const isParticipant = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.id === story.creatorId) return true;
        return (story.participants ?? []).some(p => p.id === currentUser.id);
    }, [currentUser, story.creatorId, story.participants]);

    // Pre-calculate slot content mapping to handle multi-slot users correctly
    const slotContentMap = useMemo(() => {
        const map = new Map<number, Contribution>();
        const usedContributionIds = new Set<string>();

        if (!normalizedParticipants || !story.contributions) return map;

        const sortedParticipants = [...normalizedParticipants].sort((a, b) => (a.position || 0) - (b.position || 0));
        const sortedContributions = [...story.contributions].sort((a, b) => a.timestamp - b.timestamp);

        // Group contributions by user
        const contributionsByUser = new Map<string, Contribution[]>();
        for (const c of sortedContributions) {
            if (!contributionsByUser.has(c.userId)) {
                contributionsByUser.set(c.userId, []);
            }
            contributionsByUser.get(c.userId)?.push(c);
        }

        // 1. Map based on participants (Explicit Mapping)
        for (const p of sortedParticipants) {
            const userContribs = contributionsByUser.get(p.id) || [];
            // Find first unused contribution for this user
            const contrib = userContribs.find(c => !usedContributionIds.has(c.id));

            if (contrib) {
                map.set(p.position || 0, contrib);
                usedContributionIds.add(contrib.id);
            }
        }

        // 2. Fill gaps with remaining contributions (Implicit Mapping)
        // This handles cases where a user has multiple contributions but only one participant entry.
        const remainingContributions = sortedContributions.filter(c => !usedContributionIds.has(c.id));
        const maxSlots = story.maxWeeves || 3;

        for (let i = 0; i < maxSlots; i++) {
            if (!map.has(i) && remainingContributions.length > 0) {
                const nextContrib = remainingContributions.shift();
                if (nextContrib) {
                    map.set(i, nextContrib);
                }
            }
        }

        return map;
    }, [normalizedParticipants, story.contributions, story.maxWeeves]);

    // Build ordered contributions array from slot map for display
    const orderedContributions = useMemo(() => {
        const maxSlots = story.maxWeeves || 3;
        const ordered: Contribution[] = [];
        for (let i = 0; i < maxSlots; i++) {
            const contrib = slotContentMap.get(i);
            if (contrib) {
                ordered.push(contrib);
            }
        }
        return ordered;
    }, [slotContentMap, story.maxWeeves]);

    // Fallback: if mapping produced nothing, fall back to raw contributions order
    const effectiveOrderedContributions = useMemo(() => {
        if (orderedContributions.length > 0) return orderedContributions;
        // use raw contributions sorted by timestamp
        return (story.contributions || []).slice().sort((a, b) => a.timestamp - b.timestamp);
    }, [orderedContributions, story.contributions]);

    // If an initial id is provided and that raw contribution doesn't appear in the
    // effective ordered list (due to mappings), ensure it is at the front so we can
    // start playback there.
    const chosenRawContribution = initialContributionId ? contributions.find(c => c.id === initialContributionId) : undefined;

    const displayOrderedContributions = useMemo(() => {
        if (!chosenRawContribution) return effectiveOrderedContributions;
        const exists = effectiveOrderedContributions.some(c => c.id === chosenRawContribution.id);
        if (exists) return effectiveOrderedContributions;
        return [chosenRawContribution, ...effectiveOrderedContributions.filter(c => c.id !== chosenRawContribution.id)];
    }, [effectiveOrderedContributions, chosenRawContribution]);

    // If an initialContributionId prop is provided, set the initial index to the
    // matching contribution position. This ensures opening via profile/feed starts
    // at the expected contribution (e.g., the shield thumbnail)
    useEffect(() => {
        // Only auto-select initial index if user hasn't interacted
        if (hasInteracted) return;
        if (effectiveOrderedContributions.length === 0) return;



        const applyIndex = (idx: number | null) => {
            if (idx === null || idx < 0 || idx >= effectiveOrderedContributions.length) return false;
            setCurrentIndex(idx);
            initialSet.current = true;
            return true;
        };

        if (initialContributionId) {

            // 1) Try direct id match in effectiveOrderedContributions
            const foundIndex = effectiveOrderedContributions.findIndex(c => c.id === initialContributionId);
            if (foundIndex >= 0 && applyIndex(foundIndex)) {

                return;
            }

            // 2) If not found by id, look up the contribution by id in raw contributions and match by mediaUrl
            const rawContrib = contributions.find(c => c.id === initialContributionId);
            if (rawContrib) {

                const mediaUrlToMatch = rawContrib.mediaUrl || rawContrib.content || '';
                // try exact mediaUrl match first
                const foundByMedia = effectiveOrderedContributions.findIndex(c => (c.mediaUrl || '').includes(mediaUrlToMatch) || (mediaUrlToMatch || '').includes(c.mediaUrl || ''));
                if (foundByMedia >= 0 && applyIndex(foundByMedia)) {

                    return;
                }

                // 3) Try matching by userId + content
                const foundByUserContent = effectiveOrderedContributions.findIndex(c => c.userId === rawContrib.userId && c.content === rawContrib.content);
                if (foundByUserContent >= 0 && applyIndex(foundByUserContent)) {

                    return;
                }
            } else {

            }


        }

        // If we get here we didn't match initial contribution, try to set to first playable
        const firstPlayable = effectiveOrderedContributions.findIndex(c => {
            if (!c) return false;
            if (c.mediaType !== 'video') return true;
            return !!(c.mediaUrl && c.mediaUrl.trim());
        });

        if (firstPlayable >= 0 && applyIndex(firstPlayable)) {

        }

    }, [initialContributionId, effectiveOrderedContributions, contributions, hasInteracted]);

    const contributionsCount = displayOrderedContributions.length;
    const hasContributions = contributionsCount > 0;
    const safeIndex = hasContributions ? currentIndex % contributionsCount : 0;
    const currentContribution = hasContributions ? displayOrderedContributions[safeIndex] : undefined;
    const mediaUrl = currentContribution?.mediaUrl;

    const mediaType: 'video' | 'image' | 'text' | 'drawing' = (() => {
        if (!hasContributions) {
            if (story.coverImage) {
                // Check if the cover image is actually a video
                const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
                const isVideo = videoExtensions.some(ext => story.coverImage?.toLowerCase().includes(ext));
                return isVideo ? 'video' : 'image';
            }
            return 'text';
        }
        // CRITICAL FIX: Only treat as video if we actually have a valid mediaUrl
        if (currentContribution?.mediaType === 'video' && currentContribution.mediaUrl?.trim()) return 'video';
        if (currentContribution?.mediaType === 'drawing' && currentContribution.mediaUrl) return 'drawing';
        if (currentContribution?.mediaType === 'image' && currentContribution.mediaUrl) return 'image';
        // FALLBACK: If mediaType is video but no URL, treat as text to avoid black screen
        return 'text';
    })();

    // DEBUG: Log contribution details to help diagnose video display issue
    useEffect(() => {
        if (hasContributions) {

        }
    }, [story.id, contributionsCount, currentIndex, currentContribution, hasContributions, story.coverImage, story.title, displayOrderedContributions, slotContentMap, mediaType, isVideoReady, isVideoVisible, mediaUrl]);

    // Log current play item when it changes
    useEffect(() => {
        if (!currentContribution) return;

    }, [currentContribution, currentIndex]);
    // We intentionally avoid generating video posters/placeholders for feed items.
    // Keeping a solid black overlay until playback begins ensures no poster or
    // snapshot flash appears (some sources may include a baked-in play icon).
    const activeUserId = currentContribution?.userId;
    const waitingParticipant = story.currentTurnUserId
        ? story.participants.find((p) => p.id === story.currentTurnUserId)
        : undefined;
    const waitingForFirstContribution = !hasContributions;

    useEffect(() => {
        if (mediaType !== 'video') {
            setIsVideoVisible(false);
            return;
        }

        const video = videoRef.current;
        const buffer = bufferVideoRef.current;
        const cachedReady = videoReadyRef.current.get(mediaUrl || '') ?? false;
        if (cachedReady && currentVideoSrc !== mediaUrl) {
            setCurrentVideoSrc(mediaUrl);
            setIsVideoReady(true);
            setIsVideoVisible(true);
        }
        if (!video) {
            setIsVideoVisible(false);
            return;
        }

        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('x-webkit-airplay', 'deny');
        video.setAttribute('disablePictureInPicture', 'true');
        video.preload = 'auto';

        // If video already has data loaded, show it immediately
        if (videoReadyRef.current.get(mediaUrl || '') && video.readyState >= 2) {
            setIsVideoVisible(true);
            // If we're visible, try to play right away (muted to satisfy autoplay rules)
            if (effectiveIsVisible) {
                video.muted = false;
                video.play().catch(() => null);
            }
        } else {
            setIsVideoVisible(false);
        }
    }, [mediaType, mediaUrl, effectiveIsVisible]);

    // If the document visibility changes (e.g., returning from a Create Story page), try to resume playback
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && effectiveIsVisible && mediaType === 'video' && videoRef.current) {
                const video = videoRef.current;
                if (videoReadyRef.current.get(mediaUrl || '') && video.paused) {
                    video.muted = false;
                    video.play().catch(() => null);
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [effectiveIsVisible, mediaType, mediaUrl]);

    // Show tutorial tooltip for onboarding story (only first time)
    useEffect(() => {
        if (isOnboardingStory) {
            const hasSeenTooltip = localStorage.getItem('weeve_tutorial_tooltip_seen');
            if (!hasSeenTooltip) {
                // Show tooltip after 1 second
                const timer = setTimeout(() => {
                    setShowTutorialTooltip(true);
                }, 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [isOnboardingStory]);

    const handleTooltipDismiss = () => {
        setShowTutorialTooltip(false);
        localStorage.setItem('weeve_tutorial_tooltip_seen', 'true');
    };

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const cleanupFns: Array<() => void> = [];

        for (const contribution of contributions) {
            const mediaUrl = contribution.mediaUrl;
            // CRITICAL: Check for empty/invalid URLs
            if (contribution.mediaType !== 'video' || !mediaUrl || !mediaUrl.trim()) {
                if (contribution.mediaType === 'video' && !mediaUrl?.trim()) {
                    console.warn('[FeedItem] Video contribution has empty URL:', contribution.id);
                }
                continue;
            }

            if (videoPreloadCache.current.has(mediaUrl)) {
                continue;
            }

            const preloadVideo = document.createElement('video');
            preloadVideo.src = mediaUrl;
            preloadVideo.preload = 'auto';
            preloadVideo.muted = false;
            preloadVideo.playsInline = true;

            const handleReady = () => {
                markVideoReady(mediaUrl, preloadVideo);
                cleanup();
            };

            const handleError = (e: Event) => {
                const target = e.target as HTMLVideoElement;
                console.error('[FeedItem] Preload video error:', {
                    contributionId: contribution.id,
                    mediaUrl: mediaUrl.substring(0, 100),
                    errorCode: target.error?.code,
                    errorMessage: target.error?.message
                });
                cleanup();
            };

            const cleanup = () => {
                preloadVideo.removeEventListener('canplaythrough', handleReady);
                preloadVideo.removeEventListener('canplay', handleReady);
                preloadVideo.removeEventListener('error', handleError);
            };

            preloadVideo.addEventListener('canplaythrough', handleReady);
            preloadVideo.addEventListener('canplay', handleReady);
            preloadVideo.addEventListener('error', handleError);

            preloadVideo.load();

            // Cache preload only when visible; this reduces background requests
            videoPreloadCache.current.set(mediaUrl, preloadVideo);
            cleanupFns.push(cleanup);
        }

        return () => {
            cleanupFns.forEach((fn) => fn());
        };
    }, [contributions, markVideoReady, isVisible]);

    useEffect(() => {
        if (mediaType !== 'video') {
            return;
        }

        // Instantly skip to next video if not ready or error, no placeholder
        if (!mediaUrl || !mediaUrl.trim()) {
            if (!mediaUrl?.trim()) {
                console.error('[FeedItem] Video mediaType but empty URL detected!', {
                    storyId: story.id,
                    contributionId: currentContribution?.id,
                    mediaUrl
                });
            }
            setIsVideoReady(false);
            setIsVideoVisible(false);
            // Skip to next playable index once (avoid infinite loops)
            if (displayOrderedContributions.length > 1) {
                const findNextPlayable = (start: number) => {
                    for (let i = 1; i <= displayOrderedContributions.length; i++) {
                        const idx = (start + i) % displayOrderedContributions.length;
                        const cand = displayOrderedContributions[idx];
                        if (!cand) continue;
                        const isCandVideo = cand.mediaType === 'video';
                        const hasUrl = !!(cand.mediaUrl && cand.mediaUrl.trim());
                        if (!isCandVideo || (isCandVideo && hasUrl)) return idx;
                    }
                    return start;
                };
                const next = findNextPlayable(currentIndex);
                if (next !== currentIndex && !skipAutoAdvanceRef.current) {
                    skipAutoAdvanceRef.current = true;
                    setCurrentIndex(next);
                    setTimeout(() => {
                        skipAutoAdvanceRef.current = false;
                    }, 700);
                }
            }
            return;
        }

        const video = videoRef.current;
        const buffer = bufferVideoRef.current;
        if (!video) {
            setIsVideoReady(false);
            setIsVideoVisible(false);
            if (orderedContributions.length > 1) {
                const findNextPlayable = (start: number) => {
                    for (let i = 1; i <= orderedContributions.length; i++) {
                        const idx = (start + i) % orderedContributions.length;
                        const cand = orderedContributions[idx];
                        if (!cand) continue;
                        const isCandVideo = cand.mediaType === 'video';
                        const hasUrl = !!(cand.mediaUrl && cand.mediaUrl.trim());
                        if (!isCandVideo || (isCandVideo && hasUrl)) return idx;
                    }
                    return start;
                };
                const next = findNextPlayable(currentIndex);
                if (next !== currentIndex && !skipAutoAdvanceRef.current) {
                    skipAutoAdvanceRef.current = true;
                    setCurrentIndex(next);
                    setTimeout(() => {
                        skipAutoAdvanceRef.current = false;
                    }, 700);
                }
            }
            return;
        }

        let visibilityTimeout: NodeJS.Timeout | null = null;
        // Capture cached readiness
        const cachedReady = videoReadyRef.current.get(mediaUrl || '') ?? false;
        // If not already preloaded, start a buffer preload and adopt once ready
        let bufferCanPlayHandler: (() => void) | null = null;
        if (!cachedReady && buffer && mediaUrl) {
            try {
                buffer.src = mediaUrl;
                buffer.preload = 'auto';
                buffer.muted = false;
                buffer.playsInline = true;
                bufferCanPlayHandler = () => {
                    if (currentVideoSrc === mediaUrl) return;
                    // Show buffer element to start crossfade
                    setIsBufferVisible(true);
                    // Fade: after small delay, fade primary out then swap.
                    setTimeout(() => {
                        setIsVideoVisible(false);
                        setTimeout(() => {
                            try {
                                if (video && buffer) {
                                    // Swap primary src to buffer's src and start playback
                                    video.pause();
                                    video.src = buffer.src;
                                    video.load();
                                    video.muted = false;
                                    video.play().catch(() => null);
                                    setIsVideoReady(true);
                                    setCurrentVideoSrc(mediaUrl);
                                }
                            } catch (err) {

                            }
                            // Fade back in and hide buffer
                            setIsBufferVisible(false);
                            setIsVideoVisible(true);
                        }, 160);
                    }, 8);
                };
                buffer.addEventListener('canplay', bufferCanPlayHandler);
                buffer.addEventListener('canplaythrough', bufferCanPlayHandler);
                buffer.load();
            } catch (err) {

            }
        }

        const handleReady = () => {
            markVideoReady(mediaUrl, video);
            setIsVideoReady(true);
            if (video.readyState >= 3) {
                setIsVideoVisible(true);
            } else {
                if (visibilityTimeout) clearTimeout(visibilityTimeout);
                visibilityTimeout = setTimeout(() => {
                    if (!video.paused || video.currentTime > 0) {
                        setIsVideoVisible(true);
                    }
                }, 100);
            }
        };

        const handlePlaying = () => {
            if (visibilityTimeout) clearTimeout(visibilityTimeout);
            setIsVideoVisible(true);
            markVideoReady(mediaUrl, video);
        };

        const handleCanPlay = () => {
            if (visibilityTimeout) clearTimeout(visibilityTimeout);
            setIsVideoVisible(true);
            markVideoReady(mediaUrl, video);
        };

        const handleError = (e: Event) => {
            const target = e.target as HTMLVideoElement;
            const error = target.error;
            console.error('[FeedItem] Video error:', {
                mediaUrl,
                errorCode: error?.code,
                errorMessage: error?.message,
                networkState: target.networkState,
                readyState: target.readyState,
                src: target.src
            });
            setIsVideoVisible(false);
            setIsVideoReady(false);
            videoReadyRef.current.set(mediaUrl || '', false);
            // Find next playable index and skip to it (do only one state update)
            if (orderedContributions.length > 1) {
                const findNextPlayable = (start: number) => {
                    for (let i = 1; i <= orderedContributions.length; i++) {
                        const idx = (start + i) % orderedContributions.length;
                        const cand = orderedContributions[idx];
                        if (!cand) continue;
                        const isCandVideo = cand.mediaType === 'video';
                        const hasUrl = !!(cand.mediaUrl && cand.mediaUrl.trim());
                        if (!isCandVideo || (isCandVideo && hasUrl)) return idx;
                    }
                    return start;
                };
                const next = findNextPlayable(currentIndex);
                if (next !== currentIndex && !skipAutoAdvanceRef.current) {
                    skipAutoAdvanceRef.current = true;
                    setCurrentIndex(next);
                    setTimeout(() => {
                        skipAutoAdvanceRef.current = false;
                    }, 700);
                }
            }
        };

        video.addEventListener('loadeddata', handleCanPlay);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('canplaythrough', handleReady);
        video.addEventListener('playing', handlePlaying);
        video.addEventListener('error', handleError);

        // Immediately skip if video is not ready after a short timeout
        visibilityTimeout = setTimeout(() => {
            if (!videoReadyRef.current.get(mediaUrl)) {
                setIsVideoVisible(false);
                setIsVideoReady(false);
                if (displayOrderedContributions.length > 1) {
                    const findNextPlayable = (start: number) => {
                        for (let i = 1; i <= displayOrderedContributions.length; i++) {
                            const idx = (start + i) % displayOrderedContributions.length;
                            const cand = displayOrderedContributions[idx];
                            if (!cand) continue;
                            const isCandVideo = cand.mediaType === 'video';
                            const hasUrl = !!(cand.mediaUrl && cand.mediaUrl.trim());
                            if (!isCandVideo || (isCandVideo && hasUrl)) return idx;
                        }
                        return start;
                    };
                    const next = findNextPlayable(currentIndex);
                    if (next !== currentIndex && !skipAutoAdvanceRef.current) {
                        skipAutoAdvanceRef.current = true;
                        setCurrentIndex(next);
                        setTimeout(() => {
                            skipAutoAdvanceRef.current = false;
                        }, 700);
                    }
                }
            }
        }, 1200);

        return () => {
            if (visibilityTimeout) clearTimeout(visibilityTimeout);
            video.removeEventListener('loadeddata', handleCanPlay);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('canplaythrough', handleReady);
            video.removeEventListener('playing', handlePlaying);
            video.removeEventListener('error', handleError);
            if (buffer && bufferCanPlayHandler) {
                try {
                    buffer.removeEventListener('canplay', bufferCanPlayHandler);
                    buffer.removeEventListener('canplaythrough', bufferCanPlayHandler);
                } catch (e) { }
            }
        };
    }, [mediaType, mediaUrl, markVideoReady, displayOrderedContributions.length, currentContribution, currentIndex, currentVideoSrc]);

    // Intersection Observer to track visibility and trigger autoplay reset on remount
    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
                // When becoming visible, try to play or restore ready state from cache
                // BUT only if isActive is NOT provided (i.e., not controlled by parent)
                // When isActive is provided, playback is controlled via effectiveIsVisible
                if (entry.isIntersecting && mediaType === 'video' && isActive === undefined) {
                    try {
                        const cachedReady = videoReadyRef.current.get(mediaUrl || '') ?? false;
                        const preloaded = videoPreloadCache.current.get(mediaUrl || '');
                        if (cachedReady) {
                            setIsVideoReady(true);
                            setIsVideoVisible(true);
                            if (videoRef.current && videoRef.current.paused) {
                                // Ensure autoplay, PREFER sound enabled
                                videoRef.current.muted = false;
                                videoRef.current.play().catch(() => null);
                            }
                        } else if (preloaded && preloaded.readyState >= 2) {
                            // If preloaded has enough data, mark ready and play
                            markVideoReady(mediaUrl || '', preloaded);
                            setIsVideoReady(true);
                            setIsVideoVisible(true);
                            if (videoRef.current) {
                                videoRef.current.muted = false;
                                videoRef.current.play().catch(() => null);
                            }
                        } else {
                            // If not ready, do not forcibly reload; allow preloader to continue
                        }
                    } catch (err) {
                        console.debug('[FeedItem] Intersection handler error', err);
                    }
                }
            },
            { threshold: 0.6 }
        );

        observer.observe(element);

        return () => {
            observer.unobserve(element);
            observer.disconnect();
        };
    }, [mediaType]);

    // Handle auto-advancement and playback
    useEffect(() => {
        if (!hasContributions || !effectiveIsVisible || isCommentsOpen) {
            // Pause video if not visible
            if (videoRef.current) {
                videoRef.current.pause();
            }
            return;
        }

        let timeoutId: NodeJS.Timeout | undefined;

        const handleNext = () => {
            setCurrentIndex((prev) => (prev + 1) % displayOrderedContributions.length);
        };

        if (mediaType !== 'video') {
            // Auto-advance images after 5 seconds
            timeoutId = setTimeout(handleNext, NON_VIDEO_AUTO_ADVANCE_MS);
        }

        // For video, we rely on onEnded event, but we need to make sure it plays
        if (mediaType === 'video' && videoRef.current && isVideoReady) {
            const video = videoRef.current;

            // Ensure video is ready before attempting to play
            if (video.readyState < 2) {
                return; // Wait for more data
            }

            // Try to play with sound first
            video.muted = false;
            video.volume = 1.0;

            const playPromise = video.play();

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {

                    })
                    .catch(e => {

                        // If autoplay with sound is blocked, play muted and wait for user interaction
                        video.muted = true;
                        video.play().then(() => {

                            // Automatically unmute on any interaction with the page
                            const unmute = () => {
                                if (video.muted) {
                                    video.muted = false;
                                    video.volume = 1.0;

                                }
                                document.removeEventListener('touchstart', unmute, { capture: true });
                                document.removeEventListener('click', unmute, { capture: true });
                            };
                            document.addEventListener('touchstart', unmute, { capture: true, once: true });
                            document.addEventListener('click', unmute, { capture: true, once: true });
                        }).catch(() => {
                            setIsVideoVisible(true);
                        });
                    });
            }
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [currentIndex, displayOrderedContributions.length, mediaType, effectiveIsVisible, hasContributions, isCommentsOpen, isVideoReady, mediaUrl]);

    const handleVideoEnded = () => {
        // Efficiently loop single videos without triggering a state update cycle
        if (displayOrderedContributions.length === 1 && videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => null);
            return;
        }

        setCurrentIndex((prev) => {
            if (displayOrderedContributions.length === 0) {
                return 0;
            }
            return (prev + 1) % displayOrderedContributions.length;
        });
    };

    const handleToggleLike = useCallback(async () => {
        if (!currentUser) return;
        await toggleStoryLike(story.id);
    }, [currentUser, story.id, toggleStoryLike]);



    const handleCommentSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmed = commentText.trim();
        if (!trimmed) return;
        // If replying, pass the parent comment ID (flatten to single level)
        const parentId = replyingToId || undefined;
        await addStoryComment(story.id, trimmed, parentId);
        setCommentText("");
        setReplyingToId(null);
    }, [addStoryComment, commentText, story.id, replyingToId]);

    const getAvatarForUser = useCallback((userId: string, fallbackName: string, userAvatar?: string) => {
        // First check if an avatar was provided directly (e.g., from comment data)
        if (userAvatar) return userAvatar;
        // Then check if user is a participant with an avatar
        const participant = participantsMap.get(userId);
        if (participant?.avatar) return participant.avatar;
        // Fall back to dicebear
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fallbackName)}`;
    }, [participantsMap]);

    // Show weeve details modal before forking
    const handleShowWeeveDetails = (participantId: string) => {
        // Initialize with original story values
        setWeeveTitle(story.title);
        setWeeveDescription(story.description || '');
        setPendingParticipantId(participantId);
        setShowParticipantPicker(false);
        setShowFriendPicker(false);
        setShowWeeveDetailsModal(true);
    };

    const handleForkStory = async (participantId: string, customTitle?: string, customDescription?: string) => {
        console.log('[handleForkStory] Called with:', { participantId, customTitle, customDescription, selectedSlots });

        // Prevent multiple clicks
        if (isCreatingWeeve) {
            console.log('[handleForkStory] Already creating weeve, ignoring...');
            return;
        }

        if (selectedSlots.length === 0) {
            console.error("No slots selected");
            alert("Please select at least one slot to replace.");
            setShowWeeveDetailsModal(false);
            setPendingParticipantId(null);
            return;
        }

        setIsCreatingWeeve(true);

        // Convert slot indices to contribution IDs using slotContentMap
        // This ensures we're passing the correct contributions to exclude, not just array indices
        const contributionIdsToReplace = selectedSlots
            .map(slotIndex => slotContentMap.get(slotIndex)?.id)
            .filter((id): id is string => id !== undefined);

        console.log('[handleForkStory] contributionIdsToReplace:', contributionIdsToReplace);

        try {
            console.log('[handleForkStory] Calling forkStory...');
            const result = await forkStory(story.id, selectedSlots, participantId, contributionIdsToReplace, customTitle, customDescription);
            console.log('[handleForkStory] forkStory returned:', result);

            setIsForking(false);
            setSelectedSlots([]);
            setShowParticipantPicker(false);
            setShowFriendPicker(false);
            setShowWeeveDetailsModal(false);
            setPendingParticipantId(null);
            setWeeveTitle('');
            setWeeveDescription('');

            if (result.success && result.storyId) {
                // Check if user selected themselves vs inviting a friend
                if (participantId === currentUser?.id) {
                    // Navigate to the new forked story for immediate contribution
                    console.log('[handleForkStory] Navigating to story:', result.storyId);
                    router.push(`/story/${result.storyId}`);
                } else {
                    // Show success message for friend invitations
                    setTimeout(() => {
                        alert("Friend invited successfully! They can now contribute to this story.");
                    }, 100);
                }
            } else {
                console.log('[handleForkStory] Fork failed:', result.error);
                setTimeout(() => {
                    alert(`Failed to fork story: ${result.error || "Unknown error"}`);
                }, 100);
            }
        } catch (error) {
            console.error("Error in handleForkStory:", error);
            // Close modal on error too
            setShowWeeveDetailsModal(false);
            setPendingParticipantId(null);
            setIsForking(false);
            alert("An error occurred while forking the story.");
        } finally {
            setIsCreatingWeeve(false);
        }
    };

    // Media content swipe navigation handlers
    const handleMediaTouchStart = useCallback((e: React.TouchEvent) => {
        mediaTouchStartX.current = e.touches[0].clientX;
        mediaTouchStartY.current = e.touches[0].clientY;
        mediaTouchEndX.current = e.touches[0].clientX;
        mediaTouchEndY.current = e.touches[0].clientY;
        isMediaSwiping.current = false;
    }, []);

    const handleMediaTouchMove = useCallback((e: React.TouchEvent) => {
        mediaTouchEndX.current = e.touches[0].clientX;
        mediaTouchEndY.current = e.touches[0].clientY;

        // Determine if this is a horizontal swipe (vs vertical scroll)
        const deltaX = Math.abs(mediaTouchEndX.current - mediaTouchStartX.current);
        const deltaY = Math.abs(mediaTouchEndY.current - mediaTouchStartY.current);

        // If horizontal movement is significantly greater than vertical, it's a swipe
        if (deltaX > 30 && deltaX > deltaY * 1.5) {
            isMediaSwiping.current = true;
        }
    }, []);

    const handleMediaTouchEnd = useCallback(() => {
        // Only process if we have multiple contributions to navigate
        if (displayOrderedContributions.length <= 1) {
            return;
        }

        const diffX = mediaTouchStartX.current - mediaTouchEndX.current;
        const diffY = Math.abs(mediaTouchEndY.current - mediaTouchStartY.current);
        const swipeThreshold = 50; // minimum horizontal swipe distance

        // Only process as swipe if it was detected as horizontal swipe
        if (isMediaSwiping.current && Math.abs(diffX) > swipeThreshold && Math.abs(diffX) > diffY) {
            setHasInteracted(true);

            // Pause current video before switching to prevent audio overlap
            if (mediaType === 'video' && videoRef.current) {
                videoRef.current.pause();
            }

            if (diffX > 0) {
                // Swiped left (finger moved right to left) - go to next content
                setCurrentIndex((prev) => {
                    const next = prev + 1;
                    // Don't wrap around - stay at the end if already at last item
                    return next >= displayOrderedContributions.length ? prev : next;
                });
            } else {
                // Swiped right (finger moved left to right) - go to previous content
                setCurrentIndex((prev) => {
                    const next = prev - 1;
                    // Don't wrap around - stay at the beginning if already at first item
                    return next < 0 ? prev : next;
                });
            }
        }

        // Reset swipe state
        isMediaSwiping.current = false;
    }, [displayOrderedContributions.length, mediaType]);

    const handleContainerClick = useCallback((e: React.MouseEvent) => {

        // Unmute video on user interaction
        if (mediaType === 'video' && videoRef.current) {
            const video = videoRef.current;

            if (video.muted) {

                video.muted = false;

                // Ensure video is playing
                if (video.paused) {
                    video.play().catch((e) => {

                    });
                }
                setHasInteracted(true);
            } else {

            }
        }
    }, [mediaType]);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full weeve-snap-item snap-start shrink-0 bg-gray-900 overflow-hidden"
            onClick={handleContainerClick}
            onTouchStart={handleMediaTouchStart}
            onTouchMove={handleMediaTouchMove}
            onTouchEnd={handleMediaTouchEnd}
        >
            {/* Media Background */}
            {waitingForFirstContribution && waitingParticipant?.id !== currentUser?.id ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black text-white">
                    {/* Group Indicator */}
                    {story.groupAvatar && (
                        <div className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full border border-white/20 shadow-lg overflow-hidden bg-gray-800">
                            <img src={story.groupAvatar} alt="Group" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-sm">
                        <div className="relative">
                            <div className="w-[52px] h-[52px] rounded-full border-2 border-[#EC1D99]/70 p-1 animate-pulse">
                                <img
                                    src={waitingParticipant?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(waitingParticipant?.name || 'Storyteller')}`}
                                    alt={waitingParticipant?.name || 'Next creator'}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 bg-[#EC1D99] rounded-full p-0.5">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                            </div>
                        </div>
                        <span className="text-sm font-semibold tracking-wide uppercase text-gray-300">Waiting for</span>
                        <span className="text-lg font-bold text-white">
                            {waitingParticipant?.name?.split(' ')[0] || 'the first stitch'}
                        </span>
                    </div>
                    {story.currentTurnUserId === currentUser?.id && (
                        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                            <img src="/weeve-logo.png" alt="Your Turn" className="w-6 h-6 animate-glow-pulse drop-shadow-md" />
                            <span className="text-[11px] font-bold text-white bg-[#EC1D99] px-2 py-0.5 rounded-full">Your turn</span>
                        </div>
                    )}
                </div>
            ) : mediaType === 'video' && (mediaUrl || currentVideoSrc) ? (
                <>
                    {/* Black overlay that sits above the video until playback is ready */}
                    <div
                        className="absolute inset-0 bg-black transition-opacity"
                        style={{
                            pointerEvents: 'none',
                            opacity: isPlaying ? 0 : 1,
                            transition: 'opacity 160ms linear',
                            zIndex: 9
                        }}
                    />
                    <video
                        ref={videoRef}
                        src={currentVideoSrc}
                        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='%23000000'/%3E%3C/svg%3E"
                        className="weeve-inline-video absolute inset-0 w-full h-full object-cover"
                        autoPlay
                        playsInline
                        preload="auto"
                        loop={displayOrderedContributions.length === 1}
                        controls={false}
                        controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
                        disablePictureInPicture
                        disableRemotePlayback
                        onEnded={handleVideoEnded}
                        onPlay={(e) => {
                            setIsPlaying(true);

                        }}
                        onPause={() => {
                            setIsPlaying(false);
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            const video = e.currentTarget;

                            video.muted = false;
                            video.volume = 1.0;

                            setHasInteracted(true);
                        }}
                        onLoadedMetadata={(e) => {
                            const video = e.currentTarget;
                            // Set volume to maximum
                            video.volume = 1.0;

                        }}
                        onLoadedData={(e) => {

                            // Manually play the video after it's loaded to avoid browser play button
                            const video = e.currentTarget;
                            if (effectiveIsVisible) {
                                video.play().catch((err) => {

                                });
                            }
                        }}
                        onVolumeChange={(e) => {

                        }}
                        style={{
                            opacity: isVideoVisible ? 1 : 0,
                            // CRITICAL: Use opacity transition for crossfade between primary and buffer
                            visibility: 'visible',
                            transform: 'translate3d(0,0,0)',
                            transition: 'opacity 160ms linear',
                            backgroundColor: '#000000',
                            // Ensure video covers entire area immediately
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            // Force hide any browser-added play buttons
                            WebkitAppearance: 'none',
                            appearance: 'none',
                            backgroundImage: 'none',
                            // Extra safeguard
                            pointerEvents: isVideoVisible ? 'auto' : 'none'
                        }}
                    />
                    <video
                        ref={bufferVideoRef}
                        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='%23000000'/%3E%3C/svg%3E"
                        className="weeve-inline-video absolute inset-0 w-full h-full object-cover pointer-events-none"
                        playsInline
                        preload="auto"
                        controls={false}
                        autoPlay
                        style={{
                            opacity: isBufferVisible ? 1 : 0,
                            visibility: 'visible',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            backgroundColor: '#000000'
                        }}
                    />
                </>
            ) : mediaType === 'drawing' && mediaUrl ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <img
                        key={mediaUrl}
                        src={mediaUrl}
                        alt={story.title}
                        className="w-full h-auto max-h-full object-contain"
                    />
                </div>
            ) : mediaType === 'image' && mediaUrl ? (
                <img
                    key={mediaUrl}
                    src={mediaUrl}
                    alt={story.title}
                    className="absolute inset-0 w-full h-full object-cover"
                />
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black text-white p-6 text-center">
                    <p className="text-2xl font-semibold leading-snug max-w-xl line-clamp-6">
                        {currentContribution?.content || story.description || story.title}
                    </p>
                </div>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90 pointer-events-none" />


            {/* Top Overlay - Weeve Context */}
            {story.forkedFromStoryId && (
                <div className="absolute top-0 left-0 right-0 z-20 flex justify-center pt-[calc(env(safe-area-inset-top)+3.5rem)] pointer-events-none">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/story/${story.forkedFromStoryId}`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full text-xs text-gray-200 hover:bg-black/60 hover:text-white transition-all border border-white/10 pointer-events-auto shadow-lg"
                    >
                        <GitBranch className="w-3 h-3 text-[#EC1D99]" />
                        <span className="opacity-80">Weeve of</span>
                        <span className="font-bold text-white max-w-[150px] truncate">
                            {originalStoryTitle || 'Original'}
                        </span>
                    </button>
                </div>
            )}

            {/* Right Sidebar Actions - Vertically Aligned */}
            <div className="absolute right-4 bottom-4 flex flex-col items-center gap-4 text-white z-20">
                {/* Like Button */}
                <div className="flex flex-col items-center gap-1">
                    <button
                        type="button"
                        onClick={handleToggleLike}
                        className={`w-10 h-10 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center border border-white/20 transition-colors ${isLiked ? "text-[#EC1D99]" : "text-white"}`}
                        aria-label={isLiked ? "Unlike story" : "Like story"}
                    >
                        <Heart className="w-6 h-6" fill={isLiked ? "currentColor" : "transparent"} />
                    </button>
                    <span className="text-xs font-bold">{likeCount.toLocaleString()}</span>
                </div>

                {/* Comment Button */}
                {story.allowComments !== false && (
                    <div className="flex flex-col items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setIsCommentsOpen(true)}
                            className={`w-10 h-10 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center border border-white/20 transition-colors ${isCommentsOpen ? "text-[#EC1D99]" : "text-white"}`}
                            aria-label="Open comments"
                        >
                            <MessageCircle className="w-6 h-6" />
                        </button>
                        <span className="text-xs font-bold">{comments.length}</span>
                    </div>
                )}



                {/* Save Button */}
                <div className="flex flex-col items-center gap-1">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleStorySave(story.id);
                        }}
                        className={`w-10 h-10 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center border border-white/20 transition-colors ${savedStoryIds.includes(story.id) ? "text-[#EC1D99]" : "text-white"}`}
                        aria-label="Save story"
                    >
                        <Bookmark className="w-6 h-6" fill={savedStoryIds.includes(story.id) ? "currentColor" : "none"} />
                    </button>
                    <span className="text-xs font-bold">Save</span>
                </div>

                {/* Share Button */}
                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsShareModalOpen(true);
                        }}
                        className="w-10 h-10 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center border border-white/20 transition-colors text-white hover:scale-110 active:scale-95"
                        aria-label="Share"
                    >
                        <Share2 className="w-5 h-5" />
                    </button>
                    <span className="text-xs font-bold font-poppins drop-shadow-md">Share</span>
                </div>

                {/* Weeve Button */}
                {/* Only show fork button for:
                    - Private storiesyou're part of
                    - Public 'invite' mode stories (traditional private-style stories that are public)
                    - NOT for public 'open' mode stories (these allow direct contribution to open slots)
                    - NOT for Canon/Seed posts (these have their own fork UI)
                */}
                {(story.visibility === 'public' || (story.visibility === 'private' && isParticipant))
                    && !['canon', 'seed'].includes(story.postType || '')
                    && (story.mode !== 'open' || (story.contributions?.length || 0) >= (story.maxWeeves || 3)) // Hide fork button for open mode stories UNLESS they are full/complete
                    && (!story.monetizationCost || story.monetizationCost <= 0 || true)
                    && (
                        <div className="flex flex-col items-center gap-0.5 relative">
                            <button
                                type="button"
                                onClick={() => {
                                    if (story.monetizationCost && story.monetizationCost > 0) {
                                        if (currentUser?.preferences?.monetization_enabled === false) {
                                            setShowMonetizationModal('enable_required');
                                        } else if ((currentUser?.tokens || 0) < story.monetizationCost) {
                                            setShowMonetizationModal('insufficient');
                                        } else {
                                            setShowMonetizationModal('confirm');
                                        }
                                    } else {

                                        setIsForking(!isForking);
                                        if (showTutorialTooltip) {
                                            handleTooltipDismiss();
                                        }
                                    }
                                }}
                                className={`w-10 h-10 rounded-full flex items-center justify-center border border-white/20 transition-all ${showTutorialTooltip
                                    ? "bg-[#EC1D99] text-white scale-110 animate-pulse ring-4 ring-[#EC1D99]/50"
                                    : isForking
                                        ? "bg-[#EC1D99] text-white scale-110"
                                        : "bg-gray-800/50 backdrop-blur-sm text-[#EC1D99]"
                                    }`}
                                aria-label="Fork story"
                            >
                                <span className="font-black text-lg">W</span>
                            </button>
                            <span className={`text-xs font-bold ${showTutorialTooltip ? 'text-[#EC1D99]' : ''}`}>
                                {story.monetizationCost && story.monetizationCost > 0
                                    ? `💎 ${story.monetizationCost}`
                                    : 'Weeve'
                                }
                            </span>

                            {/* Tutorial Tooltip */}
                            {showTutorialTooltip && (
                                <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 w-64 animate-in fade-in slide-in-from-right-5 duration-300">
                                    <div className="bg-[#EC1D99] text-white p-4 rounded-2xl shadow-2xl relative">
                                        <button
                                            type="button"
                                            onClick={handleTooltipDismiss}
                                            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                                        >
                                            <span className="text-xs">✕</span>
                                        </button>
                                        <div className="mb-2">
                                            <span className="text-2xl">👆</span>
                                        </div>
                                        <h4 className="font-bold text-lg mb-1">Click Here!</h4>
                                        <p className="text-sm text-white/90 leading-snug">
                                            Tap the <strong>Weeve button</strong> to add your parts to the story.
                                        </p>
                                        {/* Arrow pointing to button */}
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full">
                                            <div className="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-[#EC1D99]"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                {/* Weeve Button for Public Open Mode Stories */}
                {story.visibility === 'public'
                    && story.mode === 'open'
                    && !['canon', 'seed'].includes(story.postType || '')
                    && (story.contributions?.length || 0) < (story.maxWeeves || 3) // Has available slots
                    && (
                        <div className="flex flex-col items-center gap-0.5">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Store the source story ID so we can return to it
                                    if (typeof window !== 'undefined') {
                                        sessionStorage.setItem('weeve_return_to_story', story.id);
                                    }
                                    router.push(`/story/${story.id}`);
                                }}
                                className="w-10 h-10 rounded-full bg-[#EC1D99] flex items-center justify-center border border-white/20 text-white shadow-lg shadow-[#EC1D99]/30 hover:scale-110 transition-transform"
                                aria-label="Add to story"
                            >
                                <span className="font-black text-lg">W</span>
                            </button>
                            <span className="text-xs font-bold text-[#EC1D99]">Weeve</span>
                        </div>
                    )}

                {/* Weeve Button for Brand/Seed posts */}
                {['canon', 'seed'].includes(story.postType || '') && (() => {
                    const isCreator = currentUser?.id === story.creatorId;
                    // Show Weeve button for all non-creators viewing Canon/Seed posts
                    // This allows users to create their own version even when viewing someone else's fork
                    const canWeeve = !isCreator && currentUser;

                    return canWeeve ? (
                        <div className="flex flex-col items-center gap-0.5 relative">
                            <button
                                type="button"
                                disabled={isForkingBrandPost}
                                onClick={async () => {
                                    if (isForkingBrandPost) return;
                                    setIsForkingBrandPost(true);
                                    try {
                                        // If viewing a fork, fork from the ORIGINAL Canon
                                        // If viewing original, fork from this story
                                        const originalCanonId = story.forkedFromStoryId || story.id;
                                        const result = await forkBrandPost(originalCanonId);
                                        if (result.success && result.storyId) {
                                            // Navigate to the user's fork
                                            router.push(`/story/${result.storyId}`);
                                        } else {
                                            console.error('[FeedItem] Failed to fork brand post:', result.error);
                                            alert(result.error || 'Failed to create your version. Please try again.');
                                        }
                                    } catch (err) {
                                        console.error('[FeedItem] Error forking brand post:', err);
                                        alert('An error occurred. Please try again.');
                                    } finally {
                                        setIsForkingBrandPost(false);
                                    }
                                }}
                                className={`w-10 h-10 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center border border-[#EC1D99] text-[#EC1D99] transition-all hover:bg-[#EC1D99] hover:text-white hover:scale-110 active:scale-95 ${isForkingBrandPost ? 'opacity-50 cursor-not-allowed' : ''}`}
                                aria-label="Weeve to brand story"
                            >
                                {isForkingBrandPost ? (
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <span className="font-black text-lg">W</span>
                                )}
                            </button>
                            <span className="text-xs font-bold text-[#EC1D99]">Weeve</span>
                        </div>
                    ) : null;
                })()}
            </div>

            {/* Monetization Modal */}
            {showMonetizationModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-in fade-in duration-200">
                    <div className="bg-[#1a1a2e] border border-white/10 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        {showMonetizationModal === 'confirm' ? (
                            <>
                                <div className="w-16 h-16 rounded-full bg-[#EC1D99]/20 flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">💎</span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Contribute to this Story</h3>
                                <p className="text-gray-300 mb-4 text-sm">
                                    Support the creator and add your own twist!
                                </p>
                                <div className="bg-[#EC1D99]/10 border border-[#EC1D99]/20 rounded-xl p-4 mb-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-gray-300">Entry Fee</span>
                                        <span className="text-xl font-bold text-[#EC1D99]">{story.monetizationCost} tokens</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm text-gray-400">≈ ${((story.monetizationCost || 0) * 0.10).toFixed(2)} USD</span>
                                    </div>
                                </div>
                                {/* Fee breakdown */}
                                <div className="bg-black/20 rounded-xl p-3 mb-3 text-xs text-gray-400 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span>Creator receives (70%)</span>
                                        <span className="text-green-400 font-semibold">{((story.monetizationCost || 0) * 0.7).toFixed(1)} tokens</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Platform fee (30%)</span>
                                        <span className="text-gray-500">{((story.monetizationCost || 0) * 0.3).toFixed(1)} tokens</span>
                                    </div>
                                </div>
                                <div className="bg-black/30 rounded-xl p-4 mb-6 flex items-center justify-between">
                                    <span className="text-sm text-gray-400">Your Balance</span>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-white">{currentUser?.tokens || 0} tokens</div>
                                        <div className="text-xs text-gray-500">After: {(currentUser?.tokens || 0) - (story.monetizationCost || 0)} tokens</div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowMonetizationModal(null)}
                                        className="flex-1 py-3 px-4 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (story.monetizationCost && deductTokens(story.monetizationCost, story.creatorId)) {
                                                setShowMonetizationModal(null);
                                                setIsForking(true);
                                                if (showTutorialTooltip) {
                                                    handleTooltipDismiss();
                                                }
                                            }
                                        }}
                                        className="flex-1 py-3 px-4 rounded-xl bg-[#EC1D99] text-white font-semibold hover:bg-[#d61a88] transition-colors shadow-lg shadow-[#EC1D99]/20"
                                    >
                                        Pay {story.monetizationCost} Tokens & Weeve
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">💎</span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Get More Tokens</h3>
                                <p className="text-gray-300 mb-4 text-sm">
                                    You need a few more tokens to contribute to this story.
                                </p>
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-gray-300">Required</span>
                                        <span className="text-xl font-bold text-red-400">{story.monetizationCost} tokens</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm text-gray-400">${((story.monetizationCost || 0) * 0.10).toFixed(2)} USD</span>
                                    </div>
                                </div>
                                <div className="bg-black/30 rounded-xl p-4 mb-6 flex items-center justify-between">
                                    <span className="text-sm text-gray-400">Your Balance</span>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-white">{currentUser?.tokens || 0} tokens</div>
                                        <div className="text-xs text-gray-400">${((currentUser?.tokens || 0) * 0.10).toFixed(2)}</div>
                                    </div>
                                </div>
                                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-300">You need</span>
                                        <span className="text-lg font-bold text-green-400">
                                            {(story.monetizationCost || 0) - (currentUser?.tokens || 0)} more tokens
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowMonetizationModal(null)}
                                        className="flex-1 py-3 px-4 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <Link
                                        href="/wallet"
                                        className="flex-1 py-3 px-4 rounded-xl bg-[#EC1D99] text-white font-semibold hover:bg-[#d61a88] transition-colors flex items-center justify-center"
                                    >
                                        Get Tokens
                                    </Link>
                                </div>
                            </>
                        )}

                        {showMonetizationModal === 'enable_required' && (
                            <>
                                <div className="w-16 h-16 rounded-full bg-[#EC1D99]/20 flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">⚙️</span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Enable Monetization</h3>
                                <p className="text-gray-300 mb-6 text-sm">
                                    This story requires a token contribution. Please enable monetization features in your settings to proceed.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowMonetizationModal(null)}
                                        className="flex-1 py-3 px-4 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <Link
                                        href="/settings"
                                        className="flex-1 py-3 px-4 rounded-xl bg-[#EC1D99] text-white font-semibold hover:bg-[#d61a88] transition-colors flex items-center justify-center"
                                    >
                                        Go to Settings
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )
            }
            <div className="absolute bottom-0 left-0 right-0 p-6 pb-6 text-white z-10">
                <h2 className="text-xl font-bold mb-1 font-poppins shadow-black drop-shadow-md flex items-center gap-2 flex-wrap">
                    {/* Clickable title for brand posts with product URLs */}
                    {story.productUrl ? (
                        <a
                            href={story.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 hover:text-[#EC1D99] transition-colors underline decoration-[#EC1D99]/50 underline-offset-2"
                        >
                            {story.title}
                            <ExternalLink className="w-4 h-4 flex-shrink-0" />
                        </a>
                    ) : (
                        story.title
                    )}
                    {/* Canon/Seed badge for brand posts */}
                    {story.postType === 'canon' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/30 text-purple-300 rounded-full text-xs font-medium" title="Canon Post - Some slots are immutable">
                            🎬 Canon
                        </span>
                    )}
                    {story.postType === 'seed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/30 text-green-300 rounded-full text-xs font-medium" title="Seed Post - First slot is immutable">
                            🌱 Seed
                        </span>
                    )}
                    {/* Monetization badge for paid stories */}
                    {story.monetizationCost && story.monetizationCost > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded-full text-xs font-medium border border-yellow-500/30" title={`Entry fee: ${story.monetizationCost} ${story.monetizationCost === 1 ? 'token' : 'tokens'}`}>
                            💎 {story.monetizationCost} {story.monetizationCost === 1 ? 'token' : 'tokens'}
                        </span>
                    )}
                </h2>



                {story.description && (
                    <div className="mb-2 max-w-[85%]">
                        <p className={`text-sm text-gray-200 ${isDescriptionExpanded ? '' : 'line-clamp-1'}`}>
                            {story.description}
                        </p>
                        {story.description.length > 50 && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDescriptionExpanded(!isDescriptionExpanded);
                                }}
                                className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-white transition-colors mt-1"
                            >
                                <span>{isDescriptionExpanded ? 'Show less' : 'Show more'}</span>
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDescriptionExpanded ? 'rotate-180' : ''}`} />
                            </button>
                        )}
                    </div>
                )}

                {/* Timestamp */}
                {story.created_at && (
                    <span className="text-xs text-gray-400 mb-4 block">
                        {formatRelativeTime(new Date(story.created_at).getTime())}
                    </span>
                )}


                <div className="flex items-center mb-3 w-fit">
                    {/* Stacked/Collapsed Avatar Display - shows current + context avatars with expand option */}
                    <div className="relative">
                        {/* Collapsed View */}
                        {!isAvatarsExpanded ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Expand if we have more than 1 contribution slot
                                    if (effectiveOrderedContributions.length > 1) {
                                        setIsAvatarsExpanded(true);
                                    }
                                }}
                                className="flex items-center gap-0 pl-2 py-1 group"
                            >
                                {(() => {
                                    // Build unified slots array (Contributions + Assigned + Open)
                                    const totalSlots = story.maxWeeves || 3;
                                    const slots: Array<{
                                        type: 'contribution' | 'assigned' | 'open';
                                        data?: any;
                                        id: string;
                                        index: number;
                                    }> = [];

                                    for (let i = 0; i < totalSlots; i++) {
                                        // CRITICAL FIX: Use slotContentMap to find contribution at this SPECIFIC slot index
                                        // Do not use effectiveOrderedContributions[i] because that array is dense (has no gaps)
                                        // so a contribution at slot 2 would wrongly show up at slot 1 if slot 1 was empty.
                                        const contribution = slotContentMap.get(i);

                                        if (contribution) {
                                            slots.push({ type: 'contribution', data: contribution, id: `c-${i}`, index: i });
                                        } else {
                                            const participant = story.participants.find(p => p.position === i);
                                            if (participant) {
                                                slots.push({ type: 'assigned', data: participant, id: `a-${i}`, index: i });
                                            } else {
                                                slots.push({ type: 'open', id: `o-${i}`, index: i });
                                            }
                                        }
                                    }
                                    const total = slots.length;

                                    // CRITICAL FIX: Find the actual slot index of the current contribution for highlighting
                                    // currentIndex is the index in the contributions array, which doesn't match slot index if there are gaps.
                                    const activeSlotIndex = currentContribution
                                        ? slots.findIndex(s => s.type === 'contribution' && s.data.id === currentContribution.id)
                                        : -1;

                                    // Fallback to currentIndex if not found (though it should be found if playing)
                                    // or 0 if nothing playing
                                    const pivot = activeSlotIndex >= 0 ? activeSlotIndex : 0;

                                    // Determine which avatars to show:
                                    // Show ALL avatars (no truncation) as requested by user
                                    const visibleIndices: number[] = [];
                                    for (let i = 0; i < total; i++) visibleIndices.push(i);

                                    const hiddenCount = 0;

                                    return (
                                        <>
                                            {visibleIndices.map((idx, displayIdx) => {
                                                const slot = slots[idx];
                                                const isActive = idx === activeSlotIndex;

                                                if (slot.type === 'contribution') {
                                                    const contribution = slot.data;
                                                    const p = participantsMap.get(contribution.userId);
                                                    const avatarUrl = p?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(contribution.userName || 'Unknown')}`;
                                                    const name = p?.name || contribution.userName || 'Unknown';

                                                    return (
                                                        <Link
                                                            key={slot.id}
                                                            href={`/profile/${contribution.userId}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            title={`${idx + 1}. ${name}${isActive ? ' (playing)' : ''}`}
                                                            className={`relative rounded-full flex-none transition-all duration-300 ${displayIdx !== 0 ? '-ml-3' : ''} ${isActive
                                                                ? 'z-20 scale-110 opacity-100'
                                                                : 'z-10 opacity-70 group-hover:opacity-90'
                                                                }`}
                                                        >
                                                            <img
                                                                src={avatarUrl}
                                                                alt={name}
                                                                className={`w-9 h-9 min-w-[36px] aspect-square object-cover block rounded-full border-2 flex-shrink-0 transition-all duration-300 ${isActive
                                                                    ? 'border-[#EC1D99] shadow-[0_0_10px_#EC1D99]'
                                                                    : 'border-black/80'
                                                                    }`}
                                                            />
                                                            {isActive && (
                                                                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#EC1D99] rounded-full animate-pulse" />
                                                            )}
                                                        </Link>
                                                    );
                                                } else if (slot.type === 'assigned') {
                                                    const p = slot.data;
                                                    return (
                                                        <Link
                                                            key={slot.id}
                                                            href={`/profile/${p.id}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            title={`${idx + 1}. Waiting for ${p.name}`}
                                                            className={`relative rounded-full flex-none transition-all duration-300 ${displayIdx !== 0 ? '-ml-3' : ''} z-10 opacity-70 group-hover:opacity-90 grayscale`}
                                                        >
                                                            <img
                                                                src={p.avatar}
                                                                alt={p.name}
                                                                className="w-9 h-9 min-w-[36px] aspect-square object-cover block rounded-full border-2 border-dashed border-gray-400 flex-shrink-0"
                                                            />
                                                        </Link>
                                                    );
                                                } else {
                                                    // Open Slot
                                                    return (
                                                        <div
                                                            key={slot.id}
                                                            className={`relative flex-none transition-all duration-300 ${displayIdx !== 0 ? '-ml-3' : ''} z-5`}
                                                            title="Open slot"
                                                        >
                                                            <div className="w-9 h-9 min-w-[36px] flex items-center justify-center rounded-full border-2 border-dashed border-[#EC1D99] bg-[#EC1D99]/10 text-[#EC1D99] text-sm font-bold backdrop-blur-sm">
                                                                +
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            })}

                                            {/* +X More Badge */}
                                            {hiddenCount > 0 && (
                                                <div
                                                    className="-ml-2 z-30 flex items-center justify-center w-9 h-9 rounded-full bg-gray-800/90 border-2 border-gray-600 text-white text-[10px] font-bold backdrop-blur-sm group-hover:bg-gray-700 group-hover:border-[#EC1D99]/50 transition-all"
                                                    title={`${hiddenCount} more slot${hiddenCount > 1 ? 's' : ''}`}
                                                >
                                                    +{hiddenCount}
                                                </div>
                                            )}


                                        </>
                                    );
                                })()}
                            </button>
                        ) : (
                            /* Expanded View - All participants visible */
                            <div className="flex items-center gap-0 pl-2 py-1 animate-in slide-in-from-left-2 duration-300">
                                {(() => {
                                    // Build unified slots array (Contributions + Assigned + Open)
                                    const totalSlots = story.maxWeeves || 3;
                                    const slots: Array<{
                                        type: 'contribution' | 'assigned' | 'open';
                                        data?: any;
                                        id: string;
                                        index: number;
                                    }> = [];

                                    for (let i = 0; i < totalSlots; i++) {
                                        // CRITICAL FIX: Use slotContentMap for accurate slot mapping
                                        const contribution = slotContentMap.get(i);

                                        if (contribution) {
                                            slots.push({ type: 'contribution', data: contribution, id: `c-${i}`, index: i });
                                        } else {
                                            const participant = story.participants.find(p => p.position === i);
                                            if (participant) {
                                                slots.push({ type: 'assigned', data: participant, id: `a-${i}`, index: i });
                                            } else {
                                                slots.push({ type: 'open', id: `o-${i}`, index: i });
                                            }
                                        }
                                    }

                                    // CRITICAL FIX: Find active slot index for highlighting
                                    const activeSlotIndex = currentContribution
                                        ? slots.findIndex(s => s.type === 'contribution' && s.data.id === currentContribution.id)
                                        : -1;

                                    return slots.map((slot, idx) => {
                                        const isActive = idx === activeSlotIndex;

                                        if (slot.type === 'contribution') {
                                            const contribution = slot.data;
                                            const p = participantsMap.get(contribution.userId);
                                            const avatarUrl = p?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(contribution.userName || 'Unknown')}`;
                                            const name = p?.name || contribution.userName || 'Unknown';

                                            return (
                                                <Link
                                                    key={slot.id}
                                                    href={`/profile/${contribution.userId}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    title={`${idx + 1}. ${name}${isActive ? ' (playing)' : ''}`}
                                                    className={`relative rounded-full flex-none transition-all duration-300 ${idx !== 0 ? '-ml-3' : ''} ${isActive
                                                        ? 'z-20 scale-110 opacity-100'
                                                        : 'z-10 opacity-70 hover:opacity-100'
                                                        }`}
                                                >
                                                    <img
                                                        src={avatarUrl}
                                                        alt={name}
                                                        className={`w-8 h-8 min-w-[32px] aspect-square object-cover block rounded-full border-2 flex-shrink-0 transition-all duration-300 ${isActive
                                                            ? 'border-[#EC1D99] shadow-[0_0_8px_#EC1D99]'
                                                            : 'border-black/80'
                                                            }`}
                                                    />
                                                    {isActive && (
                                                        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#EC1D99] rounded-full animate-pulse" />
                                                    )}
                                                </Link>
                                            );
                                        } else if (slot.type === 'assigned') {
                                            const p = slot.data;
                                            return (
                                                <Link
                                                    key={slot.id}
                                                    href={`/profile/${p.id}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    title={`${idx + 1}. Waiting for ${p.name}`}
                                                    className={`relative rounded-full flex-none transition-all duration-300 ${idx !== 0 ? '-ml-3' : ''} z-10 opacity-70 group-hover:opacity-90 grayscale`}
                                                >
                                                    <img
                                                        src={p.avatar}
                                                        alt={p.name}
                                                        className="w-8 h-8 min-w-[32px] aspect-square object-cover block rounded-full border-2 border-dashed border-gray-400 flex-shrink-0"
                                                    />
                                                </Link>
                                            );
                                        } else {
                                            // Open Slot
                                            return (
                                                <div
                                                    key={slot.id}
                                                    className={`relative flex-none transition-all duration-300 ${idx !== 0 ? '-ml-3' : ''} z-5`}
                                                    title="Open slot"
                                                >
                                                    <div className="w-8 h-8 min-w-[32px] flex items-center justify-center rounded-full border-2 border-dashed border-[#EC1D99] bg-[#EC1D99]/10 text-[#EC1D99] text-xs font-bold backdrop-blur-sm">
                                                        +
                                                    </div>
                                                </div>
                                            );
                                        }
                                    });
                                })()}

                                {/* Collapse button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsAvatarsExpanded(false);
                                    }}
                                    className="-ml-1 z-30 flex items-center justify-center w-7 h-7 rounded-full bg-gray-800/80 border border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700 transition-all"
                                    title="Collapse"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {story.hashtags && story.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {story.hashtags.map((tag, index) => (
                            <span key={index} className="text-xs font-medium text-[#EC1D99] drop-shadow-md">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Comments Modal - rendered via portal to bypass parent overflow-hidden */}
            {isCommentsOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[100] flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCommentsOpen(false)} />
                    <div className="relative bg-black/90 text-white rounded-t-3xl p-6 pb-8 max-h-[50%] flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">
                                Comments <span className="text-gray-400 text-sm font-normal ml-1">({story.comments.length})</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsCommentsOpen(false)}
                                aria-label="Close comments"
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div
                            className="max-h-48 overflow-y-auto pr-2 space-y-4"
                            style={{ touchAction: 'auto', WebkitOverflowScrolling: 'touch' }}
                        >
                            {organizedComments.length === 0 ? (
                                <p className="text-sm text-gray-400">Be the first to start the conversation.</p>
                            ) : (
                                organizedComments.map((comment) => {
                                    const avatar = getAvatarForUser(comment.userId, comment.userName, comment.userAvatar);
                                    return (
                                        <div key={comment.id} className="space-y-3">
                                            {/* Parent comment */}
                                            <div className="flex items-start gap-3">
                                                <img src={avatar} alt={comment.userName} className="w-9 h-9 rounded-full border border-white/10 object-cover" />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-sm font-semibold text-white">{comment.userName}</span>
                                                        {(() => {
                                                            const participant = story.participants.find(p => p.id === comment.userId);
                                                            return participant && (
                                                                <VerificationBadge
                                                                    isVerified={participant.isVerified || false}
                                                                    tier={participant.verificationTier}
                                                                    size="sm"
                                                                />
                                                            );
                                                        })()}
                                                        <span className="text-xs text-gray-400">{formatRelativeTime(comment.timestamp)}</span>
                                                    </div>
                                                    <div className="flex items-start justify-between gap-2 mt-1">
                                                        <p className="text-sm text-gray-200 flex-1">{comment.content}</p>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleCommentLike(story.id, comment.id)}
                                                                className={`flex items-center gap-1 text-xs transition-colors ${currentUser && comment.likedBy?.includes(currentUser.id)
                                                                    ? 'text-[#EC1D99]'
                                                                    : 'text-gray-400 hover:text-[#EC1D99]'
                                                                    }`}
                                                            >
                                                                <Heart className={`w-3.5 h-3.5 ${currentUser && comment.likedBy?.includes(currentUser.id) ? 'fill-current' : ''}`} />
                                                                {comment.likes > 0 && <span>{comment.likes}</span>}
                                                            </button>
                                                            {story.allowComments !== false && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setReplyingToId(comment.id);
                                                                        setCommentText('');
                                                                    }}
                                                                    className="text-xs text-gray-400 hover:text-[#EC1D99] transition-colors"
                                                                >
                                                                    Reply
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Replies */}
                                            {comment.replies && comment.replies.length > 0 && (
                                                <div className="ml-11 space-y-3 border-l-2 border-white/20 pl-4 mt-2">
                                                    {comment.replies.map((reply) => {
                                                        const replyAvatar = getAvatarForUser(reply.userId, reply.userName, reply.userAvatar);
                                                        return (
                                                            <div key={reply.id} className="flex items-start gap-3">
                                                                <img src={replyAvatar} alt={reply.userName} className="w-7 h-7 rounded-full border border-white/10 object-cover" />
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-sm font-semibold text-white">{reply.userName}</span>
                                                                        {(() => {
                                                                            const participant = story.participants.find(p => p.id === reply.userId);
                                                                            return participant && (
                                                                                <VerificationBadge
                                                                                    isVerified={participant.isVerified || false}
                                                                                    tier={participant.verificationTier}
                                                                                    size="sm"
                                                                                />
                                                                            );
                                                                        })()}
                                                                        <span className="text-xs text-gray-400">{formatRelativeTime(reply.timestamp)}</span>
                                                                    </div>
                                                                    <div className="flex items-start justify-between gap-2 mt-1">
                                                                        <p className="text-sm text-gray-200 flex-1">{reply.content}</p>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleCommentLike(story.id, reply.id)}
                                                                            className={`flex items-center gap-1 text-xs transition-colors flex-shrink-0 ${currentUser && reply.likedBy?.includes(currentUser.id)
                                                                                ? 'text-[#EC1D99]'
                                                                                : 'text-gray-400 hover:text-[#EC1D99]'
                                                                                }`}
                                                                        >
                                                                            <Heart className={`w-3 h-3 ${currentUser && reply.likedBy?.includes(currentUser.id) ? 'fill-current' : ''}`} />
                                                                            {reply.likes > 0 && <span>{reply.likes}</span>}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        {story.allowComments !== false ? (
                            <form onSubmit={handleCommentSubmit} className="flex flex-col gap-2">
                                {replyingToId && (
                                    <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                                        <span>Replying to {organizedComments.find(c => c.id === replyingToId)?.userName || 'comment'}</span>
                                        <button
                                            type="button"
                                            onClick={() => setReplyingToId(null)}
                                            className="text-gray-500 hover:text-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <input
                                        type="text"
                                        value={commentText}
                                        onChange={(event) => setCommentText(event.target.value)}
                                        placeholder={replyingToId ? "Write a reply..." : "Add a comment..."}
                                        className="flex-1 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#EC1D99]"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!commentText.trim()}
                                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${commentText.trim() ? "bg-[#EC1D99] text-white" : "bg-gray-700 text-gray-400"}`}
                                    >
                                        Send
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="text-center py-3 px-4 bg-gray-800/50 rounded-lg">
                                <p className="text-sm text-gray-400">Comments are disabled for this story</p>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Forking Overlay */}
            {
                isForking && !showParticipantPicker && (
                    <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
                        <div className="absolute top-6 right-6">
                            <button onClick={() => setIsForking(false)} className="p-2 bg-white/10 rounded-full">
                                <X className="w-6 h-6 text-white" />
                            </button>
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-2">Weeve In</h3>
                        <p className="text-gray-300 text-center mb-6 max-w-xs">Swipe through slots and tap to select which parts you want to replace with your own content.</p>

                        {(() => {
                            const maxSlots = story.maxWeeves || 3;
                            const currentIndex = currentSlotIndex;

                            // Touch handling functions
                            const handleTouchStart = (e: React.TouchEvent) => {
                                touchStartX.current = e.touches[0].clientX;
                                touchEndX.current = e.touches[0].clientX; // Initialize to avoid stale values
                            };

                            const handleTouchMove = (e: React.TouchEvent) => {
                                touchEndX.current = e.touches[0].clientX;
                            };

                            const handleTouchEnd = () => {
                                const diff = touchStartX.current - touchEndX.current;
                                const threshold = 50; // minimum swipe distance

                                if (Math.abs(diff) > threshold) {
                                    if (diff > 0) {
                                        // Swiped left - go to next
                                        setCurrentSlotIndex((prev) => (prev < maxSlots - 1 ? prev + 1 : 0));
                                    } else {
                                        // Swiped right - go to previous
                                        setCurrentSlotIndex((prev) => (prev > 0 ? prev - 1 : maxSlots - 1));
                                    }
                                }
                            };

                            return (
                                <div className="w-full max-w-md mx-auto">
                                    {/* Stacked Carousel Container */}
                                    <div
                                        className="relative h-80 mb-6 flex items-center justify-center"
                                        onTouchStart={handleTouchStart}
                                        onTouchMove={handleTouchMove}
                                        onTouchEnd={handleTouchEnd}
                                    >
                                        {Array.from({ length: maxSlots }).map((_, index) => {
                                            // Find participant for this slot by matching position
                                            const p = normalizedParticipants.find(p => p.position === index);
                                            const contribution = slotContentMap.get(index);

                                            // Find the user who made the contribution to show their avatar
                                            const contributor = contribution
                                                ? normalizedParticipants.find(np => np.id === contribution.userId)
                                                : p;

                                            // Calculate position and scale relative to current index
                                            const offset = index - currentIndex;
                                            const isActive = offset === 0;
                                            const isPrev = offset === -1 || (currentIndex === 0 && index === maxSlots - 1);
                                            const isNext = offset === 1 || (currentIndex === maxSlots - 1 && index === 0);

                                            // Check if slot is immutable (locked by brand)
                                            const isLocked = isSlotImmutable(story, index);

                                            // Determine position and styling
                                            let transform = '';
                                            let zIndex = 0;
                                            let opacity = 0;
                                            let scale = 0.7;

                                            if (isActive) {
                                                transform = 'translateX(0)';
                                                zIndex = 30;
                                                opacity = 1;
                                                scale = 1;
                                            } else if (isPrev) {
                                                transform = 'translateX(-60%)';
                                                zIndex = 20;
                                                opacity = 0.5;
                                                scale = 0.75;
                                            } else if (isNext) {
                                                transform = 'translateX(60%)';
                                                zIndex = 20;
                                                opacity = 0.5;
                                                scale = 0.75;
                                            } else {
                                                opacity = 0;
                                                zIndex = 10;
                                            }

                                            return (
                                                <div
                                                    key={`slot-${index}`}
                                                    className="absolute transition-all duration-300 ease-out"
                                                    style={{
                                                        transform: `${transform} scale(${scale})`,
                                                        zIndex,
                                                        opacity,
                                                    }}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();

                                                            if (isActive) {
                                                                // Prevent selection/deselection of locked slots
                                                                if (isLocked) return;

                                                                // Toggle slot selection
                                                                setSelectedSlots(prev => {
                                                                    if (prev.includes(index)) {
                                                                        return prev.filter(s => s !== index);
                                                                    } else {
                                                                        return [...prev, index];
                                                                    }
                                                                });
                                                            } else {
                                                                setCurrentSlotIndex(index);
                                                            }
                                                        }}
                                                        className={`relative group ${isActive ? (isLocked ? 'cursor-default' : 'cursor-pointer') : 'cursor-pointer'}`}
                                                    >
                                                        <div className={`w-64 h-64 rounded-3xl border-2 overflow-hidden transition-all bg-gray-800 relative ${isLocked
                                                            ? 'border-gray-600/50 opacity-90'
                                                            : selectedSlots.includes(index)
                                                                ? 'border-[#EC1D99] border-solid'
                                                                : 'border-dashed border-white/30 hover:border-[#EC1D99]'
                                                            }`}>
                                                            {contribution || p ? (
                                                                contribution ? (
                                                                    <>
                                                                        {contribution.mediaType === 'video' ? (
                                                                            <VideoThumbnail
                                                                                src={contribution.mediaUrl || ''}
                                                                                className="w-full h-full object-cover"
                                                                            />
                                                                        ) : contribution.mediaType === 'image' ? (
                                                                            <img
                                                                                src={contribution.mediaUrl || contributor?.avatar}
                                                                                alt="Slot content"
                                                                                className="w-full h-full object-cover"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center p-4 bg-gray-900">
                                                                                <p className="text-sm text-white text-center line-clamp-6 leading-tight font-medium">
                                                                                    {contribution.content}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                        {/* Avatar Badge */}
                                                                        {contributor && (
                                                                            <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full border-2 border-black overflow-hidden">
                                                                                <img src={contributor.avatar} alt={contributor.name} className="w-full h-full object-cover" />
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <img
                                                                        src={p?.avatar}
                                                                        alt={p?.name}
                                                                        className="w-full h-full object-cover opacity-50"
                                                                    />
                                                                )
                                                            ) : (
                                                                // Empty slot - show prompts for onboarding story
                                                                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
                                                                    {isOnboardingStory ? (
                                                                        <>
                                                                            {index === 0 && (
                                                                                <>
                                                                                    <div className="text-5xl mb-4 animate-pulse">😐</div>
                                                                                    <p className="text-white font-bold text-center text-base leading-snug">
                                                                                        Show us your<br />most serious face
                                                                                    </p>
                                                                                    <p className="text-gray-400 text-xs mt-2">Part 1</p>
                                                                                </>
                                                                            )}
                                                                            {index === 2 && (
                                                                                <>
                                                                                    <div className="text-5xl mb-4 animate-pulse">😊</div>
                                                                                    <p className="text-white font-bold text-center text-base leading-snug">
                                                                                        Show us<br />a smile!
                                                                                    </p>
                                                                                    <p className="text-gray-400 text-xs mt-2">Part 3</p>
                                                                                </>
                                                                            )}
                                                                            {index === 1 && (
                                                                                <>
                                                                                    <UserPlus className="w-12 h-12 text-gray-500 mb-4" />
                                                                                    <p className="text-gray-400 text-xs mt-2">Part 2</p>
                                                                                </>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <UserPlus className="w-12 h-12 text-gray-500" />
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Selection indicator */}
                                                            {selectedSlots.includes(index) && (
                                                                <div className="absolute inset-0 flex items-center justify-center bg-[#EC1D99]/20">
                                                                    <div className="bg-[#EC1D99] rounded-full p-3 shadow-lg">
                                                                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Locked Indicator */}
                                                            {isLocked && (
                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
                                                                    <div className="bg-black/60 rounded-full p-3 backdrop-blur-sm border border-white/20">
                                                                        <Lock className="w-8 h-8 text-white/70" />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Overlay Icon for active slot */}
                                                            {isActive && !selectedSlots.includes(index) && !isLocked && (
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                                                    <div className="bg-[#EC1D99] rounded-full p-3 shadow-lg">
                                                                        <UserPlus className="w-6 h-6 text-white" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {isActive && (
                                                            <span className="text-sm text-gray-300 font-medium mt-3 block">
                                                                {isLocked ? "Fixed Slot (Brand Content)" : `Slot ${index + 1} of ${maxSlots}`}
                                                            </span>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Carousel Indicators */}
                                    <div className="flex justify-center gap-2 mb-6">
                                        {Array.from({ length: maxSlots }).map((_, index) => (
                                            <button
                                                key={`indicator-${index}`}
                                                onClick={() => setCurrentSlotIndex(index)}
                                                className={`w-2 h-2 rounded-full transition-all ${index === currentIndex
                                                    ? 'bg-[#EC1D99] w-6'
                                                    : 'bg-white/30 hover:bg-white/50'
                                                    }`}
                                            />
                                        ))}
                                    </div>

                                    {/* Instructions and Continue Button */}
                                    <div className="px-4 space-y-4">
                                        <p className="text-gray-300 text-sm text-center">
                                            {selectedSlots.length === 0
                                                ? "Tap slots to select which parts you want to add your own content to"
                                                : `${selectedSlots.length} slot${selectedSlots.length === 1 ? '' : 's'} selected`
                                            }
                                        </p>
                                        {selectedSlots.length > 0 && (
                                            <button
                                                onClick={() => setShowParticipantPicker(true)}
                                                className="w-full bg-[#EC1D99] text-white font-bold py-3 rounded-full hover:bg-[#D41C84] transition-colors"
                                            >
                                                Continue
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )
            }

            {/* Participant Picker Modal */}
            {
                showParticipantPicker && (
                    <div className="absolute inset-0 z-40 bg-black/90 flex items-center justify-center p-6 animate-in zoom-in-95 duration-200">
                        <div className="w-full max-w-sm bg-[#1a1a2e] rounded-3xl p-6 border border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white">Who's jumping in?</h3>
                                <button onClick={() => setShowParticipantPicker(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                            <p className="text-gray-400 text-sm mb-6">
                                This will create your own version of the story with {selectedSlots.length} new slot{selectedSlots.length === 1 ? '' : 's'} to fill
                            </p>

                            {!showFriendPicker ? (
                                <div className="space-y-3">
                                    <button
                                        type="button"
                                        onClick={() => currentUser && handleShowWeeveDetails(currentUser.id)}
                                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#EC1D99]/50 transition-all group"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#EC1D99] to-purple-600 p-[2px]">
                                            <img src={currentUser?.avatar} alt="Me" className="w-full h-full rounded-full object-cover border-2 border-black" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-white group-hover:text-[#EC1D99] transition-colors">Me</p>
                                            <p className="text-xs text-gray-400">Add myself to this slot</p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setShowFriendPicker(true)}
                                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#EC1D99]/50 transition-all group"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                                            <Users className="w-6 h-6 text-gray-300" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-white group-hover:text-[#EC1D99] transition-colors">A Friend</p>
                                            <p className="text-xs text-gray-400">Invite a friend to this slot</p>
                                        </div>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <button onClick={() => { setShowFriendPicker(false); setFriendSearchQuery(''); setFriendSearchResults([]); }} className="text-sm text-gray-400 hover:text-white">
                                            &larr; Back
                                        </button>
                                    </div>

                                    {/* Search Input */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={friendSearchQuery}
                                            onChange={(e) => setFriendSearchQuery(e.target.value)}
                                            placeholder="Search by name..."
                                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#EC1D99]/50 focus:ring-1 focus:ring-[#EC1D99]/50 transition-colors"
                                        />
                                        {isSearchingFriends && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <div className="w-4 h-4 border-2 border-[#EC1D99] border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                        {/* Show search results if searching, otherwise show friends */}
                                        {friendSearchQuery.trim().length >= 2 ? (
                                            friendSearchResults.length > 0 ? (
                                                friendSearchResults.map((user) => (
                                                    <button
                                                        key={user.id}
                                                        onClick={() => handleShowWeeveDetails(user.id)}
                                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-colors"
                                                    >
                                                        <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                                                        <span className="font-medium text-white">{user.name}</span>
                                                    </button>
                                                ))
                                            ) : (
                                                !isSearchingFriends && <p className="text-center text-gray-500 py-4">No users found.</p>
                                            )
                                        ) : (
                                            <>
                                                {friends.map((friend) => (
                                                    <button
                                                        key={friend.id}
                                                        onClick={() => handleShowWeeveDetails(friend.id)}
                                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-colors"
                                                    >
                                                        <img src={friend.avatar} alt={friend.name} className="w-10 h-10 rounded-full object-cover" />
                                                        <span className="font-medium text-white">{friend.name}</span>
                                                    </button>
                                                ))}
                                                {friends.length === 0 && (
                                                    <p className="text-center text-gray-500 py-4">No friends yet. Search for users above!</p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Weeve Details Modal */}
            {
                showWeeveDetailsModal && pendingParticipantId && (
                    <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-6 animate-in zoom-in-95 duration-200">
                        <div className="w-full max-w-sm bg-[#1a1a2e] rounded-3xl p-6 border border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white">Customize Your Weeve</h3>
                                <button
                                    onClick={() => {
                                        setShowWeeveDetailsModal(false);
                                        setPendingParticipantId(null);
                                        setIsForking(false);
                                        setSelectedSlots([]);
                                    }}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Title Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                                    <input
                                        type="text"
                                        value={weeveTitle}
                                        onChange={(e) => setWeeveTitle(e.target.value)}
                                        placeholder="Enter a title for your weeve..."
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#EC1D99]/50 focus:ring-1 focus:ring-[#EC1D99]/50 transition-colors"
                                        maxLength={100}
                                    />
                                </div>

                                {/* Description Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Description <span className="text-gray-500">(optional)</span></label>
                                    <textarea
                                        value={weeveDescription}
                                        onChange={(e) => setWeeveDescription(e.target.value)}
                                        placeholder="Add a description..."
                                        rows={3}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#EC1D99]/50 focus:ring-1 focus:ring-[#EC1D99]/50 transition-colors resize-none"
                                        maxLength={500}
                                    />
                                </div>

                                {/* Weeve of indicator preview */}
                                <div className="bg-[#EC1D99]/10 border border-[#EC1D99]/20 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <GitBranch className="w-4 h-4 text-[#EC1D99]" />
                                        <span className="text-gray-400">Weeve of:</span>
                                        <span className="text-[#EC1D99] font-medium truncate">{story.title}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">This link will appear on your weeve</p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        // Skip - use original values
                                        if (pendingParticipantId && !isCreatingWeeve) {
                                            handleForkStory(pendingParticipantId);
                                        }
                                    }}
                                    disabled={isCreatingWeeve}
                                    className={`flex-1 py-3 px-4 rounded-xl text-white font-semibold transition-colors ${isCreatingWeeve ? 'bg-gray-700 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20'}`}
                                >
                                    Skip
                                </button>
                                <button
                                    onClick={() => {
                                        // Use custom values
                                        if (pendingParticipantId && !isCreatingWeeve) {
                                            const trimmedTitle = weeveTitle.trim();
                                            const trimmedDescription = weeveDescription.trim();
                                            handleForkStory(
                                                pendingParticipantId,
                                                trimmedTitle !== story.title ? trimmedTitle : undefined,
                                                trimmedDescription !== (story.description || '') ? trimmedDescription : undefined
                                            );
                                        }
                                    }}
                                    disabled={isCreatingWeeve}
                                    className={`flex-1 py-3 px-4 rounded-xl text-white font-semibold transition-colors ${isCreatingWeeve ? 'bg-gray-500 cursor-not-allowed' : 'bg-[#EC1D99] hover:bg-[#d61a88]'}`}
                                >
                                    {isCreatingWeeve ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Creating...</span>
                                        </div>
                                    ) : (
                                        'Create Weeve'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                isShareModalOpen && (
                    <ShareModal
                        story={story}
                        onClose={() => setIsShareModalOpen(false)}
                    />
                )
            }
        </div >
    );
}
