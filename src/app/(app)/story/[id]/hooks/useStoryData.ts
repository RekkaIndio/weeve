"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStore, type Story, type User, type Contribution } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useTimerCheck } from "@/lib/useTimerCheck";
import { EMPTY_CONTRIBUTIONS } from "../constants/text";

interface TimelineContributionEntry {
    type: 'contribution';
    contribution: Contribution;
    index: number;
    occurrence: number;
    isLatestForUser: boolean;
    position: number;
    sortPosition: number;
}

interface TimelineEmptyEntry {
    type: 'empty';
    participant: User | null;
    position: number;
    sortPosition: number;
}

export type TimelineEntry = TimelineContributionEntry | TimelineEmptyEntry;

interface UseStoryDataReturn {
    story: Story | undefined;
    currentUser: User | null;
    isFetchingStory: boolean;
    hasFetchedOnce: boolean;
    contributions: Contribution[];
    timelineEntries: TimelineEntry[];
    participantMap: Map<string, User>;
    participantsWithoutContributions: User[];
    originalStoryTitle: string | null;
    maxWeeves: number | null;
    contributionsCount: number;
    remainingSlots: number | null;
    lastContributionTimestamp: number | undefined;
    fetchStories: () => Promise<void>;
    addContribution: (storyId: string, contribution: Contribution, opts?: { nextTurnUserId?: string | null }) => void;
    addStory: (story: Story) => void;
    forkBrandPost: (storyId: string, userId: string, userName: string) => Promise<any>;
}

export function useStoryData(storyId: string): UseStoryDataReturn {
    const router = useRouter();
    const { stories, currentUser, addContribution, fetchStories, addStory, forkBrandPost } = useStore();

    const story = stories.find((s) => s.id === storyId);

    const [isFetchingStory, setIsFetchingStory] = useState(false);
    const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

    // Get original story title for forked stories
    const originalStoryTitle = useMemo(() => {
        if (!story?.forkedFromStoryId) return null;
        const originalStory = stories.find(s => s.id === story.forkedFromStoryId);
        return originalStory?.title || null;
    }, [story?.forkedFromStoryId, stories]);

    // Handle payment success/failure from Stripe redirect
    useEffect(() => {
        const handlePaymentStatus = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const paymentStatus = urlParams.get('payment');

            if (!paymentStatus || !story) return;

            if (paymentStatus === 'success') {
                try {
                    const { error } = await supabase
                        .from('stories')
                        .update({ payment_status: 'completed', payment_completed_at: new Date().toISOString() })
                        .eq('id', storyId);

                    if (error) {
                        console.error('Error updating payment status:', error);
                    } else {
                        await fetchStories();
                    }
                } catch (err) {
                    console.error('Error processing payment success:', err);
                }

                router.replace(`/story/${storyId}`, { scroll: false });
            }
        };

        handlePaymentStatus();
    }, [storyId, story, router, fetchStories]);

    // Fetch story by ID if not in store
    useEffect(() => {
        if (story || isFetchingStory || hasFetchedOnce) return;
        let cancelled = false;

        const fetchStoryById = async () => {
            try {
                console.log('[Story] fetchStoryById starting for:', storyId);
                setIsFetchingStory(true);
                setHasFetchedOnce(false);
                const { data: s, error } = await supabase
                    .from('stories')
                    .select(`
                        *,
                        contributions (*),
                        groups (
                            name,
                            avatar,
                            is_private
                        ),
                        story_participants (
                            *,
                            profiles:user_id (id, name, avatar, is_influencer)
                        ),
                        story_likes (user_id),
                        story_comments (
                            *,
                            profiles:user_id (name, avatar)
                        ),
                        forks:stories!forked_from_story_id(count)
                    `)
                    .eq('id', storyId)
                    .single();

                console.log('[Story] fetchStoryById result:', { hasData: !!s, error: error?.message, participantsCount: s?.story_participants?.length, contributionsCount: s?.contributions?.length });

                if (error || !s) {
                    console.warn('[Story] fetchStoryById: not found or error', { id: storyId, error });
                    setHasFetchedOnce(true);
                    return;
                }

                // Check if story belongs to a group and validate membership
                if (s.group_id) {
                    const { isGroupMember } = await import('@/lib/data');
                    const currentUserId = currentUser?.id;

                    if (currentUserId) {
                        const isMember = await isGroupMember(s.group_id, currentUserId);
                        if (!isMember) {
                            console.warn('[Story] User is not a member of the group for this story');
                            router.push('/groups');
                            return;
                        }
                    } else {
                        router.push('/');
                        return;
                    }
                }

                const participants = (s.story_participants || []).map((sp: any) => {
                    const profile = sp.profiles || { name: 'Unknown', avatar: '' };
                    return {
                        id: sp.user_id,
                        name: profile.name,
                        avatar: profile.avatar,
                        tokens: 0,
                        isInfluencer: profile.is_influencer,
                        status: (sp.status === 'accepted' || sp.status === 'waiting' || sp.status === 'declined') ? (sp.status as 'accepted' | 'waiting' | 'declined') : undefined,
                        position: sp.position,
                    } as User;
                }).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));

                const contributionsFromServer = (s.contributions || []).map((c: any) => ({
                    id: c.id,
                    userId: c.user_id,
                    userName: c.user_name,
                    content: c.content,
                    mediaType: c.media_type,
                    mediaUrl: (c.media_url && c.media_url.trim()) ? c.media_url : undefined,
                    timestamp: c.timestamp,
                    textStyle: c.text_style,
                })) as Contribution[];

                const comments = (s.story_comments || []).map((cm: any) => ({
                    id: cm.id,
                    userId: cm.user_id,
                    userName: cm.user_name || cm.profiles?.name || 'Unknown',
                    content: cm.content,
                    timestamp: cm.timestamp,
                }));

                const likedBy = (s.story_likes || []).map((l: any) => l.user_id);

                const mapped: Story = {
                    id: s.id,
                    title: s.title,
                    description: s.description,
                    creatorId: s.creator_id,
                    visibility: s.visibility,
                    mode: s.mode ?? 'invite',
                    status: s.status,
                    currentTurnUserId: s.current_turn_user_id ?? undefined,
                    contributions: contributionsFromServer,
                    participants,
                    maxWeeves: s.max_weeves ?? undefined,
                    coverImage: s.cover_image ?? undefined,
                    theme: s.theme ?? undefined,
                    groupId: s.group_id ?? undefined,
                    groupName: s.groups?.name,
                    groupAvatar: s.groups?.avatar,
                    likes: likedBy.length,
                    likedBy,
                    comments,
                    created_at: s.created_at ?? undefined,
                    updated_at: s.updated_at ?? undefined,
                    hashtags: s.hashtags ?? undefined,
                    monetizationCost: (s as any).monetization_cost ?? undefined,
                    allowComments: (s as any).allow_comments ?? undefined,
                    allowReuse: (s as any).allow_reuse ?? undefined,
                    turnTimerHours: s.turn_timer_hours ?? undefined,
                    forkedFromStoryId: (s as any).forked_from_story_id ?? undefined,
                    postType: (s as any).post_type ?? 'normal',
                    canonSlots: (s as any).canon_slots ?? undefined,
                    scheduledFor: (s as any).scheduled_for ?? undefined,
                    forksCount: ((s as any).forks && (s as any).forks[0]) ? (s as any).forks[0].count : 0,
                    isCollab: (s as any).is_collab ?? undefined,
                    collabStatus: (s as any).collab_status ?? undefined,
                    collabInitiatorId: (s as any).collab_initiator_id ?? undefined,
                    collabTargetId: (s as any).collab_target_id ?? undefined,
                    collabPriceCents: (s as any).collab_price_cents ?? undefined,
                };

                console.log('[Story] About to call addStory with id:', mapped.id);
                addStory(mapped);
                console.log('[Story] addStory called, setting hasFetchedOnce to true');
                setHasFetchedOnce(true);

            } catch (err) {
                console.error('[Story] Error fetching story by id:', err);
                setHasFetchedOnce(true);
            } finally {
                if (!cancelled) setIsFetchingStory(false);
            }
        };

        fetchStoryById();

        return () => { cancelled = true; };
    }, [story, storyId, isFetchingStory, hasFetchedOnce, addStory, currentUser?.id, router]);

    // Sort contributions by timestamp
    const contributions = useMemo(() => {
        const raw = story?.contributions ?? EMPTY_CONTRIBUTIONS;
        return [...raw].sort((a, b) => a.timestamp - b.timestamp);
    }, [story?.contributions]);

    const maxWeeves = typeof story?.maxWeeves === 'number' ? story?.maxWeeves : null;
    const contributionsCount = contributions.length;
    const remainingSlots = maxWeeves !== null ? Math.max(maxWeeves - contributionsCount, 0) : null;

    // Get last contribution timestamp for timer calculation
    const lastContributionTimestamp = useMemo(() => {
        if (contributions.length === 0) return undefined;
        const sorted = [...contributions].sort((a, b) => b.timestamp - a.timestamp);
        return sorted[0]?.timestamp;
    }, [contributions]);

    // Build participant map
    const participantMap = useMemo(() => {
        const map = new Map<string, User>();
        (story?.participants ?? []).forEach((participant) => {
            map.set(participant.id, participant);
        });
        return map;
    }, [story?.participants]);

    // Build timeline entries
    const timelineEntries = useMemo((): TimelineEntry[] => {
        const occurrences = new Map<string, number>();
        const latestIndexByUser = new Map<string, number>();
        contributions.forEach((contribution, index) => {
            latestIndexByUser.set(contribution.userId, index);
        });

        const contributionPositions = new Set(
            contributions
                .filter(c => c.timestamp >= 1000000 && c.timestamp < 100000000)
                .map(c => Math.floor(c.timestamp / 1000000) - 1)
        );
        const allParticipants = story?.participants ?? [];

        const isForkedStory = story?.visibility === 'private';
        
        // Determine if story is complete (needed for filtering waiting participants)
        const currentUserParticipant = story?.participants?.find(p => p.id === currentUser?.id);
        const userHasContributed = currentUser?.id ? contributions.some(c => c.userId === currentUser.id) : false;
        const userHasWaitingSlotRaw = currentUserParticipant?.status === 'waiting' || (currentUserParticipant?.position !== undefined && currentUserParticipant?.position !== null && !userHasContributed);
        const canContributeDespiteCapacity = userHasWaitingSlotRaw && !userHasContributed;
        const isBrandPost = story?.postType === 'canon' || story?.postType === 'seed';
        const isPublicOpenStory = story?.visibility === 'public' && story?.mode === 'open';
        const isUserInvolvedInStory = currentUser && story && (
            story.creatorId === currentUser.id ||
            story.participants.some(p => p.id === currentUser.id) ||
            isBrandPost ||
            isPublicOpenStory
        );
        const isAtCapacity = maxWeeves !== null && contributionsCount >= maxWeeves && !canContributeDespiteCapacity;
        const isStoryComplete = story?.status === 'completed' || isAtCapacity || !isUserInvolvedInStory;
        
        let waitingParticipants = allParticipants.filter(p => {
            const hasPosition = p.position !== undefined && p.position !== null;
            if (isForkedStory && p.status === 'waiting' && hasPosition) {
                const hasContributedToPos = contributions.some(c =>
                    c.userId === p.id &&
                    (c.timestamp >= 1000000 && c.timestamp < 100000000
                        ? (Math.floor(c.timestamp / 1000000) - 1) === p.position
                        : false
                    )
                );

                if (hasContributedToPos) {
                    return false;
                }

                return true;
            }
            return hasPosition && !contributionPositions.has(p.position as number);
        });

        if (isStoryComplete) {
            waitingParticipants = [];
        }

        const waitingPositions = new Set(waitingParticipants.map(p => p.position as number));

        const contributionEntries: TimelineContributionEntry[] = contributions
            .map((contribution, index) => {
                const occurrence = (occurrences.get(contribution.userId) ?? 0) + 1;
                occurrences.set(contribution.userId, occurrence);
                const position = contribution.timestamp >= 1000000 && contribution.timestamp < 100000000
                    ? Math.floor(contribution.timestamp / 1000000) - 1
                    : index;
                return {
                    type: 'contribution' as const,
                    contribution,
                    index,
                    occurrence,
                    isLatestForUser: latestIndexByUser.get(contribution.userId) === index,
                    position,
                    sortPosition: position,
                };
            })
            .filter(entry => !waitingPositions.has(entry.position));

        const emptySlotEntries: TimelineEmptyEntry[] = waitingParticipants.map(participant => ({
            type: 'empty' as const,
            participant,
            position: participant.position as number,
            sortPosition: participant.position as number,
        }));

        const existingEntries = [
            ...contributionEntries,
            ...emptySlotEntries,
        ];

        const coveredPositions = new Set(existingEntries.map(e => e.position));
        const syntheticEntries: TimelineEmptyEntry[] = [];

        let totalSlots = story?.maxWeeves || 0;
        const nextSlotIndex = contributions.length;
        const isComplete = story?.status === 'completed' || (totalSlots > 0 && nextSlotIndex >= totalSlots);

        if (!isComplete && totalSlots <= nextSlotIndex) {
            totalSlots = nextSlotIndex + 1;
        }

        if (totalSlots > 0) {
            for (let i = 0; i < totalSlots; i++) {
                if (!coveredPositions.has(i)) {
                    syntheticEntries.push({
                        type: 'empty' as const,
                        participant: null,
                        position: i,
                        sortPosition: i
                    });
                }
            }
        }

        return [...existingEntries, ...syntheticEntries].sort((a, b) => a.sortPosition - b.sortPosition);
    }, [contributions, story?.participants, story?.maxWeeves, story?.visibility, story?.postType, story?.mode, story?.status, currentUser, maxWeeves, contributionsCount]);

    // Participants without contributions
    const participantsWithoutContributions = useMemo(() => {
        const contributorIds = new Set(contributions.map((contribution) => contribution.userId));
        const waitingSlotIds = new Set((story?.participants ?? []).filter(p => p.position !== undefined && p.position !== null).map(p => p.id));
        const list = (story?.participants ?? []).filter(
            (participant) => !contributorIds.has(participant.id) && participant.status !== 'waiting' && (participant.position === undefined || participant.position === null)
        );
        const seen = new Set<string>();
        return list.filter(p => {
            if (waitingSlotIds.has(p.id)) return false;
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
        });
    }, [story?.participants, contributions]);

    return {
        story,
        currentUser,
        isFetchingStory,
        hasFetchedOnce,
        contributions,
        timelineEntries,
        participantMap,
        participantsWithoutContributions,
        originalStoryTitle,
        maxWeeves,
        contributionsCount,
        remainingSlots,
        lastContributionTimestamp,
        fetchStories,
        addContribution,
        addStory,
        forkBrandPost,
    };
}
