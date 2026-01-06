import { supabase } from './supabase';
import { Database } from './database.types';

export type GroupMessage = Database['public']['Tables']['group_messages']['Row'] & {
    sender?: Database['public']['Tables']['profiles']['Row'];
    reply_to_id?: string | null;
    reply_to_message?: {
        id: string;
        content: string;
        sender: { name: string };
    } | null;
    likes_count: number;
    has_liked: boolean;
};

export async function getGroupMessages(groupId: string): Promise<GroupMessage[]> {
    // Fetch messages with sender and likes
    const { data: messagesData, error } = await supabase
        .from('group_messages')
        .select(`
            *,
            sender:sender_id(*),
            likes:group_message_likes(user_id)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching group messages:', error);
        return [];
    }

    if (!messagesData || messagesData.length === 0) return [];

    const currentUserId = (await supabase.auth.getUser()).data.user?.id;

    // Create a map for replies
    const messageMap = new Map<string, any>();
    messagesData.forEach((m: any) => messageMap.set(m.id, m));

    // Process messages
    const processedMessages: GroupMessage[] = messagesData.map((msg: any) => {
        // Process reply
        let reply_to_message = null;
        if (msg.reply_to_id) {
            const parent = messageMap.get(msg.reply_to_id);
            if (parent) {
                reply_to_message = {
                    id: parent.id,
                    content: parent.content,
                    sender: { name: parent.sender?.name || 'Unknown' }
                };
            }
        }

        // Process likes
        const likes = msg.likes || [];
        const likes_count = likes.length;
        const has_liked = currentUserId ? likes.some((l: any) => l.user_id === currentUserId) : false;

        return {
            ...msg,
            reply_to_message,
            likes_count,
            has_liked
        };
    });

    return processedMessages;
}

export async function sendGroupMessage(groupId: string, senderId: string, content: string, replyToId?: string) {
    const { data, error } = await supabase
        .from('group_messages')
        .insert({
            group_id: groupId,
            sender_id: senderId,
            content: content,
            reply_to_id: replyToId
        })
        .select('*, sender:sender_id(*)')
        .single();

    if (error) throw error;
    return data;
}

export async function likeGroupMessage(messageId: string, userId: string) {
    const { error } = await supabase
        .from('group_message_likes')
        .insert({
            message_id: messageId,
            user_id: userId
        });
    
    if (error) throw error;
}

export async function unlikeGroupMessage(messageId: string, userId: string) {
    const { error } = await supabase
        .from('group_message_likes')
        .delete()
        .match({ message_id: messageId, user_id: userId });
        
    if (error) throw error;
}

export function subscribeToGroupMessages(groupId: string, callback: (message: GroupMessage) => void) {
    return supabase
        .channel(`group-chat-${groupId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'group_messages',
                filter: `group_id=eq.${groupId}`
            },
            async (payload: { new: GroupMessage }) => {
                // Fetch sender details for the new message
                const { data: sender } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('user_id', payload.new.sender_id)
                    .single();
                    
                // Fetch reply info if exists
                let reply_to_message = null;
                if (payload.new.reply_to_id) {
                    const { data: parent } = await supabase
                        .from('group_messages')
                        .select('*, sender:sender_id(name)')
                        .eq('id', payload.new.reply_to_id)
                        .single();
                        
                    if (parent) {
                        reply_to_message = {
                            id: parent.id,
                            content: parent.content,
                            sender: { name: parent.sender?.name || 'Unknown' }
                        };
                    }
                }
                
                const messageWithSender = {
                    ...payload.new,
                    sender: sender || undefined,
                    reply_to_message,
                    likes_count: 0,
                    has_liked: false
                } as GroupMessage;

                callback(messageWithSender);
            }
        )
        .subscribe();
}
