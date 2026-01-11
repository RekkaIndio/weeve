import React, { useState } from 'react';
import { X, Trash, Play, Video, Image as ImageIcon, Maximize2, PenTool, Type } from 'lucide-react';
import { Story, User, useStore, isSlotImmutable, MediaType } from '@/lib/store';
import { removeParticipant } from '@/lib/stories';
import { ConfirmModal } from '../(app)/story/[id]/components/Modals';

interface EditStoryModalProps {
    story: Story;
    onClose: () => void;
}

export default function EditStoryModal({ story, onClose }: EditStoryModalProps) {
    const { currentUser, setStories, stories } = useStore();
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewMedia, setPreviewMedia] = useState<{ url: string, type: MediaType } | null>(null);
    const [confirmAction, setConfirmAction] = useState<{
        type: 'remove';
        userId: string;
        userName: string;
        position?: number;
        contributionId?: string;
    } | null>(null);

    // Unified Slot Management
    // We merge participants and contributions to ensure we show EVERYTHING.
    // Enhanced logic: Handle cases where slotIndex is missing or mismatches.

    const mergedSlots = React.useMemo(() => {
        const slotsMap = new Map<number, { participant?: User, contribution?: any }>();
        const occupiedPositions = new Set<number>();

        // 1. Map Participants to Positions
        story.participants.forEach(p => {
            if (typeof p.position === 'number') {
                slotsMap.set(p.position, { participant: p });
                occupiedPositions.add(p.position);
            }
        });

        // 2. Map Contributions with explicit slotIndex
        const unmappedContributions: any[] = [];
        story.contributions.forEach(c => {
            if (typeof c.slotIndex === 'number') {
                const existing = slotsMap.get(c.slotIndex) || {};
                slotsMap.set(c.slotIndex, { ...existing, contribution: c });
                occupiedPositions.add(c.slotIndex);
            } else {
                unmappedContributions.push(c);
            }
        });

        // 3. Handle unmapped contributions (missing slotIndex)
        // Try to match them to existing participant slots of the same user that don't have a contribution yet
        // If no slot exists, create a new "virtual" slot at a new position
        unmappedContributions.sort((a, b) => a.timestamp - b.timestamp); // Sort by time

        unmappedContributions.forEach(c => {
            // Find a slot for this user that doesn't have a contribution yet
            let assignedPos: number | undefined;

            // Find unmatched participant slot for this user
            const matchedPos = Array.from(slotsMap.entries()).find(([pos, data]) =>
                data.participant?.id === c.userId && !data.contribution
            )?.[0];

            if (matchedPos !== undefined) {
                assignedPos = matchedPos;
                const existing = slotsMap.get(assignedPos)!;
                slotsMap.set(assignedPos, { ...existing, contribution: c });
            } else {
                // No existing slot found, find next available position
                let nextPos = 0;
                while (occupiedPositions.has(nextPos)) nextPos++;

                assignedPos = nextPos;
                slotsMap.set(assignedPos, { contribution: c }); // Virtual slot (no participant data known)
                occupiedPositions.add(assignedPos);
            }
        });

        return Array.from(slotsMap.entries())
            .map(([pos, data]) => ({ position: pos, ...data }))
            .sort((a, b) => a.position - b.position);
    }, [story.participants, story.contributions]);

    const handleRemoveParticipant = async (userId: string, userName: string, position?: number, contributionId?: string) => {
        setIsProcessing(true);
        try {
            const result = await removeParticipant(story.id, userId, userName, position, contributionId);
            if (result.success) {
                // Optimistic update locally
                const isPrivate = story.visibility === 'private' || story.mode === 'invite';

                const newStories = stories.map(s => {
                    if (s.id === story.id) {
                        let newParticipants = [...s.participants];

                        if (isPrivate) {
                            // Private: Reset status to 'waiting' (keep the slot/row)
                            newParticipants = newParticipants.map(p => {
                                if (p.id === userId && (position === undefined || p.position === position)) {
                                    // We need to cast or ensure status type matches User interface
                                    return { ...p, status: 'waiting' as any };
                                }
                                return p;
                            });
                        } else {
                            // Public: Remove participant (free the slot entirely)
                            newParticipants = newParticipants.filter(p => !((p.id === userId) && (position === undefined || p.position === position)));
                        }

                        return {
                            ...s,
                            participants: newParticipants,
                            // Remove from contributions
                            contributions: s.contributions.filter(c => !((c.userId === userId) && (c.id === contributionId || (position !== undefined && c.slotIndex === position))))
                        };
                    }
                    return s;
                });
                setStories(newStories);

                // Close if empty (checking merged length approx)
                const remaining = newStories.find(s => s.id === story.id)?.participants.length || 0;
                if (remaining <= 0 && mergedSlots.length <= 1) {
                    onClose();
                }
            } else {
                console.error(result.error || 'Failed to remove participant');
                alert(result.error || 'Failed to remove participant');
            }
        } catch (error) {
            console.error('Error removing participant:', error);
        } finally {
            setIsProcessing(false);
            setConfirmAction(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900 z-10">
                    <h2 className="text-lg font-bold text-white font-sans">
                        {story.creatorId === currentUser?.id ? 'Manage Story Parts' : 'Your Contributions'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 overflow-y-auto">
                    <div className="space-y-3">
                        {mergedSlots.map(({ position, participant, contribution }, index) => {
                            // Derive user info from participant OR contribution
                            const userId = participant?.id || contribution?.userId;
                            const userName = participant?.name || contribution?.userName || 'Unknown User';
                            const userAvatar = participant?.avatar || ''; // Fallback avatar if missing?

                            const isMe = userId === currentUser?.id;
                            const isCreator = story.creatorId === currentUser?.id;

                            // Visibility Logic
                            if (!isCreator && !isMe) return null;

                            const isLocked = typeof position === 'number' && isSlotImmutable(story, position);

                            return (
                                <div
                                    key={`${userId}-${position}-${index}`}
                                    className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-gray-800"
                                >
                                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                                        {/* Thumbnail with Click-to-Preview */}
                                        <button
                                            className="relative w-16 h-16 flex-shrink-0 bg-black rounded-lg overflow-hidden border border-gray-700 group cursor-zoom-in"
                                            onClick={() => contribution && setPreviewMedia({
                                                url: contribution.mediaUrl || '',
                                                type: contribution.mediaType
                                            })}
                                            disabled={!contribution}
                                        >
                                            {contribution ? (
                                                contribution.mediaType === 'video' ? (
                                                    <div className="w-full h-full flex items-center justify-center bg-black relative">
                                                        {contribution.mediaUrl && (
                                                            <video
                                                                src={`${contribution.mediaUrl}#t=0.1`}
                                                                preload="metadata"
                                                                className="absolute inset-0 w-full h-full object-cover opacity-90"
                                                                muted
                                                                playsInline
                                                            />
                                                        )}
                                                        <Video className="relative z-10 w-6 h-6 text-white drop-shadow-md" />
                                                    </div>
                                                ) : contribution.mediaType === 'image' ? (
                                                    <div className="w-full h-full flex items-center justify-center bg-black relative">
                                                        <img src={contribution.mediaUrl} className="absolute inset-0 w-full h-full object-cover opacity-90" alt="Contribution" />
                                                        <ImageIcon className="relative z-10 w-6 h-6 text-white drop-shadow-md" />
                                                    </div>
                                                ) : contribution.mediaType === 'drawing' ? (
                                                    <div className="w-full h-full flex items-center justify-center bg-black relative">
                                                        <img src={contribution.mediaUrl} className="absolute inset-0 w-full h-full object-cover opacity-90" alt="Contribution" />
                                                        <PenTool className="relative z-10 w-6 h-6 text-white drop-shadow-md" />
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[8px] p-1 text-gray-300 overflow-hidden break-words leading-tight bg-gray-900">
                                                        {contribution.content?.slice(0, 50)}...
                                                    </div>
                                                )
                                            ) : (
                                                <img src={userAvatar} className="w-full h-full object-cover opacity-50 grayscale" alt={userName} />
                                            )}

                                            {/* Overlay Icon */}
                                            {contribution && (
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 z-20">
                                                    <Maximize2 className="w-5 h-5 text-white/90" />
                                                </div>
                                            )}
                                        </button>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-white font-medium font-sans truncate text-sm">
                                                    {userName}
                                                </p>
                                                {isMe && <span className="bg-gray-700 text-gray-300 text-[10px] px-1.5 py-0.5 rounded-full">You</span>}
                                                {typeof position === 'number' && <span className="text-gray-600 text-[10px] font-mono">#{position + 1}</span>}
                                            </div>
                                            {!contribution && (
                                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                                    {story.currentTurnUserId === userId ? 'Starting their turn...' : 'Waiting to post...'}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="ml-3">
                                        {!isLocked && (isCreator || isMe) ? (
                                            <button
                                                onClick={() => setConfirmAction({
                                                    type: 'remove',
                                                    userId: userId,
                                                    userName: userName,
                                                    position: position,
                                                    contributionId: contribution?.id
                                                })}
                                                disabled={isProcessing}
                                                className="p-2.5 bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-xl transition-all border border-transparent hover:border-red-900/30 group"
                                                title="Delete this part"
                                            >
                                                <Trash className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                            </button>
                                        ) : isLocked && (
                                            <span className="text-xs text-gray-600 italic px-2 py-1 bg-gray-800 rounded border border-gray-700 select-none">Fixed</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {mergedSlots.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                No parts found.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Media Preview Overlay */}
            {previewMedia && (
                <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-200" onClick={() => setPreviewMedia(null)}>
                    <button
                        onClick={() => setPreviewMedia(null)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <div className="w-full max-w-4xl h-full col-span-1 p-4 flex items-center justify-center p-8" onClick={(e) => e.stopPropagation()}>
                        {previewMedia.type === 'video' ? (
                            <video
                                key={previewMedia.url}
                                src={previewMedia.url}
                                controls
                                autoPlay
                                playsInline
                                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl bg-black"
                            />
                        ) : previewMedia.type === 'image' || previewMedia.type === 'drawing' ? (
                            <img src={previewMedia.url} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" alt="Preview" />
                        ) : (
                            <div className="bg-white text-black p-8 rounded-2xl max-w-2xl text-xl font-medium shadow-2xl text-center min-w-[300px]">
                                {story.contributions.find(c => c.mediaUrl === previewMedia.url)?.content}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={!!confirmAction}
                title="Delete this part?"
                message={`Are you sure you want to delete this contribution by ${confirmAction?.userName}? This action cannot be undone.`}
                confirmLabel={isProcessing ? "Deleting..." : "Delete Part"}
                onConfirm={() => confirmAction && handleRemoveParticipant(confirmAction.userId, confirmAction.userName, confirmAction.position, confirmAction.contributionId)}
                onClose={() => setConfirmAction(null)}
                variant="danger"
            />
        </div>
    );
}
