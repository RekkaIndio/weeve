/**
 * Discovery Algorithm - Core Engine
 * 
 * PROPRIETARY - DO NOT SHARE
 * Main algorithm logic for ranking brand posts in discovery feeds
 */

import { Story, User, isBrandPost, needsContributors } from '@/lib/store';
import {
  calculatePaymentScore,
  calculateUrgencyScore,
  calculateCompletionScore,
  calculateSocialScore,
  calculateEngagementScore,
  calculateQualityScore,
  calculateRecencyScore,
} from './scoring';
import type {
  DiscoveryContext,
  DiscoveryScore,
  RankedStory,
  ScoringFactors,
  UserEngagementMetrics,
  BrandQualityMetrics,
} from './types';

/**
 * Calculate complete discovery score for a single story
 */
export function calculateDiscoveryScore(
  story: Story,
  user: User,
  context: DiscoveryContext,
  friends: User[] = [],
  userMetrics?: UserEngagementMetrics,
  brandMetrics?: BrandQualityMetrics
): DiscoveryScore {
  // Only score brand posts
  if (!isBrandPost(story)) {
    return {
      storyId: story.id,
      totalScore: 0,
      factors: {
        payment: 0,
        urgency: 0,
        completion: 0,
        social: 0,
        engagement: 0,
        quality: 0,
        recency: 0,
      },
      metadata: {
        isFriend: false,
        isExpiringSoon: false,
        isNearCompletion: false,
        paymentTier: 'none',
      },
    };
  }

  // Calculate individual factors
  const factors: ScoringFactors = {
    payment: calculatePaymentScore(story),
    urgency: calculateUrgencyScore(story),
    completion: calculateCompletionScore(story),
    social: calculateSocialScore(story, user, friends),
    engagement: calculateEngagementScore(story, user, userMetrics),
    quality: calculateQualityScore(story, brandMetrics),
    recency: calculateRecencyScore(story),
  };

  // Calculate total weighted score
const totalScore =
    factors.payment +
    factors.urgency +
    factors.completion +
    factors.social +
    factors.engagement +
    factors.quality +
    factors.recency;

  // Extract metadata
  const isFriend = friends.some(f => f.id === story.creatorId);
  const hoursRemaining = story.visibilityDays && story.created_at
    ? (new Date(story.created_at).getTime() + story.visibilityDays * 86400000 - Date.now()) / 3600000
    : Infinity;
  const isExpiringSoon = hoursRemaining < 24;
  const progress = story.contributions?.length || 0;
  const total = story.maxWeeves || 4;
  const isNearCompletion = (progress / total) >= 0.75;
  const paymentTier = `${story.postType}-${story.visibilityDays || 0}`;

  return {
    storyId: story.id,
    totalScore,
    factors,
    metadata: {
      isFriend,
      isExpiringSoon,
      isNearCompletion,
      paymentTier,
    },
  };
}

/**
 * Rank stories for discovery feed
 * This is the main entry point for the algorithm
 */
export function rankStories(
  stories: Story[],
  user: User,
  context: DiscoveryContext,
  friends: User[] = [],
  userMetrics?: UserEngagementMetrics,
  brandMetricsMap?: Map<string, BrandQualityMetrics>
): RankedStory[] {
  // Filter stories based on variant
  let filteredStories = stories;
  
  switch (context.variant) {
    case 'canon':
      // Only show original Canon posts (not user forks)
      filteredStories = stories.filter(s => s.postType === 'canon' && !s.forkedFromStoryId);
      break;
    case 'seed':
      // Only show original Seed posts (not user forks)
      filteredStories = stories.filter(s => s.postType === 'seed' && !s.forkedFromStoryId);
      break;
    case 'open-slots':
      // Only original brand posts with open slots
      filteredStories = stories.filter(s => isBrandPost(s) && needsContributors(s) && !s.forkedFromStoryId);
      break;
    case 'all':
      // Only original brand posts
      filteredStories = stories.filter(s => isBrandPost(s) && !s.forkedFromStoryId);
      break;
  }

  // Score each story
  const scoredStories = filteredStories.map(story => {
    const brandMetrics = brandMetricsMap?.get(story.brandId || story.creatorId);
    const score = calculateDiscoveryScore(story, user, context, friends, userMetrics, brandMetrics);
    return { story, score };
  });

  // Sort by score (highest first)
  scoredStories.sort((a, b) => b.score.totalScore - a.score.totalScore);

  // Apply diversity filter if enabled (prevent same brand spam)
  let rankedStories = scoredStories;
  if (context.diversityMode) {
    rankedStories = applyDiversityFilter(scoredStories);
  }

  // Apply limit if specified
  if (context.limit) {
    rankedStories = rankedStories.slice(0, context.limit);
  }

  // Add rank numbers
  return rankedStories.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

/**
 * Apply diversity filter to prevent same brand dominating feed
 * Max 2 posts from same brand in top 10, max 3 in top 20
 */
function applyDiversityFilter(stories: { story: Story; score: DiscoveryScore }[]): typeof stories {
  const result: typeof stories = [];
  const brandCounts = new Map<string, number>();

  for (const item of stories) {
    const brandId = item.story.brandId || item.story.creatorId;
    const currentCount = brandCounts.get(brandId) || 0;
    const currentRank = result.length + 1;

    // Diversity rules
    const maxInTop10 = 2;
    const maxInTop20 = 3;
    const maxInFeed = 5;

    let allowPost = true;

    if (currentRank <= 10 && currentCount >= maxInTop10) {
      allowPost = false;
    } else if (currentRank <= 20 && currentCount >= maxInTop20) {
      allowPost = false;
    } else if (currentCount >= maxInFeed) {
      allowPost = false;
    }

    if (allowPost) {
      result.push(item);
      brandCounts.set(brandId, currentCount + 1);
    }
  }

  return result;
}

/**
 * Get explanation for why a story was ranked at its position
 * Useful for debugging and transparency
 */
export function explainRanking(rankedStory: RankedStory): string {
  const { score, rank } = rankedStory;
  const { factors, metadata, totalScore } = score;

  const lines = [
    `Rank #${rank} (Score: ${totalScore.toFixed(0)}/1000)`,
    ``,
    `Factors:`,
    `  💰 Payment: ${factors.payment.toFixed(0)}/250 (${metadata.paymentTier})`,
    `  ⏰ Urgency: ${factors.urgency.toFixed(0)}/200${metadata.isExpiringSoon ? ' 🚨' : ''}`,
    `  🎯 Completion: ${factors.completion.toFixed(0)}/150${metadata.isNearCompletion ? ' ⚡' : ''}`,
    `  👥 Social: ${factors.social.toFixed(0)}/150${metadata.isFriend ? ' 💙' : ''}`,
    `  📊 Engagement: ${factors.engagement.toFixed(0)}/100`,
    `  ✨ Quality: ${factors.quality.toFixed(0)}/80`,
    `  🆕 Recency: ${factors.recency.toFixed(0)}/70`,
  ];

  return lines.join('\n');
}
