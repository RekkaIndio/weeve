/**
 * Profanity Filter Utility
 * 
 * Uses the obscenity library to detect and filter profanity, hate speech,
 * and other inappropriate content from user-generated text.
 */

import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from 'obscenity';

// Create matcher with English dataset and recommended transformers
// Transformers handle leetspeak, repeated characters, etc.
const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

/**
 * Check if text contains any profanity or inappropriate content
 * @param text - The text to check
 * @returns true if profanity is detected, false otherwise
 */
export function containsProfanity(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  return matcher.hasMatch(text);
}

/**
 * Get all profanity matches found in text
 * Useful for debugging or detailed reporting
 * @param text - The text to check
 * @returns Array of matched terms info
 */
export function getProfanityMatches(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  const matches = matcher.getAllMatches(text);
  return matches.map(match => text.substring(match.startIndex, match.endIndex));
}

/**
 * Replace profanity in text with asterisks
 * @param text - The text to filter
 * @param replacement - Character to use for replacement (default: '*')
 * @returns Filtered text with profanity replaced
 */
export function filterProfanity(text: string, replacement: string = '*'): string {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  const matches = matcher.getAllMatches(text);
  if (matches.length === 0) {
    return text;
  }
  
  let result = text;
  // Process matches in reverse order to maintain correct indices
  const sortedMatches = [...matches].sort((a, b) => b.startIndex - a.startIndex);
  
  for (const match of sortedMatches) {
    const length = match.endIndex - match.startIndex;
    const censored = replacement.repeat(length);
    result = result.substring(0, match.startIndex) + censored + result.substring(match.endIndex);
  }
  
  return result;
}

/**
 * Validate story content for profanity
 * A convenience function that checks both title and description
 * @returns Object with validation result and error message if applicable
 */
export function validateStoryContent(
  title: string,
  description: string
): { isValid: boolean; error?: string } {
  const titleHasProfanity = containsProfanity(title);
  const descriptionHasProfanity = containsProfanity(description);
  
  if (titleHasProfanity || descriptionHasProfanity) {
    return {
      isValid: false,
      error: 'Your story contains inappropriate language. Please revise and try again.',
    };
  }
  
  return { isValid: true };
}
