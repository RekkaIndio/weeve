import React, { useState, useRef, useEffect } from 'react';
import { X, Search, Plus, Trash2, SkipForward, Lock } from 'lucide-react';
import { Story, User, useStore, isSlotImmutable } from '@/lib/store';
import { skipTurn } from '@/lib/stories';
import { toast } from 'sonner';

interface EditStoryModalProps {
    story: Story;
    onClose: () => void;
}

export default function EditStoryModal({ story, onClose }: EditStoryModalProps) {
    const { friends, updateStory, currentUser } = useStore();
    const [participants, setParticipants] = useState<User[]>(story.participants);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [isSkipping, setIsSkipping] = useState(false);
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
        if (userId === currentUser?.id) return; // Can't remove self

        // Defensive check for immutable slots
        const participant = participants.find(p => p.id === userId);
        if (participant && typeof participant.position === 'number') {
            if (isSlotImmutable(story, participant.position)) {
                toast.error("Cannot remove brand content");
                return;
            }
        }

        setParticipants(participants.filter(p => p.id !== userId));
    };

    const handleSkipTurn = async (userId: string) => {
        if (!currentUser || story.creatorId !== currentUser.id) {
            toast.error('Only the story creator can skip turns');
            return;
        }

        if (story.currentTurnUserId !== userId) {
            toast.error('This user does not have the current turn');
            return;
        }

        setIsSkipping(true);
        try {
            const result = await skipTurn(story.id, userId, 'manual_skip');
            if (result.success) {
                toast.success('Turn skipped successfully');
                onClose(); // Close modal to refresh the view
            } else {
                toast.error(result.error || 'Failed to skip turn');
            }
        } catch (error) {
            console.error('Error skipping turn:', error);
            toast.error('An error occurred while skipping turn');
        } finally {
            setIsSkipping(false);
        }
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // updateStoryParticipants handles the diffing and Supabase calls
            const { updateStoryParticipants } = await import('@/lib/stories');
            const result = await updateStoryParticipants(story.id, participants);

            if (result.success) {
                // Optimistically update local store
                updateStory(story.id, { participants });
                toast.success('Story updated successfully');
                onClose();
            } else {
                toast.error(result.error || 'Failed to update story');
            }
        } catch (error) {
            console.error('Error saving story:', error);
            toast.error('An error occurred while saving');
        } finally {
            setIsSaving(false);
        }
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
                            {participants.map(participant => {
                                const isCurrentTurnUser = story.currentTurnUserId === participant.id;
                                const isCreator = story.creatorId === currentUser?.id;
                                const canSkip = isCreator && isCurrentTurnUser && story.status === 'active';

                                const isLocked = typeof participant.position === 'number' && isSlotImmutable(story, participant.position);

                                return (
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
                                                    {participant.id === currentUser?.id && <span className="text-gray-500 text-xs ml-2">(You)</span>}
                                                    {isCurrentTurnUser && <span className="text-[#EC1D99] text-xs ml-2">• Current Turn</span>}
                                                    {isLocked && <span className="text-gray-500 text-xs ml-2 bg-gray-700 px-1.5 py-0.5 rounded">Fixed</span>}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {canSkip && (
                                                <button
                                                    onClick={() => handleSkipTurn(participant.id)}
                                                    disabled={isSkipping}
                                                    className="p-2 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Skip this person's turn"
                                                >
                                                    <SkipForward className="w-5 h-5" />
                                                </button>
                                            )}
                                            {participant.id !== currentUser?.id && (
                                                <button
                                                    onClick={() => !isLocked && handleRemoveParticipant(participant.id)}
                                                    disabled={isLocked}
                                                    className={`p-2 rounded-lg transition-colors ${isLocked
                                                        ? 'text-gray-600 cursor-not-allowed'
                                                        : 'text-gray-500 hover:text-red-500 hover:bg-red-500/10'
                                                        }`}
                                                    title={isLocked ? "Fixed brand content cannot be removed" : "Remove from story"}
                                                >
                                                    {isLocked ? <Lock className="w-4 h-4" /> : <Trash2 className="w-5 h-5" />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800 bg-gray-900">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`w-full font-bold py-3 rounded-xl transition-colors font-sans ${isSaving ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-[#EC1D99] hover:bg-[#D41C84] text-white'}`}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
