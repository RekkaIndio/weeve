/**
 * Discovery Algorithm - Scoring Functions
 * 
 * PROPRIETARY - DO NOT SHARE
 * Individual factor calculations for the multi-factor scoring system
 */

import { Story, User, isBrandPost, getSlotProgress } from '@/lib/store';
import type { ScoringFactors, BrandQualityMetrics, UserEngagementMetrics } from './types';

/**
 * Calculate payment-based score (25% of total)
 * Higher-paying posts get significantly better visibility
 */
export function calculatePaymentScore(story: Story): number {
  if (!isBrandPost(story)) return 0;

  const pricing: Record<string, number> = {
    'canon-14': 1000,  // Highest tier - 14 day visibility
    'canon-7': 800,    // 7 day visibility
    'canon-3': 600,    // 3 day visibility
    'canon-1': 400,    // 1 day visibility
    'seed-14': 800,    // Increased visibility for long-running seeds
    'seed-7': 600,
    'seed-3': 400,
    'seed-1': 200,
  };

  const visibilityDays = story.visibilityDays || 0;
  const key = `${story.postType}-${visibilityDays}`;
  const baseScore = pricing[key] || 0;

  // Paid posts get 1.5x multiplier vs organic (free) posts
  const isPaid = visibilityDays > 0;
  const paidMultiplier = isPaid ? 1.5 : 1.0;

  // Normalize to 0-250 range (25% of 1000 max score)
  return (baseScore / 1000) * 250 * paidMultiplier;
}

/**
 * Calculate urgency score based on time remaining (20% of total)
 * Posts expiring soon get emergency visibility boost
 */
export function calculateUrgencyScore(story: Story): number {
  if (!story.visibilityDays || !story.created_at) return 50; // Low baseline for non-expiring posts

  const createdAt = new Date(story.created_at).getTime();
  const expiresAt = createdAt + (story.visibilityDays * 86400000); // days to ms
  const now = Date.now();
  const hoursRemaining = (expiresAt - now) / 3600000;

  // Exponential urgency curve as deadline approaches
  if (hoursRemaining < 0) return 0;           // Expired - hide it
  if (hoursRemaining < 6) return 200;         // 🚨 EMERGENCY - <6 hours
  if (hoursRemaining < 24) return 180;        // 🔥 Very urgent - <1 day
  if (hoursRemaining < 48) return 150;        // ⚡ Urgent - <2 days
  if (hoursRemaining < 72) return 100;        // ⏰ Soon - <3 days

  // NEW: Boost Seed posts that have open slots (Opportunity Urgency)
  // This helps "get content on there as quickly as possible"
  if (story.postType === 'seed') {
    const progress = getSlotProgress(story);
    // If < 80% full, boost it to encourage participation
    if (progress && !progress.isComplete && progress.percentage < 80) {
      return 160; // High urgency to fill slots
    }
  }

  return 50; // Plenty of time remaining
}

/**
 * Calculate completion momentum score (15% of total)
 * Posts near completion get boosted to finish them
 */
export function calculateCompletionScore(story: Story): number {
  if (!isBrandPost(story)) return 0;

  const progress = getSlotProgress(story);
  if (!progress) return 0;

  const percentFilled = progress.percentage;

  // Sigmoid-like curve - massive boost when close to completion
  if (percentFilled >= 75) return 150;  // 3/4 or better - FINISH IT NOW
  if (percentFilled >= 50) return 120;  // 2/4 filled - good momentum
  if (percentFilled >= 25) return 80;   // 1/4 filled - getting started

  return 40; // 0/4 - just created, needs initial push
}

/**
 * Calculate social network score (15% of total)
 * Leverage friend connections for quality and engagement
 */
export function calculateSocialScore(story: Story, user: User, friends: User[] = []): number {
  const creator = story.creatorId;
  let score = 0;

  // Is the brand creator a friend or connection?
  const isFriend = friends.some(f => f.id === creator);
  if (isFriend) score += 80; // Major boost for friend's posts

  // Do user's friends engage with this brand?
  const friendEngagements = countFriendEngagements(story, friends);
  score += Math.min(friendEngagements * 10, 50); // Up to +50 for viral friend activity

  // Has user previously engaged with this brand?
  const userEngaged = hasUserEngagedWithBrand(user, creator);
  if (userEngaged) score += 20;

  return Math.min(score, 150); // Cap at max
}

/**
 * Calculate engagement-based personalization score (10% of total)
 * Show users content similar to what they've engaged with
 */
export function calculateEngagementScore(story: Story, user: User, metrics?: UserEngagementMetrics): number {
  let score = 50; // Neutral baseline

  // User's historical engagement with brand content
  const brandEngagementRate = metrics?.brandEngagementRate || 0.5;
  score += brandEngagementRate * 30; // Up to +30 for high engagement users

  // This specific post's quality signals (likes, comments)
  const contributionCount = Math.max(story.contributions?.length || 0, 1);
  const likeCount = story.likes || 0;
  const commentCount = story.comments?.length || 0;
  const postEngagement = (likeCount + commentCount * 2) / contributionCount;
  score += Math.min(postEngagement * 10, 20); // Up to +20 for popular posts

  return Math.min(score, 100);
}

/**
 * Calculate quality score (8% of total)
 * Reward verified brands and quality contributors
 */
export function calculateQualityScore(story: Story, brandMetrics?: BrandQualityMetrics): number {
  let score = 40; // Base score

  // Brand verification status
  if (brandMetrics?.verified) score += 30;

  // Historical approval rate for this brand
  const approvalRate = brandMetrics?.approvalRate || 0.7;
  score += approvalRate * 20; // Up to +20

  // Post-specific quality signals
  if (story.productUrl) score += 10; // Has product link = serious brand

  return Math.min(score, 80);
}

/**
 * Calculate recency score (7% of total)
 * Fresh content gets slight boost without dominating
 */
export function calculateRecencyScore(story: Story): number {
  if (!story.created_at) return 10;

  const createdAt = new Date(story.created_at).getTime();
  const hoursOld = (Date.now() - createdAt) / 3600000;

  // Gentle decay curve - fresh is good but not overwhelming
  if (hoursOld < 1) return 70;    // Just posted - very fresh
  if (hoursOld < 6) return 60;    // <6 hours - fresh
  if (hoursOld < 24) return 50;   // Today
  if (hoursOld < 72) return 30;   // This week

  return 10; // Older content can still rank if other factors are strong
}

/**
 * Helper: Count how many of user's friends have engaged with this story
 */
function countFriendEngagements(story: Story, friends: User[]): number {
  if (!friends || friends.length === 0) return 0;

  const friendIds = new Set(friends.map(f => f.id));
  let count = 0;

  // Count friend likes
  if (story.likedBy) {
    count += story.likedBy.filter(id => friendIds.has(id)).length;
  }

  // Count friend comments
  if (story.comments) {
    count += story.comments.filter(c => friendIds.has(c.userId)).length;
  }

  // Count friend contributions
  if (story.contributions) {
    count += story.contributions.filter(c => friendIds.has(c.userId)).length;
  }

  return count;
}

/**
 * Helper: Check if user has previously engaged with this brand
 */
function hasUserEngagedWithBrand(user: User, brandId: string): boolean {
  // Check if user has any interactions with this brand's stories
  // This would typically query user's history - placeholder for now
  return false; // TODO: Implement when user engagement tracking is added
}
