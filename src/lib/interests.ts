/**
 * Interest Categories for User Preferences
 * 
 * These are predefined categories users can select to personalize their feed.
 * Interests are stored privately and used for discovery recommendations.
 */

export const INTEREST_CATEGORIES = [
  { id: 'sports', label: 'Sports', icon: '🏀', color: '#FF6B35' },
  { id: 'technology', label: 'Technology', icon: '💻', color: '#00A8E8' },
  { id: 'music', label: 'Music', icon: '🎵', color: '#8B5CF6' },
  { id: 'gaming', label: 'Gaming', icon: '🎮', color: '#10B981' },
  { id: 'fashion', label: 'Fashion', icon: '👗', color: '#EC4899' },
  { id: 'food', label: 'Food & Cooking', icon: '🍳', color: '#F59E0B' },
  { id: 'travel', label: 'Travel', icon: '✈️', color: '#06B6D4' },
  { id: 'fitness', label: 'Fitness', icon: '💪', color: '#EF4444' },
  { id: 'art', label: 'Art & Design', icon: '🎨', color: '#A855F7' },
  { id: 'movies', label: 'Movies & TV', icon: '🎬', color: '#6366F1' },
  { id: 'nature', label: 'Nature', icon: '🌿', color: '#22C55E' },
  { id: 'photography', label: 'Photography', icon: '📷', color: '#3B82F6' },
] as const;

export type InterestId = typeof INTEREST_CATEGORIES[number]['id'];

/**
 * Get interest by ID
 */
export function getInterestById(id: string) {
  return INTEREST_CATEGORIES.find(interest => interest.id === id);
}

/**
 * Get multiple interests by IDs
 */
export function getInterestsByIds(ids: string[]) {
  return ids.map(id => getInterestById(id)).filter(Boolean);
}
