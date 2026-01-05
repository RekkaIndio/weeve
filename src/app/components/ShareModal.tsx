"use client";

import { useEffect, useMemo, useState } from 'react';
import { X, Share2, MessageCircle, Send, Check, Copy, Search as SearchIcon, Download, Instagram, Facebook, Flag, Ban } from 'lucide-react';
import { Story, useStore } from '@/lib/store';
import { searchUsers } from '@/lib/friends';
import { notifyStoryShared } from '@/lib/notifications';
import { buildPublicUrl } from '@/lib/url';

import { useVideoStitcher } from '@/hooks/useVideoStitcher';
import { supabase } from '@/lib/supabase';

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
    // Helper to open URLs using Capacitor Browser on native, falling back to window.open on web
    const openUrl = async (url: string) => {
        try {
            const { Capacitor } = await import('@capacitor/core');
            if (Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
                const { Browser } = await import('@capacitor/browser');
                await Browser.open({ url });
                return;
            }
        } catch (e) {
            // ignore and fallback to window.open
        }
        try { window.open(url, '_blank'); } catch (e) { /* ignore */ }
    };
    // Feature flag to temporarily disable client-side download until bug is resolved
    const ENABLE_DOWNLOAD_FEATURE = true;

    const friends = useStore((state) => state.friends);
    const currentUser = useStore((state) => state.currentUser);
    const fetchFriends = useStore((state) => state.fetchFriends);
    const [selectedRecipients, setSelectedRecipients] = useState<Map<string, Recipient>>(new Map());
    const [sending, setSending] = useState(false);
    const [copied, setCopied] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Recipient[]>([]);
    const { stitchStory, stitchingState, progress, videoUrl, reset } = useVideoStitcher();
    const [downloadComplete, setDownloadComplete] = useState(false);
    const [savedFilePath, setSavedFilePath] = useState<string | null>(null);
    const [isSaved, setIsSaved] = useState(false);
    const [lastAction, setLastAction] = useState<'save' | 'share' | null>(null);
    const [isHighQualityExport, setIsHighQualityExport] = useState(false);
    const [groupInfo, setGroupInfo] = useState<{ avatar?: string; name?: string } | null>(null);


    // Fetch group info when modal opens if story belongs to a group
    useEffect(() => {
        const fetchGroupInfo = async () => {
            if (!story.groupId) {
                setGroupInfo(null);
                return;
            }

            try {
                const { data: groupData, error } = await supabase
                    .from('groups')
                    .select('avatar, name')
                    .eq('id', story.groupId)
                    .single();

                if (error) throw error;

                if (groupData) {
                    setGroupInfo({
                        avatar: groupData.avatar,
                        name: groupData.name
                    });
                }
            } catch (e) {
                console.warn('Failed to fetch group info for watermark:', e);
                setGroupInfo(null);
            }
        };

        fetchGroupInfo();
    }, [story.groupId]);

    // Automatically save video when stitching completes after a save action
    useEffect(() => {
        const saveVideoToDevice = async () => {
            if (!videoUrl || lastAction !== 'save') return;

            try {
                const { Capacitor } = await import('@capacitor/core');
                const isNative = Capacitor.isNativePlatform();

                const response = await fetch(videoUrl);
                const fileBlob = await response.blob();
                const filename = `${story.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_weeve${isHighQualityExport ? '_HQ' : ''}.mp4`;

                if (isNative) {
                    // Save to device's media gallery (Photos/Gallery)
                    const { Filesystem, Directory } = await import('@capacitor/filesystem');
                    const { Media } = await import('@capacitor-community/media');

                    // Convert blob to base64
                    const base64Data = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const res = reader.result as string;
                            resolve(res.split(',')[1]);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(fileBlob);
                    });

                    // Save to temporary file first
                    const tempFile = await Filesystem.writeFile({
                        path: filename,
                        data: base64Data,
                        directory: Directory.Cache,
                        recursive: true
                    });

                    // Get or create the Weeve album for organizing saved videos
                    // Note: albumIdentifier is REQUIRED on Android, optional on iOS
                    const platform = Capacitor.getPlatform();
                    let albumIdentifier: string | undefined;
                    try {
                        const albums = await Media.getAlbums();
                        const weeveAlbum = albums.albums.find(a => a.name === 'Weeve');
                        if (weeveAlbum) {
                            albumIdentifier = weeveAlbum.identifier;
                        } else {
                            // Create the album if it doesn't exist
                            await Media.createAlbum({ name: 'Weeve' });
                            const updatedAlbums = await Media.getAlbums();
                            const newAlbum = updatedAlbums.albums.find(a => a.name === 'Weeve');
                            albumIdentifier = newAlbum?.identifier;
                        }
                    } catch (albumError) {
                        console.warn('Could not get/create Weeve album:', albumError);
                    }

                    // On Android, albumIdentifier is required - throw if we don't have it
                    if (platform === 'android' && !albumIdentifier) {
                        throw new Error('Could not create album for saving video on Android');
                    }

                    // Save to media gallery
                    await Media.saveVideo({
                        path: tempFile.uri,
                        albumIdentifier: albumIdentifier
                    });

                    // Clean up temp file
                    try {
                        await Filesystem.deleteFile({
                            path: filename,
                            directory: Directory.Cache
                        });
                    } catch {
                        // Ignore cleanup errors
                    }

                    setSavedFilePath(tempFile.uri);

                } else {
                    // Web: trigger download
                    const downloadUrl = window.URL.createObjectURL(fileBlob);
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(downloadUrl);

                }

                setIsSaved(true);
            } catch (error) {
                console.error('Failed to save video:', error);
                console.error('Failed to save video');
            }

            setLastAction(null);
        };

        saveVideoToDevice();
    }, [videoUrl, lastAction, story.title]);

    // Reset stitcher state and local state when modal closes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleClose = () => {
        reset();
        setDownloadComplete(false); // Retain for safety if I missed removal, or just remove if I remove the state definition.
        setIsSaved(false);
        setSavedFilePath(null);
        onClose();
    };

    // Empty deps - only run on mount/unmount, not when reset changes
    useEffect(() => {
        return () => {
            reset();
        };
    }, []);

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
                console.error('Unable to search right now. Please try again.');
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

                handleClose();
                return shareResult;
            } catch (error) {
                // User cancelled or share failed
                if ((error as Error).name !== 'AbortError') {
                    console.error('Share failed:', error);

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

            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Copy failed:', error);
            console.error('Failed to copy link');
        }
    };

    const handleWhatsAppShare = async () => {
        try {
            const { Capacitor } = await import('@capacitor/core');
            const isNative = Capacitor.isNativePlatform();

            // Use native deep link on mobile platforms to open WhatsApp directly
            // whatsapp:// scheme opens the app directly, while https://wa.me opens the web version
            const whatsappUrl = isNative
                ? `whatsapp://send?text=${encodeURIComponent(shareText)}`
                : `https://wa.me/?text=${encodeURIComponent(shareText)}`;

            if (isNative) {
                // On native, use window.location to trigger the deep link
                window.location.href = whatsappUrl;
            } else {
                await openUrl(whatsappUrl);
            }

        } catch (e) {
            // Fallback to web URL if something goes wrong
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
            await openUrl(whatsappUrl);

        }
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

            handleClose();
        } catch (error) {
            console.error('Failed to send notifications:', error);
            console.error('Failed to share with friends');
        } finally {
            setSending(false);
        }
    };

    const handleShareFile = async (platform: 'whatsapp' | 'other' = 'other') => {
        if (!videoUrl) return;


        let fileBlob: Blob | null = null;
        let isNative = false;

        try {
            const { Capacitor } = await import('@capacitor/core');
            isNative = Capacitor.isNativePlatform();

            let fileUri = savedFilePath;

            // If we don't have a URI (native) or just need the blob (web), fetch it
            if (!fileUri || !isNative) {
                const response = await fetch(videoUrl);
                fileBlob = await response.blob();
            }

            if (isNative) {
                if (!fileUri) {
                    // Save to FS
                    const { Filesystem, Directory } = await import('@capacitor/filesystem');
                    const filename = `${story.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_weeve.mp4`;

                    const base64Data = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const res = reader.result as string;
                            resolve(res.split(',')[1]);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(fileBlob!);
                    });

                    const savedFile = await Filesystem.writeFile({
                        path: filename,
                        data: base64Data,
                        directory: Directory.Documents,
                        recursive: true
                    });
                    fileUri = savedFile.uri;
                    setSavedFilePath(fileUri);
                    // Don't set downloadComplete here to avoid changing UI state abruptly during share
                }

                // Share via Capacitor
                const { Share } = await import('@capacitor/share');
                await Share.share({
                    title: story.title,
                    text: `Check out "${story.title}" on Weeve! #weeve ${storyUrl}`,
                    url: fileUri,
                    dialogTitle: 'Share Video'
                });
            } else {
                // Web Share
                if (navigator.share && navigator.canShare) {
                    const filename = `${story.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_weeve.mp4`;
                    const file = new File([fileBlob!], filename, { type: 'video/mp4' });
                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: story.title,
                            text: `Check out "${story.title}" on Weeve! ${storyUrl}`
                        });
                    } else {
                        // Fallback to simpler download
                        throw new Error('Web Share API does not support files');
                    }
                } else {
                    throw new Error('Web Share API not supported');
                }
            }


        } catch (e: any) {
            console.error('Share failed', e);
            if (e.name !== 'AbortError') {

                // Fallback: If share fails (especially on web), trigger download
                if (!isNative && fileBlob) {

                    const downloadUrl = window.URL.createObjectURL(fileBlob);
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = `${story.title.replace(/[^a-z0-9]/gi, '_')}.mp4`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    return;
                }
                console.error('Could not share video');
            } else {

            }
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
            onClick={handleClose}
            role="presentation"
            onKeyDown={(e) => { if (e.key === 'Escape') handleClose(); }}
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
                    <h2 className="text-lg font-bold text-white">
                        {downloadComplete ? 'Video Saved!' : 'Share Story'}
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {false ? ( // Removing downloadComplete overlay
                    <div className="hidden" />
                ) : (
                    <>
                        {/* Content */}
                        <div className="shrink-0 overflow-y-auto max-h-[40vh]"> {/* Changed from flex-1 to shrink-0 and added max-h */}
                            {/* Send to Friends */}
                            <div className="p-4">
                                <h3 className="text-sm font-medium text-gray-400 mb-3">Send to Friends</h3>

                                <div className="flex items-center gap-3 mb-2"> {/* Reduced mb-4 to mb-2 */}
                                    <div className="relative flex-1">
                                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(event) => setSearchQuery(event.target.value)}
                                            placeholder="Search people..."
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
                                        className="shrink-0 w-11 h-11 rounded-xl bg-[#EC1D99] hover:bg-[#D41C84] disabled:bg-gray-700 disabled:text-gray-500 flex items-center justify-center transition-colors"
                                    >
                                        {sending ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Send className="w-5 h-5 text-white" />
                                        )}
                                    </button>
                                </div>

                                {searchQuery.trim().length >= 2 && !searching && recipientList.length === 0 && (
                                    <div className="text-center py-4 text-gray-500 text-sm"> {/* Reduced py-6 to py-4 */}
                                        No users found.
                                    </div>
                                )}

                                {recipientList.length === 0 && searchQuery.trim().length < 2 ? (
                                    <div className="text-center py-2 text-gray-500"> {/* Reduced py-8 to py-2 */}
                                        <p className="text-xs">No friends yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 pr-2 pb-1 mt-2">
                                        {recipientList.map(recipient => {
                                            const isSelected = selectedRecipients.has(recipient.id);
                                            return (
                                                <button
                                                    key={recipient.id}
                                                    onClick={() => toggleRecipientSelection(recipient)}
                                                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${isSelected
                                                        ? 'bg-[#EC1D99]/20 border-2 border-[#EC1D99]'
                                                        : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-800'
                                                        }`}
                                                >
                                                    <img
                                                        src={recipient.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${recipient.name}`}
                                                        alt={recipient.name}
                                                        className="w-8 h-8 rounded-full border border-gray-700"
                                                    />
                                                    <span className="text-white font-medium flex-1 text-left text-sm">{recipient.name}</span>
                                                    {recipient.isFriend === false && (
                                                        <span className="text-[10px] text-gray-400">Not friends</span>
                                                    )}
                                                    {isSelected && (
                                                        <div className="w-5 h-5 rounded-full bg-[#EC1D99] flex items-center justify-center">
                                                            <Check className="w-3 h-3 text-white" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                        {searching && (
                                            <div className="py-2 text-center text-gray-400 text-sm">Searching...</div>
                                        )}
                                    </div>
                                )}
                                <div className={`flex items-center justify-between text-xs text-gray-400 mt-1 mb-0 ${selectedCount > 0 || sending ? 'h-4' : 'h-0 overflow-hidden'} transition-all`}>
                                    <span>{selectedCount > 0 ? `${selectedCount} selected` : ''}</span>
                                    {sending && <span>Sending…</span>}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div
                            className="p-4 pt-5 border-t border-gray-800 bg-gray-900"
                            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 28px) + 16px)' }}
                        >
                            <div className="pb-3 flex flex-col gap-4">
                                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider text-center">
                                    Share to
                                </h3>
                                {/* Social Grid */}
                                <div className="grid grid-cols-4 gap-3">
                                    {/* WhatsApp */}
                                    <button
                                        onClick={async () => {
                                            if (videoUrl) {
                                                await handleShareFile('whatsapp');
                                            } else if (story.status === 'completed' && !downloadComplete) {
                                                // If video not ready but possible, maybe suggest downloading? 
                                                // For WA, links work well too.
                                                handleWhatsAppShare();
                                            } else {
                                                handleWhatsAppShare();
                                            }
                                        }}
                                        className="flex flex-col items-center gap-2 group"
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-[#25D366] flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
                                            <MessageCircle className="w-7 h-7 text-white fill-current" />
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-medium">WhatsApp</span>
                                    </button>

                                    {/* Instagram */}
                                    <button
                                        onClick={() => {
                                            if (videoUrl) {
                                                handleShareFile('other');
                                            } else {
                                                // Trigger Stitch if not ready
                                                if (stitchingState === 'idle' || stitchingState === 'error') {
                                                    stitchStory(story, { groupAvatarUrl: groupInfo?.avatar, groupName: groupInfo?.name });
                                                }
                                            }
                                        }}
                                        className="flex flex-col items-center gap-2 group"
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-bl from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
                                            <Instagram className="w-7 h-7 text-white" />
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-medium">Stories</span>
                                    </button>

                                    {/* TikTok */}
                                    <button
                                        onClick={() => {
                                            if (videoUrl) {
                                                handleShareFile('other');
                                            } else {
                                                if (stitchingState === 'idle' || stitchingState === 'error') {
                                                    stitchStory(story, { groupAvatarUrl: groupInfo?.avatar, groupName: groupInfo?.name });
                                                }
                                            }
                                        }}
                                        className="flex flex-col items-center gap-2 group"
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-black border border-gray-800 flex items-center justify-center shadow-lg group-active:scale-95 transition-transform relative overflow-hidden">
                                            {/* TikTok-ish aesthetic effect */}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-[#69C9D0]/20 to-[#EE1D52]/20 opacity-50"></div>
                                            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white relative z-10" fill="currentColor">
                                                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                            </svg>
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-medium">TikTok</span>
                                    </button>

                                    {/* Facebook */}
                                    <button
                                        onClick={() => {
                                            if (videoUrl) {
                                                handleShareFile('other');
                                            } else {
                                                // Facebook Link Share
                                                const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storyUrl)}`;
                                                openUrl(url);
                                            }
                                        }}
                                        className="flex flex-col items-center gap-2 group"
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-[#1877F2] flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
                                            <Facebook className="w-7 h-7 text-white fill-current" />
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-medium">Facebook</span>
                                    </button>
                                </div>

                                {/* Secondary Actions */}
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    {/* Brand Tools - High Quality Export */}
                                    {currentUser?.isBrand && currentUser?.id === story.creatorId && (
                                        <div className="col-span-2 mb-1">
                                            <button
                                                onClick={() => {
                                                    setIsHighQualityExport(true);
                                                    setLastAction('save');
                                                    stitchStory(story, { highQuality: true, groupAvatarUrl: groupInfo?.avatar, groupName: groupInfo?.name });
                                                }}
                                                disabled={stitchingState !== 'idle' && stitchingState !== 'error' && stitchingState !== 'complete'}
                                                className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-yellow-600 to-yellow-800 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                                            >
                                                <Download className="w-4 h-4 text-white" />
                                                <span className="text-xs font-bold text-white uppercase tracking-wider">Export High Quality 4K</span>
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleCopyLink}
                                        className="flex items-center justify-center gap-2 p-3 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-white" />}
                                        <span className={`text-xs font-medium ${copied ? 'text-green-500' : 'text-white'}`}>
                                            {copied ? 'Copied' : 'Copy Link'}
                                        </span>
                                    </button>

                                    {/* Download / Processing State */}
                                    {(() => {
                                        const isProcessing = stitchingState !== 'idle' && stitchingState !== 'complete' && stitchingState !== 'error';

                                        return (
                                            <div
                                                className="relative p-[3px] rounded-xl transition-all"
                                                style={isProcessing ? {
                                                    background: `conic-gradient(from 0deg, #EC1D99 ${progress * 3.6}deg, rgba(255,255,255,0.15) ${progress * 3.6}deg)`
                                                } : undefined}
                                            >
                                                <button
                                                    onClick={() => {
                                                        if (videoUrl) {
                                                            handleShareFile('other'); // "More"
                                                        } else {
                                                            setIsHighQualityExport(false);
                                                            setLastAction('save');
                                                            stitchStory(story, { groupAvatarUrl: groupInfo?.avatar, groupName: groupInfo?.name });
                                                        }
                                                    }}
                                                    disabled={isProcessing}
                                                    className={`flex items-center justify-center gap-2 p-3 rounded-[9px] transition-colors w-full ${isSaved ? 'bg-[#EC1D99] hover:bg-[#D41C84]' : 'bg-gray-800 hover:bg-gray-700'}`}
                                                >
                                                    {isProcessing ? (
                                                        <span className="text-sm font-bold text-[#EC1D99]">{Math.round(progress)}%</span>
                                                    ) : isSaved ? (
                                                        <>
                                                            <Check className="w-4 h-4 text-white" />
                                                            <span className="text-xs font-medium text-white">Saved</span>
                                                        </>
                                                    ) : videoUrl ? (
                                                        <>
                                                            <Share2 className="w-4 h-4 text-white" />
                                                            <span className="text-xs font-medium text-white">More Options</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Download className="w-4 h-4 text-white" />
                                                            <span className="text-xs font-medium text-white">Save Video</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })()}

                                    {/* Report */}
                                    <button
                                        onClick={() => {
                                            useStore.getState().reportStory(story.id);

                                            handleClose();
                                        }}
                                        className="flex items-center justify-center gap-2 p-3 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors"
                                    >
                                        <Flag className="w-4 h-4 text-white" />
                                        <span className="text-xs font-medium text-white">Report</span>
                                    </button>

                                    {/* Not Interested */}
                                    <button
                                        onClick={() => {

                                            handleClose();
                                        }}
                                        className="flex items-center justify-center gap-2 p-3 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors"
                                    >
                                        <Ban className="w-4 h-4 text-white" />
                                        <span className="text-xs font-medium text-white">Not Interested</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
