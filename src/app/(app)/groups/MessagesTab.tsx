"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import { useStore } from '@/lib/store';
import { getConversations, createConversation, ConversationWithParticipants } from '@/lib/messaging';
import { Plus, X, MessageCircle, Search, ArrowUpDown } from 'lucide-react';
import Image from 'next/image';
import SearchBar from '@/app/components/SearchBar';
import { supabase } from '@/lib/supabase';

interface MessagesTabProps {
    onNewMessage?: () => void;
}

export default function MessagesTab({ onNewMessage }: MessagesTabProps) {
    const { user } = useAuth();
    const router = useRouter();
    const { friends, fetchFriends } = useStore();
    const [conversations, setConversations] = useState<ConversationWithParticipants[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewChat, setShowNewChat] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [conversationFilter, setConversationFilter] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');

    useEffect(() => {
        if (!user) return;
        loadConversations();

        // Subscribe to real-time updates for new messages
        const channel = supabase
            .channel('messages-tab-messages')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen for INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'messages',
                },
                () => {
                    // Reload conversations when any message changes
                    loadConversations();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const loadConversations = async () => {
        if (!user) return;
        setLoading(true);
        const data = await getConversations(user.id);
        setConversations(data);
        setLoading(false);
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        // Sanitize query to prevent PostgREST filter manipulation
        const sanitizedQuery = query.replace(/[.,()[\]{}]/g, '').trim();
        if (!sanitizedQuery) {
            setSearchResults([]);
            setSearching(false);
            return;
        }
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .ilike('name', `%${sanitizedQuery}%`)
            .limit(10);

        if (data) {
            setSearchResults(data.filter((u: any) => u.user_id !== user?.id));
        }
        setSearching(false);
    };

    const startChat = async (otherUserId: string) => {
        if (!user) return;
        try {
            const existing = conversations.find(c =>
                c.participants.some(p => p.user.user_id === otherUserId)
            );

            if (existing) {
                router.push(`/inbox/${existing.id}`);
                setShowNewChat(false);
                return;
            }

            const conversationId = await createConversation(user.id, otherUserId);
            setShowNewChat(false);
            router.push(`/inbox/${conversationId}`);
        } catch (error) {
            console.error('Failed to start chat:', error);
            console.error('Failed to start conversation');
        }
    };

    if (!user) return null;

    // Filter conversations by participant name
    const filteredConversations = conversations.filter(conv => {
        if (!conversationFilter.trim()) return true;
        const otherParticipant = conv.participants.find(p => p.user.user_id !== user?.id)?.user;
        if (!otherParticipant) return false;
        return otherParticipant.name.toLowerCase().includes(conversationFilter.toLowerCase());
    }).sort((a, b) => {
        const participantA = a.participants.find(p => p.user.user_id !== user?.id)?.user;
        const participantB = b.participants.find(p => p.user.user_id !== user?.id)?.user;

        switch (sortBy) {
            case 'newest':
                return new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime();
            case 'oldest':
                return new Date(a.last_message_at || 0).getTime() - new Date(b.last_message_at || 0).getTime();
            case 'alphabetical':
                return (participantA?.name || '').localeCompare(participantB?.name || '');
            default:
                return 0;
        }
    });

    return (
        <>
            {/* Search Bar for Conversations */}
            <div className="flex gap-3 mb-4">
                <div className="relative group flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-500 group-focus-within:text-[#EC1D99] transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={conversationFilter}
                        onChange={(e) => setConversationFilter(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 h-12 border border-gray-800 rounded-xl leading-5 bg-gradient-to-br from-gray-900 to-gray-900/50 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-[#EC1D99]/50 focus:ring-1 focus:ring-[#EC1D99]/50 transition-all font-medium sm:text-sm"
                        placeholder="Search conversations..."
                    />
                </div>

                {/* Sort Dropdown */}
                <div className="relative">
                    {/* Visual Icon (Behind the select) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <ArrowUpDown className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                    </div>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="appearance-none w-12 py-3 pl-8 pr-1 h-12 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-xl text-transparent focus:outline-none focus:border-[#EC1D99]/50 focus:ring-1 focus:ring-[#EC1D99]/50 transition-all cursor-pointer hover:bg-white/5 relative z-20"
                        aria-label="Sort by"
                    >
                        <option className="text-black" value="newest">Newest</option>
                        <option className="text-black" value="oldest">Oldest</option>
                        <option className="text-black" value="alphabetical">A-Z</option>
                    </select>
                </div>
            </div>

            {/* Conversations List */}
            <div className="space-y-2">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#EC1D99]"></div>
                    </div>
                ) : filteredConversations.length === 0 && conversationFilter ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-gradient-to-br from-gray-900 to-gray-900/50 rounded-3xl border border-gray-800/50 text-center">
                        <p className="text-gray-500">No conversations matching "{conversationFilter}"</p>
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-gradient-to-br from-gray-900 to-gray-900/50 rounded-3xl border border-gray-800/50 text-center">
                        <div className="bg-gray-800/50 p-4 rounded-full mb-4">
                            <MessageCircle className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">No messages yet</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mb-6">
                            Start a conversation with someone you follow.
                        </p>
                        <button
                            onClick={() => {
                                setShowNewChat(true);
                                if (friends.length === 0) fetchFriends();
                            }}
                            className="text-[#EC1D99] font-medium hover:underline"
                        >
                            Start a conversation
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredConversations.map(conv => {
                            const otherParticipant = conv.participants.find(p => p.user.user_id !== user.id)?.user;
                            if (!otherParticipant) return null;

                            return (
                                <button
                                    key={conv.id}
                                    onClick={() => router.push(`/inbox/${conv.id}`)}
                                    className="w-full text-left flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/50 hover:bg-white/5 transition-colors border border-gray-800/50 hover:border-white/10"
                                >
                                    <div className="relative shrink-0">
                                        <Image
                                            src={otherParticipant.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${otherParticipant.user_id}`}
                                            alt={otherParticipant.name}
                                            width={48}
                                            height={48}
                                            className="rounded-full bg-gray-800 object-cover w-12 h-12"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <span className="font-semibold truncate text-base">{otherParticipant.name}</span>
                                            <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                                {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-400 truncate">
                                            {conv.last_message_preview || 'New conversation'}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Floating New Message Button */}
            <button
                onClick={() => {
                    setShowNewChat(true);
                    if (friends.length === 0) fetchFriends();
                }}
                className="fixed bottom-24 right-6 p-4 bg-[#EC1D99] rounded-full hover:bg-[#d61a88] transition-colors shadow-lg shadow-pink-500/30 z-40"
            >
                <Plus className="w-6 h-6 text-white" />
            </button>

            {/* New Chat Modal/Overlay */}
            {showNewChat && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in slide-in-from-bottom duration-200">
                    <div className="p-4 border-b border-gray-800 flex items-center gap-3 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
                        <button onClick={() => setShowNewChat(false)} className="p-2 -ml-2 hover:bg-white/10 rounded-full">
                            <X className="w-6 h-6" />
                        </button>
                        <h2 className="text-lg font-bold">New Message</h2>
                    </div>
                    <div className="p-4">
                        <SearchBar
                            value={searchQuery}
                            onChange={handleSearch}
                            placeholder="Search people..."
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 pt-0">
                        {searchQuery ? (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Search Results</p>
                                {searchResults.map((u: any) => (
                                    <div key={u.user_id} onClick={() => startChat(u.user_id)} className="cursor-pointer">
                                        <div className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl">
                                            <Image
                                                src={u.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${u.user_id}`}
                                                alt={u.name}
                                                width={40} height={40} className="rounded-full bg-gray-800 object-cover w-10 h-10"
                                            />
                                            <div>
                                                <div className="font-medium">{u.name}</div>
                                                <div className="text-xs text-gray-500">@{u.name.toLowerCase().replace(/\s/g, '')}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {searchResults.length === 0 && !searching && (
                                    <p className="text-center text-gray-500 py-4">No people found</p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Suggested</p>
                                {friends.map(friend => (
                                    <div key={friend.id} onClick={() => startChat(friend.id)} className="cursor-pointer">
                                        <div className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl">
                                            <Image
                                                src={friend.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${friend.id}`}
                                                alt={friend.name}
                                                width={40} height={40} className="rounded-full bg-gray-800 object-cover w-10 h-10"
                                            />
                                            <div className="font-medium">{friend.name}</div>
                                        </div>
                                    </div>
                                ))}
                                {friends.length === 0 && (
                                    <p className="text-gray-500 text-sm">Follow people to see them here.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
