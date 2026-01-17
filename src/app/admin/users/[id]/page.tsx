'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
    ArrowLeft,
    Save,
    CheckCircle,
    Crown,
    Star,
    Briefcase,
    Shield,
    Calendar,
    Coins,
    Plus,
    X,
    ExternalLink,
    Ban,
} from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
    id: string;
    name: string;
    avatar?: string;
    tagline?: string;
    tokens: number;
    is_influencer?: boolean;
    is_private?: boolean;
    is_verified?: boolean;
    verification_tier?: 'bronze' | 'silver' | 'gold' | null;
    is_brand?: boolean;
    is_admin?: boolean;
    created_at: string;
    tags?: string[];
    collab_enabled?: boolean;
    collab_price_cents?: number;
    is_banned?: boolean;
    banned_at?: string;
    ban_reason?: string;
}

export default function AdminUserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const userId = params?.id as string;

    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [banReason, setBanReason] = useState('');
    const [showBanModal, setShowBanModal] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        tagline: '',
        tokens: 0,
        is_verified: false,
        verification_tier: '' as string,
        is_influencer: false,
        is_brand: false,
        is_admin: false,
        is_private: false,
        collab_enabled: false,
        collab_price_cents: 0,
        tags: [] as string[],
    });

    useEffect(() => {
        fetchUser();
    }, [userId]);

    const fetchUser = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            setUser(data);
            setFormData({
                name: data.name || '',
                tagline: data.tagline || '',
                tokens: data.tokens || 0,
                is_verified: data.is_verified || false,
                verification_tier: data.verification_tier || '',
                is_influencer: data.is_influencer || false,
                is_brand: data.is_brand || false,
                is_admin: data.is_admin || false,
                is_private: data.is_private || false,
                collab_enabled: data.collab_enabled || false,
                collab_price_cents: data.collab_price_cents || 0,
                tags: data.tags || [],
            });
        } catch (error) {
            console.error('Failed to fetch user:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    const handleAddTag = () => {
        if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
            handleChange('tags', [...formData.tags, newTag.trim()]);
            setNewTag('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        handleChange('tags', formData.tags.filter(t => t !== tag));
    };

    const handleBanUser = async () => {
        if (!banReason.trim()) {
            alert('Please provide a reason for banning');
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    is_banned: true,
                    banned_at: new Date().toISOString(),
                    ban_reason: banReason,
                })
                .eq('id', userId);

            if (error) throw error;

            setShowBanModal(false);
            setBanReason('');
            fetchUser();
            alert('User has been banned');
        } catch (error) {
            console.error('Failed to ban user:', error);
            alert('Failed to ban user');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUnbanUser = async () => {
        if (!confirm('Are you sure you want to unban this user?')) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    is_banned: false,
                    banned_at: null,
                    ban_reason: null,
                })
                .eq('id', userId);

            if (error) throw error;

            fetchUser();
            alert('User has been unbanned');
        } catch (error) {
            console.error('Failed to unban user:', error);
            alert('Failed to unban user');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updateData: any = {
                name: formData.name,
                tagline: formData.tagline,
                tokens: formData.tokens,
                is_verified: formData.is_verified,
                verification_tier: formData.is_verified ? (formData.verification_tier || 'bronze') : null,
                is_influencer: formData.is_influencer,
                is_brand: formData.is_brand,
                is_admin: formData.is_admin,
                is_private: formData.is_private,
                collab_enabled: formData.collab_enabled,
                collab_price_cents: formData.collab_price_cents,
                tags: formData.tags,
            };

            if (formData.is_verified && !user?.is_verified) {
                updateData.verified_at = new Date().toISOString();
            }

            const { error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', userId);

            if (error) throw error;

            setHasChanges(false);
            fetchUser(); // Refresh data
            alert('User updated successfully!');
        } catch (error: any) {
            console.error('Failed to update user:', error);
            alert(`Failed to update user: ${error.message || error.error_description || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-zinc-500">
                <p>User not found</p>
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
        <div className="space-y-6 max-w-4xl">
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
                        <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden">
                            {user.avatar ? (
                                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-600 text-lg">
                                    {user.name?.[0]?.toUpperCase() || '?'}
                                </div>
                            )}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">{user.name}</h1>
                            <p className="text-sm text-zinc-500">User ID: {user.id}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href={`/profile/${user.id}`}
                        target="_blank"
                        className="flex items-center gap-2 px-4 py-2 text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                        <ExternalLink size={16} />
                        View Profile
                    </Link>
                    {user.is_banned ? (
                        <button
                            onClick={handleUnbanUser}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50"
                        >
                            <Ban size={16} />
                            Unban User
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowBanModal(true)}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50"
                        >
                            <Ban size={16} />
                            Ban User
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={16} />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Ban Status Alert */}
            {user.is_banned && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <Ban size={20} className="text-red-400" />
                        <div>
                            <p className="text-red-400 font-semibold">This user is banned</p>
                            <p className="text-sm text-zinc-400">
                                Reason: {user.ban_reason || 'No reason provided'}
                                {user.banned_at && ` • Banned on ${new Date(user.banned_at).toLocaleDateString()}`}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Basic Info */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-zinc-400 mb-1">Username / Display Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-pink-500"
                        />
                        <p className="text-xs text-zinc-500 mt-1">This is the unique handle for the user.</p>
                    </div>
                    <div>
                        <label className="block text-sm text-zinc-400 mb-1">Tagline</label>
                        <input
                            type="text"
                            value={formData.tagline}
                            onChange={(e) => handleChange('tagline', e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-pink-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-zinc-400 mb-1">Tokens</label>
                        <input
                            type="number"
                            value={formData.tokens}
                            onChange={(e) => handleChange('tokens', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-pink-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-zinc-400 mb-1">Joined</label>
                        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400">
                            <Calendar size={16} />
                            {new Date(user.created_at).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Verification & Status */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                <h2 className="text-lg font-semibold text-white mb-4">Verification & Status</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.is_verified}
                                onChange={(e) => handleChange('is_verified', e.target.checked)}
                                className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-pink-500 focus:ring-pink-500"
                            />
                            <span className="flex items-center gap-2 text-white">
                                <CheckCircle size={16} className="text-blue-400" />
                                Verified
                            </span>
                        </label>

                        {formData.is_verified && (
                            <div className="ml-8">
                                <label className="block text-sm text-zinc-400 mb-1">Verification Tier</label>
                                <select
                                    value={formData.verification_tier}
                                    onChange={(e) => handleChange('verification_tier', e.target.value)}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-pink-500"
                                >
                                    <option value="bronze">Bronze</option>
                                    <option value="silver">Silver</option>
                                    <option value="gold">Gold</option>
                                </select>
                            </div>
                        )}

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.is_influencer}
                                onChange={(e) => handleChange('is_influencer', e.target.checked)}
                                className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-pink-500 focus:ring-pink-500"
                            />
                            <span className="flex items-center gap-2 text-white">
                                <Star size={16} className="text-purple-400" />
                                Influencer
                            </span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.is_brand}
                                onChange={(e) => handleChange('is_brand', e.target.checked)}
                                className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-pink-500 focus:ring-pink-500"
                            />
                            <span className="flex items-center gap-2 text-white">
                                <Briefcase size={16} className="text-blue-400" />
                                Brand Account
                            </span>
                        </label>
                    </div>

                    <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.is_admin}
                                onChange={(e) => handleChange('is_admin', e.target.checked)}
                                className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-pink-500 focus:ring-pink-500"
                            />
                            <span className="flex items-center gap-2 text-white">
                                <Shield size={16} className="text-red-400" />
                                Admin
                            </span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.is_private}
                                onChange={(e) => handleChange('is_private', e.target.checked)}
                                className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-pink-500 focus:ring-pink-500"
                            />
                            <span className="text-white">Private Account</span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.collab_enabled}
                                onChange={(e) => handleChange('collab_enabled', e.target.checked)}
                                className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-pink-500 focus:ring-pink-500"
                            />
                            <span className="flex items-center gap-2 text-white">
                                <Coins size={16} className="text-green-400" />
                                Collabs Enabled
                            </span>
                        </label>

                        {formData.collab_enabled && (
                            <div className="ml-8">
                                <label className="block text-sm text-zinc-400 mb-1">Collab Price (cents)</label>
                                <input
                                    type="number"
                                    value={formData.collab_price_cents}
                                    onChange={(e) => handleChange('collab_price_cents', parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-pink-500"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tags */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                <h2 className="text-lg font-semibold text-white mb-4">Profile Tags</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                    {formData.tags.map((tag) => (
                        <span
                            key={tag}
                            className="flex items-center gap-1 px-3 py-1 bg-pink-500/10 text-pink-400 rounded-full text-sm"
                        >
                            {tag}
                            <button
                                onClick={() => handleRemoveTag(tag)}
                                className="hover:text-pink-300"
                            >
                                <X size={14} />
                            </button>
                        </span>
                    ))}
                    {formData.tags.length === 0 && (
                        <span className="text-zinc-500 text-sm">No tags</span>
                    )}
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                        placeholder="Add a tag (e.g., OG, Beta Tester)"
                        className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-pink-500"
                    />
                    <button
                        onClick={handleAddTag}
                        className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
                    >
                        <Plus size={18} />
                    </button>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                    Common tags: OG, Beta Tester, Founder, Ambassador
                </p>
            </div>

            {/* Ban Modal */}
            {showBanModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-white mb-4">Ban User</h3>
                        <p className="text-sm text-zinc-400 mb-4">
                            Are you sure you want to ban {user.name}? They will not be able to access the platform.
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm text-zinc-400 mb-1">Reason for ban *</label>
                            <textarea
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                                placeholder="Enter reason for banning this user..."
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-pink-500 resize-none"
                                rows={3}
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowBanModal(false);
                                    setBanReason('');
                                }}
                                className="px-4 py-2 text-zinc-300 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBanUser}
                                disabled={isSaving || !banReason.trim()}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? 'Banning...' : 'Ban User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
