"use client";
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useStore, Group } from "@/lib/store";
import { useSearchParams } from 'next/navigation';
import Link from "next/link";
import { Search, TrendingUp, Sparkles, Clock, Users, Plus, X, Heart, Info, Zap, Clapperboard, Play, GitBranch, ChevronLeft } from "lucide-react";
import NotificationBell from "@/app/components/NotificationBell";
import { rankStories } from '@/lib/discovery/core';


import MediaWithFallback from "@/app/components/MediaWithFallback";
import VerificationBadge from "@/app/components/VerificationBadge";
import FeedItem from "@/app/components/FeedItem";
import { searchUsers, fetchPublicUsers, sendFriendRequest, Friend as FriendType } from '@/lib/friends';

import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Story } from '@/lib/store';

// Discovery Feed Overlay - TikTok-style full-screen scrollable feed
interface DiscoveryFeedOverlayProps {
    stories: Story[];
    initialIndex: number;
    onClose: () => void;
}

function DiscoveryFeedOverlay({ stories, initialIndex, onClose }: DiscoveryFeedOverlayProps) {
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const containerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    // Auto-scroll to initial story on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            const el = itemRefs.current.get(initialIndex);
            if (el && containerRef.current) {
                el.scrollIntoView({ behavior: 'instant', block: 'start' });
            }
        }, 50);
        return () => clearTimeout(timer);
    }, [initialIndex]);

    // Intersection observer to track active index
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const idx = Number((entry.target as HTMLElement).dataset.index);
                        if (!Number.isNaN(idx)) setActiveIndex(idx);
                    }
                });
            },
            { threshold: 0.6 }
        );

        for (const el of itemRefs.current.values()) {
            observer.observe(el);
        }

        return () => observer.disconnect();
    }, [stories.length]);

    // Custom scroll handling for snap behavior - matches home feed smoothness
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let isScrolling = false;
        let lastWheelTime = 0;
        let touchStartY = 0;
        let touchStartTime = 0;

        const activeIndexRef = { current: activeIndex } as { current: number };

        // Keep activeIndexRef synced
        activeIndexRef.current = activeIndex;

        // Custom easing function for smooth deceleration (ease-out-cubic)
        const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

        // Custom smooth scroll using requestAnimationFrame for consistent behavior
        const smoothScrollTo = (targetY: number, duration: number = 400, onComplete?: () => void) => {
            const startY = container.scrollTop;
            const distance = targetY - startY;
            const startTime = performance.now();

            // Temporarily disable scroll-snap to prevent it from interfering
            const originalSnapType = container.style.scrollSnapType;
            container.style.scrollSnapType = 'none';

            const animateScroll = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = easeOutCubic(progress);

                container.scrollTop = startY + (distance * easedProgress);

                if (progress < 1) {
                    requestAnimationFrame(animateScroll);
                } else {
                    // Ensure we land exactly on target
                    container.scrollTop = targetY;
                    // Re-enable scroll-snap after animation completes
                    container.style.scrollSnapType = originalSnapType || 'y mandatory';
                    setTimeout(() => {
                        isScrolling = false;
                        if (onComplete) onComplete();
                    }, 50);
                }
            };

            requestAnimationFrame(animateScroll);
        };

        const scrollTo = (idx: number) => {
            const el = itemRefs.current.get(idx);
            if (!el || !container) return;
            isScrolling = true;

            // Calculate target scroll position
            const targetY = el.offsetTop;

            // Check if we're scrolling to the clone (last item which is copy of first)
            const isClone = idx === stories.length;

            smoothScrollTo(targetY, 450, () => {
                // If we scrolled to the clone, instantly reset to the real first item
                if (isClone) {
                    container.scrollTop = 0;
                    activeIndexRef.current = 0;
                    // Don't trigger state update here if unnecessary, but we might need to sync UI
                }
            });
        };

        const wheelHandler = (e: WheelEvent) => {
            if (isScrolling) {
                e.preventDefault();
                return;
            }

            const now = Date.now();
            if (now - lastWheelTime < 120) {
                // throttle rapid wheel events to a single action
                e.preventDefault();
                return;
            }

            lastWheelTime = now;
            const delta = e.deltaY;
            if (Math.abs(delta) < 10) return;

            e.preventDefault();
            const dir = delta > 0 ? 1 : -1;

            // Seamless Loop Logic
            let nextIndex = activeIndexRef.current + dir;

            // Handle Wrap:
            // If going past end (L-1 -> L), allow it (to scroll to clone)
            // If going before start (0 -> -1), strict wrap (fast rewind) for now, or use clone logic if bidirectional implemented

            if (nextIndex >= stories.length) {
                // Going past end -> Scroll to Clone (index = length)
                nextIndex = stories.length;
            } else if (nextIndex < 0) {
                // Scrolling up from top -> Wrap to bottom (Fast Rewind)
                nextIndex = stories.length - 1;
            }

            if (nextIndex !== activeIndexRef.current) {
                activeIndexRef.current = nextIndex; // Optimistic update
                scrollTo(nextIndex);
            }
        };

        const touchStart = (e: TouchEvent) => {
            if (e.touches && e.touches[0]) {
                touchStartY = e.touches[0].clientY;
                touchStartTime = Date.now();
            }
        };

        // Prevent native scrolling during touch - we handle it ourselves
        // But allow interaction with buttons, links, and other interactive elements
        const touchMove = (e: TouchEvent) => {
            const target = e.target as HTMLElement;
            // Check if target or any parent is an interactive element
            const isInteractive = target.closest('button, a, input, textarea, [role="button"]');
            if (!isInteractive) {
                e.preventDefault();
            }
        };

        const touchEnd = (e: TouchEvent) => {
            if (isScrolling) return;
            const touch = e.changedTouches && e.changedTouches[0];
            if (!touch) return;
            const dy = touchStartY - touch.clientY;
            const dt = Date.now() - touchStartTime;
            const velocity = Math.abs(dy / Math.max(1, dt));

            // Threshold distance of 50px or velocity of 0.3 qualifies as a swipe
            if (Math.abs(dy) < 50 && velocity < 0.3) {
                // not a confident swipe — stay on current index (no snap-back animation needed)
                return;
            }

            const dir = dy > 0 ? 1 : -1;

            // Seamless Loop Logic matches wheel handler
            let nextIndex = activeIndexRef.current + dir;

            if (nextIndex >= stories.length) {
                nextIndex = stories.length;
            } else if (nextIndex < 0) {
                nextIndex = stories.length - 1;
            }

            if (nextIndex !== activeIndexRef.current) {
                activeIndexRef.current = nextIndex;
                scrollTo(nextIndex);
            }
        };

        // Add listeners with passive:false to allow preventDefault
        container.addEventListener('wheel', wheelHandler, { passive: false });
        container.addEventListener('touchstart', touchStart, { passive: true });
        container.addEventListener('touchmove', touchMove, { passive: false });
        container.addEventListener('touchend', touchEnd, { passive: true });

        return () => {
            container.removeEventListener('wheel', wheelHandler);
            container.removeEventListener('touchstart', touchStart);
            container.removeEventListener('touchmove', touchMove);
            container.removeEventListener('touchend', touchEnd);
        };
    }, [stories.length, activeIndex]);

    // Prevent body scroll when overlay is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 bg-black" style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 left-4 z-[60] p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
                style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
            >
                <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Scrollable feed container */}
            <div
                ref={containerRef}
                className="h-full w-full overflow-hidden scrollbar-hide"
            >
                {stories.map((story, index) => (
                    <div
                        key={story.id}
                        ref={(el) => {
                            if (el) itemRefs.current.set(index, el);
                            else itemRefs.current.delete(index);
                        }}
                        className="h-full w-full shrink-0"
                        data-index={index}
                    >
                        {/* 
                           Render condition: 
                           1. Standard proximity check (current index +/- 1)
                           2. Edge case: If at Clone (length), render Real 0 (index 0) so it's ready for jump
                        */}
                        {Math.abs(index - activeIndex) <= 1 || (activeIndex === stories.length && index === 0) ? (
                            <FeedItem story={story} isActive={index === activeIndex} />
                        ) : (
                            <div className="h-full w-full bg-black" />
                        )}
                    </div>
                ))}

                {/* Clone of First Story for Seamless Loop */}
                {stories.length > 0 && (
                    <div
                        key="seamless-clone-first"
                        ref={(el) => {
                            if (el) itemRefs.current.set(stories.length, el);
                            else itemRefs.current.delete(stories.length);
                        }}
                        className="h-full w-full shrink-0"
                        data-index={stories.length}
                    >
                        {/* 
                            Logic for visibility/playback of clone:
                            It should be active ONLY if we are physically at the clone index (stories.length)
                        */}
                        <FeedItem
                            story={stories[0]}
                            isActive={activeIndex === stories.length}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

function DiscoverContent() {
    const { stories, groups, addGroup, currentUser, friends, blockedUserIds } = useStore();
    const searchParams = useSearchParams();
    const tabParam = searchParams?.get('tab');
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'all' | 'groups' | 'people'>(tabParam === 'groups' ? 'groups' : 'all');
    const [feedType, setFeedType] = useState<'forYou' | 'trending' | 'new' | 'friends' | 'seeds' | 'canon'>('forYou');
    const [showFeedInfo, setShowFeedInfo] = useState(false);

    // Discovery Feed Overlay state - for TikTok-style infinite scroll
    const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);

    const [peopleResults, setPeopleResults] = useState<FriendType[]>([]);
    const [isSearchingPeople, setIsSearchingPeople] = useState(false);

    // Set of friend IDs for quick lookup
    const friendIds = new Set((friends || []).map(f => f.id));
    const userGroupIds = new Set((groups || []).map(g => g.id));

    // Ranking algorithms
    const getForYouScore = (story: typeof stories[0]) => {
        let score = 0;

        // Friend bonus (+50 for each friend participant)
        story.participants.forEach(p => {
            if (friendIds.has(p.id)) score += 50;
        });

        // Group bonus (+30 if in user's groups)
        if (story.groupId && userGroupIds.has(story.groupId)) score += 30;

        // Engagement signals
        score += (story.likes || 0) * 2;
        score += (story.comments?.length || 0) * 3;
        score += (story.participants?.length || 0) * 1.5;

        // Recency boost (decay over 7 days)
        const createdAt = story.created_at ? new Date(story.created_at).getTime() : Date.now();
        const ageHours = (Date.now() - createdAt) / 3600000;
        const recencyMultiplier = Math.max(0.3, 1 - (ageHours / 168));

        return score * recencyMultiplier;
    };

    const getTrendingScore = (story: typeof stories[0]) => {
        const likes = story.likes || 0;
        const comments = story.comments?.length || 0;
        const participants = story.participants?.length || 0;

        const engagementScore = likes + (comments * 2) + (participants * 1.5);

        // Time decay (24h half-life)
        const createdAt = story.created_at ? new Date(story.created_at).getTime() : Date.now();
        const ageHours = (Date.now() - createdAt) / 3600000;
        const decay = Math.pow(0.5, ageHours / 24);

        return engagementScore * (1 + decay);
    };

    // Filter out private stories and incomplete stories for public discovery
    // Private stories should only be shown to their creator/participants, not on the discover feed
    // Hybrid workflow for public stories:
    // - If story has only creator (no invited friends): show after creator adds contribution
    // - If story has invited friends (reserved slots): show after ALL reserved slots are filled
    const publicStories = stories.filter(story => {
        // Must be public visibility
        if (story.visibility !== 'public') return false;
        // Must have at least one contribution (completed content)
        if (!story.contributions || story.contributions.length === 0) return false;

        // Check if this is a public story with reserved slots (invited friends)
        // Reserved slots are participants who are NOT the creator
        const reservedParticipants = story.participants.filter(p => p.id !== story.creatorId);

        if (reservedParticipants.length > 0) {
            // Has reserved slots - check if ALL reserved participants have contributed
            const contributorIds = new Set(story.contributions.map(c => c.userId));
            const allReservedFilled = reservedParticipants.every(p => contributorIds.has(p.id));
            if (!allReservedFilled) {
                // Reserved slots not all filled - don't show on discover yet
                return false;
            }
        }
        // Either no reserved slots, or all reserved slots are filled
        return true;
    });

    // Compute trending stories for the top carousel
    const trendingStories = [...publicStories]
        .sort((a, b) => getTrendingScore(b) - getTrendingScore(a))
        .slice(0, 6);

    // Update view mode when URL param changes
    useEffect(() => {
        if (tabParam === 'groups') {
            setViewMode('groups');
        }
    }, [tabParam]);

    // Fetch people matches when in People view or when searchQuery changes
    useEffect(() => {
        let mounted = true;
        const timeout = setTimeout(async () => {
            const q = searchQuery.trim();

            setIsSearchingPeople(true);
            try {
                const uid = currentUser?.id ?? '';
                let results: FriendType[] = [];

                if (!q || q.length < 2) {
                    // No search term -> show public (non-private) users
                    results = await fetchPublicUsers(uid);
                } else {
                    // Attempt a targeted search; fall back to public users if nothing found
                    results = await searchUsers(q, uid);
                    if (!results || results.length === 0) {
                        results = await fetchPublicUsers(uid);
                    }
                }

                if (mounted) {
                    // Filter out blocked users
                    const filteredResults = results.filter(user => !blockedUserIds.includes(user.id));
                    setPeopleResults(filteredResults);
                }
            } catch (err) {
                console.warn('[Discover] searchUsers/fetchPublicUsers failed', err);
                if (mounted) setPeopleResults([]);
            } finally {
                setIsSearchingPeople(false);
            }
        }, 300);
        return () => { mounted = false; clearTimeout(timeout); };
    }, [searchQuery, viewMode, currentUser]);

    // Filter and sort stories based on search query and feed type
    // Start with publicStories (already filtered for visibility and contributions)
    const filteredStories = (() => {
        // Filter by search query if provided
        let filtered = publicStories.filter(story => {
            if (!searchQuery.trim()) return true;

            const query = searchQuery.toLowerCase();

            // Search in title
            if (story.title.toLowerCase().includes(query)) return true;

            // Search in description
            if (story.description.toLowerCase().includes(query)) return true;

            // Search in hashtags
            if (story.hashtags?.some(tag => tag.toLowerCase().includes(query))) return true;

            // Search in participant names, but ignore private participants
            const participantMatches = story.participants.some(p => {
                const allowed = !p.isPrivate || (currentUser && (p.id === currentUser.id || friendIds.has(p.id)));
                const notBlocked = !blockedUserIds.includes(p.id);
                return allowed && notBlocked && p.name.toLowerCase().includes(query);
            });
            if (participantMatches) return true;

            // Search in group name
            if (story.groupId) {
                const group = groups.find(g => g.id === story.groupId);
                if (group && group.name.toLowerCase().includes(query)) return true;
            }

            return false;
        });

        // Apply feed type filter and sorting
        switch (feedType) {
            case 'forYou':
                return [...filtered].sort((a, b) => getForYouScore(b) - getForYouScore(a));

            case 'trending':
                return [...filtered].sort((a, b) => getTrendingScore(b) - getTrendingScore(a));

            case 'new':
                return [...filtered].sort((a, b) => {
                    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return dateB - dateA;
                });

            case 'friends':
                // Only show stories where at least one participant is a friend
                const friendStories = filtered.filter(story =>
                    story.participants.some(p => friendIds.has(p.id))
                );
                return [...friendStories].sort((a, b) => {
                    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return dateB - dateA;
                });

            case 'seeds':
                // Use discovery algorithm for Seed posts
                if (!currentUser) return [];
                const rankedSeeds = rankStories(
                    filtered,
                    currentUser,
                    { variant: 'seed', diversityMode: true, limit: 100 },
                    friends || []
                );
                return rankedSeeds.map(r => r.story);

            case 'canon':
                // Use discovery algorithm for Canon posts  
                if (!currentUser) return [];
                const rankedCanon = rankStories(
                    filtered,
                    currentUser,
                    { variant: 'canon', diversityMode: true, limit: 100 },
                    friends || []
                );
                return rankedCanon.map(r => r.story);

            default:
                return filtered;
        }
    })();

    // Get stories that belong to groups for the Groups tab
    const groupStories = filteredStories.filter(story => story.groupId);

    // Helper to open any story in the overlay feed
    // Finds the story's index in filteredStories, or opens directly if not found
    const openStoryInOverlay = useCallback((storyId: string) => {
        const idx = filteredStories.findIndex(s => s.id === storyId);
        if (idx !== -1) {
            setSelectedStoryIndex(idx);
        } else {
            // Story not in current filtered list - navigate to story page
            window.location.href = `/story/${storyId}`;
        }
    }, [filteredStories]);

    // Restore story position when returning from story/timeline page
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const returnToStoryId = sessionStorage.getItem('weeve_return_to_story');
        if (returnToStoryId && filteredStories.length > 0) {
            // Clear the stored ID so we don't keep reopening
            sessionStorage.removeItem('weeve_return_to_story');

            // Find the story in the filtered list and open it
            const idx = filteredStories.findIndex(s => s.id === returnToStoryId);
            if (idx !== -1) {
                // Small delay to ensure component is mounted
                setTimeout(() => {
                    setSelectedStoryIndex(idx);
                }, 100);
            }
        }
    }, [filteredStories]);

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim() || !currentUser) return;

        setCreating(true);
        try {
            const { data: groupData, error: groupError } = await supabase
                .from('groups')
                .insert({
                    name: newGroupName,
                    description: newGroupDesc,
                    avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${newGroupName}`,
                    is_private: isPrivate,
                    owner_id: currentUser.id,
                    member_count: 1
                })
                .select()
                .single();

            if (groupError) throw groupError;

            const { error: memberError } = await supabase
                .from('group_members')
                .insert({
                    group_id: groupData.id,
                    user_id: currentUser.id,
                    role: 'admin'
                });

            if (memberError) throw memberError;

            // Update local store for immediate feedback
            const newGroup: Group = {
                id: groupData.id,
                name: groupData.name,
                description: groupData.description || '',
                avatar: groupData.avatar || '',
                memberCount: 1,
                isPrivate: groupData.is_private,
                isMember: true,
                ownerIsVerified: currentUser.isVerified || currentUser.isBrand,
                ownerVerificationTier: currentUser.verificationTier || (currentUser.isBrand ? 'gold' : null)
            };
            addGroup(newGroup);

            toast.success('Group created successfully!');
            setShowCreateGroup(false);
            setNewGroupName('');
            setNewGroupDesc('');
            setIsPrivate(false);
        } catch (error) {
            console.error('Error creating group:', error);
            toast.error('Failed to create group');
        } finally {
            setCreating(false);
        }
    };

    const handleSendFriendRequest = async (personId: string) => {
        if (!currentUser) return;
        try {
            const success = await sendFriendRequest(currentUser.id, personId);
            if (success) {
                setPeopleResults(prev => prev.map(p => p.id === personId ? { ...p, friendRequestStatus: 'pending_sent' } : p));
            }
        } catch (err) {
            console.warn('[Discover] sendFriendRequest failed', err);
        }
    };


    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Search Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md py-2 px-4 mb-2">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search stories, people, tags..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-800 rounded-full py-3 pl-10 pr-4 text-base focus:outline-none focus:border-[#EC1D99] focus:ring-1 focus:ring-[#EC1D99]/30 transition-all"
                        />
                    </div>
                    {currentUser && (
                        <NotificationBell
                            userId={currentUser.id}
                            className="bg-gray-900/80 border border-gray-800"
                            badgeClassName="bg-[#EC1D99]"
                        />
                    )}
                </div>
            </div>

            {/* View Tabs */}
            <div className="flex items-center gap-6 px-2 border-b border-gray-800 mb-4 overflow-x-auto">
                <button
                    onClick={() => setViewMode('all')}
                    className={`pb-3 text-sm font-medium transition-all relative ${viewMode === 'all' ? 'text-white' : 'text-gray-400 hover:text-gray-300'}`}
                >
                    Stories
                    {viewMode === 'all' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EC1D99] rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setViewMode('groups')}
                    className={`pb-3 text-sm font-medium transition-all relative ${viewMode === 'groups' ? 'text-white' : 'text-gray-400 hover:text-gray-300'}`}
                >
                    Groups
                    {viewMode === 'groups' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EC1D99] rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setViewMode('people')}
                    className={`pb-3 text-sm font-medium transition-all relative ${viewMode === 'people' ? 'text-white' : 'text-gray-400 hover:text-gray-300'}`}
                >
                    People
                    {viewMode === 'people' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EC1D99] rounded-t-full" />
                    )}
                </button>
            </div>

            {/* Feed Type Filter Chips - Only show in Stories view */}
            {viewMode === 'all' && !searchQuery.trim() && (
                <div className="flex gap-2 pb-4 overflow-x-auto scrollbar-hide px-4">
                    {[
                        { id: 'forYou', label: 'For You', icon: Sparkles },
                        { id: 'trending', label: 'Trending', icon: TrendingUp },
                        { id: 'new', label: 'New', icon: Clock },
                        { id: 'friends', label: 'Friends', icon: Heart },
                        { id: 'seeds', label: '🌱 Seeds', icon: null },
                        { id: 'canon', label: '🎬 Canon', icon: null },
                    ].map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setFeedType(id as typeof feedType)}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${feedType === id
                                ? 'bg-[#EC1D99] text-white shadow-lg shadow-[#EC1D99]/30'
                                : 'bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-700 hover:text-white'
                                }`}
                        >
                            {Icon && <Icon className="w-3.5 h-3.5" />}
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {/* Content Area */}
            {viewMode === 'groups' ? (
                <div className="space-y-4 px-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Group Stories</h2>
                        <button
                            onClick={() => setShowCreateGroup(true)}
                            className="flex items-center gap-1 text-sm bg-[#EC1D99] px-3 py-1.5 rounded-full hover:bg-[#d61a88] transition-colors shadow-lg shadow-[#EC1D99]/20"
                        >
                            <Plus className="w-4 h-4" />
                            Create Group
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {groupStories.length > 0 ? (
                            groupStories.map((story, idx) => {
                                const group = groups.find(g => g.id === story.groupId);
                                return (
                                    <div
                                        key={story.id}
                                        onClick={() => openStoryInOverlay(story.id)}
                                        className={`relative rounded-xl overflow-hidden group/card cursor-pointer ${idx % 3 === 0 ? 'row-span-2 aspect-[9/16]' : 'aspect-square'}`}
                                    >
                                        <MediaWithFallback
                                            src={story.coverImage || story.contributions[0]?.mediaUrl}
                                            alt={story.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                                        />
                                        {story.forkedFromStoryId && (
                                            <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-sm p-1.5 rounded-full border border-white/10">
                                                <GitBranch className="w-3 h-3 text-[#EC1D99]" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                                            {group && (
                                                <div className="flex items-center gap-1.5 mb-2 bg-black/40 backdrop-blur-sm p-1.5 rounded-full w-fit max-w-[90%]">
                                                    <MediaWithFallback
                                                        src={group.avatar}
                                                        alt={group.name}
                                                        className="w-4 h-4 rounded-full border border-white/20"
                                                    />
                                                    <span className="text-[10px] font-medium text-white/90 truncate">{group.name}</span>
                                                </div>
                                            )}
                                            <h3 className="font-bold text-sm line-clamp-2 mb-1">{story.title}</h3>
                                            <div className="flex items-center gap-1 text-xs text-gray-300">
                                                <Users className="w-3 h-3" />
                                                <span>{story.participants.length}</span>
                                            </div>
                                        </div>
                                        {/* Hover overlay with pink glow */}
                                        <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-xl group-hover/card:ring-[#EC1D99]/50 group-hover/card:shadow-lg group-hover/card:shadow-[#EC1D99]/20 transition-all duration-300" />
                                    </div>
                                );
                            })
                        ) : (
                            <div className="col-span-2 space-y-6">
                                {filteredStories.filter(s => s.groupId).length === 0 && (
                                    <>
                                        {/* Your Groups Section - Only if user has groups and no specific search preventing matches (though search logic applies to filteredGroups below too) */}
                                        {currentUser && groups.some(g => userGroupIds.has(g.id)) && (
                                            <div className="space-y-3">
                                                <h3 className="text-sm font-bold text-gray-400">Your Groups</h3>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {groups
                                                        .filter(g => userGroupIds.has(g.id) && g.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                                        .slice(0, 4)
                                                        .map(group => (
                                                            <Link
                                                                key={group.id}
                                                                href={`/groups/${group.id}`}
                                                                className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col items-center text-center gap-2 hover:border-[#EC1D99]/50 hover:shadow-lg hover:shadow-[#EC1D99]/5 transition-all"
                                                            >
                                                                <MediaWithFallback
                                                                    src={group.avatar}
                                                                    alt={group.name}
                                                                    className="w-12 h-12 rounded-full bg-gray-800 ring-2 ring-gray-800"
                                                                />
                                                                <div>
                                                                    <div className="flex items-center gap-1">
                                                                        <h4 className="font-bold text-sm line-clamp-1">{group.name}</h4>
                                                                        {group.ownerIsVerified && (
                                                                            <VerificationBadge isVerified={true} tier={group.ownerVerificationTier} size="sm" />
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[10px] text-gray-500">{group.memberCount} members</p>
                                                                </div>
                                                            </Link>
                                                        ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Public Groups / Discover Groups Section */}
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-bold text-gray-400">Discover Groups</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {groups
                                                    .filter(g => !g.isPrivate && (!currentUser || !userGroupIds.has(g.id)) && g.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                                    .sort((a, b) => b.memberCount - a.memberCount)
                                                    .slice(0, 10) // Show more suggestions
                                                    .map(group => (
                                                        <Link
                                                            key={group.id}
                                                            href={`/groups/${group.id}`}
                                                            className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col items-center text-center gap-2 hover:border-[#EC1D99]/50 hover:shadow-lg hover:shadow-[#EC1D99]/5 transition-all"
                                                        >
                                                            <MediaWithFallback
                                                                src={group.avatar}
                                                                alt={group.name}
                                                                className="w-12 h-12 rounded-full bg-gray-800 ring-2 ring-gray-800"
                                                            />
                                                            <div>
                                                                <div className="flex items-center gap-1">
                                                                    <h4 className="font-bold text-sm line-clamp-1">{group.name}</h4>
                                                                    {group.ownerIsVerified && (
                                                                        <VerificationBadge isVerified={true} tier={group.ownerVerificationTier} size="sm" />
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] text-gray-500">{group.memberCount} members</p>
                                                            </div>
                                                            <span className="text-[10px] font-medium text-[#EC1D99] bg-[#EC1D99]/10 border border-[#EC1D99]/20 px-2 py-0.5 rounded-full mt-1">
                                                                Join
                                                            </span>
                                                        </Link>
                                                    ))}
                                            </div>
                                            {groups.filter(g => !g.isPrivate && g.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                                <div className="text-center py-8">
                                                    <p className="text-gray-500 text-sm">No groups found.</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-center pt-4">
                                            <p className="text-gray-400 text-sm mb-2">Can't find what you're looking for?</p>
                                            <button
                                                onClick={() => setShowCreateGroup(true)}
                                                className="text-[#EC1D99] text-sm font-medium hover:underline"
                                            >
                                                Start your own group →
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : viewMode === 'people' ? (
                <div className="space-y-4 px-4">
                    <div className="mb-4 grid grid-cols-1 gap-3">
                        {isSearchingPeople ? (
                            <div className="flex items-center justify-center py-8 gap-3">
                                <div className="w-5 h-5 border-2 border-[#EC1D99] border-t-transparent rounded-full animate-spin" />
                                <span className="text-gray-400">Searching...</span>
                            </div>
                        ) : (peopleResults.length > 0 ? (
                            peopleResults.map((person) => (
                                <div key={person.id} className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:border-[#EC1D99]/50 hover:shadow-lg hover:shadow-[#EC1D99]/5 transition-all duration-200 cursor-pointer">
                                    <Link href={`/profile/${person.id}`} className="flex items-center gap-4 flex-1">
                                        <MediaWithFallback
                                            src={person.avatar}
                                            alt={person.name}
                                            className="w-12 h-12 rounded-full bg-gray-800 ring-2 ring-gray-800"
                                        />
                                        <div className="flex-1">
                                            <h3 className="font-bold text-base">{person.name}</h3>
                                            {person.tagline && <p className="text-xs text-gray-400 line-clamp-1">{person.tagline}</p>}
                                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                {person.isFriend ? <span className="bg-gray-800 px-1.5 rounded text-[10px]">Friend</span> : null}
                                            </div>
                                        </div>
                                    </Link>
                                    {person.isFriend ? (
                                        <div className="text-xs font-medium text-gray-300 border border-gray-700 px-3 py-1 rounded-full">Friends</div>
                                    ) : person.friendRequestStatus === 'none' ? (
                                        <button onClick={(e) => { e.stopPropagation(); handleSendFriendRequest(person.id); }} className="text-xs font-medium text-[#EC1D99] border border-[#EC1D99] px-3 py-1 rounded-full hover:bg-[#EC1D99] hover:text-white transition-colors">Add Friend</button>
                                    ) : person.friendRequestStatus === 'pending_sent' ? (
                                        <div className="text-xs font-medium text-[#EC1D99] border border-[#EC1D99]/50 px-3 py-1 rounded-full bg-[#EC1D99]/10">Requested</div>
                                    ) : (
                                        <div className="text-xs font-medium text-gray-500 border border-gray-700 px-3 py-1 rounded-full">Pending</div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 space-y-3">
                                <Users className="w-12 h-12 text-gray-700 mx-auto" />
                                <p className="text-gray-400">No people found</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-6 px-4">


                    {/* Featured Seeds Carousel - ONLY in 'For You' or 'Trending' to drive discovery */}
                    {!searchQuery.trim() && (feedType === 'forYou' || feedType === 'trending') && (
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="bg-gradient-to-r from-[#EC1D99] to-purple-500 text-transparent bg-clip-text text-lg font-bold">
                                    🌱 Featured Seeds
                                </span>
                            </div>

                            {/* Filter for Seed posts that are active */}
                            {stories.filter(s => s.postType === 'seed' && s.status === 'active' && s.contributions && s.contributions.length > 0).length > 0 ? (
                                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                                    {stories
                                        .filter(s => s.postType === 'seed' && s.status === 'active' && s.contributions && s.contributions.length > 0)
                                        // Sort by recency and remaining slots
                                        .sort((a, b) => {
                                            const dateA = new Date(a.created_at || 0).getTime();
                                            const dateB = new Date(b.created_at || 0).getTime();
                                            return dateB - dateA;
                                        })
                                        .slice(0, 10)
                                        .map((story) => (
                                            <div
                                                key={story.id}
                                                onClick={() => openStoryInOverlay(story.id)}
                                                className="relative flex-shrink-0 w-64 aspect-[16/9] rounded-2xl overflow-hidden group shadow-lg shadow-black/50 border border-white/10 hover:border-[#EC1D99]/50 transition-all cursor-pointer"
                                            >
                                                <MediaWithFallback
                                                    src={story.coverImage || story.contributions[0]?.mediaUrl}
                                                    alt={story.title}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                                                {/* Brand Badge */}
                                                <div className="absolute top-3 left-3 flex items-center gap-2">
                                                    <div className="bg-black/60 backdrop-blur-md rounded-full pl-1 pr-2 py-1 flex items-center gap-1 border border-white/10">
                                                        <MediaWithFallback
                                                            src={story.groupAvatar || story.participants[0]?.avatar}
                                                            className="w-4 h-4 rounded-full"
                                                        />
                                                        <span className="text-[10px] font-bold text-white/90 truncate max-w-[80px]">
                                                            {story.participants[0]?.name || 'Brand'}
                                                        </span>
                                                        <VerificationBadge isVerified={true} tier="gold" size="sm" />
                                                    </div>
                                                </div>

                                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                                    <h3 className="font-bold text-base mb-1 leading-tight group-hover:text-[#EC1D99] transition-colors">
                                                        {story.title}
                                                    </h3>
                                                    <div className="flex items-center justify-between text-xs mt-2">
                                                        <span className="text-gray-300 bg-black/50 px-2 py-1 rounded-md backdrop-blur-sm">
                                                            {(story.maxWeeves || 0) - (story.contributions?.length || 0)} slots left
                                                        </span>
                                                        <span className="text-[#EC1D99] font-medium flex items-center gap-1">
                                                            Join <Zap className="w-3 h-3" />
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Hover border effect */}
                                                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl group-hover:ring-[#EC1D99] transition-all duration-300" />
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <div className="bg-gray-900/50 border border-dashed border-gray-800 rounded-xl p-6 text-center mx-4">
                                    <p className="text-gray-500 text-sm">No active seeds right now. Check back soon!</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Trending Stories Section */}
                    {!searchQuery.trim() && trendingStories.length > 0 && (
                        <div className="mb-2">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="w-5 h-5 text-[#EC1D99]" />
                                <h2 className="text-lg font-bold">Trending</h2>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                                {trendingStories.map((story) => (
                                    <div
                                        key={story.id}
                                        onClick={() => openStoryInOverlay(story.id)}
                                        className="relative flex-shrink-0 w-36 aspect-[9/14] rounded-2xl overflow-hidden group cursor-pointer"
                                    >
                                        <MediaWithFallback
                                            src={story.coverImage || story.contributions[0]?.mediaUrl}
                                            alt={story.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        {story.forkedFromStoryId && (
                                            <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-sm p-1.5 rounded-full border border-white/10">
                                                <GitBranch className="w-3 h-3 text-[#EC1D99]" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl group-hover:ring-[#EC1D99]/50 transition-all" />
                                        <div className="absolute bottom-0 left-0 right-0 p-3">
                                            <h3 className="font-bold text-xs line-clamp-2 mb-1">{story.title}</h3>
                                            <div className="flex items-center gap-1 text-[10px] text-gray-300">
                                                <div className="flex -space-x-1">
                                                    {story.participants.slice(0, 2).map(p => (
                                                        <MediaWithFallback
                                                            key={`${p.id}-${p.position}`}
                                                            src={p.avatar}
                                                            className="w-3 h-3 rounded-full border border-black"
                                                        />
                                                    ))}
                                                </div>
                                                <span>{story.participants.length}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Featured Canons Section - ONLY in 'For You' or 'Trending' */}
                    {!searchQuery.trim() && (feedType === 'forYou' || feedType === 'trending') && (
                        <div className="mb-8 mt-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Clapperboard className="w-5 h-5 text-amber-400" />
                                <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-transparent bg-clip-text text-lg font-bold">
                                    Canon Remixes
                                </span>
                                <span className="text-[10px] bg-amber-500/10 px-2 py-0.5 rounded-full text-amber-300 border border-amber-500/20">
                                    Watch & Fork
                                </span>
                            </div>

                            {stories.some(s => s.postType === 'canon' && s.status === 'active' && s.contributions && s.contributions.length > 0) ? (
                                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                                    {stories
                                        .filter(s => s.postType === 'canon' && s.status === 'active' && s.contributions && s.contributions.length > 0)
                                        .sort((a, b) => (b.likes || 0) - (a.likes || 0)) // Sort Canons by popularity
                                        .slice(0, 10)
                                        .map((story) => (
                                            <div
                                                key={story.id}
                                                onClick={() => openStoryInOverlay(story.id)}
                                                className="relative flex-shrink-0 w-72 aspect-video rounded-2xl overflow-hidden group shadow-lg shadow-black/50 border border-amber-500/20 hover:border-amber-500/60 transition-all cursor-pointer"
                                            >
                                                <MediaWithFallback
                                                    src={story.coverImage || story.contributions[0]?.mediaUrl}
                                                    alt={story.title}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                                                {/* Play Button Overlay */}
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <div className="w-12 h-12 bg-amber-500/90 rounded-full flex items-center justify-center backdrop-blur-md shadow-xl scale-75 group-hover:scale-100 transition-transform">
                                                        <Play className="w-5 h-5 text-black fill-black ml-1" />
                                                    </div>
                                                </div>

                                                {/* Brand Badge */}
                                                <div className="absolute top-3 left-3 flex items-center gap-2">
                                                    <div className="bg-black/60 backdrop-blur-md rounded-full pl-1 pr-2 py-1 flex items-center gap-1 border border-white/10">
                                                        <MediaWithFallback
                                                            src={story.groupAvatar || story.participants[0]?.avatar}
                                                            className="w-4 h-4 rounded-full"
                                                        />
                                                        <span className="text-[10px] font-bold text-white/90 truncate max-w-[80px]">
                                                            {story.participants[0]?.name || 'Brand'}
                                                        </span>
                                                        <VerificationBadge isVerified={true} tier="gold" size="sm" />
                                                    </div>
                                                </div>

                                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                                    <h3 className="font-bold text-base mb-1 leading-tight text-white group-hover:text-amber-400 transition-colors">
                                                        {story.title}
                                                    </h3>
                                                    <div className="flex items-center justify-between text-xs mt-2">
                                                        <span className="text-gray-300 bg-black/50 px-2 py-1 rounded-md backdrop-blur-sm flex items-center gap-1">
                                                            <GitBranch className="w-3 h-3 text-amber-400" />
                                                            {story.comments?.length || 0} forks
                                                        </span>
                                                        <div className="flex -space-x-2">
                                                            {story.participants.slice(0, 3).map((p, i) => (
                                                                <MediaWithFallback
                                                                    key={i}
                                                                    src={p.avatar}
                                                                    className="w-5 h-5 rounded-full border border-black"
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Hover border effect */}
                                                <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-2xl group-hover:ring-amber-500/50 transition-all duration-300" />
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <div className="bg-gray-900/50 border border-dashed border-gray-800 rounded-xl p-6 text-center mx-4">
                                    <p className="text-gray-500 text-sm">Brand Canon Stories Coming Soon. Check back soon!</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* People Results when searching */}
                    {searchQuery.trim() && peopleResults.length > 0 && (
                        <div className="mb-4 grid grid-cols-1 gap-3 col-span-2">
                            <h3 className="text-sm font-bold">{`People matching "${searchQuery}"`}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {peopleResults.slice(0, 8).map(person => (
                                    <Link key={person.id} href={`/profile/${person.id}`} className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 px-3 py-2 rounded-full hover:border-[#EC1D99]/50 transition-colors">
                                        <MediaWithFallback src={person.avatar} alt={person.name} className="w-6 h-6 rounded-full" />
                                        <span className="text-xs">{person.name.split(' ').slice(0, 2).join(' ')}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All Stories Header */}
                    {!searchQuery.trim() && (
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-[#EC1D99]" />
                            <h2 className="text-lg font-bold">All Stories</h2>
                            {(feedType === 'seeds' || feedType === 'canon') && (
                                <button
                                    onClick={() => setShowFeedInfo(true)}
                                    className="ml-auto p-1.5 rounded-full bg-gray-800/50 hover:bg-gray-700 transition-colors"
                                    aria-label="Learn more about this feed"
                                >
                                    <Info className="w-4 h-4 text-gray-400" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Feed Info Modal */}
                    {showFeedInfo && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4" onClick={() => setShowFeedInfo(false)}>
                            <div
                                className="bg-gray-900 border border-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{feedType === 'seeds' ? '🌱' : '🎬'}</span>
                                        <h3 className="text-lg font-bold">
                                            {feedType === 'seeds' ? 'About Seeds' : 'About Canon'}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => setShowFeedInfo(false)}
                                        className="p-1 rounded-full hover:bg-gray-800 transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>

                                {feedType === 'seeds' ? (
                                    <div className="space-y-4 text-sm text-gray-300">
                                        <p>
                                            <span className="text-white font-medium">Seeds</span> are brand-initiated story prompts designed for you to add your creative spin.
                                        </p>
                                        <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
                                            <p className="text-white font-medium">How to participate:</p>
                                            <ul className="space-y-2 text-gray-400">
                                                <li className="flex items-start gap-2">
                                                    <span className="text-[#EC1D99]">1.</span>
                                                    <span>Browse Seed posts from brands you love</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-[#EC1D99]">2.</span>
                                                    <span>Add your contribution to open slots</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-[#EC1D99]">3.</span>
                                                    <span>Get featured and earn recognition</span>
                                                </li>
                                            </ul>
                                        </div>
                                        <p className="text-gray-400">
                                            Seeds encourage creative collaboration between brands and their community.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 text-sm text-gray-300">
                                        <p>
                                            <span className="text-white font-medium">Canon</span> posts are complete brand narratives that you can fork and remix with your own interpretation.
                                        </p>
                                        <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
                                            <p className="text-white font-medium">How to participate:</p>
                                            <ul className="space-y-2 text-gray-400">
                                                <li className="flex items-start gap-2">
                                                    <span className="text-[#EC1D99]">1.</span>
                                                    <span>Watch the original Canon story</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-[#EC1D99]">2.</span>
                                                    <span>Tap "Fork" to create your version</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-[#EC1D99]">3.</span>
                                                    <span>Add your creative content to open slots</span>
                                                </li>
                                            </ul>
                                        </div>
                                        <p className="text-gray-400">
                                            Canon forks let you put your personal stamp on brand storytelling while preserving the original narrative.
                                        </p>
                                    </div>
                                )}

                                <button
                                    onClick={() => setShowFeedInfo(false)}
                                    className="w-full mt-6 py-3 rounded-full bg-[#EC1D99] text-white font-medium hover:bg-[#d61a88] transition-colors"
                                >
                                    Got it!
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Stories Grid - Enhanced with better hover effects */}
                    <div className="grid grid-cols-2 gap-3">
                        {filteredStories.length > 0 ? (
                            <>
                                {filteredStories.map((story, idx) => (
                                    <div
                                        key={story.id}
                                        onClick={() => setSelectedStoryIndex(idx)}
                                        className={`relative rounded-xl overflow-hidden group cursor-pointer ${idx % 3 === 0 ? 'row-span-2 aspect-[9/16]' : 'aspect-square'}`}
                                    >
                                        <MediaWithFallback
                                            src={story.coverImage || story.contributions[0]?.mediaUrl}
                                            alt={story.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        {story.forkedFromStoryId && (
                                            <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-sm p-1.5 rounded-full border border-white/10">
                                                <GitBranch className="w-3 h-3 text-[#EC1D99]" />
                                            </div>
                                        )}
                                        {/* Open pill indicator for active stories */}
                                        {!story.forkedFromStoryId && story.status === 'active' && ((story.maxWeeves || 0) - (story.contributions?.length || 0)) > 0 && (
                                            <div className="absolute top-2 right-2 z-10">
                                                <div className="flex items-center gap-1 bg-green-500/90 px-2 py-0.5 rounded-full">
                                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                                    <span className="text-[10px] font-bold text-white uppercase">Open</span>
                                                </div>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                                            <h3 className="font-bold text-sm line-clamp-2 mb-1">{story.title}</h3>
                                            <div className="flex items-center gap-1 text-xs text-gray-300">
                                                <div className="flex -space-x-1">
                                                    {story.participants.slice(0, 2).map(p => (
                                                        <MediaWithFallback
                                                            key={`${p.id}-${p.position}`}
                                                            src={p.avatar}
                                                            className="w-4 h-4 rounded-full border border-black"
                                                        />
                                                    ))}
                                                </div>
                                                <span>{story.participants.length} weevers</span>
                                            </div>
                                        </div>
                                        {/* Hover overlay with pink glow */}
                                        <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-xl group-hover:ring-[#EC1D99]/50 group-hover:shadow-lg group-hover:shadow-[#EC1D99]/20 transition-all duration-300" />
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div className="col-span-2">
                                {/* Contextual empty state based on feed type */}
                                {searchQuery.trim() ? (
                                    // Search with no results - show trending as fallback
                                    <div className="space-y-6">
                                        <div className="text-center py-6">
                                            <p className="text-gray-400 text-sm">{`No exact matches for "${searchQuery}"`}</p>
                                        </div>
                                        {trendingStories.length > 0 && (
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-400 mb-3">✨ Discover trending stories instead</h3>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {trendingStories.slice(0, 4).map((story, idx) => (
                                                        <div
                                                            key={story.id}
                                                            onClick={() => openStoryInOverlay(story.id)}
                                                            className="relative rounded-xl overflow-hidden group aspect-square cursor-pointer"
                                                        >
                                                            <MediaWithFallback
                                                                src={story.coverImage || story.contributions[0]?.mediaUrl}
                                                                alt={story.title}
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                            />
                                                            {story.forkedFromStoryId && (
                                                                <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-sm p-1.5 rounded-full border border-white/10">
                                                                    <GitBranch className="w-3 h-3 text-[#EC1D99]" />
                                                                </div>
                                                            )}
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                                                                <h3 className="font-bold text-sm line-clamp-2">{story.title}</h3>
                                                            </div>
                                                            <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-xl group-hover:ring-[#EC1D99]/50 transition-all" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : feedType === 'seeds' ? (
                                    // Seeds tab empty - show info about brand partnerships
                                    <div className="py-12 px-4">
                                        <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-[#1a1a1a] border border-gray-800 rounded-2xl p-8 max-w-lg mx-auto text-center relative overflow-hidden group">
                                            {/* Decorative background elements */}
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#EC1D99]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                                            <div className="relative z-10 flex flex-col items-center">
                                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#EC1D99]/10 to-purple-500/10 border border-[#EC1D99]/20 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(236,29,153,0.1)] group-hover:scale-105 transition-transform duration-500">
                                                    <span className="text-4xl filter drop-shadow-md">🌱</span>
                                                </div>

                                                <h3 className="text-2xl font-bold text-white mb-2">Seed Stories</h3>
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EC1D99]/10 border border-[#EC1D99]/20 rounded-full mb-4">
                                                    <Sparkles className="w-3 h-3 text-[#EC1D99]" />
                                                    <span className="text-xs font-medium text-[#EC1D99] uppercase tracking-wide">Coming Soon</span>
                                                </div>

                                                <p className="text-gray-300 text-base leading-relaxed max-w-sm mb-8">
                                                    Collaborate with your favorite brands. Start with their Seed, add your creative spin, and get featured.
                                                </p>

                                                <button
                                                    onClick={() => setShowFeedInfo(true)}
                                                    className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded-full font-medium transition-all duration-200 border border-gray-700 hover:border-gray-600"
                                                >
                                                    <Info className="w-4 h-4 text-[#EC1D99]" />
                                                    <span>How it works</span>
                                                </button>
                                            </div>
                                        </div>

                                        {trendingStories.length > 0 && (
                                            <div className="max-w-lg mx-auto mt-12">
                                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <TrendingUp className="w-4 h-4" />
                                                    While you wait
                                                </h3>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {trendingStories.slice(0, 2).map((story) => (
                                                        <div
                                                            key={story.id}
                                                            onClick={() => openStoryInOverlay(story.id)}
                                                            className="relative rounded-xl overflow-hidden group aspect-video cursor-pointer border border-gray-800"
                                                        >
                                                            <MediaWithFallback
                                                                src={story.coverImage || story.contributions[0]?.mediaUrl}
                                                                alt={story.title}
                                                                className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                                                            />
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <Play className="w-8 h-8 text-white fill-white/20 opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100" />
                                                            </div>
                                                            <div className="absolute bottom-2 left-3 right-3">
                                                                <h4 className="text-xs font-bold text-white truncate">{story.title}</h4>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : feedType === 'canon' ? (
                                    // Canon tab empty - show info about brand canon posts
                                    <div className="py-12 px-4">
                                        <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-[#1a1a00] border border-gray-800 rounded-2xl p-8 max-w-lg mx-auto text-center relative overflow-hidden group">
                                            {/* Decorative background elements */}
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                                            <div className="relative z-10 flex flex-col items-center">
                                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(245,158,11,0.1)] group-hover:scale-105 transition-transform duration-500">
                                                    <span className="text-4xl filter drop-shadow-md">🎬</span>
                                                </div>

                                                <h3 className="text-2xl font-bold text-white mb-2">Canon Stories</h3>
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full mb-4">
                                                    <Clapperboard className="w-3 h-3 text-amber-500" />
                                                    <span className="text-xs font-medium text-amber-500 uppercase tracking-wide">Coming Soon</span>
                                                </div>

                                                <p className="text-gray-300 text-base leading-relaxed max-w-sm mb-8">
                                                    Watch premium brand narratives, then separate the threads to weave your own version of the story.
                                                </p>

                                                <button
                                                    onClick={() => setShowFeedInfo(true)}
                                                    className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded-full font-medium transition-all duration-200 border border-gray-700 hover:border-gray-600"
                                                >
                                                    <Info className="w-4 h-4 text-amber-500" />
                                                    <span>How it works</span>
                                                </button>
                                            </div>
                                        </div>

                                        {trendingStories.length > 0 && (
                                            <div className="max-w-lg mx-auto mt-12">
                                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <TrendingUp className="w-4 h-4" />
                                                    Watch Now
                                                </h3>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {trendingStories.slice(0, 2).map((story) => (
                                                        <div
                                                            key={story.id}
                                                            onClick={() => openStoryInOverlay(story.id)}
                                                            className="relative rounded-xl overflow-hidden group aspect-video cursor-pointer border border-gray-800"
                                                        >
                                                            <MediaWithFallback
                                                                src={story.coverImage || story.contributions[0]?.mediaUrl}
                                                                alt={story.title}
                                                                className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                                                            />
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <Play className="w-8 h-8 text-white fill-white/20 opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100" />
                                                            </div>
                                                            <div className="absolute bottom-2 left-3 right-3">
                                                                <h4 className="text-xs font-bold text-white truncate">{story.title}</h4>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : feedType === 'friends' ? (
                                    // Friends tab empty - encourage adding friends
                                    <div className="py-8 space-y-6">
                                        <div className="text-center space-y-4">
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#EC1D99]/20 to-pink-500/20 flex items-center justify-center mx-auto">
                                                <Heart className="w-8 h-8 text-[#EC1D99]" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">No Friend Stories Yet</h3>
                                                <p className="text-gray-400 text-sm mt-1 max-w-xs mx-auto">
                                                    Follow more creators to see their stories here!
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setViewMode('people')}
                                                className="inline-flex items-center gap-2 bg-[#EC1D99] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#d61a88] transition-colors"
                                            >
                                                <Users className="w-4 h-4" />
                                                Find People to Follow
                                            </button>
                                        </div>
                                        {trendingStories.length > 0 && (
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-400 mb-3">🔥 Popular creators are posting</h3>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {trendingStories.slice(0, 4).map((story) => (
                                                        <div
                                                            key={story.id}
                                                            onClick={() => openStoryInOverlay(story.id)}
                                                            className="relative rounded-xl overflow-hidden group aspect-square cursor-pointer"
                                                        >
                                                            <MediaWithFallback
                                                                src={story.coverImage || story.contributions[0]?.mediaUrl}
                                                                alt={story.title}
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                            />
                                                            {story.forkedFromStoryId && (
                                                                <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-sm p-1.5 rounded-full border border-white/10">
                                                                    <GitBranch className="w-3 h-3 text-[#EC1D99]" />
                                                                </div>
                                                            )}
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                                                                <h3 className="font-bold text-sm line-clamp-2">{story.title}</h3>
                                                            </div>
                                                            <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-xl group-hover:ring-[#EC1D99]/50 transition-all" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    // Default empty state - show trending
                                    <div className="py-8 space-y-6">
                                        {trendingStories.length > 0 ? (
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-400 mb-3">✨ Discover what&apos;s trending</h3>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {trendingStories.slice(0, 6).map((story) => (
                                                        <div
                                                            key={story.id}
                                                            onClick={() => openStoryInOverlay(story.id)}
                                                            className="relative rounded-xl overflow-hidden group aspect-square cursor-pointer"
                                                        >
                                                            <MediaWithFallback
                                                                src={story.coverImage || story.contributions[0]?.mediaUrl}
                                                                alt={story.title}
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                            />
                                                            {story.forkedFromStoryId && (
                                                                <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-sm p-1.5 rounded-full border border-white/10">
                                                                    <GitBranch className="w-3 h-3 text-[#EC1D99]" />
                                                                </div>
                                                            )}
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                                                                <h3 className="font-bold text-sm line-clamp-2">{story.title}</h3>
                                                            </div>
                                                            <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-xl group-hover:ring-[#EC1D99]/50 transition-all" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center space-y-4">
                                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#EC1D99]/20 to-purple-500/20 flex items-center justify-center mx-auto">
                                                    <Sparkles className="w-8 h-8 text-[#EC1D99]" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg">Start Your Story</h3>
                                                    <p className="text-gray-400 text-sm mt-1">Be the first to create something amazing!</p>
                                                </div>
                                                <Link
                                                    href="/create-story"
                                                    className="inline-flex items-center gap-2 bg-[#EC1D99] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#d61a88] transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    Create Story
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create Group Modal */}
            {showCreateGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#121212] border border-gray-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowCreateGroup(false)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-xl font-bold mb-1">Create New Group</h2>
                        <p className="text-sm text-gray-500 mb-6">Build a space for your community</p>

                        <form onSubmit={handleCreateGroup} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Group Name</label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 focus:border-[#EC1D99] focus:outline-none focus:ring-1 focus:ring-[#EC1D99] transition-all text-white placeholder-gray-600"
                                    placeholder="e.g. Photography Lovers"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                                <textarea
                                    value={newGroupDesc}
                                    onChange={(e) => setNewGroupDesc(e.target.value)}
                                    className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 focus:border-[#EC1D99] focus:outline-none focus:ring-1 focus:ring-[#EC1D99] transition-all h-28 resize-none text-white placeholder-gray-600"
                                    placeholder="What is this group about?"
                                />
                            </div>

                            <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-800 bg-black/30 cursor-pointer hover:border-gray-700 transition-colors">
                                <div className="relative flex items-center mt-1">
                                    <input
                                        type="checkbox"
                                        checked={isPrivate}
                                        onChange={(e) => setIsPrivate(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-600 bg-transparent text-[#EC1D99] focus:ring-[#EC1D99] focus:ring-offset-0 focus:ring-offset-transparent"
                                    />
                                </div>
                                <div>
                                    <span className="block text-sm font-medium text-white">Private Group</span>
                                    <span className="block text-xs text-gray-500">Only people with an invite link can join this group.</span>
                                </div>
                            </label>

                            <button
                                type="submit"
                                disabled={creating}
                                className="w-full bg-[#EC1D99] hover:bg-[#d61a88] text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#EC1D99]/20 active:scale-[0.99]"
                            >
                                {creating ? 'Creating Group...' : 'Create Group'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Discovery Feed Overlay - TikTok-style full-screen scrollable feed */}
            {selectedStoryIndex !== null && filteredStories.length > 0 && (
                <DiscoveryFeedOverlay
                    stories={filteredStories}
                    initialIndex={selectedStoryIndex}
                    onClose={() => setSelectedStoryIndex(null)}
                />
            )}
        </div>
    );
}

export default function DiscoverPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-black text-white">Loading...</div>}>
            <DiscoverContent />
        </Suspense>
    );
}
