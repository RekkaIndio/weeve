/**
 * Discovery Algorithm - Type Definitions
 * 
 * PROPRIETARY - DO NOT SHARE
 * Core types for the multi-factor discovery scoring system
 */

import { Story, User } from '@/lib/store';

/**
 * Context provided to the discovery algorithm
 */
export interface DiscoveryContext {
  variant: 'canon' | 'seed' | 'open-slots' | 'all';
  limit?: number;
  diversityMode?: boolean; // Prevent same brand spam
  userLocation?: string;
  sessionContext?: {
    scrollDepth: number;
    sessionDuration: number;
    engagementRate: number;
  };
}

/**
 * Individual scoring factors
 */
export interface ScoringFactors {
  payment: number;      // 0-250 points (25% weight)
  urgency: number;      // 0-200 points (20% weight)
  completion: number;   // 0-150 points (15% weight)
  social: number;       // 0-150 points (15% weight)
  engagement: number;   // 0-100 points (10% weight)
  quality: number;      // 0-80 points (8% weight)
  recency: number;      // 0-70 points (7% weight)
}

/**
 * Complete discovery score for a story
 */
export interface DiscoveryScore {
  storyId: string;
  totalScore: number;     // 0-1000 weighted sum
  factors: ScoringFactors;
  metadata: {
    isFriend: boolean;
    isExpiringSoon: boolean;
    isNearCompletion: boolean;
    paymentTier: string;
  };
}

/**
 * Ranked story with score
 */
export interface RankedStory {
  story: Story;
  score: DiscoveryScore;
  rank: number;
}

/**
 * User engagement metrics for personalization
 */
export interface UserEngagementMetrics {
  brandEngagementRate: number;      // 0-1, how often user engages with brand posts
  contributionRate: number;          // 0-1, how often user contributes vs views
  averageSessionTime: number;        // seconds
  preferredContentTypes: string[];   // ['canon', 'seed', etc]
  engagedBrands: string[];          // brand IDs user has interacted with
}

/**
 * Brand quality metrics
 */
export interface BrandQualityMetrics {
  approvalRate: number;              // 0-1, % of contributions approved
  completionRate: number;            // 0-1, % of posts that reach full slots
  averageTimeToFill: number;         // hours
  verified: boolean;
  trustScore: number;                // 0-1, composite quality metric
}

/**
 * Analytics event for tracking algorithm performance
 */
export interface AlgorithmAnalytics {
  storyId: string;
  userId: string;
  score: number;
  factors: ScoringFactors;
  action: 'impression' | 'click' | 'contribution' | 'skip';
  timestamp: number;
  variant: string;
}
