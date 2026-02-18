"use client";
import React, { useState, useEffect } from 'react';
import { Users, Plus, X, Search, MessageCircle, ArrowUpDown } from "lucide-react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { getLatestSession } from '@/lib/auth-session';
import { useAuth } from '@/app/components/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';

import { useStore } from '@/lib/store';
import { fetchGroups as fetchGroupsData } from '@/lib/data';
import GroupShareModal from '@/app/components/GroupShareModal';
import GroupCard from './GroupCard';
import MessagesTab from './MessagesTab';

export default function GroupsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { groups, setGroups } = useStore();
    const [loading, setLoading] = useState(true);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [shareGroup, setShareGroup] = useState<{ id: string; name: string; description: string; isPrivate: boolean } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const tabParam = searchParams?.get('tab');
    const [activeTab, setActiveTab] = useState<'groups' | 'messages'>(tabParam === 'messages' ? 'messages' : 'groups');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'members' | 'alphabetical'>('newest');

    useEffect(() => {
        let isActive = true;

        if (!user) return;

        loadGroups(isActive);
        return () => {
            isActive = false;
        };
    }, [user]);

    const loadGroups = async (isActive: boolean = true) => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            if (groups.length > 0 && isActive) {
                setLoading(false);
            }

            const { currentUser } = useStore.getState();
            const fetchedGroups = await fetchGroupsData(user.id, currentUser?.communityId);

            if (isActive) {
                setGroups(fetchedGroups);
            }
        } catch (error) {
            console.error('[GroupsPage] Error fetching groups:', error);
            if (isActive) console.error('Failed to load groups');
        } finally {
            if (isActive) {
                setLoading(false);
            }
        }
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim() || !user) return;

        setCreating(true);
        try {
            const { data: groupData, error: groupError } = await supabase
                .from('groups')
                .insert({
                    name: newGroupName,
                    description: newGroupDesc,
                    avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${newGroupName}`,
                    is_private: isPrivate,
                    owner_id: user.id,
                    member_count: 1
                })
                .select()
                .single();

            if (groupError) throw groupError;

            const { error: memberError } = await supabase
                .from('group_members')
                .insert({
                    group_id: groupData.id,
                    user_id: user.id,
                    role: 'admin'
                });

            if (memberError) throw memberError;

            // toast removed
            setShowCreateGroup(false);
            setNewGroupName('');
            setNewGroupDesc('');
            setIsPrivate(false);
            loadGroups();
        } catch (error) {
            console.error('Error creating group:', error);
            console.error('Failed to create group');
        } finally {
            setCreating(false);
        }
    };

    const handleJoinGroup = async (groupId: string, isPrivate: boolean, groupName: string) => {
        if (!user) {
            console.error('Please sign in to join groups');
            return;
        }

        try {
            const { data: existingMember } = await supabase
                .from('group_members')
                .select('id')
                .eq('group_id', groupId)
                .eq('user_id', user.id)
                .single();

            if (existingMember) {
                router.push(`/groups/${groupId}`);
                return;
            }

            if (isPrivate) {
                console.log('This group is private. You need an invite to join.');
                return;
            }

            // Refresh session to ensure valid token for RLS
            // iOS-specific: Session may not be immediately available from Preferences
            // Try multiple fallback strategies to get a valid session
            let validSession = false;
            let cachedSession: ReturnType<typeof getLatestSession> = null;

            // Attempt 1: Try to refresh the session
            try {
                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                if (!refreshError && refreshData?.session) {
                    validSession = true;
                }
            } catch (refreshErr) {
                console.warn('[Groups] Session refresh failed:', refreshErr);
            }

            // Attempt 2: If refresh failed, try getSession with delay for iOS Preferences sync
            if (!validSession) {
                await new Promise(resolve => setTimeout(resolve, 500));
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    validSession = true;
                }
            }

            // Attempt 3: Use in-memory session cache from AuthProvider
            if (!validSession) {
                cachedSession = getLatestSession();
                if (cachedSession?.access_token) {
                    validSession = true;
                    console.log('[Groups] Using cached session for REST API');
                }
            }

            if (!validSession) {
                console.error('[Groups] No valid session available for user:', user.id);
                console.error('Session expired. Please log in again.');
                return;
            }

            // If we're using cached session, use REST API directly
            // Otherwise use Supabase SDK
            if (cachedSession?.access_token) {
                console.log('[Groups] Using REST API with cached session token');
                const response = await fetch(`${SUPABASE_URL}/rest/v1/group_members`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${cachedSession.access_token}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal',
                    },
                    body: JSON.stringify({
                        group_id: groupId,
                        user_id: user.id,
                        role: 'member',
                        status: 'active'
                    }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('[Groups] REST insert failed:', response.status, errorText);
                    // Check for unique violation (already a member)
                    if (errorText.includes('23505') || errorText.includes('duplicate')) {
                        // toast removed
                        loadGroups();
                        router.push(`/groups/${groupId}`);
                        return;
                    }
                    throw new Error(`Failed to join group: ${errorText}`);
                }

                console.log('[Groups] REST insert succeeded!');
            } else {
                console.log('[Groups] Using Supabase SDK');
                const { error } = await supabase
                    .from('group_members')
                    .insert({
                        group_id: groupId,
                        user_id: user.id,
                        role: 'member',
                        status: 'active'
                    });

                if (error) throw error;
            }

            // toast removed
            loadGroups();
            router.push(`/groups/${groupId}`);
        } catch (error: any) {
            console.error('Error joining group:', error);
            if (error?.code === '23505') { // Unique violation
                // toast removed
                router.push(`/groups/${groupId}`);
            } else {
                console.error(error?.message || 'Failed to join group');
            }
        }
    };

    const handleShareGroup = (group: any) => {
        setShareGroup({
            id: group.id,
            name: group.name,
            description: group.description,
            isPrivate: group.isPrivate
        });
    };

    const filteredGroups = groups.filter(group =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const sortedGroups = [...filteredGroups].sort((a, b) => {
        switch (sortBy) {
            case 'newest':
                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            case 'oldest':
                return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
            case 'members':
                return (b.memberCount || 0) - (a.memberCount || 0);
            case 'alphabetical':
                return a.name.localeCompare(b.name);
            default:
                return 0;
        }
    });

    return (
        <div className="min-h-screen bg-black text-white px-4 md:px-6 pb-24 pt-4">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header Section */}
                <div className="flex justify-between items-center gap-4">
                    <h1 className="text-3xl font-bold font-poppins tracking-tight">Community</h1>

                    <div className="flex items-center gap-3 mr-12">
                        {activeTab === 'groups' && (
                            <button
                                onClick={() => setShowCreateGroup(true)}
                                className="flex items-center gap-2 bg-[#EC1D99] hover:bg-[#d61a88] text-white px-5 h-11 rounded-full font-semibold transition-all shadow-lg shadow-[#EC1D99]/20 active:scale-95 text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Create
                            </button>
                        )}


                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-2 p-1 bg-gradient-to-br from-gray-900 to-gray-900/50 rounded-xl border border-gray-800">
                    <button
                        onClick={() => setActiveTab('groups')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${activeTab === 'groups'
                            ? 'bg-[#EC1D99] text-white shadow-lg shadow-[#EC1D99]/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        Groups
                    </button>
                    <button
                        onClick={() => setActiveTab('messages')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${activeTab === 'messages'
                            ? 'bg-[#EC1D99] text-white shadow-lg shadow-[#EC1D99]/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <MessageCircle className="w-4 h-4" />
                        Messages
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'groups' ? (
                    <>
                        {/* Search and Sort Section */}
                        <div className="flex gap-3 mb-6">
                            <div className="relative group flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-gray-500 group-focus-within:text-[#EC1D99] transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 h-12 border border-gray-800 rounded-xl leading-5 bg-gradient-to-br from-gray-900 to-gray-900/50 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-[#EC1D99]/50 focus:ring-1 focus:ring-[#EC1D99]/50 transition-all font-medium sm:text-sm"
                                    placeholder="Search for groups..."
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
                                    <option className="text-black" value="members">Most Members</option>
                                    <option className="text-black" value="alphabetical">A-Z</option>
                                </select>
                            </div>
                        </div>

                        {/* Groups Grid */}
                        {groups.length === 0 && loading ? (
                            <div className="flex justify-center py-24">
                                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#EC1D99]"></div>
                            </div>
                        ) : (
                            <>
                                {filteredGroups.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {sortedGroups.map(group => (
                                            <GroupCard
                                                key={group.id}
                                                group={group}
                                                onJoin={handleJoinGroup}
                                                onShare={handleShareGroup}
                                                onClick={(id) => router.push(`/groups/${id}`)}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 bg-gradient-to-br from-gray-900 to-gray-900/50 rounded-3xl border border-gray-800/50 text-center">
                                        <div className="bg-gray-800/50 p-4 rounded-full mb-4">
                                            <Users className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-white mb-2">
                                            {searchQuery ? 'No groups found' : 'No groups yet'}
                                        </h3>
                                        <p className="text-gray-500 max-w-sm mx-auto mb-6">
                                            {searchQuery
                                                ? `We couldn't find any groups matching "${searchQuery}"`
                                                : "Be the first to create a community and invite others to join."}
                                        </p>
                                        {!searchQuery && (
                                            <button
                                                onClick={() => setShowCreateGroup(true)}
                                                className="text-[#EC1D99] font-medium hover:underline"
                                            >
                                                Create a new group
                                            </button>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                ) : (
                    <MessagesTab />
                )}

                {/* Create Group Modal */}
                {showCreateGroup && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-[#121212] border border-gray-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-in zoom-in-95 duration-200">
                            <button
                                onClick={() => setShowCreateGroup(false)}
                                className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h2 className="text-xl font-bold mb-1">Create New Group</h2>
                            <p className="text-sm text-gray-500 mb-6">Build a space for your community</p>

                            <form onSubmit={handleCreateGroup} className="space-y-5">
                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-sm font-medium text-gray-300">Group Name</label>
                                        <span className="text-xs text-gray-500">{newGroupName.length}/50</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        maxLength={50}
                                        className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 focus:border-[#EC1D99] focus:outline-none focus:ring-1 focus:ring-[#EC1D99] transition-all text-white placeholder-gray-600"
                                        placeholder="e.g. Photography Lovers"
                                        required
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-sm font-medium text-gray-300">Description</label>
                                        <span className="text-xs text-gray-500">{newGroupDesc.length}/300</span>
                                    </div>
                                    <textarea
                                        value={newGroupDesc}
                                        onChange={(e) => setNewGroupDesc(e.target.value)}
                                        maxLength={300}
                                        className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 focus:border-[#EC1D99] focus:outline-none focus:ring-1 focus:ring-[#EC1D99] transition-all h-28 resize-none text-white placeholder-gray-600"
                                        placeholder="What is this group about?"
                                    />
                                </div>

                                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-800 bg-black/30 cursor-pointer hover:border-gray-700 transition-colors">
                                    <div className="relative flex items-center mt-1">
                                        <input
                                            type="checkbox"
                                            checked={isPrivate}
                                            onChange={(e) => setIsPrivate(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-600 bg-transparent text-[#EC1D99] focus:ring-[#EC1D99] focus:ring-offset-0 focus:ring-offset-transparent"
                                        />
                                    </div>
                                    <div>
                                        <span className="block text-sm font-medium text-white">Private Group</span>
                                        <span className="block text-xs text-gray-500">Only people with an invite link can join this group.</span>
                                    </div>
                                </label>

                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="w-full bg-[#EC1D99] hover:bg-[#d61a88] text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#EC1D99]/20 active:scale-[0.99]"
                                >
                                    {creating ? 'Creating Group...' : 'Create Group'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Share Group Modal */}
                {shareGroup && (
                    <GroupShareModal
                        group={shareGroup}
                        onClose={() => setShareGroup(null)} />
                )}
            </div>
        </div>
    );
}

