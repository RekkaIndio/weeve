import { Plus } from "lucide-react";
import { type Story, type User, type Contribution, isSlotImmutable } from "@/lib/store";
import type { TimelineEntry } from "../types";

interface StoryTimelineProps {
    timelineEntries: TimelineEntry[];
    story: Story;
    currentUser: User | null;
    activeContributionIndex: number;
    isMyTurn: boolean;
    isStoryComplete: boolean;
    contributions: Contribution[];
    participantMap: Map<string, User>;
    participantsWithoutContributions: User[];
    onContributionSelect: (index: number) => void;
    onAddWeeve: (slotIndex?: number) => void;
}

export function StoryTimeline({
    timelineEntries,
    story,
    currentUser,
    activeContributionIndex,
    isMyTurn,
    isStoryComplete,
    contributions,
    participantMap,
    participantsWithoutContributions,
    onContributionSelect,
    onAddWeeve
}: StoryTimelineProps) {
    const timelineItemSnapStyle = { scrollSnapAlign: 'center' as const };
    const contributionsCount = contributions.length;
    const hasContributions = contributions.length > 0;
    const isAlreadyInvolved = story.participants.some(p => p.id === currentUser?.id);

    return (
        <div className="absolute bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl p-4 pb-8 border-t border-white/10 z-30 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide px-2 flex-nowrap" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x', scrollSnapType: 'x mandatory' }}>
                {timelineEntries.map((entry, entryIndex) => {
                    // Handle empty slot entries (waiting participants or open slots)
                    if (entry.type === 'empty') {
                        const participant = entry.participant;

                        // HANDLE OPEN/RESERVED SLOTS (No Participant assigned)
                        if (!participant) {
                            const isReserved = isSlotImmutable(story, entry.position);
                            // For Canon, if it's reserved, it belongs to the ORIGINAL Creator (Brand)
                            // If I am the Creator, it's MY turn.
                            // If I am NOT the Creator, it's "Reserved".

                            const isCreator = currentUser?.id === story.creatorId;

                            // IMPORTANT: For FORKED brand posts, the fork creator is NOT the brand
                            // They should be allowed to stitch on open slots
                            const isForkedBrandPost = (story.postType === 'canon' || story.postType === 'seed') && !!story.forkedFromStoryId;
                            const isOriginalBrandOwner = isCreator && !isForkedBrandPost;

                            const isReservedForMe = isReserved && isOriginalBrandOwner;

                            // Brand Owner should not be prompted to stitch on Open slots
                            // BUT fork creators CAN stitch on their fork's open slots
                            const isBrandOwnerOnOpenSlot = isOriginalBrandOwner && !isReserved;

                            const isNextSequentialSlot = entry.position === contributions.length;

                            // BRAND POST SPECIAL HANDLING
                            // For brand posts, public users who haven't contributed yet can add to any OPEN slot
                            // OPEN = not reserved AND previous slots are filled (sequential requirement)
                            // For FORKED brand posts, the fork creator is treated as a public user
                            const isBrandPost = story.postType === 'canon' || story.postType === 'seed';
                            const hasUserContributed = story.contributions?.some(c => c.userId === currentUser?.id);

                            // Check if all previous ASSIGNED positions have contributions
                            // For open mode, we skip empty/open slots when checking prerequisites
                            let previousSlotsFilled = false;
                            const isOpenModeStory = story.mode === 'open';

                            if (isOpenModeStory) {
                                // For open mode: only check if previous ASSIGNED participant slots are filled
                                const assignedSlotsBeforeThis = story.participants.filter(p => {
                                    const theirPosition = p.position ?? -1;
                                    return theirPosition !== -1 && theirPosition < entry.position;
                                }).length;

                                const contributionsBeforeThis = contributions.filter(c => {
                                    if (c.timestamp >= 1000000 && c.timestamp < 100000000) {
                                        const contribPosition = Math.floor(c.timestamp / 1000000) - 1;
                                        return contribPosition < entry.position;
                                    }
                                    return false;
                                }).length;

                                previousSlotsFilled = contributionsBeforeThis >= assignedSlotsBeforeThis;
                            } else {
                                // For invite mode: sequential requirement (all previous positions)
                                previousSlotsFilled = entry.position === 0 ||
                                    Array.from({ length: entry.position }, (_, i) => i)
                                        .every(pos => contributions.some(c => {
                                            if (c.timestamp >= 1000000 && c.timestamp < 100000000) {
                                                return Math.floor(c.timestamp / 1000000) - 1 === pos;
                                            }
                                            return false;
                                        }));
                            }

                            // Fork creators can add to open slots just like public users
                            const canForkCreatorAdd = isForkedBrandPost && isCreator && !hasUserContributed && !isReserved && previousSlotsFilled;
                            const canPublicUserAdd = isBrandPost && !isOriginalBrandOwner && !hasUserContributed && !isReserved && previousSlotsFilled;

                            // Check if user can add to this slot
                            // For normal stories: use isMyTurn logic
                            // For brand posts: brand owners should never see "YOUR TURN" on open slots, only public users
                            // For public user stories with open mode: anyone can contribute to ANY open slot (no sequential requirement)
                            // Users can contribute to MULTIPLE open slots in the same story
                            // Note: We use isMyTurn passed from parent, but refine it for specific slot logic
                            // DEBUG: Trace why creator sees "Your Turn" on unassigned slots
                            if (currentUser?.id && isMyTurn) {
                                // console.log(`[Slot ${entry.position}] Analyzing for user ${currentUser.id}`);
                                // console.log(`[Slot ${entry.position}] Participants:`, story.participants.filter(p => p.id === currentUser.id));
                            }

                            // For normal stories: use isMyTurn logic ONLY if the user is actually assigned to this slot (waiting)
                            // This prevents creators from seeing "Your turn" on slots they didn't select in public stories
                            // Note: userHasWaitingSlot checks if user has ANY waiting slot, but we need to check if they have THIS waiting slot
                            const isMyWaitingSlot = story.participants.some(p => p.id === currentUser?.id && p.status === 'waiting' && p.position === entry.position);

                            // For open mode stories, we rely on specific position assignment or explicit "wait" with no position
                            // If isReservedForMe is true, that handles the specific position check

                            const canAddNormalStory = !isBrandPost && isMyTurn && !isStoryComplete && isNextSequentialSlot && (isMyWaitingSlot || isReservedForMe);

                            // NEW: Allow contributing to ANY open slot in public user stories (non-brand)
                            // No previousSlotsFilled or hasUserContributed requirement - all open slots are always available
                            const isPublicUserStory = !isBrandPost && isOpenModeStory;
                            const canContributeToPublicOpenSlot = isPublicUserStory && !isStoryComplete;

                            const canAdd = canAddNormalStory || canPublicUserAdd || canForkCreatorAdd || isReservedForMe;

                            // Determine if we should show "Your Turn" (Magenta) or "Open" (Gray) for open slots
                            // 1. If user is NOT involved in the story yet (Viewer), show "Your Turn" to encourage contribution
                            // 2. If user IS involved (Creator/Participant), show "Open" to confusing them with their actual assigned turns
                            const showMagentaYourTurnForOpenSlot = canContributeToPublicOpenSlot && !isAlreadyInvolved;

                            if (canAdd && !isBrandOwnerOnOpenSlot) {
                                return (
                                    <button
                                        key={`add-${entry.position}`}
                                        id="add-weeve-button"
                                        onClick={() => {
                                            try { if (typeof window !== 'undefined' && currentUser?.id) { localStorage.setItem('weeve_onboarding_story_overlay_dismissed_' + currentUser.id, 'true'); localStorage.setItem('weeve_onboarding_overlay_dismissed_' + currentUser.id, 'true'); } } catch (err) { }
                                            onAddWeeve();
                                        }}
                                        className="flex flex-col items-center gap-1 min-w-[64px] transition-opacity focus:outline-none"
                                        style={timelineItemSnapStyle}
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

                            return (
                                <button
                                    key={`open-${entry.position}`}
                                    disabled={!isReservedForMe && !canPublicUserAdd && !canForkCreatorAdd && !canContributeToPublicOpenSlot && !(!isReserved && isNextSequentialSlot)}
                                    onClick={() => {
                                        if (isReservedForMe || canPublicUserAdd || canForkCreatorAdd || canContributeToPublicOpenSlot || (!isReserved && isNextSequentialSlot)) {
                                            try { if (typeof window !== 'undefined' && currentUser?.id) { localStorage.setItem('weeve_onboarding_story_overlay_dismissed_' + currentUser.id, 'true'); localStorage.setItem('weeve_onboarding_overlay_dismissed_' + currentUser.id, 'true'); } } catch (err) { }
                                            onAddWeeve(entry.position);
                                        }
                                    }}
                                    className={`flex flex-col items-center gap-1 min-w-[64px] transition-opacity focus:outline-none ${isReservedForMe || canPublicUserAdd || canForkCreatorAdd || canContributeToPublicOpenSlot || (!isReserved && isNextSequentialSlot) ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
                                    style={timelineItemSnapStyle}
                                >
                                    <div
                                        className={`w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center transition-all shrink-0 ${isReservedForMe ? 'border-[#EC1D99] bg-[#EC1D99]/10' : isReserved ? 'border-purple-500/50 bg-purple-500/10' : (canPublicUserAdd || canForkCreatorAdd || showMagentaYourTurnForOpenSlot) ? 'border-[#EC1D99] bg-[#EC1D99]/10' : 'border-gray-600 bg-white/5'}`}
                                    >
                                        <span className={`text-[10px] font-bold ${isReservedForMe || canPublicUserAdd || canForkCreatorAdd || showMagentaYourTurnForOpenSlot ? 'text-[#EC1D99]' : 'text-gray-400'}`}>
                                            {isReservedForMe ? 'YOU' : isReserved ? 'BRAND' : (canPublicUserAdd || canForkCreatorAdd || showMagentaYourTurnForOpenSlot) ? (showMagentaYourTurnForOpenSlot ? '+' : '+') : 'OPEN'}
                                        </span>
                                    </div>
                                    <span className={`text-[10px] font-medium max-w-[64px] truncate ${isReservedForMe || canPublicUserAdd || canForkCreatorAdd || showMagentaYourTurnForOpenSlot ? 'text-[#EC1D99]' : 'text-gray-400'}`}>
                                        {isReservedForMe ? 'Reserved' : isReserved ? 'Reserved' : (canPublicUserAdd || canForkCreatorAdd || showMagentaYourTurnForOpenSlot) ? 'Your turn' : 'Open'}
                                    </span>
                                    <span className="text-[9px] uppercase tracking-wide text-gray-600">Part {entry.position + 1}</span>
                                </button>
                            );
                        }

                        const isCurrentUser = currentUser?.id === participant.id;
                        const isCurrentTurn = story.currentTurnUserId === participant.id;

                        // Check story mode once for this entry
                        const isOpenModeStory = story.mode === 'open';

                        // For 'open' mode stories, users can contribute to their assigned slots anytime
                        // For 'invite' mode stories, must wait for turn
                        const canContributeToThisSlot = isCurrentUser && !isStoryComplete && (isMyTurn || (isOpenModeStory && participant.status === 'accepted'));

                        // Show clickable + button for current user's empty slot
                        if (canContributeToThisSlot) {
                            return (
                                <button
                                    key={`empty-${participant.id}-${entry.position}`}
                                    id="add-weeve-button"
                                    onClick={() => {
                                        onAddWeeve(entry.position);
                                    }}
                                    className="flex flex-col items-center gap-1 min-w-[64px] transition-opacity focus:outline-none"
                                    style={timelineItemSnapStyle}
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

                        // Check if this is the current user waiting for previous parts to complete
                        // For 'open' mode stories (public stories with open slots), skip checking empty slots
                        // Only wait for previous ASSIGNED participant slots, not open slots
                        // IMPORTANT: Don't wait for your own previous slots - you can fill them in any order
                        let isWaitingForPreviousParts = false;

                        if (isCurrentUser && !isStoryComplete) {
                            if (isOpenModeStory) {
                                // For open mode: only wait if there are unfilled ASSIGNED slots before yours
                                // from OTHER participants (not yourself)
                                const assignedSlotsBeforeMe = story.participants.filter(p => {
                                    // Get their slot position (if they have one)
                                    const theirPosition = p.position ?? -1;
                                    // Exclude your own previous slots - you can fill them in any order
                                    return p.id !== currentUser.id && theirPosition !== -1 && theirPosition < entry.position;
                                }).length;

                                // Count how many of those have contributed
                                const contributionsBeforeMe = contributions.filter(c => {
                                    // Decode position from timestamp
                                    if (c.timestamp >= 1000000 && c.timestamp < 100000000) {
                                        const contribPosition = Math.floor(c.timestamp / 1000000) - 1;
                                        // Exclude your own contributions when checking if you're waiting
                                        return c.userId !== currentUser.id && contribPosition < entry.position;
                                    }
                                    return false;
                                }).length;

                                isWaitingForPreviousParts = contributionsBeforeMe < assignedSlotsBeforeMe;
                            } else {
                                // For normal stories: wait if position > contributions count (sequential)
                                isWaitingForPreviousParts = entry.position > contributionsCount;
                            }
                        }

                        // Show disabled placeholder for other users' empty slots
                        return (
                            <button
                                key={`empty-${participant.id}-${entry.position}`}
                                type="button"
                                disabled
                                className={`flex flex-col items-center gap-1 min-w-[64px] transition-opacity focus:outline-none cursor-default ${isCurrentUser ? 'opacity-60' : 'opacity-40'}`}
                                style={timelineItemSnapStyle}
                            >
                                <div
                                    className={`w-12 h-12 rounded-full border-2 border-dashed overflow-hidden flex items-center justify-center transition-all shrink-0 ${isCurrentUser ? 'border-[#EC1D99]/50' : isCurrentTurn ? 'border-[#EC1D99]/70' : 'border-gray-600'}`}
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
                                {isWaitingForPreviousParts ? (
                                    <span className="text-[9px] text-yellow-500 font-medium">
                                        Waiting for Part {contributionsCount + 1}
                                    </span>
                                ) : isCurrentTurn && (
                                    <span className="text-[10px] text-[#EC1D99] font-semibold">
                                        {participant.id === currentUser?.id ? 'Your turn' : (isAlreadyInvolved ? 'Their turn' : null)}
                                    </span>
                                )}
                            </button>
                        );
                    }

                    // Handle contribution entries
                    const { contribution, index, occurrence, isLatestForUser } = entry;
                    if (!contribution) return null; // Should check contribution existence

                    const participant = participantMap.get(contribution.userId);
                    const displayName = participant?.name ?? contribution.userName;
                    const avatar = participant?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;
                    const isActive = index === activeContributionIndex;
                    const isCurrentTurn = isLatestForUser && story.currentTurnUserId === contribution.userId;

                    return (
                        <button
                            key={`${contribution.id}-${index}`}
                            type="button"
                            onClick={() => onContributionSelect(index!)}
                            className="flex flex-col items-center gap-1 min-w-[64px] transition-opacity focus:outline-none text-white"
                            style={timelineItemSnapStyle}
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
                            <span className="text-[9px] uppercase tracking-wide text-gray-600">
                                Part {entry.position !== undefined ? entry.position + 1 : ((story.postType === 'canon' || story.postType === 'seed') ? (index !== undefined ? index + 1 : occurrence) : occurrence)}
                            </span>
                            {/* Only show "Their turn" for other users - current user sees the + button with "Your turn" */}
                            {isCurrentTurn && contribution.userId !== currentUser?.id && isAlreadyInvolved && (
                                <span className="text-[10px] text-[#EC1D99] font-semibold">
                                    Their turn
                                </span>
                            )}
                        </button>
                    );
                })}

                {participantsWithoutContributions.map((participant, idx) => {
                    const isCurrentTurn = story.currentTurnUserId === participant.id;
                    const isCurrentUserSlot = participant.id === currentUser?.id;

                    // Otherwise show the disabled avatar for other participants
                    return (
                        <button
                            key={`pending-${participant.id}-${participant.position ?? idx}`}
                            type="button"
                            disabled
                            className="flex flex-col items-center gap-1 min-w-[64px] transition-opacity focus:outline-none opacity-60 cursor-default"
                            style={timelineItemSnapStyle}
                        >
                            <div
                                className={`w-12 h-12 rounded-full border-2 border-dashed overflow-hidden flex items-center justify-center transition-all shrink-0 ${isCurrentTurn ? 'border-[#EC1D99] shadow-[0_0_12px_rgba(236,29,153,0.25)]' : 'border-[#EC1D99]/40'}`}
                            >
                                <img
                                    src={participant.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(participant.name)}`}
                                    alt={participant.name}
                                    className="w-full h-full object-cover opacity-70"
                                />
                            </div>
                            <span className="text-[10px] text-[#EC1D99]/70 font-medium max-w-[64px] truncate" title={participant.name}>
                                {participant.name.split(' ').slice(0, 2).join(' ')}
                            </span>
                            <span className="text-[9px] uppercase tracking-wide text-[#EC1D99]/50">No part yet</span>
                            {isCurrentTurn && isAlreadyInvolved && (
                                <span className="text-[10px] text-[#EC1D99] font-semibold">
                                    Their turn
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {!hasContributions && (
                <div className="text-xs text-gray-500 px-2 pb-2">
                    No weeves yet. Be the first to add one!
                </div>
            )}

            {isStoryComplete ? (
                <div className="text-center text-xs text-gray-500 py-2">
                    Story complete — stitch limit reached.
                </div>
            ) : null}
        </div>
    );
}
