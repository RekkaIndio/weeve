'use client';

import { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Copy, Check, Users, Trash2, Upload, Mail, Loader2 } from 'lucide-react';
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

interface Member {
    id: string;
    user_id: string;
    name: string;
    avatar: string | null;
    created_at: string;
}

export default function CommunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [community, setCommunity] = useState<Community | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        primary_color: '#EC1D99',
        accent_color: '#06B6D4',
        owner_email: '',
        is_active: true,
        rules: '',
    });

    // Email invite state
    const [inviteEmails, setInviteEmails] = useState('');
    const [sendingInvites, setSendingInvites] = useState(false);
    const [inviteResult, setInviteResult] = useState<{ success: boolean; message: string } | null>(null);

    // Logo upload state
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchCommunity();
        fetchMembers();
    }, [resolvedParams.id]);

    const fetchCommunity = async () => {
        try {
            const { data, error } = await supabase
                .from('communities')
                .select('*')
                .eq('id', resolvedParams.id)
                .single();

            if (error) throw error;
            setCommunity(data);
            setLogoUrl(data.logo_url);
            setFormData({
                name: data.name,
                code: data.code,
                description: data.description || '',
                primary_color: data.primary_color,
                accent_color: data.accent_color,
                owner_email: data.owner_email || '',
                is_active: data.is_active,
                rules: data.rules || '',
            });
        } catch (error) {
            console.error('Failed to fetch community:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMembers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, user_id, name, avatar, created_at')
                .eq('community_id', resolvedParams.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setMembers(data || []);
        } catch (error) {
            console.error('Failed to fetch members:', error);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('communities')
                .update({
                    name: formData.name.trim(),
                    code: formData.code.trim(),
                    description: formData.description.trim() || null,
                    primary_color: formData.primary_color,
                    accent_color: formData.accent_color,
                    owner_email: formData.owner_email.trim() || null,
                    is_active: formData.is_active,
                    rules: formData.rules.trim() || null,
                    logo_url: logoUrl,
                })
                .eq('id', resolvedParams.id);

            if (error) throw error;
            fetchCommunity();
        } catch (error) {
            console.error('Failed to save:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const copyInviteLink = () => {
        const link = `${window.location.origin}/signup?community=${formData.code}`;
        navigator.clipboard.writeText(link);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const handleSendInvites = async () => {
        if (!inviteEmails.trim()) return;

        // Parse emails (comma or newline separated)
        const emails = inviteEmails
            .split(/[,\n]/)
            .map(e => e.trim().toLowerCase())
            .filter(e => e && e.includes('@'));

        if (emails.length === 0) {
            setInviteResult({ success: false, message: 'No valid emails found' });
            return;
        }

        setSendingInvites(true);
        setInviteResult(null);

        try {
            const response = await fetch('/api/community-invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    emails,
                    communityCode: formData.code,
                    communityName: formData.name,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setInviteResult({ success: true, message: `Sent ${data.sent} invite(s)!` });
                setInviteEmails('');
            } else {
                setInviteResult({ success: false, message: data.error || 'Failed to send invites' });
            }
        } catch (error) {
            setInviteResult({ success: false, message: 'Failed to send invites' });
        } finally {
            setSendingInvites(false);
            setTimeout(() => setInviteResult(null), 5000);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) return;
        if (file.size > 2 * 1024 * 1024) return;

        setUploadingLogo(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `community-logo-${resolvedParams.id}-${Date.now()}.${fileExt}`;
            const filePath = `community-logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setLogoUrl(urlData.publicUrl);
        } catch (error) {
            console.error('Failed to upload logo:', error);
        } finally {
            setUploadingLogo(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!community) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400">Community not found</p>
                <Link href="/admin/communities" className="text-pink-400 hover:text-pink-300 mt-2 inline-block">
                    ← Back to Communities
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/communities"
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{community.name}</h1>
                        <p className="text-zinc-400 mt-0.5">
                            Code: <code className="text-pink-400">{community.code}</code>
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    <Save size={18} />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2 bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Community Details</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-zinc-400 mb-1">Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-pink-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-zinc-400 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-pink-500 resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-zinc-400 mb-1">Community Rules (Markdown supported)</label>
                            <textarea
                                value={formData.rules}
                                onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                                rows={6}
                                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-pink-500 resize-none font-mono text-sm"
                                placeholder="- be respectful&#10;- no spam"
                            />
                        </div>

                        {/* Logo Upload */}
                        <div>
                            <label className="block text-sm text-zinc-400 mb-1">Community Logo</label>
                            <div className="flex items-center gap-4">
                                {logoUrl ? (
                                    <div className="relative">
                                        <img
                                            src={logoUrl}
                                            alt="Logo preview"
                                            className="w-16 h-16 rounded-lg object-cover border border-zinc-700"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setLogoUrl(null)}
                                            className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 text-xs"
                                        >
                                            ✕
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
                            <label className="block text-sm text-zinc-400 mb-1">Owner Email</label>
                            <input
                                type="email"
                                value={formData.owner_email}
                                onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-pink-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Primary Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={formData.primary_color}
                                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                                        className="w-10 h-10 rounded cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={formData.primary_color}
                                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                                        className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Accent Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={formData.accent_color}
                                        onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                                        className="w-10 h-10 rounded cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={formData.accent_color}
                                        onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                                        className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Color Preview */}
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">Preview</label>
                            <div className="p-4 rounded-lg border border-zinc-700 bg-black">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                                        style={{ backgroundColor: formData.primary_color }}
                                    >
                                        W
                                    </div>
                                    <div>
                                        <p className="font-semibold" style={{ color: formData.primary_color }}>{formData.name}</p>
                                        <p className="text-sm" style={{ color: formData.accent_color }}>Accent text preview</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                            <div>
                                <p className="text-white font-medium">Active Status</p>
                                <p className="text-zinc-500 text-sm">Inactive communities can't accept new members</p>
                            </div>
                            <button
                                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                className={`px-4 py-2 rounded-lg font-medium ${formData.is_active
                                    ? 'bg-green-500/10 text-green-400'
                                    : 'bg-zinc-700 text-zinc-400'
                                    }`}
                            >
                                {formData.is_active ? 'Active' : 'Inactive'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* Invite Link */}
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                        <h3 className="text-sm font-semibold text-white mb-3">Invite Link</h3>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                readOnly
                                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/signup?community=${formData.code}`}
                                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                            />
                            <button
                                onClick={copyInviteLink}
                                className="p-2 bg-pink-500 hover:bg-pink-600 rounded-lg transition-colors"
                            >
                                {copiedLink ? <Check size={18} className="text-white" /> : <Copy size={18} className="text-white" />}
                            </button>
                        </div>
                        <p className="text-zinc-500 text-xs mt-2">Share this link with your customer</p>
                    </div>

                    {/* Email Invites */}
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Mail size={16} className="text-pink-400" />
                            <h3 className="text-sm font-semibold text-white">Send Email Invites</h3>
                        </div>
                        <textarea
                            value={inviteEmails}
                            onChange={(e) => setInviteEmails(e.target.value)}
                            placeholder="Enter emails (comma or newline separated)...&#10;john@example.com&#10;jane@example.com"
                            rows={4}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-pink-500 resize-none mb-2"
                        />
                        <button
                            onClick={handleSendInvites}
                            disabled={sendingInvites || !inviteEmails.trim()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            {sendingInvites ? (
                                <><Loader2 size={16} className="animate-spin" /> Sending...</>
                            ) : (
                                <><Mail size={16} /> Send Invites</>
                            )}
                        </button>
                        {inviteResult && (
                            <p className={`text-xs mt-2 ${inviteResult.success ? 'text-green-400' : 'text-red-400'}`}>
                                {inviteResult.message}
                            </p>
                        )}
                    </div>

                    {/* Members */}
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-white">Members</h3>
                            <span className="text-zinc-400 text-sm">{community.member_count}</span>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {members.length === 0 ? (
                                <p className="text-zinc-500 text-sm text-center py-4">No members yet</p>
                            ) : (
                                members.map((member) => (
                                    <Link
                                        key={member.id}
                                        href={`/admin/users/${member.user_id}`}
                                        className="flex items-center gap-2 p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                                    >
                                        {member.avatar ? (
                                            <img src={member.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                                                <Users size={14} className="text-zinc-400" />
                                            </div>
                                        )}
                                        <span className="text-white text-sm truncate">{member.name}</span>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                        <h3 className="text-sm font-semibold text-white mb-3">Statistics</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-zinc-400">Created</span>
                                <span className="text-white">{new Date(community.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-400">Members</span>
                                <span className="text-white">{community.member_count}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
