"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/components/AuthProvider';
import { ArrowLeft, Trash2, Save, X, Check, UserPlus, Crown, Shield, Plus, Tag, Camera, Image as ImageIcon, Palette, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { capturePhoto } from '@/lib/camera';
import Link from 'next/link';

// Types
interface GroupRole {
    id: string;
    group_id: string;
    name: string;
    badge_url: string | null;
    color: string;
    permissions: { can_moderate?: boolean; can_manage_members?: boolean; can_manage_stories?: boolean };
    display_order: number;
    created_at: string;
}

interface MemberRole {
    id: string;
    role_id: string;
    user_id: string;
    role?: GroupRole;
}

const PRESET_COLORS = [
    '#EC1D99', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#F97316'
];

export default function GroupSettingsPage() {
    const params = useParams();
    const id = params?.id as string;
    const { user } = useAuth();
    const router = useRouter();
    const [group, setGroup] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedNewOwner, setSelectedNewOwner] = useState<string | null>(null);
    const [transferring, setTransferring] = useState(false);

    // Role management state
    const [roles, setRoles] = useState<GroupRole[]>([]);
    const [memberRoles, setMemberRoles] = useState<MemberRole[]>([]);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState<GroupRole | null>(null);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleColor, setNewRoleColor] = useState('#EC1D99');
    const [newRoleBadgeUrl, setNewRoleBadgeUrl] = useState<string | null>(null);
    const [newRolePermissions, setNewRolePermissions] = useState({ can_moderate: false, can_manage_members: false, can_manage_stories: false });
    const [savingRole, setSavingRole] = useState(false);
    const [uploadingBadge, setUploadingBadge] = useState(false);
    const [showAssignRoleModal, setShowAssignRoleModal] = useState(false);
    const [selectedMemberForRole, setSelectedMemberForRole] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

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
            if (membersError) throw membersError;

            const activeMembers = (membersData || []).filter((m: any) => m.status === 'active' || !m.status);
            const pendingRequests = (membersData || []).filter((m: any) => m.status === 'pending');

            setMembers(activeMembers);
            setRequests(pendingRequests);

            // Fetch custom roles
            const { data: rolesData } = await supabase
                .from('group_roles')
                .select('*')
                .eq('group_id', id)
                .order('display_order', { ascending: true });

            setRoles(rolesData || []);

            // Fetch member role assignments
            const { data: memberRolesData } = await supabase
                .from('member_roles')
                .select('*, role:role_id(*)')
                .eq('group_id', id);

            setMemberRoles(memberRolesData || []);

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
        setDeleting(true);
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
        } finally {
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const handleApproveRequest = async (memberId: string) => {
        try {
            const { error } = await supabase
                .from('group_members')
                .update({ status: 'active' })
                .eq('group_id', id)
                .eq('user_id', memberId);

            if (error) throw error;
            toast.success('Request approved');

            // Move from requests to members
            const request = requests.find(r => r.user_id === memberId);
            if (request) {
                setRequests(requests.filter(r => r.user_id !== memberId));
                setMembers([...members, { ...request, status: 'active' }]);
            }
        } catch (error) {
            console.error('Error approving request:', error);
            toast.error('Failed to approve request');
        }
    };

    const handleDeclineRequest = async (memberId: string) => {
        if (!confirm('Decline this join request?')) return;

        try {
            const { error } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', id)
                .eq('user_id', memberId);

            if (error) throw error;
            toast.success('Request declined');
            setRequests(requests.filter(r => r.user_id !== memberId));
        } catch (error) {
            console.error('Error declining request:', error);
            toast.error('Failed to decline request');
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

    const handlePromoteMember = async (memberId: string, memberName: string) => {
        try {
            const { error } = await supabase
                .from('group_members')
                .update({ role: 'admin' })
                .eq('group_id', id)
                .eq('user_id', memberId);

            if (error) throw error;
            toast.success(`${memberName} is now an admin`);
            setMembers(members.map(m =>
                m.user_id === memberId ? { ...m, role: 'admin' } : m
            ));
        } catch (error) {
            console.error('Error promoting member:', error);
            toast.error('Failed to promote member');
        }
    };

    const handleDemoteMember = async (memberId: string, memberName: string) => {
        try {
            const { error } = await supabase
                .from('group_members')
                .update({ role: 'member' })
                .eq('group_id', id)
                .eq('user_id', memberId);

            if (error) throw error;
            toast.success(`${memberName} is no longer an admin`);
            setMembers(members.map(m =>
                m.user_id === memberId ? { ...m, role: 'member' } : m
            ));
        } catch (error) {
            console.error('Error demoting member:', error);
            toast.error('Failed to demote member');
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

    // Role management handlers
    const openCreateRoleModal = () => {
        setEditingRole(null);
        setNewRoleName('');
        setNewRoleColor('#EC1D99');
        setNewRoleBadgeUrl(null);
        setNewRolePermissions({ can_moderate: false, can_manage_members: false, can_manage_stories: false });
        setShowRoleModal(true);
    };

    const openEditRoleModal = (role: GroupRole) => {
        setEditingRole(role);
        setNewRoleName(role.name);
        setNewRoleColor(role.color);
        setNewRoleBadgeUrl(role.badge_url);
        setNewRolePermissions({
            can_moderate: role.permissions?.can_moderate ?? false,
            can_manage_members: role.permissions?.can_manage_members ?? false,
            can_manage_stories: role.permissions?.can_manage_stories ?? false
        });
        setShowRoleModal(true);
    };

    const handleBadgeUpload = async (source: 'camera' | 'gallery') => {
        const file = await capturePhoto(source);
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be less than 2MB');
            return;
        }

        setUploadingBadge(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${id}-role-${Date.now()}.${fileExt}`;
            const filePath = `role-badges/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setNewRoleBadgeUrl(urlData.publicUrl);
            toast.success('Badge uploaded!');
        } catch (error) {
            console.error('Error uploading badge:', error);
            toast.error('Failed to upload badge');
        } finally {
            setUploadingBadge(false);
        }
    };

    const handleSaveRole = async () => {
        if (!newRoleName.trim()) {
            toast.error('Role name is required');
            return;
        }

        setSavingRole(true);
        try {
            if (editingRole) {
                // Update existing role
                const { error } = await supabase
                    .from('group_roles')
                    .update({
                        name: newRoleName.trim(),
                        color: newRoleColor,
                        badge_url: newRoleBadgeUrl,
                        permissions: newRolePermissions
                    })
                    .eq('id', editingRole.id);

                if (error) throw error;
                toast.success('Role updated!');
            } else {
                // Create new role
                const { error } = await supabase
                    .from('group_roles')
                    .insert({
                        group_id: id,
                        name: newRoleName.trim(),
                        color: newRoleColor,
                        badge_url: newRoleBadgeUrl,
                        permissions: newRolePermissions,
                        display_order: roles.length
                    });

                if (error) throw error;
                toast.success('Role created!');
            }

            setShowRoleModal(false);
            fetchGroupData();
        } catch (error) {
            console.error('Error saving role:', error);
            toast.error('Failed to save role');
        } finally {
            setSavingRole(false);
        }
    };

    const handleDeleteRole = async (roleId: string) => {
        if (!confirm('Delete this role? All members with this role will lose it.')) return;

        try {
            const { error } = await supabase
                .from('group_roles')
                .delete()
                .eq('id', roleId);

            if (error) throw error;
            toast.success('Role deleted');
            fetchGroupData();
        } catch (error) {
            console.error('Error deleting role:', error);
            toast.error('Failed to delete role');
        }
    };

    const handleAssignRole = async (userId: string, roleId: string) => {
        try {
            // Check if already has this role
            const existing = memberRoles.find(mr => mr.user_id === userId && mr.role_id === roleId);
            if (existing) {
                toast.error('Member already has this role');
                return;
            }

            const { error } = await supabase
                .from('member_roles')
                .insert({
                    group_id: id,
                    user_id: userId,
                    role_id: roleId,
                    assigned_by: user?.id
                });

            if (error) throw error;
            toast.success('Role assigned!');
            setShowAssignRoleModal(false);
            setSelectedMemberForRole(null);
            fetchGroupData();
        } catch (error) {
            console.error('Error assigning role:', error);
            toast.error('Failed to assign role');
        }
    };

    const handleRemoveRole = async (memberRoleId: string) => {
        try {
            const { error } = await supabase
                .from('member_roles')
                .delete()
                .eq('id', memberRoleId);

            if (error) throw error;
            toast.success('Role removed');
            fetchGroupData();
        } catch (error) {
            console.error('Error removing role:', error);
            toast.error('Failed to remove role');
        }
    };

    // Helper to get member's custom roles
    const getMemberCustomRoles = (userId: string) => {
        return memberRoles.filter(mr => mr.user_id === userId).map(mr => mr.role).filter(Boolean) as GroupRole[];
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

                {/* Join Requests */}
                {requests.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-[#EC1D99]" />
                            <h2 className="text-lg font-bold text-[#EC1D99]">Join Requests ({requests.length})</h2>
                        </div>
                        <div className="space-y-3">
                            {requests.map((request) => (
                                <div key={request.id} className="flex items-center justify-between bg-gray-900/50 p-3 rounded-xl border border-gray-800">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={request.profiles?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.user_id}`}
                                            alt={request.profiles?.name}
                                            className="w-10 h-10 rounded-full bg-gray-800"
                                        />
                                        <div>
                                            <p className="font-medium">{request.profiles?.name || 'Unknown User'}</p>
                                            <p className="text-xs text-gray-500">Wants to join</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleApproveRequest(request.user_id)}
                                            className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-full transition-colors"
                                            title="Approve"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeclineRequest(request.user_id)}
                                            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-full transition-colors"
                                            title="Decline"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Roles & Badges */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Tag className="w-5 h-5 text-[#EC1D99]" />
                            <h2 className="text-lg font-bold text-[#EC1D99]">Roles & Badges</h2>
                        </div>
                        <button
                            onClick={openCreateRoleModal}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-full text-sm transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            <span>New Role</span>
                        </button>
                    </div>

                    {roles.length > 0 ? (
                        <div className="space-y-2">
                            {roles.map((role) => (
                                <div key={role.id} className="flex items-center justify-between bg-gray-900/50 p-3 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        {role.badge_url ? (
                                            <img src={role.badge_url} alt={role.name} className="w-8 h-8 rounded-full object-cover" style={{ borderColor: role.color, borderWidth: 2 }} />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${role.color}20`, borderColor: role.color, borderWidth: 2 }}>
                                                <Tag className="w-4 h-4" style={{ color: role.color }} />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium">{role.name}</p>
                                            <div className="flex gap-1 mt-0.5">
                                                {role.permissions?.can_moderate && (
                                                    <span className="text-[9px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">Mod</span>
                                                )}
                                                {role.permissions?.can_manage_members && (
                                                    <span className="text-[9px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">Members</span>
                                                )}
                                                {role.permissions?.can_manage_stories && (
                                                    <span className="text-[9px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">Stories</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => openEditRoleModal(role)}
                                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
                                            title="Edit"
                                        >
                                            <Palette className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteRole(role.id)}
                                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 bg-gray-900/30 rounded-xl border border-gray-800 border-dashed">
                            <Tag className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                            <p className="text-gray-500 text-sm">No custom roles yet</p>
                            <p className="text-xs text-gray-600 mt-1">Create roles like "VIP", "Moderator", etc.</p>
                        </div>
                    )}
                </div>

                {/* Member Management */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-[#EC1D99]">Members ({members.length})</h2>
                    <div className="space-y-3">
                        {members.map((member) => {
                            const customRoles = getMemberCustomRoles(member.user_id);
                            const memberRoleAssignments = memberRoles.filter(mr => mr.user_id === member.user_id);

                            return (
                                <div key={member.id} className="flex items-center justify-between bg-gray-900/50 p-3 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Link href={`/profile/${member.user_id}`} className="hover:opacity-80 transition-opacity">
                                            <img
                                                src={member.profiles?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`}
                                                alt={member.profiles?.name}
                                                className="w-10 h-10 rounded-full bg-gray-800"
                                            />
                                        </Link>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Link href={`/profile/${member.user_id}`} className="hover:underline">
                                                    <p className="font-medium">{member.profiles?.name || 'Unknown User'}</p>
                                                </Link>
                                                {member.user_id === group?.owner_id ? (
                                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 rounded-full border border-yellow-500/40">
                                                        <Crown className="w-3 h-3 text-yellow-500" />
                                                        <span className="text-[10px] font-bold text-yellow-500 uppercase">Owner</span>
                                                    </div>
                                                ) : member.role === 'admin' ? (
                                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 rounded-full border border-purple-500/40">
                                                        <Shield className="w-3 h-3 text-purple-400" />
                                                        <span className="text-[10px] font-bold text-purple-400 uppercase">Admin</span>
                                                    </div>
                                                ) : null}
                                                {/* Custom role badges with remove option */}
                                                {memberRoleAssignments.map((mr) => {
                                                    const role = mr.role;
                                                    if (!role) return null;
                                                    return (
                                                        <div
                                                            key={mr.id}
                                                            className="flex items-center gap-1 px-2 py-0.5 rounded-full group"
                                                            style={{ backgroundColor: `${role.color}20`, border: `1px solid ${role.color}40` }}
                                                        >
                                                            {role.badge_url ? (
                                                                <img src={role.badge_url} alt={role.name} className="w-3 h-3 rounded-full object-cover" />
                                                            ) : (
                                                                <Tag className="w-3 h-3" style={{ color: role.color }} />
                                                            )}
                                                            <span className="text-[10px] font-bold uppercase" style={{ color: role.color }}>{role.name}</span>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleRemoveRole(mr.id); }}
                                                                className="ml-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded-full p-0.5 transition-opacity"
                                                                title="Remove role"
                                                            >
                                                                <X className="w-2.5 h-2.5 text-red-400" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {member.user_id !== group?.owner_id && member.role !== 'admin' && memberRoleAssignments.length === 0 && (
                                                <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        {member.user_id !== user?.id && roles.length > 0 && (
                                            <button
                                                onClick={() => { setSelectedMemberForRole(member.user_id); setShowAssignRoleModal(true); }}
                                                className="p-2 text-gray-400 hover:text-[#EC1D99] hover:bg-[#EC1D99]/10 rounded-full transition-colors"
                                                title="Assign Role"
                                            >
                                                <Tag className="w-4 h-4" />
                                            </button>
                                        )}
                                        {/* Promote/Demote buttons - only for owner, not for self or other owner */}
                                        {member.user_id !== user?.id && member.user_id !== group?.owner_id && (
                                            <>
                                                {member.role === 'member' ? (
                                                    <button
                                                        onClick={() => handlePromoteMember(member.user_id, member.profiles?.name || 'User')}
                                                        className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-full transition-colors"
                                                        title="Promote to Admin"
                                                    >
                                                        <ChevronUp className="w-4 h-4" />
                                                    </button>
                                                ) : member.role === 'admin' ? (
                                                    <button
                                                        onClick={() => handleDemoteMember(member.user_id, member.profiles?.name || 'User')}
                                                        className="p-2 text-gray-400 hover:text-orange-400 hover:bg-orange-400/10 rounded-full transition-colors"
                                                        title="Demote to Member"
                                                    >
                                                        <ChevronDown className="w-4 h-4" />
                                                    </button>
                                                ) : null}
                                            </>
                                        )}
                                        {member.user_id !== user?.id && (
                                            <button
                                                onClick={() => handleRemoveMember(member.user_id, member.profiles?.name)}
                                                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Leave Group Section */}
                <div className="pt-8 border-t border-gray-800">
                    <h2 className="text-lg font-bold text-gray-300 mb-4">Leave Group</h2>
                    <p className="text-sm text-gray-500 mb-4">
                        {group?.owner_id === user?.id
                            ? "As the owner, you must transfer ownership to another member before leaving."
                            : "Leave this group and remove yourself from all group activities."}
                    </p>
                    <button
                        onClick={handleLeaveGroup}
                        className="w-full border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white font-bold py-3 rounded-lg transition-colors"
                    >
                        {group?.owner_id === user?.id ? 'Transfer Ownership & Leave' : 'Leave Group'}
                    </button>
                </div>

                {/* Danger Zone - Only visible to owner */}
                {group?.owner_id === user?.id && (
                    <div className="pt-8 border-t border-gray-800">
                        <h2 className="text-lg font-bold text-red-500 mb-2">Danger Zone</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Permanently delete this group and all its stories. This action cannot be undone.
                        </p>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full border border-red-500/50 text-red-500 hover:bg-red-500/10 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Group
                        </button>
                    </div>
                )}
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

            {/* Role Creation/Edit Modal */}
            {showRoleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setShowRoleModal(false)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h2 className="text-xl font-bold mb-4">{editingRole ? 'Edit Role' : 'Create Role'}</h2>

                        {/* Role Name */}
                        <div className="mb-4">
                            <label className="block text-sm text-gray-400 mb-1">Role Name</label>
                            <input
                                type="text"
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                                placeholder="e.g. VIP, Moderator, Top Contributor"
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 focus:border-[#EC1D99] focus:outline-none"
                            />
                        </div>

                        {/* Badge Image */}
                        <div className="mb-4">
                            <label className="block text-sm text-gray-400 mb-2">Badge Image</label>
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden"
                                    style={{ backgroundColor: `${newRoleColor}20`, border: `2px solid ${newRoleColor}` }}
                                >
                                    {newRoleBadgeUrl ? (
                                        <img src={newRoleBadgeUrl} alt="Badge" className="w-full h-full object-cover" />
                                    ) : (
                                        <Tag className="w-6 h-6" style={{ color: newRoleColor }} />
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleBadgeUpload('camera')}
                                        disabled={uploadingBadge}
                                        className="flex items-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm disabled:opacity-50"
                                    >
                                        <Camera className="w-4 h-4" />
                                        <span>Camera</span>
                                    </button>
                                    <button
                                        onClick={() => handleBadgeUpload('gallery')}
                                        disabled={uploadingBadge}
                                        className="flex items-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm disabled:opacity-50"
                                    >
                                        <ImageIcon className="w-4 h-4" />
                                        <span>Upload</span>
                                    </button>
                                </div>
                            </div>
                            {uploadingBadge && <p className="text-xs text-gray-500 mt-2">Uploading...</p>}
                        </div>

                        {/* Color Picker */}
                        <div className="mb-4">
                            <label className="block text-sm text-gray-400 mb-2">Badge Color</label>
                            <div className="flex flex-wrap gap-2">
                                {PRESET_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setNewRoleColor(color)}
                                        className={`w-8 h-8 rounded-full transition-transform ${newRoleColor === color ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Permissions */}
                        <div className="mb-6">
                            <label className="block text-sm text-gray-400 mb-2">Permissions</label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newRolePermissions.can_moderate}
                                        onChange={(e) => setNewRolePermissions({ ...newRolePermissions, can_moderate: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-600 text-[#EC1D99] focus:ring-[#EC1D99]"
                                    />
                                    <span className="text-sm">Can moderate (remove stories)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newRolePermissions.can_manage_members}
                                        onChange={(e) => setNewRolePermissions({ ...newRolePermissions, can_manage_members: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-600 text-[#EC1D99] focus:ring-[#EC1D99]"
                                    />
                                    <span className="text-sm">Can manage members</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newRolePermissions.can_manage_stories}
                                        onChange={(e) => setNewRolePermissions({ ...newRolePermissions, can_manage_stories: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-600 text-[#EC1D99] focus:ring-[#EC1D99]"
                                    />
                                    <span className="text-sm">Can manage group stories</span>
                                </label>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveRole}
                            disabled={savingRole || !newRoleName.trim()}
                            className="w-full bg-[#EC1D99] hover:bg-[#d61a88] text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {savingRole ? 'Saving...' : (editingRole ? 'Update Role' : 'Create Role')}
                        </button>
                    </div>
                </div>
            )}

            {/* Assign Role Modal */}
            {showAssignRoleModal && selectedMemberForRole && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => { setShowAssignRoleModal(false); setSelectedMemberForRole(null); }}
                            className="absolute right-4 top-4 text-gray-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h2 className="text-xl font-bold mb-4">Assign Role</h2>
                        <p className="text-sm text-gray-400 mb-4">Select a role to assign:</p>

                        {roles.length > 0 ? (
                            <div className="space-y-2 mb-4">
                                {roles.map((role) => (
                                    <button
                                        key={role.id}
                                        onClick={() => handleAssignRole(selectedMemberForRole, role.id)}
                                        className="w-full flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors"
                                    >
                                        {role.badge_url ? (
                                            <img src={role.badge_url} alt={role.name} className="w-8 h-8 rounded-full object-cover" style={{ borderColor: role.color, borderWidth: 2 }} />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${role.color}20`, borderColor: role.color, borderWidth: 2 }}>
                                                <Tag className="w-4 h-4" style={{ color: role.color }} />
                                            </div>
                                        )}
                                        <span className="font-medium">{role.name}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm mb-4">No roles created yet. Create a role first.</p>
                        )}

                        <button
                            onClick={() => { setShowAssignRoleModal(false); setSelectedMemberForRole(null); }}
                            className="w-full border border-gray-700 text-gray-400 hover:bg-gray-800 font-medium py-3 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setShowDeleteModal(false)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
                                <Trash2 className="w-8 h-8 text-red-500" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Delete Group</h2>
                            <p className="text-gray-400 text-sm">
                                Are you sure you want to delete <span className="font-semibold text-white">{group?.name}</span>?
                            </p>
                        </div>

                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                            <p className="text-red-400 text-sm">
                                ⚠️ This action is <strong>permanent</strong> and cannot be undone. All stories, members, and data associated with this group will be deleted.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white font-medium py-3 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteGroup}
                                disabled={deleting}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {deleting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Delete Forever
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
