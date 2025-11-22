"use client";

import { Story, useStore } from "@/lib/store";
import { MessageCircle, Heart, Share2, X } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef, useMemo, FormEvent, useCallback } from "react";

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

    const toggleStoryLike = useStore((state) => state.toggleStoryLike);
    const addStoryComment = useStore((state) => state.addStoryComment);
    const currentUser = useStore((state) => state.currentUser);

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

    // If no contributions, use story cover
    const mediaUrl = currentContribution?.mediaUrl || story.coverImage;
    const mediaType: 'video' | 'image' | 'text' = (() => {
        if (!hasContributions) {
            return story.coverImage ? 'image' : 'text';
        }
        if (currentContribution?.mediaType === 'video' && currentContribution.mediaUrl) return 'video';
        if (currentContribution?.mediaType === 'image' && currentContribution.mediaUrl) return 'image';
        return 'text';
    })();
    const activeUserId = currentContribution?.userId;
    const waitingParticipant = story.currentTurnUserId
        ? story.participants.find((p) => p.id === story.currentTurnUserId)
        : undefined;
    const waitingForFirstContribution = !hasContributions;

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

        let timeoutId: NodeJS.Timeout;

        const handleNext = () => {
            setCurrentIndex((prev) => (prev + 1) % contributions.length);
        };

        if (mediaType !== 'video') {
            // Auto-advance images after 4 seconds
            timeoutId = setTimeout(handleNext, 4000);
        }

        // For video, we rely on onEnded event, but we need to make sure it plays
        if (mediaType === 'video' && videoRef.current) {
            videoRef.current.play().catch(e => console.log("Autoplay prevented:", e));
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [currentIndex, contributions.length, mediaType, isVisible, hasContributions, isCommentsOpen]);

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
                <video
                    ref={videoRef}
                    key={mediaUrl} // Force re-render on url change to ensure autoplay works
                    src={mediaUrl}
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    muted={false}
                    playsInline
                    onEnded={handleVideoEnded}
                />
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
            <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 text-white z-10">
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
                <div className="flex flex-col items-center gap-1">
                    <button
                        type="button"
                        className="w-10 h-10 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center border border-white/20"
                        aria-label="Share story"
                    >
                        <Share2 className="w-6 h-6" />
                    </button>
                    <span className="text-xs font-bold">Share</span>
                </div>
            </div>

            {/* Bottom Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 text-white z-10">
                <h2 className="text-2xl font-bold mb-2 font-poppins shadow-black drop-shadow-md">
                    {story.title}
                </h2>
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
                    </div>
                </div>
            )}
        </div>
    );
}
