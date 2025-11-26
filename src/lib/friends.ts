import { supabase } from './supabase';
import { User } from './store';
import { notifyFriendRequest } from './notifications';

export interface Friend extends User {
    isFriend: boolean;
    isPrivate?: boolean;
    friendRequestStatus?: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
}

export const searchUsers = async (query: string, currentUserId: string): Promise<Friend[]> => {
    if (!query || query.length < 2) return [];

    // Search by name or invite code
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`name.ilike.%${query}%,invite_code.eq.${query}`)
        .neq('user_id', currentUserId)
        .limit(50);

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

    // Check friend request status
    const { data: sentRequests } = await supabase
        .from('friend_requests')
        .select('receiver_id, status')
        .eq('sender_id', currentUserId)
        .eq('status', 'pending');

    const { data: receivedRequests } = await supabase
        .from('friend_requests')
        .select('sender_id, status')
        .eq('receiver_id', currentUserId)
        .eq('status', 'pending');

    const sentRequestIds = new Set(sentRequests?.map(r => r.receiver_id) || []);
    const receivedRequestIds = new Set(receivedRequests?.map(r => r.sender_id) || []);

    return data
        .filter((profile: any) => {
            // Show if:
            // 1. It's a friend
            // 2. OR profile is NOT private
            const isFriend = friendIds.has(profile.user_id);
            const isPrivate = profile.is_private === true;
            return isFriend || !isPrivate;
        })
        .map((profile: any) => {
            const isFriend = friendIds.has(profile.user_id);
            let friendRequestStatus: Friend['friendRequestStatus'] = 'none';

            if (isFriend) {
                friendRequestStatus = 'accepted';
            } else if (sentRequestIds.has(profile.user_id)) {
                friendRequestStatus = 'pending_sent';
            } else if (receivedRequestIds.has(profile.user_id)) {
                friendRequestStatus = 'pending_received';
            }

            return {
                id: profile.user_id,
                name: profile.name,
                avatar: profile.avatar,
                tokens: profile.tokens,
                isInfluencer: profile.is_influencer,
                interactionCost: profile.interaction_cost,
                inviteCode: profile.invite_code,
                isFriend,
                isPrivate: profile.is_private,
                friendRequestStatus,
            };
        });
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
        isFriend: true,
        friendRequestStatus: 'accepted',
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

// ============================================
// FRIEND REQUEST FUNCTIONS
// ============================================

export interface FriendRequest {
    id: string;
    sender_id: string;
    receiver_id: string;
    status: 'pending' | 'accepted' | 'declined';
    sender_name?: string;
    sender_avatar?: string;
    receiver_name?: string;
    receiver_avatar?: string;
    created_at: string;
}

/**
 * Send a friend request
 */
export const sendFriendRequest = async (senderId: string, receiverId: string): Promise<boolean> => {
    try {
        // Check if friendship already exists
        const { data: existingFriendship } = await supabase
            .from('friendships')
            .select('id')
            .or(`and(user_id.eq.${senderId},friend_id.eq.${receiverId}),and(user_id.eq.${receiverId},friend_id.eq.${senderId})`)
            .limit(1)
            .single();

        if (existingFriendship) {
            console.log('Already friends');
            return false;
        }

        // Check if request already exists
        const { data: existingRequest } = await supabase
            .from('friend_requests')
            .select('id')
            .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
            .limit(1)
            .single();

        if (existingRequest) {
            console.log('Request already exists');
            return false;
        }

        // Create friend request
        const { error } = await supabase
            .from('friend_requests')
            .insert({
                sender_id: senderId,
                receiver_id: receiverId,
                status: 'pending'
            });

        if (error) throw error;

        // Send notification to receiver
        await notifyFriendRequest(senderId, receiverId);

        return true;
    } catch (error) {
        console.error('Error sending friend request:', error);
        return false;
    }
};

/**
 * Accept a friend request
 */
export const acceptFriendRequest = async (requestId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('friend_requests')
            .update({ status: 'accepted' })
            .eq('id', requestId);

        if (error) throw error;

        // The trigger will create the friendship and notification
        return true;
    } catch (error) {
        console.error('Error accepting friend request:', error);
        return false;
    }
};

/**
 * Decline a friend request
 */
export const declineFriendRequest = async (requestId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('friend_requests')
            .update({ status: 'declined' })
            .eq('id', requestId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error declining friend request:', error);
        return false;
    }
};

/**
 * Get friend requests for a user (both sent and received)
 */
export const getFriendRequests = async (userId: string): Promise<{ sent: FriendRequest[], received: FriendRequest[] }> => {
    try {
        // Get received requests (pending only)
        const { data: receivedData, error: receivedError } = await supabase
            .from('friend_requests')
            .select(`
                *,
                sender:sender_id (user_id, name, avatar)
            `)
            .eq('receiver_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (receivedError) throw receivedError;

        // Get sent requests (pending only)
        const { data: sentData, error: sentError } = await supabase
            .from('friend_requests')
            .select(`
                *,
                receiver:receiver_id (user_id, name, avatar)
            `)
            .eq('sender_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (sentError) throw sentError;

        const received = (receivedData || []).map((req: any) => ({
            id: req.id,
            sender_id: req.sender_id,
            receiver_id: req.receiver_id,
            status: req.status,
            sender_name: req.sender?.name,
            sender_avatar: req.sender?.avatar,
            created_at: req.created_at,
        }));

        const sent = (sentData || []).map((req: any) => ({
            id: req.id,
            sender_id: req.sender_id,
            receiver_id: req.receiver_id,
            status: req.status,
            receiver_name: req.receiver?.name,
            receiver_avatar: req.receiver?.avatar,
            created_at: req.created_at,
        }));

        return { sent, received };
    } catch (error) {
        console.error('Error fetching friend requests:', error);
        return { sent: [], received: [] };
    }
};
