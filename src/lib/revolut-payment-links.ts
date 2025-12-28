/**
 * Revolut Payment Links Configuration
 * Creates payment checkout URLs for token purchases and brand posts
 */

import { createOrder, getCheckoutUrl } from './revolut-client';

export type PostType = 'seed' | 'canon';

// Token package pricing (amount in pence/cents)
export const TOKEN_PACKAGES = {
  TOKENS_100: { tokens: 100, amount: 100, currency: 'GBP', name: 'Starter Pack' },
  TOKENS_550: { tokens: 550, amount: 500, currency: 'GBP', name: 'Standard Pack' },
  TOKENS_1000: { tokens: 1000, amount: 1000, currency: 'GBP', name: 'Pro Pack' },
} as const;

// Brand post pricing (amount in pence)
export const BRAND_POST_PRICING: Record<string, { amount: number; currency: string }> = {
  'seed-1': { amount: 500, currency: 'GBP' },   // £5 for 1 day
  'seed-3': { amount: 1000, currency: 'GBP' },  // £10 for 3 days
  'seed-7': { amount: 2000, currency: 'GBP' },  // £20 for 7 days
  'seed-14': { amount: 3500, currency: 'GBP' }, // £35 for 14 days
  'canon-1': { amount: 1000, currency: 'GBP' },  // £10 for 1 day
  'canon-3': { amount: 2000, currency: 'GBP' },  // £20 for 3 days
  'canon-7': { amount: 3500, currency: 'GBP' },  // £35 for 7 days
  'canon-14': { amount: 6000, currency: 'GBP' }, // £60 for 14 days
};

/**
 * Create a payment link for purchasing tokens
 * @param packageKey - The token package to purchase
 * @param userId - User ID for tracking
 * @returns Checkout URL
 */
export async function createTokenPurchaseLink(
  packageKey: keyof typeof TOKEN_PACKAGES,
  userId: string
): Promise<string> {
  const pkg = TOKEN_PACKAGES[packageKey];
  
  const order = await createOrder({
    amount: pkg.amount,
    currency: pkg.currency,
    description: `Weeve Tokens - ${pkg.name} (${pkg.tokens} tokens)`,
    merchantOrderExtRef: `token_${userId}_${Date.now()}`,
    metadata: {
      type: 'token_purchase',
      user_id: userId,
      package: packageKey,
      tokens: pkg.tokens.toString(),
    },
  });

  return getCheckoutUrl(order.public_id);
}

/**
 * Get the payment link for a specific post type and visibility duration
 * Creates a Revolut order and returns the checkout URL
 * 
 * @param postType - 'seed' or 'canon'
 * @param visibilityDays - Number of days (1, 3, 7, or 14)
 * @param storyId - Story ID for tracking
 * @returns Revolut checkout URL, or null if not found
 */
export async function getPaymentLink(
  postType: PostType,
  visibilityDays: number,
  storyId: string
): Promise<string | null> {
  const key = `${postType}-${visibilityDays}`;
  const pricing = BRAND_POST_PRICING[key];
  
  if (!pricing) {
    console.error(`No pricing found for ${key}`);
    return null;
  }

  try {
    const order = await createOrder({
      amount: pricing.amount,
      currency: pricing.currency,
      description: `Weeve ${postType.charAt(0).toUpperCase() + postType.slice(1)} Post - ${visibilityDays} day${visibilityDays > 1 ? 's' : ''}`,
      merchantOrderExtRef: `brand_${storyId}`,
      metadata: {
        type: 'brand_post',
        story_id: storyId,
        post_type: postType,
        visibility_days: visibilityDays.toString(),
      },
    });

    return getCheckoutUrl(order.public_id);
  } catch (error) {
    console.error('[Revolut] Failed to create payment link:', error);
    return null;
  }
}

/**
 * Get all available payment link configurations
 */
export function getAvailablePaymentOptions(): Array<{
  postType: PostType;
  visibilityDays: number;
  key: string;
}> {
  return Object.keys(BRAND_POST_PRICING).map(key => {
    const [postType, days] = key.split('-');
    return {
      postType: postType as PostType,
      visibilityDays: parseInt(days),
      key,
    };
  });
}

/**
 * Validate if a payment link exists for given parameters
 */
export function hasPaymentLink(postType: PostType, visibilityDays: number): boolean {
  const key = `${postType}-${visibilityDays}`;
  return key in BRAND_POST_PRICING;
}

/**
 * Map payment amount to token quantity
 * Used by webhook handler to determine tokens to add
 */
export function getTokensForAmount(amountInMinorUnits: number): number {
  // Find matching package
  for (const pkg of Object.values(TOKEN_PACKAGES)) {
    if (pkg.amount === amountInMinorUnits) {
      return pkg.tokens;
    }
  }
  
  // Fallback: approximate calculation (10 tokens per £1)
  console.warn(`[Revolut] Unknown payment amount: ${amountInMinorUnits}. Using fallback calculation.`);
  return Math.floor(amountInMinorUnits / 10);
}
