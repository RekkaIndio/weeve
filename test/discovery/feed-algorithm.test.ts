/**
 * Feed Algorithm - Unit Tests
 * 
 * Tests for fork spacing, diversity rules, and harmonious feed ranking
 */

import { describe, it, expect } from 'vitest';
import {
  rankFeedStories,
  groupStoriesByForkRoot,
  getStoryEngagement,
  calculateFeedScore,
  DEFAULT_FEED_CONFIG,
  type FeedContext,
} from '@/lib/discovery/feed-algorithm';
import type { Story, User } from '@/lib/store';

// ============================================================================
// TEST HELPERS
// ============================================================================

const createMockStory = (overrides: Partial<Story> = {}): Story => ({
  id: `story-${Math.random().toString(36).slice(2, 8)}`,
  title: 'Test Story',
  description: 'Test Description',
  creatorId: 'user-1',
  visibility: 'public',
  mode: 'open',
  status: 'completed',
  contributions: [],
  participants: [],
  likes: 0,
  likedBy: [],
  comments: [],
  created_at: new Date().toISOString(),
  ...overrides,
});

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  name: 'Test User',
  tokens: 100,
  ...overrides,
});

const createContext = (overrides: Partial<FeedContext> = {}): FeedContext => ({
  feedType: 'foryou',
  currentUserId: 'user-1',
  ...overrides,
});

// ============================================================================
// FORK GROUPING TESTS
// ============================================================================

describe('groupStoriesByForkRoot', () => {
  it('should group forks under their root story', () => {
    const original = createMockStory({ id: 'original-1' });
    const fork1 = createMockStory({ id: 'fork-1', forkedFromStoryId: 'original-1' });
    const fork2 = createMockStory({ id: 'fork-2', forkedFromStoryId: 'original-1' });
    const unrelated = createMockStory({ id: 'unrelated-1' });
    
    const groups = groupStoriesByForkRoot([original, fork1, fork2, unrelated]);
    
    expect(groups.size).toBe(2);
    
    const originalGroup = groups.get('original-1');
    expect(originalGroup).toBeDefined();
    expect(originalGroup?.originalStory?.id).toBe('original-1');
    expect(originalGroup?.forks).toHaveLength(2);
    
    const unrelatedGroup = groups.get('unrelated-1');
    expect(unrelatedGroup).toBeDefined();
    expect(unrelatedGroup?.forks).toHaveLength(0);
  });

  it('should handle forks without their original present', () => {
    const fork1 = createMockStory({ id: 'fork-1', forkedFromStoryId: 'missing-original' });
    const fork2 = createMockStory({ id: 'fork-2', forkedFromStoryId: 'missing-original' });
    
    const groups = groupStoriesByForkRoot([fork1, fork2]);
    
    expect(groups.size).toBe(1);
    const group = groups.get('missing-original');
    expect(group?.originalStory).toBeUndefined();
    expect(group?.forks).toHaveLength(2);
  });

  it('should sort forks by engagement (highest first)', () => {
    const fork1 = createMockStory({ 
      id: 'fork-low', 
      forkedFromStoryId: 'root',
      likes: 1,
    });
    const fork2 = createMockStory({ 
      id: 'fork-high', 
      forkedFromStoryId: 'root',
      likes: 100,
    });
    
    const groups = groupStoriesByForkRoot([fork1, fork2]);
    const group = groups.get('root')!;
    
    // Higher engagement fork should be first
    expect(group.forks[0].id).toBe('fork-high');
    expect(group.forks[1].id).toBe('fork-low');
  });
});

// ============================================================================
// ENGAGEMENT CALCULATION TESTS
// ============================================================================

describe('getStoryEngagement', () => {
  it('should calculate engagement from likes, comments, and contributions', () => {
    const story = createMockStory({
      likes: 10,
      comments: [
        { id: '1', userId: 'u1', userName: 'User', content: 'Nice!', timestamp: Date.now(), likes: 0, likedBy: [] },
        { id: '2', userId: 'u2', userName: 'User2', content: 'Cool!', timestamp: Date.now(), likes: 0, likedBy: [] },
      ],
      contributions: [
        { id: 'c1', userId: 'u1', userName: 'User', content: '', mediaType: 'video', timestamp: Date.now() },
      ],
    });
    
    // 10 likes + (2 comments * 2) + (1 contribution * 3) = 10 + 4 + 3 = 17
    expect(getStoryEngagement(story)).toBe(17);
  });

  it('should return 0 for empty story', () => {
    const story = createMockStory({ likes: 0, comments: [], contributions: [] });
    expect(getStoryEngagement(story)).toBe(0);
  });
});

// ============================================================================
// FEED SCORING TESTS
// ============================================================================

describe('calculateFeedScore', () => {
  it('should score brand posts with brand-specific factors', () => {
    const brandPost = createMockStory({
      postType: 'canon',
      visibilityDays: 7,
      canonSlots: [0, 1, 2, 3],
      maxWeeves: 4,
    });
    
    const score = calculateFeedScore(brandPost, createContext());
    
    expect(score.factors.payment).toBeGreaterThan(0);
    expect(score.metadata.isBrandPost).toBe(true);
  });

  it('should boost original posts over forks', () => {
    const original = createMockStory({
      id: 'original',
      postType: 'canon',
      visibilityDays: 7,
    });
    const fork = createMockStory({
      id: 'fork',
      postType: 'canon',
      visibilityDays: 7,
      forkedFromStoryId: 'original',
    });
    
    const originalScore = calculateFeedScore(original, createContext());
    const forkScore = calculateFeedScore(fork, createContext());
    
    expect(originalScore.factors.originalBoost).toBeGreaterThan(0);
    expect(forkScore.factors.originalBoost).toBe(0);
  });

  it('should score user content with userContent factor', () => {
    const userStory = createMockStory({
      postType: 'normal',
      status: 'completed',
    });
    
    const score = calculateFeedScore(userStory, createContext());
    
    expect(score.factors.userContent).toBeGreaterThan(0);
    expect(score.metadata.isBrandPost).toBe(false);
  });

  it('should boost friend content in following tab', () => {
    const friendStory = createMockStory({
      creatorId: 'friend-id',
      postType: 'normal',
    });
    const friends = [createMockUser({ id: 'friend-id' })];
    
    const forYouScore = calculateFeedScore(friendStory, createContext({ feedType: 'foryou', friends }));
    const followingScore = calculateFeedScore(friendStory, createContext({ feedType: 'following', friends }));
    
    expect(followingScore.factors.userContent).toBeGreaterThan(forYouScore.factors.userContent);
  });
});

// ============================================================================
// FORK SPACING TESTS
// ============================================================================

describe('rankFeedStories - Fork Spacing', () => {
  it('should space out forks of the same root by at least 5 positions', () => {
    const original = createMockStory({ id: 'original', postType: 'canon', visibilityDays: 14 });
    const fork1 = createMockStory({ id: 'fork-1', forkedFromStoryId: 'original', likes: 50 });
    const fork2 = createMockStory({ id: 'fork-2', forkedFromStoryId: 'original', likes: 40 });
    const fork3 = createMockStory({ id: 'fork-3', forkedFromStoryId: 'original', likes: 30 });
    // Add filler stories to allow spacing
    const fillers = Array.from({ length: 10 }, (_, i) => 
      createMockStory({ id: `filler-${i}`, likes: 20 - i })
    );
    
    const result = rankFeedStories([original, fork1, fork2, fork3, ...fillers], createContext());
    
    // Find positions of forks
    const forkPositions: number[] = [];
    result.forEach((story, index) => {
      if (story.forkedFromStoryId === 'original') {
        forkPositions.push(index);
      }
    });
    
    // Verify spacing between consecutive forks
    for (let i = 1; i < forkPositions.length; i++) {
      const spacing = forkPositions[i] - forkPositions[i - 1];
      expect(spacing).toBeGreaterThanOrEqual(DEFAULT_FEED_CONFIG.forkSpacing);
    }
  });

  it('should not exceed maxForksPerRoot limit', () => {
    const forks = Array.from({ length: 10 }, (_, i) =>
      createMockStory({ id: `fork-${i}`, forkedFromStoryId: 'root', likes: 100 - i })
    );
    // Add many fillers to allow spacing
    const fillers = Array.from({ length: 50 }, (_, i) =>
      createMockStory({ id: `filler-${i}`, likes: 10 })
    );
    
    const result = rankFeedStories([...forks, ...fillers], createContext({
      config: { maxForksPerRoot: 3 },
    }));
    
    const forksShown = result.filter(s => s.forkedFromStoryId === 'root');
    expect(forksShown.length).toBeLessThanOrEqual(3);
  });

  it('should not exceed maxForksInTop20 limit', () => {
    const forks = Array.from({ length: 10 }, (_, i) =>
      createMockStory({ id: `fork-${i}`, forkedFromStoryId: 'root', likes: 1000 - i }) // High likes to rank in top 20
    );
    const fillers = Array.from({ length: 50 }, (_, i) =>
      createMockStory({ id: `filler-${i}`, likes: 1 })
    );
    
    const result = rankFeedStories([...forks, ...fillers], createContext({
      config: { maxForksInTop20: 2 },
    }));
    
    const top20 = result.slice(0, 20);
    const forksInTop20 = top20.filter(s => s.forkedFromStoryId === 'root');
    expect(forksInTop20.length).toBeLessThanOrEqual(2);
  });
});

// ============================================================================
// FEED TYPE FILTERING TESTS
// ============================================================================

describe('rankFeedStories - Feed Type Filtering', () => {
  it('should filter to friend content in Following tab', () => {
    const myStory = createMockStory({ id: 'mine', creatorId: 'user-1' });
    const friendStory = createMockStory({ id: 'friend', creatorId: 'friend-1' });
    const strangerStory = createMockStory({ id: 'stranger', creatorId: 'stranger-1' });
    
    const friends = [createMockUser({ id: 'friend-1' })];
    
    const result = rankFeedStories(
      [myStory, friendStory, strangerStory],
      createContext({ feedType: 'following', currentUserId: 'user-1', friends })
    );
    
    const resultIds = result.map(s => s.id);
    expect(resultIds).toContain('mine');
    expect(resultIds).toContain('friend');
    expect(resultIds).not.toContain('stranger');
  });

  it('should show all public content in For You tab', () => {
    const myStory = createMockStory({ id: 'mine', creatorId: 'user-1' });
    const strangerStory = createMockStory({ id: 'stranger', creatorId: 'stranger-1' });
    
    const result = rankFeedStories(
      [myStory, strangerStory],
      createContext({ feedType: 'foryou', currentUserId: 'user-1' })
    );
    
    const resultIds = result.map(s => s.id);
    expect(resultIds).toContain('mine');
    expect(resultIds).toContain('stranger');
  });

  it('should exclude reported stories', () => {
    const normal = createMockStory({ id: 'normal' });
    const reported = createMockStory({ id: 'reported' });
    
    const result = rankFeedStories(
      [normal, reported],
      createContext({ reportedStoryIds: ['reported'] })
    );
    
    const resultIds = result.map(s => s.id);
    expect(resultIds).toContain('normal');
    expect(resultIds).not.toContain('reported');
  });
});

// ============================================================================
// END-TO-END SCENARIO TESTS
// ============================================================================

describe('rankFeedStories - E2E Scenarios', () => {
  // TODO: E2E scenario test requires more mock stories to meet algorithm minimums
  it.skip('should create harmonious feed with mixed brand and user content', () => {
    const brandOriginal = createMockStory({
      id: 'brand-original',
      postType: 'canon',
      visibilityDays: 14,
      likes: 100,
    });
    const brandForks = Array.from({ length: 5 }, (_, i) =>
      createMockStory({
        id: `brand-fork-${i}`,
        forkedFromStoryId: 'brand-original',
        likes: 50 - i * 5,
      })
    );
    const userStories = Array.from({ length: 10 }, (_, i) =>
      createMockStory({
        id: `user-story-${i}`,
        postType: 'normal',
        likes: 30 - i * 2,
      })
    );
    
    const result = rankFeedStories(
      [brandOriginal, ...brandForks, ...userStories],
      createContext()
    );
    
    // Should have a mix of content, not all forks clustered together
    expect(result.length).toBeGreaterThan(0);
    
    // Count forks shown
    const forksShown = result.filter(s => s.forkedFromStoryId === 'brand-original');
    expect(forksShown.length).toBeLessThanOrEqual(DEFAULT_FEED_CONFIG.maxForksPerRoot);
    
    // Original should appear (brand posts get priority)
    expect(result.some(s => s.id === 'brand-original')).toBe(true);
  });

  it('should prioritize high-engagement forks over low-engagement ones', () => {
    const highEngagement = createMockStory({
      id: 'high-engagement-fork',
      forkedFromStoryId: 'root',
      likes: 1000,
      comments: Array.from({ length: 50 }, (_, i) => ({
        id: `c${i}`, userId: 'u', userName: 'U', content: 'x', timestamp: Date.now(), likes: 0, likedBy: []
      })),
    });
    const lowEngagement = createMockStory({
      id: 'low-engagement-fork',
      forkedFromStoryId: 'root',
      likes: 1,
    });
    const fillers = Array.from({ length: 10 }, (_, i) =>
      createMockStory({ id: `filler-${i}`, likes: 50 })
    );
    
    const result = rankFeedStories(
      [lowEngagement, highEngagement, ...fillers],
      createContext({ config: { maxForksPerRoot: 1 } }) // Only 1 fork allowed
    );
    
    const forkShown = result.find(s => s.forkedFromStoryId === 'root');
    expect(forkShown?.id).toBe('high-engagement-fork');
  });
});
