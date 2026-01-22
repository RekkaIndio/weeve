/**
 * PayPal Payment Configuration
 * Creates and processes payments for token purchases and brand posts
 */

import { createOrder, captureOrder as capturePayPalOrder, PayPalCapture } from './paypal-client';

export type PostType = 'seed' | 'canon';

// Token package pricing (amount in pence/cents) - same as Square
export const TOKEN_PACKAGES = {
  TOKENS_100: { tokens: 100, amount: 100, currency: 'GBP', name: 'Starter Pack' },
  TOKENS_550: { tokens: 550, amount: 500, currency: 'GBP', name: 'Standard Pack' },
  TOKENS_1000: { tokens: 1000, amount: 1000, currency: 'GBP', name: 'Pro Pack' },
} as const;

// Brand post pricing (amount in pence)
export const BRAND_POST_PRICING: Record<string, { amount: number; currency: string }> = {
  'seed-1': { amount: 5000, currency: 'GBP' },    // £50 for 1 day
  'seed-3': { amount: 15000, currency: 'GBP' },   // £150 for 3 days
  'seed-7': { amount: 35000, currency: 'GBP' },   // £350 for 7 days
  'seed-14': { amount: 70000, currency: 'GBP' },  // £700 for 14 days
  'canon-1': { amount: 10000, currency: 'GBP' },  // £100 for 1 day
  'canon-3': { amount: 30000, currency: 'GBP' },  // £300 for 3 days
  'canon-7': { amount: 70000, currency: 'GBP' },  // £700 for 7 days
  'canon-14': { amount: 140000, currency: 'GBP' }, // £1400 for 14 days
};

/**
 * Create a PayPal order for token purchase
 */
export async function createTokenOrder(
  packageKey: keyof typeof TOKEN_PACKAGES,
  userId: string
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const pkg = TOKEN_PACKAGES[packageKey];
  
  try {
    const order = await createOrder({
      amount: pkg.amount,
      currency: pkg.currency,
      referenceId: `token_${userId}_${packageKey}`,
      description: `Weeve Tokens - ${pkg.name} (${pkg.tokens} tokens)`,
    });

    return {
      success: true,
      orderId: order.id,
    };
  } catch (error) {
    console.error('[PayPal] Token order creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Order creation failed',
    };
  }
}

/**
 * Create a PayPal order for brand post payment
 */
export async function createBrandPostOrder(
  postType: PostType,
  visibilityDays: number,
  storyId: string
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const key = `${postType}-${visibilityDays}`;
  const pricing = BRAND_POST_PRICING[key];

  if (!pricing) {
    return {
      success: false,
      error: `No pricing found for ${key}`,
    };
  }

  try {
    const order = await createOrder({
      amount: pricing.amount,
      currency: pricing.currency,
      referenceId: `brand_${storyId}`,
      description: `Weeve ${postType.charAt(0).toUpperCase() + postType.slice(1)} Post - ${visibilityDays} day${visibilityDays > 1 ? 's' : ''}`,
    });

    return {
      success: true,
      orderId: order.id,
    };
  } catch (error) {
    console.error('[PayPal] Brand post order creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Order creation failed',
    };
  }
}

/**
 * Capture a PayPal order (finalize payment)
 */
export async function captureOrder(
  orderId: string
): Promise<{ success: boolean; captureId?: string; referenceId?: string; amount?: number; error?: string }> {
  try {
    const capture = await capturePayPalOrder(orderId);
    
    if (capture.status !== 'COMPLETED') {
      return {
        success: false,
        error: `Payment not completed. Status: ${capture.status}`,
      };
    }

    const purchaseUnit = capture.purchase_units[0];
    const captureDetails = purchaseUnit?.payments?.captures?.[0];

    return {
      success: true,
      captureId: captureDetails?.id,
      referenceId: purchaseUnit?.reference_id,
      amount: captureDetails ? Math.round(parseFloat(captureDetails.amount.value) * 100) : undefined,
    };
  } catch (error) {
    console.error('[PayPal] Order capture failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment capture failed',
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
 */
export function getTokensForAmount(amountInMinorUnits: number): number {
  for (const pkg of Object.values(TOKEN_PACKAGES)) {
    if (pkg.amount === amountInMinorUnits) {
      return pkg.tokens;
    }
  }

  // Fallback: approximate calculation (10 tokens per £1)
  console.warn(`[PayPal] Unknown payment amount: ${amountInMinorUnits}. Using fallback calculation.`);
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
