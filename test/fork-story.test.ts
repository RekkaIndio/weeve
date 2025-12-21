/**
 * Automated tests for Story Forking (Weeve) functionality.
 *
 * These tests cover:
 * 1. Core forkStory logic in store.ts
 * 2. Participant de-duplication
 * 3. Contribution filtering and copying
 * 4. Position-based timestamp handling
 * 5. Timeline entry generation
 * 6. Visibility transitions
 *
 * The forking system allows users to create a new story branch by:
 * - Selecting slots (contributions) to replace
 * - Adding themselves or a friend as a new participant
 * - Copying non-selected contributions to the new story
 * - Maintaining correct slot positions via timestamp encoding
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We test the pure logic functions extracted from the store
// This allows testing without full Supabase integration

// ============================================================================
// HELPER FUNCTIONS (extracted from store.ts for isolated testing)
// ============================================================================

/**
 * Calculates position from timestamp using the encoding scheme:
 * timestamp = (position + 1) * 1000000
 * position = Math.floor(timestamp / 1000000) - 1
 */
function calculatePositionFromTimestamp(timestamp: number, fallbackIndex: number): number {
    if (timestamp >= 1000000 && timestamp < 100000000) {
        return Math.floor(timestamp / 1000000) - 1;
    }
    return fallbackIndex;
}

/**
 * Calculates timestamp from position using the encoding scheme:
 * timestamp = (position + 1) * 1000000
 */
function calculateTimestampFromPosition(position: number): number {
    return (position + 1) * 1000000;
}

/**
 * Filters contributions to copy based on exclusion criteria.
 * Matches the logic in store.ts forkStory function.
 */
function filterContributionsToCopy(
    sortedContributions: Array<{ id: string; user_id: string; timestamp: number }>,
    slotIndices: number[],
    contributionIdsToExclude?: string[]
): Array<{ id: string; user_id: string; timestamp: number; originalIndex: number }> {
    const excludeIds = new Set(contributionIdsToExclude || []);
    
    return sortedContributions
        .map((c, originalIndex) => ({ ...c, originalIndex }))
        .filter(({ id, originalIndex }) => {
            const shouldExclude = excludeIds.size > 0
                ? excludeIds.has(id)
                : slotIndices.includes(originalIndex);
            return !shouldExclude;
        });
}

/**
 * Builds a de-duplicated participant map from contributions and new participant.
 * Matches the de-duplication logic in store.ts forkStory function.
 */
function buildParticipantMap(
    contributionsToCopy: Array<{ user_id: string; timestamp: number }>,
    newParticipantId: string,
    newParticipantPosition: number
): Map<string, { user_id: string; position: number; status: 'accepted' | 'waiting' }> {
    const participantsMap = new Map<string, { user_id: string; position: number; status: 'accepted' | 'waiting' }>();

    // Add participants from kept contributions
    contributionsToCopy.forEach(c => {
        const position = Math.floor(c.timestamp / 1000000) - 1;
        if (!participantsMap.has(c.user_id)) {
            participantsMap.set(c.user_id, {
                user_id: c.user_id,
                position,
                status: 'accepted'
            });
        }
    });

    // Add/override with new participant (always waiting)
    participantsMap.set(newParticipantId, {
        user_id: newParticipantId,
        position: newParticipantPosition,
        status: 'waiting'
    });

    return participantsMap;
}

/**
 * Generates timeline entries from contributions and waiting participants.
 * Matches the logic in story/[id]/page.tsx timelineEntries useMemo.
 */
interface Contribution {
    id: string;
    userId: string;
    timestamp: number;
}

interface Participant {
    id: string;
    status?: 'accepted' | 'waiting' | 'declined';
    position?: number;
}

type TimelineEntry = 
    | { type: 'contribution'; contribution: Contribution; position: number }
    | { type: 'empty'; participant: Participant; position: number };

function generateTimelineEntries(
    contributions: Contribution[],
    participants: Participant[],
    isForkedStory: boolean,
    isStoryComplete: boolean
): TimelineEntry[] {
    const contributors = new Set(contributions.map(c => c.userId));
    
    // Find waiting participants that should show as empty slots
    let waitingParticipants = participants.filter(p => {
        const hasPosition = p.position !== undefined && p.position !== null;
        if (isForkedStory && p.status === 'waiting' && hasPosition) {
            return true;
        }
        return !contributors.has(p.id) && hasPosition;
    });

    // Don't show waiting slots if story is complete
    if (isStoryComplete) {
        waitingParticipants = [];
    }

    const waitingPositions = new Set(waitingParticipants.map(p => p.position as number));

    // Create contribution entries
    const contributionEntries: TimelineEntry[] = contributions
        .map((contribution, index) => {
            const position = calculatePositionFromTimestamp(contribution.timestamp, index);
            return { type: 'contribution' as const, contribution, position };
        })
        .filter(entry => !waitingPositions.has(entry.position));

    // Create empty slot entries
    const emptySlotEntries: TimelineEntry[] = waitingParticipants.map(participant => ({
        type: 'empty' as const,
        participant,
        position: participant.position as number
    }));

    // Combine and sort by position
    return [...contributionEntries, ...emptySlotEntries]
        .sort((a, b) => a.position - b.position);
}

// ============================================================================
// TESTS
// ============================================================================

describe('Position-Timestamp Encoding', () => {
    describe('calculatePositionFromTimestamp', () => {
        it('correctly decodes position 0 from timestamp 1000000', () => {
            expect(calculatePositionFromTimestamp(1000000, 0)).toBe(0);
        });

        it('correctly decodes position 1 from timestamp 2000000', () => {
            expect(calculatePositionFromTimestamp(2000000, 0)).toBe(1);
        });

        it('correctly decodes position 2 from timestamp 3000000', () => {
            expect(calculatePositionFromTimestamp(3000000, 0)).toBe(2);
        });

        it('falls back to index for timestamps below threshold', () => {
            expect(calculatePositionFromTimestamp(500000, 5)).toBe(5);
        });

        it('falls back to index for timestamps above threshold', () => {
            // 100000000 or above should use fallback
            expect(calculatePositionFromTimestamp(100000001, 7)).toBe(7);
        });

        it('handles real-world timestamps correctly (falls back to index)', () => {
            // Modern timestamps are ~1700000000000
            expect(calculatePositionFromTimestamp(1700000000000, 3)).toBe(3);
        });
    });

    describe('calculateTimestampFromPosition', () => {
        it('correctly encodes position 0 to timestamp 1000000', () => {
            expect(calculateTimestampFromPosition(0)).toBe(1000000);
        });

        it('correctly encodes position 1 to timestamp 2000000', () => {
            expect(calculateTimestampFromPosition(1)).toBe(2000000);
        });

        it('correctly encodes position 4 to timestamp 5000000', () => {
            expect(calculateTimestampFromPosition(4)).toBe(5000000);
        });

        it('round-trips correctly', () => {
            for (let i = 0; i < 10; i++) {
                const timestamp = calculateTimestampFromPosition(i);
                const position = calculatePositionFromTimestamp(timestamp, -1);
                expect(position).toBe(i);
            }
        });
    });
});

describe('Contribution Filtering', () => {
    const mockContributions = [
        { id: 'c1', user_id: 'user1', timestamp: 1000000 },
        { id: 'c2', user_id: 'user2', timestamp: 2000000 },
        { id: 'c3', user_id: 'user3', timestamp: 3000000 },
        { id: 'c4', user_id: 'user4', timestamp: 4000000 },
    ];

    describe('filterContributionsToCopy', () => {
        it('excludes contributions by ID when contributionIdsToExclude is provided', () => {
            const result = filterContributionsToCopy(
                mockContributions,
                [1], // slotIndices (ignored when IDs provided)
                ['c2', 'c4'] // exclude by ID
            );

            expect(result).toHaveLength(2);
            expect(result.map(c => c.id)).toEqual(['c1', 'c3']);
        });

        it('falls back to slot indices when no IDs provided', () => {
            const result = filterContributionsToCopy(
                mockContributions,
                [1, 3], // exclude indices 1 and 3
                undefined
            );

            expect(result).toHaveLength(2);
            expect(result.map(c => c.id)).toEqual(['c1', 'c3']);
        });

        it('excludes single slot correctly', () => {
            const result = filterContributionsToCopy(
                mockContributions,
                [2], // exclude middle contribution
                ['c3']
            );

            expect(result).toHaveLength(3);
            expect(result.map(c => c.id)).toEqual(['c1', 'c2', 'c4']);
        });

        it('preserves originalIndex for position tracking', () => {
            const result = filterContributionsToCopy(
                mockContributions,
                [0],
                ['c1']
            );

            expect(result[0].originalIndex).toBe(1); // c2 was originally at index 1
            expect(result[1].originalIndex).toBe(2); // c3 was originally at index 2
        });

        it('handles empty exclusion list', () => {
            const result = filterContributionsToCopy(
                mockContributions,
                [],
                []
            );

            expect(result).toHaveLength(4);
        });

        it('handles all contributions excluded', () => {
            const result = filterContributionsToCopy(
                mockContributions,
                [0, 1, 2, 3],
                ['c1', 'c2', 'c3', 'c4']
            );

            expect(result).toHaveLength(0);
        });
    });
});

describe('Participant De-duplication', () => {
    describe('buildParticipantMap', () => {
        it('creates participants from contributions with correct positions', () => {
            const contributions = [
                { user_id: 'user1', timestamp: 1000000 },
                { user_id: 'user2', timestamp: 3000000 },
            ];

            const result = buildParticipantMap(contributions, 'newUser', 1);

            expect(result.get('user1')).toEqual({
                user_id: 'user1',
                position: 0,
                status: 'accepted'
            });
            expect(result.get('user2')).toEqual({
                user_id: 'user2',
                position: 2,
                status: 'accepted'
            });
        });

        it('adds new participant at correct position with waiting status', () => {
            const contributions = [
                { user_id: 'user1', timestamp: 1000000 },
            ];

            const result = buildParticipantMap(contributions, 'newUser', 1);

            expect(result.get('newUser')).toEqual({
                user_id: 'newUser',
                position: 1,
                status: 'waiting'
            });
        });

        it('de-duplicates when new participant already has a contribution', () => {
            const contributions = [
                { user_id: 'existingUser', timestamp: 1000000 },
                { user_id: 'otherUser', timestamp: 2000000 },
            ];

            // existingUser forks their own story, replacing slot 1
            const result = buildParticipantMap(contributions, 'existingUser', 1);

            // Should only have 2 entries, not 3
            expect(result.size).toBe(2);
            
            // existingUser should be overwritten to waiting status at new position
            expect(result.get('existingUser')).toEqual({
                user_id: 'existingUser',
                position: 1,
                status: 'waiting'
            });
        });

        it('handles empty contributions list', () => {
            const result = buildParticipantMap([], 'newUser', 0);

            expect(result.size).toBe(1);
            expect(result.get('newUser')).toEqual({
                user_id: 'newUser',
                position: 0,
                status: 'waiting'
            });
        });
    });
});

describe('Timeline Entry Generation', () => {
    describe('generateTimelineEntries', () => {
        const baseContributions: Contribution[] = [
            { id: 'c1', userId: 'user1', timestamp: 1000000 },
            { id: 'c2', userId: 'user2', timestamp: 2000000 },
            { id: 'c3', userId: 'user3', timestamp: 3000000 },
        ];

        const baseParticipants: Participant[] = [
            { id: 'user1', status: 'accepted', position: 0 },
            { id: 'user2', status: 'accepted', position: 1 },
            { id: 'user3', status: 'accepted', position: 2 },
        ];

        it('generates entries for all contributions in a complete story', () => {
            const result = generateTimelineEntries(
                baseContributions,
                baseParticipants,
                false, // not forked
                false  // not complete
            );

            expect(result).toHaveLength(3);
            expect(result.every(e => e.type === 'contribution')).toBe(true);
        });

        it('shows empty slot for waiting participant in forked story', () => {
            const forkedContributions: Contribution[] = [
                { id: 'c1', userId: 'user1', timestamp: 1000000 },
                // c2 excluded - waiting slot
                { id: 'c3', userId: 'user3', timestamp: 3000000 },
            ];

            const forkedParticipants: Participant[] = [
                { id: 'user1', status: 'accepted', position: 0 },
                { id: 'newUser', status: 'waiting', position: 1 },
                { id: 'user3', status: 'accepted', position: 2 },
            ];

            const result = generateTimelineEntries(
                forkedContributions,
                forkedParticipants,
                true, // forked story
                false
            );

            expect(result).toHaveLength(3);
            expect(result[0].type).toBe('contribution');
            expect(result[1].type).toBe('empty');
            expect(result[2].type).toBe('contribution');

            // Check the empty slot is for newUser
            const emptyEntry = result[1] as { type: 'empty'; participant: Participant };
            expect(emptyEntry.participant.id).toBe('newUser');
        });

        it('hides waiting slots when story is complete', () => {
            const forkedParticipants: Participant[] = [
                { id: 'user1', status: 'accepted', position: 0 },
                { id: 'waitingUser', status: 'waiting', position: 1 },
            ];

            const result = generateTimelineEntries(
                [{ id: 'c1', userId: 'user1', timestamp: 1000000 }],
                forkedParticipants,
                true,
                true // story is complete
            );

            expect(result).toHaveLength(1);
            expect(result.every(e => e.type === 'contribution')).toBe(true);
        });

        it('correctly orders entries by position', () => {
            const unorderedContributions: Contribution[] = [
                { id: 'c3', userId: 'user3', timestamp: 3000000 },
                { id: 'c1', userId: 'user1', timestamp: 1000000 },
            ];

            const participants: Participant[] = [
                { id: 'user1', status: 'accepted', position: 0 },
                { id: 'waitingUser', status: 'waiting', position: 1 },
                { id: 'user3', status: 'accepted', position: 2 },
            ];

            const result = generateTimelineEntries(
                unorderedContributions,
                participants,
                true,
                false
            );

            expect(result.map(e => e.position)).toEqual([0, 1, 2]);
        });

        it('filters out contributions at positions with waiting participants', () => {
            // This tests the case where a contribution exists at position 1,
            // but there's also a waiting participant at position 1
            // The waiting slot should take precedence
            const contributions: Contribution[] = [
                { id: 'c1', userId: 'user1', timestamp: 1000000 },
                { id: 'c2', userId: 'oldUser', timestamp: 2000000 }, // position 1
            ];

            const participants: Participant[] = [
                { id: 'user1', status: 'accepted', position: 0 },
                { id: 'newUser', status: 'waiting', position: 1 }, // replaces oldUser
            ];

            const result = generateTimelineEntries(
                contributions,
                participants,
                true,
                false
            );

            expect(result).toHaveLength(2);
            expect(result[0].type).toBe('contribution');
            expect(result[1].type).toBe('empty');
        });
    });
});

describe('Fork Story Integration Scenarios', () => {
    describe('Scenario: User forks a 3-slot story, replacing the middle slot', () => {
        const originalContributions = [
            { id: 'c1', user_id: 'alice', timestamp: 1000000 },
            { id: 'c2', user_id: 'bob', timestamp: 2000000 },
            { id: 'c3', user_id: 'charlie', timestamp: 3000000 },
        ];

        it('correctly excludes the middle contribution', () => {
            const filtered = filterContributionsToCopy(
                originalContributions,
                [1],
                ['c2']
            );

            expect(filtered).toHaveLength(2);
            expect(filtered.map(c => c.id)).toEqual(['c1', 'c3']);
        });

        it('creates correct participant map with new user at position 1', () => {
            const contributionsToCopy = [
                { user_id: 'alice', timestamp: 1000000 },
                { user_id: 'charlie', timestamp: 3000000 },
            ];

            const participants = buildParticipantMap(contributionsToCopy, 'newForker', 1);

            expect(participants.size).toBe(3);
            expect(participants.get('alice')?.status).toBe('accepted');
            expect(participants.get('newForker')?.status).toBe('waiting');
            expect(participants.get('newForker')?.position).toBe(1);
            expect(participants.get('charlie')?.status).toBe('accepted');
        });

        it('generates correct timeline with empty slot in middle', () => {
            const contributions: Contribution[] = [
                { id: 'c1', userId: 'alice', timestamp: 1000000 },
                { id: 'c3', userId: 'charlie', timestamp: 3000000 },
            ];

            const participants: Participant[] = [
                { id: 'alice', status: 'accepted', position: 0 },
                { id: 'newForker', status: 'waiting', position: 1 },
                { id: 'charlie', status: 'accepted', position: 2 },
            ];

            const timeline = generateTimelineEntries(contributions, participants, true, false);

            expect(timeline).toHaveLength(3);
            expect(timeline[0].position).toBe(0);
            expect(timeline[1].position).toBe(1);
            expect(timeline[1].type).toBe('empty');
            expect(timeline[2].position).toBe(2);
        });
    });

    describe('Scenario: User forks and replaces multiple slots', () => {
        const originalContributions = [
            { id: 'c1', user_id: 'alice', timestamp: 1000000 },
            { id: 'c2', user_id: 'bob', timestamp: 2000000 },
            { id: 'c3', user_id: 'charlie', timestamp: 3000000 },
            { id: 'c4', user_id: 'dave', timestamp: 4000000 },
        ];

        it('correctly excludes multiple contributions', () => {
            const filtered = filterContributionsToCopy(
                originalContributions,
                [0, 2],
                ['c1', 'c3']
            );

            expect(filtered).toHaveLength(2);
            expect(filtered.map(c => c.id)).toEqual(['c2', 'c4']);
        });

        it('places new participant at first excluded position', () => {
            const contributionsToCopy = [
                { user_id: 'bob', timestamp: 2000000 },
                { user_id: 'dave', timestamp: 4000000 },
            ];

            // New participant should go to position 0 (first excluded)
            const participants = buildParticipantMap(contributionsToCopy, 'newForker', 0);

            expect(participants.get('newForker')?.position).toBe(0);
        });
    });

    describe('Scenario: Visibility transition after all slots filled', () => {
        it('hides empty slots when story is marked complete', () => {
            const contributions: Contribution[] = [
                { id: 'c1', userId: 'alice', timestamp: 1000000 },
                { id: 'c2', userId: 'forker', timestamp: 2000000 },
                { id: 'c3', userId: 'charlie', timestamp: 3000000 },
            ];

            // All participants now accepted
            const participants: Participant[] = [
                { id: 'alice', status: 'accepted', position: 0 },
                { id: 'forker', status: 'accepted', position: 1 },
                { id: 'charlie', status: 'accepted', position: 2 },
            ];

            const timeline = generateTimelineEntries(contributions, participants, true, true);

            expect(timeline).toHaveLength(3);
            expect(timeline.every(e => e.type === 'contribution')).toBe(true);
        });
    });
});

describe('Edge Cases', () => {
    describe('Empty story fork', () => {
        it('handles forking with no existing contributions', () => {
            const participants = buildParticipantMap([], 'firstUser', 0);
            
            expect(participants.size).toBe(1);
            expect(participants.get('firstUser')?.status).toBe('waiting');
        });
    });

    describe('Self-fork (user replaces their own contribution)', () => {
        it('correctly handles user replacing their own slot', () => {
            const contributions = [
                { user_id: 'alice', timestamp: 1000000 },
                { user_id: 'alice', timestamp: 2000000 }, // alice has 2 contributions
            ];

            // Alice forks and replaces her second contribution
            const participants = buildParticipantMap(
                [{ user_id: 'alice', timestamp: 1000000 }],
                'alice',
                1
            );

            // Should have only 1 entry for alice (de-duplicated)
            expect(participants.size).toBe(1);
            expect(participants.get('alice')?.status).toBe('waiting');
            expect(participants.get('alice')?.position).toBe(1);
        });
    });

    describe('Large position numbers', () => {
        it('handles position 99 (near threshold)', () => {
            const timestamp = calculateTimestampFromPosition(99);
            expect(timestamp).toBe(100000000);
            
            // This is exactly at the threshold, should work
            const position = calculatePositionFromTimestamp(timestamp, -1);
            expect(position).toBe(-1); // Falls back because >= 100000000
        });

        it('handles position 98 (below threshold)', () => {
            const timestamp = calculateTimestampFromPosition(98);
            expect(timestamp).toBe(99000000);
            
            const position = calculatePositionFromTimestamp(timestamp, -1);
            expect(position).toBe(98);
        });
    });
});
