import { supabase } from './supabase';

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
    | 'mention';

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
export const createNotification = async (notification: Omit<Notification, 'id' | 'created_at'>): Promise<Notification | null> => {
    const { data, error } = await supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single();

    if (error) {
        console.error('Error creating notification:', error);
        return null;
    }

    return data as Notification;
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
            (payload) => {
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
export const notifyFriendRequest = async (senderId: string, receiverId: string) => {
    // Get sender's name
    const { data: sender } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', senderId)
        .single();

    if (!sender) return;

    await createNotification({
        user_id: receiverId,
        type: 'friend_request',
        title: 'New Friend Request',
        message: `${sender.name} sent you a friend request`,
        data: { sender_id: senderId },
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
