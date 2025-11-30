"use client";

import { Story, useStore, Contribution } from "@/lib/store";
import { MessageCircle, Heart, Share2, X, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef, useMemo, FormEvent, useCallback } from "react";
import ShareModal from "./ShareModal";

interface FeedItemProps {
    story: Story;
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

export default function FeedItem({ story }: FeedItemProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [commentText, setCommentText] = useState("");
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const videoPreloadCache = useRef<Map<string, HTMLVideoElement>>(new Map());
    const videoPosterCache = useRef<Map<string, string>>(new Map());
    const videoReadyRef = useRef<Map<string, boolean>>(new Map());
    const [videoReadyVersion, setVideoReadyVersion] = useState(0);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [isVideoVisible, setIsVideoVisible] = useState(false);

    const [isForking, setIsForking] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [showParticipantPicker, setShowParticipantPicker] = useState(false);
    const [showFriendPicker, setShowFriendPicker] = useState(false);
    const [currentSlotIndex, setCurrentSlotIndex] = useState(0);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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
            console.debug('Unable to capture video frame for placeholder', error);
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

    // Touch handling refs for swipe gestures
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);

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
    const addStoryComment = useStore((state) => state.addStoryComment);
    const forkStory = useStore((state) => state.forkStory);
    const currentUser = useStore((state) => state.currentUser);
    const friends = useStore((state) => state.friends);
    const fetchFriends = useStore((state) => state.fetchFriends);

    useEffect(() => {
        if (showFriendPicker && friends.length === 0) {
            fetchFriends();
        }
    }, [showFriendPicker, friends.length, fetchFriends]);

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

    const isLiked = useMemo(() => {
        if (!currentUser) return false;
        return likedBy.includes(currentUser.id);
    }, [currentUser, likedBy]);

    const likeCount = useMemo(() => {
        return typeof story.likes === "number" ? story.likes : likedBy.length;
    }, [story.likes, likedBy]);

    const contributionsCount = contributions.length;
    const hasContributions = contributionsCount > 0;
    const safeIndex = hasContributions ? currentIndex % contributionsCount : 0;
    const currentContribution = hasContributions ? contributions[safeIndex] : undefined;
    const mediaUrl = currentContribution?.mediaUrl || story.coverImage;

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
        // This handles cases where a user has multiple contributions but only one participant entry (due to DB unique constraint)
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

    const mediaType: 'video' | 'image' | 'text' = (() => {
        if (!hasContributions) {
            return story.coverImage ? 'image' : 'text';
        }
        if (currentContribution?.mediaType === 'video' && currentContribution.mediaUrl) return 'video';
        if (currentContribution?.mediaType === 'image' && currentContribution.mediaUrl) return 'image';
        return 'text';
    })();
    const mediaPlaceholder = useMemo(() => {
        if (mediaType !== 'video') {
            return null;
        }

        const url = currentContribution?.mediaUrl;
        if (url) {
            const cachedPoster = videoPosterCache.current.get(url);
            if (cachedPoster) {
                return cachedPoster;
            }

            const preloaded = videoPreloadCache.current.get(url);
            if (preloaded && videoReadyRef.current.get(url)) {
                const snapshot = captureFrameFromVideo(preloaded);
                if (snapshot) {
                    videoPosterCache.current.set(url, snapshot);
                    return snapshot;
                }
            }
        }

        if (story.coverImage) {
            return story.coverImage;
        }

        const previousContribution = contributionsCount > 1
            ? contributions[(safeIndex - 1 + contributionsCount) % contributionsCount]
            : undefined;

        if (previousContribution?.mediaType === 'image' && previousContribution.mediaUrl) {
            return previousContribution.mediaUrl;
        }

        return null;
    }, [mediaType, currentContribution, story.coverImage, contributions, contributionsCount, safeIndex, videoReadyVersion, captureFrameFromVideo]);
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

        setIsVideoVisible(false);

        const video = videoRef.current;
        if (!video) {
            return;
        }

        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.preload = 'auto';
    }, [mediaType, mediaUrl]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const cleanupFns: Array<() => void> = [];

        for (const contribution of contributions) {
            const mediaUrl = contribution.mediaUrl;
            if (contribution.mediaType !== 'video' || !mediaUrl) {
                continue;
            }

            if (videoPreloadCache.current.has(mediaUrl)) {
                continue;
            }

            const preloadVideo = document.createElement('video');
            preloadVideo.src = mediaUrl;
            preloadVideo.preload = 'auto';
            preloadVideo.muted = true;
            preloadVideo.playsInline = true;

            const handleReady = () => {
                markVideoReady(mediaUrl, preloadVideo);
                cleanup();
            };

            const handleError = () => {
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

            videoPreloadCache.current.set(mediaUrl, preloadVideo);
            cleanupFns.push(cleanup);
        }

        return () => {
            cleanupFns.forEach((fn) => fn());
        };
    }, [contributions, markVideoReady]);

    useEffect(() => {
        if (mediaType !== 'video' || !mediaUrl) {
            setIsVideoReady(true);
            setIsVideoVisible(false);
            return;
        }

        const cachedReady = videoReadyRef.current.get(mediaUrl) ?? false;
        setIsVideoReady(cachedReady);
        setIsVideoVisible(false);

        const video = videoRef.current;
        if (!video) {
            return;
        }

        const handleReady = () => {
            markVideoReady(mediaUrl, video);
            setIsVideoReady(true);
        };

        const handlePlaying = () => {
            setIsVideoVisible(true);
            markVideoReady(mediaUrl, video);
        };

        const handleWaiting = () => {
            setIsVideoVisible(false);
        };

        video.addEventListener('canplay', handleReady);
        video.addEventListener('canplaythrough', handleReady);
        video.addEventListener('playing', handlePlaying);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('pause', handleWaiting);
        video.addEventListener('ended', handleWaiting);

        return () => {
            video.removeEventListener('canplay', handleReady);
            video.removeEventListener('canplaythrough', handleReady);
            video.removeEventListener('playing', handlePlaying);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('pause', handleWaiting);
            video.removeEventListener('ended', handleWaiting);
        };
    }, [mediaType, mediaUrl, markVideoReady]);

    // Intersection Observer to track visibility
    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
            },
            { threshold: 0.6 }
        );

        observer.observe(element);

        return () => {
            observer.unobserve(element);
            observer.disconnect();
        };
    }, []);

    // Handle auto-advancement and playback
    useEffect(() => {
        if (!hasContributions || !isVisible || isCommentsOpen) {
            // Pause video if not visible
            if (videoRef.current) {
                videoRef.current.pause();
            }
            return;
        }

        let timeoutId: NodeJS.Timeout | undefined;

        const handleNext = () => {
            setCurrentIndex((prev) => (prev + 1) % contributions.length);
        };

        if (mediaType !== 'video') {
            // Auto-advance images after 4 seconds
            timeoutId = setTimeout(handleNext, 4000);
        }

        // For video, we rely on onEnded event, but we need to make sure it plays
        if (mediaType === 'video' && videoRef.current && isVideoReady) {
            videoRef.current.play().catch(e => console.log("Autoplay prevented:", e));
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [currentIndex, contributions.length, mediaType, isVisible, hasContributions, isCommentsOpen, isVideoReady]);

    const handleVideoEnded = () => {
        setCurrentIndex((prev) => {
            if (contributions.length === 0) {
                return 0;
            }
            return (prev + 1) % contributions.length;
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
        await addStoryComment(story.id, trimmed);
        setCommentText("");
    }, [addStoryComment, commentText, story.id]);

    const getAvatarForUser = useCallback((userId: string, fallbackName: string) => {
        const participant = participantsMap.get(userId);
        if (participant?.avatar) return participant.avatar;
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fallbackName)}`;
    }, [participantsMap]);

    const handleForkStory = async (participantId: string) => {
        console.log("handleForkStory called", { participantId, selectedSlot, storyId: story.id });
        if (selectedSlot === null) {
            console.error("No slot selected");
            return;
        }

        try {
            const newStoryId = await forkStory(story.id, selectedSlot, participantId);
            console.log("forkStory result:", newStoryId);

            setIsForking(false);
            setSelectedSlot(null);
            setShowParticipantPicker(false);
            setShowFriendPicker(false);

            if (newStoryId) {
                // Ideally navigate to the new story or show a success message
                // For now, let's just alert (or use a toast if available, but I'll stick to simple interaction)
                alert("Story forked successfully! Check your profile or the feed.");
            } else {
                alert("Failed to fork story. Please try again.");
            }
        } catch (error) {
            console.error("Error in handleForkStory:", error);
            alert("An error occurred while forking the story.");
        }
    };

    return (
        <div ref={containerRef} className="relative w-full h-[calc(100vh-80px)] snap-start shrink-0 bg-gray-900 overflow-hidden">
            {/* Media Background */}
            {waitingForFirstContribution ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black text-white">
                    <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-sm">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full border-2 border-[#EC1D99]/70 p-1 animate-pulse">
                                <img
                                    src={waitingParticipant?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(waitingParticipant?.name || 'Storyteller')}`}
                                    alt={waitingParticipant?.name || 'Next creator'}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-[#EC1D99] rounded-full p-1">
                                <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                            </div>
                        </div>
                        <span className="text-sm font-semibold tracking-wide uppercase text-gray-300">Waiting for</span>
                        <span className="text-lg font-bold text-white">
                            {waitingParticipant?.name?.split(' ')[0] || 'the first stitch'}
                        </span>
                    </div>
                </div>
            ) : mediaType === 'video' && mediaUrl ? (
                <>
                    {!isVideoVisible && (
                        mediaPlaceholder ? (
                            <img
                                src={mediaPlaceholder}
                                alt={story.title}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />
                        )
                    )}
                    <video
                        ref={videoRef}
                        key={mediaUrl} // Force re-render on url change to ensure autoplay works
                        src={mediaUrl}
                        className="weeve-inline-video absolute inset-0 w-full h-full object-cover"
                        autoPlay
                        muted={false}
                        playsInline
                        preload="auto"
                        controls={false}
                        controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
                        disablePictureInPicture
                        onEnded={handleVideoEnded}
                        style={{
                            opacity: isVideoVisible ? 1 : 0,
                            visibility: isVideoVisible ? 'visible' : 'hidden',
                            transition: "opacity 180ms ease-out",
                            backgroundColor: '#000000'
                        }}
                    />
                </>
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

            {/* Right Sidebar Actions */}
            <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 text-white z-20">
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
                <div className="flex flex-col items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setIsShareModalOpen(true)}
                        className={`w-10 h-10 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center border border-white/20 transition-colors ${isShareModalOpen ? "text-[#EC1D99]" : "text-white"}`}
                        aria-label="Share story"
                    >
                        <Share2 className="w-6 h-6" />
                    </button>
                    <span className="text-xs font-bold">Share</span>
                </div>

                {story.visibility === 'public' && (
                    <div className="flex flex-col items-center gap-1">
                        <button
                            type="button"
                            onClick={() => {
                                console.log("Weeve button clicked, toggling isForking", !isForking);
                                setIsForking(!isForking);
                            }}
                            className={`w-10 h-10 rounded-full flex items-center justify-center border border-white/20 transition-all ${isForking ? "bg-[#EC1D99] text-white scale-110" : "bg-gray-800/50 backdrop-blur-sm text-[#EC1D99]"}`}
                            aria-label="Fork story"
                        >
                            <span className="font-black text-lg">W</span>
                        </button>
                        <span className="text-xs font-bold">Weeve</span>
                    </div>
                )}
            </div>

            {/* Bottom Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 text-white z-10">
                <h2 className="text-xl font-bold mb-1 font-poppins shadow-black drop-shadow-md">
                    {story.title}
                </h2>
                {story.hashtags && story.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                        {story.hashtags.map((tag, index) => (
                            <span key={index} className="text-xs font-medium text-[#EC1D99] drop-shadow-md">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
                <p className="text-sm text-gray-200 mb-6 line-clamp-2 max-w-[85%]">
                    {story.description}
                </p>

                <div className="flex items-center gap-2 mb-3 w-fit">
                    <div className="flex -space-x-2">
                        {story.participants.slice(0, 3).map((p) => {
                            const isActive = p.id === activeUserId;
                            return (
                                <Link
                                    key={p.id}
                                    href={`/profile/${p.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`relative rounded-full ${isActive ? 'z-10 scale-110 transition-transform duration-300' : ''}`}
                                >
                                    <img
                                        src={p.avatar}
                                        alt={p.name}
                                        className={`w-10 h-10 rounded-full border-2 ${isActive ? 'border-[#EC1D99] shadow-[0_0_10px_#EC1D99]' : 'border-black'}`}
                                    />
                                </Link>
                            );
                        })}
                    </div>
                    <Link href={`/story/${story.id}`} className="text-sm font-medium text-gray-300 ml-2 hover:text-white transition-colors">
                        {story.participants.length} Weevers
                    </Link>
                </div>
            </div>

            {isCommentsOpen && (
                <div className="absolute inset-0 z-20 flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCommentsOpen(false)} />
                    <div className="relative bg-black/90 text-white rounded-t-3xl p-6 pb-8 max-h-[75%] flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Comments</h3>
                            <button
                                type="button"
                                onClick={() => setIsCommentsOpen(false)}
                                aria-label="Close comments"
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                            {sortedComments.length === 0 ? (
                                <p className="text-sm text-gray-400">Be the first to start the conversation.</p>
                            ) : (
                                sortedComments.map((comment) => {
                                    const avatar = getAvatarForUser(comment.userId, comment.userName);
                                    return (
                                        <div key={comment.id} className="flex items-start gap-3">
                                            <img src={avatar} alt={comment.userName} className="w-9 h-9 rounded-full border border-white/10 object-cover" />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-white">{comment.userName}</span>
                                                    <span className="text-xs text-gray-400">{formatRelativeTime(comment.timestamp)}</span>
                                                </div>
                                                <p className="text-sm text-gray-200 mt-1">{comment.content}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        {story.allowComments !== false ? (
                            <form onSubmit={handleCommentSubmit} className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={commentText}
                                    onChange={(event) => setCommentText(event.target.value)}
                                    placeholder="Add a comment..."
                                    className="flex-1 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#EC1D99]"
                                />
                                <button
                                    type="submit"
                                    disabled={!commentText.trim()}
                                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${commentText.trim() ? "bg-[#EC1D99] text-white" : "bg-gray-700 text-gray-400"}`}
                                >
                                    Send
                                </button>
                            </form>
                        ) : (
                            <div className="text-center py-3 px-4 bg-gray-800/50 rounded-lg">
                                <p className="text-sm text-gray-400">Comments are disabled for this story</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Forking Overlay */}
            {isForking && (
                <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="absolute top-6 right-6">
                        <button onClick={() => setIsForking(false)} className="p-2 bg-white/10 rounded-full">
                            <X className="w-6 h-6 text-white" />
                        </button>
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2">Weeve In</h3>
                    <p className="text-gray-300 text-center mb-6 max-w-xs">Swipe to select a spot to insert yourself or a friend into this story.</p>

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
                                                        console.log("Slot clicked:", index, "isActive:", isActive);
                                                        if (isActive) {
                                                            setSelectedSlot(index);
                                                            setShowParticipantPicker(true);
                                                        } else {
                                                            setCurrentSlotIndex(index);
                                                        }
                                                    }}
                                                    className={`relative group ${isActive ? 'cursor-pointer' : 'cursor-pointer'}`}
                                                >
                                                    <div className="w-64 h-64 rounded-3xl border-2 border-dashed border-white/30 overflow-hidden transition-all hover:border-[#EC1D99] bg-gray-800 relative">
                                                        {contribution || p ? (
                                                            contribution ? (
                                                                <>
                                                                    {contribution.mediaType === 'video' ? (
                                                                        <video
                                                                            src={contribution.mediaUrl}
                                                                            className="weeve-inline-video w-full h-full object-cover"
                                                                            autoPlay
                                                                            muted
                                                                            playsInline
                                                                            loop
                                                                            preload="auto"
                                                                            controls={false}
                                                                            controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
                                                                            disablePictureInPicture
                                                                            onLoadedData={(event) => {
                                                                                const element = event.currentTarget;
                                                                                element.play().catch(() => null);
                                                                            }}
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
                                                            <div className="w-full h-full flex items-center justify-center bg-gray-800/50">
                                                                <UserPlus className="w-12 h-12 text-gray-500" />
                                                            </div>
                                                        )}

                                                        {/* Overlay Icon for active slot */}
                                                        {isActive && (
                                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                                                <div className="bg-[#EC1D99] rounded-full p-3 shadow-lg">
                                                                    <UserPlus className="w-6 h-6 text-white" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {isActive && (
                                                        <span className="text-sm text-gray-300 font-medium mt-3 block">Slot {index + 1} of {maxSlots}</span>
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Carousel Indicators */}
                                <div className="flex justify-center gap-2">
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
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Participant Picker Modal */}
            {showParticipantPicker && (
                <div className="absolute inset-0 z-40 bg-black/90 flex items-center justify-center p-6 animate-in zoom-in-95 duration-200">
                    <div className="w-full max-w-sm bg-[#1a1a2e] rounded-3xl p-6 border border-white/10">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">Who's jumping in?</h3>
                            <button onClick={() => setShowParticipantPicker(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {!showFriendPicker ? (
                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={() => currentUser && handleForkStory(currentUser.id)}
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
                                    <button onClick={() => setShowFriendPicker(false)} className="text-sm text-gray-400 hover:text-white">
                                        &larr; Back
                                    </button>
                                </div>
                                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                    {friends.map((friend) => (
                                        <button
                                            key={friend.id}
                                            onClick={() => handleForkStory(friend.id)}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-colors"
                                        >
                                            <img src={friend.avatar} alt={friend.name} className="w-10 h-10 rounded-full object-cover" />
                                            <span className="font-medium text-white">{friend.name}</span>
                                        </button>
                                    ))}
                                    {friends.length === 0 && (
                                        <p className="text-center text-gray-500 py-4">No friends found.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isShareModalOpen && (
                <ShareModal
                    story={story}
                    onClose={() => setIsShareModalOpen(false)}
                />
            )}
        </div>
    );
}
