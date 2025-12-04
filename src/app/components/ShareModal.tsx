"use client";

import { useEffect, useMemo, useState } from 'react';
import { X, Share2, MessageCircle, Send, Check, Copy, Search as SearchIcon } from 'lucide-react';
import { Story, useStore } from '@/lib/store';
import { searchUsers } from '@/lib/friends';
import { notifyStoryShared } from '@/lib/notifications';
import { buildPublicUrl } from '@/lib/url';
import { toast } from 'sonner';

interface ShareModalProps {
    story: Story;
    onClose: () => void;
}

interface Recipient {
    id: string;
    name: string;
    avatar?: string;
    isFriend?: boolean;
    inviteCode?: string;
}

export default function ShareModal({ story, onClose }: ShareModalProps) {
    const friends = useStore((state) => state.friends);
    const currentUser = useStore((state) => state.currentUser);
    const fetchFriends = useStore((state) => state.fetchFriends);
    const [selectedRecipients, setSelectedRecipients] = useState<Map<string, Recipient>>(new Map());
    const [sending, setSending] = useState(false);
    const [copied, setCopied] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Recipient[]>([]);

    useEffect(() => {
        // Load friends when modal mounts or user changes so the list shows immediately
        if (currentUser) {
            fetchFriends();
        }
    }, [currentUser, fetchFriends]);

    useEffect(() => {
        if (!currentUser) return;

        const trimmed = searchQuery.trim();
        if (trimmed.length < 2) {
            setSearchResults([]);
            setSearching(false);
            return;
        }

        setSearching(true);
        setSearchResults([]);
        const handle = setTimeout(async () => {
            try {
                const results = await searchUsers(trimmed, currentUser.id);
                setSearchResults(results.map((profile) => ({
                    id: profile.id,
                    name: profile.name ?? 'Unknown user',
                    avatar: profile.avatar,
                    isFriend: profile.isFriend,
                    inviteCode: profile.inviteCode,
                })));
            } catch (error) {
                console.error('User search failed:', error);
                toast.error('Unable to search right now. Please try again.');
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => {
            clearTimeout(handle);
        };
    }, [searchQuery, currentUser]);

    const storyUrl = useMemo(() => {
        const url = new URL(buildPublicUrl(`/story/${story.id}`));

        if (currentUser?.inviteCode) {
            url.searchParams.set('ref', currentUser.inviteCode);
        }

        return url.toString();
    }, [story.id, currentUser?.inviteCode]);

    const shareText = `Check out "${story.title}" on Weeve! ${storyUrl}`;

    const handleDeviceShare = async () => {
        if (navigator.share) {
            try {
                const shareResult = await navigator.share({
                    title: story.title,
                    text: `Check out "${story.title}" on Weeve!`,
                    url: storyUrl,
                });
                toast.success('Shared successfully!');
                onClose();
                return shareResult;
            } catch (error) {
                // User cancelled or share failed
                if ((error as Error).name !== 'AbortError') {
                    console.error('Share failed:', error);
                    toast.error('Device sharing failed. Link copied instead.');
                    await handleCopyLink();
                }
                return;
            }
        }

        await handleCopyLink();
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(storyUrl);
            setCopied(true);
            toast.success('Link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Copy failed:', error);
            toast.error('Failed to copy link');
        }
    };

    const handleWhatsAppShare = () => {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
        toast.success('Opening WhatsApp...');
    };

    const toggleRecipientSelection = (recipient: Recipient) => {
        setSelectedRecipients((previous) => {
            const next = new Map(previous);
            if (next.has(recipient.id)) {
                next.delete(recipient.id);
            } else {
                next.set(recipient.id, recipient);
            }
            return next;
        });
    };

    const handleSendToFriends = async () => {
        if (selectedRecipients.size === 0 || !currentUser) return;

        setSending(true);
        try {
            const recipients = Array.from(selectedRecipients.values());
            const promises = recipients.map((recipient) =>
                notifyStoryShared(
                    story.id,
                    story.title,
                    recipient.id,
                    currentUser.name
                )
            );

            await Promise.all(promises);
            toast.success(`Shared with ${recipients.length} user${recipients.length > 1 ? 's' : ''}!`);
            onClose();
        } catch (error) {
            console.error('Failed to send notifications:', error);
            toast.error('Failed to share with friends');
        } finally {
            setSending(false);
        }
    };

    const recipientList = useMemo(() => {
        const normalizedFriends = friends.map((friend) => {
            const displayName = friend.name?.trim() || friend.inviteCode?.trim() || 'Unknown user';
            const searchKey = `${displayName} ${friend.inviteCode ?? ''}`.toLowerCase();

            return {
                id: friend.id,
                name: displayName,
                avatar: friend.avatar,
                isFriend: true,
                inviteCode: friend.inviteCode,
                searchKey,
            };
        });

        if (!currentUser) {
            return normalizedFriends.map(({ searchKey, ...recipient }) => recipient);
        }

        const trimmed = searchQuery.trim();
        if (trimmed.length >= 2) {
            const lowerQuery = trimmed.toLowerCase();

            const friendMatches = normalizedFriends.filter((friend) =>
                friend.searchKey.includes(lowerQuery)
            );

            const remoteMatches = searchResults.map((result) => {
                const displayName = result.name?.trim() || result.inviteCode?.trim() || 'Unknown user';
                return {
                    ...result,
                    name: displayName,
                    inviteCode: result.inviteCode,
                    searchKey: `${displayName} ${result.inviteCode ?? ''}`.toLowerCase(),
                };
            });

            const merged = new Map<string, (Recipient & { searchKey: string })>();
            friendMatches.forEach((match) => {
                merged.set(match.id, match);
            });
            remoteMatches.forEach((match) => {
                merged.set(match.id, match);
            });

            return Array.from(merged.values()).map(({ searchKey, ...recipient }) => recipient);
        }

        return normalizedFriends.map(({ searchKey, ...recipient }) => recipient);
    }, [friends, searchResults, searchQuery, currentUser]);

    const selectedCount = selectedRecipients.size;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm pb-6 sm:pb-0"
            onClick={onClose}
            role="presentation"
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        >
            <div
                className="bg-gray-900 border border-gray-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden flex flex-col max-h-[calc(100vh-88px)] sm:max-h-[80vh]"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Share story dialog"
                tabIndex={-1}
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white">Share Story</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 120px)' }}>
                    {/* Quick Share options are now in footer (mobile-friendly) */}

                    {/* Send to Friends */}
                    <div className="p-4">
                        <h3 className="text-sm font-medium text-gray-400 mb-3">Send to Friends</h3>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="relative flex-1">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder="Search for people (min 2 characters)"
                                    className="w-full rounded-xl bg-gray-800/70 border border-gray-700 pl-10 pr-10 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#EC1D99]"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                        aria-label="Clear search"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={handleSendToFriends}
                                disabled={sending || selectedCount === 0}
                                aria-label={selectedCount > 0 ? `Send to ${selectedCount} selected recipient${selectedCount === 1 ? '' : 's'}` : 'Select recipients to send'}
                                className="shrink-0 w-12 h-12 rounded-xl bg-[#EC1D99] hover:bg-[#D41C84] disabled:bg-gray-700 disabled:text-gray-500 flex items-center justify-center transition-colors"
                            >
                                {sending ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5 text-white" />
                                )}
                            </button>
                        </div>

                        {searchQuery.trim().length >= 2 && !searching && recipientList.length === 0 && (
                            <div className="text-center py-6 text-gray-500 text-sm">
                                No users found. Try a different name or invite code.
                            </div>
                        )}

                        {recipientList.length === 0 && searchQuery.trim().length < 2 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p className="text-sm">No friends yet</p>
                            </div>
                        ) : (
                            <div className="space-y-2 pr-2 pb-1">
                                {recipientList.map(recipient => {
                                    const isSelected = selectedRecipients.has(recipient.id);
                                    return (
                                        <button
                                            key={recipient.id}
                                            onClick={() => toggleRecipientSelection(recipient)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${isSelected
                                                ? 'bg-[#EC1D99]/20 border-2 border-[#EC1D99]'
                                                : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-800'
                                                }`}
                                        >
                                            <img
                                                src={recipient.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${recipient.name}`}
                                                alt={recipient.name}
                                                className="w-10 h-10 rounded-full border border-gray-700"
                                            />
                                            <span className="text-white font-medium flex-1 text-left">{recipient.name}</span>
                                            {recipient.isFriend === false && (
                                                <span className="text-xs text-gray-400">Not friends</span>
                                            )}
                                            {isSelected && (
                                                <div className="w-6 h-6 rounded-full bg-[#EC1D99] flex items-center justify-center">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                                {searching && (
                                    <div className="py-4 text-center text-gray-400 text-sm">Searching...</div>
                                )}
                            </div>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-400 mt-3 mb-2">
                            <span>{selectedCount > 0 ? `${selectedCount} recipient${selectedCount === 1 ? '' : 's'} selected` : ''}</span>
                            {sending && <span>Sending…</span>}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div
                    className="p-4 pt-5 border-t border-gray-800 bg-gray-900"
                    style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 28px) + 16px)' }}
                >
                    {/* Quick Share - moved to footer */}
                    <div className="pb-3">
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={handleDeviceShare}
                                className="flex flex-col items-center gap-2 p-3 bg-gray-800 hover:bg-gray-750 rounded-xl transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-[#EC1D99]/20 flex items-center justify-center">
                                    <Share2 className="w-5 h-5 text-[#EC1D99]" />
                                </div>
                                <span className="text-xs text-white">Device</span>
                            </button>

                            <button
                                onClick={handleWhatsAppShare}
                                className="flex flex-col items-center gap-2 p-3 bg-gray-800 hover:bg-gray-750 rounded-xl transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <MessageCircle className="w-5 h-5 text-green-500" />
                                </div>
                                <span className="text-xs text-white">WhatsApp</span>
                            </button>

                            <button
                                onClick={handleCopyLink}
                                className="flex flex-col items-center gap-2 p-3 bg-gray-800 hover:bg-gray-750 rounded-xl transition-colors"
                            >
                                <div className={`w-10 h-10 rounded-full ${copied ? 'bg-green-500/20' : 'bg-white/10'} flex items-center justify-center`}>
                                    {copied ? (
                                        <Check className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <Copy className="w-5 h-5 text-white" />
                                    )}
                                </div>
                                <span className={`text-xs ${copied ? 'text-green-500' : 'text-white'}`}>
                                    {copied ? 'Copied' : 'Copy'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
