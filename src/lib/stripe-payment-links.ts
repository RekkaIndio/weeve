/**
 * Stripe Payment Links Configuration
 * Maps brand post types and visibility durations to Stripe payment URLs
 */

export type PostType = 'seed' | 'canon';

/**
 * Stripe payment link mapping
 * Key format: "{postType}-{visibilityDays}"
 */
export const STRIPE_PAYMENT_LINKS: Record<string, string> = {
  // Seed pricing (1, 3, 7, 14 days)
  'seed-1': 'https://buy.stripe.com/test_8x2cN4aet6hI0yP05s2oE00',
  'seed-3': 'https://buy.stripe.com/test_aFafZg72h49Aa9p19w2oE01',
  'seed-7': 'https://buy.stripe.com/test_5kQeVcgCRfSi6Xd19w2oE02',
  'seed-14': 'https://buy.stripe.com/test_00wcN4euJ21s6Xdg4q2oE03',
  
  // Canon pricing (1, 3, 7, 14 days)
  'canon-1': 'https://buy.stripe.com/test_6oU3cudqFfSigxN9G22oE04',
  'canon-3': 'https://buy.stripe.com/test_9B69ASeuJcG695l05s2oE05',
  'canon-7': 'https://buy.stripe.com/test_6oU4gyaetaxYepF3hE2oE06',
  'canon-14': 'https://buy.stripe.com/test_00wdR84U96hIa9p3hE2oE07',
};

/**
 * Get the Stripe payment link for a specific post type and visibility duration
 * 
 * Note: Stripe Payment Links only support a success redirect URL (configured in Stripe Dashboard).
 * Users cannot "cancel" a payment link - they either complete payment or close the browser.
 * 
 * @param postType - 'seed' or 'canon'
 * @param visibilityDays - Number of days (1, 3, 7, or 14)
 * @param storyId - Story ID to pass to Stripe for tracking
 * @returns Stripe payment URL, or null if not found
 */
export function getPaymentLink(
  postType: PostType,
  visibilityDays: number,
  storyId: string
): string | null {
  const key = `${postType}-${visibilityDays}`;
  const baseUrl = STRIPE_PAYMENT_LINKS[key];
  
  if (!baseUrl) {
    console.error(`No payment link found for ${key}`);
    return null;
  }
  
  // Payment Links are pre-configured in Stripe Dashboard with the success redirect URL.
  // We just append the story ID as client_reference_id for tracking purposes.
  const url = new URL(baseUrl);
  url.searchParams.set('client_reference_id', storyId);
  
  return url.toString();
}

/**
 * Get all available payment link configurations
 */
export function getAvailablePaymentOptions(): Array<{
  postType: PostType;
  visibilityDays: number;
  key: string;
}> {
  return Object.keys(STRIPE_PAYMENT_LINKS).map(key => {
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
  return key in STRIPE_PAYMENT_LINKS;
}
