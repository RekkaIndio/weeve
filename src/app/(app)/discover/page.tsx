"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useStore, Group } from "@/lib/store";
import { useSearchParams } from 'next/navigation';
import Link from "next/link";
import { Search, TrendingUp, Sparkles, Clock, Users, Plus, X } from "lucide-react";
import NotificationBell from "@/app/components/NotificationBell";

import MediaWithFallback from "@/app/components/MediaWithFallback";

function DiscoverContent() {
    const { stories, groups, addGroup, currentUser } = useStore();
    const searchParams = useSearchParams();
    const tabParam = searchParams?.get('tab');
    const [activeCategory, setActiveCategory] = useState(tabParam || 'trending');
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Update active category when URL param changes
    useEffect(() => {
        if (tabParam) {
            setActiveCategory(tabParam);
        }
    }, [tabParam]);

    // Mock categories for visual variety
    const categories = [
        { id: 'trending', label: 'Trending', icon: TrendingUp, color: 'text-pink-500' },
        { id: 'new', label: 'New', icon: Clock, color: 'text-blue-500' },
        { id: 'foryou', label: 'For You', icon: Sparkles, color: 'text-yellow-500' },
        { id: 'groups', label: 'Groups', icon: Users, color: 'text-green-500' },
    ];

    // Filter stories based on search query
    const filteredStories = stories.filter(story => {
        if (!searchQuery.trim()) return true;

        const query = searchQuery.toLowerCase();

        // Search in title
        if (story.title.toLowerCase().includes(query)) return true;

        // Search in description
        if (story.description.toLowerCase().includes(query)) return true;

        // Search in hashtags
        if (story.hashtags?.some(tag => tag.toLowerCase().includes(query))) return true;

        // Search in participant names
        if (story.participants.some(p => p.name.toLowerCase().includes(query))) return true;

        return false;
    });

    // Filter groups based on search query
    const filteredGroups = groups.filter(group => {
        if (!searchQuery.trim()) return true;

        const query = searchQuery.toLowerCase();

        // Search in group name
        if (group.name.toLowerCase().includes(query)) return true;

        // Search in group description
        if (group.description.toLowerCase().includes(query)) return true;

        return false;
    });

    const handleCreateGroup = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;

        const newGroup: Group = {
            id: Math.random().toString(36).substr(2, 9),
            name: newGroupName,
            description: newGroupDesc,
            avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${newGroupName}`,
            memberCount: 1,
            isPrivate: false,
        };

        addGroup(newGroup);
        setShowCreateGroup(false);
        setNewGroupName('');
        setNewGroupDesc('');
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-24">
            {/* Search Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md py-2 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] mb-6">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search stories, people, tags..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-800 rounded-full py-3 pl-10 pr-4 text-base focus:outline-none focus:border-[#EC1D99] transition-colors"
                        />
                    </div>
                    {currentUser && (
                        <NotificationBell
                            className="bg-gray-900/80 border border-gray-800"
                            badgeClassName="bg-[#EC1D99]"
                        />
                    )}
                </div>
            </div>

            {/* Categories */}
            <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide scroll-smooth whitespace-nowrap snap-x snap-mandatory">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full shrink-0 transition-colors border ${activeCategory === cat.id
                            ? 'bg-gray-800 border-[#EC1D99]'
                            : 'bg-gray-900 border-gray-800 hover:bg-gray-800'
                            }`}
                    >
                        <cat.icon className={`w-4 h-4 ${cat.color}`} />
                        <span className="text-sm font-medium">{cat.label}</span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {activeCategory === 'groups' ? (
                <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Popular Groups</h2>
                        <button
                            onClick={() => setShowCreateGroup(true)}
                            className="flex items-center gap-1 text-sm bg-[#EC1D99] px-3 py-1.5 rounded-full hover:bg-[#d61a88] transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Create
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {filteredGroups.length > 0 ? (
                            filteredGroups.map(group => (
                                <div key={group.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:border-gray-700 transition-colors cursor-pointer">
                                    <MediaWithFallback
                                        src={group.avatar}
                                        alt={group.name}
                                        className="w-12 h-12 rounded-full bg-gray-800"
                                    />
                                    <div className="flex-1">
                                        <h3 className="font-bold text-base">{group.name}</h3>
                                        <p className="text-xs text-gray-400 line-clamp-1">{group.description}</p>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                            <Users className="w-3 h-3" />
                                            <span>{group.memberCount.toLocaleString()} members</span>
                                            {group.isPrivate && <span className="bg-gray-800 px-1.5 rounded text-[10px]">Private</span>}
                                        </div>
                                    </div>
                                    <button className="text-xs font-medium text-[#EC1D99] border border-[#EC1D99] px-3 py-1 rounded-full hover:bg-[#EC1D99] hover:text-white transition-colors">
                                        Join
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500">No groups found matching "{searchQuery}"</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Masonry Grid (Simulated with 2 columns) */
                <div className="grid grid-cols-2 gap-3">
                    {filteredStories.length > 0 ? (
                        <>
                            {filteredStories.map((story, idx) => (
                                <Link
                                    key={story.id}
                                    href={`/story/${story.id}`}
                                    className={`relative rounded-xl overflow-hidden group ${idx % 3 === 0 ? 'row-span-2 aspect-[9/16]' : 'aspect-square'}`}
                                >
                                    <MediaWithFallback
                                        src={story.coverImage || story.contributions[0]?.mediaUrl}
                                        alt={story.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                                        <h3 className="font-bold text-sm line-clamp-2 mb-1">{story.title}</h3>
                                        <div className="flex items-center gap-1 text-xs text-gray-300">
                                            <div className="flex -space-x-1">
                                                {story.participants.slice(0, 2).map(p => (
                                                    <MediaWithFallback
                                                        key={p.id}
                                                        src={p.avatar}
                                                        className="w-4 h-4 rounded-full border border-black"
                                                    />
                                                ))}
                                            </div>
                                            <span>{story.participants.length} weevers</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}

                            {/* Mock Placeholders to fill grid - only show when not searching */}
                            {!searchQuery.trim() && [1, 2, 3, 4].map((i) => (
                                <div key={i} className="bg-gray-900 rounded-xl aspect-square flex items-center justify-center text-gray-700">
                                    <span className="text-xs">Loading...</span>
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="col-span-2 text-center py-12">
                            <p className="text-gray-500">No stories found matching "{searchQuery}"</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create Group Modal */}
            {showCreateGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setShowCreateGroup(false)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h2 className="text-xl font-bold mb-4">Create New Group</h2>
                        <form onSubmit={handleCreateGroup} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Group Name</label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    className="w-full bg-black border border-gray-800 rounded-lg p-3 focus:border-[#EC1D99] focus:outline-none transition-colors"
                                    placeholder="e.g. Photography Lovers"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Description</label>
                                <textarea
                                    value={newGroupDesc}
                                    onChange={(e) => setNewGroupDesc(e.target.value)}
                                    className="w-full bg-black border border-gray-800 rounded-lg p-3 focus:border-[#EC1D99] focus:outline-none transition-colors h-24 resize-none"
                                    placeholder="What is this group about?"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-[#EC1D99] hover:bg-[#d61a88] text-white font-bold py-3 rounded-lg transition-colors"
                            >
                                Create Group
                            </button>
                        </form>
                    </div>
                </div>
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
