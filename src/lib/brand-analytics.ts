/**
 * Brand Analytics Utilities
 * Handles fetching and calculating analytics data for brand accounts
 */

import { supabase } from './supabase';
import { getPrice } from './brand-pricing';

export interface BrandPostAnalytics {
  id: string;
  title: string;
  postType: 'canon' | 'seed';
  createdAt: string;
  slotCount: number;
  filledSlots: number;
  likes: number;
  comments: number;
  contributions: number;
  revenue: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  paymentStatus: string | null;
  productUrl?: string;
  isFeatured?: boolean;
}

export interface BrandAnalyticsOverview {
  totalPosts: number;
  canonPosts: number;
  seedPosts: number;
  totalRevenue: number;
  totalContributions: number;
  avgEngagementRate: number;
  totalLikes: number;
  totalComments: number;
}

export interface BrandAnalyticsData {
  overview: BrandAnalyticsOverview;
  posts: BrandPostAnalytics[];
}

/**
 * Fetch comprehensive analytics data for a brand user
 */
export async function fetchBrandAnalytics(brandUserId: string): Promise<BrandAnalyticsData> {
  try {
    // Fetch all brand posts (Canon & Seed) created by this user
    const { data: stories, error } = await supabase
      .from('stories')
      .select(`
        id,
        title,
        post_type,
        created_at,
        max_weeves,
        canon_slots,
        payment_status,
        product_url,
        is_featured,
        contributions (
          id,
          user_id,
          approval_status
        ),
        story_likes (user_id),
        story_comments (id)
      `)
      .eq('creator_id', brandUserId)
      .in('post_type', ['canon', 'seed'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching brand analytics:', error);
      throw error;
    }

    if (!stories || stories.length === 0) {
      return {
        overview: {
          totalPosts: 0,
          canonPosts: 0,
          seedPosts: 0,
          totalRevenue: 0,
          totalContributions: 0,
          avgEngagementRate: 0,
          totalLikes: 0,
          totalComments: 0,
        },
        posts: [],
      };
    }

    // Process each post
    const posts: BrandPostAnalytics[] = stories.map((story: any) => {
      const postType = story.post_type as 'canon' | 'seed';
      const slotCount = story.max_weeves || 0;
      
      // Calculate slot fill information
      const contributions = story.contributions || [];
      const filledSlots = contributions.length;
      
      // Count approval statuses
      const approvedCount = contributions.filter(
        (c: any) => c.approval_status === 'approved'
      ).length;
      const rejectedCount = contributions.filter(
        (c: any) => c.approval_status === 'rejected'
      ).length;
      const pendingCount = contributions.filter(
        (c: any) => c.approval_status === 'pending'
      ).length;
      
      // Calculate engagement
      const likes = story.story_likes?.length || 0;
      const comments = story.story_comments?.length || 0;
      
      // Calculate revenue from pricing
      const revenue = getPrice(postType, slotCount) || 0;

      return {
        id: story.id,
        title: story.title,
        postType,
        createdAt: story.created_at,
        slotCount,
        filledSlots,
        likes,
        comments,
        contributions: contributions.length,
        revenue,
        approvedCount,
        rejectedCount,
        pendingCount,
        paymentStatus: story.payment_status || 'completed',
        productUrl: story.product_url,
        isFeatured: story.is_featured || false,
      };
    });

    // Calculate overview statistics
    const totalPosts = posts.length;
    const canonPosts = posts.filter(p => p.postType === 'canon').length;
    const seedPosts = posts.filter(p => p.postType === 'seed').length;
    const totalRevenue = posts.reduce((sum, p) => sum + p.revenue, 0);
    const totalContributions = posts.reduce((sum, p) => sum + p.contributions, 0);
    const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0);
    const totalComments = posts.reduce((sum, p) => sum + p.comments, 0);
    
    // Calculate average engagement rate (total engagement / total posts)
    const totalEngagement = totalLikes + totalComments;
    const avgEngagementRate = totalPosts > 0 ? totalEngagement / totalPosts : 0;

    return {
      overview: {
        totalPosts,
        canonPosts,
        seedPosts,
        totalRevenue,
        totalContributions,
        avgEngagementRate,
        totalLikes,
        totalComments,
      },
      posts,
    };
  } catch (error) {
    console.error('Error in fetchBrandAnalytics:', error);
    throw error;
  }
}

/**
 * Filter brand analytics posts by criteria
 */
export function filterBrandPosts(
  posts: BrandPostAnalytics[],
  filters: {
    postType?: 'all' | 'canon' | 'seed';
    dateRange?: 'all' | '7d' | '30d' | '90d';
  }
): BrandPostAnalytics[] {
  let filtered = [...posts];

  // Filter by post type
  if (filters.postType && filters.postType !== 'all') {
    filtered = filtered.filter(p => p.postType === filters.postType);
  }

  // Filter by date range
  if (filters.dateRange && filters.dateRange !== 'all') {
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (filters.dateRange) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        cutoffDate.setDate(now.getDate() - 90);
        break;
    }
    
    filtered = filtered.filter(p => new Date(p.createdAt) >= cutoffDate);
  }

  return filtered;
}

/**
 * Sort brand analytics posts
 */
export function sortBrandPosts(
  posts: BrandPostAnalytics[],
  sortBy: 'date' | 'revenue' | 'engagement' | 'contributions'
): BrandPostAnalytics[] {
  const sorted = [...posts];

  switch (sortBy) {
    case 'date':
      return sorted.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case 'revenue':
      return sorted.sort((a, b) => b.revenue - a.revenue);
    case 'engagement':
      return sorted.sort((a, b) => 
        (b.likes + b.comments) - (a.likes + a.comments)
      );
    case 'contributions':
      return sorted.sort((a, b) => b.contributions - a.contributions);
    default:
      return sorted;
  }
}
