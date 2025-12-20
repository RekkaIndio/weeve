import { supabase } from './supabase';

/**
 * Search for hashtags across all stories in the database.
 * Returns unique hashtags that match the query (case-insensitive).
 */
export const searchHashtags = async (query: string, limit = 20): Promise<string[]> => {
    if (!query || query.length < 1) {
        // Return popular/recent hashtags if no query
        return fetchPopularHashtags(limit);
    }

    const normalizedQuery = query.toLowerCase().replace(/^#+/, '').trim();
    if (!normalizedQuery) return [];

    try {
        // Fetch all stories with hashtags
        const { data, error } = await supabase
            .from('stories')
            .select('hashtags')
            .not('hashtags', 'is', null);

        if (error) {
            console.error('Error searching hashtags:', error);
            return [];
        }

        // Flatten all hashtags and filter by query
        const allHashtags: string[] = [];
        (data || []).forEach((story: { hashtags: string[] | null }) => {
            if (story.hashtags && Array.isArray(story.hashtags)) {
                story.hashtags.forEach(tag => {
                    if (!allHashtags.includes(tag)) {
                        allHashtags.push(tag);
                    }
                });
            }
        });

        // Filter by query (case-insensitive partial match)
        const matchingTags = allHashtags
            .filter(tag => tag.toLowerCase().includes(normalizedQuery))
            .slice(0, limit);

        return matchingTags;
    } catch (err) {
        console.error('Error in searchHashtags:', err);
        return [];
    }
};

/**
 * Fetch popular/recent hashtags (when no search query is provided).
 * Returns unique hashtags sorted by frequency in descending order.
 */
export const fetchPopularHashtags = async (limit = 20): Promise<string[]> => {
    try {
        const { data, error } = await supabase
            .from('stories')
            .select('hashtags')
            .not('hashtags', 'is', null)
            .order('created_at', { ascending: false })
            .limit(100); // Fetch from recent 100 stories

        if (error) {
            console.error('Error fetching popular hashtags:', error);
            return [];
        }

        // Count hashtag frequency
        const hashtagCounts: Record<string, number> = {};
        (data || []).forEach((story: { hashtags: string[] | null }) => {
            if (story.hashtags && Array.isArray(story.hashtags)) {
                story.hashtags.forEach(tag => {
                    hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
                });
            }
        });

        // Sort by frequency and return top hashtags
        const sortedTags = Object.entries(hashtagCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([tag]) => tag)
            .slice(0, limit);

        return sortedTags;
    } catch (err) {
        console.error('Error in fetchPopularHashtags:', err);
        return [];
    }
};
