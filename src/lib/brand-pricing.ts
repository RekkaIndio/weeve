/**
 * Brand Pricing Utilities
 * Handles pricing lookups for Canon and Seed brand posts
 */

import { supabase } from './supabase';

export type PostType = 'canon' | 'seed';

export interface BrandPricingTier {
  slot_count: number;
  price_gbp: number;
}

/**
 * Seed pricing tiers (standard tier - half of Canon)
 */
export const SEED_PRICING: Record<number, number> = {
  1: 50,
  3: 150,
  7: 350,
  14: 700,
};

/**
 * Canon pricing tiers (premium tier - double Seed)
 */
export const CANON_PRICING: Record<number, number> = {
  1: 100,
  3: 300,
  7: 700,
  14: 1400,
};

/**
 * Get all available pricing tiers for a post type
 */
export function getPricingTiers(postType: PostType): BrandPricingTier[] {
  const pricing = postType === 'seed' ? SEED_PRICING : CANON_PRICING;
  
  return Object.entries(pricing).map(([slotCount, priceGbp]) => ({
    slot_count: parseInt(slotCount),
    price_gbp: priceGbp,
  }));
}

/**
 * Get price for a specific post type and slot count
 */
export function getPrice(postType: PostType, slotCount: number): number | null {
  const pricing = postType === 'seed' ? SEED_PRICING : CANON_PRICING;
  return pricing[slotCount] || null;
}

/**
 * Format price in GBP
 */
export function formatPrice(price: number): string {
  return `£${price.toLocaleString('en-GB', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  })}`;
}

/**
 * Get all available slot counts for creating brand posts
 */
export function getAvailableSlotCounts(): number[] {
  return [1, 3, 7, 14];
}

/**
 * Fetch pricing from database (for server-side or when you need fresh data)
 */
export async function fetchBrandPricing(postType: PostType): Promise<BrandPricingTier[]> {
  const { data, error } = await supabase
    .rpc('get_all_brand_pricing', { p_post_type: postType });
  
  if (error) {
    console.error('Error fetching brand pricing:', error);
    return getPricingTiers(postType); // Fallback to hardcoded values
  }
  
  return data || [];
}

/**
 * Fetch a specific price from database
 */
export async function fetchPrice(postType: PostType, slotCount: number): Promise<number | null> {
  const { data, error } = await supabase
    .rpc('get_brand_pricing', { 
      p_post_type: postType,
      p_slot_count: slotCount 
    });
  
  if (error) {
    console.error('Error fetching brand price:', error);
    return getPrice(postType, slotCount); // Fallback to hardcoded value
  }
  
  return data;
}

/**
 * Get pricing comparison between Canon and Seed
 */
export function getPricingComparison(slotCount: number): {
  slotCount: number;
  seedPrice: number | null;
  canonPrice: number | null;
  savings: number | null;
} {
  const seedPrice = getPrice('seed', slotCount);
  const canonPrice = getPrice('canon', slotCount);
  const savings = seedPrice && canonPrice ? seedPrice - canonPrice : null;
  
  return {
    slotCount,
    seedPrice,
    canonPrice,
    savings,
  };
}
