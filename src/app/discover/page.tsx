"use client";
import React, { useState } from 'react';
import { useStore, Group } from "@/lib/store";
import Link from "next/link";
import { Search, TrendingUp, Sparkles, Clock, Users, Plus, X } from "lucide-react";

export default function DiscoverPage() {
    const { stories, groups, addGroup } = useStore();
    const [activeCategory, setActiveCategory] = useState('trending');
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');

    // Mock categories for visual variety
    const categories = [
        { id: 'trending', label: 'Trending', icon: TrendingUp, color: 'text-pink-500' },
        { id: 'new', label: 'New', icon: Clock, color: 'text-blue-500' },
        { id: 'foryou', label: 'For You', icon: Sparkles, color: 'text-yellow-500' },
        { id: 'groups', label: 'Groups', icon: Users, color: 'text-green-500' },
    ];

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
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md py-2 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search stories, people, tags..."
                        className="w-full bg-gray-900 border border-gray-800 rounded-full py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-[#EC1D99] transition-colors"
                    />
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
                        {groups.map(group => (
                            <div key={group.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:border-gray-700 transition-colors cursor-pointer">
                                <img src={group.avatar} alt={group.name} className="w-12 h-12 rounded-full bg-gray-800" />
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
                        ))}
                    </div>
                </div>
            ) : (
                /* Masonry Grid (Simulated with 2 columns) */
                <div className="grid grid-cols-2 gap-3">
                    {stories.map((story, idx) => (
                        <Link
                            key={story.id}
                            href={`/story/${story.id}`}
                            className={`relative rounded-xl overflow-hidden group ${idx % 3 === 0 ? 'row-span-2 aspect-[9/16]' : 'aspect-square'}`}
                        >
                            <img
                                src={story.coverImage || story.contributions[0]?.mediaUrl || "https://via.placeholder.com/400"}
                                alt={story.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                                <h3 className="font-bold text-sm line-clamp-2 mb-1">{story.title}</h3>
                                <div className="flex items-center gap-1 text-xs text-gray-300">
                                    <div className="flex -space-x-1">
                                        {story.participants.slice(0, 2).map(p => (
                                            <img key={p.id} src={p.avatar} className="w-4 h-4 rounded-full border border-black" />
                                        ))}
                                    </div>
                                    <span>{story.participants.length} weevers</span>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {/* Mock Placeholders to fill grid */}
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-gray-900 rounded-xl aspect-square flex items-center justify-center text-gray-700">
                            <span className="text-xs">Loading...</span>
                        </div>
                    ))}
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
