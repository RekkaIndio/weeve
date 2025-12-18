import { describe, it, expect } from 'vitest';
import { tokensToUSD, usdToTokens, formatTokensWithValue, formatUSD, getPricingTier } from './token-utils';

describe('token-utils', () => {
  it('converts tokens to USD and back', () => {
    expect(tokensToUSD(100)).toBeCloseTo(10); // 100 tokens * $0.10
    expect(usdToTokens(10)).toBe(100);
  });

  it('formats USD and tokens nicely', () => {
    expect(formatUSD(12.345)).toBe('$12.35');
    expect(formatTokensWithValue(250)).toContain('250');
  });

  it('returns a pricing tier for given token counts', () => {
    const tier = getPricingTier(600);
    expect(tier).toBeDefined();
    expect(typeof tier.priceTokens === 'number').toBeTruthy();
  });
});
