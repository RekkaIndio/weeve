"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/components/AuthProvider';
import { Users, Settings, ArrowLeft, Lock, Globe, PlusSquare, Camera } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { capturePhoto } from '@/lib/camera';

export default function GroupDetailsPage() {
    const params = useParams();
    const id = params?.id as string;
    const { user } = useAuth();
    const router = useRouter();
    const [group, setGroup] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [stories, setStories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [isMember, setIsMember] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (id) fetchGroupDetails();
    }, [id, user?.id]);

    const fetchGroupDetails = async () => {
        try {
            // Fetch group info
            const { data: groupData, error: groupError } = await supabase
                .from('groups')
                .select('*')
                .eq('id', id)
                .single();

            if (groupError) throw groupError;
            setGroup(groupData);

            // Fetch members
            const { data: membersData, error: membersError } = await supabase
                .from('group_members')
                .select('*, profiles:user_id(name, avatar)')
                .eq('group_id', id);

            if (membersError) throw membersError;
            setMembers(membersData || []);

            if (user) {
                const memberRecord = membersData?.find((m: any) => m.user_id === user.id);
                setIsMember(!!memberRecord);
                setIsAdmin(memberRecord?.role === 'admin');
            }

            // Fetch group stories
            const { data: storiesData, error: storiesError } = await supabase
                .from('stories')
                .select('*')
                .eq('group_id', id)
                .order('created_at', { ascending: false });

            if (storiesError) {
                console.error('Error fetching group stories:', storiesError);
            } else {
                setStories(storiesData || []);
            }
        } catch (error) {
            console.error('Error fetching group details:', error);
            toast.error('Failed to load group details');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarClick = async () => {
        if (!isAdmin) return;

        const file = await capturePhoto();
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be less than 5MB');
            return;
        }

        setUploadingAvatar(true);
        try {
            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${id}-${Date.now()}.${fileExt}`;
            const filePath = `group-avatars/${fileName}`;

            // Upload to Supabase storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const avatarUrl = urlData.publicUrl;

            // Update group avatar in database
            const { error: updateError } = await supabase
                .from('groups')
                .update({ avatar: avatarUrl })
                .eq('id', id);

            if (updateError) throw updateError;

            toast.success('Group avatar updated!');
            fetchGroupDetails(); // Refresh to show new avatar
        } catch (error) {
            console.error('Error uploading avatar:', error);
            toast.error('Failed to update avatar');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleJoin = async () => {
        if (!user) {
            toast.error('Please sign in to join');
            return;
        }
        try {
            const { error } = await supabase
                .from('group_members')
                .insert({
                    group_id: id,
                    user_id: user.id,
                    role: 'member'
                });
            if (error) throw error;
            toast.success('Joined group!');
            fetchGroupDetails();
        } catch (error) {
            console.error('Error joining group:', error);
            toast.error('Failed to join group');
        }
    };

    const handleLeave = async () => {
        if (!user) return;
        if (isAdmin && members.length > 1) {
            // Ideally we should check if they are the ONLY admin, but for now simple check
            // If they are the owner (which we track in groups table), they can't leave without deleting or transferring
            if (group.owner_id === user.id) {
                toast.error('Owners cannot leave. Delete the group in settings instead.');
                return;
            }
        }
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

    if (loading) return (
        <div className="min-h-screen bg-black flex items-center justify-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#EC1D99]"></div>
        </div>
    );

    if (!group) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Group not found</div>;

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => router.back()} className="p-2 hover:bg-gray-900 rounded-full">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                {isAdmin && (
                    <button
                        onClick={() => router.push(`/groups/${id}/settings`)}
                        className="p-2 hover:bg-gray-900 rounded-full text-gray-400 hover:text-white"
                    >
                        <Settings className="w-6 h-6" />
                    </button>
                )}
            </div>

            {/* Group Info */}
            <div className="flex flex-col items-center mb-8">
                {/* Avatar with click handler for admins */}
                <div
                    className={`relative mb-4 ${isAdmin ? 'cursor-pointer group' : ''}`}
                    onClick={handleAvatarClick}
                >
                    <img
                        src={group.avatar}
                        alt={group.name}
                        className={`w-24 h-24 rounded-full bg-gray-800 ${uploadingAvatar ? 'opacity-50' : ''}`}
                    />
                    {uploadingAvatar && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#EC1D99]"></div>
                        </div>
                    )}
                    {isAdmin && !uploadingAvatar && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-8 h-8 text-white" />
                        </div>
                    )}
                </div>
                <h1 className="text-2xl font-bold mb-2">{group.name}</h1>
                <p className="text-gray-400 text-center max-w-md mb-4">{group.description}</p>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                    <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{members.length} members</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {group.is_private ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                        <span>{group.is_private ? 'Private' : 'Public'}</span>
                    </div>
                </div>

            </div>

            {/* Actions */}
            <div className="flex justify-center gap-4 mb-8">
                {!isMember ? (
                    <button
                        onClick={handleJoin}
                        className="bg-[#EC1D99] text-white px-8 py-2 rounded-full font-bold hover:bg-[#d61a88] transition-colors"
                    >
                        Join Group
                    </button>
                ) : (
                    <>
                        <Link
                            href={`/create-story?groupId=${id}`}
                            className="flex items-center gap-2 bg-[#EC1D99] text-white px-6 py-2 rounded-full font-bold hover:bg-[#d61a88] transition-colors"
                        >
                            <PlusSquare className="w-4 h-4" />
                            Create Story
                        </Link>
                        <button
                            onClick={handleLeave}
                            className="border border-gray-700 text-gray-400 px-6 py-2 rounded-full font-medium hover:bg-gray-900 hover:text-white transition-colors"
                        >
                            Leave Group
                        </button>
                    </>
                )}
            </div>

            {/* Stories Section */}
            <div className="max-w-md mx-auto mb-8">
                <h2 className="text-lg font-bold mb-4">Stories</h2>
                {stories.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                        {stories.map((story) => (
                            <Link
                                key={story.id}
                                href={`/story/${story.id}`}
                                className="relative rounded-xl overflow-hidden aspect-square group bg-gray-900"
                            >
                                <img
                                    src={story.cover_image || "https://via.placeholder.com/400"}
                                    alt={story.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                                    <h3 className="font-bold text-sm line-clamp-2 mb-1">{story.title}</h3>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-gray-900/30 rounded-xl border border-gray-800 border-dashed">
                        <p className="text-gray-500 text-sm">No stories yet</p>
                        {isMember && (
                            <p className="text-xs text-gray-600 mt-1">Be the first to create one!</p>
                        )}
                    </div>
                )}
            </div>

            {/* Members List */}
            <div className="max-w-md mx-auto">
                <h2 className="text-lg font-bold mb-4">Members</h2>
                <div className="space-y-3">
                    {members.map((member) => (
                        <div key={member.id} className="flex items-center gap-3 bg-gray-900/50 p-3 rounded-xl">
                            <img
                                src={member.profiles?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`}
                                alt={member.profiles?.name}
                                className="w-10 h-10 rounded-full bg-gray-800"
                            />
                            <div className="flex-1">
                                <p className="font-medium">{member.profiles?.name || 'Unknown User'}</p>
                                <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
