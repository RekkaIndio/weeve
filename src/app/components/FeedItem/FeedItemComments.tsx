import { X, Heart, Trash2 } from "lucide-react";
import VerificationBadge from "../VerificationBadge"; // Assumed sibling
import { createPortal } from "react-dom";
import { Story } from "@/lib/store";
import { formatRelativeTime } from "@/lib/format";
import { FormEvent } from "react";

interface FeedItemCommentsProps {
    isCommentsOpen: boolean;
    setIsCommentsOpen: (open: boolean) => void;
    story: Story;
    organizedComments: any[];
    currentUser: any;
    toggleCommentLike: (storyId: string, commentId: string) => void;
    replyingToId: string | null;
    setReplyingToId: (id: string | null) => void;
    commentText: string;
    setCommentText: (text: string) => void;
    handleCommentSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
    participantsMap: Map<string, any>;
    deleteStoryComment: (storyId: string, commentId: string) => Promise<void>;
}

export default function FeedItemComments({
    isCommentsOpen,
    setIsCommentsOpen,
    story,
    organizedComments,
    currentUser,
    toggleCommentLike,
    replyingToId,
    setReplyingToId,
    commentText,
    setCommentText,
    handleCommentSubmit,
    participantsMap,
    deleteStoryComment
}: FeedItemCommentsProps) {
    if (!isCommentsOpen || typeof document === 'undefined') return null;

    const getAvatarForUser = (userId: string, fallbackName: string, userAvatar?: string) => {
        // First check if an avatar was provided directly (e.g., from comment data)
        if (userAvatar) return userAvatar;
        // Then check if user is a participant with an avatar
        const participant = participantsMap.get(userId);
        if (participant?.avatar) return participant.avatar;
        // Fall back to dicebear
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fallbackName)}`;
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCommentsOpen(false)} />
            <div className="relative bg-black/90 text-white rounded-t-3xl p-6 pb-8 max-h-[50%] flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                        Comments <span className="text-gray-400 text-sm font-normal ml-1">({story.comments?.length || 0})</span>
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
                                                    {currentUser && currentUser.id === comment.userId && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (window.confirm("Delete this comment?")) {
                                                                    deleteStoryComment(story.id, comment.id);
                                                                }
                                                            }}
                                                            className="text-gray-500 hover:text-red-500 transition-colors"
                                                            aria-label="Delete comment"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Replies */}
                                    {comment.replies && comment.replies.length > 0 && (
                                        <div className="ml-11 space-y-3 border-l-2 border-white/20 pl-4 mt-2">
                                            {comment.replies.map((reply: any) => {
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
                                                                {currentUser && currentUser.id === reply.userId && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (window.confirm("Delete this reply?")) {
                                                                                deleteStoryComment(story.id, reply.id);
                                                                            }
                                                                        }}
                                                                        className="text-gray-500 hover:text-red-500 transition-colors ml-2"
                                                                        aria-label="Delete reply"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                )}
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
                                <span>Replying to {organizedComments.find((c: any) => c.id === replyingToId)?.userName || 'comment'}</span>
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
    );
}
