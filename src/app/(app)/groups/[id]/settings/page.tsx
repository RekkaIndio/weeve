"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/components/AuthProvider';
import { ArrowLeft, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

export default function GroupSettingsPage() {
    const params = useParams();
    const id = params?.id as string;
    const { user } = useAuth();
    const router = useRouter();
    const [group, setGroup] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedNewOwner, setSelectedNewOwner] = useState<string | null>(null);
    const [transferring, setTransferring] = useState(false);

    useEffect(() => {
        if (id && user) fetchGroupData();
    }, [id, user]);

    const fetchGroupData = async () => {
        try {
            // Fetch group
            const { data: groupData, error: groupError } = await supabase
                .from('groups')
                .select('*')
                .eq('id', id)
                .single();

            if (groupError) throw groupError;

            // Verify ownership
            if (groupData.owner_id !== user?.id) {
                toast.error('Unauthorized');
                router.push(`/groups/${id}`);
                return;
            }

            setGroup(groupData);
            setName(groupData.name);
            setDescription(groupData.description);
            setIsPrivate(groupData.is_private);

            // Fetch members
            const { data: membersData, error: membersError } = await supabase
                .from('group_members')
                .select('*, profiles:user_id(name, avatar)')
                .eq('group_id', id);

            if (membersError) throw membersError;
            setMembers(membersData || []);

        } catch (error) {
            console.error('Error fetching group settings:', error);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('groups')
                .update({
                    name,
                    description,
                    is_private: isPrivate,
                    avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${name}` // Update avatar if name changes
                })
                .eq('id', id);

            if (error) throw error;
            toast.success('Group updated');
            router.push(`/groups/${id}`);
        } catch (error) {
            console.error('Error updating group:', error);
            toast.error('Failed to update group');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) return;

        try {
            const { error } = await supabase
                .from('groups')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Group deleted');
            router.push('/groups');
        } catch (error) {
            console.error('Error deleting group:', error);
            toast.error('Failed to delete group');
        }
    };

    const handleRemoveMember = async (memberId: string, memberName: string) => {
        if (!confirm(`Remove ${memberName} from the group?`)) return;

        try {
            const { error } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', id)
                .eq('user_id', memberId);

            if (error) throw error;
            toast.success('Member removed');
            setMembers(members.filter(m => m.user_id !== memberId));
        } catch (error) {
            console.error('Error removing member:', error);
            toast.error('Failed to remove member');
        }
    };

    const handleLeaveGroup = async () => {
        if (!user) return;

        // Check if user is the owner
        if (group.owner_id === user.id) {
            // Check if there are other members
            const otherMembers = members.filter(m => m.user_id !== user.id);

            if (otherMembers.length === 0) {
                // Solo owner - must delete group instead
                toast.error('You are the only member. Please delete the group from the Danger Zone instead.');
                return;
            }

            // Show transfer modal
            setShowTransferModal(true);
            return;
        }

        // Regular member or admin (non-owner) can leave directly
        if (!confirm('Are you sure you want to leave this group?')) return;

        try {
            const { error } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', id)
                .eq('user_id', user.id);

            if (error) throw error;
            toast.success('Left group');
            router.push('/groups');
        } catch (error) {
            console.error('Error leaving group:', error);
            toast.error('Failed to leave group');
        }
    };

    const handleTransferOwnership = async () => {
        if (!selectedNewOwner || !user) return;

        setTransferring(true);
        try {
            // Update group owner
            const { error: ownerError } = await supabase
                .from('groups')
                .update({ owner_id: selectedNewOwner })
                .eq('id', id);

            if (ownerError) throw ownerError;

            // Update new owner's role to admin (if not already)
            const { error: roleError } = await supabase
                .from('group_members')
                .update({ role: 'admin' })
                .eq('group_id', id)
                .eq('user_id', selectedNewOwner);

            if (roleError) throw roleError;

            // Remove the leaving user from group
            const { error: leaveError } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', id)
                .eq('user_id', user.id);

            if (leaveError) throw leaveError;

            toast.success('Ownership transferred successfully');
            setShowTransferModal(false);
            router.push('/groups');
        } catch (error) {
            console.error('Error transferring ownership:', error);
            toast.error('Failed to transfer ownership');
        } finally {
            setTransferring(false);
        }
    };


    if (loading) return (
        <div className="min-h-screen bg-black flex items-center justify-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#EC1D99]"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-24">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => router.back()} className="p-2 hover:bg-gray-900 rounded-full">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-bold">Group Settings</h1>
            </div>

            <div className="max-w-md mx-auto space-y-8">
                {/* General Settings */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-[#EC1D99]">General</h2>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Group Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 focus:border-[#EC1D99] focus:outline-none transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 focus:border-[#EC1D99] focus:outline-none transition-colors h-24 resize-none"
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
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-[#EC1D99] hover:bg-[#d61a88] text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                {/* Member Management */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-[#EC1D99]">Members ({members.length})</h2>
                    <div className="space-y-3">
                        {members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between bg-gray-900/50 p-3 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={member.profiles?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`}
                                        alt={member.profiles?.name}
                                        className="w-10 h-10 rounded-full bg-gray-800"
                                    />
                                    <div>
                                        <p className="font-medium">{member.profiles?.name || 'Unknown User'}</p>
                                        <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                                    </div>
                                </div>
                                {member.user_id !== user?.id && (
                                    <button
                                        onClick={() => handleRemoveMember(member.user_id, member.profiles?.name)}
                                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Leave Group Section */}
                <div className="pt-8 border-t border-gray-800">
                    <h2 className="text-lg font-bold text-gray-300 mb-4">Leave Group</h2>
                    <p className="text-sm text-gray-500 mb-4">
                        {group?.owner_id === user?.id
                            ? "As the owner, you must transfer ownership before leaving."
                            : "Leave this group and remove yourself from all group activities."}
                    </p>
                    <button
                        onClick={handleLeaveGroup}
                        className="w-full border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white font-bold py-3 rounded-lg transition-colors"
                    >
                        Leave Group
                    </button>
                </div>

                {/* Danger Zone */}
                <div className="pt-8 border-t border-gray-800">
                    <h2 className="text-lg font-bold text-red-500 mb-4">Danger Zone</h2>
                    <button
                        onClick={handleDeleteGroup}
                        className="w-full border border-red-500/50 text-red-500 hover:bg-red-500/10 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Group
                    </button>
                </div>
            </div>

            {/* Transfer Ownership Modal */}
            {showTransferModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setShowTransferModal(false)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h2 className="text-xl font-bold mb-2">Transfer Ownership</h2>
                        <p className="text-sm text-gray-400 mb-4">
                            Select a new owner for this group before leaving.
                        </p>
                        <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                            {members
                                .filter(m => m.user_id !== user?.id)
                                .map((member) => (
                                    <button
                                        key={member.id}
                                        onClick={() => setSelectedNewOwner(member.user_id)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${selectedNewOwner === member.user_id
                                            ? 'bg-[#EC1D99]/20 border border-[#EC1D99]'
                                            : 'bg-gray-800/50 hover:bg-gray-800 border border-transparent'
                                            }`}
                                    >
                                        <img
                                            src={member.profiles?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`}
                                            alt={member.profiles?.name}
                                            className="w-10 h-10 rounded-full bg-gray-700"
                                        />
                                        <div className="flex-1 text-left">
                                            <p className="font-medium">{member.profiles?.name || 'Unknown User'}</p>
                                            <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                                        </div>
                                        {selectedNewOwner === member.user_id && (
                                            <div className="w-5 h-5 rounded-full bg-[#EC1D99] flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                ))}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowTransferModal(false)}
                                className="flex-1 border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white font-medium py-3 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleTransferOwnership}
                                disabled={!selectedNewOwner || transferring}
                                className="flex-1 bg-[#EC1D99] hover:bg-[#d61a88] text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {transferring ? 'Transferring...' : 'Transfer & Leave'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
