import React, { useState, useRef, useEffect } from 'react';
import { X, Search, Plus, Trash2 } from 'lucide-react';
import { Story, User, useStore } from '@/lib/store';

interface EditStoryModalProps {
    story: Story;
    onClose: () => void;
}

export default function EditStoryModal({ story, onClose }: EditStoryModalProps) {
    const { friends, updateStory, currentUser } = useStore();
    const [participants, setParticipants] = useState<User[]>(story.participants);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Filter friends who are NOT already in the story
    const availableFriends = friends.filter(
        friend =>
            !participants.some(p => p.id === friend.id) &&
            friend.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddParticipant = (friend: User) => {
        setParticipants([...participants, friend]);
        setSearchQuery('');
        setShowDropdown(false);
    };

    const handleRemoveParticipant = (userId: string) => {
        if (userId === currentUser.id) return; // Can't remove self
        setParticipants(participants.filter(p => p.id !== userId));
    };

    const handleSave = () => {
        updateStory(story.id, { participants });
        onClose();
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white font-sans">Edit Story</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 overflow-y-auto">
                    {/* Add Friend Input */}
                    <div className="mb-6 relative" ref={searchRef}>
                        <label className="block text-sm font-medium text-gray-400 mb-2 font-sans">
                            Add Participants
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowDropdown(true);
                                }}
                                onFocus={() => setShowDropdown(true)}
                                placeholder="Search friends..."
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#EC1D99] focus:ring-1 focus:ring-[#EC1D99] font-sans"
                            />
                        </div>

                        {/* Dropdown */}
                        {showDropdown && availableFriends.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto">
                                {availableFriends.map(friend => (
                                    <button
                                        key={friend.id}
                                        onClick={() => handleAddParticipant(friend)}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 transition-colors text-left"
                                    >
                                        <img
                                            src={friend.avatar}
                                            alt={friend.name}
                                            className="w-8 h-8 rounded-full"
                                        />
                                        <span className="text-white font-medium font-sans">{friend.name}</span>
                                        <Plus className="w-4 h-4 text-gray-400 ml-auto" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Current Participants */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-3 font-sans">
                            Current Participants ({participants.length})
                        </label>
                        <div className="space-y-2">
                            {participants.map(participant => (
                                <div
                                    key={participant.id}
                                    className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-gray-800"
                                >
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={participant.avatar}
                                            alt={participant.name}
                                            className="w-10 h-10 rounded-full border border-gray-700"
                                        />
                                        <div>
                                            <p className="text-white font-medium font-sans">
                                                {participant.name}
                                                {participant.id === currentUser.id && <span className="text-gray-500 text-xs ml-2">(You)</span>}
                                            </p>
                                        </div>
                                    </div>

                                    {participant.id !== currentUser.id && (
                                        <button
                                            onClick={() => handleRemoveParticipant(participant.id)}
                                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800 bg-gray-900">
                    <button
                        onClick={handleSave}
                        className="w-full bg-[#EC1D99] hover:bg-[#D41C84] text-white font-bold py-3 rounded-xl transition-colors font-sans"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
