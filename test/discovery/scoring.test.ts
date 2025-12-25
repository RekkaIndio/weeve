/**
 * Discovery Algorithm - Scoring Functions Tests
 * 
 * Unit tests for individual scoring factor calculations
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePaymentScore,
  calculateUrgencyScore,
  calculateCompletionScore,
  calculateSocialScore,
  calculateEngagementScore,
  calculateQualityScore,
  calculateRecencyScore,
} from '@/lib/discovery/scoring';
import type { Story, User } from '@/lib/store';

// Test data helpers
const createMockBrandStory = (overrides: Partial<Story> = {}): Story => ({
  id: 'test-story-1',
  title: 'Test Brand Post',
  description: 'Test description',
  creatorId: 'brand-user-1',
  postType: 'canon',
  visibility: 'public',
  visibilityDays: 14,
  canonSlots: [0, 1, 2, 3],
  maxWeeves: 4,
  contributions: [],
  participants: [],
  likes: 0,
  comments: [],
  hashtags: [],
  created_at: new Date().toISOString(),
  ...overrides,
} as Story);

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  name: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  tokens: 100,
  ...overrides,
});

describe('calculatePaymentScore', () => {
  it('should give highest score to Canon-14', () => {
    const story = createMockBrandStory({ postType: 'canon', visibilityDays: 14 });
    const score = calculatePaymentScore(story);
    expect(score).toBe(375); // (1000/1000) * 250 * 1.5
  });

  it('should give lower score to Seed posts than Canon', () => {
    const canon = createMockBrandStory({ postType: 'canon', visibilityDays: 7 });
    const seed = createMockBrandStory({ postType: 'seed', visibilityDays: 7 });
    
    const canonScore = calculatePaymentScore(canon);
    const seedScore = calculatePaymentScore(seed);
    
    expect(canonScore).toBeGreaterThan(seedScore);
  });

  it('should give 1.5x multiplier to paid posts', () => {
    const paid = createMockBrandStory({ postType: 'canon', visibilityDays: 1 });
    const organic = createMockBrandStory({ postType: 'canon', visibilityDays: 0 });
    
    const paidScore = calculatePaymentScore(paid);
    const organicScore = calculatePaymentScore(organic);
    
    expect(paidScore).toBeGreaterThan(organicScore);
  });

  it('should return 0 for non-brand posts', () => {
    const regularStory = createMockBrandStory({ postType: 'regular' as any });
    const score = calculatePaymentScore(regularStory);
    expect(score).toBe(0);
  });

  it('should scale correctly across tiers', () => {
    const scores = [
      calculatePaymentScore(createMockBrandStory({ postType: 'canon', visibilityDays: 14 })),
      calculatePaymentScore(createMockBrandStory({ postType: 'canon', visibilityDays: 7 })),
      calculatePaymentScore(createMockBrandStory({ postType: 'canon', visibilityDays: 3 })),
      calculatePaymentScore(createMockBrandStory({ postType: 'canon', visibilityDays: 1 })),
    ];
    
    // Scores should decrease with each tier
    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[1]).toBeGreaterThan(scores[2]);
    expect(scores[2]).toBeGreaterThan(scores[3]);
  });
});

describe('calculateUrgencyScore', () => {
  it('should give emergency score to posts expiring in <6 hours', () => {
    const story = createMockBrandStory({
      visibilityDays: 1,
      created_at: new Date(Date.now() - 18.5 * 3600000).toISOString(), // 18.5 hours ago
    });
    
    const score = calculateUrgencyScore(story);
    expect(score).toBe(200); // Emergency level
  });

  it('should give high score to posts expiring in <24 hours', () => {
    const story = createMockBrandStory({
      visibilityDays: 1,
      created_at: new Date(Date.now() - 12 * 3600000).toISOString(), // 12 hours ago
    });
    
    const score = calculateUrgencyScore(story);
    expect(score).toBe(180); // Very urgent
  });

  it('should give low score to fresh posts', () => {
    const story = createMockBrandStory({
      visibilityDays: 14,
      created_at: new Date().toISOString(), // Just created
    });
    
    const score = calculateUrgencyScore(story);
    expect(score).toBe(50); // Baseline
  });

  it('should return 0 for expired posts', () => {
    const story = createMockBrandStory({
      visibilityDays: 1,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
    });
    
    const score = calculateUrgencyScore(story);
    expect(score).toBe(0);
  });

  it('should return baseline for posts without visibility days', () => {
    const story = createMockBrandStory({ visibilityDays: undefined });
    const score = calculateUrgencyScore(story);
    expect(score).toBe(50);
  });
});

describe('calculateCompletionScore', () => {
  it('should give maximum score to 75%+ filled posts', () => {
    const story = createMockBrandStory({
      maxWeeves: 4,
      contributions: [
        { id: '1', userId: 'u1' } as any,
        { id: '2', userId: 'u2' } as any,
        { id: '3', userId: 'u3' } as any,
      ],
    });
    
    const score = calculateCompletionScore(story);
    expect(score).toBe(150); // 75% = 3/4
  });

  it('should give medium score to 50% filled posts', () => {
    const story = createMockBrandStory({
      maxWeeves: 4,
      contributions: [
        { id: '1', userId: 'u1' } as any,
        { id: '2', userId: 'u2' } as any,
      ],
    });
    
    const score = calculateCompletionScore(story);
    expect(score).toBe(120); // 50% = 2/4
  });

  it('should give low score to empty posts', () => {
    const story = createMockBrandStory({
      maxWeeves: 4,
      contributions: [],
    });
    
    const score = calculateCompletionScore(story);
    expect(score).toBe(40); // Just created
  });

  it('should return 0 for non-brand posts', () => {
    const story = createMockBrandStory({ postType: 'regular' as any });
    const score = calculateCompletionScore(story);
    expect(score).toBe(0);
  });
});

describe('calculateSocialScore', () => {
  it('should give bonus when brand is user\'s friend', () => {
    const story = createMockBrandStory({ creatorId: 'brand-user-1' });
    const user = createMockUser({ id: 'user-1' });
    const friends = [createMockUser({ id: 'brand-user-1' })];
    
    const score = calculateSocialScore(story, user, friends);
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it('should give no friend bonus when brand is not friend', () => {
    const story = createMockBrandStory({ creatorId: 'brand-user-1' });
    const user = createMockUser({ id: 'user-1' });
    const friends = [createMockUser({ id: 'other-user' })];
    
    const score = calculateSocialScore(story, user, friends);
    expect(score).toBeLessThan(80);
  });

  it('should handle empty friends list', () => {
    const story = createMockBrandStory();
    const user = createMockUser();
    const friends: User[] = [];
    
    const score = calculateSocialScore(story, user, friends);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(150);
  });

  it('should cap score at 150', () => {
    const story = createMockBrandStory({ 
      creatorId: 'brand-user-1',
      likedBy: Array(100).fill('friend-1'), // Lots of friend engagement
    });
    const user = createMockUser({ id: 'user-1' });
    const friends = [createMockUser({ id: 'brand-user-1' })];
    
    const score = calculateSocialScore(story, user, friends);
    expect(score).toBeLessThanOrEqual(150);
  });
});

describe('calculateEngagementScore', () => {
  it('should give baseline score with no metrics', () => {
    const story = createMockBrandStory();
    const user = createMockUser();
    
    const score = calculateEngagementScore(story, user);
    expect(score).toBeGreaterThanOrEqual(50);
  });

  it('should boost score for high engagement posts', () => {
    const story = createMockBrandStory({
      likes: 100,
      comments: Array(20).fill({ userId: 'u1', text: 'test' }) as any,
      contributions: [{ id: '1' }] as any,
    });
    const user = createMockUser();
    
    const score = calculateEngagementScore(story, user);
    expect(score).toBeGreaterThan(50);
  });

  it('should cap score at 100', () => {
    const story = createMockBrandStory({
      likes: 10000,
      comments: Array(1000).fill({ userId: 'u1', text: 'test' }) as any,
    });
    const user = createMockUser();
    const metrics = { brandEngagementRate: 1.0 } as any;
    
    const score = calculateEngagementScore(story, user, metrics);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('calculateQualityScore', () => {
  it('should give bonus for verified brands', () => {
    const story = createMockBrandStory();
    const brandMetrics = { verified: true, approvalRate: 0.7, completionRate: 0.8, averageTimeToFill: 24, trustScore: 0.9 };
    
    const score = calculateQualityScore(story, brandMetrics);
    expect(score).toBeGreaterThanOrEqual(40 + 30); // Base + verified bonus
  });

  it('should give bonus for product URL', () => {
    const story = createMockBrandStory({ productUrl: 'https://example.com/product' });
    const score = calculateQualityScore(story);
    expect(score).toBeGreaterThanOrEqual(50); // Base + product URL
  });

  it('should give baseline without metrics', () => {
    const story = createMockBrandStory();
    const score = calculateQualityScore(story);
    expect(score).toBeGreaterThanOrEqual(40);
  });

  it('should cap score at 80', () => {
    const story = createMockBrandStory({ productUrl: 'https://example.com' });
    const brandMetrics = { verified: true, approvalRate: 1.0, completionRate: 1.0, averageTimeToFill: 12, trustScore: 1.0 };
    
    const score = calculateQualityScore(story, brandMetrics);
    expect(score).toBeLessThanOrEqual(80);
  });
});

describe('calculateRecencyScore', () => {
  it('should give highest score to posts <1 hour old', () => {
    const story = createMockBrandStory({
      created_at: new Date(Date.now() - 30 * 60000).toISOString(), // 30 min ago
    });
    
    const score = calculateRecencyScore(story);
    expect(score).toBe(70);
  });

  it('should give medium score to posts from today', () => {
    const story = createMockBrandStory({
      created_at: new Date(Date.now() - 12 * 3600000).toISOString(), // 12 hours ago
    });
    
    const score = calculateRecencyScore(story);
    expect(score).toBe(50);
  });

  it('should give low score to old posts', () => {
    const story = createMockBrandStory({
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(), // 7 days ago
    });
    
    const score = calculateRecencyScore(story);
    expect(score).toBe(10);
  });

  it('should handle missing created_at', () => {
    const story = createMockBrandStory({ created_at: undefined as any });
    const score = calculateRecencyScore(story);
    expect(score).toBe(10);
  });
});
