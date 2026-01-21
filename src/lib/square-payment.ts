/**
 * Square Payment Configuration
 * Creates and processes payments for token purchases and brand posts
 */

import { createPayment } from './square-client';

export type PostType = 'seed' | 'canon';

// Token package pricing (amount in pence/cents) - same as Revolut
export const TOKEN_PACKAGES = {
  TOKENS_100: { tokens: 100, amount: 100, currency: 'GBP', name: 'Starter Pack' },
  TOKENS_550: { tokens: 550, amount: 500, currency: 'GBP', name: 'Standard Pack' },
  TOKENS_1000: { tokens: 1000, amount: 1000, currency: 'GBP', name: 'Pro Pack' },
} as const;

// Brand post pricing (amount in pence) - same as Revolut
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
 * Process a token purchase payment using Square
 * @param sourceId - Payment token from Web Payments SDK
 * @param packageKey - The token package to purchase
 * @param userId - User ID for tracking
 * @returns Payment result
 */
export async function processTokenPurchase(
  sourceId: string,
  packageKey: keyof typeof TOKEN_PACKAGES,
  userId: string
): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  const pkg = TOKEN_PACKAGES[packageKey];
  
  try {
    const payment = await createPayment({
      sourceId,
      amount: pkg.amount,
      currency: pkg.currency,
      idempotencyKey: `token_${userId}_${Date.now()}`,
      referenceId: `token_${userId}_${packageKey}`,
      note: `Weeve Tokens - ${pkg.name} (${pkg.tokens} tokens)`,
    });

    return {
      success: payment.status === 'COMPLETED',
      paymentId: payment.id,
    };
  } catch (error) {
    console.error('[Square] Token purchase failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment failed',
    };
  }
}

/**
 * Process a brand post payment using Square
 * @param sourceId - Payment token from Web Payments SDK
 * @param postType - 'seed' or 'canon'
 * @param visibilityDays - Number of days
 * @param storyId - Story ID for tracking
 * @returns Payment result
 */
export async function processBrandPostPayment(
  sourceId: string,
  postType: PostType,
  visibilityDays: number,
  storyId: string
): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  const key = `${postType}-${visibilityDays}`;
  const pricing = BRAND_POST_PRICING[key];

  if (!pricing) {
    return {
      success: false,
      error: `No pricing found for ${key}`,
    };
  }

  try {
    const payment = await createPayment({
      sourceId,
      amount: pricing.amount,
      currency: pricing.currency,
      idempotencyKey: `brand_${storyId}_${Date.now()}`,
      referenceId: `brand_${storyId}`,
      note: `Weeve ${postType.charAt(0).toUpperCase() + postType.slice(1)} Post - ${visibilityDays} day${visibilityDays > 1 ? 's' : ''}`,
    });

    return {
      success: payment.status === 'COMPLETED',
      paymentId: payment.id,
    };
  } catch (error) {
    console.error('[Square] Brand post payment failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment failed',
    };
  }
}

/**
 * Get payment configuration for a token package
 */
export function getTokenPackageInfo(packageKey: keyof typeof TOKEN_PACKAGES) {
  return TOKEN_PACKAGES[packageKey];
}

/**
 * Get payment configuration for a brand post
 */
export function getBrandPostPricing(postType: PostType, visibilityDays: number) {
  const key = `${postType}-${visibilityDays}`;
  return BRAND_POST_PRICING[key] || null;
}

/**
 * Map payment amount to token quantity
 * Used by webhook/payment handler to determine tokens to add
 */
export function getTokensForAmount(amountInMinorUnits: number): number {
  // Find matching package
  for (const pkg of Object.values(TOKEN_PACKAGES)) {
    if (pkg.amount === amountInMinorUnits) {
      return pkg.tokens;
    }
  }

  // Fallback: approximate calculation (10 tokens per £1)
  console.warn(`[Square] Unknown payment amount: ${amountInMinorUnits}. Using fallback calculation.`);
  return Math.floor(amountInMinorUnits / 10);
}

/**
 * Validate if a payment option exists for given parameters
 */
export function hasPaymentOption(postType: PostType, visibilityDays: number): boolean {
  const key = `${postType}-${visibilityDays}`;
  return key in BRAND_POST_PRICING;
}

/**
 * Get all available payment options
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
 * Parse reference ID from payment to determine type and IDs
 */
export function parseReferenceId(referenceId: string): {
  type: 'token' | 'brand' | 'unknown';
  userId?: string;
  packageKey?: string;
  storyId?: string;
} {
  const [type, ...rest] = referenceId.split('_');

  if (type === 'token') {
    return {
      type: 'token',
      userId: rest[0],
      packageKey: rest[1],
    };
  } else if (type === 'brand') {
    return {
      type: 'brand',
      storyId: rest[0],
    };
  }

  return { type: 'unknown' };
}
