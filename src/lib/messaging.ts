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
export async function getMessages(conversationId: string): Promise<MessageWithSender[]> {
    console.log('[getMessages] Fetching messages for conversation:', conversationId);
    
    // Fetch messages first
    const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
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

    // Combine messages with sender profiles
    const messagesWithSenders: MessageWithSender[] = messagesData.map((msg: any) => ({
        ...msg,
        sender: profileMap.get(msg.sender_id) || { 
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
        } as UserProfile
    }));

    return messagesWithSenders;
}

/**
 * Send a new message
 */
export async function sendMessage(conversationId: string, senderId: string, content: string) {
    // 1. Insert message
    const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content: content
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
        console.log('[createConversation] Found existing conversation:', existingParticipation.conversation_id);
        return existingParticipation.conversation_id;
    }
    
    console.log('[createConversation] Creating new conversation between', creatorId, 'and', otherUserId);
    
    // No existing conversation found, create new one
    const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
            last_message_preview: 'Started a new conversation'
        })
        .select()
        .single();

    if (convError) throw convError;

    // 2. Add participants with other_user_id for easy lookup
    const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([
            { conversation_id: conversation.id, user_id: creatorId, other_user_id: otherUserId },
            { conversation_id: conversation.id, user_id: otherUserId, other_user_id: creatorId }
        ]);

    if (partError) throw partError;

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
