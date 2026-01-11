import { supabase } from './supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ============================================
// TYPES
// ============================================

export type NotificationType =
    | 'friend_request'
    | 'friend_accepted'
    | 'story_invite'
    | 'story_turn'
    | 'story_completed'
    | 'story_liked'
    | 'story_commented'
    | 'story_participant_left'
    | 'story_shared'
    | 'group_invite'
    | 'group_update'
    | 'group_joined'
    | 'mention'
    | 'your_turn'
    | 'turn_skipped'
    | 'timer_warning'
    | 'timer_warning'
    | 'timer_expired'
    | 'timer_expired'
    | 'new_follower'
    | 'group_join_request'
    | 'group_request_approved'
    | 'group_request_declined'
    | 'new_message'
    | 'content_approved'
    | 'content_rejected'
    | 'story_approved'
    | 'story_rejected'
    | 'content_submitted_for_review'
    | 'story_submitted_for_review'
    | 'story_comment'
    | 'share'
    | 'collab_request'
    | 'collab_accepted'
    | 'collab_declined';

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
    read: boolean;
    action_url?: string;
    created_at: string;
}

// ============================================
// CORE NOTIFICATION FUNCTIONS
// ============================================

/**
 * Get all notifications for a user
 */
export const getNotifications = async (userId: string, limit = 50): Promise<Notification[]> => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }

    return (data as Notification[]) || [];
};

/**
 * Get count of unread notifications
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

    if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
    }

    return count || 0;
};

/**
 * Mark a single notification as read
 */
export const markAsRead = async (notificationId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

    if (error) {
        console.error('Error marking notification as read:', error);
        return false;
    }

    return true;
};

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (userId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

    if (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
    }

    return true;
};

/**
 * Create a notification
 */
export const createNotification = async (notification: Omit<Notification, 'id' | 'created_at'>): Promise<boolean> => {
    const { error } = await supabase
        .from('notifications')
        .insert(notification);

    if (error) {
        console.error('Error creating notification:', error);
        return false;
    }

    return true;
};

/**
 * Subscribe to real-time notifications for a user
 */
export const subscribeToNotifications = (
    userId: string,
    callback: (notification: Notification) => void
) => {
    const subscription = supabase
        .channel(`notifications:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`,
            },
            (payload: RealtimePostgresChangesPayload<any>) => {
                callback(payload.new as Notification);
            }
        )
        .subscribe();

    return () => {
        subscription.unsubscribe();
    };
};

// ============================================
// NOTIFICATION CREATION HELPERS
// ============================================

/**
 * Notify user of a friend request
 */
export const notifyFriendRequest = async (senderId: string, receiverId: string, requestId?: string) => {
    // Get sender's name
    const { data: sender } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', senderId)
        .single();

    if (!sender) return;

    // Check for existing unread friend request notification from this sender
    const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', receiverId)
        .eq('type', 'friend_request')
        .eq('read', false)
        .contains('data', { sender_id: senderId }); // Filter by sender_id in JSONB data

    // If duplicates exist, delete them to avoid clutter
    if (existingNotifications && existingNotifications.length > 0) {
        const idsToDelete = existingNotifications.map((n: { id: string }) => n.id);
        await supabase
            .from('notifications')
            .delete()
            .in('id', idsToDelete);
    }

    await createNotification({
        user_id: receiverId,
        type: 'friend_request',
        title: 'New Friend Request',
        message: `${sender.name} sent you a friend request`,
        data: { sender_id: senderId, request_id: requestId },
        action_url: '/activity',
        read: false,
    });
};

/**
 * Notify users of story invite
 */
export const notifyStoryInvite = async (storyId: string, storyTitle: string, creatorName: string, userIds: string[]) => {
    const notifications = userIds.map(userId => ({
        user_id: userId,
        type: 'story_invite' as NotificationType,
        title: 'Story Invitation',
        message: `${creatorName} invited you to collaborate on "${storyTitle}"`,
        data: { story_id: storyId },
        action_url: `/story/${storyId}`,
        read: false,
    }));

    const { error } = await supabase
        .from('notifications')
        .insert(notifications);

    if (error) {
        console.error('Error creating story invite notifications:', error);
    }
};

/**
 * Notify user it's their turn in a story
 */
export const notifyStoryTurn = async (storyId: string, storyTitle: string, userId: string) => {
    await createNotification({
        user_id: userId,
        type: 'story_turn',
        title: "It's Your Turn!",
        message: `Your turn to add to "${storyTitle}"`,
        data: { story_id: storyId },
        action_url: `/story/${storyId}`,
        read: false,
    });
};

/**
 * Notify all participants that story is completed
 */
export const notifyStoryCompleted = async (storyId: string, storyTitle: string, participantIds: string[]) => {
    const notifications = participantIds.map(userId => ({
        user_id: userId,
        type: 'story_completed' as NotificationType,
        title: 'Story Completed! 🎉',
        message: `"${storyTitle}" is now complete!`,
        data: { story_id: storyId },
        action_url: `/story/${storyId}`,
        read: false,
    }));

    const { error } = await supabase
        .from('notifications')
        .insert(notifications);

    if (error) {
        console.error('Error creating story completed notifications:', error);
    }
};

/**
 * Notify story creator of a like
 */
export const notifyStoryLike = async (storyId: string, storyTitle: string, creatorId: string, likerName: string) => {
    await createNotification({
        user_id: creatorId,
        type: 'story_liked',
        title: 'New Like ❤️',
        message: `${likerName} liked your story "${storyTitle}"`,
        data: { story_id: storyId },
        action_url: `/story/${storyId}`,
        read: false,
    });
};

/**
 * Notify story creator of a comment
 */
export const notifyStoryComment = async (
    storyId: string,
    storyTitle: string,
    creatorId: string,
    commenterName: string,
    commentText: string
) => {
    await createNotification({
        user_id: creatorId,
        type: 'story_commented',
        title: 'New Comment 💬',
        message: `${commenterName} commented on "${storyTitle}": ${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}`,
        data: { story_id: storyId },
        action_url: `/story/${storyId}`,
        read: false,
    });
};

/**
 * Notify comment author of a reply to their comment
 */
export const notifyCommentReply = async (
    storyId: string,
    storyTitle: string,
    parentCommentUserId: string,
    replierName: string,
    replyText: string
) => {
    await createNotification({
        user_id: parentCommentUserId,
        type: 'story_commented',
        title: 'New Reply 💬',
        message: `${replierName} replied to your comment on "${storyTitle}": ${replyText.substring(0, 50)}${replyText.length > 50 ? '...' : ''}`,
        data: { story_id: storyId },
        action_url: `/story/${storyId}`,
        read: false,
    });
};

/**
 * Notify comment author of a like on their comment
 */
export const notifyCommentLike = async (
    storyId: string,
    commentUserId: string,
    likerName: string
) => {
    await createNotification({
        user_id: commentUserId,
        type: 'story_liked',
        title: 'Comment Liked ❤️',
        message: `${likerName} liked your comment`,
        data: { story_id: storyId },
        action_url: `/story/${storyId}`,
        read: false,
    });
};

/**
 * Notify user of group invite
 */
export const notifyGroupInvite = async (
    groupId: string,
    groupName: string,
    userId: string,
    inviterName: string
) => {
    await createNotification({
        user_id: userId,
        type: 'group_invite',
        title: 'Group Invitation',
        message: `${inviterName} invited you to join "${groupName}"`,
        data: { group_id: groupId, inviter_name: inviterName },
        action_url: `/groups/${groupId}`,
        read: false,
    });
};

/**
 * Notify group members of update
 */
export const notifyGroupUpdate = async (groupId: string, groupName: string, memberIds: string[], updateMessage: string) => {
    const notifications = memberIds.map(userId => ({
        user_id: userId,
        type: 'group_update' as NotificationType,
        title: 'Group Update',
        message: `${groupName}: ${updateMessage}`,
        data: { group_id: groupId },
        action_url: `/groups/${groupId}`,
        read: false,
    }));

    const { error } = await supabase
        .from('notifications')
        .insert(notifications);

    if (error) {
        console.error('Error creating group update notifications:', error);
    }
};

/**
 * Notify group members of a new story
 */
export const notifyGroupNewStory = async (
    groupId: string,
    groupName: string,
    storyId: string,
    storyTitle: string,
    creatorName: string,
    memberIds: string[]
) => {
    const notifications = memberIds.map(userId => ({
        user_id: userId,
        type: 'group_update' as NotificationType,
        title: 'New Group Story 📖',
        message: `${creatorName} added "${storyTitle}" to ${groupName}`,
        data: { group_id: groupId, story_id: storyId },
        action_url: `/story/${storyId}`, // Direct link to story, but context is group
        read: false,
    }));

    const { error } = await supabase
        .from('notifications')
        .insert(notifications);

    if (error) {
        console.error('Error creating group new story notifications:', error);
    }
};

/**
 * Notify story creator that a participant has left
 */
export const notifyParticipantLeft = async (
    storyId: string,
    storyTitle: string,
    creatorId: string,
    participantName: string
) => {
    await createNotification({
        user_id: creatorId,
        type: 'story_participant_left',
        title: 'Participant Left Story',
        message: `${participantName} has left your story "${storyTitle}". You can invite someone else to fill their spot.`,
        data: { story_id: storyId },
        action_url: `/story/${storyId}`,
        read: false,
    });
};

/**
 * Notify user that a story has been shared with them
 */
export const notifyStoryShared = async (
    storyId: string,
    storyTitle: string,
    recipientId: string,
    sharerName: string
) => {
    await createNotification({
        user_id: recipientId,
        type: 'story_shared',
        title: 'Story Shared with You',
        message: `${sharerName} shared "${storyTitle}" with you`,
        data: { story_id: storyId, sharer_name: sharerName },
        action_url: `/story/${storyId}`,
        read: false,
    });
};
/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId: string): Promise<boolean> => {
    // Request deleted rows back so we can confirm deletion (RLS could silently prevent delete)
    const { data, error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .select();

    if (error) {
        console.error('Error deleting notification:', error);
        return false;
    }

    // If no rows were returned, deletion did not occur (likely RLS prevented it)
    if (!data || (Array.isArray(data) && data.length === 0)) {
        console.warn('Delete returned no rows — deletion may have been blocked by RLS');
        return false;
    }

    return true;
};

/**
 * Notify user that their time is running out
 */
export const notifyTimerWarning = async (
    storyId: string,
    storyTitle: string,
    userId: string,
    timeRemainingString: string
) => {
    await createNotification({
        user_id: userId,
        type: 'timer_warning' as NotificationType,
        title: 'Time Running Out ⏳',
        message: `You have ${timeRemainingString} left to contribute to "${storyTitle}"`,
        data: { story_id: storyId },
        action_url: `/story/${storyId}`,
        read: false,
    });
};

/**
 * Notify user of a new follower
 */
export const notifyNewFollower = async (followerId: string, followedId: string) => {
    // Get follower's name
    const { data: follower } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', followerId)
        .single();

    if (!follower) return;

    await createNotification({
        user_id: followedId,
        type: 'new_follower',
        title: 'New Follower',
        message: `${follower.name} started following you`,
        data: { follower_id: followerId },
        action_url: `/profile/${followerId}`,
        read: false,
    });
};

/**
 * Notify user of a new message
 */
export const notifyNewMessage = async (
    conversationId: string,
    recipientId: string,
    senderName: string,
    messagePreview: string
) => {
    await createNotification({
        user_id: recipientId,
        type: 'new_message',
        title: 'New Message 💬',
        message: `${senderName}: ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}`,
        data: { conversation_id: conversationId },
        action_url: `/inbox/${conversationId}`,
        read: false,
    });
};

// ============================================
// COLLABORATION NOTIFICATIONS
// ============================================

/**
 * Notify user of a collaboration request
 */
export const notifyCollabRequest = async (
    storyId: string,
    storyTitle: string,
    senderId: string,
    receiverId: string,
    priceCents?: number
) => {
    const { data: sender } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', senderId)
        .single();

    if (!sender) return;

    const priceMessage = priceCents && priceCents > 0
        ? ` (paid $${(priceCents / 100).toFixed(2)})`
        : '';

    await createNotification({
        user_id: receiverId,
        type: 'collab_request',
        title: 'Collaboration Request 🤝',
        message: `${sender.name} wants to collaborate on "${storyTitle}"${priceMessage}`,
        data: { story_id: storyId, sender_id: senderId, price_cents: priceCents },
        action_url: `/story/${storyId}`,
        read: false,
    });
};

/**
 * Notify initiator that collaboration was accepted
 */
export const notifyCollabAccepted = async (
    storyId: string,
    storyTitle: string,
    accepterId: string,
    initiatorId: string
) => {
    const { data: accepter } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', accepterId)
        .single();

    if (!accepter) return;

    await createNotification({
        user_id: initiatorId,
        type: 'collab_accepted',
        title: 'Collaboration Accepted! 🎉',
        message: `${accepter.name} accepted your collaboration request for "${storyTitle}"`,
        data: { story_id: storyId },
        action_url: `/story/${storyId}`,
        read: false,
    });
};

/**
 * Notify initiator that collaboration was declined
 */
export const notifyCollabDeclined = async (
    storyId: string,
    storyTitle: string,
    declinerId: string,
    initiatorId: string,
    refundCents?: number
) => {
    const { data: decliner } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', declinerId)
        .single();

    if (!decliner) return;

    const refundMessage = refundCents && refundCents > 0
        ? `. Your $${(refundCents / 100).toFixed(2)} will be refunded.`
        : '';

    await createNotification({
        user_id: initiatorId,
        type: 'collab_declined',
        title: 'Collaboration Declined',
        message: `${decliner.name} declined your collaboration request for "${storyTitle}"${refundMessage}`,
        data: { story_id: storyId, refund_cents: refundCents },
        action_url: `/profile`,
        read: false,
    });
};