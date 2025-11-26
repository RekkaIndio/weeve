"use client";
import React, { useState, useEffect } from 'react';
import { Users, Plus, X, Lock, Globe } from "lucide-react";
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { useAuth } from '@/app/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import NotificationBell from "@/app/components/NotificationBell";
import { useStore } from '@/lib/store';
import { fetchGroups as fetchGroupsData } from '@/lib/data';

type GroupRow = Database['public']['Tables']['groups']['Row'];

export default function GroupsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { groups, setGroups } = useStore();
    const [loading, setLoading] = useState(true);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            // If we already have groups in the store, don't show loading spinner
            if (groups.length > 0) {
                setLoading(false);
            }

            const fetchedGroups = await fetchGroupsData();
            setGroups(fetchedGroups);
        } catch (error) {
            console.error('Error fetching groups:', error);
            toast.error('Failed to load groups');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim() || !user) return;

        setCreating(true);
        try {
            // 1. Create the group
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

            // 2. Add creator as admin member
            const { error: memberError } = await supabase
                .from('group_members')
                .insert({
                    group_id: groupData.id,
                    user_id: user.id,
                    role: 'admin'
                });

            if (memberError) throw memberError;

            toast.success('Group created successfully!');
            setShowCreateGroup(false);
            setNewGroupName('');
            setNewGroupDesc('');
            setIsPrivate(false);
            loadGroups(); // Refresh list
        } catch (error) {
            console.error('Error creating group:', error);
            toast.error('Failed to create group');
        } finally {
            setCreating(false);
        }
    };

    const handleJoinGroup = async (groupId: string, isPrivate: boolean, groupName: string) => {
        if (!user) {
            toast.error('Please sign in to join groups');
            return;
        }

        try {
            // Check if already a member
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
                // For now, just show a message. In future, implement request system.
                toast.info('This group is private. You need an invite to join.');
                return;
            }

            // Join public group
            const { error } = await supabase
                .from('group_members')
                .insert({
                    group_id: groupId,
                    user_id: user.id,
                    role: 'member'
                });

            if (error) throw error;

            // Update member count locally or refetch
            toast.success(`Joined ${groupName}!`);
            loadGroups();
            router.push(`/groups/${groupId}`);
        } catch (error) {
            console.error('Error joining group:', error);
            toast.error('Failed to join group');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-24">
            <div className="flex justify-between items-center mb-6 gap-3">
                <h1 className="text-2xl font-bold font-poppins">Groups</h1>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowCreateGroup(true)}
                        className="flex items-center gap-1 text-sm bg-[#EC1D99] px-3 py-1.5 rounded-full hover:bg-[#d61a88] transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create
                    </button>
                    {user && (
                        <NotificationBell
                            className="bg-gray-900/80 border border-gray-800"
                            badgeClassName="bg-[#EC1D99]"
                        />
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#EC1D99]"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {groups.map(group => (
                        <div
                            key={group.id}
                            onClick={() => router.push(`/groups/${group.id}`)}
                            className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:border-gray-700 transition-colors cursor-pointer"
                        >
                            <img src={group.avatar || ''} alt={group.name} className="w-12 h-12 rounded-full bg-gray-800" />
                            <div className="flex-1">
                                <h3 className="font-bold text-base">{group.name}</h3>
                                <p className="text-xs text-gray-400 line-clamp-1">{group.description}</p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                    <Users className="w-3 h-3" />
                                    <span>{group.memberCount || 0} members</span>
                                    {group.isPrivate ? (
                                        <span className="flex items-center gap-1 bg-gray-800 px-1.5 rounded text-[10px]">
                                            <Lock className="w-2 h-2" /> Private
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 bg-gray-800 px-1.5 rounded text-[10px]">
                                            <Globe className="w-2 h-2" /> Public
                                        </span>
                                    )}
                                </div>
                            </div>
                            {!group.isMember && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleJoinGroup(group.id, group.isPrivate, group.name);
                                    }}
                                    className="text-xs font-medium text-[#EC1D99] border border-[#EC1D99] px-3 py-1 rounded-full hover:bg-[#EC1D99] hover:text-white transition-colors"
                                >
                                    Join
                                </button>
                            )}
                        </div>
                    ))}

                    {groups.length === 0 && (
                        <div className="text-center py-16 text-gray-500">
                            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No groups yet</p>
                            <p className="text-sm mt-2">Create your first group to get started</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create Group Modal */}
            {showCreateGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setShowCreateGroup(false)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h2 className="text-xl font-bold mb-4">Create New Group</h2>
                        <form onSubmit={handleCreateGroup} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Group Name</label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    className="w-full bg-black border border-gray-800 rounded-lg p-3 focus:border-[#EC1D99] focus:outline-none transition-colors"
                                    placeholder="e.g. Photography Lovers"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Description</label>
                                <textarea
                                    value={newGroupDesc}
                                    onChange={(e) => setNewGroupDesc(e.target.value)}
                                    className="w-full bg-black border border-gray-800 rounded-lg p-3 focus:border-[#EC1D99] focus:outline-none transition-colors h-24 resize-none"
                                    placeholder="What is this group about?"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isPrivate"
                                    checked={isPrivate}
                                    onChange={(e) => setIsPrivate(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-800 bg-black text-[#EC1D99] focus:ring-[#EC1D99]"
                                />
                                <label htmlFor="isPrivate" className="text-sm text-gray-400 select-none">
                                    Private Group (Invite only)
                                </label>
                            </div>
                            <button
                                type="submit"
                                disabled={creating}
                                className="w-full bg-[#EC1D99] hover:bg-[#d61a88] text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {creating ? 'Creating...' : 'Create Group'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
