import { supabase } from './supabase';
import { Database } from './database.types';

export type GroupMessage = Database['public']['Tables']['group_messages']['Row'] & {
    sender?: Database['public']['Tables']['profiles']['Row']
};

export async function getGroupMessages(groupId: string): Promise<GroupMessage[]> {
    const { data, error } = await supabase
        .from('group_messages')
        .select('*, sender:sender_id(*)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching group messages:', error);
        return [];
    }

    return data || [];
}

export async function sendGroupMessage(groupId: string, senderId: string, content: string) {
    const { data, error } = await supabase
        .from('group_messages')
        .insert({
            group_id: groupId,
            sender_id: senderId,
            content: content
        })
        .select('*, sender:sender_id(*)')
        .single();

    if (error) throw error;
    return data;
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
                
                const messageWithSender = {
                    ...payload.new,
                    sender: sender || undefined
                } as GroupMessage;

                callback(messageWithSender);
            }
        )
        .subscribe();
}
