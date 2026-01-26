"use client";

import { useMemo } from "react";
import { type Story, type User, type Contribution } from "@/lib/store";

interface UseStoryPermissionsProps {
    story: Story | undefined;
    currentUser: User | null;
    contributions: Contribution[];
    maxWeeves: number | null;
    contributionsCount: number;
}

interface UseStoryPermissionsReturn {
    isMyTurn: boolean;
    isStoryComplete: boolean;
    isUserParticipant: boolean;
    userHasContributed: boolean;
    userHasWaitingSlot: boolean;
    canContributeWithWaitingSlot: boolean;
    canContributeSequentially: boolean;
    isAtCapacity: boolean;
    isBrandPost: boolean;
    isPublicOpenStory: boolean;
    isUserInvolvedInStory: boolean;
    currentUserParticipant: User | undefined;
    isCollabPending: boolean;
    isCollabTarget: boolean;
    isCollabInitiator: boolean;
    hasContributions: boolean;
}

export function useStoryPermissions({
    story,
    currentUser,
    contributions,
    maxWeeves,
    contributionsCount,
}: UseStoryPermissionsProps): UseStoryPermissionsReturn {
    
    const currentUserParticipant = useMemo(() => 
        story?.participants?.find(p => p.id === currentUser?.id),
        [story?.participants, currentUser?.id]
    );

    const userHasContributed = useMemo(() => 
        currentUser?.id ? contributions.some(c => c.userId === currentUser.id) : false,
        [contributions, currentUser?.id]
    );

    const userHasWaitingSlotRaw = useMemo(() =>
        currentUserParticipant?.status === 'waiting' || 
        (currentUserParticipant?.position !== undefined && 
         currentUserParticipant?.position !== null && 
         !userHasContributed),
        [currentUserParticipant, userHasContributed]
    );

    const canContributeDespiteCapacity = userHasWaitingSlotRaw && !userHasContributed;

    const isAtCapacity = maxWeeves !== null && contributionsCount >= maxWeeves && !canContributeDespiteCapacity;

    const isBrandPost = story?.postType === 'canon' || story?.postType === 'seed';
    const isPublicOpenStory = story?.visibility === 'public' && story?.mode === 'open';
    
    const isUserInvolvedInStory = useMemo(() => 
        currentUser && story && (
            story.creatorId === currentUser.id ||
            story.participants.some(p => p.id === currentUser.id) ||
            isBrandPost ||
            isPublicOpenStory
        ),
        [currentUser, story, isBrandPost, isPublicOpenStory]
    );

    // If the story has a fixed limit and we haven't reached it, we treat 'completed' status as stale 
    // (e.g. user added a slot to a completed story).
    // Also if the user has a pending slot (canContributeDespiteCapacity), they should be allowed in.
    const isPhysicallyIncomplete = (maxWeeves !== null && contributionsCount < maxWeeves) || canContributeDespiteCapacity;

    const isStoryComplete = (story?.status === 'completed' && !isPhysicallyIncomplete) || isAtCapacity || !isUserInvolvedInStory;
    
    // Check if it's the user's turn
    const userHasWaitingSlot = userHasWaitingSlotRaw && !isStoryComplete;
    const isExplicitlyMyTurn = !isStoryComplete && story?.currentTurnUserId === currentUser?.id;
    const canContributeWithWaitingSlot = !isStoryComplete && userHasWaitingSlot && !userHasContributed;

    // Sequential check: A user at position N can only contribute if there are at least N contributions
    const userPosition = currentUserParticipant?.position;
    const canContributeSequentially = userPosition === undefined || userPosition === null || contributionsCount >= userPosition;

    const isMyTurn = (isExplicitlyMyTurn || canContributeWithWaitingSlot) && canContributeSequentially;

    // Check if current user is a participant (not creator)
    const isUserParticipant = useMemo(() => {
        if (!currentUser || !story) return false;
        return story.participants.some(p => p.id === currentUser.id) && story.creatorId !== currentUser.id;
    }, [currentUser, story]);

    // Collaboration status
    const isCollabPending = story?.isCollab && story?.collabStatus === 'pending';
    const isCollabTarget = isCollabPending && story?.collabTargetId === currentUser?.id;
    const isCollabInitiator = isCollabPending && story?.collabInitiatorId === currentUser?.id;

    const hasContributions = contributions.length > 0;

    return {
        isMyTurn,
        isStoryComplete,
        isUserParticipant,
        userHasContributed,
        userHasWaitingSlot,
        canContributeWithWaitingSlot,
        canContributeSequentially,
        isAtCapacity,
        isBrandPost,
        isPublicOpenStory,
        isUserInvolvedInStory: !!isUserInvolvedInStory,
        currentUserParticipant,
        isCollabPending: !!isCollabPending,
        isCollabTarget: !!isCollabTarget,
        isCollabInitiator: !!isCollabInitiator,
        hasContributions,
    };
}
