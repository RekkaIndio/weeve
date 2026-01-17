'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
    ArrowLeft,
    Trash2,
    ExternalLink,
    Calendar,
    Users,
    Film,
    Lock,
    Globe,
    UserMinus,
    Crown,
    Shield,
    User,
} from 'lucide-react';
import Link from 'next/link';

interface GroupMember {
    id: string;
    user_id: string;
    role: string;
    joined_at: string;
    status?: string;
    profile?: {
        id: string;
        name: string;
        avatar?: string;
    };
}

interface GroupStory {
    id: string;
    title: string;
    description?: string;
    created_at: string;
    creator_id: string;
    contributions?: { media_url?: string }[];
}

interface GroupDetail {
    id: string;
    name: string;
    description?: string;
    avatar?: string;
    is_private: boolean;
    created_at: string;
    owner_id: string;
    member_count?: number;
    owner?: { id: string; name: string; avatar?: string };
}

export default function AdminGroupDetailPage() {
    const params = useParams();
    const router = useRouter();
    const groupId = params?.id as string;

    const [group, setGroup] = useState<GroupDetail | null>(null);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [stories, setStories] = useState<GroupStory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'members' | 'stories'>('members');

    useEffect(() => {
        if (groupId) {
            fetchGroupData();
        }
    }, [groupId]);

    const fetchGroupData = async () => {
        setIsLoading(true);
        try {
            // Fetch group
            const { data: groupData, error: groupError } = await supabase
                .from('groups')
                .select('*')
                .eq('id', groupId)
                .single();

            if (groupError) throw groupError;

            // Fetch owner profile
            const { data: ownerProfile } = await supabase
                .from('profiles')
                .select('id, name, avatar')
                .eq('user_id', groupData.owner_id)
                .single();

            setGroup({
                ...groupData,
                owner: ownerProfile,
            });

            // Fetch members
            const { data: membersData } = await supabase
                .from('group_members')
                .select('id, user_id, role, joined_at, status')
                .eq('group_id', groupId)
                .order('joined_at', { ascending: true });

            // Fetch member profiles
            const memberUserIds = membersData?.map((m: { user_id: string }) => m.user_id) || [];
            let memberProfiles: Record<string, { id: string; name: string; avatar?: string }> = {};

            if (memberUserIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, user_id, name, avatar')
                    .in('user_id', memberUserIds);

                profiles?.forEach((p: any) => {
                    memberProfiles[p.user_id] = { id: p.id, name: p.name, avatar: p.avatar };
                });
            }

            const enrichedMembers = (membersData || []).map((m: any) => ({
                ...m,
                profile: memberProfiles[m.user_id] || null,
            }));
            setMembers(enrichedMembers);

            // Fetch stories in this group
            const { data: storiesData } = await supabase
                .from('stories')
                .select('id, title, description, created_at, creator_id, contributions(media_url)')
                .eq('group_id', groupId)
                .order('created_at', { ascending: false })
                .limit(50);

            setStories(storiesData || []);
        } catch (error) {
            console.error('Failed to fetch group:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveMember = async (memberId: string, memberUserId: string) => {
        if (memberUserId === group?.owner_id) {
            alert('Cannot remove the group owner');
            return;
        }
        if (!confirm('Remove this member from the group?')) return;

        setActionLoading(memberId);
        try {
            const { error } = await supabase
                .from('group_members')
                .delete()
                .eq('id', memberId);

            if (error) throw error;

            setMembers(members.filter(m => m.id !== memberId));
        } catch (error) {
            console.error('Failed to remove member:', error);
            alert('Failed to remove member');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemoveStory = async (storyId: string) => {
        if (!confirm('Remove this story from the group? (Story will not be deleted, just unlinked)')) return;

        setActionLoading(storyId);
        try {
            const { error } = await supabase
                .from('stories')
                .update({ group_id: null })
                .eq('id', storyId);

            if (error) throw error;

            setStories(stories.filter(s => s.id !== storyId));
        } catch (error) {
            console.error('Failed to remove story:', error);
            alert('Failed to remove story');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteGroup = async () => {
        if (!confirm('Are you sure you want to delete this group? Stories will be unlinked but not deleted.')) return;

        setActionLoading('group');
        try {
            // Unlink stories
            await supabase
                .from('stories')
                .update({ group_id: null })
                .eq('group_id', groupId);

            // Delete members
            await supabase
                .from('group_members')
                .delete()
                .eq('group_id', groupId);

            // Delete group
            const { error } = await supabase
                .from('groups')
                .delete()
                .eq('id', groupId);

            if (error) throw error;

            router.push('/admin/groups');
        } catch (error) {
            console.error('Failed to delete group:', error);
            alert('Failed to delete group');
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const getRoleIcon = (role: string) => {
        switch (role?.toLowerCase()) {
            case 'owner': return <Crown size={14} className="text-yellow-400" />;
            case 'admin': return <Shield size={14} className="text-blue-400" />;
            default: return <User size={14} className="text-zinc-500" />;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!group) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-zinc-500">
                <p>Group not found</p>
                <button
                    onClick={() => router.back()}
                    className="mt-4 text-pink-400 hover:text-pink-300"
                >
                    Go back
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden">
                            {group.avatar ? (
                                <img src={group.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                    <Users size={24} />
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-white">{group.name}</h1>
                                {group.is_private ? (
                                    <Lock size={16} className="text-orange-400" />
                                ) : (
                                    <Globe size={16} className="text-green-400" />
                                )}
                            </div>
                            <p className="text-sm text-zinc-500">Group ID: {group.id}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href={`/groups/${group.id}`}
                        target="_blank"
                        className="flex items-center gap-2 px-4 py-2 text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                        <ExternalLink size={16} />
                        View in App
                    </Link>
                    <button
                        onClick={handleDeleteGroup}
                        disabled={actionLoading === 'group'}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50"
                    >
                        <Trash2 size={16} />
                        Delete Group
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Group Info Panel */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Basic Info */}
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                        <h2 className="text-lg font-semibold text-white mb-4">Group Details</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Owner</span>
                                <Link
                                    href={`/admin/users/${group.owner?.id || group.owner_id}`}
                                    className="text-pink-400 hover:text-pink-300"
                                >
                                    {group.owner?.name || 'Unknown'}
                                </Link>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Created</span>
                                <span className="text-white">{formatDate(group.created_at)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Privacy</span>
                                <span className={`flex items-center gap-1 ${group.is_private ? 'text-orange-400' : 'text-green-400'}`}>
                                    {group.is_private ? <Lock size={14} /> : <Globe size={14} />}
                                    {group.is_private ? 'Private' : 'Public'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                        <h2 className="text-lg font-semibold text-white mb-4">Stats</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-zinc-800 rounded-lg">
                                <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                                    <Users size={16} />
                                </div>
                                <p className="text-xl font-bold text-white">{members.length}</p>
                                <p className="text-xs text-zinc-500">Members</p>
                            </div>
                            <div className="text-center p-3 bg-zinc-800 rounded-lg">
                                <div className="flex items-center justify-center gap-1 text-purple-400 mb-1">
                                    <Film size={16} />
                                </div>
                                <p className="text-xl font-bold text-white">{stories.length}</p>
                                <p className="text-xs text-zinc-500">Stories</p>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    {group.description && (
                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                            <h2 className="text-lg font-semibold text-white mb-2">Description</h2>
                            <p className="text-sm text-zinc-400">{group.description}</p>
                        </div>
                    )}
                </div>

                {/* Members & Stories Panel */}
                <div className="lg:col-span-2">
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800">
                        {/* Tabs */}
                        <div className="flex border-b border-zinc-800">
                            <button
                                onClick={() => setActiveTab('members')}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'members'
                                    ? 'text-pink-400 border-b-2 border-pink-400'
                                    : 'text-zinc-400 hover:text-white'
                                    }`}
                            >
                                Members ({members.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('stories')}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'stories'
                                    ? 'text-pink-400 border-b-2 border-pink-400'
                                    : 'text-zinc-400 hover:text-white'
                                    }`}
                            >
                                Stories ({stories.length})
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5">
                            {activeTab === 'members' ? (
                                members.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
                                        <Users size={32} className="mb-2" />
                                        <p>No members</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {members.map((member) => (
                                            <div
                                                key={member.id}
                                                className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden">
                                                        {member.profile?.avatar ? (
                                                            <img
                                                                src={member.profile.avatar}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                                                <User size={18} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <Link
                                                                href={`/admin/users/${member.profile?.id || member.user_id}`}
                                                                className="text-white font-medium hover:text-pink-400"
                                                            >
                                                                {member.profile?.name || 'Unknown'}
                                                            </Link>
                                                            {getRoleIcon(member.role)}
                                                            <span className="text-xs text-zinc-500 capitalize">
                                                                {member.role || 'member'}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-zinc-500">
                                                            Joined {formatDate(member.joined_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                                {member.user_id !== group.owner_id && (
                                                    <button
                                                        onClick={() => handleRemoveMember(member.id, member.user_id)}
                                                        disabled={actionLoading === member.id}
                                                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                                        title="Remove member"
                                                    >
                                                        <UserMinus size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                stories.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
                                        <Film size={32} className="mb-2" />
                                        <p>No stories in this group</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {stories.map((story) => (
                                            <div
                                                key={story.id}
                                                className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-lg bg-zinc-700 overflow-hidden">
                                                        {story.contributions?.[0]?.media_url ? (
                                                            <img
                                                                src={story.contributions[0].media_url}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                                                <Film size={18} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <Link
                                                            href={`/admin/stories/${story.id}`}
                                                            className="text-white font-medium hover:text-pink-400"
                                                        >
                                                            {story.title || 'Untitled'}
                                                        </Link>
                                                        <p className="text-xs text-zinc-500">
                                                            Created {formatDate(story.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={`/admin/stories/${story.id}`}
                                                        className="p-2 text-zinc-400 hover:text-pink-400 rounded-lg transition-colors"
                                                        title="View story"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleRemoveStory(story.id)}
                                                        disabled={actionLoading === story.id}
                                                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                                        title="Remove from group"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
