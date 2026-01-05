"use client";

import { useRef, useEffect, useState } from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import { getGroupMessages, sendGroupMessage, subscribeToGroupMessages, GroupMessage } from '@/lib/group-messaging';
import { Send, User } from 'lucide-react';

interface GroupChatTabProps {
    groupId: string;
    isMember: boolean;
}

export default function GroupChatTab({ groupId, isMember }: GroupChatTabProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<GroupMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isMember) {
            setLoading(false);
            return;
        }

        loadMessages();

        const subscription = subscribeToGroupMessages(groupId, (message) => {
            setMessages(prev => [...prev, message]);
            scrollToBottom();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [groupId, isMember]);

    const loadMessages = async () => {
        setLoading(true);
        const data = await getGroupMessages(groupId);
        setMessages(data);
        setLoading(false);
        scrollToBottom();
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();

        if (!newMessage.trim() || !user || !isMember) return;

        const content = newMessage.trim();
        setNewMessage(''); // Optimistically clear input
        setSending(true);

        try {
            await sendGroupMessage(groupId, user.id, content);
            // Message will be added via subscription
        } catch (error) {
            console.error('Failed to send message:', error);
            console.error('Failed to send message');
            setNewMessage(content); // Restore message on error
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (!isMember) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-gray-900/50 rounded-xl border border-gray-800">
                <div className="bg-gray-800 p-4 rounded-full">
                    <User className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">Members Only</h3>
                    <p className="text-gray-400 text-sm max-w-xs mx-auto mt-1">
                        Join this group to participate in the chat.
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#EC1D99]"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 bg-gray-900/30 border-x border-gray-800 relative">
            {/* Messages Area */}
            <div className="flex-1 p-4 space-y-4 pb-28">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-2 py-12">
                        <p>No messages yet.</p>
                        <p className="text-xs">Be the first to say hello!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender_id === user?.id;
                        return (
                            <div
                                key={msg.id}
                                className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                                <div className="shrink-0">
                                    <img
                                        src={msg.sender?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${msg.sender_id}`}
                                        alt={msg.sender?.name || 'User'}
                                        className="w-8 h-8 rounded-full bg-gray-800 object-cover"
                                    />
                                </div>
                                <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="text-xs font-medium text-gray-300">
                                            {msg.sender?.name || 'Unknown'}
                                        </span>
                                        <span className="text-[10px] text-gray-500">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div
                                        className={`px-4 py-2 rounded-2xl text-sm ${isMe
                                            ? 'bg-[#EC1D99] text-white rounded-tr-none'
                                            : 'bg-gray-800 text-gray-200 rounded-tl-none'
                                            }`}
                                    >
                                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Sticky to bottom */}
            <div className="sticky bottom-0 left-0 right-0 p-4 bg-gray-900 border-t border-gray-800 z-10 transition-all duration-200">
                <form
                    onSubmit={handleSendMessage}
                    className="flex items-end gap-2"
                >
                    <div className="flex-1 relative">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-[#EC1D99] focus:ring-1 focus:ring-[#EC1D99] resize-none min-h-[46px] max-h-32"
                            rows={1}
                            style={{ height: 'auto', minHeight: '46px' }}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="p-3 bg-[#EC1D99] text-white rounded-full hover:bg-[#d61a88] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}
