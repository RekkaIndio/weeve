import { useState, useEffect, useRef, useMemo, FormEvent, useCallback } from "react";
import { Story, useStore, Contribution, isSlotImmutable, isBrandPost, getSlotProgress } from "@/lib/store";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamic import for ShareModal - only loaded when user opens share
const ShareModal = dynamic(() => import("./ShareModal"), {
    ssr: false
});
import FeedItemMedia from "./FeedItem/FeedItemMedia";
import FeedItemOverlay from "./FeedItem/FeedItemOverlay";
import FeedItemSidebar from "./FeedItem/FeedItemSidebar";
import FeedItemFooter from "./FeedItem/FeedItemFooter";
import FeedItemComments from "./FeedItem/FeedItemComments";
import FeedItemForkControl from "./FeedItem/FeedItemForkControl";

// Global caches for video preloading
const GLOBAL_VIDEO_PRELOAD_CACHE: Map<string, HTMLVideoElement> = (globalThis as any).__weeveVideoPreloadCache || new Map();
const GLOBAL_VIDEO_POSTER_CACHE: Map<string, string> = (globalThis as any).__weeveVideoPosterCache || new Map();
const GLOBAL_VIDEO_READY_REF: Map<string, boolean> = (globalThis as any).__weeveVideoReadyRef || new Map();

if (typeof globalThis !== 'undefined') {
    (globalThis as any).__weeveVideoPreloadCache = GLOBAL_VIDEO_PRELOAD_CACHE;
    (globalThis as any).__weeveVideoPosterCache = GLOBAL_VIDEO_POSTER_CACHE;
    (globalThis as any).__weeveVideoReadyRef = GLOBAL_VIDEO_READY_REF;
}

interface FeedItemProps {
    story: Story;
    isActive?: boolean;
    initialContributionId?: string;
    hideOverlay?: boolean;
}

export default function FeedItem({ story, isActive: propIsActive, hideOverlay = false }: FeedItemProps) {
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const bufferVideoRef = useRef<HTMLVideoElement>(null);


    // Store Actions & State
    const currentUser = useStore((state) => state.currentUser);
    const stories = useStore((state) => state.stories);
    const toggleStoryLike = useStore((state) => state.toggleStoryLike);
    const addStoryComment = useStore((state) => state.addStoryComment);
    const deleteStoryComment = useStore((state) => state.deleteStoryComment);
    const toggleCommentLike = useStore((state) => state.toggleCommentLike);
    const savedStoryIds = useStore((state) => state.savedStoryIds);
    const toggleStorySave = useStore((state) => state.toggleStorySave);
    const forkBrandPost = useStore((state) => state.forkBrandPost);

    // Look up original story title for forked stories (weeves)
    const originalStoryTitle = useMemo(() => {
        if (!story.forkedFromStoryId) return null;
        const originalStory = stories.find(s => s.id === story.forkedFromStoryId);
        return originalStory?.title ?? null;
    }, [story.forkedFromStoryId, stories]);

    // Local State
    const [isVisible, setIsVisible] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted] = useState(false); // Default unmuted as requested
    const [hasInteracted, setHasInteracted] = useState(false);
    const lastIndexRef = useRef(currentIndex);

    // Video Playback State
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [currentVideoSrc, setCurrentVideoSrc] = useState<string | undefined>(undefined);
    const [isVideoVisible, setIsVideoVisible] = useState(false);
    const [isBufferVisible, setIsBufferVisible] = useState(false);

    // Forking & UI State
    const [isForking, setIsForking] = useState(false);
    const [isForkingBrandPost, setIsForkingBrandPost] = useState(false);
    const [showMonetizationModal, setShowMonetizationModal] = useState<'confirm' | 'insufficient' | 'enable_required' | null>(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    // Footer State
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [isAvatarsExpanded, setIsAvatarsExpanded] = useState(false);
    const [isFooterCollapsed, setIsFooterCollapsed] = useState(false);

    // Comments State
    const [commentText, setCommentText] = useState("");
    const [replyingToId, setReplyingToId] = useState<string | null>(null);

    // Gestures
    const mediaTouchStartX = useRef<number>(0);
    const mediaTouchStartY = useRef<number>(0);
    const mediaTouchEndX = useRef<number>(0);
    const mediaTouchEndY = useRef<number>(0);
    const isMediaSwiping = useRef(false);

    // Derived State
    const effectiveIsVisible = propIsActive !== undefined ? propIsActive : isVisible;

    // Memoize contributions logic
    const { displayOrderedContributions, hasContributions, effectiveOrderedContributions } = useMemo(() => {
        const slots = story.maxWeeves || 3;
        const contributions = story.contributions || [];

        let ordered = new Array(slots).fill(null);
        let effective: Contribution[] = [];

        // Fill slots logic
        // Fill slots logic
        contributions.forEach(c => {
            let position = -1;

            // Try to get position from timestamp encoding first (primary source of truth for legacy/current data)
            if (c.timestamp >= 1000000 && c.timestamp < 100000000) {
                position = Math.floor(c.timestamp / 1000000) - 1;
            }
            // Fallback to explicit slotIndex if available
            else if (typeof c.slotIndex === 'number' && c.slotIndex >= 0) {
                position = c.slotIndex;
            }

            if (position >= 0 && position < slots) {
                ordered[position] = c;
            }
        });

        // Fallback for linear if no slot info found at all
        // If ordered is empty (all nulls), it means we couldn't map any contributions to slots via timestamp or slotIndex.
        // In this case, we just sort them by timestamp and assume sequential.
        if (ordered.every(x => x === null) && contributions.length > 0) {
            ordered = [...contributions].sort((a, b) => a.timestamp - b.timestamp);
        }

        // Filter out nulls for display
        effective = ordered.filter(Boolean) as Contribution[];

        return {
            displayOrderedContributions: effective,
            hasContributions: effective.length > 0,
            effectiveOrderedContributions: effective
        };
    }, [story.contributions, story.maxWeeves]);

    const currentContribution = useMemo(() => {
        return displayOrderedContributions[currentIndex];
    }, [displayOrderedContributions, currentIndex]);

    const mediaType = currentContribution?.mediaType || 'text';
    const mediaUrl = currentContribution?.mediaUrl;

    // Slot Content Map - passed to children
    // Derives slot positions from timestamp encoding to match useStoryData.ts logic
    const slotContentMap = useMemo(() => {
        const map = new Map<number, Contribution>();
        const slots = story.maxWeeves || 3;
        const contributions = story.contributions || [];

        // Sort contributions by timestamp to get correct order
        const sortedContributions = [...contributions].sort((a, b) => a.timestamp - b.timestamp);

        sortedContributions.forEach((c, sortedIndex) => {
            // Derive position from timestamp encoding (matching useStoryData.ts logic)
            // Timestamp convention: (position + 1) * 1000000
            let position: number;
            if (c.timestamp >= 1000000 && c.timestamp < 100000000) {
                position = Math.floor(c.timestamp / 1000000) - 1;
            } else if (typeof c.slotIndex === 'number' && c.slotIndex >= 0) {
                // Fallback to explicit slotIndex if available
                position = c.slotIndex;
            } else {
                // Last resort: use sorted index
                position = sortedIndex;
            }

            // Only add if within slot range and not already occupied
            if (position >= 0 && position < slots && !map.has(position)) {
                map.set(position, c);
            }
        });

        return map;
    }, [story.contributions, story.maxWeeves]);

    // Participants Map - passed to children
    const participantsMap = useMemo(() => {
        const map = new Map<string, any>();
        story.participants?.forEach(p => map.set(p.id, p));
        return map;
    }, [story.participants]);

    // Handle Video Readiness (Dependencies for Media)
    const videoPreloadCache = useRef(GLOBAL_VIDEO_PRELOAD_CACHE);
    const videoReadyRef = useRef(GLOBAL_VIDEO_READY_REF);

    const markVideoReady = useCallback((url: string, sourceElement?: HTMLVideoElement) => {
        if (!url) return;
        videoReadyRef.current.set(url, true);

        if (url === mediaUrl) {
            setIsVideoReady(true);
            if (sourceElement && videoRef.current && videoRef.current !== sourceElement) {
                // Determine if we need to swap source
            }
        }
    }, [mediaUrl]);

    // --- Video Logic & Effects ---
    // (Preserving key playback logic from original)

    // 1. Intersection Observer
    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(([entry]) => {
            setIsVisible(entry.isIntersecting);
            if (entry.isIntersecting && mediaType === 'video' && videoRef.current) {
                videoRef.current.play().catch(() => { });
            } else if (!entry.isIntersecting && videoRef.current) {
                videoRef.current.pause();
                setIsPlaying(false);
            }
        }, { threshold: 0.6 });

        observer.observe(element);
        return () => observer.disconnect();
    }, [mediaType]);

    // 2. Preload Videos (Optimized: Only adjacent items)
    useEffect(() => {
        if (!effectiveIsVisible) return;

        // Only preload the immediate next video to save bandwidth
        const nextIndex = currentIndex + 1;

        if (nextIndex < displayOrderedContributions.length) {
            const nextContribution = displayOrderedContributions[nextIndex];

            if (nextContribution &&
                nextContribution.mediaType === 'video' &&
                nextContribution.mediaUrl &&
                !videoReadyRef.current.has(nextContribution.mediaUrl)
            ) {
                const url = nextContribution.mediaUrl;
                const v = document.createElement('video');
                v.src = url;
                v.preload = 'auto';
                v.muted = true;
                v.oncanplay = () => videoReadyRef.current.set(url, true);

                // Store in cache to prevent GC and ensure it stays loaded
                if (!videoPreloadCache.current.has(url)) {
                    videoPreloadCache.current.set(url, v);
                }
            }
        }
    }, [effectiveIsVisible, displayOrderedContributions, currentIndex]);

    // 3. Playback Control (The big transition effect)
    useEffect(() => {
        if (mediaType !== 'video') {
            setIsVideoVisible(false);
            setIsBufferVisible(false);
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.src = ""; // Unload
            }
            return;
        }

        if (!mediaUrl) return;

        const handleReady = () => {
            setIsVideoReady(true);
            setIsVideoVisible(true); // Ensure video becomes visible when ready
            if (effectiveIsVisible && !isCommentsOpen && !isForking) {
                videoRef.current?.play().catch(() => { });
            }
        };

        // If switching videos
        const indexChanged = lastIndexRef.current !== currentIndex;
        if (currentVideoSrc !== mediaUrl) {
            setIsVideoReady(false);
            setIsVideoVisible(false); // Fade out old
            setCurrentVideoSrc(mediaUrl);

            if (videoRef.current) {
                videoRef.current.src = mediaUrl;
                videoRef.current.load();

                // Check if ready in cache OR if the element already has enough data (HAVE_CURRENT_DATA = 2)
                if (videoReadyRef.current.get(mediaUrl) || videoRef.current.readyState >= 2) {
                    handleReady(); // Use the common handler
                } else {
                    // Wait for load - use onloadeddata for faster first-frame responsiveness
                    videoRef.current.onloadeddata = handleReady;
                    videoRef.current.oncanplay = handleReady;
                }
            }
        } else {
            // Same video, ensure visible
            if (!isVideoVisible && isVideoReady) {
                setIsVideoVisible(true);
            }
            // Ensure we replay if we cycled back to the same video slot or a new slot with same video
            if (indexChanged && videoRef.current && isVideoReady) {
                videoRef.current.currentTime = 0;
                if (effectiveIsVisible && !isCommentsOpen && !isForking) {
                    videoRef.current.play().catch(() => { });
                }
            }
        }

        lastIndexRef.current = currentIndex;
    }, [mediaType, mediaUrl, effectiveIsVisible, isCommentsOpen, isForking, currentVideoSrc, currentIndex]);

    // 4. Auto Advance (Images/Text)
    useEffect(() => {
        if (mediaType === 'video' || !effectiveIsVisible || isCommentsOpen || isForking) return;

        const duration = mediaType === 'text' ? 5000 : 4000;
        const timer = setTimeout(() => {
            handleVideoEnded(); // Re-use next logic
        }, duration);

        return () => clearTimeout(timer);
    }, [mediaType, effectiveIsVisible, isCommentsOpen, isForking, currentIndex]);

    // Handlers
    const handleVideoEnded = useCallback(() => {
        setCurrentIndex(prev => {
            if (displayOrderedContributions.length <= 1) return 0;
            return (prev + 1) % displayOrderedContributions.length;
        });
    }, [displayOrderedContributions.length]);

    const handleContainerClick = useCallback((e: React.MouseEvent) => {
        if (mediaType === 'video' && videoRef.current) {
            // Since we default to unmuted, this can serve as a "play" trigger if autoplay was blocked
            if (videoRef.current.paused) {
                videoRef.current.play().catch(() => { });
                setHasInteracted(true);
            }
            // User can optionally pause? 
            // For now, let's just assume click is to help it play if stuck, 
            // or maybe we leave it empty if we don't want pause interaction. 
            // Let's implement Play/Pause toggle for better UX.
            else {
                // videoRef.current.pause(); // Standard behavior
            }
        }
    }, [mediaType]);

    const handleToggleLike = async () => {
        await toggleStoryLike(story.id);
    };

    // Gestures
    const handleMediaTouchStart = (e: React.TouchEvent) => {
        mediaTouchStartX.current = e.touches[0].clientX;
        isMediaSwiping.current = false;
    };

    const handleMediaTouchMove = (e: React.TouchEvent) => {
        // ... simple horizontal swipe detection ...
        if (Math.abs(e.touches[0].clientX - mediaTouchStartX.current) > 10) {
            isMediaSwiping.current = true;
        }
    };

    const handleMediaTouchEnd = (e: React.TouchEvent) => {
        const diff = e.changedTouches[0].clientX - mediaTouchStartX.current;
        if (Math.abs(diff) > 50) {
            // Swipe!
            // User requested invert:
            if (diff > 0) { // Right -> Prev
                setCurrentIndex(prev => (prev - 1 + displayOrderedContributions.length) % displayOrderedContributions.length);
            } else { // Left -> Next
                handleVideoEnded();
            }
        }
    };

    // Comments
    const organizedComments = useMemo(() => {
        if (!story.comments) return [];

        // 1. Create a map of all comments with initialized replies array
        const map = new Map();
        story.comments.forEach(c => {
            map.set(c.id, { ...c, replies: [] });
        });

        const roots: any[] = [];

        // 2. Sort by timestamp DESC (Newest first) for the main list iteration
        // This ensures the roots array ends up sorted Newest -> Oldest
        const rawComments = [...story.comments].sort((a, b) => b.timestamp - a.timestamp);

        rawComments.forEach(c => {
            const comment = map.get(c.id);
            if (c.parentCommentId) {
                const parent = map.get(c.parentCommentId);
                if (parent) {
                    parent.replies.push(comment);
                    // Sort replies: Oldest first (ASC) is standard for conversation threads
                    parent.replies.sort((a: any, b: any) => a.timestamp - b.timestamp);
                } else {
                    // Orphaned reply (parent deleted?) - treat as root
                    roots.push(comment);
                }
            } else {
                roots.push(comment);
            }
        });

        return roots;
    }, [story.comments]);

    const handleCommentSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        await addStoryComment(story.id, commentText, replyingToId || undefined);
        setCommentText("");
        setReplyingToId(null);
    };

    // Tutorial Tooltip State (Local to FeedItem usually, simplified)
    const [showTutorialTooltip, setShowTutorialTooltip] = useState(false); // Default false for now

    // Waiting Screen Logic
    const isOnboardingStory = story.title === "Tutorial" || story.id === "onboarding-story";
    const waitingForFirstContribution = !hasContributions && story.participants.length > 0;
    const waitingParticipant = story.participants.find(p => p.position === 0);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full bg-black overflow-hidden snap-start shrink-0"
            onClick={handleContainerClick}
            onTouchStart={handleMediaTouchStart}
            onTouchMove={handleMediaTouchMove}
            onTouchEnd={handleMediaTouchEnd}
        >
            {/* Media Layer */}
            <FeedItemMedia
                mediaType={mediaType}
                mediaUrl={mediaUrl}
                currentVideoSrc={currentVideoSrc}
                isPlaying={isPlaying}
                isVideoVisible={isVideoVisible}
                isBufferVisible={isBufferVisible}
                videoRef={videoRef}
                bufferVideoRef={bufferVideoRef}
                effectiveIsVisible={effectiveIsVisible}
                handleVideoEnded={handleVideoEnded}
                setHasInteracted={setHasInteracted}
                setIsPlaying={setIsPlaying}
                displayOrderedContributions={displayOrderedContributions}
                story={story}
                currentContribution={currentContribution}
                waitingForFirstContribution={waitingForFirstContribution}
                waitingParticipant={waitingParticipant}
                currentUser={currentUser}
                isMuted={isMuted}
            />

            {/* Overlay Layer */}
            {!hideOverlay && (
                <FeedItemOverlay
                    story={story}
                    originalStoryTitle={originalStoryTitle}
                />
            )}

            {/* Controls Layer */}
            {!isForking && (
                <>
                    <FeedItemSidebar
                        story={story}
                        isLiked={currentUser ? story.likedBy?.includes(currentUser.id) : false}
                        likeCount={story.likes}
                        handleToggleLike={handleToggleLike}
                        commentsCount={story.comments?.length || 0}
                        setIsCommentsOpen={setIsCommentsOpen}
                        isSaved={savedStoryIds.includes(story.id)}
                        toggleStorySave={toggleStorySave}
                        setIsShareModalOpen={setIsShareModalOpen}
                        isParticipant={story.participants?.some(p => p.id === currentUser?.id)}
                        isForking={isForking}
                        setIsForking={setIsForking}
                        showTutorialTooltip={showTutorialTooltip}
                        handleTooltipDismiss={() => setShowTutorialTooltip(false)}
                        currentUser={currentUser}
                        setShowMonetizationModal={setShowMonetizationModal}
                        isForkingBrandPost={isForkingBrandPost}
                        setIsForkingBrandPost={setIsForkingBrandPost}
                        forkBrandPost={forkBrandPost}
                    />

                    <FeedItemFooter
                        story={story}
                        isDescriptionExpanded={isDescriptionExpanded}
                        setIsDescriptionExpanded={setIsDescriptionExpanded}
                        isAvatarsExpanded={isAvatarsExpanded}
                        setIsAvatarsExpanded={setIsAvatarsExpanded}
                        isFooterCollapsed={isFooterCollapsed}
                        setIsFooterCollapsed={setIsFooterCollapsed}
                        effectiveOrderedContributions={effectiveOrderedContributions}
                        slotContentMap={slotContentMap}
                        currentContribution={currentContribution}
                        participantsMap={participantsMap}
                    />
                </>
            )}

            {/* Modals & Full Screen Overlays */}
            <FeedItemComments
                isCommentsOpen={isCommentsOpen}
                setIsCommentsOpen={setIsCommentsOpen}
                story={story}
                organizedComments={organizedComments}
                currentUser={currentUser}
                toggleCommentLike={toggleCommentLike}
                replyingToId={replyingToId}
                setReplyingToId={setReplyingToId}
                commentText={commentText}
                setCommentText={setCommentText}
                handleCommentSubmit={handleCommentSubmit}
                participantsMap={participantsMap}
                deleteStoryComment={deleteStoryComment}
            />

            <FeedItemForkControl
                isForking={isForking}
                setIsForking={setIsForking}
                story={story}
                currentUser={currentUser}
                showMonetizationModal={showMonetizationModal}
                setShowMonetizationModal={setShowMonetizationModal}
                slotContentMap={slotContentMap}
                participantsMap={participantsMap}
            />

            {isShareModalOpen && (
                <ShareModal
                    story={story}
                    onClose={() => setIsShareModalOpen(false)}
                />
            )}
        </div>
    );
}
