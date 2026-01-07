"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import { useStore } from '@/lib/store';
import { getConversations, createConversation, ConversationWithParticipants } from '@/lib/messaging';
import { Plus, X, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import SearchBar from '@/app/components/SearchBar';
import { supabase } from '@/lib/supabase';

export default function InboxPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { friends, fetchFriends } = useStore();
  const [conversations, setConversations] = useState<ConversationWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadConversations();

    // Subscribe to real-time updates for new messages
    const channel = supabase
      .channel('inbox-messages')
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
    // Search users by name or username (simulated by name query)
    const { data, error } = await supabase
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
      // Check if we already have a conversation with this user
      // Optimization: check existing loaded conversations
      const existing = conversations.find(c =>
        c.participants.some(p => p.user.user_id === otherUserId)
      );

      if (existing) {
        router.push(`/inbox/${existing.id}`);
        return;
      }

      const conversationId = await createConversation(user.id, otherUserId);
      router.push(`/inbox/${conversationId}`);
    } catch (error) {
      console.error('Failed to start chat:', error);
      console.error('Failed to start conversation');
    }
  };

  if (!user) return null;

  return (
    <main className="min-h-screen bg-black text-white pb-24">
      <div className="max-w-md mx-auto min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-gray-800 sticky top-0 bg-black/80 backdrop-blur-md z-10 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
          <h1 className="text-2xl font-bold font-poppins">Inbox</h1>
          <button
            onClick={() => {
              setShowNewChat(true);
              // Initial load of friends if needed
              if (friends.length === 0) fetchFriends();
            }}
            className="p-2 bg-[#EC1D99] rounded-full hover:bg-[#d61a88] transition-colors shadow-lg shadow-pink-500/20"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#EC1D99]"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-gray-800/50 p-4 rounded-full mb-4">
                <MessageCircle className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-400 mb-4">No messages yet</p>
              <button
                onClick={() => setShowNewChat(true)}
                className="text-[#EC1D99] font-medium hover:underline"
              >
                Start a conversation
              </button>
            </div>
          ) : (
            conversations.map(conv => {
              // Find the other participant
              const otherParticipant = conv.participants.find(p => p.user.user_id !== user.id)?.user;
              if (!otherParticipant) return null;

              const isUnread = false; // Logic for unread based on message counts or read status needs refinement in messaging.ts
              // For MVP, we can iterate messages or track "last_read_at" < "last_message_at"
              // Using cached logic if available, or just simple style for now.
              // We have conv.last_message_at and participant.last_read_at
              // Find 'my' participant entry
              // const myEntry = conv.participants.find(p => p.user.user_id === user.id);
              // const isUnread = myEntry && new Date(conv.last_message_at) > new Date(myEntry.last_read_at);

              return (
                <button
                  key={conv.id}
                  onClick={() => router.push(`/inbox/${conv.id}`)}
                  className="w-full text-left flex items-center gap-3 p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                >
                  <div className="relative shrink-0">
                    <Image
                      src={otherParticipant.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${otherParticipant.user_id}`}
                      alt={otherParticipant.name}
                      width={48}
                      height={48}
                      className="rounded-full bg-gray-800 object-cover"
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
            })
          )}
        </div>

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
                      {/* Reuse User List Item or simple layout */}
                      <div className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl">
                        <Image
                          src={u.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${u.user_id}`}
                          alt={u.name}
                          width={40} height={40} className="rounded-full bg-gray-800"
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
                          width={40} height={40} className="rounded-full bg-gray-800"
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
      </div>
    </main>
  );
}
