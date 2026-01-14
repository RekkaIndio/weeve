import { supabase } from './supabase';
import { Database } from './database.types';
import { notifyNewMessage } from './notifications';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type UserProfile = Database['public']['Tables']['profiles']['Row'];

export type ConversationWithParticipants = Conversation & {
    participants: {
        user: UserProfile;
        last_read_at: string;
    }[];
    last_message?: Message;
};

export type MessageWithSender = Message & {
    sender: UserProfile;
    reply_to_id?: string | null;
    reply_to_message?: {
        id: string;
        content: string;
        sender: { name: string };
    } | null;
    likes_count: number;
    has_liked: boolean;
    is_deleted: boolean;
};

/**
 * Fetch all conversations for the current user
 */
export async function getConversations(userId: string): Promise<ConversationWithParticipants[]> {
    // Step 1: Get user's participant records (they can only see their own)
    const { data: myParticipations, error } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at, other_user_id')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching conversations:', error);
        return [];
    }

    if (!myParticipations || myParticipations.length === 0) {
        console.log('[getConversations] No participations found for user:', userId);
        return [];
    }

    console.log('[getConversations] Found participations:', myParticipations.length);

    const conversationIds = myParticipations.map((p: { conversation_id: string }) => p.conversation_id);
    const otherUserIds = myParticipations
        .map((p: { other_user_id: string | null }) => p.other_user_id)
        .filter((id: string | null): id is string => id !== null);

    // Step 2 & 3: Fetch conversation details AND profiles in parallel
    const [conversationsResult, profilesResult] = await Promise.all([
        supabase
            .from('conversations')
            .select('*')
            .in('id', conversationIds)
            .order('last_message_at', { ascending: false }),
        
        supabase
            .from('profiles')
            .select('*')
            .in('user_id', otherUserIds)
    ]);

    if (conversationsResult.error || !conversationsResult.data) {
        console.error('Error fetching conversation details:', conversationsResult.error);
        return [];
    }

    const profileMap = new Map<string, UserProfile>();
    if (profilesResult.data) {
        profilesResult.data.forEach((p: UserProfile) => profileMap.set(p.user_id, p));
    }

    // Step 4: Build conversation objects with participants
    const conversations: ConversationWithParticipants[] = conversationsResult.data.map((conv: Conversation) => {
        const myParticipation = myParticipations.find(
            (p: { conversation_id: string }) => p.conversation_id === conv.id
        ) as { conversation_id: string; last_read_at: string; other_user_id: string | null } | undefined;

        const otherUserId = myParticipation?.other_user_id;
        const otherProfile = otherUserId ? profileMap.get(otherUserId) : null;

        const participants = [];
        
        if (otherProfile) {
            participants.push({
                user: otherProfile,
                last_read_at: conv.created_at
            });
        }

        return {
            ...conv,
            participants
        };
    });

    return conversations;
}

/**
 * Fetch messages for a specific conversation
 */
/**
 * Fetch messages for a specific conversation
 */
export async function getMessages(conversationId: string): Promise<MessageWithSender[]> {
    console.log('[getMessages] Fetching messages for conversation:', conversationId);
    
    // Fetch messages first, including likes
    const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
            *,
            likes:message_likes(user_id)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('[getMessages] Error fetching messages:', error);
        return [];
    }

    if (!messagesData || messagesData.length === 0) {
        console.log('[getMessages] No messages found');
        return [];
    }

    console.log('[getMessages] Found messages:', messagesData.length);

    const currentUserId = (await supabase.auth.getUser()).data.user?.id;

    // Get unique sender IDs
    const senderIds = [...new Set(messagesData.map((m: any) => m.sender_id))];
    
    // Fetch profiles for all senders
    const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', senderIds);

    const profileMap = new Map<string, UserProfile>();
    if (profiles) {
        profiles.forEach((p: UserProfile) => profileMap.set(p.user_id, p));
    }

    // Create a map of messages to easily find reply parents
    const messageMap = new Map<string, any>();
    messagesData.forEach((m: any) => messageMap.set(m.id, m));

    // Combine messages with sender profiles and process likes/replies
    const messagesWithSenders: MessageWithSender[] = messagesData.map((msg: any) => {
        const sender = profileMap.get(msg.sender_id) || { 
            user_id: msg.sender_id, 
            name: 'Unknown User',
            avatar: null,
            id: '',
            tagline: null,
            tokens: 0,
            is_private: false,
            is_influencer: false,
            interaction_cost: null,
            invite_code: null,
            onboarding_step: null,
            completed_onboarding: false,
            preferences: {},
            last_name_change_at: null,
            date_of_birth: null,
            is_brand: false,
            brand_website: null,
            brand_verified: false,
            brand_verified_at: null,
            brand_subscription_status: 'none' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        } as UserProfile;

        // Process reply
        let reply_to_message = null;
        if (msg.reply_to_id) {
            const parent = messageMap.get(msg.reply_to_id);
            if (parent) {
                const parentSender = profileMap.get(parent.sender_id);
                reply_to_message = {
                    id: parent.id,
                    content: parent.content,
                    sender: { name: parentSender?.name || 'Unknown' }
                };
            }
        }

        // Process likes
        const likes = msg.likes || [];
        const likes_count = likes.length;
        const has_liked = currentUserId ? likes.some((l: any) => l.user_id === currentUserId) : false;

        // Check if message is deleted
        const is_deleted = msg.deleted_at !== null;

        return {
            ...msg,
            sender,
            reply_to_id: msg.reply_to_id,
            reply_to_message,
            likes_count,
            has_liked,
            is_deleted
        };
    });

    return messagesWithSenders;
}

/**
 * Send a new message
 */
export async function sendMessage(conversationId: string, senderId: string, content: string, replyToId?: string) {
    // 1. Insert message
    const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content: content,
            reply_to_id: replyToId
        })
        .select()
        .single();

    if (messageError) {
        console.error('[sendMessage] Error inserting message:', messageError);
        throw messageError;
    }
    console.log('[sendMessage] Message sent:', message);

    // 2. Update conversation updated_at and last_message
    await supabase
        .from('conversations')
        .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: content.substring(0, 50)
        })
        .eq('id', conversationId);

    // 3. Update sender's last_read_at (optional, but good UX)
    await supabase
        .from('conversation_participants')
        .update({
            last_read_at: new Date().toISOString()
        })
        .match({ conversation_id: conversationId, user_id: senderId });

    // 4. Send notification to recipient(s)
    try {
        // Get sender's name
        const { data: senderProfile } = await supabase
            .from('profiles')
            .select('name')
            .eq('user_id', senderId)
            .single();

        // Get recipient's user_id from the sender's participant record (other_user_id)
        const { data: senderParticipant } = await supabase
            .from('conversation_participants')
            .select('other_user_id')
            .eq('conversation_id', conversationId)
            .eq('user_id', senderId)
            .single();

        if (senderParticipant?.other_user_id && senderProfile?.name) {
            await notifyNewMessage(
                conversationId,
                senderParticipant.other_user_id,
                senderProfile.name,
                content
            );
        }
    } catch (notifyError) {
        // Don't fail the message send if notification fails
        console.error('[sendMessage] Error sending notification:', notifyError);
    }

    return message;
}

/**
 * Like a message
 */
export async function likeMessage(messageId: string, userId: string) {
    const { error } = await supabase
        .from('message_likes')
        .insert({
            message_id: messageId,
            user_id: userId
        });
    
    if (error) {
        console.error('Error liking message:', error);
        throw error;
    }
}

/**
 * Unlike a message
 */
export async function unlikeMessage(messageId: string, userId: string) {
    const { error } = await supabase
        .from('message_likes')
        .delete()
        .match({ message_id: messageId, user_id: userId });
        
    if (error) {
        console.error('Error unliking message:', error);
        throw error;
    }
}

/**
 * Delete a message (soft delete)
 * Only the sender can delete their own messages
 */
export async function deleteMessage(messageId: string, userId: string) {
    const { error } = await supabase
        .from('messages')
        .update({
            deleted_at: new Date().toISOString(),
            deleted_by: userId
        })
        .eq('id', messageId)
        .eq('sender_id', userId); // Ensure only sender can delete
        
    if (error) {
        console.error('Error deleting message:', error);
        throw error;
    }
}

/**
 * Create a new conversation (start a chat)
 */
export async function createConversation(creatorId: string, otherUserId: string): Promise<string> {
    // Check if conversation already exists between these two users
    // Use the other_user_id column for a direct lookup
    const { data: existingParticipation } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', creatorId)
        .eq('other_user_id', otherUserId)
        .single();

    if (existingParticipation) {
        return existingParticipation.conversation_id;
    }
    
    // No existing conversation found, create new one
    // Note: creator_id defaults to auth.uid() in the database
    const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
            last_message_preview: 'Started a new conversation'
        })
        .select()
        .single();

    if (convError) {
        console.error('[createConversation] Error creating conversation:', convError.message, convError.details, convError.hint);
        throw new Error(`Failed to create conversation: ${convError.message}`);
    }

    // 2. Add participants with other_user_id for easy lookup
    const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([
            { conversation_id: conversation.id, user_id: creatorId, other_user_id: otherUserId },
            { conversation_id: conversation.id, user_id: otherUserId, other_user_id: creatorId }
        ]);

    if (partError) {
        console.error('[createConversation] Error adding participants:', partError.message, partError.details, partError.hint);
        throw new Error(`Failed to add participants: ${partError.message}`);
    }

    return conversation.id;
}

/**
 * Mark conversation as read
 */
export async function markAsRead(conversationId: string, userId: string) {
    await supabase
        .from('conversation_participants')
        .update({
            last_read_at: new Date().toISOString()
        })
        .match({ conversation_id: conversationId, user_id: userId });
}

/**
 * Subscribe to new messages in a conversation
 */
export function subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
    return supabase
        .channel(`conversation-${conversationId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`
            },
            (payload: any) => {
                callback(payload.new as Message);
            }
        )
        .subscribe();
}

/**
 * Get the other participant's user ID in a conversation
 */
export async function getOtherParticipant(conversationId: string, userId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('conversation_participants')
        .select('other_user_id')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .single();
    
    if (error || !data) {
        console.error('Error getting other participant:', error);
        return null;
    }
    
    return data.other_user_id;
}

/**
 * Delete a conversation (removes the current user's participation)
 * The conversation is hidden from the user but not deleted from the database
 */
export async function deleteConversation(conversationId: string, userId: string) {
    // Delete the user's participation record (this hides the conversation from them)
    const { error } = await supabase
        .from('conversation_participants')
        .delete()
        .match({ conversation_id: conversationId, user_id: userId });
        
    if (error) {
        console.error('Error deleting conversation:', error);
        throw error;
    }
}
