import { supabase } from './supabase';
import { User } from './store';

export interface Friend extends User {
    isFriend: boolean;
    isPrivate?: boolean;
}

export const searchUsers = async (query: string, currentUserId: string): Promise<Friend[]> => {
    if (!query || query.length < 2) return [];

    // Search by name or invite code
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`name.ilike.%${query}%,invite_code.eq.${query}`)
        .neq('user_id', currentUserId)
        .limit(50); // Increased limit to allow for client-side filtering if needed, though we should filter server side if possible.
    // Note: Supabase JS doesn't easily support "OR (is_private is false OR is_private is null)" mixed with other ORs in a simple way without complex syntax or RPC.
    // So we will filter in memory for now, or try to add .not('is_private', 'eq', true)


    if (error) {
        console.error('Error searching users:', error);
        return [];
    }

    // Check friendship status
    const { data: friendships } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', currentUserId);

    const friendIds = new Set(friendships?.map(f => f.friend_id) || []);

    return data
        .filter((profile: any) => {
            // Show if:
            // 1. It's a friend
            // 2. OR profile is NOT private
            const isFriend = friendIds.has(profile.user_id);
            const isPrivate = profile.is_private === true;
            return isFriend || !isPrivate;
        })
        .map((profile: any) => ({
            id: profile.user_id,
            name: profile.name,
            avatar: profile.avatar,
            tokens: profile.tokens,
            isInfluencer: profile.is_influencer,
            interactionCost: profile.interaction_cost,
            inviteCode: profile.invite_code,
            isFriend: friendIds.has(profile.user_id),
            isPrivate: profile.is_private,
        }));
};

export const getFriends = async (userId: string): Promise<User[]> => {
    const { data, error } = await supabase
        .from('friendships')
        .select(`
      friend_id,
      profiles:friend_id (*)
    `)
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching friends:', error);
        return [];
    }

    return data.map((item: any) => ({
        id: item.profiles.user_id,
        name: item.profiles.name,
        avatar: item.profiles.avatar,
        tokens: item.profiles.tokens,
        isInfluencer: item.profiles.is_influencer,
        interactionCost: item.profiles.interaction_cost,
        inviteCode: item.profiles.invite_code,
    }));
};

export const addFriend = async (userId: string, friendId: string) => {
    // Add bidirectional friendship
    const { error } = await supabase
        .from('friendships')
        .insert([
            { user_id: userId, friend_id: friendId },
            { user_id: friendId, friend_id: userId }
        ]);

    if (error) throw error;
};

export const removeFriend = async (userId: string, friendId: string) => {
    // Remove bidirectional friendship
    const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

    if (error) throw error;
};
