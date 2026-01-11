import { supabase } from './supabase';
import { User } from './store';
import { notifyFriendRequest } from './notifications';

/**
 * Sanitize search query to prevent PostgREST filter manipulation.
 * Removes special characters that could alter query logic.
 */
const sanitizeSearchQuery = (query: string): string => {
    // Remove PostgREST operators and special characters
    return query.replace(/[.,()[\]{}]/g, '').trim();
};

export interface Friend extends User {
    isFriend: boolean;
    isPrivate?: boolean;
    friendRequestStatus?: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
}

export const fetchPublicUsers = async (currentUserId: string, limit = 50): Promise<Friend[]> => {
    // Run all queries in parallel to eliminate N+1 pattern
    const [profilesResult, friendshipsResult, sentRequestsResult, receivedRequestsResult] = await Promise.all([
        // Query 1: Get public profiles
        supabase
            .from('profiles')
            .select('*')
            .neq('user_id', currentUserId)
            .eq('is_private', false)
            .limit(limit),
        
        // Query 2: Get friendships
        supabase
            .from('friendships')
            .select('friend_id')
            .eq('user_id', currentUserId),
        
        // Query 3: Get sent friend requests
        supabase
            .from('friend_requests')
            .select('receiver_id')
            .eq('sender_id', currentUserId)
            .eq('status', 'pending'),
        
        // Query 4: Get received friend requests
        supabase
            .from('friend_requests')
            .select('sender_id')
            .eq('receiver_id', currentUserId)
            .eq('status', 'pending')
    ]);

    if (profilesResult.error) {
        console.error('Error fetching public users:', profilesResult.error);
        return [];
    }

    const data = profilesResult.data || [];
    const friendIds = new Set(friendshipsResult.data?.map((f: { friend_id: string }) => f.friend_id) || []);
    const sentRequestIds = new Set(sentRequestsResult.data?.map((r: { receiver_id: string }) => r.receiver_id) || []);
    const receivedRequestIds = new Set(receivedRequestsResult.data?.map((r: { sender_id: string }) => r.sender_id) || []);

    return data.map((profile: any) => {
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
            tagline: profile.tagline ?? undefined,
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

export const searchUsers = async (query: string, currentUserId: string): Promise<Friend[]> => {
    if (!query || query.length < 2) return fetchPublicUsers(currentUserId);

    // Sanitize query to prevent PostgREST filter manipulation
    const sanitizedQuery = sanitizeSearchQuery(query);
    if (!sanitizedQuery) return fetchPublicUsers(currentUserId);

    // Run all queries in parallel to eliminate N+1 pattern
    const [profilesResult, friendshipsResult, sentRequestsResult, receivedRequestsResult] = await Promise.all([
        // Query 1: Search profiles
        supabase
            .from('profiles')
            .select('*')
            .or(`name.ilike.%${sanitizedQuery}%,invite_code.eq.${sanitizedQuery}`)
            .neq('user_id', currentUserId)
            .limit(50),
        
        // Query 2: Get friendships
        supabase
            .from('friendships')
            .select('friend_id')
            .eq('user_id', currentUserId),
        
        // Query 3: Get sent friend requests
        supabase
            .from('friend_requests')
            .select('receiver_id')
            .eq('sender_id', currentUserId)
            .eq('status', 'pending'),
        
        // Query 4: Get received friend requests
        supabase
            .from('friend_requests')
            .select('sender_id')
            .eq('receiver_id', currentUserId)
            .eq('status', 'pending')
    ]);

    if (profilesResult.error) {
        console.error('Error searching users:', profilesResult.error);
        return [];
    }

    const data = profilesResult.data || [];
    const friendIds = new Set(friendshipsResult.data?.map((f: { friend_id: string }) => f.friend_id) || []);
    const sentRequestIds = new Set(sentRequestsResult.data?.map((r: { receiver_id: string }) => r.receiver_id) || []);
    const receivedRequestIds = new Set(receivedRequestsResult.data?.map((r: { sender_id: string }) => r.sender_id) || []);

    return data
        .filter((profile: any) => {
            // Show if: friend OR profile is NOT private
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
                tagline: profile.tagline ?? undefined,
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
    // Helper to run query with timeout
    const runQuery = async (timeoutMs: number) => {
        const friendsQueryPromise = supabase
            .from('friendships')
            .select(`
          friend_id,
          profiles:friend_id (*)
        `)
            .eq('user_id', userId);

        return Promise.race([
            friendsQueryPromise,
            new Promise<{ data: any[] | null; error: any }>((resolve) => 
                setTimeout(() => resolve({ data: null, error: new Error(`Friends query timeout (${timeoutMs}ms)`) }), timeoutMs)
            ),
        ]);
    };

    try {
        // Attempt 1: 20s timeout
        let result = await runQuery(20000);
        let { data, error } = result as { data: any[] | null; error: any };

        // Attempt 2: Auto-recovery on error
        if (error) {
            console.warn('[Friends] getFriends failed (attempt 1), refreshing session and retrying...', error);
             const { error: refreshError } = await supabase.auth.refreshSession();
             if (!refreshError) {
                 result = await runQuery(20000); // Retry with same successful timeout
                 data = (result as any).data;
                 error = (result as any).error;
             } else {
                 console.warn('[Friends] Session refresh failed:', refreshError);
             }
        }

        if (error) {
            console.error('Error fetching friends (final):', error);
            return [];
        }

        if (!data) return [];

        return data
            .filter((item: any) => item.profiles) // Filter out missing profiles
            .map((item: any) => ({
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
    } catch (error) {
        console.error('Unexpected error fetching friends:', error);
        return [];
    }
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
        // Verify sender's profile exists (required by foreign key constraint)
        const { data: senderProfile, error: senderError } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', senderId)
            .maybeSingle();

        if (senderError || !senderProfile) {
            console.error('Error sending friend request: Sender profile does not exist', { senderId, senderError });
            return false;
        }

        // Verify receiver's profile exists
        const { data: receiverProfile, error: receiverError } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', receiverId)
            .maybeSingle();

        if (receiverError || !receiverProfile) {
            console.error('Error sending friend request: Receiver profile does not exist', { receiverId, receiverError });
            return false;
        }



        // Check if request already exists
        const { data: existingRequest } = await supabase
            .from('friend_requests')
            .select('*')
            .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
            .maybeSingle();

        if (existingRequest) {
            if (existingRequest.status === 'pending') {
                return false;
            }

            // If I am the sender of the stale request, I can just reactivate it
            if (existingRequest.sender_id === senderId) {
                const { error: updateError } = await supabase
                    .from('friend_requests')
                    .update({ 
                        status: 'pending',
                        created_at: new Date().toISOString()
                    })
                    .eq('id', existingRequest.id);

                if (updateError) throw updateError;
                
                await notifyFriendRequest(senderId, receiverId);
                return true;
            } else {
                // If the other person sent it (and it's declined/stale), I cannot update it (RLS policy).
                // I must delete it first to clear the bidirectional unique constraint.
                const { error: deleteError } = await supabase
                    .from('friend_requests')
                    .delete()
                    .eq('id', existingRequest.id);
                
                if (deleteError) {
                    console.error('Error deleting stale request:', deleteError);
                    // If we can't delete, we likely can't insert either due to unique constraint.
                    // But let's verify. If we can't delete, we return false.
                    return false;
                }
                // Proceed to create NEW request below
            }
        }

        // Create friend request
        const { data: newRequest, error } = await supabase
            .from('friend_requests')
            .insert({
                sender_id: senderId,
                receiver_id: receiverId,
                status: 'pending'
            })
            .select('id')
            .single();

        if (error) throw error;

        // Send notification to receiver
        await notifyFriendRequest(senderId, receiverId, newRequest.id);

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
