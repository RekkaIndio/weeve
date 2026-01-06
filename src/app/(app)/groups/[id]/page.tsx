"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/components/AuthProvider';
import { Users, Settings, ArrowLeft, Lock, Globe, PlusSquare, Camera, Share2, Image as ImageIcon, X, Crown, Shield, Tag, Heart, LogOut } from 'lucide-react';
import Link from 'next/link';
import { capturePhoto } from '@/lib/camera';
import GroupShareModal from '@/app/components/GroupShareModal';
import VerificationBadge from '@/app/components/VerificationBadge';
import GroupChatTab from '@/app/components/GroupChatTab';
import { formatCount } from '@/lib/format';

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
    const [isOwner, setIsOwner] = useState(false);
    const [hasPendingRequest, setHasPendingRequest] = useState(false);
    const [activeTab, setActiveTab] = useState<'stories' | 'members' | 'chat'>('stories');
    const [showShareModal, setShowShareModal] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [showPhotoViewer, setShowPhotoViewer] = useState(false);
    const [viewerImage, setViewerImage] = useState<{ url: string; alt: string } | null>(null);
    const [groupRoles, setGroupRoles] = useState<any[]>([]);
    const [memberRoles, setMemberRoles] = useState<any[]>([]);
    const [ownerVerification, setOwnerVerification] = useState<{ isVerified: boolean; tier: 'bronze' | 'silver' | 'gold' | null }>({ isVerified: false, tier: null });
    const [totalLikes, setTotalLikes] = useState<number>(0);
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        if (id) fetchGroupDetails();
    }, [id, user?.id]);

    const fetchGroupDetails = async () => {
        try {
            setLoading(true); // Explicitly set loading at start

            // Fetch group info
            // Fetch group info
            const { data: groupData, error: groupError } = await supabase
                .from('groups')
                .select('*, owner:owner_id(is_verified, verification_tier, is_brand, brand_verified)')
                .eq('id', id)
                .single();

            if (groupError) {
                console.error('Error fetching group:', groupError);
                throw groupError;
            }

            if (!groupData) {
                console.error('Group not found:', id);
                console.error('Group not found');
                setLoading(false);
                return;
            }

            setGroup(groupData);
            if (groupData.owner) {
                const owner = groupData.owner as any;
                setOwnerVerification({
                    isVerified: owner.is_verified || owner.is_brand,
                    tier: owner.verification_tier || (owner.is_brand ? 'gold' : null)
                });
            }

            // Fetch members
            const { data: membersData, error: membersError } = await supabase
                .from('group_members')
                .select('*, profiles:user_id(name, avatar)')
                .eq('group_id', id);

            if (membersError) {
                console.error('Error fetching members:', membersError);
                throw membersError;
            }

            setMembers(membersData || []);

            if (user) {
                const memberRecord = membersData?.find((m: any) => m.user_id === user.id);
                if (memberRecord) {
                    setIsMember(memberRecord.status === 'active');
                    setHasPendingRequest(memberRecord.status === 'pending');
                    setIsAdmin(memberRecord.role === 'admin' && memberRecord.status === 'active');
                } else {
                    setIsMember(false);
                    setHasPendingRequest(false);
                    setIsAdmin(false);
                }
                setIsOwner(groupData.owner_id === user.id);
            }

            // Fetch group stories - only for members of private groups or any visitor for public groups
            const memberRecord = membersData?.find((m: any) => m.user_id === user?.id);
            const userIsMember = memberRecord?.status === 'active';
            const canViewStories = !groupData.is_private || userIsMember;

            if (canViewStories) {
                const { data: storiesData, error: storiesError } = await supabase
                    .from('stories')
                    .select('*, contributions(*, profiles:user_id(name, avatar)), story_participants(*, profiles:user_id(name, avatar))')
                    .eq('group_id', id)
                    .order('created_at', { ascending: false });

                if (storiesError) {
                    console.error('Error fetching group stories:', storiesError);
                    // Don't throw here - stories are not critical for page load
                } else {
                    // Filter: only show stories with at least one contribution
                    // Stories without contributions will appear in creators' "Waiting" tab on their profile
                    const filteredStories = (storiesData || []).filter((s: any) => {
                        const hasContributions = s.contributions && s.contributions.length > 0;
                        if (!hasContributions) return false;

                        // For forked stories, check if the creator (the person who forked) still has
                        // 'waiting' status as a participant. When they add their content, their status
                        // changes from 'waiting' to 'accepted'. Until then, hide from group feed.
                        if (s.forked_from_story_id) {
                            const forkerUserId = s.creator_id;
                            const forkerIsWaiting = (s.story_participants || []).some(
                                (p: any) => p.user_id === forkerUserId && p.status === 'waiting'
                            );
                            if (forkerIsWaiting) return false;
                        }

                        return true;
                    });
                    setStories(filteredStories);
                }
            } else {
                // Non-member of private group - don't show stories
                setStories([]);
            }

            // Fetch custom roles for this group
            const { data: rolesData } = await supabase
                .from('group_roles')
                .select('*')
                .eq('group_id', id);
            setGroupRoles(rolesData || []);

            // Fetch member role assignments
            const { data: memberRolesData } = await supabase
                .from('member_roles')
                .select('*, role:role_id(*)')
                .eq('group_id', id);
            setMemberRoles(memberRolesData || []);

            // Fetch total likes
            const { count: likesCount } = await supabase
                .from('story_likes')
                .select('stories!inner(group_id)', { count: 'exact', head: true })
                .eq('stories.group_id', id);

            setTotalLikes(likesCount || 0);
        } catch (error) {
            console.error('Error fetching group details:', error);
            console.error('Failed to load group details');
            setGroup(null); // Ensure group is null so we show error state
        } finally {
            setLoading(false); // Always clear loading state
        }
    };

    const handlePhotoClick = () => {
        if (group?.avatar) {
            setViewerImage({ url: group.avatar, alt: group.name });
            setShowPhotoViewer(true);
        }
    };

    const openImageViewer = (url: string, alt: string) => {
        setViewerImage({ url, alt });
        setShowPhotoViewer(true);
    };

    const handleAvatarClick = () => {
        if (!isAdmin && !isOwner) return;
        setShowAvatarPicker(true);
    };

    const handleMediaSelect = async (source: 'camera' | 'gallery') => {
        setShowAvatarPicker(false);

        // Double-check permissions
        if (!isAdmin && !isOwner) {
            console.error('Only admins and owners can change the group photo');
            return;
        }

        const file = await capturePhoto(source);
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            console.error('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            console.error('Image size must be less than 5MB');
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

            // toast removed
            fetchGroupDetails(); // Refresh to show new avatar
        } catch (error) {
            console.error('Error uploading avatar:', error);
            console.error('Failed to update avatar');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleJoin = async () => {
        if (!user) {
            console.error('Please sign in to join');
            return;
        }
        try {
            // Refresh session to ensure valid token for RLS
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.error('Please sign in to join');
                return;
            }

            const status = group.is_private ? 'pending' : 'active';

            const { error } = await supabase
                .from('group_members')
                .insert({
                    group_id: id,
                    user_id: user.id,
                    role: 'member',
                    status: status
                });

            if (error) throw error;

            if (status === 'pending') {
                // toast removed
                setHasPendingRequest(true);
            } else {
                // toast removed
                fetchGroupDetails();
            }
        } catch (error: any) {
            console.error('Error joining group:', error);
            if (error?.code === '23505') { // Unique violation
                console.error('You are already a member of this group');
                fetchGroupDetails();
            } else {
                console.error(error?.message || 'Failed to join group');
            }
        }
    };

    const handleCancelRequest = async () => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', id)
                .eq('user_id', user.id);

            if (error) throw error;
            // toast removed
            setHasPendingRequest(false);
        } catch (error: any) {
            console.error('Error cancelling request:', error);
            console.error(error?.message || 'Failed to cancel request');
        }
    };

    const handleLeaveGroup = async () => {
        if (!user) return;

        // Owners cannot leave directly - must transfer ownership first in settings
        if (isOwner) {
            console.error('Owners must transfer ownership before leaving. Go to Group Settings.');
            return;
        }

        if (!confirm('Are you sure you want to leave this group?')) return;

        setLeaving(true);
        try {
            const { error } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', id)
                .eq('user_id', user.id);

            if (error) throw error;
            // toast removed
            setIsMember(false);
            setIsAdmin(false);
            fetchGroupDetails(); // Refresh to update member count
        } catch (error: any) {
            console.error('Error leaving group:', error);
            console.error(error?.message || 'Failed to leave group');
        } finally {
            setLeaving(false);
        }
    };

    // Only show loading spinner on initial load with no cached data
    if (loading && !group) return (
        <div className="min-h-screen bg-black flex items-center justify-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#EC1D99]"></div>
        </div>
    );

    if (!group) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Group not found</div>;

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <div className="p-4">
                {/* Header Actions */}
                <div className="flex items-center justify-between mb-2">
                    <button onClick={() => router.back()} className="p-2 hover:bg-gray-900 rounded-full -ml-2">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2">
                        {isMember && (
                            <button
                                onClick={() => setShowShareModal(true)}
                                className="p-2 hover:bg-gray-900 rounded-full text-gray-400 hover:text-white"
                            >
                                <Share2 className="w-6 h-6" />
                            </button>
                        )}
                        {(isAdmin || isOwner) && (
                            <button
                                onClick={() => router.push(`/groups/${id}/settings`)}
                                className="p-2 hover:bg-gray-900 rounded-full text-gray-400 hover:text-white -mr-2"
                            >
                                <Settings className="w-6 h-6" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Compact Group Info */}
                <div className="flex flex-col gap-4 mb-4">
                    <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <img
                                src={group.avatar}
                                alt={group.name}
                                className={`w-20 h-20 rounded-2xl object-cover bg-gray-800 border-2 border-[#EC1D99] cursor-pointer hover:opacity-90 transition-opacity ${uploadingAvatar ? 'opacity-50' : ''}`}
                                onClick={handlePhotoClick}
                            />
                            {uploadingAvatar && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#EC1D99]"></div>
                                </div>
                            )}
                            {(isAdmin || isOwner) && !uploadingAvatar && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAvatarClick();
                                    }}
                                    className="absolute -bottom-2 -right-2 bg-[#EC1D99] p-1.5 rounded-full border-2 border-black hover:bg-[#EC1D99]/90 transition-colors shadow-lg"
                                >
                                    <ImageIcon className="w-3 h-3 text-white" />
                                </button>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 pt-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-xl font-bold truncate pr-2">{group.name}</h1>
                                {group.is_private && <Lock className="w-4 h-4 text-gray-500 shrink-0" />}
                                {ownerVerification.isVerified && (
                                    <VerificationBadge
                                        isVerified={true}
                                        tier={ownerVerification.tier}
                                        size="sm"
                                    />
                                )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                                <div className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    <span>{members.filter((m: any) => m.status === 'active').length} members</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Heart className="w-3 h-3" />
                                    <span>{formatCount(totalLikes)} likes</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Globe className="w-3 h-3" />
                                    <span>{group.is_private ? 'Private' : 'Public'} Group</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    {group.description && (
                        <p className="text-sm text-gray-300 leading-relaxed max-w-2xl">
                            {group.description}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        {!isMember ? (
                            <>
                                {hasPendingRequest ? (
                                    <button
                                        onClick={handleCancelRequest}
                                        className="flex-1 py-2.5 rounded-xl font-bold transition-colors border border-gray-700 text-gray-400 hover:border-red-500 hover:text-red-500 hover:bg-red-500/10 text-sm"
                                    >
                                        Cancel Request
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleJoin}
                                        className="flex-1 py-2.5 rounded-xl font-bold transition-colors bg-[#EC1D99] text-white hover:bg-[#d61a88] text-sm"
                                    >
                                        {group.is_private ? 'Request to Join' : 'Join Group'}
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <Link
                                    href={`/create-story?groupId=${id}`}
                                    className="flex-1 flex items-center justify-center gap-2 bg-[#EC1D99] text-white py-2.5 rounded-xl font-bold hover:bg-[#d61a88] transition-colors text-sm"
                                >
                                    <PlusSquare className="w-4 h-4 ml-1" />
                                    Create Story
                                </Link>
                                {!isOwner && (
                                    <button
                                        onClick={handleLeaveGroup}
                                        disabled={leaving}
                                        className="py-2.5 px-4 rounded-xl font-bold transition-colors border border-gray-700 text-gray-400 hover:border-red-500 hover:text-red-500 hover:bg-red-500/10 text-sm disabled:opacity-50"
                                        title="Leave Group"
                                    >
                                        {leaving ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current" />
                                        ) : (
                                            <LogOut className="w-4 h-4" />
                                        )}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

            </div>

            {/* Tabs */}
            <div className="w-full max-w-md mx-auto">
                <div className="flex border-b border-gray-800">
                    <button
                        onClick={() => setActiveTab('stories')}
                        className={`flex-1 py-4 text-sm font-medium transition-colors relative ${activeTab === 'stories'
                            ? 'text-white'
                            : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        Stories
                        {activeTab === 'stories' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EC1D99]" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 py-4 text-sm font-medium transition-colors relative ${activeTab === 'chat'
                            ? 'text-white'
                            : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        Chat
                        {activeTab === 'chat' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EC1D99]" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`flex-1 py-4 text-sm font-medium transition-colors relative ${activeTab === 'members'
                            ? 'text-white'
                            : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        Members
                        {activeTab === 'members' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EC1D99]" />
                        )}
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className={`w-full max-w-md mx-auto ${activeTab === 'chat' ? 'flex-1 flex flex-col' : ''}`}>
                {activeTab === 'stories' ? (
                    /* Stories Tab */
                    <div className="px-4 pb-24">
                        {/* Show restricted message for non-members of private groups */}
                        {group.is_private && !isMember ? (
                            <div className="text-center py-12 bg-gray-900/30 rounded-xl border border-gray-800">
                                <Lock className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                                <p className="text-gray-400 font-medium mb-2">Members Only</p>
                                <p className="text-gray-500 text-sm mb-4">Join this group to see stories</p>
                                {!hasPendingRequest && (
                                    <button
                                        onClick={handleJoin}
                                        className="px-6 py-2 bg-[#EC1D99] text-white rounded-full text-sm font-bold hover:bg-[#d61a88] transition-colors"
                                    >
                                        Request to Join
                                    </button>
                                )}
                                {hasPendingRequest && (
                                    <p className="text-xs text-gray-600">Your request is pending approval</p>
                                )}
                            </div>
                        ) : stories.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3">
                                {stories.map((story) => (
                                    <Link
                                        key={story.id}
                                        href={`/story/${story.id}`}
                                        className="relative rounded-xl overflow-hidden aspect-square group bg-gray-900"
                                    >
                                        {(() => {
                                            // Get first contribution for thumbnail
                                            const sortedContributions = (story.contributions || [])
                                                .slice()
                                                .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                                            const firstContribution = sortedContributions[0];
                                            const mediaType = firstContribution?.media_type;
                                            const mediaUrl = firstContribution?.media_url;

                                            if (mediaType === 'video' && mediaUrl) {
                                                return (
                                                    <video
                                                        src={mediaUrl}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                        muted
                                                        playsInline
                                                        preload="metadata"
                                                    />
                                                );
                                            } else if ((mediaType === 'image' || mediaType === 'drawing') && mediaUrl) {
                                                return (
                                                    <img
                                                        src={mediaUrl}
                                                        alt={story.title}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    />
                                                );
                                            } else if (story.cover_image) {
                                                return (
                                                    <img
                                                        src={story.cover_image}
                                                        alt={story.title}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    />
                                                );
                                            } else if (firstContribution?.content) {
                                                // Text-only contribution
                                                return (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black text-white p-3 text-center">
                                                        <p className="text-sm font-semibold leading-snug line-clamp-5">
                                                            {firstContribution.content}
                                                        </p>
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                                                        <span className="text-gray-600 text-xs">No media</span>
                                                    </div>
                                                );
                                            }
                                        })()}

                                        {/* Weever avatars overlay - top left */}
                                        {(() => {
                                            const participants = story.story_participants || [];
                                            const contributions = story.contributions || [];
                                            const maxSlots = story.max_weeves || 3;
                                            const filledSlots = contributions.length;
                                            const openSlots = maxSlots - filledSlots;
                                            const isOpen = story.status === 'active' && openSlots > 0;

                                            // Get unique contributor avatars (up to 3)
                                            const contributorAvatars = contributions
                                                .slice(0, 3)
                                                .map((c: any) => ({
                                                    avatar: c.profiles?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.user_id}`,
                                                    name: c.profiles?.name || 'Contributor'
                                                }));

                                            return (
                                                <div className="absolute top-2 left-2 z-10 flex items-center">
                                                    {/* Stacked avatars */}
                                                    <div className="flex -space-x-2">
                                                        {contributorAvatars.map((contributor: any, idx: number) => (
                                                            <img
                                                                key={idx}
                                                                src={contributor.avatar}
                                                                alt={contributor.name}
                                                                className="w-6 h-6 rounded-full border-2 border-black object-cover"
                                                            />
                                                        ))}
                                                        {/* Show open slot indicator */}
                                                        {isOpen && openSlots > 0 && (
                                                            <div className="w-6 h-6 rounded-full border-2 border-black bg-[#EC1D99] flex items-center justify-center">
                                                                <span className="text-[10px] font-bold text-white">+{openSlots}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Status badge - top right */}
                                        {story.status === 'active' && (
                                            <div className="absolute top-2 right-2 z-10">
                                                <div className="flex items-center gap-1 bg-green-500/90 px-2 py-0.5 rounded-full">
                                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                                    <span className="text-[10px] font-bold text-white uppercase">Open</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Title overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                                            <h3 className="font-bold text-sm line-clamp-2">{story.title}</h3>
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
                ) : activeTab === 'chat' ? (
                    /* Chat Tab */
                    <GroupChatTab groupId={id} isMember={isMember} />
                ) : (
                    /* Members Tab */
                    <div className="space-y-3 px-4 pb-24">
                        {members.filter(m => m.status === 'active').map((member) => {
                            const isGroupOwner = member.user_id === group.owner_id;
                            const isGroupAdmin = member.role === 'admin' && !isGroupOwner;
                            const customRoles = memberRoles
                                .filter(mr => mr.user_id === member.user_id)
                                .map(mr => mr.role)
                                .filter(Boolean);

                            return (
                                <div key={member.id} className="flex items-center gap-3 bg-gray-900/50 p-3 rounded-xl">
                                    {/* Avatar - links to profile */}
                                    <Link href={`/profile/${member.user_id}`} className="shrink-0">
                                        <img
                                            src={member.profiles?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`}
                                            alt={member.profiles?.name}
                                            className="w-10 h-10 rounded-full bg-gray-800 hover:opacity-80 transition-opacity"
                                        />
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {/* Name - links to profile */}
                                            <Link href={`/profile/${member.user_id}`} className="hover:opacity-80 transition-opacity">
                                                <p className="font-medium">{member.profiles?.name || 'Unknown User'}</p>
                                            </Link>
                                            {isGroupOwner && (
                                                <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 rounded-full border border-yellow-500/40">
                                                    <Crown className="w-3 h-3 text-yellow-500" />
                                                    <span className="text-[10px] font-bold text-yellow-500 uppercase">Owner</span>
                                                </div>
                                            )}
                                            {isGroupAdmin && (
                                                <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 rounded-full border border-purple-500/40">
                                                    <Shield className="w-3 h-3 text-purple-400" />
                                                    <span className="text-[10px] font-bold text-purple-400 uppercase">Admin</span>
                                                </div>
                                            )}
                                            {/* Custom role badges - clickable if they have an image */}
                                            {customRoles.map((role: any) => (
                                                <button
                                                    key={role.id}
                                                    onClick={() => role.badge_url && openImageViewer(role.badge_url, role.name)}
                                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${role.badge_url ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
                                                    style={{ backgroundColor: `${role.color}20`, border: `1px solid ${role.color}40` }}
                                                >
                                                    {role.badge_url ? (
                                                        <img src={role.badge_url} alt={role.name} className="w-3 h-3 rounded-full object-cover" />
                                                    ) : (
                                                        <Tag className="w-3 h-3" style={{ color: role.color }} />
                                                    )}
                                                    <span className="text-[10px] font-bold uppercase" style={{ color: role.color }}>{role.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                        {!isGroupOwner && !isGroupAdmin && customRoles.length === 0 && (
                                            <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Share Modal */}
            {showShareModal && group && (
                <GroupShareModal
                    group={{
                        id: group.id,
                        name: group.name,
                        description: group.description,
                        isPrivate: group.is_private
                    }}
                    onClose={() => setShowShareModal(false)}
                />
            )}

            {/* Avatar Picker Modal */}
            {showAvatarPicker && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-end pb-12 bg-black/90 backdrop-blur-sm animate-in slide-in-from-bottom duration-300">
                    <button
                        onClick={() => setShowAvatarPicker(false)}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <h2 className="text-xl font-bold mb-8 text-white">Update Group Photo</h2>

                    <div className="flex gap-6 mb-8">
                        <button
                            onClick={() => handleMediaSelect('camera')}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[#EC1D99] transition-colors">
                                <Camera className="w-8 h-8 text-white" />
                            </div>
                            <span className="text-sm font-medium text-white">Take Photo</span>
                        </button>

                        <button
                            onClick={() => handleMediaSelect('gallery')}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[#EC1D99] transition-colors">
                                <ImageIcon className="w-8 h-8 text-white" />
                            </div>
                            <span className="text-sm font-medium text-white">Upload Photo</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Photo Viewer Modal */}
            {showPhotoViewer && viewerImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => {
                        setShowPhotoViewer(false);
                        setViewerImage(null);
                    }}
                >
                    <button
                        onClick={() => {
                            setShowPhotoViewer(false);
                            setViewerImage(null);
                        }}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white z-10"
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <img
                        src={viewerImage.url}
                        alt={viewerImage.alt}
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
