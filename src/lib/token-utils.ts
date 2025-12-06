// Token utilities for consistent token value calculations and display

export const TOKEN_VALUE_USD = 0.10; // $0.10 per token
export const MIN_PAYOUT_TOKENS = 500; // $50 minimum
export const MIN_PAYOUT_USD = MIN_PAYOUT_TOKENS * TOKEN_VALUE_USD;

/**
 * Convert tokens to USD
 */
export function tokensToUSD(tokens: number): number {
    return tokens * TOKEN_VALUE_USD;
}

/**
 * Convert USD to tokens
 */
export function usdToTokens(usd: number): number {
    return Math.floor(usd / TOKEN_VALUE_USD);
}

/**
 * Format tokens with USD value
 * @example formatTokensWithValue(50) => "50 tokens ($5.00)"
 */
export function formatTokensWithValue(tokens: number): string {
    const usd = tokensToUSD(tokens);
    return `${tokens} tokens ($${usd.toFixed(2)})`;
}

/**
 * Format USD value
 */
export function formatUSD(amount: number): string {
    return `$${amount.toFixed(2)}`;
}

/**
 * Get pricing tier label and color
 */
export function getPricingTier(tokens: number): {
    label: string;
    color: string;
    bgColor: string;
    description: string;
} {
    if (tokens === 0) {
        return {
            label: 'Free',
            color: 'text-green-400',
            bgColor: 'bg-green-500/10',
            description: 'Anyone can contribute for free',
        };
    } else if (tokens <= 10) {
        return {
            label: 'Low',
            color: 'text-green-400',
            bgColor: 'bg-green-500/10',
            description: 'Very affordable for most users',
        };
    } else if (tokens <= 50) {
        return {
            label: 'Medium',
            color: 'text-yellow-400',
            bgColor: 'bg-yellow-500/10',
            description: 'Moderate cost, good for quality control',
        };
    } else if (tokens <= 100) {
        return {
            label: 'High',
            color: 'text-orange-400',
            bgColor: 'bg-orange-500/10',
            description: 'Premium pricing for exclusive content',
        };
    } else {
        return {
            label: 'Premium',
            color: 'text-red-400',
            bgColor: 'bg-red-500/10',
            description: 'Very expensive, for special collaborations',
        };
    }
}

/**
 * Suggested pricing tiers
 */
export const SUGGESTED_PRICES = [
    { tokens: 0, label: 'Free', usd: 0 },
    { tokens: 5, label: 'Tip Jar', usd: 0.5 },
    { tokens: 10, label: 'Coffee', usd: 1 },
    { tokens: 25, label: 'Lunch', usd: 2.5 },
    { tokens: 50, label: 'Premium', usd: 5 },
    { tokens: 100, label: 'VIP', usd: 10 },
];
