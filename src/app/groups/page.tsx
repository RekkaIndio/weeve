"use client";
import React, { useState } from 'react';
import { useStore, Group } from "@/lib/store";
import { Users, Plus, X } from "lucide-react";

export default function GroupsPage() {
    const { groups, addGroup } = useStore();
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');

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
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold font-poppins">Groups</h1>
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

                {groups.length === 0 && (
                    <div className="text-center py-16 text-gray-500">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No groups yet</p>
                        <p className="text-sm mt-2">Create your first group to get started</p>
                    </div>
                )}
            </div>

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
