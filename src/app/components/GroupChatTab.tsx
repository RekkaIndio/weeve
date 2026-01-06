"use client";

import { useRef, useEffect, useState } from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import {
    getGroupMessages,
    sendGroupMessage,
    subscribeToGroupMessages,
    likeGroupMessage,
    unlikeGroupMessage,
    GroupMessage
} from '@/lib/group-messaging';
import { Send, User, Reply, Heart, X } from 'lucide-react';
import Link from 'next/link';

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
    const [replyingTo, setReplyingTo] = useState<GroupMessage | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isMember) {
            setLoading(false);
            return;
        }

        loadMessages();

        const subscription = subscribeToGroupMessages(groupId, (message) => {
            // Re-fetch to get correct state if needed, or append
            // For simplicity in keeping sort order and potential missed updates
            // we could just append, but likes might be tricky.
            // Appending is safer for chat feel.
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

    const cancelReply = () => setReplyingTo(null);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !user || !isMember) return;

        const content = newMessage.trim();
        // Optimistically clear input but don't add message yet (wait for DB confirm usually, or optimistic UI)
        // Given existing code didn't do optimistic UI fully, I'll stick to simple flow but clear input
        setNewMessage('');
        setReplyingTo(null);
        setSending(true);

        try {
            await sendGroupMessage(groupId, user.id, content, replyingTo?.id);
        } catch (error) {
            console.error('Failed to send message:', error);
            setNewMessage(content); // Restore
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

    const handleLike = async (msg: GroupMessage) => {
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
                await unlikeGroupMessage(msg.id, user.id);
            } else {
                await likeGroupMessage(msg.id, user.id);
            }
        } catch (error) {
            console.error('Failed to toggle like:', error);
            setMessages(messages); // Revert
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

    const scrollToMessage = (messageId: string) => {
        const element = document.getElementById(`group-message-${messageId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('bg-white/5');
            setTimeout(() => {
                element.classList.remove('bg-white/5');
            }, 1000);
        }
    };

    return (
        <div className="flex flex-col flex-1 bg-gray-900/30 border-x border-gray-800 relative h-full">
            {/* Messages Area */}
            <div className="flex-1 p-4 space-y-4 pb-28 overflow-y-auto">
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
                                id={`group-message-${msg.id}`}
                                className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} group/message transition-colors duration-500 rounded-lg p-1`}
                            >
                                <Link href={`/profile/${msg.sender_id}`} className="shrink-0">
                                    <img
                                        src={msg.sender?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${msg.sender_id}`}
                                        alt={msg.sender?.name || 'User'}
                                        className="w-8 h-8 rounded-full bg-gray-800 object-cover hover:opacity-80 transition-opacity"
                                    />
                                </Link>
                                <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
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

                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="text-xs font-medium text-gray-300">
                                            {msg.sender?.name || 'Unknown'}
                                        </span>
                                        <span className="text-[10px] text-gray-500">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <div
                                        className={`px-4 py-2 rounded-2xl text-sm relative ${isMe
                                            ? 'bg-[#EC1D99] text-white rounded-tr-none'
                                            : 'bg-gray-800 text-gray-200 rounded-tl-none'
                                            }`}
                                    >
                                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                        {/* Like Count */}
                                        {msg.likes_count > 0 && (
                                            <div className="absolute -bottom-2 -right-2 bg-gray-900 border border-gray-700 rounded-full px-1.5 py-0.5 flex items-center gap-0.5 shadow-sm">
                                                <Heart className="w-3 h-3 fill-pink-500 text-pink-500" />
                                                <span className="text-[10px] text-white">{msg.likes_count}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className={`flex items-center gap-2 mt-1 px-1 transition-opacity ${isMe ? 'flex-row-reverse' : ''}`}>
                                        <button
                                            onClick={() => handleLike(msg)}
                                            className={`p-1.5 rounded-full hover:bg-white/10 ${msg.has_liked ? 'text-pink-500' : 'text-gray-500 hover:text-gray-300'}`}
                                            title="Like"
                                        >
                                            <Heart className={`w-3.5 h-3.5 ${msg.has_liked ? 'fill-current' : ''}`} />
                                        </button>
                                        <button
                                            onClick={() => setReplyingTo(msg)}
                                            className="p-1.5 rounded-full hover:bg-white/10 text-gray-500 hover:text-gray-300"
                                            title="Reply"
                                        >
                                            <Reply className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Sticky to bottom */}
            <div className="sticky bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-10">
                {replyingTo && (
                    <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-800 flex items-center justify-between animate-in slide-in-from-bottom-2">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#EC1D99] font-semibold mb-0.5">Replying to {replyingTo.sender?.name}</p>
                            <p className="text-xs text-gray-400 truncate">{replyingTo.content}</p>
                        </div>
                        <button onClick={cancelReply} className="p-1.5 hover:bg-white/10 rounded-full text-gray-400">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <div className="p-4">
                    <form
                        onSubmit={handleSendMessage}
                        className="flex items-end gap-2"
                    >
                        <div className="flex-1 relative">
                            <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={replyingTo ? "Type a reply..." : "Type a message..."}
                                className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-[#EC1D99] focus:ring-1 focus:ring-[#EC1D99] resize-none min-h-[46px] max-h-32"
                                rows={1}
                                style={{ height: 'auto', minHeight: '46px' }}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                                }}
                                ref={(input) => {
                                    if (replyingTo && input) input.focus();
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
        </div>
    );
}
