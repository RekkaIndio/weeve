import { Heart, MessageCircle, Bookmark, Share2 } from "lucide-react";
import { Story } from "@/lib/store";
import { formatCount } from "@/lib/format";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface FeedItemSidebarProps {
    story: Story;
    isLiked: boolean;
    likeCount: number;
    handleToggleLike: () => void;
    commentsCount: number;
    setIsCommentsOpen: (open: boolean) => void;
    isSaved: boolean;
    toggleStorySave: (id: string) => void;
    setIsShareModalOpen: (open: boolean) => void;
    isParticipant: boolean;
    isForking: boolean;
    setIsForking: (forking: boolean) => void;
    showTutorialTooltip: boolean;
    handleTooltipDismiss: () => void;
    currentUser: any;
    setShowMonetizationModal: (type: 'confirm' | 'insufficient' | 'enable_required' | null) => void;
    isForkingBrandPost: boolean;
    setIsForkingBrandPost: (forking: boolean) => void;
    forkBrandPost: (storyId: string) => Promise<{ success: boolean; storyId?: string; error?: string }>;
}

export default function FeedItemSidebar({
    story,
    isLiked,
    likeCount,
    handleToggleLike,
    commentsCount,
    setIsCommentsOpen,
    isSaved,
    toggleStorySave,
    setIsShareModalOpen,
    isParticipant,
    isForking,
    setIsForking,
    showTutorialTooltip,
    handleTooltipDismiss,
    currentUser,
    setShowMonetizationModal,
    isForkingBrandPost,
    setIsForkingBrandPost,
    forkBrandPost
}: FeedItemSidebarProps) {
    const router = useRouter();

    return (
        <div className="absolute right-4 bottom-4 flex flex-col items-center gap-2 text-white z-20">
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
                        className={`w-10 h-10 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center border border-white/20 transition-colors ${false ? "text-[#EC1D99]" : "text-white"}`} // Note: text-[#EC1D99] logic for isCommentsOpen was just UI state, passed simpler here
                        aria-label="Open comments"
                    >
                        <MessageCircle className="w-6 h-6" />
                    </button>
                    <span className="text-xs font-bold">{commentsCount}</span>
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
                    className={`w-10 h-10 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center border border-white/20 transition-colors ${isSaved ? "text-[#EC1D99]" : "text-white"}`}
                    aria-label="Save story"
                >
                    <Bookmark className="w-6 h-6" fill={isSaved ? "currentColor" : "none"} />
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
                - Private stories you're part of
                - Public 'invite' mode stories (traditional private-style stories that are public)
                - NOT for public 'open' mode stories (these allow direct contribution to open slots)
                - NOT for Canon/Seed posts (these have their own fork UI)
            */}
            {/* Weeve Button */}
            {/* Only show fork button for:
                - Private stories you're part of
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
                                // If user is a waiting participant (assigned slot), go to timeline (which handles contribution flow)
                                const isWaitingParticipant = story.participants?.some(p => p.id === currentUser?.id && p.status === 'waiting');

                                if (isWaitingParticipant) {
                                    router.push(`/story/${story.id}`);
                                    return;
                                }

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
                                : (story.forksCount && story.forksCount > 0 ? formatCount(story.forksCount) : 'Weeve')}
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
    );
}
