import { supabase } from './supabase';

/**
 * Search for hashtags using the dedicated hashtags table.
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
        const { data, error } = await supabase
            .from('hashtags')
            .select('name')
            .ilike('name', `%${normalizedQuery}%`)
            .order('count', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error searching hashtags:', error);
            // Fallback to empty array if table doesn't exist yet or other error
            return [];
        }

        return data.map((row: { name: string }) => row.name);
    } catch (err) {
        console.error('Error in searchHashtags:', err);
        return [];
    }
};

/**
 * Fetch popular hashtags from the dedicated hashtags table.
 * Returns hashtags sorted by usage count in descending order.
 */
export const fetchPopularHashtags = async (limit = 20): Promise<string[]> => {
    try {
        const { data, error } = await supabase
            .from('hashtags')
            .select('name')
            .gt('count', 0)
            .order('count', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching popular hashtags:', error);
            return [];
        }

        return data.map((row: { name: string }) => row.name);
    } catch (err) {
        console.error('Error in fetchPopularHashtags:', err);
        return [];
    }
};
