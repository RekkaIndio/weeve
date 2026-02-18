'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Building2, Users, Copy, Check, ExternalLink, ToggleLeft, ToggleRight, Upload, Loader2, X } from 'lucide-react';
import Link from 'next/link';

interface Community {
    id: string;
    name: string;
    code: string;
    description: string | null;
    logo_url: string | null;
    primary_color: string;
    accent_color: string;
    owner_email: string | null;
    is_active: boolean;
    member_count: number;
    created_at: string;
}

export default function CommunitiesPage() {
    const [communities, setCommunities] = useState<Community[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // Create form state
    const [newCommunity, setNewCommunity] = useState({
        name: '',
        code: '',
        description: '',
        primary_color: '#EC1D99',
        accent_color: '#06B6D4',
        owner_email: '',
        logo_url: '',
    });
    const [createError, setCreateError] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchCommunities();
    }, []);

    const fetchCommunities = async () => {
        try {
            const { data, error } = await supabase
                .from('communities')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCommunities(data || []);
        } catch (error) {
            console.error('Failed to fetch communities:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newCommunity.name.trim() || !newCommunity.code.trim()) {
            setCreateError('Name and code are required');
            return;
        }

        setIsCreating(true);
        setCreateError('');

        try {
            const { error } = await supabase.from('communities').insert({
                name: newCommunity.name.trim(),
                code: newCommunity.code.toUpperCase().trim(),
                description: newCommunity.description.trim() || null,
                primary_color: newCommunity.primary_color,
                accent_color: newCommunity.accent_color,
                owner_email: newCommunity.owner_email.trim() || null,
                logo_url: newCommunity.logo_url || null,
            });

            if (error) {
                if (error.message.includes('duplicate')) {
                    setCreateError('A community with this code already exists');
                } else {
                    throw error;
                }
                return;
            }

            setShowCreateModal(false);
            setNewCommunity({
                name: '',
                code: '',
                description: '',
                primary_color: '#EC1D99',
                accent_color: '#06B6D4',
                owner_email: '',
                logo_url: '',
            });
            fetchCommunities();
        } catch (error) {
            console.error('Failed to create community:', error);
            setCreateError('Failed to create community');
        } finally {
            setIsCreating(false);
        }
    };

    const toggleActive = async (community: Community) => {
        try {
            await supabase
                .from('communities')
                .update({ is_active: !community.is_active })
                .eq('id', community.id);
            fetchCommunities();
        } catch (error) {
            console.error('Failed to toggle community:', error);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setCreateError('Please select an image file');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setCreateError('Image must be less than 2MB');
            return;
        }

        setUploadingLogo(true);
        setCreateError('');

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `community-logo-${Date.now()}.${fileExt}`;
            const filePath = `community-logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setNewCommunity({ ...newCommunity, logo_url: urlData.publicUrl });
        } catch (error) {
            console.error('Failed to upload logo:', error);
            setCreateError('Failed to upload logo');
        } finally {
            setUploadingLogo(false);
        }
    };

    const copyInviteLink = (code: string) => {
        const link = `${window.location.origin}/signup?community=${code}`;
        navigator.clipboard.writeText(link);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Communities</h1>
                    <p className="text-zinc-400 mt-1">Manage white-labeled Weeve communities</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition-colors"
                >
                    <Plus size={18} />
                    Create Community
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <p className="text-zinc-400 text-sm">Total Communities</p>
                    <p className="text-2xl font-bold text-white mt-1">{communities.length}</p>
                </div>
                <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <p className="text-zinc-400 text-sm">Active</p>
                    <p className="text-2xl font-bold text-green-400 mt-1">
                        {communities.filter(c => c.is_active).length}
                    </p>
                </div>
                <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <p className="text-zinc-400 text-sm">Total Members</p>
                    <p className="text-2xl font-bold text-white mt-1">
                        {communities.reduce((sum, c) => sum + c.member_count, 0)}
                    </p>
                </div>
            </div>

            {/* Communities Table */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-zinc-800/50">
                        <tr>
                            <th className="text-left text-zinc-400 text-sm font-medium px-4 py-3">Community</th>
                            <th className="text-left text-zinc-400 text-sm font-medium px-4 py-3">Code</th>
                            <th className="text-left text-zinc-400 text-sm font-medium px-4 py-3">Members</th>
                            <th className="text-left text-zinc-400 text-sm font-medium px-4 py-3">Colors</th>
                            <th className="text-left text-zinc-400 text-sm font-medium px-4 py-3">Status</th>
                            <th className="text-left text-zinc-400 text-sm font-medium px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {communities.map((community) => (
                            <tr key={community.id} className="hover:bg-zinc-800/30">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        {community.logo_url ? (
                                            <img src={community.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                        ) : (
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                style={{ backgroundColor: community.primary_color + '20' }}
                                            >
                                                <Building2 size={20} style={{ color: community.primary_color }} />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-white font-medium">{community.name}</p>
                                            {community.owner_email && (
                                                <p className="text-zinc-500 text-xs">{community.owner_email}</p>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <code className="px-2 py-1 bg-zinc-800 rounded text-sm text-pink-400">
                                        {community.code}
                                    </code>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1.5 text-zinc-300">
                                        <Users size={14} />
                                        {community.member_count}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1">
                                        <div
                                            className="w-6 h-6 rounded-full border border-zinc-700"
                                            style={{ backgroundColor: community.primary_color }}
                                            title="Primary"
                                        />
                                        <div
                                            className="w-6 h-6 rounded-full border border-zinc-700"
                                            style={{ backgroundColor: community.accent_color }}
                                            title="Accent"
                                        />
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => toggleActive(community)}
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${community.is_active
                                            ? 'bg-green-500/10 text-green-400'
                                            : 'bg-zinc-700/50 text-zinc-400'
                                            }`}
                                    >
                                        {community.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                        {community.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => copyInviteLink(community.code)}
                                            className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-white"
                                            title="Copy invite link"
                                        >
                                            {copiedCode === community.code ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                        </button>
                                        <Link
                                            href={`/admin/communities/${community.id}`}
                                            className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-white"
                                            title="Edit community"
                                        >
                                            <ExternalLink size={16} />
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {communities.length === 0 && (
                    <div className="text-center py-12 text-zinc-500">
                        <Building2 size={48} className="mx-auto mb-3 opacity-50" />
                        <p>No communities yet</p>
                        <p className="text-sm mt-1">Create your first white-labeled community</p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-lg mx-4 p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Create Community</h2>

                        {createError && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                {createError}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={newCommunity.name}
                                    onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
                                    placeholder="e.g., Chef's Circle"
                                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-pink-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Code * (used in invite links)</label>
                                <input
                                    type="text"
                                    value={newCommunity.code}
                                    onChange={(e) => setNewCommunity({ ...newCommunity, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                                    placeholder="e.g., CHEF2024"
                                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white uppercase focus:outline-none focus:border-pink-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Description</label>
                                <textarea
                                    value={newCommunity.description}
                                    onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
                                    placeholder="A community for..."
                                    rows={2}
                                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-pink-500 resize-none"
                                />
                            </div>

                            {/* Logo Upload */}
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Community Logo</label>
                                <div className="flex items-center gap-4">
                                    {newCommunity.logo_url ? (
                                        <div className="relative">
                                            <img
                                                src={newCommunity.logo_url}
                                                alt="Logo preview"
                                                className="w-16 h-16 rounded-lg object-cover border border-zinc-700"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setNewCommunity({ ...newCommunity, logo_url: '' })}
                                                className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div
                                            className="w-16 h-16 rounded-lg bg-zinc-800 border border-zinc-700 border-dashed flex items-center justify-center cursor-pointer hover:border-pink-500 transition-colors"
                                            onClick={() => logoInputRef.current?.click()}
                                        >
                                            {uploadingLogo ? (
                                                <Loader2 size={20} className="text-zinc-400 animate-spin" />
                                            ) : (
                                                <Upload size={20} className="text-zinc-500" />
                                            )}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <input
                                            ref={logoInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => logoInputRef.current?.click()}
                                            disabled={uploadingLogo}
                                            className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                                        </button>
                                        <p className="text-xs text-zinc-500 mt-1">Shown on signup page (max 2MB)</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Owner Email (for billing)</label>
                                <input
                                    type="email"
                                    value={newCommunity.owner_email}
                                    onChange={(e) => setNewCommunity({ ...newCommunity, owner_email: e.target.value })}
                                    placeholder="owner@company.com"
                                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-pink-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-1">Primary Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={newCommunity.primary_color}
                                            onChange={(e) => setNewCommunity({ ...newCommunity, primary_color: e.target.value })}
                                            className="w-10 h-10 rounded cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={newCommunity.primary_color}
                                            onChange={(e) => setNewCommunity({ ...newCommunity, primary_color: e.target.value })}
                                            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-1">Accent Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={newCommunity.accent_color}
                                            onChange={(e) => setNewCommunity({ ...newCommunity, accent_color: e.target.value })}
                                            className="w-10 h-10 rounded cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={newCommunity.accent_color}
                                            onChange={(e) => setNewCommunity({ ...newCommunity, accent_color: e.target.value })}
                                            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={isCreating}
                                className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isCreating ? 'Creating...' : 'Create Community'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
