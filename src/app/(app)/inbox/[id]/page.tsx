"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import { useStore } from '@/lib/store';
import { getMessages, sendMessage, subscribeToMessages, markAsRead, MessageWithSender } from '@/lib/messaging';
import { ArrowLeft, Send } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useKeyboard } from '@/hooks/useKeyboard';

export default function ConversationPage() {
    const params = useParams();
    const id = params?.id as string | string[];
    const router = useRouter();
    const { user } = useAuth();
    const { currentUser } = useStore();
    const [messages, setMessages] = useState<MessageWithSender[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const conversationId = Array.isArray(id) ? id[0] : id;

    useEffect(() => {
        if (!user || !conversationId) return;

        // Load initial messages
        const loadMessages = async () => {
            setLoading(true);
            console.log('[ConversationPage] Loading messages for:', conversationId);
            const data = await getMessages(conversationId);
            console.log('[ConversationPage] Messages loaded:', data.length);
            setMessages(data);
            setLoading(false);
            scrollToBottom();

            // Mark as read
            markAsRead(conversationId, user.id);
        };

        loadMessages();

        // Subscribe to real-time updates
        const subscription = subscribeToMessages(conversationId, (newMessage) => {
            // Optimistically assume sender is known if current user, or fetch if not
            // For simplicity in this step, we might need to fetch sender info if not included
            // But usually subscription payload is just the row.
            // We can locally augment it if it's us, or fetch profile if it's them.
            // For now, let's just re-fetch or construct.
            // Re-fetching is safer for sender info.
            getMessages(conversationId).then(msgs => {
                setMessages(msgs);
                scrollToBottom();
                if (newMessage.sender_id !== user.id) {
                    markAsRead(conversationId, user.id);
                }
            });
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [conversationId, user]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || sending) return;

        setSending(true);
        try {
            console.log('[ConversationPage] Sending message...');
            await sendMessage(conversationId, user.id, newMessage.trim());
            setNewMessage('');

            // Immediately re-fetch messages after sending
            console.log('[ConversationPage] Message sent, re-fetching...');
            const updatedMessages = await getMessages(conversationId);
            console.log('[ConversationPage] Got updated messages:', updatedMessages.length);
            setMessages(updatedMessages);
            scrollToBottom();
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setSending(false);
        }
    };

    if (!user) return null;

    const isKeyboardOpen = useKeyboard();

    // Auto-scroll to bottom when keyboard opens
    useEffect(() => {
        if (isKeyboardOpen) {
            // Wait for layout transition (200ms) to complete before scrolling
            setTimeout(() => {
                scrollToBottom();
            }, 250);
        }
    }, [isKeyboardOpen]);

    return (
        <div className="fixed inset-0 bg-black text-white flex flex-col z-40">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 border-b border-gray-800 bg-[#121212] shrink-0 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
                <button
                    onClick={() => router.back()}
                    className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex-1">
                    <h2 className="font-bold text-lg">Chat</h2>
                    {/* Ideally show participant name here, passed via query param or fetched */}
                </div>
            </div>

            {/* Messages Area - flex-1 to take available space */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="flex justify-center pt-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#EC1D99]"></div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <p>No messages yet.</p>
                        <p className="text-sm">Say hello!</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.sender_id === user.id;
                        const showAvatar = !isMe && (index === 0 || messages[index - 1].sender_id !== msg.sender_id);

                        return (
                            <div key={msg.id} className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                {!isMe && (
                                    <div className="w-8 h-8 shrink-0 flex items-end">
                                        {showAvatar ? (
                                            <Link href={`/profile/${msg.sender_id}`}>
                                                {msg.sender.avatar ? (
                                                    <Image
                                                        src={msg.sender.avatar}
                                                        alt={msg.sender.name}
                                                        width={32}
                                                        height={32}
                                                        className="rounded-full bg-gray-800 object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs">
                                                        {msg.sender.name?.[0]}
                                                    </div>
                                                )}
                                            </Link>
                                        ) : <div className="w-8" />}
                                    </div>
                                )}

                                <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${isMe
                                    ? 'bg-[#EC1D99] text-white rounded-tr-sm'
                                    : 'bg-[#2A2A2A] text-gray-100 rounded-tl-sm'
                                    }`}>
                                    <p className="break-words text-sm md:text-base">{msg.content}</p>
                                    <p className={`text-[10px] mt-1 opacity-70 ${isMe ? 'text-right' : 'text-left'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} className="h-4" /> {/* Spacer to ensure last message isn't flush */}
            </div>

            {/* Input Area - regular flex item, pushes up from bottom naturally */}
            <div className={`shrink-0 p-4 bg-[#121212] border-t border-gray-800 transition-all duration-200 ${!isKeyboardOpen ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom))]' : ''}`}>
                <form onSubmit={handleSend} className="flex gap-2 items-end max-w-md mx-auto">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-[#2A2A2A] text-white border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#EC1D99] placeholder-gray-500 max-h-32"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="p-3 bg-[#EC1D99] rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}
