/**
 * Feed Algorithm - Harmonious Feed Ranking
 * 
 * PROPRIETARY - DO NOT SHARE
 * Unified feed ranking system that balances brand content visibility
 * with user experience through intelligent fork spacing and diversity.
 */

import { Story, User, isBrandPost } from '@/lib/store';
import {
  calculatePaymentScore,
  calculateUrgencyScore,
  calculateCompletionScore,
  calculateSocialScore,
  calculateEngagementScore,
  calculateQualityScore,
  calculateRecencyScore,
} from './scoring';
import type { ScoringFactors, BrandQualityMetrics, UserEngagementMetrics } from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface FeedRankingConfig {
  /** Minimum positions between forks of the same root story */
  forkSpacing: number;
  /** Maximum forks from same original in entire feed */
  maxForksPerRoot: number;
  /** Maximum forks from same original in top 20 positions */
  maxForksInTop20: number;
  /** Score boost for original brand posts over forks */
  originalPostBoost: number;
  /** Whether to show original posts before their forks when scores are similar */
  prioritizeOriginals: boolean;
}

export const DEFAULT_FEED_CONFIG: FeedRankingConfig = {
  forkSpacing: 5,
  maxForksPerRoot: 3,
  maxForksInTop20: 2,
  originalPostBoost: 50,
  prioritizeOriginals: true,
};

export interface FeedContext {
  feedType: 'foryou' | 'following';
  currentUserId?: string;
  friends?: User[];
  groupMembershipIds?: Set<string>;
  reportedStoryIds?: string[];
  config?: Partial<FeedRankingConfig>;
}

// ============================================================================
// FORK GROUPING
// ============================================================================

export interface ForkGroup {
  /** The root story ID (original that was forked) */
  rootStoryId: string;
  /** The original brand post (if it exists in the current dataset) */
  originalStory?: Story;
  /** All forks of this root story */
  forks: Story[];
  /** Total engagement across all forks */
  totalEngagement: number;
}

/**
 * Group stories by their fork root.
 * Stories with forkedFromStoryId are grouped under their root.
 * Stories without forkedFromStoryId (originals) become their own group roots.
 */
export function groupStoriesByForkRoot(stories: Story[]): Map<string, ForkGroup> {
  const groups = new Map<string, ForkGroup>();
  
  for (const story of stories) {
    const rootId = story.forkedFromStoryId || story.id;
    
    if (!groups.has(rootId)) {
      groups.set(rootId, {
        rootStoryId: rootId,
        originalStory: undefined,
        forks: [],
        totalEngagement: 0,
      });
    }
    
    const group = groups.get(rootId)!;
    const engagement = getStoryEngagement(story);
    group.totalEngagement += engagement;
    
    if (story.forkedFromStoryId) {
      // This is a fork
      group.forks.push(story);
    } else {
      // This is an original
      group.originalStory = story;
    }
  }
  
  // Sort forks within each group by engagement (highest first)
  for (const group of groups.values()) {
    group.forks.sort((a, b) => getStoryEngagement(b) - getStoryEngagement(a));
  }
  
  return groups;
}

/**
 * Get total engagement for a story (likes + comments + contributions)
 */
export function getStoryEngagement(story: Story): number {
  const likes = story.likes || 0;
  const comments = story.comments?.length || 0;
  const contributions = story.contributions?.length || 0;
  // Comments are weighted 2x, contributions 3x
  return likes + (comments * 2) + (contributions * 3);
}

// ============================================================================
// SCORING
// ============================================================================

export interface FeedScore {
  storyId: string;
  totalScore: number;
  factors: ScoringFactors & {
    forkDiversity: number;
    originalBoost: number;
    userContent: number;
  };
  metadata: {
    isFork: boolean;
    rootStoryId?: string;
    engagement: number;
    isBrandPost: boolean;
  };
}

/**
 * Calculate feed score for a single story.
 * Handles both brand posts and regular user content.
 */
export function calculateFeedScore(
  story: Story,
  context: FeedContext,
  userMetrics?: UserEngagementMetrics,
  brandMetrics?: BrandQualityMetrics
): FeedScore {
  const user: User = {
    id: context.currentUserId || '',
    name: '',
    tokens: 0,
  };
  const friends = context.friends || [];
  
  // Base scoring factors
  let factors: ScoringFactors & { forkDiversity: number; originalBoost: number; userContent: number };
  
  if (isBrandPost(story)) {
    // Use existing brand scoring
    factors = {
      payment: calculatePaymentScore(story),
      urgency: calculateUrgencyScore(story),
      completion: calculateCompletionScore(story),
      social: calculateSocialScore(story, user, friends),
      engagement: calculateEngagementScore(story, user, userMetrics),
      quality: calculateQualityScore(story, brandMetrics),
      recency: calculateRecencyScore(story),
      forkDiversity: 0,
      originalBoost: 0,
      userContent: 0,
    };
    
    // Apply original post boost (non-forks get bonus)
    if (!story.forkedFromStoryId) {
      const config = { ...DEFAULT_FEED_CONFIG, ...context.config };
      factors.originalBoost = config.originalPostBoost;
    }
  } else {
    // User content scoring (non-brand posts)
    factors = {
      payment: 0,
      urgency: 0,
      completion: 0,
      social: calculateSocialScore(story, user, friends),
      engagement: calculateUserEngagement(story),
      quality: 0,
      recency: calculateRecencyScore(story),
      forkDiversity: 0,
      originalBoost: 0,
      userContent: calculateUserContentScore(story, context),
    };
  }
  
  // Calculate total score
  const totalScore = 
    factors.payment +
    factors.urgency +
    factors.completion +
    factors.social +
    factors.engagement +
    factors.quality +
    factors.recency +
    factors.forkDiversity +
    factors.originalBoost +
    factors.userContent;
  
  return {
    storyId: story.id,
    totalScore,
    factors,
    metadata: {
      isFork: !!story.forkedFromStoryId,
      rootStoryId: story.forkedFromStoryId || undefined,
      engagement: getStoryEngagement(story),
      isBrandPost: isBrandPost(story),
    },
  };
}

/**
 * Calculate engagement score for user (non-brand) content
 */
function calculateUserEngagement(story: Story): number {
  const engagement = getStoryEngagement(story);
  // Logarithmic scale to prevent viral content from dominating
  return Math.min(Math.log2(engagement + 1) * 20, 100);
}

/**
 * Calculate base score for user-generated content
 */
function calculateUserContentScore(story: Story, context: FeedContext): number {
  let score = 50; // Base score for user content
  
  // Boost content from friends in "Following" tab
  if (context.feedType === 'following' && context.friends) {
    const isFriendContent = context.friends.some(f => f.id === story.creatorId);
    if (isFriendContent) {
      score += 100; // Major boost for friend content
    }
  }
  
  // Boost completed stories
  if (story.status === 'completed') {
    score += 30;
  }
  
  // Boost stories with multiple contributors (collaborative content)
  const uniqueContributors = new Set(story.contributions?.map(c => c.userId) || []);
  score += Math.min(uniqueContributors.size * 10, 50);
  
  return score;
}

// ============================================================================
// FEED RANKING
// ============================================================================

export interface RankedFeedStory {
  story: Story;
  score: FeedScore;
  rank: number;
}

/**
 * Main feed ranking function.
 * Applies scoring, fork spacing, and diversity rules.
 */
export function rankFeedStories(
  stories: Story[],
  context: FeedContext
): Story[] {
  const config = { ...DEFAULT_FEED_CONFIG, ...context.config };
  
  // Step 1: Filter out reported stories
  let filteredStories = context.reportedStoryIds?.length
    ? stories.filter(s => !context.reportedStoryIds!.includes(s.id))
    : stories;
  
  // Step 2: Filter by feed type and visibility
  filteredStories = filterByFeedType(filteredStories, context);
  
  // Step 3: Group by fork root
  const forkGroups = groupStoriesByForkRoot(filteredStories);
  
  // Step 4: Score all stories
  const scored = filteredStories.map(story => ({
    story,
    score: calculateFeedScore(story, context),
  }));
  
  // Step 5: Sort by score (highest first), with original-before-forks tiebreaker
  scored.sort((a, b) => {
    const scoreDiff = b.score.totalScore - a.score.totalScore;
    if (Math.abs(scoreDiff) > 10) return scoreDiff;
    
    // Tiebreaker: originals before forks
    if (config.prioritizeOriginals) {
      if (!a.score.metadata.isFork && b.score.metadata.isFork) return -1;
      if (a.score.metadata.isFork && !b.score.metadata.isFork) return 1;
    }
    
    // Secondary tiebreaker: higher engagement
    return b.score.metadata.engagement - a.score.metadata.engagement;
  });
  
  // Step 6: Apply fork spacing and diversity rules
  const finalFeed = applyForkDiversity(scored, forkGroups, config);
  
  return finalFeed.map(item => item.story);
}

/**
 * Filter stories based on feed type (For You vs Following)
 */
function filterByFeedType(stories: Story[], context: FeedContext): Story[] {
  const { feedType, currentUserId, friends, groupMembershipIds } = context;
  
  return stories.filter(story => {
    // Group content check
    if (story.groupId && groupMembershipIds) {
      if (!groupMembershipIds.has(story.groupId)) {
        return false;
      }
    }
    
    // Private story visibility
    if (story.visibility === 'private') {
      if (!currentUserId) return false;
      const isCreator = story.creatorId === currentUserId;
      const isParticipant = story.participants?.some(p => p.id === currentUserId);
      if (!isCreator && !isParticipant) return false;
      
      // Hide if waiting for current user
      const isWaiting = story.participants?.some(
        p => p.id === currentUserId && p.status === 'waiting'
      );
      if (isWaiting) return false;
    }
    
    // Following tab: only show content from friends or self
    if (feedType === 'following') {
      if (!currentUserId) return false;
      if (story.creatorId === currentUserId) return true;
      const friendIds = new Set(friends?.map(f => f.id) || []);
      return friendIds.has(story.creatorId);
    }
    
    return true;
  });
}

/**
 * Apply fork spacing and diversity rules to prevent same-root flood.
 */
function applyForkDiversity(
  scored: { story: Story; score: FeedScore }[],
  forkGroups: Map<string, ForkGroup>,
  config: FeedRankingConfig
): typeof scored {
  const result: typeof scored = [];
  
  // Track last position each fork root was shown
  const lastShownPosition = new Map<string, number>();
  // Track count of forks shown per root
  const forkCountPerRoot = new Map<string, number>();
  
  for (const item of scored) {
    const { story, score } = item;
    const rootId = score.metadata.rootStoryId || story.id;
    const isFork = score.metadata.isFork;
    const currentPosition = result.length;
    
    // Always allow original posts (non-forks)
    if (!isFork) {
      result.push(item);
      lastShownPosition.set(rootId, currentPosition);
      continue;
    }
    
    // For forks, apply spacing and count limits
    const lastPos = lastShownPosition.get(rootId);
    const forkCount = forkCountPerRoot.get(rootId) || 0;
    
    // Check spacing requirement
    if (lastPos !== undefined && (currentPosition - lastPos) < config.forkSpacing) {
      // Too close to another story from same root - skip for now
      continue;
    }
    
    // Check max forks limit
    if (forkCount >= config.maxForksPerRoot) {
      continue;
    }
    
    // Check top 20 limit
    if (currentPosition < 20 && forkCount >= config.maxForksInTop20) {
      continue;
    }
    
    // This fork passes all checks
    result.push(item);
    lastShownPosition.set(rootId, currentPosition);
    forkCountPerRoot.set(rootId, forkCount + 1);
  }
  
  return result;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get debug explanation for why a story was ranked at its position
 */
export function explainFeedRanking(item: RankedFeedStory): string {
  const { story, score, rank } = item;
  const { factors, metadata, totalScore } = score;
  
  const lines = [
    `📍 Rank #${rank} | Score: ${totalScore.toFixed(0)}`,
    ``,
    metadata.isBrandPost ? `🏢 Brand Post` : `👤 User Post`,
    metadata.isFork ? `🔗 Fork of: ${metadata.rootStoryId?.slice(0, 8)}...` : `✨ Original`,
    `💬 Engagement: ${metadata.engagement}`,
    ``,
    `Factors:`,
  ];
  
  if (metadata.isBrandPost) {
    lines.push(
      `  💰 Payment: ${factors.payment.toFixed(0)}`,
      `  ⏰ Urgency: ${factors.urgency.toFixed(0)}`,
      `  🎯 Completion: ${factors.completion.toFixed(0)}`,
    );
  } else {
    lines.push(`  👥 User Content: ${factors.userContent.toFixed(0)}`);
  }
  
  lines.push(
    `  🤝 Social: ${factors.social.toFixed(0)}`,
    `  📊 Engagement: ${factors.engagement.toFixed(0)}`,
    `  🆕 Recency: ${factors.recency.toFixed(0)}`,
  );
  
  if (factors.originalBoost > 0) {
    lines.push(`  ⭐ Original Boost: +${factors.originalBoost.toFixed(0)}`);
  }
  
  return lines.join('\n');
}
