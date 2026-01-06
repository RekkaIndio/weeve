"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import { useStore } from '@/lib/store';
import {
    getMessages,
    sendMessage,
    subscribeToMessages,
    markAsRead,
    MessageWithSender,
    likeMessage,
    unlikeMessage
} from '@/lib/messaging';
import { ArrowLeft, Send, Reply, Heart, X } from 'lucide-react';
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
    const [replyingTo, setReplyingTo] = useState<MessageWithSender | null>(null);
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

    const cancelReply = () => setReplyingTo(null);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || sending) return;

        setSending(true);
        try {
            console.log('[ConversationPage] Sending message...');
            await sendMessage(conversationId, user.id, newMessage.trim(), replyingTo?.id);
            setNewMessage('');
            setReplyingTo(null);

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

    const handleLike = async (msg: MessageWithSender) => {
        if (!user) return;

        // Optimistic update
        const isLiked = msg.has_liked;
        const newMessages = messages.map(m => {
            if (m.id === msg.id) {
                return {
                    ...m,
                    has_liked: !isLiked,
                    likes_count: isLiked ? m.likes_count - 1 : m.likes_count + 1
                };
            }
            return m;
        });
        setMessages(newMessages);

        try {
            if (isLiked) {
                await unlikeMessage(msg.id, user.id);
            } else {
                await likeMessage(msg.id, user.id);
            }
        } catch (error) {
            console.error('Failed to toggle like:', error);
            // Revert on error
            setMessages(messages);
        }
    };

    if (!user) return null;

    const isKeyboardOpen = useKeyboard();

    // Auto-scroll to bottom when keyboard opens
    useEffect(() => {
        if (isKeyboardOpen) {
            setTimeout(() => {
                scrollToBottom();
            }, 250);
        }
    }, [isKeyboardOpen]);

    const scrollToMessage = (messageId: string) => {
        const element = document.getElementById(`message-${messageId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('bg-white/5');
            setTimeout(() => {
                element.classList.remove('bg-white/5');
            }, 1000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black text-white flex flex-col z-40">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 border-b border-gray-800 bg-[#121212] shrink-0 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
                <button
                    onClick={() => router.push('/groups?tab=messages')}
                    className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex-1">
                    <h2 className="font-bold text-lg">Chat</h2>
                </div>
            </div>

            {/* Messages Area */}
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
                            <div
                                key={msg.id}
                                id={`message-${msg.id}`}
                                className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'} group/message transition-colors duration-500 rounded-lg p-1`}
                            >
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

                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                                    {/* Reply Context */}
                                    {msg.reply_to_message && (
                                        <div
                                            onClick={() => msg.reply_to_message?.id && scrollToMessage(msg.reply_to_message.id)}
                                            className={`mb-1 px-3 py-2 rounded-lg bg-gray-800/50 text-xs border-l-2 border-[#EC1D99] cursor-pointer hover:bg-gray-800 transition-colors ${isMe ? 'mr-1' : 'ml-1'}`}
                                        >
                                            <p className="font-semibold text-[#EC1D99] mb-0.5">{msg.reply_to_message.sender.name}</p>
                                            <p className="text-gray-400 line-clamp-1">{msg.reply_to_message.content}</p>
                                        </div>
                                    )}

                                    <div
                                        className={`px-4 py-2 rounded-2xl relative group-active/message:scale-[0.98] transition-transform ${isMe
                                            ? 'bg-[#EC1D99] text-white rounded-tr-sm'
                                            : 'bg-[#2A2A2A] text-gray-100 rounded-tl-sm'
                                            }`}
                                    >
                                        <p className="break-words text-sm md:text-base">{msg.content}</p>
                                        <div className="flex items-center justify-end gap-2 mt-1">
                                            <p className={`text-[10px] opacity-70`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            {/* Like Count */}
                                            {msg.likes_count > 0 && (
                                                <div className="flex items-center gap-0.5 bg-black/20 rounded-full px-1.5 py-0.5">
                                                    <Heart className="w-3 h-3 fill-pink-500 text-pink-500" />
                                                    <span className="text-[10px]">{msg.likes_count}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className={`flex items-center gap-2 mt-1 px-1 transition-opacity ${isMe ? 'flex-row-reverse' : ''}`}>
                                        <button
                                            onClick={() => handleLike(msg)}
                                            className={`p-1.5 rounded-full hover:bg-white/10 ${msg.has_liked ? 'text-pink-500' : 'text-gray-500 hover:text-gray-300'}`}
                                        >
                                            <Heart className={`w-4 h-4 ${msg.has_liked ? 'fill-current' : ''}`} />
                                        </button>
                                        <button
                                            onClick={() => setReplyingTo(msg)}
                                            className="p-1.5 rounded-full hover:bg-white/10 text-gray-500 hover:text-gray-300"
                                        >
                                            <Reply className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input Area */}
            <div className={`shrink-0 bg-[#121212] border-t border-gray-800 transition-all duration-200 ${!isKeyboardOpen ? 'pb-[calc(env(safe-area-inset-bottom))]' : ''}`}>
                {replyingTo && (
                    <div className="px-4 py-3 bg-gray-900 border-b border-gray-800 flex items-center justify-between animate-in slide-in-from-bottom-2">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#EC1D99] font-semibold mb-0.5">Replying to {replyingTo.sender.name}</p>
                            <p className="text-xs text-gray-400 truncate">{replyingTo.content}</p>
                        </div>
                        <button onClick={cancelReply} className="p-1.5 hover:bg-white/10 rounded-full text-gray-400">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <div className="p-4">
                    <form onSubmit={handleSend} className="flex gap-2 items-end max-w-md mx-auto">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={replyingTo ? "Type a reply..." : "Type a message..."}
                            className="flex-1 bg-[#2A2A2A] text-white border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#EC1D99] placeholder-gray-500 max-h-32"
                            ref={(input) => {
                                // Auto-focus input when replying
                                if (replyingTo && input) input.focus();
                            }}
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
        </div>
    );
}
