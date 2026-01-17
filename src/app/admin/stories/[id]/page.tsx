'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
    ArrowLeft,
    Trash2,
    Eye,
    ExternalLink,
    Calendar,
    Heart,
    MessageCircle,
    AlertTriangle,
    Globe,
    Lock,
    Play,
    Image as ImageIcon,
    Type,
    ChevronLeft,
    ChevronRight,
    User,
} from 'lucide-react';
import Link from 'next/link';

interface Contribution {
    id: string;
    user_id: string;
    user_name?: string;
    media_type: string;
    media_url?: string;
    content?: string;
    created_at: string;
    timestamp?: number;
    text_style?: any;
    profiles?: {
        id: string;
        name: string;
        avatar?: string;
    };
}

interface Comment {
    id: string;
    user_id: string;
    user_name?: string;
    content: string;
    created_at: string;
    parent_comment_id?: string;
}

interface StoryDetail {
    id: string;
    title: string;
    description: string;
    creator_id: string;
    visibility: 'public' | 'private';
    status: 'active' | 'completed';
    post_type?: 'normal' | 'canon' | 'seed';
    created_at: string;
    max_weeves?: number;
    hashtags?: string[];
    contributions: Contribution[];
    story_likes: { user_id: string }[];
    story_comments: Comment[];
    profiles?: { id: string; name: string; avatar?: string };
    _reportCount?: number;
}

export default function AdminStoryDetailPage() {
    const params = useParams();
    const router = useRouter();
    const storyId = params?.id as string;

    const [story, setStory] = useState<StoryDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedContribution, setSelectedContribution] = useState<number>(0);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    useEffect(() => {
        if (storyId) {
            fetchStory();
        }
    }, [storyId]);

    const fetchStory = async () => {
        setIsLoading(true);
        try {
            // First fetch the story
            const { data: storyData, error: storyError } = await supabase
                .from('stories')
                .select('*')
                .eq('id', storyId)
                .single();

            if (storyError) throw storyError;
            if (!storyData) throw new Error('Story not found');

            // Fetch contributions
            const { data: contributions, error: contribError } = await supabase
                .from('contributions')
                .select('id, user_id, user_name, media_type, media_url, content, created_at, timestamp, text_style')
                .eq('story_id', storyId)
                .order('timestamp', { ascending: true });

            // Fetch creator profile
            const { data: creatorProfile } = await supabase
                .from('profiles')
                .select('id, name, avatar')
                .eq('user_id', storyData.creator_id)
                .single();

            // Fetch contributor profiles
            const userIds = [...new Set((contributions || []).map((c: any) => c.user_id))];
            let contributorProfiles: Record<string, { id: string; name: string; avatar?: string }> = {};

            if (userIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, user_id, name, avatar')
                    .in('user_id', userIds);

                profiles?.forEach((p: any) => {
                    contributorProfiles[p.user_id] = { id: p.id, name: p.name, avatar: p.avatar };
                });
            }

            // Fetch likes and comments counts
            const { data: likes } = await supabase
                .from('story_likes')
                .select('user_id')
                .eq('story_id', storyId);

            const { data: comments } = await supabase
                .from('story_comments')
                .select('id, content, user_id, user_name, created_at, parent_comment_id')
                .eq('story_id', storyId)
                .order('created_at', { ascending: true });

            // Get report count
            const { count: reportCount } = await supabase
                .from('story_reports')
                .select('id', { count: 'exact', head: true })
                .eq('story_id', storyId);

            // Add profile info to contributions
            const enrichedContributions = (contributions || []).map((c: any) => ({
                ...c,
                profiles: contributorProfiles[c.user_id] || null,
            }));

            setStory({
                ...storyData,
                contributions: enrichedContributions,
                story_likes: likes || [],
                story_comments: comments || [],
                profiles: creatorProfile,
                _reportCount: reportCount || 0,
            });
        } catch (error) {
            console.error('Failed to fetch story:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteContribution = async (contributionId: string) => {
        setActionLoading(contributionId);
        try {
            // Get contribution details first
            const { data: contribution, error: fetchError } = await supabase
                .from('contributions')
                .select('user_id, story_id, timestamp, slot_index')
                .eq('id', contributionId)
                .single();

            if (fetchError) throw fetchError;
            if (!contribution) throw new Error('Contribution not found');

            // Delete contribution
            const { error: deleteError } = await supabase
                .from('contributions')
                .delete()
                .eq('id', contributionId);

            if (deleteError) throw deleteError;

            // Update story status and reset turn to the contributor
            const { error: storyError } = await supabase
                .from('stories')
                .update({
                    status: 'active',
                    current_turn_user_id: contribution.user_id
                })
                .eq('id', contribution.story_id);

            if (storyError) {
                console.error('Failed to update story status:', storyError);
            }

            // Calculate position to identify specific participant entry
            let position = -1;
            if (contribution.timestamp >= 1000000 && contribution.timestamp < 100000000) {
                position = Math.floor(contribution.timestamp / 1000000) - 1;
            } else if (typeof contribution.slot_index === 'number' && contribution.slot_index >= 0) {
                position = contribution.slot_index;
            }

            // Reset specific participant status to waiting
            if (position !== -1) {
                const { error: participantError } = await supabase
                    .from('story_participants')
                    .update({ status: 'waiting' })
                    .match({
                        story_id: contribution.story_id,
                        user_id: contribution.user_id,
                        position: position
                    });

                if (participantError) {
                    console.error('Failed to update participant status:', participantError);
                }
            } else {
                console.warn('Could not determine position for deleted contribution, skipping participant status update');
            }

            // Remove from local state
            if (story) {
                const updatedContributions = story.contributions.filter(c => c.id !== contributionId);
                setStory({
                    ...story,
                    contributions: updatedContributions,
                    status: 'active',
                });

                if (selectedContribution >= updatedContributions.length && updatedContributions.length > 0) {
                    setSelectedContribution(updatedContributions.length - 1);
                }
            }
            setShowDeleteConfirm(null);
        } catch (error) {
            console.error('Failed to delete contribution:', error);
            alert('Failed to delete contribution');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm('Delete this comment?')) return;

        setActionLoading(commentId);
        try {
            const { error } = await supabase
                .from('story_comments')
                .delete()
                .eq('id', commentId);

            if (error) throw error;

            // Remove from local state
            if (story) {
                setStory({
                    ...story,
                    story_comments: story.story_comments.filter(c => c.id !== commentId),
                });
            }
        } catch (error) {
            console.error('Failed to delete comment:', error);
            alert('Failed to delete comment');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteStory = async () => {
        if (!confirm('Are you sure you want to delete this entire story? This action cannot be undone.')) {
            return;
        }

        setActionLoading('story');
        try {
            const { error } = await supabase
                .from('stories')
                .delete()
                .eq('id', storyId);

            if (error) throw error;

            router.push('/admin/stories');
        } catch (error) {
            console.error('Failed to delete story:', error);
            alert('Failed to delete story');
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
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getMediaIcon = (type: string) => {
        switch (type) {
            case 'video': return <Play size={14} />;
            case 'image': return <ImageIcon size={14} />;
            case 'text': return <Type size={14} />;
            default: return <ImageIcon size={14} />;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!story) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-zinc-500">
                <p>Story not found</p>
                <button
                    onClick={() => router.back()}
                    className="mt-4 text-pink-400 hover:text-pink-300"
                >
                    Go back
                </button>
            </div>
        );
    }

    const currentContribution = story.contributions[selectedContribution];

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
                    <div>
                        <h1 className="text-xl font-bold text-white">{story.title || 'Untitled Story'}</h1>
                        <p className="text-sm text-zinc-500">Story ID: {story.id}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href={`/story/${story.id}`}
                        target="_blank"
                        className="flex items-center gap-2 px-4 py-2 text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                        <ExternalLink size={16} />
                        View in App
                    </Link>
                    <button
                        onClick={handleDeleteStory}
                        disabled={actionLoading === 'story'}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50"
                    >
                        <Trash2 size={16} />
                        Delete Story
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Story Info Panel */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Basic Info */}
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                        <h2 className="text-lg font-semibold text-white mb-4">Story Details</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Creator</span>
                                <Link
                                    href={`/admin/users/${story.profiles?.id || story.creator_id}`}
                                    className="text-pink-400 hover:text-pink-300 flex items-center gap-1"
                                >
                                    {story.profiles?.name || 'Unknown'}
                                </Link>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Created</span>
                                <span className="text-white">{formatDate(story.created_at)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Visibility</span>
                                <span className={`flex items-center gap-1 ${story.visibility === 'public' ? 'text-green-400' : 'text-orange-400'}`}>
                                    {story.visibility === 'public' ? <Globe size={14} /> : <Lock size={14} />}
                                    {story.visibility}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Status</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${story.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'
                                    }`}>
                                    {story.status}
                                </span>
                            </div>
                            {story.post_type && story.post_type !== 'normal' && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500">Type</span>
                                    <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/10 text-purple-400">
                                        {story.post_type}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Max Weeves</span>
                                <span className="text-white">{story.max_weeves || 'Unlimited'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                        <h2 className="text-lg font-semibold text-white mb-4">Stats</h2>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-3 bg-zinc-800 rounded-lg">
                                <div className="flex items-center justify-center gap-1 text-pink-400 mb-1">
                                    <Heart size={16} />
                                </div>
                                <p className="text-xl font-bold text-white">{story.story_likes?.length || 0}</p>
                                <p className="text-xs text-zinc-500">Likes</p>
                            </div>
                            <div className="text-center p-3 bg-zinc-800 rounded-lg">
                                <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                                    <MessageCircle size={16} />
                                </div>
                                <p className="text-xl font-bold text-white">{story.story_comments?.length || 0}</p>
                                <p className="text-xs text-zinc-500">Comments</p>
                            </div>
                            <div className="text-center p-3 bg-zinc-800 rounded-lg">
                                <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
                                    <AlertTriangle size={16} />
                                </div>
                                <p className="text-xl font-bold text-white">{story._reportCount || 0}</p>
                                <p className="text-xs text-zinc-500">Reports</p>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    {story.description && (
                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                            <h2 className="text-lg font-semibold text-white mb-2">Description</h2>
                            <p className="text-sm text-zinc-400">{story.description}</p>
                        </div>
                    )}

                    {/* Hashtags */}
                    {story.hashtags && story.hashtags.length > 0 && (
                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                            <h2 className="text-lg font-semibold text-white mb-2">Hashtags</h2>
                            <div className="flex flex-wrap gap-2">
                                {story.hashtags.map((tag, i) => (
                                    <span key={i} className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded-full text-xs">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Comments */}
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                        <h2 className="text-lg font-semibold text-white mb-3">
                            Comments ({story.story_comments?.length || 0})
                        </h2>
                        {story.story_comments?.length === 0 ? (
                            <p className="text-sm text-zinc-500">No comments yet</p>
                        ) : (
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                                {story.story_comments?.map((comment) => (
                                    <div
                                        key={comment.id}
                                        className="flex items-start gap-3 p-3 bg-zinc-800 rounded-lg group"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-medium text-white">
                                                    {comment.user_name || 'Unknown'}
                                                </span>
                                                <span className="text-xs text-zinc-500">
                                                    {new Date(comment.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-zinc-300">{comment.content}</p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteComment(comment.id)}
                                            disabled={actionLoading === comment.id}
                                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                            title="Delete comment"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Contributions Panel */}
                <div className="lg:col-span-2">
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white">
                                Contributions ({story.contributions.length})
                            </h2>
                        </div>

                        {story.contributions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                                <p>No contributions yet</p>
                            </div>
                        ) : (
                            <>
                                {/* Main Viewer */}
                                <div className="relative aspect-[9/16] max-h-[500px] bg-zinc-950 rounded-lg overflow-hidden mb-4">
                                    {currentContribution && (
                                        <>
                                            {currentContribution.media_type === 'video' ? (
                                                <video
                                                    src={currentContribution.media_url}
                                                    className="w-full h-full object-contain"
                                                    controls
                                                />
                                            ) : currentContribution.media_type === 'image' ? (
                                                <img
                                                    src={currentContribution.media_url}
                                                    alt=""
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center p-6">
                                                    <p className="text-white text-center">
                                                        {currentContribution.content || 'Text content'}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Navigation buttons */}
                                            {story.contributions.length > 1 && (
                                                <>
                                                    <button
                                                        onClick={() => setSelectedContribution(prev => Math.max(0, prev - 1))}
                                                        disabled={selectedContribution === 0}
                                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white disabled:opacity-30"
                                                    >
                                                        <ChevronLeft size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedContribution(prev => Math.min(story.contributions.length - 1, prev + 1))}
                                                        disabled={selectedContribution === story.contributions.length - 1}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white disabled:opacity-30"
                                                    >
                                                        <ChevronRight size={20} />
                                                    </button>
                                                </>
                                            )}

                                            {/* Contributor info overlay */}
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                                <div className="flex items-center justify-between">
                                                    <Link
                                                        href={`/admin/users/${currentContribution.profiles?.id || currentContribution.user_id}`}
                                                        className="flex items-center gap-2 text-white hover:text-pink-400"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden">
                                                            {currentContribution.profiles?.avatar ? (
                                                                <img src={currentContribution.profiles.avatar} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-xs">
                                                                    <User size={14} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-sm font-medium">
                                                            {currentContribution.profiles?.name || 'Unknown'}
                                                        </span>
                                                    </Link>
                                                    <span className="text-xs text-zinc-400">
                                                        Slot {selectedContribution + 1}
                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Thumbnail strip */}
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                    {story.contributions.map((contribution, index) => (
                                        <button
                                            key={contribution.id}
                                            onClick={() => setSelectedContribution(index)}
                                            className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${selectedContribution === index
                                                ? 'border-pink-500'
                                                : 'border-transparent hover:border-zinc-600'
                                                }`}
                                        >
                                            {contribution.media_type === 'video' || contribution.media_type === 'image' ? (
                                                <img
                                                    src={contribution.media_url}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                                    <Type size={16} className="text-zinc-500" />
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                                                <span className="text-[10px] text-white">#{index + 1}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {/* Selected contribution actions */}
                                {currentContribution && (
                                    <div className="mt-4 p-4 bg-zinc-800 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-white font-medium">
                                                    Contribution #{selectedContribution + 1}
                                                </p>
                                                <p className="text-xs text-zinc-400">
                                                    {getMediaIcon(currentContribution.media_type)} {currentContribution.media_type} • {formatDate(currentContribution.created_at)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {showDeleteConfirm === currentContribution.id ? (
                                                    <>
                                                        <button
                                                            onClick={() => setShowDeleteConfirm(null)}
                                                            className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteContribution(currentContribution.id)}
                                                            disabled={actionLoading === currentContribution.id}
                                                            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50"
                                                        >
                                                            {actionLoading === currentContribution.id ? 'Deleting...' : 'Confirm Delete'}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => setShowDeleteConfirm(currentContribution.id)}
                                                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30"
                                                    >
                                                        <Trash2 size={14} />
                                                        Delete Contribution
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
