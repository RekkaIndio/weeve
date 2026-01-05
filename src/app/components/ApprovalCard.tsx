'use client';

import { useState } from 'react';
import { Check, X, Loader2, Play } from 'lucide-react';

import Link from 'next/link';
import { approveBrandContribution } from '@/lib/brand-approval';
import VerificationBadge from './VerificationBadge';

interface ApprovalCardProps {
    contribution?: {
        id: string;
        user_id: string;
        story_id: string;
        media_type: 'video' | 'image' | 'text' | 'drawing' | 'audio';
        media_url?: string | null;
        content: string;
        created_at: string;
        stories?: { id: string; title: string; post_type?: string } | null;
        profiles?: { name: string; avatar?: string | null } | null;
    };
    story?: {
        id: string;
        title: string;
        description: string;
        post_type?: string;
        created_at: string;
        contributions?: Array<{
            media_type: string;
            media_url?: string | null;
        }>;
        story_participants?: Array<{
            profiles?: { name: string; avatar?: string | null } | null;
        }>;
    };
    brandUserId: string;
    onApprove?: () => void;
    onReject?: () => void;
}

export default function ApprovalCard({
    contribution,
    story,
    brandUserId,
    onApprove,
    onReject,
}: ApprovalCardProps) {
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);

    const isContribution = !!contribution;
    const storyId = contribution?.story_id || story?.id || '';
    const storyTitle = contribution?.stories?.title || story?.title || 'Unknown Story';
    const submitterName = contribution?.profiles?.name || 'Multiple Contributors';
    const submitterAvatar = contribution?.profiles?.avatar;
    const mediaUrl = contribution?.media_url || story?.contributions?.[0]?.media_url;
    const mediaType = contribution?.media_type || story?.contributions?.[0]?.media_type || 'text';
    const createdAt = new Date(contribution?.created_at || story?.created_at || Date.now());

    const handleApprove = async () => {
        if (!contribution?.id && !story?.id) return;

        setIsApproving(true);
        try {
            if (contribution) {
                const { approveBrandContribution } = await import('@/lib/brand-approval');
                const result = await approveBrandContribution(contribution.id, brandUserId);

                if (result.success) {

                } else {
                    console.error(result.error || 'Failed to approve content');
                }
            } else if (story) {
                const { approveBrandStory } = await import('@/lib/brand-approval');
                const result = await approveBrandStory(story.id, brandUserId);

                if (result.success) {

                } else {
                    console.error(result.error || 'Failed to approve story');
                }
            }
        } catch (error) {
            console.error('Error approving:', error);
            console.error('Failed to approve');
        } finally {
            setIsApproving(false);
        }
    };

    const handleReject = async () => {
        if (!contribution?.id && !story?.id) return;

        setIsRejecting(true);
        try {
            if (contribution) {
                const { rejectBrandContribution } = await import('@/lib/brand-approval');
                const result = await rejectBrandContribution(contribution.id, brandUserId);

                if (result.success) {

                } else {
                    console.error(result.error || 'Failed to reject content');
                }
            } else if (story) {
                const { rejectBrandStory } = await import('@/lib/brand-approval');
                const result = await rejectBrandStory(story.id, brandUserId);

                if (result.success) {

                } else {
                    console.error(result.error || 'Failed to reject story');
                }
            }
        } catch (error) {
            console.error('Error rejecting:', error);
            console.error('Failed to reject');
        } finally {
            setIsRejecting(false);
        }
    };

    const formatTimeAgo = (date: Date) => {
        const now = Date.now();
        const diff = now - date.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'just now';
    };

    return (
        <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
            {/* Preview Section */}
            <Link href={`/story/${storyId}`} className="block">
                <div className="relative aspect-[9/16] bg-gray-800">
                    {mediaType === 'video' && mediaUrl ? (
                        <div className="relative w-full h-full">
                            <video
                                src={mediaUrl}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                                    <Play className="w-6 h-6 text-black ml-0.5" fill="black" />
                                </div>
                            </div>
                        </div>
                    ) : mediaType === 'image' && mediaUrl ? (
                        <img
                            src={mediaUrl}
                            alt="Content preview"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <p className="text-sm">No preview available</p>
                        </div>
                    )}

                    {/* Story Type Badge */}
                    {(contribution?.stories?.post_type || story?.post_type) && (
                        <div className="absolute top-2 left-2 bg-[#EC1D99] px-2 py-1 rounded text-xs font-bold uppercase">
                            {contribution?.stories?.post_type || story?.post_type}
                        </div>
                    )}
                </div>
            </Link>

            {/* Info Section */}
            <div className="p-3">
                <div className="flex items-start gap-2 mb-3">
                    <img
                        src={submitterAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${submitterName}`}
                        alt={submitterName}
                        className="w-8 h-8 rounded-full bg-gray-800"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{submitterName}</p>
                        <p className="text-xs text-gray-400">{formatTimeAgo(createdAt)}</p>
                    </div>
                </div>

                <p className="text-sm text-white font-medium mb-1 truncate">{storyTitle}</p>
                <p className="text-xs text-gray-400 mb-3">
                    {isContribution ? 'New contribution' : `${story?.story_participants?.length || 0} contributors`}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleApprove}
                        disabled={isApproving || isRejecting}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                        {isApproving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                        Approve
                    </button>
                    <button
                        onClick={handleReject}
                        disabled={isApproving || isRejecting}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                        {isRejecting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <X className="w-4 h-4" />
                        )}
                        Reject
                    </button>
                </div>
            </div>
        </div>
    );
}
